from django.contrib import admin
from .models import CreatorProfile, WidgetConfig

class WidgetConfigInline(admin.StackedInline):
    model = WidgetConfig
    can_delete = True
    readonly_fields = ('overlay_token', 'created_at', 'updated_at')
    extra = 0

@admin.register(CreatorProfile)
class CreatorProfileAdmin(admin.ModelAdmin):
    list_display = ('username', 'display_name', 'wallet_address_short', 'receiving_wallet_short', 'created_at')
    search_fields = ('username', 'display_name', 'wallet_address', 'receiving_wallet_address')
    list_filter = ('created_at',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [WidgetConfigInline]
    fieldsets = (
        ('Creator Identity', {
            'fields': ('username', 'display_name', 'bio', 'avatar_url', 'website_url', 'social_links')
        }),
        ('Stellar Wallet Configuration', {
            'fields': ('wallet_address', 'receiving_wallet_address', 'supported_assets')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def wallet_address_short(self, obj):
        return f"{obj.wallet_address[:6]}...{obj.wallet_address[-4:]}" if obj.wallet_address else '-'
    wallet_address_short.short_description = 'Signing Wallet'

    def receiving_wallet_short(self, obj):
        return f"{obj.receiving_wallet_address[:6]}...{obj.receiving_wallet_address[-4:]}" if obj.receiving_wallet_address else '-'
    receiving_wallet_short.short_description = 'Receiving Wallet'


@admin.register(WidgetConfig)
class WidgetConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'creator', 'widget_title', 'theme', 'is_default', 'is_active', 'created_at')
    list_filter = ('theme', 'is_default', 'is_active', 'alert_sound_enabled')
    search_fields = ('name', 'slug', 'creator__username', 'creator__display_name', 'widget_title', 'overlay_token')
    readonly_fields = ('overlay_token', 'created_at', 'updated_at')
