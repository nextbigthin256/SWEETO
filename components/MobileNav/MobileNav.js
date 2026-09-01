import { getStorageItem, getCartFromStorage } from '../../utils/storage.js';
import { loadStyles } from '../../utils/cssLoader.js';
import { mobileNavCSS } from './MobileNav.styles.js';

class MobileNav extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    loadStyles(this.shadowRoot, mobileNavCSS);
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.syncActiveTab(getStorageItem('SWEETOS_current_page') || 'home');
    this.syncBadges();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="mobile-nav-bar">
        
        <!-- Tab 1: MY STORE -->
        <a href="#" class="nav-item" data-tab-action="sidebar">
          <div class="active-indicator"></div>
          <div class="icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <rect x="9" y="9" width="6" height="5"></rect>
            </svg>
          </div>
          <span class="label">MY STORE</span>
        </a>

        <!-- Tab 2: PANIER -->
        <a href="#" class="nav-item" data-tab-action="cart">
          <div class="active-indicator"></div>
          <div class="icon-box" style="position: relative;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span id="mobile-cart-badge" class="badge">0</span>
          </div>
          <span class="label">PANIER</span>
        </a>

        <!-- Tab 3: ACCUEIL (Center) -->
        <a href="#" class="nav-item active" data-tab-page="home">
          <div class="active-indicator"></div>
          <div class="icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <span class="label">ACCUEIL</span>
        </a>

        <!-- Tab 4: FAVORIS (Wishlist) -->
        <a href="#" class="nav-item" data-tab-page="wishlist">
          <div class="active-indicator"></div>
          <div class="icon-box" style="position: relative;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span id="mobile-wishlist-badge" class="badge" style="background: #e11d48; display: none;">0</span>
          </div>
          <span class="label">FAVORIS</span>
        </a>

        <!-- Tab 5: PROFIL -->
        <a href="#" class="nav-item" data-tab-page="profile">
          <div class="active-indicator"></div>
          <div class="icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <span class="label">PROFIL</span>
        </a>

      </div>
    `;
  }

  setupEventListeners() {
    const shadow = this.shadowRoot;
    const items = shadow.querySelectorAll('.nav-item');

    items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();

        const page = item.getAttribute('data-tab-page');
        const action = item.getAttribute('data-tab-action');

        if (page) {
          items.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          window.dispatchEvent(new CustomEvent('cart:toggle', { detail: { open: false } }));
          window.dispatchEvent(new CustomEvent('notifications:toggle', { detail: { open: false } }));
          window.dispatchEvent(new CustomEvent('navigation:changed', {
            detail: { page, category: 'All' }
          }));
        }

        if (action === 'cart') {
          window.dispatchEvent(new CustomEvent('cart:toggle', { detail: { open: true } }));
        } else if (action === 'sidebar') {
          window.dispatchEvent(new CustomEvent('sidebar:mobile-toggle'));
        }
      });
    });

    // Listen to page changes from other sources to sync active class
    window.addEventListener('navigation:changed', (e) => {
      this.syncActiveTab(e.detail.page);
      this.syncBadges();
    });

    // Sync cart badge quantity
    window.addEventListener('cart:updated', (e) => {
      this.syncBadges();
    });

    // Sync wishlist badge
    window.addEventListener('wishlist:updated', (e) => {
      this.syncBadges();
    });

    // Listen for auth changes to reload badges
    window.addEventListener('auth:changed', () => {
      this.syncBadges();
    });

    // Listen for cross-tab storage changes
    window.addEventListener('storage', (e) => {
      if (e.key && (e.key.includes('SWEETOS_cart') || e.key.includes('SWEETOS_wishlist') || e.key === 'SWEETOS_current_page')) {
        this.syncBadges();
        this.syncActiveTab(getStorageItem('SWEETOS_current_page') || 'home');
      }
    });
  }

  syncBadges() {
    const shadow = this.shadowRoot;

    // 1. Cart badge
    try {
      const cart = getCartFromStorage();
      const count = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);
      const cartBadge = shadow.getElementById('mobile-cart-badge');
      if (cartBadge) {
        cartBadge.textContent = count;
        cartBadge.style.display = count > 0 ? 'flex' : 'none';
      }
    } catch(e) {}

    // 2. Wishlist badge
    try {
      const wishlistSaved = getStorageItem('SWEETOS_wishlist');
      const wishlist = wishlistSaved ? JSON.parse(wishlistSaved) : [];
      const wishBadge = shadow.getElementById('mobile-wishlist-badge');
      if (wishBadge) {
        wishBadge.textContent = wishlist.length;
        wishBadge.style.display = wishlist.length > 0 ? 'flex' : 'none';
      }
    } catch(e) {}
  }

  syncActiveTab(pageName) {
    const activePage = pageName || 'home';
    const shadow = this.shadowRoot;
    const items = shadow.querySelectorAll('.nav-item');

    items.forEach(item => {
      const itemPage = item.getAttribute('data-tab-page');
      if (itemPage === activePage) {
        item.classList.add('active');
      } else if (itemPage) {
        item.classList.remove('active');
      }
    });
  }
}

customElements.define('app-mobile-nav', MobileNav);
export default MobileNav;
