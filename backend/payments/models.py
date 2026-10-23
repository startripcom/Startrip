import secrets
from django.db import models
from creators.models import CreatorProfile

def generate_tip_reference():
    """
    Generates a unique reference that fits within Stellar's 28-byte MEMO_TEXT.
    Format: ST-XXXXXXXX (19 chars)
    """
    return f"ST-{secrets.token_hex(8).upper()}"

class Tip(models.Model):
    """
    Immutable payment record of a tip sent on Stellar Testnet.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Request'),
        ('submitted', 'Submitted to Network'),
        ('confirmed', 'Confirmed On-Chain'),
        ('failed', 'Payment Failed'),
        ('rejected', 'Wallet Rejected'),
    ]

    reference_id = models.CharField(
        max_length=32,
        unique=True,
        db_index=True,
        default=generate_tip_reference,
        help_text="Unique Stellar Memo reference"
    )
    creator = models.ForeignKey(
        CreatorProfile,
        on_delete=models.CASCADE,
        related_name='tips'
    )
    widget = models.ForeignKey(
        'creators.WidgetConfig',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='tips',
        help_text="The specific widget/tip link through which this tip was sent"
    )
    supporter_wallet = models.CharField(
        max_length=56,
        blank=True,
        default='',
        db_index=True,
        help_text="Stellar address of supporter"
    )
    supporter_name = models.CharField(max_length=64, blank=True, default='Anonymous')
    message = models.TextField(max_length=280, blank=True, default='')
    asset_code = models.CharField(max_length=12, default='XLM')
    asset_issuer = models.CharField(max_length=56, blank=True, default='')
    amount = models.DecimalField(max_digits=20, decimal_places=7)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    stellar_tx_hash = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        unique=True,
        db_index=True,
        help_text="64-character Stellar transaction hash"
    )
    ledger_sequence = models.BigIntegerField(blank=True, null=True)
    ledger_closed_at = models.DateTimeField(blank=True, null=True)
    fee_stroops = models.PositiveIntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Tip {self.reference_id}: {self.amount} {self.asset_code} -> @{self.creator.username} ({self.status})"
