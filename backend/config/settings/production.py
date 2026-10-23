"""
Production settings module for DJANGO_SETTINGS_MODULE=config.settings.production.
"""
import os
from startip_backend.settings import *

# Explicitly ensure DEBUG is False in production settings
DEBUG = False

# Security settings in production
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False').lower() in ('true', '1')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
