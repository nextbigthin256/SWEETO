import { formatPrice, getStorageItem } from '../../utils/storage.js';
import { loadStyles } from '../../utils/cssLoader.js';
import { productCardCSS } from './ProductCard.styles.js';
import { getInitialLanguage, getText } from '../../utils/language.js';
import { shareProduct } from '../../utils/share.js';

class ProductCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._product = null;
    loadStyles(this.shadowRoot, productCardCSS);
    this._langListener = () => {
      if (this._product) this.render();
    };
  }

  set product(value) {
    this._product = value;
    this.render();
  }

  get isHotDeal() {
    return this._isHotDeal || false;
  }

  set isHotDeal(value) {
    this._isHotDeal = !!value;
    if (this._product) {
      this.render();
    }
  }

  get product() {
    return this._product;
  }

  connectedCallback() {
    window.addEventListener('language:changed', this._langListener);
    if (this._product) {
      this.render();
    }
  }

  disconnectedCallback() {
    window.removeEventListener('language:changed', this._langListener);
  }

  render() {
    const p = this._product;
    if (!p) return;

    const isOutOfStock = p.stock === 0;
    const origPrice = p.comparePrice || p.originalPrice || p.original_price || 0;
    const hasDiscount = Boolean(origPrice > p.price);
    const originalPriceVal = hasDiscount ? origPrice : 0;
    const discountVal = hasDiscount ? Math.round(((originalPriceVal - p.price) / originalPriceVal) * 100) : 0;

    // Load genuine customer reviews for this product
    let realReviewsCount = 0;
    let avgRating = 0;
    try {
      const allRevsStr = getStorageItem('SWEETOS_reviews_all') || getStorageItem('SWEETOS_reviews');
      if (allRevsStr) {
        const revs = JSON.parse(allRevsStr);
        if (Array.isArray(revs)) {
          const match = revs.filter(r => Number(r.productId) === Number(p.id));
          if (match.length > 0) {
            realReviewsCount = match.length;
            avgRating = (match.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / match.length).toFixed(1);
          }
        }
      }
    } catch(e) {}

    const lang = getInitialLanguage();
    let ratingBadgeHtml = '';
    if (realReviewsCount > 0) {
      ratingBadgeHtml = `<span style="font-size:11px; font-weight:750; color:#f59e0b; background:rgba(245,158,11,0.1); padding:2px 7px; border-radius:10px;">⭐ ${avgRating} (${realReviewsCount})</span>`;
    } else {
      if (isOutOfStock) {
        ratingBadgeHtml = `<span style="font-size:10.5px; font-weight:750; color:#ef4444; background:rgba(239,68,68,0.1); padding:2px 7px; border-radius:10px;">✕ ${getText('out', lang)}</span>`;
      } else if (hasDiscount) {
        ratingBadgeHtml = `<span style="font-size:10.5px; font-weight:750; color:#f97316; background:rgba(249,115,22,0.1); padding:2px 7px; border-radius:10px;">${getText('flashDeal', lang)}</span>`;
      } else {
        ratingBadgeHtml = `<span style="font-size:10.5px; font-weight:750; color:#10b981; background:rgba(16,185,129,0.1); padding:2px 7px; border-radius:10px;">${getText('inStock', lang)}</span>`;
      }
    }

    // Badges determination
    const hasCustomBadge = Boolean(p.badge && String(p.badge).trim() !== '');
    const customBadgeText = hasCustomBadge ? String(p.badge).trim() : '';

    const dealIds = [5, 14, 28, 40, 7, 18, 32, 45];
    const bestIds = [1, 13, 26, 39, 2, 8, 15, 22];
    const newIds = [46, 47, 48, 49, 50, 41, 42, 43, 44];

    const isHotDeal = Boolean(
      !hasCustomBadge && (
        this._isHotDeal || 
        p.isHotDeal || 
        (p.homepageSections && p.homepageSections.includes('sec-deals')) || 
        dealIds.includes(p.id) || 
        (p.originalPrice && p.originalPrice > p.price)
      )
    );

    const isNew = Boolean(
      !hasCustomBadge && !isHotDeal && (
        p.isNewArrival || 
        (p.homepageSections && p.homepageSections.includes('sec-new')) || 
        newIds.includes(p.id) || 
        p.id > 44
      )
    );

    const isBestSeller = Boolean(
      !hasCustomBadge && !isHotDeal && !isNew && (
        p.isBestSeller || 
        (p.homepageSections && p.homepageSections.includes('sec-best'))
      )
    );

    const wishlistSaved = getStorageItem('SWEETOS_wishlist');
    let isWishlisted = false;
    if (wishlistSaved) {
      try {
        const wishlist = JSON.parse(wishlistSaved);
        isWishlisted = wishlist.some(item => item.id === p.id);
      } catch (e) {}
    }

    this.shadowRoot.innerHTML = `
      <div class="card glass-panel">
        <div class="image-wrapper">
          <img src="${p.image}" alt="${p.name}" class="card-image" loading="lazy">
          
          ${isOutOfStock ? `
            <span class="category-badge out-of-stock">
              ✕ ${getText('out', lang)}
            </span>
          ` : ''}
          
          <div class="status-badge-container">
            ${hasCustomBadge ? `<span class="status-badge custom-badge" style="background: linear-gradient(135deg, #0052cc 0%, #00b4d8 100%);">✨ ${customBadgeText.toUpperCase()}</span>` : ''}
            ${!hasCustomBadge && p.isDeal ? `<span class="status-badge hot-deal">${getText('flashDeal', lang)}</span>` : ''}
            ${!hasCustomBadge && !p.isDeal && isHotDeal ? `<span class="status-badge hot-deal">🔥 -${discountVal || 20}%</span>` : ''}
            ${!hasCustomBadge && !p.isDeal && isBestSeller ? `<span class="status-badge bestseller">${getText('topSeller', lang)}</span>` : ''}
            ${!hasCustomBadge && !p.isDeal && isNew ? `<span class="status-badge new">${getText('newArrival', lang)}</span>` : ''}
          </div>
          
          <button class="heart-btn ${isWishlisted ? 'active' : ''}" id="wishlist-add-btn" title="${isWishlisted ? (lang === 'fr' ? 'Retirer des favoris' : 'Remove from wishlist') : (lang === 'fr' ? 'Ajouter aux favoris' : 'Add to wishlist')}">
            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>

          <div class="overlay-side-actions">
            <button class="action-btn-mini" id="quick-view-btn" title="${lang === 'fr' ? 'Aperçu rapide' : 'Quick view'}">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button class="action-btn-mini" id="share-card-btn" title="${lang === 'fr' ? 'Partager' : 'Share'}">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
          </div>
        </div>
        
        <div class="card-content">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div class="category-name" style="margin:0;">${p.category || 'Workspace'}</div>
            ${ratingBadgeHtml}
          </div>
          
          <h2 class="product-title" id="title-click">${p.name}</h2>
          
          <div class="divider"></div>
          
          <div class="price-row">
            <div class="price-info">
              <p class="current-price">${formatPrice(p.price)}</p>
              ${hasDiscount ? `
                <div class="old-price-row">
                  <span class="old-price">${formatPrice(originalPriceVal)}</span>
                </div>
              ` : ''}
            </div>
            
            <button class="add-btn" id="add-to-cart-btn" ${isOutOfStock ? 'disabled style="opacity: 0.45; cursor: not-allowed; background: #64748b;"' : ''}>
              <span class="add-btn-text">${isOutOfStock ? getText('out', lang) : getText('add', lang)}</span>
              <span class="add-btn-icon">🛒</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const shadow = this.shadowRoot;
    const p = this._product;

    const addBtn = shadow.getElementById('add-to-cart-btn');
    const triggerAddToCart = (e) => {
      e.stopPropagation();
      if (p.stock === 0) return;
      window.dispatchEvent(new CustomEvent('cart:add', { detail: p }));
    };
    if (addBtn) addBtn.addEventListener('click', triggerAddToCart);

    const wishBtn = shadow.getElementById('wishlist-add-btn');
    if (wishBtn) {
      wishBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('wishlist:add', { detail: p }));
      });
    }

    const shareCardBtn = shadow.getElementById('share-card-btn');
    if (shareCardBtn) {
      shareCardBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (p) {
          await shareProduct(p);
        }
      });
    }

    const updateCardWishlistState = (wishlist) => {
      const isCurrentlyWishlisted = wishlist.some(item => item.id === p.id);
      if (wishBtn) {
        wishBtn.title = isCurrentlyWishlisted ? 'Retirer des favoris' : 'Ajouter aux favoris';
        wishBtn.classList.toggle('active', isCurrentlyWishlisted);
        const svg = wishBtn.querySelector('svg');
        if (svg) {
          svg.style.fill = isCurrentlyWishlisted ? 'white' : 'none';
        }
      }
    };

    window.addEventListener('wishlist:updated', (e) => {
      updateCardWishlistState(e.detail || []);
    });

    const qvBtn = shadow.getElementById('quick-view-btn');
    const titleClick = shadow.getElementById('title-click');
    const cardEl = shadow.querySelector('.card');
    
    const triggerViewDetails = (e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('product:view', { detail: p.id }));
    };

    if (qvBtn) qvBtn.addEventListener('click', triggerViewDetails);
    if (titleClick) titleClick.addEventListener('click', triggerViewDetails);
    if (cardEl) {
      cardEl.addEventListener('click', (e) => {
        if (e.target.closest('#add-to-cart-btn') || e.target.closest('#quick-view-btn') || e.target.closest('#wishlist-add-btn') || e.target.closest('#share-card-btn')) {
          return;
        }
        triggerViewDetails(e);
      });
    }
  }
}

customElements.define('product-card', ProductCard);
export default ProductCard;
