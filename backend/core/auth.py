from rest_framework import authentication, permissions, exceptions
from django.utils import timezone
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from .models import WalletSession

class AuthenticatedWalletUser:
    """
    Lightweight user object representing an authenticated Stellar wallet holder.
    """
    def __init__(self, wallet_address: str, session: WalletSession):
        self.wallet_address = wallet_address
        self.session = session
        self.is_authenticated = True
        self.is_anonymous = False

    def __str__(self):
        return f"WalletUser({self.wallet_address})"


class StellarWalletAuthentication(authentication.BaseAuthentication):
    """
    Custom authentication scheme validating Stellar wallet session tokens.
    Supports:
      - 'Authorization: Bearer <session_token>'
      - 'X-Wallet-Token: <session_token>'
    """
    def authenticate(self, request):
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split('Bearer ')[1].strip()
        elif 'X-Wallet-Token' in request.headers:
            token = request.headers.get('X-Wallet-Token', '').strip()

        if not token:
            return None

        try:
            session = WalletSession.objects.get(token=token)
        except WalletSession.DoesNotExist:
            raise exceptions.AuthenticationFailed('Invalid or expired wallet session token.')

        if not session.is_valid:
            session.delete()
            raise exceptions.AuthenticationFailed('Wallet session has expired. Please re-authenticate.')

        user = AuthenticatedWalletUser(session.wallet_address, session)
        request.wallet_address = session.wallet_address
        return (user, token)

    def authenticate_header(self, request):
        return 'Bearer realm="StellarWallet"'


class CsrfExemptSessionAuthentication(authentication.SessionAuthentication):
    """
    Session authentication scheme that relaxes CSRF enforcement for API endpoints.
    Prevents ambient browser session cookies (e.g. Django Admin) from failing
    cross-origin requests from SPA frontends or embeddable widgets with CSRF errors.
    """
    def enforce_csrf(self, request):
        return


class StellarWalletAuthenticationScheme(OpenApiAuthenticationExtension):
    """
    OpenAPI documentation generator for Stellar wallet authentication.
    """
    target_class = 'core.auth.StellarWalletAuthentication'
    name = 'StellarWalletAuth'

    def get_security_definition(self, auto_schema):
        return {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'SessionToken',
            'description': 'Stellar wallet session token obtained from POST /api/auth/verify/'
        }


class IsWalletAuthenticated(permissions.BasePermission):
    """
    Permission check requiring a verified Stellar wallet session.
    """
    message = "Authentication with a valid Stellar wallet signature is required."

    def has_permission(self, request, view):
        return bool(request.user and getattr(request.user, 'is_authenticated', False) and getattr(request, 'wallet_address', None))


class IsCreatorOwner(permissions.BasePermission):
    """
    Permission check verifying that the authenticated wallet owns the requested creator profile.
    """
    message = "You are not authorized to modify settings for this creator profile."

    def has_object_permission(self, request, view, obj):
        wallet = getattr(request, 'wallet_address', None)
        if not wallet:
            return False
        # obj could be CreatorProfile or WidgetConfig
        if hasattr(obj, 'wallet_address'):
            return obj.wallet_address == wallet
        if hasattr(obj, 'creator'):
            return obj.creator.wallet_address == wallet
        return False
