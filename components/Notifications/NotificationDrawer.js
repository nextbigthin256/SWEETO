import { getNotificationsStorageKey, getNotificationsFromStorage, saveNotificationsToStorage, getScratchcardsStorageKey, formatTimeAgo, getAllOrdersFromStorage, getStorageItem } from '../../utils/storage.js';
import { loadStyles } from '../../utils/cssLoader.js';
import { notificationDrawerCSS } from './NotificationDrawer.styles.js';


class NotificationDrawer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.notifications = [];
    this.activeFilter = 'all'; // 'all', 'orders', 'promos', 'messages'
    this.liveTimer = null;
    loadStyles(this.shadowRoot, notificationDrawerCSS);
  }

  connectedCallback() {
    this.loadNotifications();
    this.render();
    this.setupEventListeners();
    
    // Live notification update listener (e.g. when admin changes order status)
    this._notifUpdatedHandler = () => {
      this.loadNotifications();
      this.render();
      window.dispatchEvent(new CustomEvent('notifications:badge-sync', { detail: this.notifications.filter(n => n.unread).length }));
    };
    window.addEventListener('notifications:updated', this._notifUpdatedHandler);
    this._storageNotifListener = (e) => {
      if (e.key && e.key.startsWith('SWEETOS_notifications')) {
        this._notifUpdatedHandler();
      }
    };
    window.addEventListener('storage', this._storageNotifListener);

    // Auto-refresh relative timestamps every 30 seconds
    if (!this.liveTimer) {
      this.liveTimer = setInterval(() => {
        this.updateLiveTimestamps();
      }, 30000);
    }
  }

  disconnectedCallback() {
    if (this.liveTimer) {
      clearInterval(this.liveTimer);
      this.liveTimer = null;
    }
    if (this._notifUpdatedHandler) {
      window.removeEventListener('notifications:updated', this._notifUpdatedHandler);
    }
    if (this._storageNotifListener) {
      window.removeEventListener('storage', this._storageNotifListener);
    }
  }

  updateLiveTimestamps() {
    const shadow = this.shadowRoot;
    shadow.querySelectorAll('.notif-time').forEach(el => {
      const ts = el.getAttribute('data-timestamp');
      if (ts) {
        el.textContent = formatTimeAgo(isNaN(Number(ts)) ? ts : Number(ts));
      }
    });
  }

  loadNotifications() {
    this.notifications = getNotificationsFromStorage();

    // Ensure all existing notifications have a numeric createdAt timestamp
    let needsSave = false;
    this.notifications.forEach(n => {
      if (!n.createdAt) {
        n.createdAt = n.timestamp || Date.now();
        needsSave = true;
      }
    });
    if (needsSave) {
      this.saveNotifications();
    }

    this.generateExpiringReminders();
    const totalUnread = this.notifications.filter(n => n.unread).length;
    window.dispatchEvent(new CustomEvent('notifications:badge-sync', { detail: totalUnread }));
  }

  generateExpiringReminders() {
    let scratchcards = [];
    try {
      const scratchKey = getScratchcardsStorageKey();
      const rawScratch = getStorageItem(scratchKey);
      scratchcards = rawScratch ? JSON.parse(rawScratch) : [];
    } catch(e) {}
    
    const now = Date.now();
    let updated = false;
    
    scratchcards.forEach(card => {
      if (!card.scratched && card.expiresAt) {
        const diffMs = card.expiresAt - now;
        const daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
        
        if (daysRemaining > 0 && daysRemaining <= 14) {
          const uniqueId = `reminder-mystery-${card.id}-${daysRemaining}`;
          if (!this.notifications.some(n => n.uniqueKey === uniqueId)) {
            this.notifications.unshift({
              id: Date.now() + Math.floor(Math.random() * 1000),
              uniqueKey: uniqueId,
              type: 'promo',
              icon: '⏰',
              title: `Rappel: Boîte Mystère expire dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}! 🎁`,
              desc: `Votre boîte mystère de la commande #${card.orderId} va bientôt expirer. Grattez-la maintenant pour découvrir votre offre !`,
              createdAt: Date.now(),
              unread: true
            });
            updated = true;
          }
        }
      }
    });

    let coupons = [];
    try {
      const rawCoupons = getStorageItem('SWEETOS_coupons');
      coupons = rawCoupons ? JSON.parse(rawCoupons) : [];
    } catch(e) {}
    
    coupons.forEach(c => {
      const isWonCoupon = c.code.startsWith('LOYAL') || c.code.startsWith('SAVE');
      if (isWonCoupon && c.status === 'active' && c.expiry) {
        const expiryTime = new Date(c.expiry).getTime() + (24 * 60 * 60 * 1000) - 1000;
        const diffMs = expiryTime - now;
        const daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
        
        if (daysRemaining > 0 && daysRemaining <= 7) {
          const uniqueId = `reminder-coupon-${c.code}-${daysRemaining}`;
          if (!this.notifications.some(n => n.uniqueKey === uniqueId)) {
            this.notifications.unshift({
              id: Date.now() + Math.floor(Math.random() * 1000),
              uniqueKey: uniqueId,
              type: 'promo',
              icon: '⏰',
              title: `Rappel Coupon: ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}! 🎟️`,
              desc: `Votre coupon de réduction exclusif ${c.code} (${c.value}% OFF) expire bientôt. Utilisez-le vite à la caisse !`,
              createdAt: Date.now(),
              unread: true
            });
            updated = true;
          }
        }
      }
    });
    
    if (updated) {
      this.saveNotifications();
    }
  }

  saveNotifications() {
    saveNotificationsToStorage(this.notifications);
  }

  render() {
    // 1. Ensure stylesheet link is injected exactly once
    if (!this.shadowRoot.querySelector('link[href*="NotificationDrawer.css"]')) {
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = './components/Notifications/NotificationDrawer.css';
      this.shadowRoot.appendChild(cssLink);
    }

    // 2. Ensure wrapper container exists
    let container = this.shadowRoot.querySelector('.drawer-container-wrapper');
    if (!container) {
      container = document.createElement('div');
      container.className = 'drawer-container-wrapper';
      container.style.height = '100%';
      this.shadowRoot.appendChild(container);
    }

    const totalUnread = this.notifications.filter(n => n.unread).length;

    // Filter notifications based on active pill
    const filteredNotifications = this.notifications.filter(n => {
      if (this.activeFilter === 'orders') return n.type === 'shipping';
      if (this.activeFilter === 'promos') return n.type === 'promo';
      if (this.activeFilter === 'messages') return n.type === 'email' || n.type === 'system';
      return true;
    });

    container.innerHTML = `
      <div class="notifications-wrapper">
        <!-- Swipe handle indicator for mobile -->
        <div class="drawer-swipe-handle"></div>
        
        <!-- Header -->
        <div class="notifications-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">🔔</span>
            <h3 style="margin: 0; font-size: 17px; font-weight: 850; color: var(--text-dark);">
              Centre de Notifications ${totalUnread > 0 ? `(<span class="unread-count">${totalUnread}</span>)` : ''}
            </h3>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${totalUnread > 0 ? `
              <button class="notif-mark-read-btn" id="notifMarkAllReadBtn" title="Tout marquer comme lu" style="background: rgba(0,82,204,0.08); color: var(--primary); border: none; font-size: 11.5px; font-weight: 750; padding: 5px 10px; border-radius: 8px; cursor: pointer;">
                ✓ Tout lire
              </button>
            ` : ''}
            <button class="notif-close" id="notifCloseBtn" title="Fermer le centre">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- Web Push Enable Banner -->
        <div style="background: linear-gradient(135deg, rgba(0,82,204,0.08) 0%, rgba(0,180,216,0.08) 100%); padding: 12px 18px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-size: 20px;">🔔</div>
            <div>
              <div style="font-size: 12.5px; font-weight: 800; color: var(--text-dark);">Push Notifications</div>
              <div style="font-size: 11px; color: var(--text-gray);">Get background alerts when app is closed</div>
            </div>
          </div>
          <button id="togglePushSubBtn" style="background: var(--primary); color: white; border: none; border-radius: 8px; padding: 6px 12px; font-size: 11.5px; font-weight: 800; cursor: pointer; transition: all 0.2s ease;">
            Enable Push
          </button>
        </div>

        <!-- Filter Tabs Row -->
        <div class="notif-filter-pills-row" style="display: flex; gap: 6px; padding: 12px 18px 6px 18px; border-bottom: 1px solid var(--border); overflow-x: auto;">
          <button class="notif-pill ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all" style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 750; border: none; cursor: pointer; transition: all 0.2s; background: ${this.activeFilter === 'all' ? 'var(--primary)' : 'rgba(0,0,0,0.05)'}; color: ${this.activeFilter === 'all' ? 'white' : 'var(--text-gray)'};">
            Tous (${this.notifications.length})
          </button>
          <button class="notif-pill ${this.activeFilter === 'orders' ? 'active' : ''}" data-filter="orders" style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 750; border: none; cursor: pointer; transition: all 0.2s; background: ${this.activeFilter === 'orders' ? 'var(--primary)' : 'rgba(0,0,0,0.05)'}; color: ${this.activeFilter === 'orders' ? 'white' : 'var(--text-gray)'};">
            📦 Commandes
          </button>
          <button class="notif-pill ${this.activeFilter === 'promos' ? 'active' : ''}" data-filter="promos" style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 750; border: none; cursor: pointer; transition: all 0.2s; background: ${this.activeFilter === 'promos' ? 'var(--primary)' : 'rgba(0,0,0,0.05)'}; color: ${this.activeFilter === 'promos' ? 'white' : 'var(--text-gray)'};">
            🎁 Offres & Coupons
          </button>
          <button class="notif-pill ${this.activeFilter === 'messages' ? 'active' : ''}" data-filter="messages" style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 750; border: none; cursor: pointer; transition: all 0.2s; background: ${this.activeFilter === 'messages' ? 'var(--primary)' : 'rgba(0,0,0,0.05)'}; color: ${this.activeFilter === 'messages' ? 'white' : 'var(--text-gray)'};">
            💬 Messages
          </button>
        </div>

        <!-- Scrollable Notifications Listing -->
        <div class="notifications-list" id="notifList">
          ${filteredNotifications.length === 0 ? `
            <div class="empty-state" style="padding: 40px 20px; text-align: center;">
              <div class="empty-bell" style="font-size: 40px; margin-bottom: 12px;">🔔</div>
              <p class="empty-title" style="font-weight: 850; font-size: 15px; color: var(--text-dark); margin: 0 0 6px 0;">Aucune notification</p>
              <p class="empty-desc" style="font-size: 13px; color: var(--text-gray); margin: 0; line-height: 1.5;">Vous êtes parfaitement à jour ! Les alertes de livraison et promotions s'afficheront ici en direct.</p>
            </div>
          ` : filteredNotifications.map(n => {
            const timestamp = n.createdAt || n.timestamp || Date.now();
            const timeAgoText = formatTimeAgo(timestamp);
            return `
              <div class="notif-item ${n.unread ? 'unread-flag' : ''}" data-id="${n.id}">
                <div class="notif-icon-circle ${n.type}">
                  ${n.icon || '🔔'}
                </div>
                <div class="notif-info">
                  <div class="notif-title-row">
                    <h4>${n.title}</h4>
                    <span class="notif-time" data-timestamp="${timestamp}">${timeAgoText}</span>
                  </div>
                  <div class="notif-desc" style="font-size: 12.5px; color: var(--text-gray); line-height: 1.5; margin-top: 4px;">
                    ${n.desc}
                  </div>
                </div>
                <button class="notif-delete-btn" data-id="${n.id}" title="Supprimer l'alerte">×</button>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Footer actions -->
        ${this.notifications.length > 0 ? `
          <div class="notifications-footer" style="padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
            <button class="clear-all-btn" id="notifClearAllBtn" style="color: var(--red); background: none; border: none; font-size: 12.5px; font-weight: 750; cursor: pointer;">
              🗑️ Tout effacer
            </button>
            <span style="font-size: 11px; color: var(--text-gray); font-weight: 600;">Mis à jour en temps réel ⚡</span>
          </div>
        ` : ''}
      </div>
    `;

    this.attachDynamicListeners();
  }

  setupEventListeners() {
    window.addEventListener('notifications:updated', () => {
      this.loadNotifications();
      this.render();
    });

    window.addEventListener('auth:changed', () => {
      this.loadNotifications();
      this.render();
    });

    window.addEventListener('storage', (e) => {
      const key = getNotificationsStorageKey();
      if (e.key === key) {
        this.loadNotifications();
        this.render();
      }
    });
  }

  attachDynamicListeners() {
    const shadow = this.shadowRoot;

    // Close button
    const closeBtn = shadow.getElementById('notifCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('notifications:toggle', { detail: { open: false } }));
      });
    }

    // Toggle Web Push Subscription Button Listener
    const togglePushBtn = shadow.getElementById('togglePushSubBtn');
    if (togglePushBtn) {
      import('../../utils/pushNotifications.js').then(async ({ getPushSubscription, subscribeToWebPush, unsubscribeFromWebPush }) => {
        const sub = await getPushSubscription();
        if (sub) {
          togglePushBtn.textContent = '✓ Subscribed';
          togglePushBtn.style.background = '#10b981';
        }

        togglePushBtn.addEventListener('click', async () => {
          try {
            const currentSub = await getPushSubscription();
            if (currentSub) {
              await unsubscribeFromWebPush();
              togglePushBtn.textContent = 'Enable Push';
              togglePushBtn.style.background = 'var(--primary)';
              window.dispatchEvent(new CustomEvent('toast:show', { detail: '🔕 Web Push unsubscribed.' }));
            } else {
              togglePushBtn.textContent = '⏳ Subscribing...';
              await subscribeToWebPush();
              togglePushBtn.textContent = '✓ Subscribed';
              togglePushBtn.style.background = '#10b981';
              window.dispatchEvent(new CustomEvent('toast:show', { detail: '🔔 Web Push notifications enabled!' }));
            }
          } catch(err) {
            window.dispatchEvent(new CustomEvent('toast:show', { detail: `⚠️ ${err.message || 'Push subscription failed'}` }));
            togglePushBtn.textContent = 'Enable Push';
          }
        });
      }).catch(() => {});
    }

    // Filter pills
    shadow.querySelectorAll('.notif-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.activeFilter = pill.getAttribute('data-filter') || 'all';
        this.render();
      });
    });

    // Mark all read button
    const markAllBtn = shadow.getElementById('notifMarkAllReadBtn');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => {
        this.notifications.forEach(n => n.unread = false);
        this.saveNotifications();
        this.render();
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Toutes les alertes sont marquées comme lues. ✓' }));
        window.dispatchEvent(new CustomEvent('notifications:badge-sync', { detail: 0 }));
      });
    }

    // Clear all button
    const clearBtn = shadow.getElementById('notifClearAllBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.notifications = [];
        this.saveNotifications();
        this.render();
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Toutes les notifications ont été effacées.' }));
        window.dispatchEvent(new CustomEvent('notifications:badge-sync', { detail: 0 }));
      });
    }

    // Delete single notification
    shadow.querySelectorAll('.notif-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute('data-id'));
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.saveNotifications();
        this.render();
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Notification supprimée.' }));
        window.dispatchEvent(new CustomEvent('notifications:badge-sync', { detail: this.notifications.filter(n => n.unread).length }));
      });
    });

    // Click on notification item
    shadow.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.getAttribute('data-id'));
        const target = this.notifications.find(n => n.id === id);
        if (!target) return;

        // 1. Mark as read
        if (target.unread) {
          target.unread = false;
          this.saveNotifications();
          item.classList.remove('unread-flag');
          window.dispatchEvent(new CustomEvent('notifications:badge-sync', { detail: this.notifications.filter(n => n.unread).length }));
        }

        // 2. Close notification drawer
        window.dispatchEvent(new CustomEvent('notifications:toggle', { detail: { open: false } }));

        // 3. Handle page routing / actions
        if (target.type === 'promo') {
          if (target.uniqueKey && target.uniqueKey.startsWith('reminder-')) {
            window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'coupons' } }));
          } else {
            navigator.clipboard.writeText('WELCOME10').then(() => {
              window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Code promo WELCOME10 copié ! 🎟️' }));
            }).catch(() => {});
            window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'home' } }));
          }
        } else if (target.type === 'shipping') {
          window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'orders' } }));
        } else if (target.type === 'system') {
          window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'profile' } }));
        } else if (target.type === 'email') {
          const parts = target.desc.match(/#([a-zA-Z0-9_-]+)/);
          const orderId = parts ? parts[1] : '';
          this.handleOpenEmailModal(orderId);
        }

        this.render();
      });
    });

    // Custom Button Listeners inside notifications
    shadow.querySelectorAll('.download-receipt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const orderId = btn.getAttribute('data-order-id');
        this.downloadReceipt(orderId);
      });
    });

    shadow.querySelectorAll('.view-mystery-email-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('notifications:toggle', { detail: { open: false } }));
        window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'coupons' } }));
      });
    });

    shadow.querySelectorAll('.open-email-modal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const orderId = btn.getAttribute('data-order-id');
        this.handleOpenEmailModal(orderId);
      });
    });
  }

  handleOpenEmailModal(orderId) {
    let orders = getAllOrdersFromStorage();
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Détails de commande introuvables.' }));
      return;
    }
    const currentHour = new Date().getHours();
    let greeting = 'Bonjour';
    if (currentHour >= 12 && currentHour < 18) {
      greeting = 'Bon après-midi';
    } else if (currentHour >= 18) {
      greeting = 'Bonsoir';
    }
    this.openMockEmailModal(order, greeting);
  }

  downloadReceipt(orderId) {
    let orders = getAllOrdersFromStorage();
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Commande introuvable !' }));
      return;
    }
    
    const receiptContent = `
========================================
             REÇU DE COMMANDE
                 SWEETOS 🇨🇮
========================================
ID Commande: ${order.id}
Date: ${order.date}
Client: ${order.customerName}
E-mail: ${order.customerEmail}
Téléphone: ${order.customerPhone}
Lieu de livraison: ${order.customerAddress}

Articles commandés:
${order.products ? order.products.map(p => `- ${p.name} (x${p.quantity}) : ${p.price * p.quantity} CFA`).join('\n') : order.items}

Total: ${order.total} CFA
Mode de paiement: ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'LIVRAISON'}
Statut de livraison: ${order.status}
========================================
Merci infiniment pour votre confiance chez SWEETOS !
   `.trim();

    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reçu-sweetos-${orderId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Reçu téléchargé avec succès ! 📄' }));
  }

  openMockEmailModal(order, greeting) {
    const shadow = this.shadowRoot;
    let modal = shadow.getElementById('mock-email-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mock-email-modal';
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100%';
      modal.style.height = '100%';
      modal.style.backgroundColor = 'rgba(0,0,0,0.6)';
      modal.style.zIndex = '9999';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.backdropFilter = 'blur(6px)';
      shadow.appendChild(modal);
    }
    
    modal.innerHTML = `
      <div style="background: white; border-radius: 24px; width: 90%; max-width: 500px; padding: 35px; box-shadow: 0 20px 50px rgba(0,0,0,0.2); font-family: 'Outfit', sans-serif; position: relative; border: 1.5px solid var(--border); box-sizing: border-box; text-align: center;">
        <button id="close-email-modal" style="position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-gray); font-weight: bold; line-height: 1; transition: color 0.2s;">&times;</button>
        
        <div style="border-bottom: 1.5px solid var(--border); padding-bottom: 20px; margin-bottom: 24px; text-align: left; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
          <div>
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: var(--primary); letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Nouveau Message</span>
            <span style="font-size: 13.5px; color: var(--text-dark); font-weight: 600;">De: <strong>concierge@sweetos.ci</strong></span>
          </div>
          <span style="font-size: 24px;">📧</span>
        </div>
        
        <div style="color: var(--text-dark); display: flex; flex-direction: column; gap: 16px; align-items: center; text-align: left;">
          <h2 style="font-size: 22px; font-weight: 900; margin: 0; color: var(--primary); letter-spacing: -0.5px; text-align: center; width: 100%;">🎁 Votre Boîte Mystère est prête !</h2>
          
          <p style="font-size: 14px; line-height: 1.6; margin: 0; color: var(--text-dark); width: 100%;">
            ${greeting} !<br><br>
            Merci infiniment pour votre commande <strong>#${order.id}</strong> sur <strong>SWEETOS</strong>.<br>
            Votre livraison a été enregistrée avec succès.
          </p>
          
          <div style="font-size: 72px; margin: 15px 0; text-align: center; width: 100%;">🎁</div>
          
          <p style="font-size: 13px; color: var(--text-gray); margin: 0; font-weight: 600; text-align: center; width: 100%;">
            Pour vous remercier de votre fidélité, nous vous offrons une chance de gratter et remporter un coupon de réduction exclusif !
          </p>
          
          <button id="open-scratchcard-btn" style="background: var(--primary); color: white; border: none; padding: 14px 28px; border-radius: 12px; font-size: 14px; font-weight: 850; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,82,204,0.25); width: 100%; display: block; box-sizing: border-box; text-align: center;">
            Gratter ma Boîte Mystère →
          </button>
        </div>
      </div>
    `;
    
    modal.querySelector('#close-email-modal').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.querySelector('#open-scratchcard-btn').addEventListener('click', () => {
      modal.remove();
      window.dispatchEvent(new CustomEvent('notifications:toggle', { detail: { open: false } }));
      window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'coupons' } }));
    });
  }
}

customElements.define('notification-drawer', NotificationDrawer);
export default NotificationDrawer;
