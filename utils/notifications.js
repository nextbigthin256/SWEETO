// Notification Utility Functions for SWEETOS

import { getNotificationsStorageKey } from './storage.js';

/**
 * Add a new notification to the notification center
 * @param {Object} notification - The notification object
 * @param {string} notification.type - Type: 'promo', 'shipping', 'email', 'system', 'order'
 * @param {string} notification.icon - Emoji icon for the notification
 * @param {string} notification.title - Title of the notification
 * @param {string} notification.desc - Description/content (can include HTML)
 * @param {string} [notification.actionUrl] - Optional URL/page to navigate to on click
 * @param {Object} [notification.actionData] - Optional data to pass with action
 * @param {boolean} [notification.unread=true] - Whether notification is unread
 * @param {number} [notification.priority=0] - Priority level (higher = more important)
 */
export function addNotification(notification) {
  const notifKey = getNotificationsStorageKey();
  let notifications = [];
  
  try {
    notifications = JSON.parse(localStorage.getItem(notifKey) || '[]');
  } catch(e) {
    notifications = [];
  }
  
  const newNotification = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    type: notification.type || 'system',
    icon: notification.icon || '🔔',
    title: notification.title || 'Notification',
    desc: notification.desc || '',
    actionUrl: notification.actionUrl || null,
    actionData: notification.actionData || null,
    unread: notification.unread !== undefined ? notification.unread : true,
    priority: notification.priority || 0,
    createdAt: Date.now()
  };
  
  // Add to beginning of array (most recent first)
  notifications.unshift(newNotification);
  
  // Limit to 50 most recent notifications to prevent storage bloat
  if (notifications.length > 50) {
    notifications = notifications.slice(0, 50);
  }
  
  localStorage.setItem(notifKey, JSON.stringify(notifications));
  
  // Dispatch event to update UI
  window.dispatchEvent(new CustomEvent('notifications:updated'));
  
  return newNotification;
}

/**
 * Mark a specific notification as read
 * @param {number} notificationId - ID of the notification to mark as read
 */
export function markNotificationAsRead(notificationId) {
  const notifKey = getNotificationsStorageKey();
  let notifications = [];
  
  try {
    notifications = JSON.parse(localStorage.getItem(notifKey) || '[]');
  } catch(e) {
    return false;
  }
  
  const found = notifications.find(n => n.id === notificationId);
  if (found && found.unread) {
    found.unread = false;
    localStorage.setItem(notifKey, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('notifications:updated'));
    window.dispatchEvent(new CustomEvent('notifications:badge-sync', { 
      detail: notifications.filter(n => n.unread).length 
    }));
    return true;
  }
  
  return false;
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsAsRead() {
  const notifKey = getNotificationsStorageKey();
  let notifications = [];
  
  try {
    notifications = JSON.parse(localStorage.getItem(notifKey) || '[]');
  } catch(e) {
    return;
  }
  
  let changed = false;
  notifications.forEach(n => {
    if (n.unread) {
      n.unread = false;
      changed = true;
    }
  });
  
  if (changed) {
    localStorage.setItem(notifKey, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('notifications:updated'));
    window.dispatchEvent(new CustomEvent('notifications:badge-sync', { detail: 0 }));
  }
}

/**
 * Delete a specific notification
 * @param {number} notificationId - ID of the notification to delete
 */
export function deleteNotification(notificationId) {
  const notifKey = getNotificationsStorageKey();
  let notifications = [];
  
  try {
    notifications = JSON.parse(localStorage.getItem(notifKey) || '[]');
  } catch(e) {
    return false;
  }
  
  const initialLength = notifications.length;
  notifications = notifications.filter(n => n.id !== notificationId);
  
  if (notifications.length < initialLength) {
    localStorage.setItem(notifKey, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('notifications:updated'));
    window.dispatchEvent(new CustomEvent('notifications:badge-sync', { 
      detail: notifications.filter(n => n.unread).length 
    }));
    return true;
  }
  
  return false;
}

/**
 * Clear all notifications
 */
export function clearAllNotifications() {
  const notifKey = getNotificationsStorageKey();
  localStorage.setItem(notifKey, JSON.stringify([]));
  window.dispatchEvent(new CustomEvent('notifications:updated'));
  window.dispatchEvent(new CustomEvent('notifications:badge-sync', { detail: 0 }));
}

/**
 * Get unread notification count
 * @returns {number} Count of unread notifications
 */
export function getUnreadNotificationCount() {
  const notifKey = getNotificationsStorageKey();
  let notifications = [];
  
  try {
    notifications = JSON.parse(localStorage.getItem(notifKey) || '[]');
  } catch(e) {
    return 0;
  }
  
  return notifications.filter(n => n.unread).length;
}

/**
 * Show an order confirmation notification
 * @param {string} orderId - Order ID
 * @param {number} orderTotal - Order total amount
 */
export function showOrderConfirmationNotification(orderId, orderTotal) {
  return addNotification({
    type: 'shipping',
    icon: '📦',
    title: `Commande #${orderId} validée`,
    desc: `Votre commande de ${formatPrice(orderTotal)} a été enregistrée avec succès.`,
    actionUrl: 'orders',
    unread: true,
    priority: 2
  });
}

/**
 * Show a delivery completed notification
 * @param {string} orderId - Order ID
 * @param {number} orderTotal - Order total amount
 * @param {boolean} hasMysteryBox - Whether order qualifies for mystery box
 */
export function showDeliveryCompletedNotification(orderId, orderTotal, hasMysteryBox = false) {
  const currentHour = new Date().getHours();
  let greeting = 'Bonjour';
  if (currentHour >= 12 && currentHour < 18) {
    greeting = 'Bon après-midi';
  } else if (currentHour >= 18) {
    greeting = 'Bonsoir';
  }
  
  let buttonsHtml = `<button class="download-receipt-btn" data-order-id="${orderId}" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">Reçu 📄</button>`;
  
  if (hasMysteryBox) {
    buttonsHtml += `<button class="view-mystery-email-btn" data-order-id="${orderId}" style="background:#ff5630; color:white; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">Mystery Box 🎁</button>`;
  }
  
  return addNotification({
    type: 'shipping',
    icon: '✅',
    title: `Commande #${orderId} livrée !`,
    desc: `${greeting} ! Merci infiniment pour votre achat chez SWEETOS. Votre commande #${orderId} a été livrée avec succès.<br><div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">${buttonsHtml}</div>`,
    actionUrl: 'orders',
    unread: true,
    priority: 2
  });
}

/**
 * Show a promotional notification
 * @param {string} title - Promotion title
 * @param {string} description - Promotion details
 * @param {string} [promoCode] - Optional promo code to copy
 * @param {string} [actionUrl] - Optional page to navigate to
 */
export function showPromoNotification(title, description, promoCode = null, actionUrl = 'home') {
  const notif = {
    type: 'promo',
    icon: '🎁',
    title: title,
    desc: description,
    actionUrl: actionUrl,
    unread: true,
    priority: 1
  };
  
  if (promoCode) {
    notif.promoCode = promoCode;
  }
  
  return addNotification(notif);
}

/**
 * Show a system/admin message notification
 * @param {string} title - Message title
 * @param {string} content - Message content
 * @param {string} [actionUrl] - Optional page to navigate to
 */
export function showSystemNotification(title, content, actionUrl = 'profile') {
  return addNotification({
    type: 'system',
    icon: 'ℹ️',
    title: title,
    desc: content,
    actionUrl: actionUrl,
    unread: true,
    priority: 1
  });
}

/**
 * Show an email/message notification
 * @param {string} title - Email subject/title
 * @param {string} content - Email content
 * @param {string} orderId - Related order ID (if any)
 */
export function showEmailNotification(title, content, orderId = null) {
  let buttonHtml = '';
  if (orderId) {
    buttonHtml = `<div style="margin-top:8px;"><button class="open-email-modal-btn" data-order-id="${orderId}" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">Ouvrir l'E-mail 📩</button></div>`;
  }
  
  return addNotification({
    type: 'email',
    icon: '📧',
    title: title,
    desc: `Vous avez reçu un nouveau message.${buttonHtml}${content ? '<br>' + content : ''}`,
    actionUrl: orderId ? null : 'profile',
    actionData: orderId ? { orderId } : null,
    unread: true,
    priority: 2
  });
}

/**
 * Show a scratch card/mystery box notification
 * @param {string} orderId - Order ID
 * @param {number} amount - Order amount
 */
export function showScratchCardNotification(orderId, amount) {
  return addNotification({
    type: 'promo',
    icon: '🎁',
    title: `Boîte Mystère disponible !`,
    desc: `Votre commande #${orderId} de ${formatPrice(amount)} vous donne droit à une Boîte Mystère. Grattez-la maintenant pour découvrir votre offre !`,
    actionUrl: 'coupons',
    actionData: { orderId },
    unread: true,
    priority: 2
  });
}

/**
 * Show a low stock reminder for expiring scratch cards or coupons
 * @param {string} itemType - 'scratchcard' or 'coupon'
 * @param {string} itemId - ID of the item
 * @param {number} daysRemaining - Days until expiration
 */
export function showExpiringReminderNotification(itemType, itemId, daysRemaining) {
  if (itemType === 'scratchcard') {
    return addNotification({
      type: 'promo',
      icon: '⏰',
      title: `Rappel: Boîte Mystère expire dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}! 🎁`,
      desc: `Votre boîte mystère de la commande #${itemId} va bientôt expirer. Grattez-la maintenant pour découvrir votre offre !`,
      actionUrl: 'coupons',
      actionData: { orderId: itemId },
      unread: true,
      priority: 1,
      uniqueKey: `reminder-mystery-${itemId}-${daysRemaining}`
    });
  } else if (itemType === 'coupon') {
    return addNotification({
      type: 'promo',
      icon: '⏰',
      title: `Rappel Coupon: ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}! 🎟️`,
      desc: `Votre coupon de réduction exclusif ${itemId} va bientôt expirer. Utilisez-le vite à la caisse !`,
      actionUrl: 'coupons',
      unread: true,
      priority: 1,
      uniqueKey: `reminder-coupon-${itemId}-${daysRemaining}`
    });
  }
}

/**
 * Format price for display
 * @param {number} price - Price value
 * @returns {string} Formatted price string
 */
function formatPrice(price) {
  if (price === undefined || price === null) return '0 FCFA';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('fr-FR').format(numPrice) + ' FCFA';
}

/**
 * Initialize notification sync listeners
 * Call this once when app initializes
 */
export function initNotificationSync() {
  // Listen for orders:updated and check for new delivery notifications
  window.addEventListener('orders:updated', () => {
    // This will be handled by syncDeliveredNotifications in storage.js
  });
  
  // Listen for cart changes that might trigger notifications
  window.addEventListener('cart:updated', () => {
    // Future: Cart abandonment reminders after X minutes
  });
}
