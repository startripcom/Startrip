import json
import time
import queue
from django.http import StreamingHttpResponse, HttpResponseNotFound
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .manager import AlertManager
from creators.models import WidgetConfig

class LiveAlertStreamView(APIView):
    """
    Server-Sent Events (SSE) live stream endpoint for streaming software browser sources (OBS, Streamlabs).
    Streams real-time tip events as they confirm on-chain.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Live Stream Alerts'],
        summary='SSE live alert stream for livestream overlays',
        description='Server-Sent Events stream delivering real-time tip alerts to browser sources in OBS and Streamlabs.',
        responses={200: OpenApiResponse(description='SSE event stream')}
    )
    def get(self, request, overlay_token):
        token_str = str(overlay_token).strip()
        import uuid
        from creators.models import CreatorProfile, WidgetConfig
        
        config = None
        try:
            uuid.UUID(token_str)
            config = WidgetConfig.objects.filter(overlay_token=token_str).first()
        except (ValueError, TypeError):
            config = None

        if not config:
            config = WidgetConfig.objects.filter(creator__username__iexact=token_str).first()

        if not config and not CreatorProfile.objects.filter(username__iexact=token_str).exists():
            return Response({'error': 'Invalid overlay token or creator handle.'}, status=status.HTTP_404_NOT_FOUND)

        def event_generator():
            token_clean = token_str.lower()
            yield f": connected to StarTip overlay {token_clean[:8]}\n\n"

            # Connect Redis PubSub listener for multi-worker realtime events
            redis_sub = None
            try:
                r = AlertManager.get_redis()
                if r:
                    redis_sub = r.pubsub(ignore_subscribe_messages=True)
                    redis_sub.subscribe(f"startip:alerts:{token_clean}")
                    if token_str != token_clean:
                        redis_sub.subscribe(f"startip:alerts:{token_str}")
            except Exception as err:
                redis_sub = None

            local_q = AlertManager.subscribe(token_str)

            last_ping = time.time()
            try:
                while True:
                    dispatched = False

                    # Check Redis PubSub first
                    if redis_sub:
                        try:
                            msg = redis_sub.get_message(timeout=1.0)
                            if msg and msg.get('type') == 'message':
                                raw_data = msg.get('data')
                                alert_data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
                                json_str = json.dumps(alert_data)
                                yield f"event: {alert_data.get('event', 'tip')}\ndata: {json_str}\n\n"
                                dispatched = True
                        except Exception:
                            pass

                    # Check local in-memory queue fallback
                    if not dispatched:
                        try:
                            alert_data = local_q.get(timeout=1.0)
                            json_str = json.dumps(alert_data)
                            yield f"event: {alert_data.get('event', 'tip')}\ndata: {json_str}\n\n"
                            dispatched = True
                        except queue.Empty:
                            pass

                    # Keep-alive heartbeat ping every 15s to prevent proxy timeouts
                    if time.time() - last_ping >= 15.0:
                        yield ": ping\n\n"
                        last_ping = time.time()

            except GeneratorExit:
                if redis_sub:
                    try:
                        redis_sub.close()
                    except Exception:
                        pass
                AlertManager.unsubscribe(token_str, local_q)
            finally:
                if redis_sub:
                    try:
                        redis_sub.close()
                    except Exception:
                        pass
                AlertManager.unsubscribe(token_str, local_q)

        response = StreamingHttpResponse(
            event_generator(),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache, no-transform'
        response['X-Accel-Buffering'] = 'no'
        response['Connection'] = 'keep-alive'
        return response


class TriggerTestAlertView(APIView):
    """
    Triggers a simulated test alert on the creator's live stream overlay.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Live Stream Alerts'],
        summary='Trigger test alert',
        description='Simulates a live tip alert to verify OBS/Streamlabs overlay visual and audio styling.',
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'overlay_token': {'type': 'string', 'format': 'uuid'},
                    'amount': {'type': 'string', 'example': '5'},
                    'asset_code': {'type': 'string', 'example': 'USDC'},
                    'supporter_name': {'type': 'string', 'example': 'Stellar Fan'},
                    'message': {'type': 'string', 'example': 'Keep building amazing things on Stellar!'},
                },
                'required': ['overlay_token']
            }
        },
        responses={200: OpenApiResponse(description='Test alert dispatched')}
    )
    def post(self, request):
        overlay_token = request.data.get('overlay_token')
        if not overlay_token:
            # If authenticated creator, use their overlay token
            wallet = getattr(request, 'wallet_address', None)
            if wallet:
                config = WidgetConfig.objects.filter(creator__wallet_address=wallet).first()
                if config:
                    overlay_token = str(config.overlay_token)

        if not overlay_token:
            return Response({'error': 'overlay_token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        amount = str(request.data.get('amount', '5'))
        asset_code = str(request.data.get('asset_code', 'USDC')).upper()
        supporter_name = str(request.data.get('supporter_name', 'Stellar Supporter'))
        message = str(request.data.get('message', 'Keep building amazing things on Stellar!'))

        AlertManager.publish_test(
            overlay_token=overlay_token,
            amount=amount,
            asset_code=asset_code,
            supporter_name=supporter_name,
            message=message
        )

        return Response({
            'success': True,
            'message': f"Dispatched test alert for overlay {str(overlay_token)[:8]}..."
        }, status=status.HTTP_200_OK)


def overlay_page_view(request, overlay_token):
    """
    Renders standalone transparent overlay webpage for OBS Browser Source.
    Supports either widget overlay_token UUID or creator username.
    """
    token_str = str(overlay_token).strip()
    import uuid
    config = None
    try:
        uuid.UUID(token_str)
        config = WidgetConfig.objects.select_related('creator').filter(overlay_token=token_str).first()
    except (ValueError, TypeError):
        config = None

    if not config:
        config = WidgetConfig.objects.select_related('creator').filter(creator__username__iexact=token_str).first()
    if not config:
        return HttpResponseNotFound("Invalid overlay token or creator handle.")

    return render(request, 'overlay.html', {
        'config': config,
        'overlay_token': str(config.overlay_token),
    })
