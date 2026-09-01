// utils/pushNotifications.js - Web Push Notification Subscription Manager
import { getStorageItem, saveStorageItem } from './storage.js';

// VAPID Public Key for Web Push
export const VAPID_PUBLIC_KEY = 'BCunnq9lgySYczAOjIipLc9LXkTs5cs5_n12Nc5WMVEIKHZfPATzbdPtvFMEnec8UIXQzK40F9TnG6XTiQueaRI';

// Web Audio API Notification Sound Synthesizer
export function playNotificationChimeSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Oscillator 1: High crisp chime (E6 -> A6)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1318.51, now); // E6
    osc1.frequency.exponentialRampToValueAtTime(1760.00, now + 0.12); // A6
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Oscillator 2: Harmonics chime (C6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1046.50, now + 0.08); // C6
    gain2.gain.setValueAtTime(0.2, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn('Web Audio chime sound unavailable:', e);
  }
}

// Helper to convert VAPID Base64 key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// 1. Register Service Worker (sw.js)
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Workers are not supported by this browser.');
    return null;
  }

  try {
    const swPath = '/sw.js';
    const registration = await navigator.serviceWorker.register(swPath, { scope: '/' });
    console.log('✅ Service Worker registered successfully:', registration.scope);

    // Auto-update check
    registration.update();

    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return null;
  }
  }
}

// 2. Get current Push Subscription
export async function getPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.error('Error fetching push subscription:', err);
    return null;
  }
}

// 3. Subscribe to Web Push Notifications
export async function subscribeToWebPush() {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support Web Push Notifications.');
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push messaging is not supported in this browser.');
  }

  // Request browser permission
  const permission = await Notification.requestPermission();
  if (permission === 'denied') {
    throw new Error('Notification permissions were blocked in your browser settings.');
  }
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const reg = await navigator.serviceWorker.ready;
  let subscription = await reg.pushManager.getSubscription();

  if (!subscription) {
    const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });
  }

  // Store subscription in local storage & sync to Supabase Cloud
  const subJSON = subscription.toJSON();
  saveStorageItem('SWEETOS_push_subscribed', true);
  saveStorageItem('SWEETOS_push_subscription_data', subJSON);

  // Sync to Supabase Cloud push_subscriptions table
  try {
    const { getSupabaseClient } = await import('./supabase.js');
    const supabase = getSupabaseClient();
    if (supabase) {
      const userStr = getStorageItem('SWEETOS_logged_in_user');
      let userId = null;
      if (userStr) {
        try { userId = JSON.parse(userStr).id; } catch(e) {}
      }

      await supabase.from('push_subscriptions').upsert({
        endpoint: subJSON.endpoint,
        keys: subJSON.keys,
        user_id: userId,
        user_agent: navigator.userAgent,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'endpoint' });

      console.log('✅ Web Push subscription synced to Supabase Cloud!');
    }
  } catch(e) {
    console.warn('Could not sync subscription to Supabase Cloud, cached locally:', e);
  }

  // Trigger test welcome push
  showLocalNotification('🎉 Welcome to SWEETOS Notifications!', {
    body: 'You will now receive instant push alerts for orders, inventory, and flash deals even when the site is closed!',
    tag: 'sweetos-welcome-push'
  });

  return subscription;
}

// 4. Unsubscribe from Web Push Notifications
export async function unsubscribeFromWebPush() {
  try {
    const subscription = await getPushSubscription();
    if (subscription) {
      // Mark inactive in Supabase Cloud
      try {
        const { getSupabaseClient } = await import('./supabase.js');
        const supabase = getSupabaseClient();
        if (supabase) {
          await supabase.from('push_subscriptions')
            .update({ is_active: false })
            .eq('endpoint', subscription.endpoint);
        }
      } catch(e) {}

      await subscription.unsubscribe();
    }

    saveStorageItem('SWEETOS_push_subscribed', false);
    return true;
  } catch (err) {
    console.error('Error unsubscribing:', err);
    return false;
  }
}

// 5. Trigger local notification popup via Service Worker
export async function showLocalNotification(title, options = {}) {
  // Play Web Audio chime sound
  playNotificationChimeSound();

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg && reg.showNotification) {
      await reg.showNotification(title, {
        body: options.body || '',
        icon: options.icon || './assets/sweetos_logo.svg',
        badge: options.badge || './assets/sweetos_logo.svg',
        tag: options.tag || 'sweetos-alert',
        data: options.data || { url: '/' },
        vibrate: [200, 100, 200, 100, 200, 100, 400],
        requireInteraction: true,
        renotify: true,
        silent: false
      });
    }
  } catch(e) {
    console.error('Failed to trigger local notification:', e);
  }
}
