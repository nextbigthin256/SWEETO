// ============================================
// STORAGE UTILITIES WITH SUPABASE CLOUD SYNC
// ============================================

/**
 * Unified userKey helper function.
 * Ensures consistent key normalization across all functions and storage layers.
 */
export function userKey(email) {
  return String(email || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
}

// Non-blocking async queue for Supabase cloud sync operations
const _syncQueue = [];
let _isProcessingSyncQueue = false;

async function processSyncQueue() {
  if (_isProcessingSyncQueue || _syncQueue.length === 0) return;
  _isProcessingSyncQueue = true;

  while (_syncQueue.length > 0) {
    const task = _syncQueue.shift();
    try {
      await task();
    } catch(e) {
      console.error('[Supabase Sync Queue] Error executing task:', e);
    }
  }

  _isProcessingSyncQueue = false;
}

function queueSupabaseSync(task) {
  _syncQueue.push(task);
  processSyncQueue();
}

export function saveStorageItem(key, val) {
  if (key === 'SWEETOS_products') {
    try { localStorage.removeItem(key); } catch(e) {}
    return;
  }
  if (val === null || val === undefined) {
    try { localStorage.removeItem(key); } catch(e) {}
    return;
  }
  const str = typeof val === 'string' ? val : JSON.stringify(val);
  try { localStorage.setItem(key, str); } catch(e) {}
  
  // Auto-sync to Supabase for known keys via queue (non-blocking)
  const syncableKeys = ['SWEETOS_cart_', 'SWEETOS_notifications_', 'SWEETOS_user_scratchcards_', 'SWEETOS_coupons_', 'SWEETOS_user_profile_'];
  const shouldSync = syncableKeys.some(prefix => key.startsWith(prefix));
  
  if (shouldSync) {
    queueSupabaseSync(async () => {
      try {
        const userJson = getStorageItem('SWEETOS_logged_in_user');
        if (userJson) {
          const user = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
          if (user && user.email) {
            const { saveSiteSettingInSupabase, saveCustomerToSupabase } = await import('./supabase.js');
            const safeKey = userKey(user.email);
            
            let data;
            try { data = typeof val === 'string' ? JSON.parse(val) : val; } catch(e) { data = val; }
            
            let supabaseKey = null;
            let type = null;
            
            if (key.startsWith('SWEETOS_cart_')) {
              supabaseKey = `sweetos_cart_${safeKey}`;
              type = 'cart';
            } else if (key.startsWith('SWEETOS_notifications_')) {
              supabaseKey = `sweetos_notifications_${safeKey}`;
              type = 'notifications';
            } else if (key.startsWith('SWEETOS_user_scratchcards_')) {
              supabaseKey = `sweetos_scratchcards_${safeKey}`;
              type = 'scratchcards';
            } else if (key.startsWith('SWEETOS_coupons_')) {
              supabaseKey = `sweetos_coupons_${safeKey}`;
              type = 'coupons';
            } else if (key.startsWith('SWEETOS_user_profile_')) {
              await saveCustomerToSupabase(data);
              type = 'profile';
            }
            
            if (supabaseKey) {
              const ok = await saveSiteSettingInSupabase(supabaseKey, data);
              if (ok) {
                try { localStorage.setItem(`SUPABASE_SYNC_${type}_${safeKey}`, 'synced'); } catch(e) {}
              } else {
                try { localStorage.setItem(`SUPABASE_SYNC_${type}_${safeKey}`, 'pending'); } catch(e) {}
              }
            }
          }
        }
      } catch(e) {
        console.error('[Supabase] Auto-sync failed for key:', key, e);
      }
    });
  }
}

export function getStorageItem(key) {
  if (key === 'SWEETOS_products') {
    return null;
  }
  
  try {
    const localVal = localStorage.getItem(key);
    if (localVal !== null) return localVal;
  } catch(e) {}
  return null;
}

export function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch(e) {}
}

export async function forceReloadProducts() {
  console.log('🔄 [Storage] Force reloading products from Supabase...');
  try {
    const { fetchProductsFromSupabase } = await import('./supabase.js');
    const products = await fetchProductsFromSupabase();
    if (products && products.length > 0) {
      const str = JSON.stringify(products);
      try { localStorage.setItem('SWEETOS_products', str); } catch(e) {}
      console.log('✅ [Storage] Products reloaded:', products.length);
      return products;
    }
  } catch (e) {
    console.error('❌ [Storage] Failed to reload products:', e);
  }
  return null;
}

export function getCartStorageKey(email = null) {
  let targetEmail = email;
  if (!targetEmail) {
    const userJson = getStorageItem('SWEETOS_logged_in_user');
    if (userJson) {
      try {
        const user = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
        if (user && user.email) targetEmail = user.email;
      } catch (e) {}
    }
  }
  if (targetEmail) {
    return `SWEETOS_cart_${userKey(targetEmail)}`;
  }
  return 'SWEETOS_cart_guest';
}

export function getCartFromStorage() {
  const key = getCartStorageKey();
  const raw = getStorageItem(key);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch(e) { return []; }
}

export async function saveCartToStorage(cartItems) {
  const key = getCartStorageKey();
  saveStorageItem(key, cartItems);
  window.dispatchEvent(new CustomEvent('cart:updated', { detail: cartItems }));
}

export function getProfileStorageKey(email = null) {
  let targetEmail = email;
  if (!targetEmail) {
    const userJson = getStorageItem('SWEETOS_logged_in_user');
    if (userJson) {
      try {
        const user = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
        if (user && user.email) targetEmail = user.email;
      } catch (e) {}
    }
  }
  if (targetEmail) {
    return `SWEETOS_user_profile_${userKey(targetEmail)}`;
  }
  return 'SWEETOS_user_profile_guest';
}

export function getNotificationsStorageKey(targetEmail = null) {
  let email = targetEmail;
  if (!email) {
    const userJson = getStorageItem('SWEETOS_logged_in_user');
    if (userJson) {
      try {
        const user = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
        email = user?.email;
      } catch (e) {}
    }
  }
  if (email) {
    return `SWEETOS_notifications_${userKey(email)}`;
  }
  return 'SWEETOS_notifications_guest';
}

export function getNotificationsFromStorage(targetEmail = null) {
  const key = getNotificationsStorageKey(targetEmail);
  let notifs = [];
  try {
    const localStr = localStorage.getItem(key);
    if (localStr) notifs = JSON.parse(localStr);
  } catch(e) {}
  
  return Array.isArray(notifs) ? notifs : [];
}

export async function saveNotificationsToStorage(notifs, targetEmail, silent = false) {
  if (!Array.isArray(notifs)) return;
  const key = getNotificationsStorageKey(targetEmail);
  saveStorageItem(key, notifs);
  if (!silent) {
    window.dispatchEvent(new CustomEvent('notifications:updated'));
  }
}

export function broadcastNotificationToAll(notifItem) {
  if (!notifItem) return;

  const currentNotifs = getNotificationsFromStorage();
  if (!currentNotifs.some(n => n.id === notifItem.id)) {
    currentNotifs.unshift(notifItem);
    saveNotificationsToStorage(currentNotifs);
  }

  const scanAndAdd = (storageObj) => {
    if (!storageObj) return;
    try {
      const matchingKeys = [];
      for (let i = 0; i < storageObj.length; i++) {
        const key = storageObj.key(i);
        if (key && key.startsWith('SWEETOS_notifications')) {
          matchingKeys.push(key);
        }
      }
      
      matchingKeys.forEach(key => {
        try {
          const list = JSON.parse(storageObj.getItem(key) || '[]');
          if (Array.isArray(list) && !list.some(n => n.id === notifItem.id)) {
            list.unshift(notifItem);
            storageObj.setItem(key, JSON.stringify(list));
          }
        } catch(e) {}
      });
    } catch(e) {}
  };

  scanAndAdd(localStorage);

  window.dispatchEvent(new CustomEvent('notifications:updated'));
}

export function getScratchcardsStorageKey(targetEmail = null) {
  let email = targetEmail;
  if (!email) {
    const userJson = getStorageItem('SWEETOS_logged_in_user');
    if (userJson) {
      try {
        const user = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
        email = user?.email;
      } catch (e) {}
    }
  }
  if (email) {
    return `SWEETOS_user_scratchcards_${userKey(email)}`;
  }
  return 'SWEETOS_user_scratchcards_guest';
}

export async function saveScratchcardsToStorage(scratchcards, targetEmail) {
  if (!Array.isArray(scratchcards)) return;
  const key = getScratchcardsStorageKey(targetEmail);
  saveStorageItem(key, scratchcards);
}

export async function saveCouponsToStorage(coupons, targetEmail) {
  return;
}

export function formatPrice(price) {
  const currency = getStorageItem('SWEETOS_currency') || 'CFA';
  let symbol = currency;
  if (currency === 'USD') symbol = '$';
  else if (currency === 'EUR') symbol = '€';
  else if (currency === 'CFA' || currency === 'XOF' || currency === 'FCFA') symbol = 'FCFA';
  
  if (symbol === '$' || symbol === '€') {
    return `${symbol}${Math.round(price).toLocaleString()}`;
  }
  return `${Math.round(price).toLocaleString()} ${symbol}`;
}

export async function syncDeliveredNotifications() {
  const profileKey = getProfileStorageKey();
  const profileJson = getStorageItem(profileKey) || getStorageItem('SWEETOS_user_profile');
  if (!profileJson) return;
  
  let profile = {};
  try {
    profile = typeof profileJson === 'string' ? JSON.parse(profileJson) : profileJson;
  } catch(e) {
    return;
  }
  
  const userEmail = profile.email;
  if (!userEmail) return;

  const processOrders = async (ordersList) => {
    if (!Array.isArray(ordersList)) return;
    
    const deliveriesKey = `SWEETOS_processed_deliveries_${userKey(userEmail)}`;
    let processedDeliveries = [];
    try {
      const storedDeliveries = localStorage.getItem(deliveriesKey);
      if (storedDeliveries) processedDeliveries = JSON.parse(storedDeliveries);
    } catch(e) {}
    
    const notifKey = getNotificationsStorageKey(userEmail);
    let customerNotifs = getNotificationsFromStorage(userEmail);
    let changed = false;
    
    ordersList.forEach(order => {
      const isCompleted = order.status === 'Done' || order.status === 'Livré' || order.status === 'completed';
      const emailMatch = userKey(order.customerEmail || order.customer_email) === userKey(userEmail);
      const orderId = order.id || order.order_number;
      if (emailMatch && isCompleted && orderId) {
        if (!processedDeliveries.includes(orderId)) {
          processedDeliveries.push(orderId);
          
          const currentHour = new Date().getHours();
          let greeting = 'Bonjour';
          if (currentHour >= 12 && currentHour < 18) {
            greeting = 'Bon après-midi';
          } else if (currentHour >= 18) {
            greeting = 'Bonsoir';
          }
          
          const totalCFA = parseFloat(order.total || order.total_amount) || 0;
          
          customerNotifs.unshift({
            id: Date.now() + Math.floor(Math.random() * 1000),
            type: 'shipping',
            icon: '✅',
            title: `Commande #${orderId} livrée !`,
            desc: `${greeting} ! Merci infiniment pour votre achat chez SWEETOS. Votre commande #${orderId} a été livrée avec succès.<br>
              <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
                <button class="download-receipt-btn" data-order-id="${orderId}" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">Reçu 📄</button>
                ${totalCFA >= 2000 ? `<button class="view-mystery-email-btn" data-order-id="${orderId}" style="background:#ff5630; color:white; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">Mystery Box 🎁</button>` : ''}
              </div>`,
            time: 'Just now',
            unread: true
          });
          
          if (totalCFA >= 2000) {
            try {
              const scratchKey = getScratchcardsStorageKey(userEmail);
              let scratchcards = JSON.parse(getStorageItem(scratchKey) || '[]');
              if (!scratchcards.some(sc => sc.orderId === orderId)) {
                scratchcards.push({
                  id: Date.now() + Math.floor(Math.random() * 1000) + 1,
                  orderId: orderId,
                  amount: totalCFA,
                  scratched: false,
                  couponWon: null,
                  createdAt: Date.now(),
                  expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000
                });
                saveScratchcardsToStorage(scratchcards, userEmail);
              }
            } catch(e) {}
            
            customerNotifs.unshift({
              id: Date.now() + Math.floor(Math.random() * 1000) + 2,
              type: 'email',
              icon: '📧',
              title: `Nouveau Message: Votre Boîte Mystère`,
              desc: `Vous avez reçu un e-mail concernant votre Boîte Mystère de la commande #${orderId}.<br>
                <div style="margin-top:8px;">
                  <button class="open-email-modal-btn" data-order-id="${orderId}" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">Ouvrir l'E-mail 📩</button>
                </div>`,
              time: 'Just now',
              unread: true
            });
          }
          
          changed = true;
        }
      }
    });
    
    if (changed) {
      try { localStorage.setItem(deliveriesKey, JSON.stringify(processedDeliveries)); } catch(e) {}
      await saveNotificationsToStorage(customerNotifs, userEmail);
    }
  };

  try {
    const { fetchOrdersFromSupabase } = await import('./supabase.js');
    const orders = await fetchOrdersFromSupabase(userEmail);
    if (Array.isArray(orders) && orders.length > 0) {
      await processOrders(orders);
    } else if (isLocalDevHost()) {
      const res = await fetch('/api/orders').catch(() => null);
      const ordersData = (res && res.ok) ? await res.json().catch(() => []) : [];
      if (Array.isArray(ordersData)) await processOrders(ordersData);
    }
  } catch(e) {
    console.error('[syncDeliveredNotifications] Error:', e);
  }
}

export function formatTimeAgo(dateOrTimestamp) {
  if (!dateOrTimestamp) return "À l'instant";
  let timeMs = 0;
  if (typeof dateOrTimestamp === 'number') {
    timeMs = dateOrTimestamp;
  } else if (typeof dateOrTimestamp === 'string') {
    if (dateOrTimestamp === 'Just now' || dateOrTimestamp === "À l'instant") return "À l'instant";
    const parsed = Date.parse(dateOrTimestamp);
    if (!isNaN(parsed)) {
      timeMs = parsed;
    } else {
      return dateOrTimestamp;
    }
  } else if (dateOrTimestamp instanceof Date) {
    timeMs = dateOrTimestamp.getTime();
  }

  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - timeMs) / 1000));

  if (diffSec < 45) return "À l'instant";
  if (diffSec < 90) return "Il y a 1 min";
  if (diffSec < 3600) return `Il y a ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `Il y a ${hours}h`;
  }
  if (diffSec < 172800) return "Hier";
  const days = Math.floor(diffSec / 86400);
  if (days < 30) return `Il y a ${days}j`;
  return new Date(timeMs).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function getAllOrdersFromStorage() {
  let orders = [];
  try {
    const localStr = localStorage.getItem('SWEETOS_all_orders');
    if (localStr) orders = JSON.parse(localStr);
  } catch(e) {}
  
  const ordersMap = new Map((Array.isArray(orders) ? orders : []).map(o => [o.id || o.order_number, o]));

  const currentProfileKey = getProfileStorageKey();
  const profileData = getStorageItem(currentProfileKey);
  if (profileData) {
    try {
      const p = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
      if (p && Array.isArray(p.orders)) {
        p.orders.forEach(o => {
          const oid = o.id || o.order_number;
          if (oid && !ordersMap.has(oid)) {
            ordersMap.set(oid, o);
          }
        });
      }
    } catch(e) {}
  }

  return Array.from(ordersMap.values());
}

export function isLocalDevHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.endsWith('.local');
}

export async function saveAllOrdersToStorage(orders, silent = false) {
  if (!Array.isArray(orders)) return;
  const jsonStr = JSON.stringify(orders);
  try { localStorage.setItem('SWEETOS_all_orders', jsonStr); } catch(e) {}
  if (!silent) {
    window.dispatchEvent(new CustomEvent('orders:updated', { detail: orders }));
  }
  
  queueSupabaseSync(async () => {
    const userJson = getStorageItem('SWEETOS_logged_in_user');
    if (userJson) {
      try {
        const user = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
        if (user && user.email) {
          const { saveSiteSettingInSupabase } = await import('./supabase.js');
          const safeKey = userKey(user.email);
          const ok = await saveSiteSettingInSupabase(`sweetos_orders_${safeKey}`, orders);
          if (ok) {
            try { localStorage.setItem(`SUPABASE_SYNC_orders_${safeKey}`, 'synced'); } catch(e) {}
          } else {
            try { localStorage.setItem(`SUPABASE_SYNC_orders_${safeKey}`, 'pending'); } catch(e) {}
          }
        }
      } catch(e) {
        console.error('[Supabase Cloud] Orders sync failed:', e);
      }
    }
  });
  
  if (isLocalDevHost()) {
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonStr
    }).catch(() => {});
  }
}

export function getOrderCategory(statusStr) {
  if (!statusStr) return 'Placed';
  const s = String(statusStr).toLowerCase().trim();
  if (s === 'deleted') return 'Deleted';
  if (s.includes('cancel') || s.includes('annul') || s.includes('refus')) return 'Cancelled';
  if (s.includes('done') || s.includes('livr') || s.includes('deliver') || s.includes('complet')) return 'Done';
  if (s.includes('ship') || s.includes('expéd') || s.includes('transit')) return 'Shipping';
  if (s.includes('process') || s.includes('cours') || s.includes('traitement') || s.includes('prep')) return 'Processing';
  if (s.includes('confirm') || s.includes('valid')) return 'Confirm';
  return 'Placed';
}

// ============================================
// SUPABASE CLOUD LOAD & SAVE (Cross-Device Sync)
// ============================================

export async function loadUserDataFromSupabase(email) {
  if (!email) return false;
  const userEmailLower = email.toLowerCase().trim();
  const safeKey = userKey(userEmailLower);
  console.log('[Supabase Cloud] Loading user data across devices for:', userEmailLower);

  try {
    const { fetchProfileFromSupabase, fetchOrdersFromSupabase, fetchSiteSettingFromSupabase } = await import('./supabase.js');

    const [profile, cloudOrders, cloudCart, cloudNotifs, cloudScratchcards, cloudCoupons] = await Promise.allSettled([
      fetchProfileFromSupabase(userEmailLower),
      fetchOrdersFromSupabase(userEmailLower),
      fetchSiteSettingFromSupabase(`sweetos_cart_${safeKey}`),
      fetchSiteSettingFromSupabase(`sweetos_notifications_${safeKey}`),
      fetchSiteSettingFromSupabase(`sweetos_scratchcards_${safeKey}`),
      fetchSiteSettingFromSupabase(`sweetos_coupons_${safeKey}`)
    ]);

    let fetchedOrders = [];
    if (cloudOrders.status === 'fulfilled' && Array.isArray(cloudOrders.value)) {
      fetchedOrders = cloudOrders.value;
    }

    let currentAllOrders = getAllOrdersFromStorage();
    fetchedOrders.forEach(co => {
      const idx = currentAllOrders.findIndex(o => o.id === co.id);
      if (idx > -1) {
        currentAllOrders[idx] = { ...currentAllOrders[idx], ...co };
      } else {
        currentAllOrders.unshift(co);
      }
    });
    
    if (fetchedOrders.length > 0) {
      await saveAllOrdersToStorage(currentAllOrders, false);
    }

    let userProf = null;
    if (profile.status === 'fulfilled' && profile.value) {
      userProf = profile.value;
    } else {
      const existingProfStr = getStorageItem(`SWEETOS_user_profile_${safeKey}`) || getStorageItem('SWEETOS_user_profile');
      if (existingProfStr) {
        try { userProf = typeof existingProfStr === 'string' ? JSON.parse(existingProfStr) : existingProfStr; } catch(e) {}
      }
    }

    if (userProf) {
      if (!Array.isArray(userProf.orders)) userProf.orders = [];
      fetchedOrders.forEach(co => {
        if (!userProf.orders.some(po => po.id === co.id)) {
          userProf.orders.unshift(co);
        }
      });
      saveStorageItem(`SWEETOS_user_profile_${safeKey}`, userProf);
      saveStorageItem('SWEETOS_user_profile', userProf);
    }

    if (cloudCart.status === 'fulfilled' && Array.isArray(cloudCart.value)) {
      saveStorageItem(`SWEETOS_cart_${safeKey}`, cloudCart.value);
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: cloudCart.value }));
    }

    if (cloudNotifs.status === 'fulfilled' && Array.isArray(cloudNotifs.value)) {
      await saveNotificationsToStorage(cloudNotifs.value, userEmailLower);
    }

    if (cloudScratchcards.status === 'fulfilled' && Array.isArray(cloudScratchcards.value)) {
      await saveScratchcardsToStorage(cloudScratchcards.value, userEmailLower);
    }

    window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true, email: userEmailLower } }));
    window.dispatchEvent(new CustomEvent('profile:updated'));
    window.dispatchEvent(new CustomEvent('orders:updated', { detail: currentAllOrders }));

    console.log('🎉 [Supabase Cloud] User data successfully synced across devices for:', userEmailLower);
    return true;
  } catch (err) {
    console.error('[Supabase Cloud Sync Error]:', err);
    return false;
  }
}

export async function saveUserDataToSupabase(email, dataType, data) {
  if (!email || !dataType) return;
  const safeKey = userKey(email);
  queueSupabaseSync(async () => {
    try {
      const { saveSiteSettingInSupabase, saveCustomerToSupabase } = await import('./supabase.js');
      switch (dataType) {
        case 'profile':
          await saveCustomerToSupabase(data);
          break;
        case 'cart':
          await saveSiteSettingInSupabase(`sweetos_cart_${safeKey}`, data);
          break;
        case 'notifications':
          await saveSiteSettingInSupabase(`sweetos_notifications_${safeKey}`, data);
          break;
        case 'scratchcards':
          await saveSiteSettingInSupabase(`sweetos_scratchcards_${safeKey}`, data);
          break;
      }
      console.log(`[Supabase Cloud] ${dataType} saved successfully for:`, email);
    } catch (e) {
      console.error('[Supabase Cloud Save Error]:', e);
    }
  });
}

export async function retryPendingSupabaseSyncs() {
  const userJson = getStorageItem('SWEETOS_logged_in_user');
  if (!userJson) return;

  try {
    const user = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
    if (!user || !user.email) return;

    const safeKey = userKey(user.email);
    const types = ['cart', 'notifications', 'scratchcards', 'orders'];

    for (const type of types) {
      const syncKey = `SUPABASE_SYNC_${type}_${safeKey}`;
      if (localStorage.getItem(syncKey) === 'pending') {
        const dataKey = type === 'cart' ? `SWEETOS_cart_${safeKey}` :
                        type === 'notifications' ? `SWEETOS_notifications_${safeKey}` :
                        type === 'scratchcards' ? `SWEETOS_user_scratchcards_${safeKey}` :
                        `SWEETOS_all_orders`;

        const dataStr = getStorageItem(dataKey);
        if (dataStr) {
          try {
            const { saveSiteSettingInSupabase } = await import('./supabase.js');
            const data = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
            const ok = await saveSiteSettingInSupabase(`sweetos_${type}_${safeKey}`, data);
            if (ok) {
              try { localStorage.setItem(syncKey, 'synced'); } catch(e) {}
              console.log(`[Supabase Cloud] Retry sync succeeded for ${type}`);
            }
          } catch(e) {
            console.error(`[Supabase Cloud] Retry sync failed for ${type}:`, e);
          }
        }
      }
    }
  } catch(e) {
    console.error('[Supabase Cloud] Retry sync error:', e);
  }
}

// ============================================
// INITIALIZATION & CROSS-TAB SYNC
// ============================================

export async function syncAllStorage() {
  console.log('🔄 [Storage Sync] Syncing database state across all tabs & Cloud...');
  try {
    const { fetchOrdersFromSupabase, fetchCustomersFromSupabase, fetchProductsFromSupabase } = await import('./supabase.js');
    const [orders, customers, products] = await Promise.all([
      fetchOrdersFromSupabase(),
      fetchCustomersFromSupabase(),
      fetchProductsFromSupabase()
    ]);

    if (Array.isArray(orders)) {
      const ordersStr = JSON.stringify(orders);
      try { localStorage.setItem('SWEETOS_all_orders', ordersStr); } catch(e) {}
      console.log('✅ [Storage Sync] Orders synced:', orders.length);
    }

    if (Array.isArray(customers)) {
      const customersStr = JSON.stringify(customers);
      try { localStorage.setItem('SWEETOS_customers', customersStr); } catch(e) {}
      console.log('✅ [Storage Sync] Customers synced:', customers.length);
    }

    if (Array.isArray(products)) {
      const productsStr = JSON.stringify(products);
      try { localStorage.setItem('SWEETOS_products', productsStr); } catch(e) {}
      console.log('✅ [Storage Sync] Products synced:', products.length);
    }

    try { localStorage.setItem('SWEETOS_storage_sync_trigger', Date.now().toString()); } catch(e) {}
    window.dispatchEvent(new CustomEvent('storage:synced'));
    window.dispatchEvent(new CustomEvent('orders:updated'));
    return true;
  } catch(e) {
    console.error('❌ [Storage Sync] Failed to sync storage:', e);
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', function(e) {
    if (e.key === 'SWEETOS_storage_sync_trigger') {
      console.log('📦 [Storage Sync] Cross-tab sync signal received from another tab');
      window.dispatchEvent(new CustomEvent('storage:synced'));
      window.dispatchEvent(new CustomEvent('orders:updated'));
    }
  });
}

export async function syncCustomersToSupabase(customers) {
  if (!Array.isArray(customers)) return [];
  try {
    const { saveCustomerToSupabase } = await import('./supabase.js');
    const results = [];
    
    for (const customer of customers) {
      try {
        const result = await saveCustomerToSupabase({
          email: customer.email,
          name: customer.name || customer.firstName || 'Client',
          phone: customer.phone || '',
          level: customer.level || 'starter',
          badgeType: customer.badgeType || 'none',
          unlockedBadges: customer.unlockedBadges || []
        });
        results.push({ email: customer.email, success: true, result });
      } catch (e) {
        results.push({ email: customer.email, success: false, error: e.message });
      }
    }
    
    console.log('[Supabase Cloud] Customers batch synced:', results);
    return results;
  } catch (e) {
    console.error('[Supabase Cloud] Failed to sync customers batch:', e);
    return [];
  }
}

const CURRENT_APP_VERSION = 'v1.0.5';

export function clearAllUserSessionData() {
  const keysToRemove = [
    'SWEETOS_logged_in_user',
    'SWEETOS_user_profile',
    'SWEETOS_auth_token',
    'SWEETOS_user_session',
    'SWEETOS_session',
    'SWEETOS_active_profile_tab',
    'SWEETOS_applied_coupon',
    'SWEETOS_wishlist'
  ];
  
  try {
    keysToRemove.forEach(k => localStorage.removeItem(k));
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('SWEETOS_user_profile_') ||
        key.startsWith('SWEETOS_notifications_') ||
        key.startsWith('SWEETOS_cart_') ||
        key.startsWith('SWEETOS_coupons_') ||
        key.startsWith('SWEETOS_user_scratchcards_') ||
        key.startsWith('SUPABASE_SYNC_') ||
        key.startsWith('sb-') ||
        key.includes('auth-token')
      )) {
        localStorage.removeItem(key);
      }
    }
  } catch(e) {}

  try {
    import('./supabase.js').then(({ supabase }) => {
      if (supabase && supabase.auth) {
        supabase.auth.signOut().catch(() => {});
      }
    }).catch(() => {});
  } catch(e) {}
}

export function validateAndCleanStaleSession() {
  const userJson = getStorageItem('SWEETOS_logged_in_user');
  if (userJson) {
    try {
      const parsed = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
      if (!parsed || !parsed.email || typeof parsed.email !== 'string') {
        console.warn('🧹 [Storage] Invalid or corrupted session detected. Auto-cleaning...');
        clearAllUserSessionData();
      }
    } catch(e) {
      console.warn('🧹 [Storage] Unparseable session JSON detected. Auto-cleaning...');
      clearAllUserSessionData();
    }
  }
}

export function checkAppVersionAndCleanStorage() {
  try {
    const storedVersion = localStorage.getItem('SWEETOS_APP_VERSION');
    if (storedVersion !== CURRENT_APP_VERSION) {
      console.log(`🧹 [Storage] App updated from ${storedVersion || 'legacy'} to ${CURRENT_APP_VERSION}. Invalidating old local storage cache...`);
      
      try { localStorage.removeItem('SWEETOS_products'); } catch(e) {}
      
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('SWEETOS_products') || key.startsWith('SUPABASE_SYNC_'))) {
            localStorage.removeItem(key);
          }
        }
      } catch(e) {}
      
      localStorage.setItem('SWEETOS_APP_VERSION', CURRENT_APP_VERSION);
    }
  } catch (e) {
    console.warn('[Storage] App version check skipped:', e);
  }
}

export async function initStorageSync() {
  console.log('[Storage] Initializing with Supabase sync...');
  checkAppVersionAndCleanStorage();
  validateAndCleanStaleSession();
  await retryPendingSupabaseSyncs();
  console.log('[Storage] Initialization complete');
}

export function getSyncStatus(email) {
  let targetEmail = email;
  if (!targetEmail) {
    const userJson = getStorageItem('SWEETOS_logged_in_user');
    if (userJson) {
      try {
        const u = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
        targetEmail = u.email;
      } catch(e) {}
    }
  }
  if (!targetEmail) return [];
  
  const safeKey = userKey(targetEmail);
  const types = ['cart', 'notifications', 'scratchcards', 'orders', 'profile'];
  
  return types.map(type => ({
    type,
    status: localStorage.getItem(`SUPABASE_SYNC_${type}_${safeKey}`) || 'unknown',
    key: `SUPABASE_SYNC_${type}_${safeKey}`
  }));
}

export async function forceSyncToSupabase() {
  const userJson = getStorageItem('SWEETOS_logged_in_user');
  if (!userJson) {
    console.warn('[Supabase Sync] No active user logged in for forceSync');
    return { error: 'No user logged in' };
  }
  
  try {
    const user = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
    if (!user || !user.email) return { error: 'Invalid user session' };
    
    console.log('[Supabase Sync] Force syncing all data for:', user.email);
    
    const cart = getCartFromStorage();
    if (cart) saveCartToStorage(cart);
    
    const notifs = getNotificationsFromStorage(user.email);
    if (notifs) saveNotificationsToStorage(notifs, user.email);
    
    const scratchKey = getScratchcardsStorageKey(user.email);
    const scratchData = getStorageItem(scratchKey);
    if (scratchData) {
      const parsed = typeof scratchData === 'string' ? JSON.parse(scratchData) : scratchData;
      saveScratchcardsToStorage(parsed, user.email);
    }
    
    await retryPendingSupabaseSyncs();
    return { success: true, email: user.email, status: getSyncStatus(user.email) };
  } catch (e) {
    console.error('[Supabase Sync] Force sync failed:', e);
    return { error: e.message };
  }
}

if (typeof window !== 'undefined') {
  window.testSupabaseConnection = async () => {
    const { testSupabaseConnection } = await import('./supabase.js');
    return await testSupabaseConnection();
  };
  window.forceSyncToSupabase = forceSyncToSupabase;
  window.getSyncStatus = getSyncStatus;
}
