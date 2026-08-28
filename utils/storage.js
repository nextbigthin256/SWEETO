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
  const userJson = sessionStorage.getItem('SWEETOS_logged_in_user');
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

export function getProfileStorageKey(email = null) {
  let targetEmail = email;
  if (!targetEmail) {
    const userJson = sessionStorage.getItem('SWEETOS_logged_in_user');
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
    const userJson = sessionStorage.getItem('SWEETOS_logged_in_user');
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
  const userJson = sessionStorage.getItem('SWEETOS_logged_in_user');
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
  const currency = sessionStorage.getItem('SWEETOS_currency') || 'CFA';
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
  const profileJson = sessionStorage.getItem(profileKey) || sessionStorage.getItem('SWEETOS_user_profile');
  if (!profileJson) return;
  
  let profile = {};
  try {
    profile = JSON.parse(profileJson);
  } catch(e) {
    return;
  }
  
  const userEmail = profile.email;
  if (!userEmail) return;
  
  fetch('/api/orders')
    .then(res => {
      if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return [];
      return res.json().catch(() => []);
    })
    .then(serverOrders => {
      if (!Array.isArray(serverOrders)) return;
      
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
      
      serverOrders.forEach(order => {
        const isCompleted = order.status === 'Done' || order.status === 'Livré';
        if (order.customerEmail === userEmail && isCompleted) {
          if (!processedDeliveries.includes(order.id)) {
            processedDeliveries.push(order.id);
            
            const currentHour = new Date().getHours();
            let greeting = 'Bonjour';
            if (currentHour >= 12 && currentHour < 18) {
              greeting = 'Bon après-midi';
            } else if (currentHour >= 18) {
              greeting = 'Bonsoir';
            }
            
            const totalCFA = parseFloat(order.total) || 0;
            
            customerNotifs.unshift({
              id: Date.now() + Math.floor(Math.random() * 1000),
              type: 'shipping',
              icon: '✅',
              title: `Commande #${order.id} livrée !`,
              desc: `${greeting} ! Merci infiniment pour votre achat chez SWEETOS. Votre commande #${order.id} a été livrée avec succès.<br>
                <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
                  <button class="download-receipt-btn" data-order-id="${order.id}" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">Reçu 📄</button>
                  ${totalCFA >= 2000 ? `<button class="view-mystery-email-btn" data-order-id="${order.id}" style="background:#ff5630; color:white; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">Mystery Box 🎁</button>` : ''}
                </div>`,
              time: 'Just now',
              unread: true
            });
            
            if (totalCFA >= 2000) {
              try {
                let scratchcards = JSON.parse(sessionStorage.getItem('SWEETOS_user_scratchcards') || '[]');
                if (!scratchcards.some(sc => sc.orderId === order.id)) {
                  scratchcards.push({
                    id: Date.now() + Math.floor(Math.random() * 1000) + 1,
                    orderId: order.id,
                    amount: totalCFA,
                    scratched: false,
                    couponWon: null,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000
                  });
                  sessionStorage.setItem('SWEETOS_user_scratchcards', JSON.stringify(scratchcards));
                }
              } catch(e) {
                console.error('Failed to create scratchcard during sync:', e);
              }
              
              customerNotifs.unshift({
                id: Date.now() + Math.floor(Math.random() * 1000) + 2,
                type: 'email',
                icon: '📧',
                title: `Nouveau Message: Votre Boîte Mystère`,
                desc: `Vous avez reçu un e-mail concernant votre Boîte Mystère de la commande #${order.id}.<br>
                  <div style="margin-top:8px;">
                    <button class="open-email-modal-btn" data-order-id="${order.id}" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">Ouvrir l'E-mail 📩</button>
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
    })
    .catch(err => console.error('Failed to sync completed notifications from server:', err));
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



