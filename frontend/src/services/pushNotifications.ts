import api from './api';
import { Capacitor } from '@capacitor/core';

const VAPID_PUBLIC_KEY = 'BAVq87Syx1MA7oIpSoxEG29kSz5No_kxWeryd7C4N8MYGZnzlBoj8H_7HdSS_JhEyzyq0T7Ay5EzeHNaSTk2cnM';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

const isNative = Capacitor.isNativePlatform();

export function isPushSupported(): boolean {
  if (isNative) return true;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function isPushSubscribed(): Promise<boolean> {
  if (isNative) {
    // Check if we have a stored device token
    return !!localStorage.getItem('cleancheck_device_token');
  }
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

export async function requestPushPermission(): Promise<boolean> {
  if (isNative) {
    return requestNativePush();
  }
  return requestWebPush();
}

async function requestNativePush(): Promise<boolean> {
  const { PushNotifications } = await import('@capacitor/push-notifications');

  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== 'granted') return false;

  return new Promise((resolve) => {
    PushNotifications.addListener('registration', async (token) => {
      try {
        await api.post('/push/register-device', {
          token: token.value,
          platform: 'ios',
        });
        localStorage.setItem('cleancheck_device_token', token.value);
        resolve(true);
      } catch (err) {
        console.error('Device token registration failed:', err);
        resolve(false);
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err);
      resolve(false);
    });

    PushNotifications.register();
  });
}

async function requestWebPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  });
  const json = sub.toJSON();
  await api.post('/push/subscribe', {
    endpoint: json.endpoint,
    keys: { auth: json.keys?.auth, p256dh: json.keys?.p256dh },
  });
  return true;
}

export async function unsubscribePush(): Promise<void> {
  if (isNative) {
    const token = localStorage.getItem('cleancheck_device_token');
    if (token) {
      await api.delete('/push/unregister-device', { data: { token } });
      localStorage.removeItem('cleancheck_device_token');
      const { PushNotifications } = await import('@capacitor/push-notifications');
      await PushNotifications.removeAllListeners();
    }
    return;
  }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await api.delete('/push/unsubscribe', { data: { endpoint: sub.endpoint } });
    await sub.unsubscribe();
  }
}

// Initialize native push listeners (call once on app startup for native platforms)
export async function initNativePushListeners(): Promise<void> {
  if (!isNative) return;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  // Handle notification received while app is in foreground
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received in foreground:', notification);
  });

  // Handle notification tap (app was in background)
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const url = action.notification.data?.url;
    if (url && typeof url === 'string') {
      window.location.hash = url;
    }
  });
}
