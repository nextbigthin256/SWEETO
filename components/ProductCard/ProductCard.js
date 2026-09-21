import { formatPrice, getStorageItem, getWishlistFromStorage } from '../../utils/storage.js';
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

  get sectionBadge() {
    return this._sectionBadge || '';
  }

  set sectionBadge(value) {
    this._sectionBadge = value;
    if (this._product) {
      this.render();
    }
  }

  get badgeClass() {
    return this._badgeClass || '';
  }

  set badgeClass(value) {
    this._badgeClass = value;
    if (this._product) {
      this.render();
    }
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

    // Load genuine customer reviews for this product (Strictly real-time, no mock count)
    let realReviewsCount = 0;
    let avgRating = 5;
    try {
      const allRevsStr = getStorageItem('SWEETOS_reviews_all') || getStorageItem('SWEETOS_reviews');
      if (allRevsStr) {
        const revs = JSON.parse(allRevsStr);
        if (Array.isArray(revs)) {
          const match = revs.filter(r => (Number(r.productId) === Number(p.id) || String(r.productId) === String(p.id)) && (r.status === 'approved' || !r.status));
          if (match.length > 0) {
            realReviewsCount = match.length;
            avgRating = match.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / match.length;
          }
        }
      }
      if (realReviewsCount === 0 && Array.isArray(p.reviews) && p.reviews.length > 0) {
        realReviewsCount = p.reviews.length;
        avgRating = p.reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / p.reviews.length;
      }
    } catch(e) {}

    const starsFilledCount = Math.min(5, Math.max(0, Math.round(avgRating)));
    const filledStars = '★'.repeat(starsFilledCount);
    const emptyStars = '☆'.repeat(5 - starsFilledCount);

    const lang = getInitialLanguage();

    // Badges determination
    const hasCustomBadge = Boolean(p.badge && String(p.badge).trim() !== '');
    const customBadgeText = hasCustomBadge ? String(p.badge).trim() : '';

    const dealIds = [5, 14, 28, 40, 7, 18, 32, 45];
    const bestIds = [1, 13, 26, 39, 2, 8, 15, 22];
    const newIds = [46, 47, 48, 49, 50, 41, 42, 43, 44];

    const isHotDeal = Boolean(
      this._isHotDeal || 
      p.isHotDeal || 
      (p.homepageSections && p.homepageSections.includes('sec-deals')) || 
      dealIds.includes(p.id) || 
      (p.originalPrice && p.originalPrice > p.price)
    );

    const isNew = Boolean(
      p.isNewArrival || 
      p.isNew ||
      (p.homepageSections && p.homepageSections.includes('sec-new')) || 
      newIds.includes(p.id) || 
      p.id > 44
    );

    const isBestSeller = Boolean(
      p.isBestSeller || 
      p.isBestseller ||
      (p.homepageSections && p.homepageSections.includes('sec-best')) ||
      bestIds.includes(p.id)
    );

    // Section Badge determination
    let displayBadgeText = '';
    let badgeTypeClass = '';

    if (this._sectionBadge && String(this._sectionBadge).trim() !== '') {
      displayBadgeText = String(this._sectionBadge).trim();
      badgeTypeClass = this._badgeClass || 'custom';
    } else if (hasCustomBadge) {
      displayBadgeText = customBadgeText;
      badgeTypeClass = 'custom';
    } else if (isHotDeal) {
      displayBadgeText = lang === 'fr' ? '🔥 OFFRE HOT' : '🔥 HOT DEAL';
      badgeTypeClass = 'hot-deal';
    } else if (isNew) {
      displayBadgeText = lang === 'fr' ? '✨ NOUVEAUTÉ' : '✨ NEW';
      badgeTypeClass = 'new';
    } else if (isBestSeller) {
      displayBadgeText = lang === 'fr' ? '⭐ TOP VENTE' : '⭐ BESTSELLER';
      badgeTypeClass = 'bestseller';
    } else if (p.category) {
      displayBadgeText = p.category;
      badgeTypeClass = 'custom';
    }

    const wishlist = getWishlistFromStorage();
    const isWishlisted = Array.isArray(wishlist) && wishlist.some(item => item.id === p.id);

    this.shadowRoot.innerHTML = `
      <div class="card glass-panel">
        <div class="image-wrapper">
          <img src="${p.image}" alt="${p.name}" class="card-image" loading="lazy">
          
          <div class="status-badge-container">
            ${isOutOfStock ? `
              <span class="status-badge out-of-stock">
                ✕ ${getText('out', lang)}
              </span>
            ` : displayBadgeText ? `
              <span class="status-badge ${badgeTypeClass}">
                ${displayBadgeText}
              </span>
            ` : ''}
            ${hasDiscount ? `
              <span class="status-badge discount">
                -${discountVal}%
              </span>
            ` : ''}
          </div>
          
          <button class="heart-btn ${isWishlisted ? 'active' : ''}" id="wishlist-add-btn" title="${isWishlisted ? (lang === 'fr' ? 'Retirer des favoris' : 'Remove from wishlist') : (lang === 'fr' ? 'Ajouter aux favoris' : 'Add to wishlist')}">
            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
        </div>

        
        <div class="card-content">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div class="category-name" style="margin:0;">${p.category || 'Workspace'}</div>
            ${isOutOfStock ? `<span style="font-size:10.5px; font-weight:750; color:#ef4444; background:rgba(239,68,68,0.1); padding:2px 7px; border-radius:10px;">✕ ${getText('out', lang)}</span>` : ''}
          </div>
          
          <h2 class="product-title" id="title-click">${p.name}</h2>
          
          <!-- Real-Time Customer Star Rating (Real count, zero mock) -->
          <div class="product-card-rating" style="display: flex; align-items: center; gap: 6px; margin: 4px 0 6px 0;">
            <span style="color: #f59e0b; letter-spacing: 1px; font-size: 13px; line-height: 1;">${filledStars}${emptyStars}</span>
            <span style="color: #64748b; font-size: 12px; font-weight: 600; line-height: 1;">(${realReviewsCount})</span>
          </div>

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
            
            <button class="add-btn" id="add-to-cart-btn" ${isOutOfStock ? 'disabled style="opacity: 0.45; cursor: not-allowed; background: #64748b;"' : ''} title="${isOutOfStock ? getText('out', lang) : getText('add', lang)}">
              <span class="add-btn-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#ffffff">
                  <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </span>
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
