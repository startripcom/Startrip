import uuid
from django.db import models
from django.utils import timezone
from datetime import timedelta

class WalletNonce(models.Model):
    """
    Challenge nonce used for SEP-0010 Stellar Wallet Authentication.
    Prevents replay attacks by expiring within 5 minutes.
    """
    wallet_address = models.CharField(max_length=56, db_index=True)
    nonce = models.CharField(max_length=64, unique=True, default=uuid.uuid4)
    message_to_sign = models.TextField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=5)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at or self.is_used

    def __str__(self):
        return f"Nonce {self.wallet_address[:8]}... ({'expired' if self.is_expired else 'valid'})"


class WalletSession(models.Model):
    """
    Active authenticated session for a Stellar wallet address.
    """
    token = models.CharField(max_length=128, unique=True, db_index=True)
    wallet_address = models.CharField(max_length=56, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        return timezone.now() < self.expires_at

    def __str__(self):
        return f"Session for {self.wallet_address[:8]}... valid until {self.expires_at}"


class AuditLog(models.Model):
    """
    Immutable audit log for security events (e.g. receiving wallet changes).
    """
    wallet_address = models.CharField(max_length=56, db_index=True)
    action = models.CharField(max_length=100)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.created_at}] {self.wallet_address[:8]}: {self.action}"
