from django.urls import path
from .views import (
    CreatePaymentRequestView,
    BuildTransactionXDRView,
    VerifyPaymentView,
    TipListView,
    TipDetailView,
)

urlpatterns = [
    path('payments/create-request/', CreatePaymentRequestView.as_view(), name='payment-create-request'),
    path('payments/build-xdr/', BuildTransactionXDRView.as_view(), name='payment-build-xdr'),
    path('payments/verify/', VerifyPaymentView.as_view(), name='payment-verify'),
    path('payments/tips/', TipListView.as_view(), name='payment-tips-list'),
    path('payments/tips/<str:reference_id>/', TipDetailView.as_view(), name='payment-tip-detail'),
]
