from rest_framework import serializers
from .utils import is_valid_stellar_address

class AuthChallengeRequestSerializer(serializers.Serializer):
    wallet_address = serializers.CharField(
        max_length=56,
        required=True,
        help_text="Stellar Public Key (starts with 'G', 56 characters)"
    )

    def validate_wallet_address(self, value):
        if not is_valid_stellar_address(value):
            raise serializers.ValidationError("Invalid Stellar public key format.")
        return value


class AuthChallengeResponseSerializer(serializers.Serializer):
    wallet_address = serializers.CharField()
    nonce = serializers.CharField()
    message_to_sign = serializers.CharField()
    expires_at = serializers.DateTimeField()


class AuthVerifyRequestSerializer(serializers.Serializer):
    wallet_address = serializers.CharField(max_length=56, required=True)
    nonce = serializers.CharField(max_length=64, required=True)
    signature = serializers.CharField(
        required=True,
        help_text="Hex or Base64 Ed25519 signature of message_to_sign"
    )

    def validate_wallet_address(self, value):
        if not is_valid_stellar_address(value):
            raise serializers.ValidationError("Invalid Stellar public key format.")
        return value


class AuthVerifyResponseSerializer(serializers.Serializer):
    token = serializers.CharField()
    wallet_address = serializers.CharField()
    expires_at = serializers.DateTimeField()
    is_registered = serializers.BooleanField()
    username = serializers.CharField(allow_null=True)


class HealthCheckResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    timestamp = serializers.DateTimeField()
    database = serializers.CharField()
    stellar_network = serializers.CharField()
    stellar_horizon = serializers.CharField()
    version = serializers.CharField()
