// ============================================
// STORAGE UTILITIES WITH SUPABASE CLOUD SYNC
// ============================================

let _supabaseSaving = false;

export function saveStorageItem(key, val) {
  if (key === 'SWEETOS_products') {
    try { localStorage.removeItem(key); } catch(e) {}
    try { sessionStorage.removeItem(key); } catch(e) {}
    return;
  }
  if (val === null || val === undefined) {
    try { localStorage.removeItem(key); } catch(e) {}
    try { sessionStorage.removeItem(key); } catch(e) {}
    return;
  }
  const str = typeof val === 'string' ? val : JSON.stringify(val);
  try { localStorage.setItem(key, str); } catch(e) {}
  try { sessionStorage.setItem(key, str); } catch(e) {}
  
  // Auto-sync to Supabase for known keys (non-blocking)
  const syncableKeys = ['SWEETOS_cart_', 'SWEETOS_notifications_', 'SWEETOS_user_scratchcards_', 'SWEETOS_coupons_', 'SWEETOS_user_profile_'];
  const shouldSync = syncableKeys.some(prefix => key.startsWith(prefix));
  
  if (shouldSync && !_supabaseSaving) {
    _supabaseSaving = true;
    // Use setTimeout to not block the main thread
    setTimeout(async () => {
      try {
        const userJson = getStorageItem('SWEETOS_logged_in_user');
        if (userJson) {
          const user = JSON.parse(userJson);
          if (user && user.email) {
            const { saveSiteSettingInSupabase, saveCustomerToSupabase } = await import('./supabase.js');
            const safeKey = user.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
            
            let data;
            try { data = JSON.parse(str); } catch(e) { data = str; }
            
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
                sessionStorage.setItem(`SUPABASE_SYNC_${type}_${safeKey}`, 'synced');
              } else {
                sessionStorage.setItem(`SUPABASE_SYNC_${type}_${safeKey}`, 'pending');
              }
            }
          }
        }
      } catch(e) {
        console.error('[Supabase] Auto-sync failed for key:', key, e);
        try {
          const userJson = getStorageItem('SWEETOS_logged_in_user');
          if (userJson) {
            const user = JSON.parse(userJson);
            if (user && user.email) {
              const safeKey = user.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
              const type = key.replace('SWEETOS_', '').split('_')[0] || 'data';
              sessionStorage.setItem(`SUPABASE_SYNC_${type}_${safeKey}`, 'pending');
            }
          }
        } catch(inner) {}
      } finally {
        _supabaseSaving = false;
      }
    }, 100);
  }
}

export function getStorageItem(key) {
  // For products, never use local storage cache - always force live fetch
  if (key === 'SWEETOS_products') {
    return null;
  }
  
  try {
    const localVal = localStorage.getItem(key);
    if (localVal !== null) return localVal;
  } catch(e) {}
  try {
    return sessionStorage.getItem(key);
  } catch(e) {}
  return null;
}

// ===== NEW: Force reload from Supabase =====
export async function forceReloadProducts() {
  console.log('🔄 [Storage] Force reloading products from Supabase...');
  try {
    const { fetchProductsFromSupabase } = await import('./supabase.js');
    const products = await fetchProductsFromSupabase();
    if (products && products.length > 0) {
      saveStorageItem('SWEETOS_products', products);
      sessionStorage.setItem('SWEETOS_products', JSON.stringify(products));
      console.log('✅ [Storage] Products reloaded:', products.length);
      return products;
    }
  } catch (e) {
    console.error('❌ [Storage] Failed to reload products:', e);
  }
  return null;
}

export function getCartStorageKey() {
  const userJson = getStorageItem('SWEETOS_logged_in_user');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user && user.email) {
        const safeKey = user.email.replace(/[^a-zA-Z0-9]/g, '_');
        return `SWEETOS_cart_${safeKey}`;
      }
    } catch (e) {}
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

  const userJson = getStorageItem('SWEETOS_logged_in_user');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user && user.email) {
        const { saveSiteSettingInSupabase } = await import('./supabase.js');
        const safeKey = user.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        const ok = await saveSiteSettingInSupabase(`sweetos_cart_${safeKey}`, cartItems);
        if (ok) {
          console.log('[Supabase Cloud] Cart synced successfully for:', user.email);
          try { sessionStorage.setItem(`SUPABASE_SYNC_cart_${safeKey}`, 'synced'); } catch(e) {}
        } else {
          console.warn('[Supabase Cloud] Cart save returned false');
          try { sessionStorage.setItem(`SUPABASE_SYNC_cart_${safeKey}`, 'pending'); } catch(e) {}
        }
      }
    } catch(e) {
      console.error('[Supabase Cloud Cart Save Error]:', e);
    }
  }
}

export function getProfileStorageKey(email = null) {
  let targetEmail = email;
  if (!targetEmail) {
    const userJson = getStorageItem('SWEETOS_logged_in_user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        if (user && user.email) targetEmail = user.email;
      } catch (e) {}
    }
  }
  if (targetEmail) {
    const safeKey = targetEmail.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    return `SWEETOS_user_profile_${safeKey}`;
  }
  return 'SWEETOS_user_profile_guest';
}

export function getNotificationsStorageKey(targetEmail) {
  let email = targetEmail;
  if (!email) {
    const userJson = getStorageItem('SWEETOS_logged_in_user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        email = user?.email;
      } catch (e) {}
    }
  }
  if (email) {
    const safeKey = String(email).toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    return `SWEETOS_notifications_${safeKey}`;
  }
  return 'SWEETOS_notifications_guest';
}

export function getNotificationsFromStorage(targetEmail) {
  const key = getNotificationsStorageKey(targetEmail);
  let notifs = [];
  try {
    const localStr = localStorage.getItem(key);
    if (localStr) notifs = JSON.parse(localStr);
  } catch(e) {}
  
  if (!Array.isArray(notifs) || notifs.length === 0) {
    try {
      const sessionStr = sessionStorage.getItem(key);
      if (sessionStr) notifs = JSON.parse(sessionStr);
    } catch(e) {}
  }
  
  return Array.isArray(notifs) ? notifs : [];
}

export async function saveNotificationsToStorage(notifs, targetEmail) {
  if (!Array.isArray(notifs)) return;
  const key = getNotificationsStorageKey(targetEmail);
  const jsonStr = JSON.stringify(notifs);
  try { localStorage.setItem(key, jsonStr); } catch(e) {}
  try { sessionStorage.setItem(key, jsonStr); } catch(e) {}
  window.dispatchEvent(new CustomEvent('notifications:updated'));

  if (targetEmail) {
    try {
      const { saveSiteSettingInSupabase } = await import('./supabase.js');
      const safeKey = String(targetEmail).toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
      await saveSiteSettingInSupabase(`sweetos_notifications_${safeKey}`, notifs);
      console.log('[Supabase Cloud] Notifications synced successfully for:', targetEmail);
      sessionStorage.setItem(`SUPABASE_SYNC_notifications_${safeKey}`, 'synced');
    } catch(e) {
      console.error('[Supabase Cloud Notifications Sync Error]:', e);
      const safeKey = String(targetEmail).toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
      sessionStorage.setItem(`SUPABASE_SYNC_notifications_${safeKey}`, 'pending');
    }
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
      for (let i = 0; i < storageObj.length; i++) {
        const key = storageObj.key(i);
        if (key && key.startsWith('SWEETOS_notifications')) {
          try {
            const list = JSON.parse(storageObj.getItem(key) || '[]');
            if (Array.isArray(list) && !list.some(n => n.id === notifItem.id)) {
              list.unshift(notifItem);
              storageObj.setItem(key, JSON.stringify(list));
            }
          } catch(e) {}
        }
      }
    } catch(e) {}
  };

  scanAndAdd(localStorage);
  scanAndAdd(sessionStorage);

  window.dispatchEvent(new CustomEvent('notifications:updated'));
}

export function getScratchcardsStorageKey() {
  const userJson = getStorageItem('SWEETOS_logged_in_user');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user && user.email) {
        const safeKey = user.email.replace(/[^a-zA-Z0-9]/g, '_');
        return `SWEETOS_user_scratchcards_${safeKey}`;
      }
    } catch (e) {}
  }
  return 'SWEETOS_user_scratchcards_guest';
}

export async function saveScratchcardsToStorage(scratchcards, targetEmail) {
  if (!Array.isArray(scratchcards)) return;
  const email = targetEmail || (() => {
    try {
      const u = JSON.parse(getStorageItem('SWEETOS_logged_in_user'));
      return u?.email;
    } catch(e) { return null; }
  })();
  
  if (!email) return;
  
  const safeKey = email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  const key = `SWEETOS_user_scratchcards_${safeKey}`;
  const jsonStr = JSON.stringify(scratchcards);
  try { localStorage.setItem(key, jsonStr); } catch(e) {}
  try { sessionStorage.setItem(key, jsonStr); } catch(e) {}
  
  // Save to Supabase
  try {
    const { saveSiteSettingInSupabase } = await import('./supabase.js');
    const ok = await saveSiteSettingInSupabase(`sweetos_scratchcards_${safeKey}`, scratchcards);
    if (ok) {
      console.log('[Supabase Cloud] Scratchcards synced');
      sessionStorage.setItem(`SUPABASE_SYNC_scratchcards_${safeKey}`, 'synced');
    } else {
      sessionStorage.setItem(`SUPABASE_SYNC_scratchcards_${safeKey}`, 'pending');
    }
  } catch(e) {
    console.error('[Supabase Cloud] Scratchcards sync failed:', e);
    sessionStorage.setItem(`SUPABASE_SYNC_scratchcards_${safeKey}`, 'pending');
  }
}

export async function saveCouponsToStorage(coupons, targetEmail) {
  if (!Array.isArray(coupons)) return;
  const email = targetEmail || (() => {
    try {
      const u = JSON.parse(getStorageItem('SWEETOS_logged_in_user'));
      return u?.email;
    } catch(e) { return null; }
  })();
  
  if (!email) return;
  
  const safeKey = email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  const key = `SWEETOS_coupons_${safeKey}`;
  const jsonStr = JSON.stringify(coupons);
  try { localStorage.setItem(key, jsonStr); } catch(e) {}
  try { sessionStorage.setItem(key, jsonStr); } catch(e) {}
  
  // Save to Supabase
  try {
    const { saveSiteSettingInSupabase } = await import('./supabase.js');
    const ok = await saveSiteSettingInSupabase(`sweetos_coupons_${safeKey}`, coupons);
    if (ok) {
      console.log('[Supabase Cloud] Coupons synced');
      sessionStorage.setItem(`SUPABASE_SYNC_coupons_${safeKey}`, 'synced');
    } else {
      sessionStorage.setItem(`SUPABASE_SYNC_coupons_${safeKey}`, 'pending');
    }
  } catch(e) {
    console.error('[Supabase Cloud] Coupons sync failed:', e);
    sessionStorage.setItem(`SUPABASE_SYNC_coupons_${safeKey}`, 'pending');
  }
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
    profile = JSON.parse(profileJson);
  } catch(e) {
    return;
  }
  
  const userEmail = profile.email;
  if (!userEmail) return;

  const processOrders = async (ordersList) => {
    if (!Array.isArray(ordersList)) return;
    
    let processedDeliveries = [];
    try {
      processedDeliveries = JSON.parse(sessionStorage.getItem('SWEETOS_processed_deliveries') || '[]');
    } catch(e) {}
    
    const notifKey = getNotificationsStorageKey();
    let customerNotifs = [];
    try {
      customerNotifs = JSON.parse(sessionStorage.getItem(notifKey) || '[]');
    } catch(e) {}
    
    let changed = false;
    
    ordersList.forEach(order => {
      const isCompleted = order.status === 'Done' || order.status === 'Livré' || order.status === 'completed';
      const emailMatch = (order.customerEmail || order.customer_email || '').toLowerCase() === userEmail.toLowerCase();
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
              let scratchcards = JSON.parse(sessionStorage.getItem('SWEETOS_user_scratchcards') || '[]');
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
                sessionStorage.setItem('SWEETOS_user_scratchcards', JSON.stringify(scratchcards));
                // Also save to Supabase
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
      sessionStorage.setItem('SWEETOS_processed_deliveries', JSON.stringify(processedDeliveries));
      sessionStorage.setItem(notifKey, JSON.stringify(customerNotifs));
      window.dispatchEvent(new CustomEvent('notifications:updated'));
      
      // Save notifications to Supabase
      await saveNotificationsToStorage(customerNotifs, userEmail);
      console.log('[Supabase Cloud] Delivery notifications synced');

      // Dispatch EmailJS Notifications
      try {
        const { sendOrderDeliveredEmail, sendMysteryBoxEmail } = await import('./emailNotifications.js');
        const newlyProcessed = ordersList.filter(o => {
          const oid = o.id || o.order_number;
          return oid && processedDeliveries.includes(oid);
        });
        for (const order of newlyProcessed) {
          const oid = order.id || order.order_number;
          const totalCFA = parseFloat(order.total || order.total_amount) || 0;
          await sendOrderDeliveredEmail(oid, totalCFA, userEmail);
          if (totalCFA >= 2000) {
            await sendMysteryBoxEmail(oid, userEmail);
          }
        }
      } catch(emailErr) {
        console.error('[EmailJS] Error sending delivery email:', emailErr);
      }

      // Dispatch WhatsApp Delivery Notifications
      try {
        const { sendOrderDeliveredWhatsApp } = await import('./whatsapp.js');
        const newlyProcessed = ordersList.filter(o => {
          const oid = o.id || o.order_number;
          return oid && processedDeliveries.includes(oid);
        });
        for (const order of newlyProcessed) {
          const customerPhone = order.phone || order.customerPhone || order.shippingPhone;
          if (customerPhone) {
            await sendOrderDeliveredWhatsApp(order, customerPhone);
          }
        }
      } catch(waErr) {
        console.error('[WhatsApp] Error sending delivery notification:', waErr);
      }
    }
  };

  try {
    const { fetchOrdersFromSupabase } = await import('./supabase.js');
    const orders = await fetchOrdersFromSupabase(userEmail);
    if (Array.isArray(orders) && orders.length > 0) {
      await processOrders(orders);
    } else {
      const res = await fetch('/api/orders');
      const ordersData = res.ok ? await res.json() : [];
      await processOrders(ordersData);
    }
  } catch(e) {
    console.error('[syncDeliveredNotifications] Error:', e);
    // Fallback to local API
    try {
      const res = await fetch('/api/orders');
      const ordersData = res.ok ? await res.json() : [];
      await processOrders(ordersData);
    } catch(fallbackErr) {
      console.error('[syncDeliveredNotifications] Fallback error:', fallbackErr);
    }
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
  
  if (!Array.isArray(orders) || orders.length === 0) {
    try {
      const sessionStr = sessionStorage.getItem('SWEETOS_all_orders');
      if (sessionStr) orders = JSON.parse(sessionStr);
    } catch(e) {}
  }
  
  const ordersMap = new Map((Array.isArray(orders) ? orders : []).map(o => [o.id || o.order_number, o]));

  const scanProfileOrders = (storageObj) => {
    if (!storageObj) return;
    try {
      for (let i = 0; i < storageObj.length; i++) {
        const key = storageObj.key(i);
        if (key && (key.startsWith('SWEETOS_user_profile_') || key === 'SWEETOS_logged_in_user')) {
          try {
            const p = JSON.parse(storageObj.getItem(key));
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
      }
    } catch(e) {}
  };

  scanProfileOrders(localStorage);
  scanProfileOrders(sessionStorage);

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
  try { sessionStorage.setItem('SWEETOS_all_orders', jsonStr); } catch(e) {}
  if (!silent) {
    window.dispatchEvent(new CustomEvent('orders:updated', { detail: orders }));
  }
  
  // Save to Supabase
  try {
    const userJson = getStorageItem('SWEETOS_logged_in_user');
    if (userJson) {
      const user = JSON.parse(userJson);
      if (user && user.email) {
        const { saveSiteSettingInSupabase } = await import('./supabase.js');
        const safeKey = user.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        const ok = await saveSiteSettingInSupabase(`sweetos_orders_${safeKey}`, orders);
        if (ok) {
          console.log('[Supabase Cloud] Orders synced successfully');
          sessionStorage.setItem(`SUPABASE_SYNC_orders_${safeKey}`, 'synced');
        } else {
          sessionStorage.setItem(`SUPABASE_SYNC_orders_${safeKey}`, 'pending');
        }
      }
    }
  } catch(e) {
    console.error('[Supabase Cloud] Orders sync failed:', e);
    try {
      const userJson = getStorageItem('SWEETOS_logged_in_user');
      if (userJson) {
        const user = JSON.parse(userJson);
        if (user && user.email) {
          const safeKey = user.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
          sessionStorage.setItem(`SUPABASE_SYNC_orders_${safeKey}`, 'pending');
        }
      }
    } catch(inner) {}
  }
  
  // Persist to local Node server disk asynchronously only in local dev environment
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
  console.log('[Supabase Cloud] Loading user data across devices for:', userEmailLower);

  try {
    const { fetchProfileFromSupabase, fetchOrdersFromSupabase, fetchSiteSettingFromSupabase } = await import('./supabase.js');
    const safeKey = userEmailLower.replace(/[^a-z0-9]/g, '_');

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

    // 1. Merge cloud orders into SWEETOS_all_orders without dropping existing local orders
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

    // 2. Hydrate user profile with cloud profile & cloud orders
    let userProf = null;
    if (profile.status === 'fulfilled' && profile.value) {
      userProf = profile.value;
    } else {
      const existingProfStr = getStorageItem(`SWEETOS_user_profile_${safeKey}`) || getStorageItem('SWEETOS_user_profile');
      if (existingProfStr) {
        try { userProf = JSON.parse(existingProfStr); } catch(e) {}
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

    // 3. Hydrate cart, notifications, scratchcards & coupons
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

    if (cloudCoupons.status === 'fulfilled' && Array.isArray(cloudCoupons.value)) {
      await saveCouponsToStorage(cloudCoupons.value, userEmailLower);
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
  try {
    const { saveSiteSettingInSupabase, saveCustomerToSupabase } = await import('./supabase.js');
    const safeKey = email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');

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
      case 'coupons':
        await saveSiteSettingInSupabase(`sweetos_coupons_${safeKey}`, data);
        break;
    }
    console.log(`[Supabase Cloud] ${dataType} saved successfully for:`, email);
  } catch (e) {
    console.error('[Supabase Cloud Save Error]:', e);
  }
}

export async function retryPendingSupabaseSyncs() {
  const userJson = getStorageItem('SWEETOS_logged_in_user');
  if (!userJson) return;

  try {
    const user = JSON.parse(userJson);
    if (!user || !user.email) return;

    const safeKey = user.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const types = ['cart', 'notifications', 'scratchcards', 'coupons', 'orders'];

    for (const type of types) {
      const syncKey = `SUPABASE_SYNC_${type}_${safeKey}`;
      if (sessionStorage.getItem(syncKey) === 'pending') {
        const dataKey = type === 'cart' ? `SWEETOS_cart_${safeKey}` :
                        type === 'notifications' ? `SWEETOS_notifications_${safeKey}` :
                        type === 'scratchcards' ? `SWEETOS_user_scratchcards_${safeKey}` :
                        type === 'coupons' ? `SWEETOS_coupons_${safeKey}` :
                        `SWEETOS_all_orders`;

        const dataStr = getStorageItem(dataKey);
        if (dataStr) {
          try {
            const { saveSiteSettingInSupabase } = await import('./supabase.js');
            const data = JSON.parse(dataStr);
            const ok = await saveSiteSettingInSupabase(`sweetos_${type}_${safeKey}`, data);
            if (ok) {
              sessionStorage.setItem(syncKey, 'synced');
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

/**
 * Force sync all storage between localStorage, sessionStorage and Supabase Cloud.
 * Guarantees all tabs show identical data.
 */
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
      try { sessionStorage.setItem('SWEETOS_all_orders', ordersStr); } catch(e) {}
      console.log('✅ [Storage Sync] Orders synced:', orders.length);
    }

    if (Array.isArray(customers)) {
      const customersStr = JSON.stringify(customers);
      try { localStorage.setItem('SWEETOS_customers', customersStr); } catch(e) {}
      try { sessionStorage.setItem('SWEETOS_customers', customersStr); } catch(e) {}
      console.log('✅ [Storage Sync] Customers synced:', customers.length);
    }

    if (Array.isArray(products)) {
      const productsStr = JSON.stringify(products);
      try { localStorage.setItem('SWEETOS_products', productsStr); } catch(e) {}
      try { sessionStorage.setItem('SWEETOS_products', productsStr); } catch(e) {}
      console.log('✅ [Storage Sync] Products synced:', products.length);
    }

    // Trigger cross-tab sync signal
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

export async function initStorageSync() {
  console.log('[Storage] Initializing with Supabase sync...');
  await retryPendingSupabaseSyncs();
  console.log('[Storage] Initialization complete');
}

export function getSyncStatus(email) {
  if (!email) {
    const userJson = getStorageItem('SWEETOS_logged_in_user');
    if (userJson) {
      try {
        const u = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
        email = u.email;
      } catch(e) {}
    }
  }
  if (!email) return [];
  
  const safeKey = email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
  const types = ['cart', 'notifications', 'scratchcards', 'coupons', 'orders', 'profile'];
  
  return types.map(type => ({
    type,
    status: sessionStorage.getItem(`SUPABASE_SYNC_${type}_${safeKey}`) || 'unknown',
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
    const safeKey = user.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    
    const cart = getCartFromStorage();
    if (cart) saveCartToStorage(cart);
    
    const notifs = getNotificationsFromStorage(user.email);
    if (notifs) saveNotificationsToStorage(notifs, user.email);
    
    const scratchKey = `SWEETOS_user_scratchcards_${safeKey}`;
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

// Expose diagnostic helpers on window
if (typeof window !== 'undefined') {
  window.testSupabaseConnection = async () => {
    const { testSupabaseConnection } = await import('./supabase.js');
    return await testSupabaseConnection();
  };
  window.forceSyncToSupabase = forceSyncToSupabase;
  window.getSyncStatus = getSyncStatus;
}
