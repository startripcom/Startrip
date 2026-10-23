from rest_framework import serializers

class MessageModerationRequestSerializer(serializers.Serializer):
    message = serializers.CharField(
        max_length=500,
        required=True,
        help_text="Raw supporter message to analyze before on-screen broadcast"
    )

class MessageModerationResponseSerializer(serializers.Serializer):
    is_safe = serializers.BooleanField(help_text="True if safe to display on livestream")
    flagged_categories = serializers.ListField(child=serializers.CharField())
    clean_message = serializers.CharField()
    engine = serializers.CharField()

class ThankYouRequestSerializer(serializers.Serializer):
    creator_name = serializers.CharField(max_length=100, default='Creator')
    supporter_name = serializers.CharField(max_length=64, default='Anonymous')
    amount = serializers.CharField(max_length=30, default='10')
    asset_code = serializers.CharField(max_length=12, default='XLM')
    supporter_message = serializers.CharField(max_length=280, required=False, allow_blank=True, default='')
    tone = serializers.ChoiceField(choices=['warm', 'playful', 'formal'], default='warm')

class ThankYouResponseSerializer(serializers.Serializer):
    thank_you_note = serializers.CharField()
    tone = serializers.CharField()
