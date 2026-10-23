import os
from pathlib import Path
from django.shortcuts import render, redirect
from django.http import HttpResponse, HttpResponseNotFound
from creators.models import CreatorProfile

def get_frontend_dist_dir():
    """
    Locates the compiled Vite frontend dist directory across docker and local environments.
    """
    # 1. Container production path
    p1 = Path('/app/frontend_dist')
    if p1.exists() and (p1 / 'index.html').exists():
        return p1

    # 2. Local backend/frontend_dist
    p2 = Path(__file__).resolve().parent.parent / 'frontend_dist'
    if p2.exists() and (p2 / 'index.html').exists():
        return p2

    # 3. Monorepo sibling frontend/dist
    p3 = Path(__file__).resolve().parent.parent.parent / 'frontend' / 'dist'
    if p3.exists() and (p3 / 'index.html').exists():
        return p3

    return None

from django.views.decorators.clickjacking import xframe_options_exempt
from django.utils.html import escapejs

def spa_index_view(request):
    """
    Serves the refined StarTip React SPA frontend.
    Falls back to /api/docs/ if the frontend build hasn't been compiled.
    """
    dist_dir = get_frontend_dist_dir()
    if dist_dir:
        index_html = dist_dir / 'index.html'
        if index_html.exists():
            with open(index_html, 'r', encoding='utf-8') as f:
                return HttpResponse(f.read(), content_type='text/html')

    return redirect('/api/docs/')

@xframe_options_exempt
def embed_widget_view(request, username):
    """
    Renders standalone embeddable widget designed for iframe or embed integration.
    Supports query parameter: ?widget=<slug_or_id>
    """
    try:
        creator = CreatorProfile.objects.prefetch_related('widgets').get(username__iexact=username)
    except CreatorProfile.DoesNotExist:
        return HttpResponseNotFound(f"Creator @{username} not found.")

    widget_slug = request.GET.get('widget', '').strip()
    config = None
    if widget_slug:
        config = creator.widgets.filter(slug__iexact=widget_slug).first()
        if not config and widget_slug.isdigit():
            config = creator.widgets.filter(id=int(widget_slug)).first()

    if not config:
        config = creator.widget_config

    response = render(request, 'widget.html', {
        'creator': creator,
        'config': config,
        'selected_widget_slug': widget_slug or (config.slug if config else ''),
    })
    response['X-Frame-Options'] = 'ALLOWALL'
    response['Content-Security-Policy'] = "frame-ancestors *"
    return response

def embed_widget_js_view(request, username=None):
    """
    Serves the StarTip universal embed loader JavaScript.
    Can be loaded directly as:
      <script src="/embed/<username>/widget.js?widget=<slug>" async></script>
      <script src="/embed/widget.js?creator=<username>&widget=<slug>" async></script>
    """
    widget_slug = request.GET.get('widget', '').strip()
    target_creator = username or request.GET.get('creator', '').strip()

    static_file = Path(__file__).resolve().parent.parent / 'static' / 'widget.js'
    js_content = ""
    if static_file.exists():
        with open(static_file, 'r', encoding='utf-8') as f:
            js_content = f.read()

    # Inject server context if creator or widget is known
    preamble = ""
    if target_creator:
        preamble += f'window.__STARTIP_DEFAULT_CREATOR__ = "{escapejs(target_creator)}";\n'
    if widget_slug:
        preamble += f'window.__STARTIP_DEFAULT_WIDGET__ = "{escapejs(widget_slug)}";\n'

    full_js = preamble + js_content

    response = HttpResponse(full_js, content_type='application/javascript; charset=utf-8')
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response['Cache-Control'] = 'public, max-age=300'
    return response

def demo_page_view(request):
    """
    Live developer and creator testbench demonstrating:
    - Widget embedding
    - Live alert trigger
    - Stellar Testnet transactions
    """
    creators = CreatorProfile.objects.prefetch_related('widgets').all()[:10]
    first_creator = creators.first() if creators else None
    return render(request, 'demo.html', {
        'creators': creators,
        'first_creator': first_creator,
    })
