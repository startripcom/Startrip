import uuid
from django.db import models
from django.core.validators import RegexValidator

def default_supported_assets():
    return ["XLM", "USDC", "USDT"]

def default_preset_xlm():
    return [5, 10, 25, 50]

def default_preset_usdc():
    return [1, 2, 5, 10]

class CreatorProfile(models.Model):
    """
    Onboarded content creator profile mapped to an authenticated Stellar wallet.
    """
    wallet_address = models.CharField(
        max_length=56,
        unique=True,
        db_index=True,
        help_text="Stellar address controlling this profile"
    )
    username = models.SlugField(
        max_length=50,
        unique=True,
        db_index=True,
        validators=[
            RegexValidator(
                regex=r'^[a-zA-Z0-9_-]+$',
                message='Username can only contain alphanumeric characters, underscores, and dashes.'
            )
        ],
        help_text="Unique public handle (e.g. startip.app/creatorname)"
    )
    display_name = models.CharField(max_length=100)
    bio = models.TextField(max_length=500, blank=True, default='')
    avatar_url = models.TextField(blank=True, default='')
    banner_url = models.TextField(blank=True, default='')
    website_url = models.URLField(max_length=500, blank=True, default='')
    social_links = models.JSONField(default=dict, blank=True)
    receiving_wallet_address = models.CharField(
        max_length=56,
        db_index=True,
        help_text="Stellar address where supporter tips are directly paid"
    )
    supported_assets = models.JSONField(
        default=default_supported_assets,
        help_text="List of accepted asset codes (e.g. ['XLM', 'USDC', 'USDT'])"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.display_name} (@{self.username})"

    @property
    def widget_config(self):
        """Backward-compatible helper returning the primary/default widget."""
        return self.widgets.filter(is_default=True).first() or self.widgets.first()

    def save(self, *args, **kwargs):
        # Default receiving wallet to controlling wallet if not specified
        if not self.receiving_wallet_address:
            self.receiving_wallet_address = self.wallet_address
        super().save(*args, **kwargs)


class WidgetConfig(models.Model):
    """
    Appearance and functional configuration for an embeddable tipping widget / campaign link.
    Creators can create multiple widgets for different platforms or live events.
    """
    THEME_CHOICES = [
        ('dark', 'Dark Navy'),
        ('light', 'Clean Light'),
        ('midnight', 'Midnight Purple'),
        ('cyber', 'Cyberpunk Neon'),
    ]

    creator = models.ForeignKey(
        CreatorProfile,
        on_delete=models.CASCADE,
        related_name='widgets'
    )
    name = models.CharField(
        max_length=100,
        default='Main Tip Link',
        help_text="Campaign / platform title (e.g. YouTube Live, Twitch Stream, Discord Tips)"
    )
    slug = models.SlugField(
        max_length=60,
        blank=True,
        default='main',
        help_text="Unique slug for this widget link under the creator (e.g. /tip/tobibuilds/youtube)"
    )
    avatar_url = models.TextField(
        blank=True,
        default='',
        help_text="Custom avatar/logo for this specific tip link"
    )
    banner_url = models.TextField(
        blank=True,
        default='',
        help_text="Custom banner/cover image for this specific tip link"
    )
    widget_title = models.CharField(max_length=100, default='Tip this Creator')
    welcome_message = models.TextField(
        max_length=300,
        default='Support my journey and content creation with instant Stellar tips!'
    )
    theme = models.CharField(max_length=20, choices=THEME_CHOICES, default='dark')
    primary_color = models.CharField(max_length=20, default='#6366F1')
    preset_amounts_xlm = models.JSONField(default=default_preset_xlm)
    preset_amounts_usdc = models.JSONField(default=default_preset_usdc)
    preset_amounts_usdt = models.JSONField(default=default_preset_usdc)
    allow_custom_amount = models.BooleanField(default=True)
    allow_supporter_message = models.BooleanField(default=True)
    filter_remarks = models.BooleanField(
        default=False,
        help_text="Filter or ban unwanted words/remarks from supporters on this tip link"
    )
    banned_words = models.JSONField(
        default=list,
        blank=True,
        help_text="List of banned words or phrases"
    )
    filter_action = models.CharField(
        max_length=20,
        choices=[('mask', 'Mask with asterisks'), ('block', 'Block remark entirely')],
        default='mask',
        help_text="Action to take when a remark matches banned words"
    )
    overlay_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    alert_sound_enabled = models.BooleanField(default=True)
    alert_duration_seconds = models.PositiveIntegerField(default=6)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', 'created_at']

    def __str__(self):
        return f"Widget '{self.name}' for @{self.creator.username}"
