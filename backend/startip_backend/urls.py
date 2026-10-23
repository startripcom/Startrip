"""
URL configuration for StarTip backend & unified frontend serving.
"""
from django.contrib import admin
from django.urls import path, re_path, include
from django.views.static import serve
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from alerts.views import overlay_page_view
from creators.views import creator_social_preview_view
from .views import (
    embed_widget_view,
    embed_widget_js_view,
    demo_page_view,
    spa_index_view,
    get_frontend_dist_dir,
)

dist_dir = get_frontend_dist_dir()
assets_dir = str(dist_dir / 'assets') if dist_dir and (dist_dir / 'assets').exists() else None

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # OpenAPI 3.0 Documentation (Swagger & ReDoc)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Domain API routes
    path('api/', include('core.urls')),
    path('api/', include('creators.urls')),
    path('api/', include('payments.urls')),
    path('', include('alerts.urls')),
    path('api/', include('ai_services.urls')),

    # Embed & Standalone Script/Widget Views
    re_path(r'^embed/(?P<username>[a-zA-Z0-9_\-\.]+)/widget\.js$', embed_widget_js_view, name='embed-widget-js-user'),
    re_path(r'^embed/widget\.js$', embed_widget_js_view, name='embed-widget-js'),
    re_path(r'^static/widget\.js$', embed_widget_js_view, name='embed-widget-js-static'),
    re_path(r'^embed/(?P<username>[a-zA-Z0-9_\-\.]+)/?$', embed_widget_view, name='embed-widget'),
    re_path(r'^tip/(?P<username>[a-zA-Z0-9_\-\.]+)/?$', embed_widget_view, name='direct-tip-page'),
    path('tip-og/<str:username>/', creator_social_preview_view, name='tip-og-preview'),
    path('demo-bench/', demo_page_view, name='demo-page'),
]

from django.conf import settings

# Serve user uploaded media files (/media/...)
urlpatterns.append(
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT})
)

def dynamic_assets_serve(request, path):
    d = get_frontend_dist_dir()
    if d and (d / 'assets').exists():
        return serve(request, path, document_root=str(d / 'assets'))
    return HttpResponseNotFound("Asset not found")

# Serve compiled frontend static assets (/assets/...)
urlpatterns.append(
    re_path(r'^assets/(?P<path>.*)$', dynamic_assets_serve, name='frontend-assets')
)


# Root SPA & Catch-all client routes for SPA (e.g. /dashboard, /demo)
urlpatterns.extend([
    path('', spa_index_view, name='frontend-root'),
    re_path(r'^(?!api/|admin/|overlay/|embed/|static/|assets/|media/|demo-bench/).*$', spa_index_view, name='spa-client-route'),
])
