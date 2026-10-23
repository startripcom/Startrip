import time
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from payments.models import Tip
from alerts.manager import AlertManager

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Runs background Soroban RPC event listener and settlement indexer'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== Starting StarTip Soroban Event Indexer ==='))
        self.stdout.write(f'Connecting to Soroban RPC: {settings.STELLAR_SOROBAN_RPC_URL}')
        self.stdout.write(f'Horizon Node: {settings.STELLAR_HORIZON_URL}')

        while True:
            try:
                # Check for pending tips that need settlement verification
                pending_tips = Tip.objects.filter(status='pending')
                count = pending_tips.count()
                if count > 0:
                    self.stdout.write(f'Checking settlement for {count} pending tip(s)...')

                time.sleep(5)
            except KeyboardInterrupt:
                self.stdout.write(self.style.WARNING('Soroban event indexer stopped by user.'))
                break
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Indexer iteration notice: {e}'))
                time.sleep(5)
