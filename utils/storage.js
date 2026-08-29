export function saveStorageItem(key, val) {
  if (val === null || val === undefined) {
    try { localStorage.removeItem(key); } catch(e) {}
    try { sessionStorage.removeItem(key); } catch(e) {}
    return;
  }
  const str = typeof val === 'string' ? val : JSON.stringify(val);
  try { localStorage.setItem(key, str); } catch(e) {}
  try { sessionStorage.setItem(key, str); } catch(e) {}
}

export function getStorageItem(key) {
  try {
    const localVal = localStorage.getItem(key);
    if (localVal !== null) return localVal;
  } catch(e) {}
  try {
    return sessionStorage.getItem(key);
  } catch(e) {}
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

export function saveCartToStorage(cartItems) {
  const key = getCartStorageKey();
  saveStorageItem(key, cartItems);
  window.dispatchEvent(new CustomEvent('cart:updated', { detail: cartItems }));

  const userJson = getStorageItem('SWEETOS_logged_in_user');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user && user.email) {
        import('./supabase.js').then(({ saveSiteSettingInSupabase }) => {
          const safeKey = user.email.replace(/[^a-zA-Z0-9]/g, '_');
          saveSiteSettingInSupabase(`sweetos_cart_${safeKey}`, cartItems);
        }).catch(() => {});
      }
    } catch(e) {}
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

export function saveNotificationsToStorage(notifs, targetEmail) {
  if (!Array.isArray(notifs)) return;
  const key = getNotificationsStorageKey(targetEmail);
  const jsonStr = JSON.stringify(notifs);
  try { localStorage.setItem(key, jsonStr); } catch(e) {}
  try { sessionStorage.setItem(key, jsonStr); } catch(e) {}
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

export function syncDeliveredNotifications() {
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

  const processOrders = (ordersList) => {
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
    }
  };

  try {
    import('./supabase.js').then(({ fetchOrdersFromSupabase }) => {
      fetchOrdersFromSupabase(userEmail).then(orders => {
        if (Array.isArray(orders) && orders.length > 0) {
          processOrders(orders);
        } else {
          fetch('/api/orders')
            .then(res => res.ok ? res.json() : [])
            .then(processOrders)
            .catch(() => {});
        }
      }).catch(() => {
        fetch('/api/orders')
          .then(res => res.ok ? res.json() : [])
          .then(processOrders)
          .catch(() => {});
      });
    });
  } catch(e) {}
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
  
  return Array.isArray(orders) ? orders : [];
}

export function isLocalDevHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.endsWith('.local');
}

export function saveAllOrdersToStorage(orders, silent = false) {
  if (!Array.isArray(orders)) return;
  const jsonStr = JSON.stringify(orders);
  try { localStorage.setItem('SWEETOS_all_orders', jsonStr); } catch(e) {}
  try { sessionStorage.setItem('SWEETOS_all_orders', jsonStr); } catch(e) {}
  if (!silent) {
    window.dispatchEvent(new CustomEvent('orders:updated', { detail: orders }));
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
  console.log('[Supabase Cloud] Loading user data across devices for:', email);

  try {
    const { fetchProfileFromSupabase, fetchOrdersFromSupabase, fetchSiteSettingFromSupabase } = await import('./supabase.js');
    const safeKey = email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');

    const [profile, cloudOrders, cloudCart, cloudNotifs, cloudScratchcards, cloudCoupons] = await Promise.allSettled([
      fetchProfileFromSupabase(email),
      fetchOrdersFromSupabase(email),
      fetchSiteSettingFromSupabase(`sweetos_cart_${safeKey}`),
      fetchSiteSettingFromSupabase(`sweetos_notifications_${safeKey}`),
      fetchSiteSettingFromSupabase(`sweetos_scratchcards_${safeKey}`),
      fetchSiteSettingFromSupabase(`sweetos_coupons_${safeKey}`)
    ]);

    if (profile.status === 'fulfilled' && profile.value) {
      saveStorageItem(`SWEETOS_user_profile_${safeKey}`, profile.value);
      saveStorageItem('SWEETOS_user_profile', profile.value);
    }

    if (cloudOrders.status === 'fulfilled' && Array.isArray(cloudOrders.value) && cloudOrders.value.length > 0) {
      saveAllOrdersToStorage(cloudOrders.value, true);
    }

    if (cloudCart.status === 'fulfilled' && Array.isArray(cloudCart.value)) {
      saveStorageItem(`SWEETOS_cart_${safeKey}`, cloudCart.value);
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: cloudCart.value }));
    }

    if (cloudNotifs.status === 'fulfilled' && Array.isArray(cloudNotifs.value)) {
      saveNotificationsToStorage(cloudNotifs.value, email);
    }

    if (cloudScratchcards.status === 'fulfilled' && Array.isArray(cloudScratchcards.value)) {
      saveStorageItem(`SWEETOS_user_scratchcards_${safeKey}`, cloudScratchcards.value);
    }

    if (cloudCoupons.status === 'fulfilled' && Array.isArray(cloudCoupons.value)) {
      saveStorageItem(`SWEETOS_coupons_${safeKey}`, cloudCoupons.value);
    }

    window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true, email } }));
    window.dispatchEvent(new CustomEvent('profile:updated'));

    console.log('🎉 [Supabase Cloud] User data successfully synced across devices for:', email);
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
        saveCustomerToSupabase(data);
        break;
      case 'cart':
        saveSiteSettingInSupabase(`sweetos_cart_${safeKey}`, data);
        break;
      case 'notifications':
        saveSiteSettingInSupabase(`sweetos_notifications_${safeKey}`, data);
        break;
      case 'scratchcards':
        saveSiteSettingInSupabase(`sweetos_scratchcards_${safeKey}`, data);
        break;
      case 'coupons':
        saveSiteSettingInSupabase(`sweetos_coupons_${safeKey}`, data);
        break;
    }
  } catch (e) {
    console.error('[Supabase Cloud Save Error]:', e);
  }
}




