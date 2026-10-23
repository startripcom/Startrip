from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from stellar_sdk import Keypair

from creators.models import CreatorProfile, WidgetConfig
from payments.models import Tip
from core.models import WalletNonce, WalletSession

class StarTipBackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.keypair = Keypair.random()
        self.wallet = self.keypair.public_key
        self.creator = CreatorProfile.objects.create(
            wallet_address=self.wallet,
            username="test_creator",
            display_name="Test Creator",
            receiving_wallet_address=self.wallet,
            supported_assets=["XLM", "USDC"]
        )
        self.widget_config = WidgetConfig.objects.create(
            creator=self.creator,
            widget_title="Tip Test",
            preset_amounts_xlm=[5, 10, 25],
            preset_amounts_usdc=[1, 5, 10],
            is_active=True
        )
        self.session = WalletSession.objects.create(
            token="test-secret-session-token-12345",
            wallet_address=self.wallet
        )

    def test_health_check(self):
        url = reverse('health-check')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('database', resp.data)
        self.assertEqual(resp.data['database'], 'ok')
        self.assertEqual(resp.data['version'], '1.0.0')

    def test_openapi_schema(self):
        url = reverse('schema')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('paths', resp.data)
        self.assertIn('components', resp.data)

    def test_auth_challenge_flow(self):
        url = reverse('auth-challenge')
        resp = self.client.post(url, {'wallet_address': self.wallet}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('nonce', resp.data)
        self.assertIn('message_to_sign', resp.data)

        # Real cryptographic Ed25519 signature verification on the Stellar keypair
        message = resp.data['message_to_sign']
        sig_bytes = self.keypair.sign(message.encode('utf-8'))
        sig_hex = sig_bytes.hex()

        verify_url = reverse('auth-verify')
        verify_resp = self.client.post(verify_url, {
            'wallet_address': self.wallet,
            'nonce': resp.data['nonce'],
            'signature': sig_hex
        }, format='json')
        self.assertEqual(verify_resp.status_code, status.HTTP_200_OK)
        self.assertIn('token', verify_resp.data)
        self.assertTrue(verify_resp.data['is_registered'])

    def test_public_creator_profile(self):
        url = reverse('creator-public', kwargs={'username': 'test_creator'})
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['username'], 'test_creator')
        self.assertEqual(resp.data['display_name'], 'Test Creator')
        self.assertIn('widget_config', resp.data)

    def test_creator_dashboard_authenticated(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.session.token}')
        url = reverse('creator-dashboard')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('total_xlm_tips', resp.data)
        self.assertIn('total_usdc_tips', resp.data)
        self.assertIn('widget_status', resp.data)

    def test_create_payment_request_and_settlement(self):
        url = reverse('payment-create-request')
        payload = {
            'creator_username': 'test_creator',
            'asset_code': 'XLM',
            'amount': '15.5',
            'supporter_name': 'Alice',
            'message': 'Keep up the stellar work!'
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        ref_id = resp.data['reference_id']
        self.assertTrue(ref_id.startswith('ST-'))

        # Settlement verification with dev mock hash (exactly 64 chars)
        verify_url = reverse('payment-verify')
        mock_hash = 'dev_mock_' + '0' * 55
        verify_resp = self.client.post(verify_url, {
            'reference_id': ref_id,
            'stellar_tx_hash': mock_hash
        }, format='json')
        self.assertEqual(verify_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(verify_resp.data['status'], 'confirmed')
        self.assertEqual(verify_resp.data['amount'], '15.5000000')

    def test_live_alert_test_trigger(self):
        url = reverse('alert-test-trigger')
        payload = {
            'overlay_token': str(self.widget_config.overlay_token),
            'amount': '25',
            'asset_code': 'USDC',
            'supporter_name': 'Bob',
            'message': 'Live stream test!'
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['success'])

    def test_ai_message_moderation(self):
        url = reverse('ai-moderate')
        resp = self.client.post(url, {'message': 'Awesome video! Thanks!'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['is_safe'])

    def test_ai_thank_you_generator(self):
        url = reverse('ai-generate-thank-you')
        payload = {
            'creator_name': 'Alex',
            'supporter_name': 'Alice',
            'amount': '10',
            'asset_code': 'XLM',
            'tone': 'warm'
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('thank_you_note', resp.data)
        self.assertTrue(len(resp.data['thank_you_note']) > 0)

    def test_frontend_spa_serving(self):
        resp = self.client.get('/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('text/html', resp.headers.get('Content-Type', ''))
