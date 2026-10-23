from django.urls import path
from .views import (
    MessageModerationView,
    ThankYouGeneratorView,
)

urlpatterns = [
    path('ai/moderate/', MessageModerationView.as_view(), name='ai-moderate'),
    path('ai/generate-thank-you/', ThankYouGeneratorView.as_view(), name='ai-generate-thank-you'),
]
