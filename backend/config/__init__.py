"""
Compatibility package allowing `config.wsgi`, `config.settings.production`, and `celery -A config`
to work seamlessly alongside `startip_backend`.
"""
from .celery import app as celery_app

__all__ = ('celery_app',)
