from django.contrib import admin
from .models import WalletNonce, WalletSession, AuditLog

@admin.register(WalletNonce)
class WalletNonceAdmin(admin.ModelAdmin):
    list_display = ('wallet_short', 'nonce_short', 'is_used', 'is_expired_display', 'created_at', 'expires_at')
    list_filter = ('is_used', 'created_at')
    search_fields = ('wallet_address', 'nonce')
    readonly_fields = ('nonce', 'message_to_sign', 'created_at', 'expires_at')

    def wallet_short(self, obj):
        return f"{obj.wallet_address[:6]}...{obj.wallet_address[-4:]}" if obj.wallet_address else '-'
    wallet_short.short_description = 'Wallet'

    def nonce_short(self, obj):
        return f"{obj.nonce[:8]}..."
    nonce_short.short_description = 'Nonce'

    def is_expired_display(self, obj):
        return obj.is_expired
    is_expired_display.boolean = True
    is_expired_display.short_description = 'Expired'


@admin.register(WalletSession)
class WalletSessionAdmin(admin.ModelAdmin):
    list_display = ('wallet_short', 'is_valid_display', 'created_at', 'expires_at')
    list_filter = ('created_at',)
    search_fields = ('wallet_address', 'token')
    readonly_fields = ('token', 'wallet_address', 'created_at', 'expires_at')

    def wallet_short(self, obj):
        return f"{obj.wallet_address[:6]}...{obj.wallet_address[-4:]}" if obj.wallet_address else '-'
    wallet_short.short_description = 'Wallet'

    def is_valid_display(self, obj):
        return obj.is_valid
    is_valid_display.boolean = True
    is_valid_display.short_description = 'Valid'


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'wallet_short', 'action', 'ip_address')
    list_filter = ('action', 'created_at')
    search_fields = ('wallet_address', 'action', 'details', 'ip_address')
    readonly_fields = ('wallet_address', 'action', 'details', 'ip_address', 'created_at')
    date_hierarchy = 'created_at'

    def wallet_short(self, obj):
        return f"{obj.wallet_address[:6]}...{obj.wallet_address[-4:]}" if obj.wallet_address else '-'
    wallet_short.short_description = 'Wallet'
