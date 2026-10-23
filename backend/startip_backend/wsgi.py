"""
WSGI config for StarTip backend project.
"""
import os
from django.core.wsgi import get_wsgi_application

settings_module = os.environ.get('DJANGO_SETTINGS_MODULE', 'startip_backend.settings')
try:
    import importlib
    importlib.import_module(settings_module)
except ModuleNotFoundError:
    settings_module = 'startip_backend.settings'
os.environ['DJANGO_SETTINGS_MODULE'] = settings_module

application = get_wsgi_application()
