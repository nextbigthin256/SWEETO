import { getCartStorageKey, getScratchcardsStorageKey, formatPrice, getStorageItem, saveStorageItem } from '../../utils/storage.js';

class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.cart = [];
  }

  connectedCallback() {
    this.loadCartFromStorage();
    this.render();
    this.setupEventListeners();
  }

  loadCartFromStorage() {
    const key = getCartStorageKey();
    const saved = getStorageItem(key);
    if (saved) {
      try {
        this.cart = typeof saved === 'string' ? JSON.parse(saved) : saved;
      } catch (e) {
        this.cart = [];
      }
    } else {
      this.cart = [];
    }
  }

  saveCartToStorage() {
    const key = getCartStorageKey();
    saveStorageItem(key, this.cart);
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: this.cart }));
  }

  render() {
    // 1. Ensure stylesheet links are injected exactly once
    if (!this.shadowRoot.querySelector('link[href*="CartDrawer.css"]')) {
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap';
      this.shadowRoot.appendChild(fontLink);

      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = './components/Cart/CartDrawer.css';
      this.shadowRoot.appendChild(cssLink);
    }

    // 2. Ensure internal wrapper container exists
    let container = this.shadowRoot.querySelector('.drawer-container-wrapper');
    if (!container) {
      container = document.createElement('div');
      container.className = 'drawer-container-wrapper';
      container.style.height = '100%';
      this.shadowRoot.appendChild(container);
    }

    const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Free delivery calculation (25 000 FCFA threshold)
    const freeShippingThreshold = 25000;
    const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
    const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

    const total = subtotal;

    container.innerHTML = `
      <div class="cart-wrapper">
        <!-- Swipe handle indicator for mobile -->
        <div class="drawer-swipe-handle"></div>
        
        <!-- Header -->
        <div class="cart-header">
          <div class="cart-header-left">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="cart-bag-icon">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <h2>Votre Panier</h2>
            <span class="cart-badge-count-pill">${totalItems} article${totalItems > 1 ? 's' : ''}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${this.cart.length > 0 ? `
              <button class="cart-clear-btn" id="cartClearAllBtn" title="Vider le panier" style="background: none; border: none; font-size: 11.5px; font-weight: 750; color: var(--red); cursor: pointer; padding: 4px 8px; border-radius: 6px;">
                Vider
              </button>
            ` : ''}
            <button class="continue-shopping-top-btn" id="continueShoppingTopBtn">Continuer les achats</button>
          </div>
        </div>

        <!-- Free Delivery Progress Bar -->
        ${this.cart.length > 0 ? `
          <div class="free-shipping-progress-banner" style="background: #f0f7ff; border-bottom: 1px solid var(--border); padding: 12px 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 12px; font-weight: 750;">
              <span style="color: var(--text-dark);">
                ${subtotal >= freeShippingThreshold 
                  ? '🎉 <strong>Félicitations !</strong> Vous bénéficiez de la <strong>Livraison Gratuite</strong> !' 
                  : `Plus que <strong style="color: var(--primary);">${formatPrice(amountToFreeShipping)}</strong> pour la <strong>Livraison Gratuite</strong> !`}
              </span>
              <span style="color: var(--primary); font-weight: 800;">${progressPercent}%</span>
            </div>
            <div style="width: 100%; height: 6px; background: rgba(0,82,204,0.12); border-radius: 6px; overflow: hidden;">
              <div style="width: ${progressPercent}%; height: 100%; background: linear-gradient(90deg, #0052cc, #00b4d8); border-radius: 6px; transition: width 0.4s ease;"></div>
            </div>
          </div>
        ` : ''}

        <!-- Cart Items Area -->
        <div class="cart-items-area custom-scroll">
          ${this.cart.length === 0 ? `
            <div class="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="empty-icon">
                <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <p class="empty-title">Votre panier est vide</p>
              <p class="empty-desc">Ajoutez des articles de notre catalogue pour commencer vos achats !</p>
            </div>
          ` : this.cart.map((item, index) => {
            const firstWord = item.name.split(' ')[0] || 'SWEETOS';
            const originalPrice = item.price * 1.25;
            return `
              <div class="cart-item-card animate-in" data-index="${index}">
                <div class="cart-item-img-wrapper">
                  <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-item-info">
                  <div class="cart-item-text-details">
                    <h3 class="cart-item-title">${item.name}</h3>
                    <p class="cart-item-brand">${firstWord}</p>
                    <div class="cart-item-price-badges">
                      <span class="cart-item-price-current">${formatPrice(item.price)}</span>
                      <span class="cart-item-price-original">${formatPrice(originalPrice)}</span>
                      <span class="cart-item-discount-badge">-20%</span>
                    </div>
                  </div>
                  <div class="cart-item-footer-row">
                    <div class="qty-container">
                      <button class="dec-btn" data-index="${index}">−</button>
                      <span class="qty-val">${item.quantity}</span>
                      <button class="inc-btn" data-index="${index}">+</button>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <button class="cart-item-wishlist" data-index="${index}" title="Déplacer dans les favoris" style="background: none; border: none; font-size: 16px; cursor: pointer; padding: 4px;">
                        ❤️
                      </button>
                      <button class="cart-item-delete" data-index="${index}" title="Retirer l'article">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Footer / Checkout Section -->
        <div class="cart-footer-section">
          <div class="totals-summary-header">Récapitulatif de la commande</div>
          
          <!-- Totals -->
          <div class="totals-summary">
            <div class="totals-row">
              <span>Sous-total</span>
              <span class="val-white">${formatPrice(subtotal)}</span>
            </div>
            <div class="totals-row">
              <span>Livraison (Côte d'Ivoire)</span>
              <span class="val-cyan">${subtotal >= freeShippingThreshold ? 'Gratuite ✓' : '2 000 FCFA'}</span>
            </div>


          <!-- Checkout Button -->
          <button id="checkoutBtn" class="checkout-submit-btn" ${this.cart.length === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            Procéder au paiement (${formatPrice(total + (subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 2000))}) →
          </button>

          <!-- Continue Shopping Button Bottom -->
          <button id="continueShoppingBottomBtn" class="continue-shopping-bottom-btn">
            Continuer les achats
          </button>
        </div>
      </div>
    `;

    this.attachDynamicListeners();
  }

  setupEventListeners() {
    window.addEventListener('cart:add', (e) => {
      const product = e.detail;
      const existing = this.cart.find(item => item.id === product.id);
      if (existing) {
        existing.quantity++;
      } else {
        this.cart.push({ ...product, quantity: 1 });
      }
      this.saveCartToStorage();
      this.render();
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Article "${product.name}" ajouté au panier ! 🛒` }));
    });

    window.addEventListener('auth:changed', () => {
      this.loadCartFromStorage();
      this.render();
    });
  }

  attachDynamicListeners() {
    const shadow = this.shadowRoot;

    const closeTriggers = [
      shadow.getElementById('continueShoppingTopBtn'),
      shadow.getElementById('continueShoppingBottomBtn')
    ];
    closeTriggers.forEach(el => {
      if (el) {
        el.addEventListener('click', () => {
          window.dispatchEvent(new CustomEvent('cart:toggle', { detail: { open: false } }));
        });
      }
    });

    // Clear all items button
    const clearAllBtn = shadow.getElementById('cartClearAllBtn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        this.cart = [];
        this.saveCartToStorage();
        this.render();
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Panier vidé.' }));
      });
    }

    // Increment item quantity
    shadow.querySelectorAll('.inc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        this.cart[idx].quantity++;
        this.saveCartToStorage();
        this.render();
      });
    });

    // Decrement item quantity
    shadow.querySelectorAll('.dec-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        if (this.cart[idx].quantity > 1) {
          this.cart[idx].quantity--;
        } else {
          this.cart.splice(idx, 1);
        }
        this.saveCartToStorage();
        this.render();
      });
    });

    // Delete item
    shadow.querySelectorAll('.cart-item-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        const name = this.cart[idx]?.name || 'Article';
        this.cart.splice(idx, 1);
        this.saveCartToStorage();
        this.render();
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `"${name}" retiré du panier.` }));
      });
    });

    // Move to wishlist
    shadow.querySelectorAll('.cart-item-wishlist').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        const item = this.cart[idx];
        if (item) {
          let wishlist = [];
          try {
            wishlist = JSON.parse(localStorage.getItem('SWEETOS_wishlist') || '[]');
          } catch(e) {}
          if (!wishlist.some(w => w.id === item.id)) {
            wishlist.push(item);
            localStorage.setItem('SWEETOS_wishlist', JSON.stringify(wishlist));
            window.dispatchEvent(new CustomEvent('wishlist:updated', { detail: wishlist }));
          }
          this.cart.splice(idx, 1);
          this.saveCartToStorage();
          this.render();
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `"${item.name}" déplacé dans vos favoris ❤️` }));
        }
      });
    });



    // Checkout button
    const checkoutBtn = shadow.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (this.cart.length === 0) {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Votre panier est vide !' }));
          return;
        }
        window.dispatchEvent(new CustomEvent('checkout:start'));
      });
    }

  }
}

customElements.define('cart-drawer', CartDrawer);
export default CartDrawer;
