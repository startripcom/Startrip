from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .services import OpenAIService
from .serializers import (
    MessageModerationRequestSerializer,
    MessageModerationResponseSerializer,
    ThankYouRequestSerializer,
    ThankYouResponseSerializer,
)

class MessageModerationView(APIView):
    """
    Message Safety & Content Moderation:
    Analyzes supporter messages for offensive or dangerous content before public display.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['OpenAI Services'],
        summary='Analyze and moderate supporter message',
        description='Evaluates supporter comment text using OpenAI Moderation API to protect creator stream overlay against hate, toxicity, or harassment.',
        request=MessageModerationRequestSerializer,
        responses={200: MessageModerationResponseSerializer}
    )
    def post(self, request):
        serializer = MessageModerationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = OpenAIService.moderate_message(serializer.validated_data['message'])
        return Response(result, status=status.HTTP_200_OK)


class ThankYouGeneratorView(APIView):
    """
    Automated Thank-You Generation:
    Produces a warm, personalized creator response to supporters based on tip parameters.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['OpenAI Services'],
        summary='Generate personalized supporter thank-you note',
        description='Uses OpenAI GPT models to craft a customized creator thank-you response tailored to the tip asset, amount, and message.',
        request=ThankYouRequestSerializer,
        responses={200: ThankYouResponseSerializer}
    )
    def post(self, request):
        serializer = ThankYouRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        note = OpenAIService.generate_thank_you_note(
            creator_name=data['creator_name'],
            supporter_name=data['supporter_name'],
            amount=data['amount'],
            asset_code=data['asset_code'],
            supporter_message=data.get('supporter_message', ''),
            tone=data.get('tone', 'warm')
        )

        return Response({
            'thank_you_note': note,
            'tone': data.get('tone', 'warm'),
        }, status=status.HTTP_200_OK)
