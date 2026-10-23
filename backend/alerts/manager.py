import os
import time
import json
import queue
import logging
from typing import Dict, List
import redis

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv('REDIS_URL') or os.getenv('CELERY_BROKER_URL') or 'redis://redis:6379/0'

class AlertManager:
    """
    Hybrid Redis Pub/Sub + In-memory Server-Sent Events (SSE) dispatcher for live streaming overlays.
    Routes events to specific browser source connections using overlay_token.
    Enables instant multi-process / multi-worker tip broadcasting across Gunicorn, Celery, and Soroban Indexer.
    """
    # Map of overlay_token -> List of Queue objects for active SSE listeners
    _subscribers: Dict[str, List[queue.Queue]] = {}
    _redis_client = None

    @classmethod
    def get_redis(cls):
        if cls._redis_client is None:
            try:
                cls._redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
            except Exception as e:
                logger.warning(f"Could not initialize Redis client for AlertManager: {e}")
                cls._redis_client = None
        return cls._redis_client

    @classmethod
    def subscribe(cls, overlay_token: str) -> queue.Queue:
        q = queue.Queue(maxsize=50)
        token_str = str(overlay_token).strip()
        if token_str not in cls._subscribers:
            cls._subscribers[token_str] = []
        cls._subscribers[token_str].append(q)
        logger.info(f"Subscribed new listener for overlay {token_str[:8]}... (total: {len(cls._subscribers[token_str])})")
        return q

    @classmethod
    def unsubscribe(cls, overlay_token: str, q: queue.Queue):
        token_str = str(overlay_token).strip()
        if token_str in cls._subscribers and q in cls._subscribers[token_str]:
            cls._subscribers[token_str].remove(q)
            if not cls._subscribers[token_str]:
                del cls._subscribers[token_str]
        logger.info(f"Unsubscribed listener for overlay {token_str[:8]}...")

    @classmethod
    def publish_tip(cls, tip):
        """
        Publishes confirmed on-chain tip event to overlay and dashboard subscribers across all worker nodes.
        """
        payload = {
            'event': 'tip',
            'is_test': False,
            'reference_id': tip.reference_id,
            'supporter_name': tip.supporter_name or 'Anonymous',
            'amount': str(tip.amount),
            'asset_code': tip.asset_code,
            'message': tip.message,
            'stellar_tx_hash': tip.stellar_tx_hash,
            'duration_seconds': 6,
            'sound_enabled': True,
        }

        tokens_to_broadcast = set()

        if hasattr(tip.creator, 'widget_config') and tip.creator.widget_config:
            tokens_to_broadcast.add(str(tip.creator.widget_config.overlay_token))
            payload['duration_seconds'] = tip.creator.widget_config.alert_duration_seconds
            payload['sound_enabled'] = tip.creator.widget_config.alert_sound_enabled

        try:
            if hasattr(tip.creator, 'widgets'):
                for w in tip.creator.widgets.all():
                    if w.overlay_token:
                        tokens_to_broadcast.add(str(w.overlay_token))
        except Exception:
            pass

        if getattr(tip.creator, 'username', None):
            tokens_to_broadcast.add(str(tip.creator.username).lower())
            tokens_to_broadcast.add(str(tip.creator.username))

        for token in tokens_to_broadcast:
            cls._broadcast(token, payload)

    @classmethod
    def publish_test(cls, overlay_token: str, amount: str = '5', asset_code: str = 'USDC', supporter_name: str = 'Stellar Supporter', message: str = 'Keep building amazing things on Stellar!'):
        """
        Publishes simulated test alert to verify OBS/Streamlabs overlay and Chrome notifications.
        """
        token_str = str(overlay_token).strip()
        payload = {
            'event': 'tip',
            'is_test': True,
            'reference_id': f'TEST-{int(time.time())}',
            'supporter_name': supporter_name,
            'amount': amount,
            'asset_code': asset_code,
            'message': message,
            'stellar_tx_hash': '0000000000000000000000000000000000000000000000000000000000000000',
            'duration_seconds': 6,
            'sound_enabled': True,
        }
        cls._broadcast(token_str, payload)
        cls._broadcast(token_str.lower(), payload)

    @classmethod
    def _broadcast(cls, token_str: str, payload: dict):
        token_clean = str(token_str).strip()
        json_payload = json.dumps(payload)

        # 1. Publish to Redis PubSub channel (reaches all Gunicorn workers and containers)
        try:
            r = cls.get_redis()
            if r:
                channel = f"startip:alerts:{token_clean.lower()}"
                r.publish(channel, json_payload)
                logger.info(f"Published alert to Redis channel '{channel}'")
        except Exception as e:
            logger.warning(f"Failed to publish alert to Redis: {e}")

        # 2. Also publish to local in-memory listeners
        listeners = cls._subscribers.get(token_clean, [])
        logger.info(f"Broadcasting live alert to {len(listeners)} local listeners for overlay {token_clean[:8]}...")
        dead_queues = []
        for q in listeners:
            try:
                q.put_nowait(payload)
            except queue.Full:
                dead_queues.append(q)

        for q in dead_queues:
            cls.unsubscribe(token_clean, q)
