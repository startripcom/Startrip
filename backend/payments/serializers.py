from rest_framework import serializers
from decimal import Decimal
from drf_spectacular.utils import extend_schema_field
from .models import Tip
from core.utils import is_valid_stellar_address

class CreatePaymentRequestSerializer(serializers.Serializer):
    creator_username = serializers.CharField(max_length=50, required=True)
    asset_code = serializers.ChoiceField(choices=['XLM', 'USDC', 'USDT'], default='XLM')
    amount = serializers.DecimalField(max_digits=20, decimal_places=7, min_value=Decimal('0.0000001'))
    supporter_name = serializers.CharField(max_length=64, required=False, allow_blank=True, default='Anonymous')
    message = serializers.CharField(max_length=280, required=False, allow_blank=True, default='')
    supporter_wallet = serializers.CharField(max_length=56, required=False, allow_blank=True, default='')
    widget_id = serializers.IntegerField(required=False, allow_null=True)
    widget_slug = serializers.CharField(max_length=60, required=False, allow_blank=True, default='')

    def validate_supporter_wallet(self, value):
        if value and not is_valid_stellar_address(value):
            raise serializers.ValidationError("Invalid Stellar supporter wallet address.")
        return value


class PaymentRequestResponseSerializer(serializers.ModelSerializer):
    creator_username = serializers.CharField(source='creator.username')
    creator_display_name = serializers.CharField(source='creator.display_name')
    recipient_address = serializers.CharField(source='creator.receiving_wallet_address')

    class Meta:
        model = Tip
        fields = [
            'reference_id',
            'creator_username',
            'creator_display_name',
            'recipient_address',
            'asset_code',
            'amount',
            'supporter_name',
            'message',
            'status',
            'created_at',
        ]


class BuildXDRRequestSerializer(serializers.Serializer):
    reference_id = serializers.CharField(max_length=32, required=True)
    supporter_wallet = serializers.CharField(max_length=56, required=True)

    def validate_supporter_wallet(self, value):
        if not is_valid_stellar_address(value):
            raise serializers.ValidationError("Invalid Stellar wallet address.")
        return value


class BuildXDRResponseSerializer(serializers.Serializer):
    reference_id = serializers.CharField()
    unsigned_xdr = serializers.CharField()
    network_passphrase = serializers.CharField()
    recipient_address = serializers.CharField()
    amount = serializers.CharField()
    asset_code = serializers.CharField()
    estimated_network_fee_stroops = serializers.IntegerField()


class VerifyPaymentRequestSerializer(serializers.Serializer):
    reference_id = serializers.CharField(max_length=32, required=True)
    stellar_tx_hash = serializers.CharField(
        max_length=64,
        min_length=16,
        required=True,
        help_text="Hexadecimal Stellar transaction hash"
    )


class TipDetailSerializer(serializers.ModelSerializer):
    creator_username = serializers.CharField(source='creator.username')
    creator_display_name = serializers.CharField(source='creator.display_name')
    widget_id = serializers.IntegerField(source='widget.id', read_only=True, allow_null=True)
    widget_name = serializers.CharField(source='widget.name', read_only=True, allow_null=True)
    stellar_explorer_url = serializers.SerializerMethodField()

    class Meta:
        model = Tip
        fields = [
            'id',
            'reference_id',
            'creator_username',
            'creator_display_name',
            'widget_id',
            'widget_name',
            'supporter_wallet',
            'supporter_name',
            'message',
            'asset_code',
            'amount',
            'status',
            'stellar_tx_hash',
            'stellar_explorer_url',
            'ledger_sequence',
            'ledger_closed_at',
            'fee_stroops',
            'created_at',
            'updated_at',
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_stellar_explorer_url(self, obj):
        if obj.stellar_tx_hash:
            return f"https://stellar.expert/explorer/testnet/tx/{obj.stellar_tx_hash}"
        return None
