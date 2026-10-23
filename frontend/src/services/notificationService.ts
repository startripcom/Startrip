/**
 * StarTip Chrome & Desktop Web Notification Service
 * Handles browser desktop popup notifications and Web Audio synthesized chimes
 * when incoming tips land on-chain.
 */

import { formatAssetAmount } from '../utils/formatters';

// StarTip Neon Bolt Icon PNG for Chrome desktop and mobile notification popups
export const STARTIP_NOTIFICATION_ICON = typeof window !== 'undefined'
  ? `${window.location.origin}/notification-icon.png`
  : '/notification-icon.png';

export interface TipNotificationData {
  id?: string;
  referenceId?: string;
  supporterName: string;
  amount: string;
  assetCode: string;
  message?: string;
  isTest?: boolean;
  stellarTxHash?: string;
}

class NotificationService {
  private audioCtx: AudioContext | null = null;
  private listeners: Set<(data: TipNotificationData) => void> = new Set();
  private processedIds: Set<string> = new Set();

  /**
   * Check whether HTML5 Web Notifications are supported in this browser.
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Returns current notification permission: 'granted' | 'denied' | 'default'.
   */
  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  /**
   * Check if notifications are enabled in StarTip settings and granted by the browser.
   */
  public isEnabled(): boolean {
    if (!this.isSupported()) return false;
    const pref = localStorage.getItem('startip_desktop_notifications_enabled');
    const userEnabled = pref === null ? true : pref === 'true';
    return Notification.permission === 'granted' && userEnabled;
  }

  /**
   * Toggle user desktop notification preference.
   */
  public setEnabledPreference(enabled: boolean): void {
    localStorage.setItem('startip_desktop_notifications_enabled', String(enabled));
  }

  /**
   * Check if audio chime is enabled.
   */
  public isSoundEnabled(): boolean {
    const pref = localStorage.getItem('startip_notification_sound_enabled');
    return pref === null ? true : pref === 'true';
  }

  /**
   * Toggle audio chime preference.
   */
  public setSoundEnabled(enabled: boolean): void {
    localStorage.setItem('startip_notification_sound_enabled', String(enabled));
  }

  /**
   * Request Chrome / browser notification permission.
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied';
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.setEnabledPreference(true);
      }
      return permission;
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return Notification.permission;
    }
  }

  /**
   * Plays a pleasant, high-quality tip chime synthesized with Web Audio API.
   * Coin chime: 587Hz (D5) -> 880Hz (A5) -> 1174Hz (D6) with warm resonance.
   */
  public playTipChime(): void {
    if (!this.isSoundEnabled()) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'suspended') {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Note 1: E5 (659Hz)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Note 2: A5 (880Hz)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880.0, now + 0.08);
      gain2.gain.setValueAtTime(0.28, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.7);

      // Note 3: High C#6 (1108Hz) bell flourish
      const osc3 = this.audioCtx.createOscillator();
      const gain3 = this.audioCtx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1108.73, now + 0.16);
      gain3.gain.setValueAtTime(0.32, now + 0.16);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc3.connect(gain3);
      gain3.connect(this.audioCtx.destination);
      osc3.start(now + 0.16);
      osc3.stop(now + 1.2);
    } catch (e) {
      console.warn('Web Audio playback error:', e);
    }
  }

  /**
   * Dispatch a Chrome popup notification when a tip lands.
   */
  public showTipNotification(data: TipNotificationData): Notification | null {
    const tipKey = data.referenceId || data.id || `${data.amount}-${data.supporterName}-${Date.now()}`;
    
    // Deduplicate against double triggers
    if (this.processedIds.has(tipKey)) {
      return null;
    }
    this.processedIds.add(tipKey);
    // Keep set bounded
    if (this.processedIds.size > 200) {
      const first = this.processedIds.values().next().value;
      if (first) this.processedIds.delete(first);
    }

    // Play chime sound
    this.playTipChime();

    // Notify registered in-app subscribers
    this.notifyInAppListeners(data);

    // Show Chrome / Desktop notification
    if (!this.isSupported() || Notification.permission !== 'granted') {
      console.info(
        `[StarTip Notifications] Desktop popup skipped: supported=${this.isSupported()}, permission=${this.getPermission()}`
      );
      return null;
    }

    const pref = localStorage.getItem('startip_desktop_notifications_enabled');
    if (pref === 'false') {
      return null;
    }

    const amountFormatted = `${formatAssetAmount(data.amount)} ${data.assetCode}`;
    const supporter = data.supporterName?.trim() || 'Anonymous Supporter';
    const title = data.isTest
      ? `⚡ [Test Alert] Tip Landed: +${amountFormatted}!`
      : `⚡ Tip Landed: +${amountFormatted}!`;

    let bodyText = `${supporter} just sent you a tip on Stellar!`;
    if (data.message && data.message.trim().length > 0) {
      bodyText += `\n💬 "${data.message.trim()}"`;
    }

    const options: NotificationOptions = {
      body: bodyText,
      icon: STARTIP_NOTIFICATION_ICON,
      badge: STARTIP_NOTIFICATION_ICON,
      tag: `startip-${tipKey}`,
      requireInteraction: false,
      silent: true, // We already synthesize the chime cleanly
    };

    try {
      const notif = new Notification(title, options);

      notif.onclick = () => {
        window.focus();
        notif.close();
      };

      return notif;
    } catch (err) {
      console.warn('Direct new Notification() failed, attempting ServiceWorker fallback:', err);
      // Service worker fallback for Android Chrome or restricted environments
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready
          .then((registration) => {
            registration.showNotification(title, options);
          })
          .catch((swErr) => console.warn('ServiceWorker showNotification failed:', swErr));
      }
      return null;
    }
  }

  /**
   * Trigger a simulated test Chrome notification for verification.
   */
  public async showTestNotification(customAmount?: string, customAsset?: string): Promise<boolean> {
    if (!this.isSupported()) {
      alert('Desktop notifications are not supported in this browser.');
      return false;
    }

    if (Notification.permission !== 'granted') {
      const result = await this.requestPermission();
      if (result !== 'granted') {
        alert('Please allow notification permissions in your browser to see Chrome popup notifications.');
        return false;
      }
    }

    this.showTipNotification({
      id: `test-demo-${Date.now()}`,
      referenceId: `TEST-${Date.now()}`,
      supporterName: 'Stellar Supporter',
      amount: customAmount || '25',
      assetCode: customAsset || 'USDC',
      message: 'Keep creating amazing content! Loved the latest stream.',
      isTest: true,
    });

    return true;
  }

  /**
   * Subscribe to in-app tip notifications.
   */
  public subscribeInApp(cb: (data: TipNotificationData) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notifyInAppListeners(data: TipNotificationData) {
    this.listeners.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error('Error in in-app notification subscriber:', err);
      }
    });
  }
}

export const notificationService = new NotificationService();
