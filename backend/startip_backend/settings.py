"""
Django settings for StarTip Backend.
Production-ready configuration for Dokploy, Docker, and local development.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file if present
load_dotenv(BASE_DIR / '.env')
load_dotenv(BASE_DIR.parent / '.env')

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

SECRET_KEY = os.getenv(
    'DJANGO_SECRET_KEY',
    'django-insecure-startip-stellar-super-secret-key-change-in-production-!@#$'
)

DEBUG = os.getenv('DJANGO_DEBUG', 'True').lower() in ('true', '1', 'yes')

_raw_hosts = os.getenv('DJANGO_ALLOWED_HOSTS', 'startip.app,.startip.app,localhost,127.0.0.1,web,*')
ALLOWED_HOSTS = [h.strip() for h in _raw_hosts.split(',') if h.strip()]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'whitenoise.runserver_nostatic',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'corsheaders',
    'drf_spectacular',

    # StarTip core and domain apps
    'core.apps.CoreConfig',
    'creators.apps.CreatorsConfig',
    'payments.apps.PaymentsConfig',
    'alerts.apps.AlertsConfig',
    'ai_services.apps.AiServicesConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Allow framing for embeddable widget
X_FRAME_OPTIONS = 'ALLOWALL'

ROOT_URLCONF = 'startip_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'startip_backend.wsgi.application'
ASGI_APPLICATION = 'startip_backend.asgi.application'

# Database
# Support PostgreSQL via environment variables (standard for Dokploy Postgres service)
# Fallback to local SQLite when DATABASE_URL is not set
DB_ENGINE = os.getenv('DB_ENGINE', '')
DATABASE_URL = os.getenv('DATABASE_URL', '')

if DATABASE_URL.startswith('postgres://') or DATABASE_URL.startswith('postgresql://'):
    import urllib.parse as urlparse
    url = urlparse.urlparse(DATABASE_URL)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': url.path[1:],
            'USER': url.username,
            'PASSWORD': url.password,
            'HOST': url.hostname,
            'PORT': url.port or 5432,
        }
    }
elif os.getenv('POSTGRES_DB'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('POSTGRES_DB', 'startip'),
            'USER': os.getenv('POSTGRES_USER', 'startip'),
            'PASSWORD': os.getenv('POSTGRES_PASSWORD', 'startippassword'),
            'HOST': os.getenv('POSTGRES_HOST', 'db'),
            'PORT': os.getenv('POSTGRES_PORT', '5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

# Frontend build directory integration
_frontend_dist = BASE_DIR / 'frontend_dist'
if not _frontend_dist.exists():
    _frontend_dist = BASE_DIR.parent / 'frontend' / 'dist'

if _frontend_dist.exists() and (_frontend_dist / 'assets').exists():
    STATICFILES_DIRS.append(str(_frontend_dist / 'assets'))

STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

# Media files (user uploads for creator avatars & banners)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
try:
    (MEDIA_ROOT / 'uploads').mkdir(parents=True, exist_ok=True)
except Exception:
    pass

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS Settings (Allow cross-origin requests for embeddable widgets)
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-wallet-token',
]

# CSRF Trusted Origins (required in Django 4+ for cross-origin requests)
CSRF_TRUSTED_ORIGINS = [
    'https://startip.app',
    'https://*.startip.app',
    'https://www.startip.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
]

_env_csrf = os.getenv('CSRF_TRUSTED_ORIGINS', '')
if _env_csrf:
    CSRF_TRUSTED_ORIGINS.extend([origin.strip() for origin in _env_csrf.split(',') if origin.strip()])

_domain = os.getenv('DOMAIN', '').strip()
if _domain:
    for _scheme in ('https://', 'http://'):
        _origin = f"{_scheme}{_domain}"
        if _origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(_origin)


# Django REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'core.auth.StellarWalletAuthentication',
        'core.auth.CsrfExemptSessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'EXCEPTION_HANDLER': 'core.utils.custom_exception_handler',
}

# OpenAPI / Swagger Documentation (drf-spectacular)
SPECTACULAR_SETTINGS = {
    'TITLE': 'StarTip Stellar Payment & Creator Monetization API',
    'DESCRIPTION': (
        'Robust, high-performance, non-custodial tipping platform backend on the Stellar Network.\n\n'
        '### Core Capabilities:\n'
        '- **Stellar Testnet Integration**: Native XLM and Stellar USDC transaction building and settlement verification.\n'
        '- **Non-Custodial Architecture**: Supporter payments route directly to creator Stellar wallets.\n'
        '- **SEP-0010 Wallet Authentication**: Ed25519 cryptographic challenge-response authentication.\n'
        '- **Embeddable Widget API**: Iframe & JavaScript embed configuration and public profiles.\n'
        '- **Live Alert Engine**: Real-time Server-Sent Events (SSE) for OBS/Streamlabs livestream overlays.\n'
        '- **OpenAI Message Moderation & Thank-You Generation**: AI-assisted message safety and automated fan responses.\n'
        '- **Dokploy Ready**: Dockerfile & multi-container compose configured for automated cloud deployment.'
    ),
    'VERSION': '1.0.0',
    # Pin to a stable version without the import.meta bundle bug:
    'REDOC_DIST': 'https://cdn.jsdelivr.net/npm/redoc@2.1.5',
    'SERVE_INCLUDE_SCHEMA': False,
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': True,
        'docExpansion': 'list',
        'defaultModelsExpandDepth': 3,
        'defaultModelExpandDepth': 3,
    },
    'COMPONENT_SPLIT_REQUEST': True,
    'TAGS': [
        {'name': 'Health & System', 'description': 'System diagnostics, database connectivity, and Horizon status'},
        {'name': 'Wallet Authentication', 'description': 'Stellar Ed25519 challenge-response wallet authentication'},
        {'name': 'Creator Profiles & Dashboard', 'description': 'Creator onboarding, profile settings, and analytics'},
        {'name': 'Widget Configuration', 'description': 'Tipping widget customization and embed settings'},
        {'name': 'Payments & Stellar Engine', 'description': 'Payment request generation, XDR envelope building, and settlement verification'},
        {'name': 'Live Stream Alerts', 'description': 'Real-time alert streaming and browser source overlay'},
        {'name': 'OpenAI Services', 'description': 'AI-assisted message safety moderation and personalized thank-you generation'},
    ],
}

# Stellar Network Configuration
STELLAR_NETWORK = os.getenv('STELLAR_NETWORK', 'TESTNET').upper()
STELLAR_HORIZON_URL = os.getenv(
    'STELLAR_HORIZON_URL',
    'https://horizon-testnet.stellar.org'
)
STELLAR_SOROBAN_RPC_URL = os.getenv(
    'STELLAR_SOROBAN_RPC_URL',
    'https://soroban-testnet.stellar.org'
)
# Standard Circle USDC Testnet Issuer on Stellar Testnet
STELLAR_USDC_ISSUER = os.getenv(
    'STELLAR_USDC_ISSUER',
    'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
)
STELLAR_USDC_CODE = 'USDC'

# OpenAI API Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')

# Reverse proxy SSL & Host headers (Traefik, Nginx, Dokploy, Cloudflare)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

# Security in Production
if not DEBUG:
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False').lower() in ('true', '1')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# Celery & Background Worker Configuration
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://redis:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://redis:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
