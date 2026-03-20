'use client';

import { pushApi } from '@/lib/api';
import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function useNotificationPermission() {
  const [status, setStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) {
      setStatus('unsupported');
      return;
    }
    setStatus(Notification.permission as 'default' | 'granted' | 'denied');
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    setIsRegistering(true);
    try {
      const permission = await Notification.requestPermission();
      setStatus(permission as 'default' | 'granted' | 'denied');
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const platform = isIOS ? 'ios' : 'android';
        const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/push/vapid-key`);
        const { publicKey } = (await resp.json()) as { publicKey: string | null };
        if (publicKey) {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
          const json = sub.toJSON();
          await pushApi.subscribe({
            endpoint: json.endpoint ?? '',
            p256dh: json.keys?.p256dh ?? '',
            auth: json.keys?.auth ?? '',
            platform,
          });
        }
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return { status, isRegistering, requestPermission };
}
