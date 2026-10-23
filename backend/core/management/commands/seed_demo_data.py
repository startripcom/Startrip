from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from creators.models import CreatorProfile, WidgetConfig
from payments.models import Tip

class Command(BaseCommand):
    help = 'Seeds initial demonstration creator profiles and tip history'

    def handle(self, *args, **options):
        self.stdout.write("Seeding StarTip demo data...")

        # 0. Ensure Admin Superuser 'Startp' exists
        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user, _ = User.objects.get_or_create(
            username='Startp',
            defaults={'email': 'admin@startip.app', 'is_staff': True, 'is_superuser': True}
        )
        admin_user.set_password('favicon.icoy3h38243@#')
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()
        self.stdout.write(self.style.SUCCESS("Admin user 'Startp' configured."))

        # 1. Tobi Ade (@tobibuilds) as specified in project.txt
        tobi_wallet = "GBXK4H2M2P6LNV2B6XQQ5U3VYV6Y2R6E762E44P3A4L2K7C4M3O2DEV1"
        tobi, _ = CreatorProfile.objects.get_or_create(
            username="tobibuilds",
            defaults={
                'wallet_address': tobi_wallet,
                'display_name': 'Tobi Ade',
                'bio': 'Building open source tools on Stellar & Soroban. Streaming dev sessions weekly.',
                'website_url': 'https://tobi.dev',
                'receiving_wallet_address': tobi_wallet,
                'supported_assets': ['XLM', 'USDC'],
            }
        )

        tobi_config, _ = WidgetConfig.objects.get_or_create(
            creator=tobi,
            defaults={
                'widget_title': 'Tip Tobi Ade',
                'welcome_message': 'Thanks for supporting my tutorials and open source builds!',
                'theme': 'dark',
                'primary_color': '#6A4CF5',
                'preset_amounts_xlm': [10, 25, 50, 100],
                'preset_amounts_usdc': [1, 2, 5, 10],
                'allow_custom_amount': True,
                'allow_supporter_message': True,
                'alert_duration_seconds': 6,
                'is_active': True,
            }
        )

        tobi_tips = [
            {
                'ref': 'ST-TOBI-001',
                'supporter': 'Kemi',
                'asset': 'USDC',
                'amount': Decimal('2.0'),
                'msg': 'Keep the tutorials coming!',
                'hash': 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef1',
            },
            {
                'ref': 'ST-TOBI-002',
                'supporter': 'Sam',
                'asset': 'XLM',
                'amount': Decimal('25.0'),
                'msg': 'No message',
                'hash': 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef2',
            },
            {
                'ref': 'ST-TOBI-003',
                'supporter': 'Daniel',
                'asset': 'USDC',
                'amount': Decimal('10.0'),
                'msg': 'Fixed my build in 5 minutes.',
                'hash': 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef3',
            },
        ]

        for st in tobi_tips:
            Tip.objects.get_or_create(
                reference_id=st['ref'],
                defaults={
                    'creator': tobi,
                    'supporter_name': st['supporter'],
                    'supporter_wallet': 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2G2VRGV76LQ5NVGTZD4ME',
                    'asset_code': st['asset'],
                    'amount': st['amount'],
                    'message': st['msg'],
                    'status': 'confirmed',
                    'stellar_tx_hash': st['hash'],
                    'ledger_sequence': 1892010,
                    'ledger_closed_at': timezone.now(),
                    'fee_stroops': 100,
                }
            )

        # 2. Alex River (@alex_dev)
        alex_wallet = "GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2G2VRGV76LQ5NVGTZD4ME"
        alex, _ = CreatorProfile.objects.get_or_create(
            username="alex_dev",
            defaults={
                'wallet_address': alex_wallet,
                'display_name': 'Alex River',
                'bio': 'Open-source developer building on Stellar & Soroban. Building StarTip tipping platform!',
                'website_url': 'https://github.com/alex-river',
                'receiving_wallet_address': alex_wallet,
                'supported_assets': ['XLM', 'USDC'],
            }
        )

        alex_config, _ = WidgetConfig.objects.get_or_create(
            creator=alex,
            defaults={
                'widget_title': 'Support Alex River',
                'welcome_message': 'Thanks for supporting open-source Stellar tools!',
                'theme': 'dark',
                'primary_color': '#6366F1',
                'preset_amounts_xlm': [5, 10, 25, 50],
                'preset_amounts_usdc': [1, 2, 5, 10],
                'allow_custom_amount': True,
                'allow_supporter_message': True,
                'alert_duration_seconds': 6,
                'is_active': True,
            }
        )

        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded @{tobi.username} (overlay: {tobi_config.overlay_token}) and @{alex.username} (overlay: {alex_config.overlay_token})"
        ))
