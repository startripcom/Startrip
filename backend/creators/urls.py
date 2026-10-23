from django.urls import path
from .views import (
    CreatorRegisterView,
    CreatorMeView,
    WidgetConfigMeView,
    CreatorWidgetsListView,
    CreatorWidgetDetailView,
    CreatorPublicProfileView,
    CreatorDashboardView,
    CreatorEmbedCodeView,
    creator_og_image_api,
    creator_social_preview_view,
)

urlpatterns = [
    path('creators/register/', CreatorRegisterView.as_view(), name='creator-register'),
    path('creators/me/', CreatorMeView.as_view(), name='creator-me'),
    path('creators/me/widgets/', CreatorWidgetsListView.as_view(), name='creator-widgets-list'),
    path('creators/me/widgets/<int:pk>/', CreatorWidgetDetailView.as_view(), name='creator-widget-detail'),
    path('creators/me/widget-config/', WidgetConfigMeView.as_view(), name='widget-config-me'),
    path('creators/me/dashboard/', CreatorDashboardView.as_view(), name='creator-dashboard'),
    path('creators/<str:username>/', CreatorPublicProfileView.as_view(), name='creator-public'),
    path('creators/<str:username>/embed-code/', CreatorEmbedCodeView.as_view(), name='creator-embed-code'),
    path('og/<str:username>.png', creator_og_image_api, name='creator-og-image'),
    path('social-preview/<str:username>/', creator_social_preview_view, name='creator-social-preview'),
]
