import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushStatus = 'idle' | 'checking' | 'requesting' | 'subscribed' | 'denied' | 'unsupported' | 'error';

export function usePushSubscription() {
  const [status, setStatus] = useState<PushStatus>(() => {
    if (typeof window === 'undefined') return 'unsupported';
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return 'unsupported';
    }
    if (Notification.permission === 'denied') return 'denied';
    return 'checking';
  });

  // On mount: check if already subscribed (persists across page reloads)
  useEffect(() => {
    if (status !== 'checking') return;

    let cancelled = false;

    (async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          if (!cancelled) setStatus('unsupported');
          return;
        }
        if (Notification.permission === 'denied') {
          if (!cancelled) setStatus('denied');
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();

        if (!cancelled) {
          if (existing && Notification.permission === 'granted') {
            setStatus('subscribed');
          } else {
            setStatus('idle');
          }
        }
      } catch {
        if (!cancelled) setStatus('idle');
      }
    })();

    return () => { cancelled = true; };
  }, [status]);

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return false;
    }

    setStatus('requesting');

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return false;
      }

      // Get VAPID public key
      const { publicKey } = await api.get<{ publicKey: string | null }>('/notifications/push/vapid-key');
      if (!publicKey) {
        setStatus('error');
        return false;
      }

      // Wait for service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      // Send subscription to backend
      const keys = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');

      await api.post('/notifications/push/subscribe', {
        endpoint: subscription.endpoint,
        p256dh: keys ? btoa(String.fromCharCode(...new Uint8Array(keys))) : '',
        auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : '',
      });

      setStatus('subscribed');
      return true;
    } catch (err) {
      console.warn('[Push] Subscription failed:', err);
      setStatus('error');
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.post('/notifications/push/unsubscribe', { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setStatus('idle');
    } catch (err) {
      console.warn('[Push] Unsubscribe failed:', err);
    }
  }, []);

  return { status, subscribe, unsubscribe };
}
