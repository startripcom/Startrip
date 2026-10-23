from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter

from .models import Tip
from .services import StellarPaymentEngine
from .serializers import (
    CreatePaymentRequestSerializer,
    PaymentRequestResponseSerializer,
    BuildXDRRequestSerializer,
    BuildXDRResponseSerializer,
    VerifyPaymentRequestSerializer,
    TipDetailSerializer,
)
from core.auth import IsWalletAuthenticated
from creators.models import CreatorProfile

payment_engine = StellarPaymentEngine()

class CreatePaymentRequestView(APIView):
    """
    Step 1: Supporter selects asset, amount, and message.
    Generates a unique tip reference and returns payment parameters for review.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Payments & Stellar Engine'],
        summary='Create a payment request',
        description='Initiates a tipping flow. Generates unique payment memo reference and validates recipient parameters.',
        request=CreatePaymentRequestSerializer,
        responses={
            201: PaymentRequestResponseSerializer,
            400: OpenApiResponse(description='Validation error or inactive creator'),
            404: OpenApiResponse(description='Creator username not found'),
        }
    )
    def post(self, request):
        serializer = CreatePaymentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        try:
            creator = CreatorProfile.objects.prefetch_related('widgets').get(username__iexact=data['creator_username'])
            widget = None
            if data.get('widget_id'):
                widget = creator.widgets.filter(id=data['widget_id']).first()
            elif data.get('widget_slug'):
                widget = creator.widgets.filter(slug__iexact=data['widget_slug']).first()
            if not widget:
                widget = creator.widget_config

            tip = payment_engine.create_payment_request(
                creator_username=data['creator_username'],
                asset_code=data['asset_code'],
                amount=data['amount'],
                supporter_name=data.get('supporter_name', 'Anonymous'),
                message=data.get('message', ''),
                supporter_wallet=data.get('supporter_wallet', ''),
                widget=widget
            )
            return Response(PaymentRequestResponseSerializer(tip).data, status=status.HTTP_201_CREATED)
        except CreatorProfile.DoesNotExist:
            return Response({'error': f"Creator @{data['creator_username']} does not exist."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BuildTransactionXDRView(APIView):
    """
    Step 2: Supporter connects wallet.
    Constructs the unsigned Stellar transaction XDR for wallet signing.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Payments & Stellar Engine'],
        summary='Build unsigned Stellar transaction XDR',
        description='Fetches supporter sequence number, constructs payment operation with memo, and returns base64 XDR envelope.',
        request=BuildXDRRequestSerializer,
        responses={
            200: BuildXDRResponseSerializer,
            400: OpenApiResponse(description='Account not found on Stellar or invalid parameters'),
            404: OpenApiResponse(description='Tip reference not found'),
        }
    )
    def post(self, request):
        serializer = BuildXDRRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ref_id = serializer.validated_data['reference_id']
        supporter_wallet = serializer.validated_data['supporter_wallet']

        try:
            xdr_data = payment_engine.build_unsigned_xdr(
                reference_id=ref_id,
                supporter_wallet=supporter_wallet
            )
            return Response(xdr_data, status=status.HTTP_200_OK)
        except Tip.DoesNotExist:
            return Response({'error': f"Tip reference '{ref_id}' not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class VerifyPaymentView(APIView):
    """
    Step 3: After wallet submits signed transaction to Stellar Testnet,
    the backend verifies settlement on-chain before crediting the creator.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Payments & Stellar Engine'],
        summary='Verify on-chain Stellar transaction settlement',
        description='Queries Stellar Horizon node, verifies recipient, asset issuer, amount, and memo, then confirms tip.',
        request=VerifyPaymentRequestSerializer,
        responses={
            200: TipDetailSerializer,
            400: OpenApiResponse(description='Verification failure, mismatch, or failed transaction'),
            404: OpenApiResponse(description='Tip reference not found'),
        }
    )
    def post(self, request):
        serializer = VerifyPaymentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ref_id = serializer.validated_data['reference_id']
        tx_hash = serializer.validated_data['stellar_tx_hash']

        try:
            settled_tip = payment_engine.verify_and_settle(
                reference_id=ref_id,
                stellar_tx_hash=tx_hash
            )
            return Response(TipDetailSerializer(settled_tip).data, status=status.HTTP_200_OK)
        except Tip.DoesNotExist:
            return Response({'error': f"Tip reference '{ref_id}' not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class TipListView(APIView):
    """
    List tips for the authenticated creator with filtering by asset, status, and date.
    """
    permission_classes = [IsWalletAuthenticated]

    @extend_schema(
        tags=['Payments & Stellar Engine'],
        summary='List creator tip history',
        description='Returns filterable tip transaction history for the authenticated creator.',
        parameters=[
            OpenApiParameter(name='asset', description='Filter by XLM, USDC, or USDT', required=False, type=str),
            OpenApiParameter(name='status', description='Filter by status (confirmed, pending, failed)', required=False, type=str),
            OpenApiParameter(name='widget_id', description='Filter by widget/campaign ID', required=False, type=str),
            OpenApiParameter(name='search', description='Search by supporter name or reference ID', required=False, type=str),
        ],
        responses={200: TipDetailSerializer(many=True)}
    )
    def get(self, request):
        wallet_address = request.wallet_address
        creator = CreatorProfile.objects.filter(wallet_address=wallet_address).first()
        if not creator:
            return Response({'error': 'Creator profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        qs = Tip.objects.filter(creator=creator).select_related('widget')

        asset = request.query_params.get('asset')
        if asset:
            qs = qs.filter(asset_code=asset.upper())

        tip_status = request.query_params.get('status')
        if tip_status:
            qs = qs.filter(status=tip_status.lower())

        widget_id = request.query_params.get('widget_id')
        if widget_id and widget_id.lower() != 'all':
            qs = qs.filter(widget_id=widget_id)

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(supporter_name__icontains=search) | qs.filter(reference_id__icontains=search)

        serializer = TipDetailSerializer(qs[:100], many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TipDetailView(APIView):
    """
    Retrieve details and status of a specific tip by its reference ID.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Payments & Stellar Engine'],
        summary='Get tip status by reference ID',
        description='Fetches current on-chain settlement status, hash, and metadata of a tip request.',
        responses={
            200: TipDetailSerializer,
            404: OpenApiResponse(description='Tip reference not found'),
        }
    )
    def get(self, request, reference_id):
        try:
            tip = Tip.objects.select_related('creator').get(reference_id=reference_id)
        except Tip.DoesNotExist:
            return Response({'error': f"Tip '{reference_id}' not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TipDetailSerializer(tip).data)
