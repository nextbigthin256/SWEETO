import products from '../../data/products.js';
import { getCartStorageKey, getScratchcardsStorageKey, formatPrice, getStorageItem, saveStorageItem } from '../../utils/storage.js';
import { getBadgeRewardCoupon } from '../../utils/badges.js';

class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.cart = [];
    this.products = products;
  }

  connectedCallback() {
    this.loadCartFromStorage();
    this.render();
    this.setupEventListeners();
  }

  loadCartFromStorage() {
    const key = getCartStorageKey();
    const saved = sessionStorage.getItem(key);
    if (saved) {
      try {
        this.cart = JSON.parse(saved);
      } catch (e) {
        this.cart = [];
      }
    } else {
      this.cart = [];
    }
  }

  saveCartToStorage() {
    const key = getCartStorageKey();
    sessionStorage.setItem(key, JSON.stringify(this.cart));
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

    let discount = 0;
    let appliedCoupon = null;
    try {
      const savedCoupon = sessionStorage.getItem('SWEETOS_applied_coupon');
      if (savedCoupon) {
        appliedCoupon = JSON.parse(savedCoupon);
        if (appliedCoupon.minOrder && subtotal < appliedCoupon.minOrder) {
          sessionStorage.removeItem('SWEETOS_applied_coupon');
          appliedCoupon = null;
        } else {
          if (appliedCoupon.type === 'percentage') {
            discount = subtotal * (appliedCoupon.value / 100);
          } else {
            discount = appliedCoupon.value;
          }
        }
      }
    } catch(e) {}

    const total = Math.max(0, subtotal - discount);

    // Only load customer's personally earned/unlocked coupons if SCRATCHED (no unscratched coupons, no generic coupons)
    let activeCoupons = [];
    try {
      const loggedUser = JSON.parse(getStorageItem('SWEETOS_logged_in_user') || '{}');
      const userProfile = JSON.parse(getStorageItem('SWEETOS_user_profile') || '{}');
      const curEmail = (loggedUser.email || userProfile.email || '').toLowerCase();
      if (curEmail) {
        // 1. Scratched Badge Rewards
        const badgeReward = getBadgeRewardCoupon(curEmail);
        if (badgeReward && badgeReward.scratched === true && badgeReward.remainingUses > 0) {
          activeCoupons.push({
            code: badgeReward.code,
            type: 'percentage',
            value: 5,
            badgeCoupon: true,
            totalUses: badgeReward.totalUses,
            remainingUses: badgeReward.remainingUses,
            status: 'active'
          });
        }

        // 2. Scratched Mystery Box Level Coupons
        const scratchKey = getScratchcardsStorageKey();
        const scratchcards = JSON.parse(sessionStorage.getItem(scratchKey) || '[]');
        scratchcards.forEach(sc => {
          if (sc.email && sc.email.toLowerCase() === curEmail && sc.scratched === true && sc.couponWon && sc.couponWon !== 'lost') {
            const cw = sc.couponWon;
            if (!activeCoupons.some(c => c.code === cw.code)) {
              activeCoupons.push({
                code: cw.code,
                type: cw.type || 'percentage',
                value: cw.value || 5,
                minOrder: cw.minOrder || 0,
                badgeCoupon: Boolean(cw.badgeCoupon),
                status: 'active',
                expiry: cw.expiry || null
              });
            }
          }
        });
      }
    } catch(e) {}

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
            ${discount > 0 ? `
              <div class="totals-row discount-row">
                <span>Réduction Coupon</span>
                <span class="val-magenta">-${formatPrice(discount)}</span>
              </div>
            ` : ''}
            <div class="totals-row total-line">
              <span class="total-label">Total à payer</span>
              <span class="total-val">${formatPrice(total + (subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 2000))}</span>
            </div>
          </div>

          <!-- Applied Coupon Info -->
          ${appliedCoupon ? `
            <div class="applied-coupon-badge" style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,82,204,0.08); border: 1.5px solid var(--primary); padding: 8px 12px; border-radius: 12px; margin-bottom: 12px; font-size: 12.5px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 15px;">🎟️</span>
                <span style="font-weight: 800; color: var(--primary);">${appliedCoupon.code}</span>
                <span style="font-size: 11px; color: #059669; font-weight: 700;">(-${discount > 0 ? formatPrice(discount) : `${appliedCoupon.value}%`})</span>
                ${appliedCoupon.badgeCoupon || (appliedCoupon.code && appliedCoupon.code.startsWith('BADGE5')) ? `
                  <span style="font-size: 10px; font-weight: 850; background: #0066ff; color: white; padding: 2px 8px; border-radius: 12px; display: inline-flex; align-items: center; gap: 3px;">
                    🔄 ${appliedCoupon.remainingUses !== undefined ? appliedCoupon.remainingUses : 5}/${appliedCoupon.totalUses || 5} restantes
                  </span>
                ` : ''}
              </div>
              <button id="removeCouponBtn" style="background: none; border: none; font-size: 20px; font-weight: bold; cursor: pointer; color: var(--red); padding: 0 4px; line-height: 1;">&times;</button>
            </div>
          ` : ''}

          <!-- Promo Code Input -->
          <div class="promo-apply-row">
            <input type="text" placeholder="Code promo (ex: WELCOME10)" id="promoInput">
            <button id="promoApply">Appliquer</button>
          </div>

          <!-- Active Unlocked Badge Reward Coupons only -->
          ${activeCoupons.length > 0 ? `
            <div class="available-coupons-section" style="margin-top: 14px; margin-bottom: 14px;">
              <span style="font-size: 11px; font-weight: 800; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">🎖️ Votre Récompense de Badge Débloquée</span>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${activeCoupons.map(c => {
                  const remaining = c.remainingUses !== undefined ? c.remainingUses : 5;
                  const totalAllowed = c.totalUses || 5;
                  const discountText = c.badgeCoupon 
                    ? `✨ 5% OFF (Badge Récompense) • ${remaining}/${totalAllowed} utilisations restantes • Sans expiration`
                    : `✨ ${c.value}% OFF (Récompense Unique - 1 utilisation)`;
                  return `
                    <div class="coupon-item-card" style="display: flex; align-items: center; justify-content: space-between; background: rgba(0, 102, 255, 0.05); border: 1.5px dashed #0066ff; padding: 8px 12px; border-radius: 12px; font-size: 12px;">
                      <div style="display: flex; flex-direction: column; gap: 2px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <code style="font-weight: 800; font-size: 12.5px; color: #0066ff;">${c.code}</code>
                          ${c.badgeCoupon ? `
                            <span style="font-size: 9.5px; font-weight: 850; background: #0066ff; color: white; padding: 1px 6px; border-radius: 8px;">
                              ${remaining}/${totalAllowed} restantes
                            </span>
                          ` : ''}
                        </div>
                        <span style="font-size: 10px; color: var(--text-gray); font-weight: 600;">${discountText}</span>
                      </div>
                      <button class="apply-available-coupon-btn" data-coupon-code="${c.code}" style="background: #0066ff; color: white; border: none; font-weight: 800; font-size: 11px; padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                        Appliquer
                      </button>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

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
            wishlist = JSON.parse(sessionStorage.getItem('SWEETOS_wishlist') || '[]');
          } catch(e) {}
          if (!wishlist.some(w => w.id === item.id)) {
            wishlist.push(item);
            sessionStorage.setItem('SWEETOS_wishlist', JSON.stringify(wishlist));
            window.dispatchEvent(new CustomEvent('wishlist:updated', { detail: wishlist }));
          }
          this.cart.splice(idx, 1);
          this.saveCartToStorage();
          this.render();
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `"${item.name}" déplacé dans vos favoris ❤️` }));
        }
      });
    });

    // Promo apply button
    const promoApplyBtn = shadow.getElementById('promoApply');
    if (promoApplyBtn) {
      promoApplyBtn.addEventListener('click', () => {
        const code = (shadow.getElementById('promoInput')?.value || '').trim().toUpperCase();
        if (code) {
          if (code === 'WELCOME10') {
            const welcomeCoupon = {
              code: 'WELCOME10',
              type: 'percentage',
              value: 10,
              minOrder: 0,
              status: 'active'
            };
            sessionStorage.setItem('SWEETOS_applied_coupon', JSON.stringify(welcomeCoupon));
            window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Code WELCOME10 appliqué (-10%) ! 🎉' }));
            this.render();
            return;
          }

          const loggedUser = JSON.parse(getStorageItem('SWEETOS_logged_in_user') || '{}');
          const userProfile = JSON.parse(getStorageItem('SWEETOS_user_profile') || '{}');
          const curEmail = (loggedUser.email || userProfile.email || '').toLowerCase();

          // 1. Check Badge Rewards
          let badgeReward = null;
          if (curEmail) {
            badgeReward = getBadgeRewardCoupon(curEmail);
          }
          if (badgeReward && (badgeReward.code || '').toUpperCase() === code) {
            if (badgeReward.scratched !== true) {
              window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Veuillez d\'abord gratter votre boîte mystère dans la page Coupons pour activer cette récompense ! 🎁' }));
              return;
            }
            if (badgeReward.remainingUses <= 0 || badgeReward.status === 'exhausted') {
              window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Ce coupon de badge a déjà épuisé toutes ses utilisations.' }));
              return;
            }
            const couponObj = {
              code: badgeReward.code,
              type: 'percentage',
              value: 5,
              badgeCoupon: true,
              totalUses: badgeReward.totalUses,
              remainingUses: badgeReward.remainingUses,
              status: 'active'
            };
            sessionStorage.setItem('SWEETOS_applied_coupon', JSON.stringify(couponObj));
            window.dispatchEvent(new CustomEvent('toast:show', { detail: `Coupon Récompense "${badgeReward.code}" appliqué (-5%) ! 🎉` }));
            this.render();
            return;
          }

          // 2. Check Scratched Mystery Boxes
          const scratchKey = getScratchcardsStorageKey();
          let scratchcards = [];
          try {
            scratchcards = JSON.parse(sessionStorage.getItem(scratchKey) || '[]');
          } catch(e) {}
          const userCard = scratchcards.find(sc => 
            (sc.rewardCode && sc.rewardCode.toUpperCase() === code) || 
            (sc.couponWon && sc.couponWon.code && sc.couponWon.code.toUpperCase() === code)
          );
          if (userCard) {
            if (userCard.scratched !== true) {
              window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Veuillez d\'abord gratter votre boîte mystère dans la page Coupons pour activer cette récompense ! 🎁' }));
              return;
            }
            if (userCard.couponWon === 'lost') {
              window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Ce coupon n\'est pas valide.' }));
              return;
            }
            const couponObj = userCard.couponWon || {
              code: userCard.rewardCode || code,
              type: 'percentage',
              value: 5,
              status: 'active'
            };
            sessionStorage.setItem('SWEETOS_applied_coupon', JSON.stringify(couponObj));
            window.dispatchEvent(new CustomEvent('toast:show', { detail: `Coupon "${couponObj.code}" appliqué avec succès (-${couponObj.value}%) ! 🎉` }));
            this.render();
            return;
          }

          // 3. Check General Admin Coupons
          let coupons = [];
          try {
            const stored = sessionStorage.getItem('SWEETOS_coupons');
            coupons = stored ? JSON.parse(stored) : [];
          } catch(e) {}

          const coupon = coupons.find(c => c.code.toUpperCase() === code);
          if (!coupon) {
            window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Code promo invalide.' }));
            return;
          }

          if (coupon.scratched === false || coupon.status === 'unscratched') {
            window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Veuillez d\'abord gratter votre boîte mystère dans la page Coupons pour activer cette récompense ! 🎁' }));
            return;
          }

          if (coupon.expiry && new Date(coupon.expiry) < new Date(new Date().setHours(0,0,0,0))) {
            window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Ce coupon a expiré et n\'est plus valide.' }));
            return;
          }

          if (coupon.status !== 'active' || (coupon.stock !== undefined && coupon.stock <= 0) || (coupon.limit !== undefined && (coupon.used || 0) >= coupon.limit) || (coupon.remainingUses !== undefined && coupon.remainingUses <= 0)) {
            window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Ce coupon a déjà été utilisé ou est désactivé.' }));
            return;
          }

          const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          if (coupon.minOrder && subtotal < coupon.minOrder) {
            window.dispatchEvent(new CustomEvent('toast:show', { detail: `Montant minimum requis : ${formatPrice(coupon.minOrder)}` }));
            return;
          }

          sessionStorage.setItem('SWEETOS_applied_coupon', JSON.stringify(coupon));
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Coupon "${coupon.code}" appliqué avec succès ! 🎉` }));
          this.render();
        } else {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Veuillez saisir un code promo.' }));
        }
      });
    }

    // Remove coupon
    const removeBtn = shadow.getElementById('removeCouponBtn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        sessionStorage.removeItem('SWEETOS_applied_coupon');
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Coupon retiré.' }));
        this.render();
      });
    }

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

    // Available coupons clicks
    shadow.querySelectorAll('.apply-available-coupon-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-coupon-code');
        const input = shadow.getElementById('promoInput');
        if (input) {
          input.value = code;
          shadow.getElementById('promoApply')?.click();
        }
      });
    });
  }
}

customElements.define('cart-drawer', CartDrawer);
export default CartDrawer;
