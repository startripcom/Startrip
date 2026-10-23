from django.urls import path
from .views import (
    AuthChallengeView,
    AuthVerifyView,
    AuthLogoutView,
    HealthCheckView,
    WalletBalanceView,
    ImageUploadView,
)

urlpatterns = [
    path('auth/challenge/', AuthChallengeView.as_view(), name='auth-challenge'),
    path('auth/verify/', AuthVerifyView.as_view(), name='auth-verify'),
    path('auth/logout/', AuthLogoutView.as_view(), name='auth-logout'),
    path('wallet/balance/', WalletBalanceView.as_view(), name='wallet-balance'),
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('upload/image/', ImageUploadView.as_view(), name='image-upload'),
]
