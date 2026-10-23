from decimal import Decimal
from django.utils import timezone
from django.utils.html import escape
from django.http import HttpResponse
from django.shortcuts import redirect
from django.db.models import Sum, Count, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .models import CreatorProfile, WidgetConfig
from .serializers import (
    CreatorProfileSerializer,
    CreatorRegistrationSerializer,
    WidgetConfigSerializer,
    CreatorPublicSerializer,
    CreatorDashboardResponseSerializer,
    WidgetEmbedCodeSerializer,
)
from core.auth import IsWalletAuthenticated
from core.models import AuditLog

class CreatorRegisterView(APIView):
    """
    Onboarding: Register a new creator profile associated with the authenticated wallet.
    """
    permission_classes = [IsWalletAuthenticated]

    @extend_schema(
        tags=['Creator Profiles & Dashboard'],
        summary='Register creator profile',
        description='Creates a creator profile for the authenticated wallet address and generates default widget configuration.',
        request=CreatorRegistrationSerializer,
        responses={
            201: CreatorProfileSerializer,
            400: OpenApiResponse(description='Validation error or username already taken'),
            409: OpenApiResponse(description='Wallet already registered as creator'),
        }
    )
    def post(self, request):
        wallet_address = request.wallet_address

        existing_creator = CreatorProfile.objects.filter(wallet_address=wallet_address).first()
        if existing_creator:
            serializer = CreatorRegistrationSerializer(existing_creator, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            creator = serializer.save()
            return Response(
                CreatorProfileSerializer(creator).data,
                status=status.HTTP_200_OK
            )

        serializer = CreatorRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        receiving_wallet = serializer.validated_data.get('receiving_wallet_address') or wallet_address
        creator = serializer.save(
            wallet_address=wallet_address,
            receiving_wallet_address=receiving_wallet
        )
        # Create default widget config
        WidgetConfig.objects.create(creator=creator)

        AuditLog.objects.create(
            wallet_address=wallet_address,
            action='CREATOR_REGISTERED',
            details={'username': creator.username},
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response(
            CreatorProfileSerializer(creator).data,
            status=status.HTTP_201_CREATED
        )


class CreatorMeView(APIView):
    """
    Manage the currently authenticated creator's profile and receiving wallet.
    """
    permission_classes = [IsWalletAuthenticated]

    @extend_schema(
        tags=['Creator Profiles & Dashboard'],
        summary='Get authenticated creator profile',
        responses={
            200: CreatorProfileSerializer,
            404: OpenApiResponse(description='Creator profile not found'),
        }
    )
    def get(self, request):
        wallet_address = request.wallet_address
        try:
            creator = CreatorProfile.objects.prefetch_related('widgets').get(wallet_address=wallet_address)
        except CreatorProfile.DoesNotExist:
            return Response(
                {'error': 'No creator profile found for this wallet address.'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(CreatorProfileSerializer(creator).data)

    @extend_schema(
        tags=['Creator Profiles & Dashboard'],
        summary='Update creator profile & receiving wallet',
        request=CreatorRegistrationSerializer,
        responses={200: CreatorProfileSerializer}
    )
    def patch(self, request):
        wallet_address = request.wallet_address
        try:
            creator = CreatorProfile.objects.get(wallet_address=wallet_address)
        except CreatorProfile.DoesNotExist:
            return Response(
                {'error': 'Creator profile not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = CreatorRegistrationSerializer(creator, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_creator = serializer.save()

        AuditLog.objects.create(
            wallet_address=wallet_address,
            action='CREATOR_PROFILE_UPDATED',
            details=request.data,
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response(CreatorProfileSerializer(updated_creator).data)


class WidgetConfigMeView(APIView):
    """
    Manage widget customization settings for the authenticated creator.
    """
    permission_classes = [IsWalletAuthenticated]

    @extend_schema(
        tags=['Widget Configuration'],
        summary='Get or update tipping widget configuration',
        description='Customizes widget branding, color palette, preset amounts, avatar, banner, and alert duration.',
        request=WidgetConfigSerializer,
        responses={200: WidgetConfigSerializer}
    )
    def get(self, request):
        wallet_address = request.wallet_address
        creator = CreatorProfile.objects.prefetch_related('widgets').filter(wallet_address=wallet_address).first()
        if not creator:
            return Response({'error': 'Creator profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        widget_id = request.query_params.get('widget_id')
        if widget_id:
            config = creator.widgets.filter(id=widget_id).first()
        else:
            config = creator.widget_config

        if not config:
            config = WidgetConfig.objects.create(creator=creator, is_default=True, name='Main Tip Link')

        return Response(WidgetConfigSerializer(config).data)

    def patch(self, request):
        wallet_address = request.wallet_address
        creator = CreatorProfile.objects.prefetch_related('widgets').filter(wallet_address=wallet_address).first()
        if not creator:
            return Response({'error': 'Creator profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        widget_id = request.query_params.get('widget_id')
        if widget_id:
            config = creator.widgets.filter(id=widget_id).first()
        else:
            config = creator.widget_config

        if not config:
            config = WidgetConfig.objects.create(creator=creator, is_default=True, name='Main Tip Link')

        serializer = WidgetConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data.get('is_default'):
            creator.widgets.exclude(id=config.id).update(is_default=False)

        serializer.save()
        return Response(serializer.data)


class CreatorWidgetsListView(APIView):
    """
    CRUD for multiple tipping widgets/links per creator.
    """
    permission_classes = [IsWalletAuthenticated]

    @extend_schema(
        tags=['Widget Configuration'],
        summary='List or create creator tip widgets',
        description='Returns all custom tip links/widgets or creates a new customized one.',
        responses={200: WidgetConfigSerializer(many=True), 201: WidgetConfigSerializer}
    )
    def get(self, request):
        wallet_address = request.wallet_address
        creator = CreatorProfile.objects.prefetch_related('widgets').filter(wallet_address=wallet_address).first()
        if not creator:
            return Response({'error': 'Creator profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not creator.widgets.exists():
            WidgetConfig.objects.create(creator=creator, is_default=True, name='Main Tip Link')

        widgets = creator.widgets.all()
        return Response(WidgetConfigSerializer(widgets, many=True).data)

    def post(self, request):
        wallet_address = request.wallet_address
        creator = CreatorProfile.objects.filter(wallet_address=wallet_address).first()
        if not creator:
            return Response({'error': 'Creator profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = WidgetConfigSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_default = serializer.validated_data.get('is_default', False)
        if not creator.widgets.exists():
            is_default = True
        elif is_default:
            creator.widgets.update(is_default=False)

        widget = serializer.save(creator=creator, is_default=is_default)
        return Response(WidgetConfigSerializer(widget).data, status=status.HTTP_201_CREATED)


class CreatorWidgetDetailView(APIView):
    """
    Retrieve, update or delete a specific tipping widget.
    """
    permission_classes = [IsWalletAuthenticated]

    def get(self, request, pk):
        wallet_address = request.wallet_address
        creator = CreatorProfile.objects.filter(wallet_address=wallet_address).first()
        if not creator:
            return Response({'error': 'Creator profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        widget = creator.widgets.filter(id=pk).first()
        if not widget:
            return Response({'error': 'Widget not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(WidgetConfigSerializer(widget).data)

    def patch(self, request, pk):
        wallet_address = request.wallet_address
        creator = CreatorProfile.objects.filter(wallet_address=wallet_address).first()
        if not creator:
            return Response({'error': 'Creator profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        widget = creator.widgets.filter(id=pk).first()
        if not widget:
            return Response({'error': 'Widget not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = WidgetConfigSerializer(widget, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data.get('is_default'):
            creator.widgets.exclude(id=widget.id).update(is_default=False)

        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        wallet_address = request.wallet_address
        creator = CreatorProfile.objects.filter(wallet_address=wallet_address).first()
        if not creator:
            return Response({'error': 'Creator profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        widget = creator.widgets.filter(id=pk).first()
        if not widget:
            return Response({'error': 'Widget not found.'}, status=status.HTTP_404_NOT_FOUND)

        if creator.widgets.count() <= 1:
            return Response({'error': 'Cannot delete your only tipping widget. Edit it instead.'}, status=status.HTTP_400_BAD_REQUEST)

        was_default = widget.is_default
        widget.delete()

        if was_default:
            next_default = creator.widgets.first()
            if next_default:
                next_default.is_default = True
                next_default.save()

        return Response({'message': 'Widget successfully deleted.'}, status=status.HTTP_200_OK)


class CreatorPublicProfileView(APIView):
    """
    Public creator profile endpoint consumed by the embeddable widget and standalone tipping page.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Widget Configuration'],
        summary='Get public creator profile and widget configuration',
        description='Public endpoint for widgets to load creator brand, supported assets, and preset tip amounts.',
        responses={
            200: CreatorPublicSerializer,
            404: OpenApiResponse(description='Creator not found'),
        }
    )
    def get(self, request, username):
        try:
            creator = CreatorProfile.objects.prefetch_related('widgets').get(username__iexact=username)
        except CreatorProfile.DoesNotExist:
            return Response(
                {'error': f'Creator @{username} not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        widget_param = request.query_params.get('widget')
        active_widget = None
        if widget_param:
            active_widget = (
                creator.widgets.filter(slug__iexact=widget_param).first() or
                (creator.widgets.filter(id=int(widget_param)).first() if widget_param.isdigit() else None)
            )
        if not active_widget:
            active_widget = creator.widget_config

        data = CreatorPublicSerializer(creator).data
        if active_widget:
            data['widget_config'] = WidgetConfigSerializer(active_widget).data
        return Response(data)


class CreatorDashboardView(APIView):
    """
    Dashboard analytics aggregating confirmed on-chain tips, daily activity, and top supporters.
    """
    permission_classes = [IsWalletAuthenticated]

    @extend_schema(
        tags=['Creator Profiles & Dashboard'],
        summary='Creator dashboard metrics & analytics',
        description='Returns confirmed totals for XLM and USDC, today tips count, recent tips list, and top supporter leaderboards.',
        responses={200: CreatorDashboardResponseSerializer}
    )
    def get(self, request):
        wallet_address = request.wallet_address
        try:
            creator = CreatorProfile.objects.prefetch_related('widgets').get(wallet_address=wallet_address)
        except CreatorProfile.DoesNotExist:
            return Response(
                {'error': 'Creator profile not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        from payments.models import Tip

        now = timezone.now()
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        confirmed_tips = Tip.objects.filter(creator=creator, status='confirmed')

        # Totals
        total_xlm = confirmed_tips.filter(asset_code='XLM').aggregate(Sum('amount'))['amount__sum'] or Decimal('0')
        total_usdc = confirmed_tips.filter(asset_code='USDC').aggregate(Sum('amount'))['amount__sum'] or Decimal('0')
        total_count = confirmed_tips.count()

        # Today metrics
        today_tips = confirmed_tips.filter(created_at__gte=start_of_today)
        tips_today_count = today_tips.count()
        today_xlm = today_tips.filter(asset_code='XLM').aggregate(Sum('amount'))['amount__sum'] or Decimal('0')
        today_usdc = today_tips.filter(asset_code='USDC').aggregate(Sum('amount'))['amount__sum'] or Decimal('0')

        # Recent tips (last 10)
        recent_tips_qs = confirmed_tips.order_by('-created_at')[:10]
        recent_tips_data = [
            {
                'id': t.reference_id,
                'supporter_name': t.supporter_name or 'Anonymous',
                'supporter_wallet': t.supporter_wallet,
                'asset_code': t.asset_code,
                'amount': str(t.amount),
                'message': t.message,
                'stellar_tx_hash': t.stellar_tx_hash,
                'created_at': t.created_at.isoformat(),
            }
            for t in recent_tips_qs
        ]

        # Top supporters
        top_supporters_qs = (
            confirmed_tips
            .values('supporter_name', 'supporter_wallet', 'asset_code')
            .annotate(total_amount=Sum('amount'), tips_count=Count('id'))
            .order_by('-total_amount')[:5]
        )
        top_supporters_list = [
            {
                'supporter_name': s['supporter_name'] or (f"{s['supporter_wallet'][:4]}…{s['supporter_wallet'][-4:]}" if s['supporter_wallet'] else 'Anonymous'),
                'supporter_wallet': s['supporter_wallet'] or '',
                'total_amount': str(s['total_amount']),
                'asset_code': s['asset_code'],
                'tips_count': s['tips_count'],
            }
            for s in top_supporters_qs
        ]

        # Biggest tip all-time
        biggest_tip_obj = confirmed_tips.order_by('-amount').first()
        biggest_tip_data = None
        if biggest_tip_obj:
            biggest_tip_data = {
                'id': biggest_tip_obj.reference_id,
                'supporter_name': biggest_tip_obj.supporter_name or 'Anonymous',
                'amount': str(biggest_tip_obj.amount),
                'asset_code': biggest_tip_obj.asset_code,
                'message': biggest_tip_obj.message or '',
                'stellar_tx_hash': biggest_tip_obj.stellar_tx_hash or '',
                'created_at': biggest_tip_obj.created_at.isoformat(),
            }

        widget_cfg = creator.widget_config
        dashboard_data = {
            'total_xlm_tips': total_xlm,
            'total_usdc_tips': total_usdc,
            'total_tips_count': total_count,
            'tips_today_count': tips_today_count,
            'tips_today_xlm': today_xlm,
            'tips_today_usdc': today_usdc,
            'recent_tips': recent_tips_data,
            'top_supporters': top_supporters_list,
            'biggest_tip': biggest_tip_data,
            'widget_status': {
                'is_active': widget_cfg.is_active if widget_cfg else True,
                'theme': widget_cfg.theme if widget_cfg else 'dark',
                'primary_color': widget_cfg.primary_color if widget_cfg else '#6366F1',
                'overlay_token': str(widget_cfg.overlay_token) if widget_cfg else '',
                'total_widgets_count': creator.widgets.count(),
            }
        }

        return Response(dashboard_data, status=status.HTTP_200_OK)


class CreatorEmbedCodeView(APIView):
    """
    Generates ready-to-copy HTML/JavaScript snippets for embedding the widget.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Widget Configuration'],
        summary='Get widget embed snippets and overlay links',
        description='Provides pre-formatted iframe code, JS script snippet, and livestream overlay link for the creator.',
        responses={200: WidgetEmbedCodeSerializer}
    )
    def get(self, request, username):
        try:
            creator = CreatorProfile.objects.prefetch_related('widgets').get(username__iexact=username)
        except CreatorProfile.DoesNotExist:
            return Response(
                {'error': f'Creator @{username} not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        widget_id = request.query_params.get('widget_id')
        widget_slug = request.query_params.get('widget_slug')
        widget_param = request.query_params.get('widget')
        widget = None
        if widget_id:
            widget = creator.widgets.filter(id=widget_id).first()
        elif widget_slug:
            widget = creator.widgets.filter(slug=widget_slug).first()
        elif widget_param:
            if widget_param.isdigit():
                widget = creator.widgets.filter(id=int(widget_param)).first()
            if not widget:
                widget = creator.widgets.filter(slug=widget_param).first()
        if not widget:
            widget = creator.widget_config

        host = request.get_host()
        scheme = request.scheme

        direct_link = f"{scheme}://{host}/tip/{creator.username}/" if not widget or widget.is_default else f"{scheme}://{host}/tip/{creator.username}?widget={widget.slug}"
        overlay_token = str(widget.overlay_token) if widget else (str(creator.widget_config.overlay_token) if creator.widget_config else '')
        overlay_url = f"{scheme}://{host}/overlay/{overlay_token}/"
        embed_param = f"?widget={widget.slug}" if widget and not widget.is_default else ""
        iframe_code = (
            f'<iframe\n'
            f'  src="{scheme}://{host}/embed/{creator.username}/{embed_param}"\n'
            f'  width="380"\n'
            f'  height="540"\n'
            f'  frameborder="0"\n'
            f'  style="border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);"\n'
            f'  title="Tip {creator.display_name}">\n'
            f'</iframe>'
        )
        js_code = (
            f'<div id="startip-widget"></div>\n'
            f'<script\n'
            f'  src="{scheme}://{host}/static/widget.js"\n'
            f'  data-creator="{creator.username}"\n'
            f'  data-widget="{widget.slug if widget else "main"}"\n'
            f'  data-target="startip-widget">\n'
            f'</script>'
        )

        return Response({
            'creator_username': creator.username,
            'widget_id': widget.id if widget else None,
            'widget_name': widget.name if widget else 'Main Tip Link',
            'direct_link': direct_link,
            'iframe_code': iframe_code,
            'javascript_code': js_code,
            'overlay_url': overlay_url,
        })


def creator_og_image_api(request, username):
    """
    Renders 1200x630 dynamic Open Graph PNG social preview card for a creator.
    Used by Twitter/X, Discord, Telegram, WhatsApp, LinkedIn, iMessage.
    """
    creator = None
    try:
        creator = CreatorProfile.objects.prefetch_related('widgets').filter(username__iexact=username).first()
    except Exception:
        pass

    if not creator:
        from types import SimpleNamespace
        creator = SimpleNamespace(
            username=username,
            display_name=username.replace('-', ' ').replace('_', ' ').title(),
            bio="Send instant non-custodial tips in XLM or USDC directly to my Stellar wallet.",
            avatar_url="",
            widget_config=None,
        )

    from .og_image import render_creator_og_bytes
    img_bytes = render_creator_og_bytes(creator)
    response = HttpResponse(img_bytes, content_type='image/png')
    response['Cache-Control'] = 'public, max-age=86400, s-maxage=86400'
    return response


def creator_social_preview_view(request, username):
    """
    Lightweight, crawler-optimized HTML endpoint for social platforms
    (Twitter/X, Discord, Telegram, WhatsApp, Facebook, LinkedIn, iMessage).
    Renders rich Open Graph & Twitter Cards, plus fallback meta-refresh for browsers.
    """
    creator = None
    try:
        creator = CreatorProfile.objects.prefetch_related('widgets').filter(username__iexact=username).first()
    except Exception:
        pass

    if not creator:
        from types import SimpleNamespace
        creator = SimpleNamespace(
            username=username,
            display_name=username.replace('-', ' ').replace('_', ' ').title(),
            bio="Send instant non-custodial tips in XLM or USDC directly to my Stellar wallet with live on-stream alerts.",
            avatar_url="",
            widget_config=None,
        )

    display_name = getattr(creator, 'display_name', '') or creator.username
    clean_username = creator.username
    bio = getattr(creator, 'bio', '') or (creator.widget_config.welcome_message if getattr(creator, 'widget_config', None) else "")
    if not bio:
        bio = "Send instant non-custodial tips in XLM or USDC directly to my Stellar wallet with live on-stream alerts."

    # Absolute URLs for social crawlers (always startip.app in prod)
    host = "startip.app" if "startip.app" in request.get_host() else request.get_host()
    scheme = "https" if "startip.app" in host else request.scheme
    base_url = f"{scheme}://{host}"

    page_url = f"{base_url}/tip/{clean_username}"
    og_image_url = f"{base_url}/api/og/{clean_username}.png"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>⚡ Tip {escape(display_name)} (@{escape(clean_username)}) — StarTip</title>
  <meta name="description" content="{escape(bio)}">

  <!-- Open Graph / Facebook / LinkedIn / WhatsApp -->
  <meta property="og:site_name" content="StarTip">
  <meta property="og:type" content="profile">
  <meta property="og:url" content="{page_url}">
  <meta property="og:title" content="⚡ Tip {escape(display_name)} (@{escape(clean_username)}) — StarTip">
  <meta property="og:description" content="{escape(bio)}">
  <meta property="og:image" content="{og_image_url}">
  <meta property="og:image:secure_url" content="{og_image_url}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Tip {escape(display_name)} on StarTip">

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@StarTipApp">
  <meta name="twitter:creator" content="@StarTipApp">
  <meta name="twitter:title" content="⚡ Tip {escape(display_name)} (@{escape(clean_username)}) — StarTip">
  <meta name="twitter:description" content="{escape(bio)}">
  <meta name="twitter:image" content="{og_image_url}">
  <meta name="theme-color" content="#070A1A">

  <!-- Automatic fallback redirect to React SPA for standard browsers -->
  <meta http-equiv="refresh" content="0; url=/tip/{clean_username}">
  <script>
    if (typeof window !== 'undefined' && window.location) {{
      window.location.replace("/tip/{clean_username}");
    }}
  </script>
</head>
<body style="margin:0;padding:40px;background:#070A1A;color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;">
  <div style="max-width:480px;background:#0E1333;border:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:32px;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
    <div style="font-size:36px;margin-bottom:12px;">⚡</div>
    <h1 style="font-size:24px;margin:0 0 8px 0;color:#FFFFFF;">Tip {escape(display_name)}</h1>
    <div style="font-size:16px;color:#C6FF3D;font-weight:bold;margin-bottom:16px;">@{escape(clean_username)}</div>
    <p style="font-size:14px;color:#94A3B8;line-height:1.5;margin-bottom:24px;">{escape(bio)}</p>
    <a href="/tip/{clean_username}" style="display:inline-block;background:#C6FF3D;color:#0B1026;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:9999px;">
      Launch Tip Page →
    </a>
  </div>
</body>
</html>"""
    return HttpResponse(html, content_type="text/html; charset=utf-8")
