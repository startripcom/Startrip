"""
Celery compatibility module for `celery -A config`.
"""
from startip_backend.celery import app

__all__ = ('app',)
