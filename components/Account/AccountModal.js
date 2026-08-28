import { getProfileStorageKey, formatPrice, getAllOrdersFromStorage } from '../../utils/storage.js';


class AccountModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isOpen = false;
    this.user = {
      name: "Guest User",
      email: "guest@SWEETOS.com",
      phone: "N/A",
      memberSince: "N/A",
      address: "N/A",
      avatar: "G"
    };
    this.orders = [];
  }

  connectedCallback() {
    this.loadUserData();
    this.render();
    this.setupEventListeners();
  }

  loadUserData() {
    const loggedIn = sessionStorage.getItem('SWEETOS_logged_in_user');
    if (loggedIn) {
      try {
        const session = JSON.parse(loggedIn);
        const email = (session.email || '').toLowerCase();
        const profileKey = getProfileStorageKey(email);
        let profile = sessionStorage.getItem(profileKey);
        
        if (!profile) {
          profile = sessionStorage.getItem('SWEETOS_user_profile');
        }
        
        const parsed = profile ? JSON.parse(profile) : null;
        let ordersList = parsed?.orders || [];

        // Also merge any matching orders from global SWEETOS_all_orders
        try {
          const globalOrders = getAllOrdersFromStorage();
          const userGlobalOrders = globalOrders.filter(o => o.customerEmail && o.customerEmail.toLowerCase() === email);
          userGlobalOrders.forEach(go => {
            if (!ordersList.some(o => o.id === go.id)) {
              ordersList.unshift(go);
            }
          });
        } catch(e) {}

        this.user = {
          name: parsed ? `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim() : (session.name || 'SWEETOS Member'),
          email: email,
          phone: parsed?.phone || "+225 05 00 61 99 23",
          memberSince: "October 2025",
          address: parsed?.address || "Ivory Coast",
          avatar: (parsed && parsed.firstName && parsed.lastName) ? `${parsed.firstName.charAt(0).toUpperCase()}${parsed.lastName.charAt(0).toUpperCase()}` : 'US'
        };
        this.orders = ordersList;

        // Async sync from Supabase Cloud
        import('../../utils/supabase.js').then(({ fetchProfileFromSupabase }) => {
          fetchProfileFromSupabase(email);
        }).catch(() => {});

        return;
      } catch (e) {
        console.error(e);
      }
    }
    
    // Default fallback if not logged in
    this.user = {
      name: "Guest User",
      email: "guest@SWEETOS.com",
      phone: "N/A",
      memberSince: "N/A",
      address: "N/A",
      avatar: "G"
    };
    this.orders = [];
  }

  render() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="./components/Account/AccountModal.css">
      <div class="modal-overlay ${this.isOpen ? 'open' : ''}" id="overlay">
        <div class="modal-container glass-panel">
          <button class="close-btn" id="close-btn" aria-label="Close Profile">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          <div class="profile-layout">
            <!-- Left Panel: User Card -->
            <div class="user-card-panel">
              <div class="avatar-large">
                <span class="avatar-letters" style="color: #0052cc; font-size: 20px; font-weight: 800;">${this.user.avatar}</span>
              </div>
              <h3 class="user-fullname">${this.user.name}</h3>
              <p class="user-membership">Premium VIP Member</p>
              
              <div class="user-meta-details">
                <div class="meta-row">
                  <span class="label">Email</span>
                  <span class="value">${this.user.email}</span>
                </div>
                <div class="meta-row">
                  <span class="label">Phone</span>
                  <span class="value">${this.user.phone}</span>
                </div>
                <div class="meta-row">
                  <span class="label">Address</span>
                  <span class="value">${this.user.address}</span>
                </div>
              </div>
              
              <button class="logout-btn" id="logout-btn">Log Out</button>
            </div>
            
            <!-- Right Panel: Order History -->
            <div class="orders-panel">
              <h3 class="panel-title">Order History</h3>
              <div class="orders-list">
                ${this.orders.length === 0 ? `
                  <p class="no-orders">You haven't placed any orders yet.</p>
                ` : this.orders.map(order => {
                  const statusClass = (() => {
                    const s = (order.status || '').toLowerCase();
                    if (s === 'pending' || s === 'placed') return 'pending';
                    if (s === 'confirm' || s === 'confirmé' || s === 'en cours' || s === 'processing') return 'processing';
                    if (s === 'shipping' || s === 'shipped') return 'shipping';
                    if (s === 'done' || s === 'livré' || s === 'delivered') return 'delivered';
                    if (s === 'cancelled' || s === 'refusé') return 'cancelled';
                    return 'pending';
                  })();
                  const itemsLabel = order.items || (order.products || []).map(p => `${p.name} (x${p.quantity || 1})`).join(', ') || 'Commande SWEETOS';
                  return `
                    <div class="order-item glass-panel">
                      <div class="order-header">
                        <span class="order-id">${order.id}</span>
                        <span class="order-status ${statusClass}">${order.status}</span>
                      </div>
                      <div class="order-details-row">
                        <span class="order-product">${itemsLabel}</span>
                        <span class="order-price">${formatPrice(Number(order.total))}</span>
                      </div>
                      <div class="order-date">${order.date || 'Récemment'}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachDynamicListeners();
  }

  setupEventListeners() {
    window.addEventListener('account:toggle', () => {
      const loggedIn = sessionStorage.getItem('SWEETOS_logged_in_user');
      if (!loggedIn) {
        window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'auth' } }));
        return;
      }
      this.isOpen = !this.isOpen;
      this.loadUserData();
      this.render();
      this.updateState();
    });

    const refreshData = () => {
      this.loadUserData();
      if (this.isOpen) {
        this.render();
      }
    };

    window.addEventListener('orders:updated', refreshData);
    window.addEventListener('profile:updated', refreshData);
    window.addEventListener('auth:changed', refreshData);
    window.addEventListener('supabase:ready', refreshData);
  }

  attachDynamicListeners() {
    const shadow = this.shadowRoot;
    
    // Close button
    const closeBtn = shadow.getElementById('close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.isOpen = false;
        this.updateState();
      });
    }

    // Overlay click close
    const overlay = shadow.getElementById('overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.isOpen = false;
          this.updateState();
        }
      });
    }

    // Logout click trigger
    const logoutBtn = shadow.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        // Clear active session
        sessionStorage.removeItem('SWEETOS_logged_in_user');
        sessionStorage.removeItem('SWEETOS_user_profile');
        sessionStorage.clear();
        
        window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: false } }));
        window.dispatchEvent(new CustomEvent('notifications:updated'));
        window.dispatchEvent(new CustomEvent('notifications:badge-sync', { detail: 0 }));
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Logged out successfully.' }));
        
        this.isOpen = false;
        this.updateState();
      });
    }
  }

  updateState() {
    const overlay = this.shadowRoot.getElementById('overlay');
    if (overlay) {
      if (this.isOpen) {
        overlay.classList.add('open');
      } else {
        overlay.classList.remove('open');
      }
    }
  }
}

customElements.define('account-modal', AccountModal);
export default AccountModal;
