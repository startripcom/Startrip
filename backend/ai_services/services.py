import logging
from django.conf import settings
from core.utils import sanitize_message

logger = logging.getLogger(__name__)

class OpenAIService:
    """
    Intelligent creator assistant powered by OpenAI models (with automatic fallback).
    Provides:
      1. Real-time supporter message safety moderation
      2. Personalized automated thank-you note generation
    """

    @classmethod
    def get_client(cls):
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            return None
        try:
            from openai import OpenAI
            return OpenAI(api_key=api_key)
        except Exception as e:
            logger.warning(f"Could not initialize OpenAI client: {e}")
            return None

    @classmethod
    def moderate_message(cls, message: str) -> dict:
        """
        Analyzes a supporter message for profanity, toxicity, hate, or spam.
        """
        clean_msg = sanitize_message(message)
        client = cls.get_client()

        if client:
            try:
                response = client.moderations.create(input=clean_msg)
                result = response.results[0]
                flagged = result.flagged
                categories = [
                    cat for cat, val in result.categories.model_dump().items() if val
                ]
                return {
                    'is_safe': not flagged,
                    'flagged_categories': categories,
                    'clean_message': clean_msg,
                    'engine': 'openai-moderation'
                }
            except Exception as e:
                logger.warning(f"OpenAI moderation API call failed, using rule-based fallback: {e}")

        # Rule-based fallback if OpenAI key is unset or network error
        profanity_blocklist = [
            'scam', 'phishing', 'seed phrase', 'private key', 'airdrop claim'
        ]
        lowered = clean_msg.lower()
        matched = [word for word in profanity_blocklist if word in lowered]

        return {
            'is_safe': len(matched) == 0,
            'flagged_categories': ['prohibited_keywords'] if matched else [],
            'clean_message': clean_msg,
            'engine': 'rule-based-fallback'
        }

    @classmethod
    def generate_thank_you_note(
        cls,
        creator_name: str,
        supporter_name: str,
        amount: str,
        asset_code: str,
        supporter_message: str = '',
        tone: str = 'warm'
    ) -> str:
        """
        Generates a personalized thank-you note from the creator to their supporter.
        """
        client = cls.get_client()

        if client:
            try:
                prompt = (
                    f"You are writing a short, authentic thank-you note (max 2 sentences) from content creator '{creator_name}' "
                    f"to a supporter named '{supporter_name}' who just sent a tip of {amount} {asset_code} on Stellar.\n"
                    f"Supporter message: \"{supporter_message}\"\n"
                    f"Tone: {tone}."
                )
                response = client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": "You are a friendly creator assistant. Keep thank-you notes concise, genuine, and under 250 characters."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=80,
                    temperature=0.7
                )
                return response.choices[0].message.content.strip()
            except Exception as e:
                logger.warning(f"OpenAI chat completion failed, using template fallback: {e}")

        # Intelligent template fallback
        supporter_display = supporter_name if supporter_name and supporter_name != 'Anonymous' else 'friend'
        if tone == 'playful':
            return f"You rock, {supporter_display}! Thanks a ton for the {amount} {asset_code} tip. To the stars! 🚀✨"
        elif tone == 'formal':
            return f"Dear {supporter_display}, thank you sincerely for your generous support of {amount} {asset_code}. It is deeply appreciated."
        else:
            return f"Thank you so much {supporter_display} for the {amount} {asset_code} tip! Your support fuels my work."
