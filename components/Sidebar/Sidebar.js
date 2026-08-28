import { getScratchcardsStorageKey, getAllOrdersFromStorage } from '../../utils/storage.js';


class Sidebar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.updateAuthLink();
    this.syncActivePage();
    this.syncBadges();
    
    window.addEventListener('auth:changed', () => {
      this.updateAuthLink();
      this.syncBadges();
    });

    window.addEventListener('wishlist:updated', () => {
      this.syncBadges();
    });

    window.addEventListener('orders:updated', () => {
      this.syncBadges();
    });

    window.addEventListener('notifications:updated', () => {
      this.syncBadges();
    });

    window.addEventListener('storage', () => {
      this.syncBadges();
    });
  }

  syncActivePage() {
    const activePage = sessionStorage.getItem('SWEETOS_current_page') || 'home';
    const items = this.shadowRoot.querySelectorAll('.sidebar-item');
    items.forEach(item => {
      const page = item.getAttribute('data-page');
      const action = item.getAttribute('data-action');
      if (page === activePage || (action === 'wishlist' && activePage === 'wishlist')) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  syncBadges() {
    const shadow = this.shadowRoot;

    // 1. Real Customer Orders badge (Shows real in-transit / placed orders or total, or nothing if 0)
    const ordersBadge = shadow.getElementById('sidebar-orders-badge');
    if (ordersBadge) {
      const loggedIn = sessionStorage.getItem('SWEETOS_logged_in_user');
      let userOrders = [];
      if (loggedIn) {
        try {
          const userEmail = JSON.parse(loggedIn).email;
          const allOrders = getAllOrdersFromStorage();
          userOrders = allOrders.filter(o => o.customerEmail === userEmail && (o.status || '').toLowerCase() !== 'deleted');
        } catch(e) {}
      }

      if (userOrders.length > 0) {
        const activeOrders = userOrders.filter(o => {
          const s = (o.status || '').toLowerCase();
          return s !== 'livré' && s !== 'delivered' && s !== 'done' && s !== 'cancelled';
        });

        if (activeOrders.length > 0) {
          ordersBadge.innerHTML = `🚚 ${activeOrders.length}`;
          ordersBadge.className = 'sidebar-badge orders-badge in-transit';
          ordersBadge.title = `${activeOrders.length} commande(s) active(s) en cours de livraison`;
        } else {
          ordersBadge.innerHTML = `📦 ${userOrders.length}`;
          ordersBadge.className = 'sidebar-badge orders-badge';
          ordersBadge.title = `${userOrders.length} commande(s) passée(s)`;
        }
        ordersBadge.style.display = 'inline-flex';
      } else {
        ordersBadge.style.display = 'none';
      }
    }

    // 2. Real Customer Wishlist badge (Shows count if > 0, else completely hidden)
    const wishBadge = shadow.getElementById('sidebar-wishlist-badge');
    if (wishBadge) {
      let wishList = [];
      try {
        wishList = JSON.parse(sessionStorage.getItem('SWEETOS_wishlist') || '[]');
      } catch(e) {}
      
      if (wishList.length > 0) {
        wishBadge.innerHTML = `❤️ ${wishList.length}`;
        wishBadge.style.display = 'inline-flex';
        wishBadge.title = `${wishList.length} article(s) dans vos favoris`;
      } else {
        wishBadge.style.display = 'none';
      }
    }

    // 3. Real Customer Coupons badge (Unscratched Mystery Cards or Won Active Coupons ONLY!)
    const couponBadge = shadow.getElementById('sidebar-coupons-badge');
    if (couponBadge) {
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];

      // A. Real Unscratched Mystery Scratchcards owned by user
      let unscratchedCount = 0;
      const loggedInStr = sessionStorage.getItem('SWEETOS_logged_in_user');
      if (loggedInStr) {
        try {
          const scratchKey = getScratchcardsStorageKey();
          const scratchcards = JSON.parse(sessionStorage.getItem(scratchKey) || '[]');
          unscratchedCount = scratchcards.filter(sc => !sc.scratched && (!sc.expiresAt || sc.expiresAt > now)).length;
        } catch(e) {}
      }

      // B. Real Active Won Coupons owned by user (e.g. LOYAL or SAVE codes)
      let wonCouponsCount = 0;
      try {
        const coupons = JSON.parse(sessionStorage.getItem('SWEETOS_coupons') || '[]');
        wonCouponsCount = coupons.filter(c => 
          c.status === 'active' && 
          (c.code.startsWith('LOYAL') || c.code.startsWith('SAVE')) &&
          (!c.expiry || c.expiry >= today)
        ).length;
      } catch(e) {}

      if (unscratchedCount > 0) {
        couponBadge.innerHTML = `🎁 ${unscratchedCount} à gratter`;
        couponBadge.className = 'sidebar-badge coupon-badge in-transit';
        couponBadge.style.display = 'inline-flex';
        couponBadge.title = `${unscratchedCount} boîte(s) mystère prête(s) à être grattée(s) !`;
      } else if (wonCouponsCount > 0) {
        couponBadge.innerHTML = `🎟️ ${wonCouponsCount}`;
        couponBadge.className = 'sidebar-badge coupon-badge';
        couponBadge.style.display = 'inline-flex';
        couponBadge.title = `${wonCouponsCount} coupon(s) de réduction actif(s)`;
      } else {
        // Nothing active or unscratched -> completely hide!
        couponBadge.style.display = 'none';
      }
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="./components/Sidebar/Sidebar.css">
      <aside class="sidebar-wrapper" id="sidebarWrapper">
        <button class="sidebar-collapse-toggle" id="sidebarToggleBtn" title="Collapse Sidebar">
          <span class="toggle-text">Collapse Menu</span>
          <svg class="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <nav class="sidebar-nav">
          <a class="sidebar-item active" href="#" data-page="home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Home</span>
          </a>
          <a class="sidebar-item" href="#" data-page="catalog" data-category="All">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Categories</span>
          </a>
          <a class="sidebar-item" href="#" data-page="deals" data-category="All">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            <span>Deals</span>
            <span class="sidebar-badge hot-badge">🔥 HOT</span>
          </a>
          <a class="sidebar-item" href="#" data-page="new-arrivals">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            <span>New Arrivals</span>
          </a>
          <a class="sidebar-item" href="#" data-page="best-sellers">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
            <span>Best Sellers</span>
          </a>
          <a class="sidebar-item" href="#" data-page="brands">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
              <line x1="12" y1="22" x2="12" y2="15.5"></line>
              <polyline points="22 8.5 12 15.5 2 8.5"></polyline>
              <polyline points="2 15.5 12 8.5 22 15.5"></polyline>
              <line x1="12" y1="2" x2="12" y2="8.5"></line>
            </svg>
            <span>Brands</span>
          </a>
          <a class="sidebar-item" href="#" data-page="collections">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <span>Collections</span>
          </a>
          
          <div class="sidebar-divider"></div>
          
          <a class="sidebar-item" href="#" data-page="orders">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>My Orders</span>
            <span class="sidebar-badge orders-badge" id="sidebar-orders-badge" style="display: none;"></span>
          </a>
          <a class="sidebar-item" href="#" data-action="wishlist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>Wishlist</span>
            <span class="sidebar-badge wishlist-badge" id="sidebar-wishlist-badge" style="display: none;"></span>
          </a>
          <a class="sidebar-item" href="#" data-page="coupons">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            <span>Coupons</span>
            <span class="sidebar-badge coupon-badge" id="sidebar-coupons-badge" style="display: none;"></span>
          </a>
          <a class="sidebar-item" href="#" data-page="about-us">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>About Us</span>
          </a>
          <a class="sidebar-item" href="#" data-page="profile" id="sidebar-account-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span id="sidebar-account-label">Account Settings</span>
          </a>
          <a class="sidebar-item" href="./admin.html" target="_blank" data-action="link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <line x1="9" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="15" x2="21" y2="15"></line>
            </svg>
            <span>Admin Panel</span>
          </a>
        </nav>

        <!-- Promo Banner inside sidebar -->
        <div class="sidebar-promo" id="sidebar-promo">
          <div class="sidebar-promo-label">Special Offer</div>
          <h3>Summer Sale</h3>
          <p>Up to 50% Off</p>
          <button class="sidebar-promo-btn">Shop Now</button>
          <img src="./assets/desk_mat.jpg" alt="Summer Sale Products" loading="lazy">
        </div>

        <!-- Sidebar footer help and themes -->
        <div class="sidebar-footer">
          <div class="sidebar-footer-item" id="help-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div>
              Need Help?<br>
              <small style="color:#9CA3AF;font-size:11px">24/7 Support Center</small>
            </div>
          </div>
          <div class="sidebar-footer-item" id="theme-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <span>Light Mode</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-left:auto">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      </aside>
    `;
  }

  setupEventListeners() {
    const shadow = this.shadowRoot;
    const items = shadow.querySelectorAll('.sidebar-item');
    const toggleBtn = shadow.getElementById('sidebarToggleBtn');
    const wrapper = shadow.getElementById('sidebarWrapper');
    if (toggleBtn && wrapper) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCollapsed = wrapper.classList.toggle('collapsed');
        toggleBtn.title = isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar';
        
        window.dispatchEvent(new CustomEvent('sidebar:toggle', {
          detail: { collapsed: isCollapsed }
        }));
      });
    }

    items.forEach(item => {
      item.addEventListener('click', (e) => {
        const action = item.getAttribute('data-action');
        if (action === 'link') return; // Allow natural link navigation (e.g. target="_blank")
        
        e.preventDefault();
        
        const page = item.getAttribute('data-page');
        const category = item.getAttribute('data-category');
        const msg = item.getAttribute('data-msg');

        if (page) {
          items.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          window.dispatchEvent(new CustomEvent('navigation:changed', {
            detail: { page, category }
          }));
        }

        if (action === 'wishlist') {
          items.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          window.dispatchEvent(new CustomEvent('navigation:changed', {
            detail: { page: 'wishlist' }
          }));
        } else if (action === 'account') {
          window.dispatchEvent(new CustomEvent('account:toggle'));
        } else if (action === 'toast' && msg) {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: msg }));
        }
      });
    });

    // Sidebar promo banner click
    shadow.getElementById('sidebar-promo').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigation:changed', {
        detail: { page: 'deals', category: 'All' }
      }));
    });

    // Theme toggler click
    shadow.getElementById('theme-toggle').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'SWEETOS is optimized for clean White & Blue light mode.' }));
    });

    // Help button click
    shadow.getElementById('help-btn').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Connecting to SWEETOS support agent...' }));
    });

    // Sync active state from other pages
    window.addEventListener('navigation:changed', (e) => {
      const page = e.detail.page;
      items.forEach(item => {
        const itemPage = item.getAttribute('data-page');
        if (itemPage === page) {
          item.classList.add('active');
        } else if (itemPage) {
          item.classList.remove('active');
        }
      });
      this.syncBadges();
    });
  }

  updateAuthLink() {
    const label = this.shadowRoot.getElementById('sidebar-account-label');
    const link = this.shadowRoot.getElementById('sidebar-account-link');
    if (!label || !link) return;

    const isLoggedIn = sessionStorage.getItem('SWEETOS_logged_in_user') !== null;
    if (isLoggedIn) {
      label.textContent = "Account Settings";
      link.setAttribute('data-page', 'profile');
    } else {
      label.textContent = "Sign In / Join";
      link.setAttribute('data-page', 'auth');
    }
  }
}

customElements.define('app-sidebar', Sidebar);
export default Sidebar;
