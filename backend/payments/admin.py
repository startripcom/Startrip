from django.contrib import admin
from django.utils.html import format_html
from .models import Tip

@admin.register(Tip)
class TipAdmin(admin.ModelAdmin):
    list_display = (
        'reference_id',
        'creator',
        'amount_display',
        'supporter_name',
        'status_badge',
        'stellar_tx_short',
        'created_at'
    )
    list_filter = ('status', 'asset_code', 'created_at')
    search_fields = (
        'reference_id',
        'creator__username',
        'creator__display_name',
        'supporter_wallet',
        'supporter_name',
        'stellar_tx_hash',
        'message'
    )
    readonly_fields = (
        'reference_id',
        'stellar_tx_hash',
        'ledger_sequence',
        'ledger_closed_at',
        'fee_stroops',
        'created_at',
        'updated_at'
    )
    date_hierarchy = 'created_at'
    fieldsets = (
        ('Tip Details', {
            'fields': ('reference_id', 'creator', 'status', 'amount', 'asset_code', 'asset_issuer')
        }),
        ('Supporter Message', {
            'fields': ('supporter_name', 'supporter_wallet', 'message')
        }),
        ('Stellar Blockchain Verification', {
            'fields': ('stellar_tx_hash', 'ledger_sequence', 'ledger_closed_at', 'fee_stroops'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def amount_display(self, obj):
        return f"{obj.amount} {obj.asset_code}"
    amount_display.short_description = 'Amount'

    def stellar_tx_short(self, obj):
        if not obj.stellar_tx_hash:
            return '-'
        short = f"{obj.stellar_tx_hash[:6]}...{obj.stellar_tx_hash[-4:]}"
        url = f"https://stellar.expert/explorer/testnet/tx/{obj.stellar_tx_hash}"
        return format_html('<a href="{}" target="_blank" rel="noopener noreferrer">{}</a>', url, short)
    stellar_tx_short.short_description = 'Tx Hash (StellarExpert)'

    def status_badge(self, obj):
        colors = {
            'confirmed': '#10B981',
            'submitted': '#3B82F6',
            'pending': '#F59E0B',
            'failed': '#EF4444',
            'rejected': '#6B7280',
        }
        color = colors.get(obj.status, '#6B7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
