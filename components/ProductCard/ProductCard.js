import { formatPrice, getStorageItem } from '../../utils/storage.js';
import { loadStyles } from '../../utils/cssLoader.js';
import { productCardCSS } from './ProductCard.styles.js';

class ProductCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._product = null;
    loadStyles(this.shadowRoot, productCardCSS);
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
    if (this._product) {
      this.render();
    }
  }

  render() {
    const p = this._product;
    if (!p) return;

    const isOutOfStock = p.stock === 0;

    // Load reviews with fallback to product rating
    const key = `SWEETOS_reviews_${p.id}`;
    const saved = getStorageItem(key);
    let reviewsList = [];
    if (saved) {
      try {
        reviewsList = JSON.parse(saved);
      } catch (e) {}
    }
    const realReviewsCount = reviewsList.length;
    const ratingVal = realReviewsCount > 0 
      ? (reviewsList.reduce((sum, r) => sum + r.rating, 0) / realReviewsCount).toFixed(1)
      : (p.rating || 4.9).toFixed(1);
    const reviewsDisplayCount = realReviewsCount > 0 
      ? realReviewsCount 
      : (p.reviews || 24);

    // Cute signs / status badge determination
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

    const origPrice = p.comparePrice || p.originalPrice || p.original_price || 0;
    const hasDiscount = Boolean(origPrice > p.price);
    const originalPriceVal = hasDiscount ? origPrice : 0;
    const discountVal = hasDiscount ? Math.round(((originalPriceVal - p.price) / originalPriceVal) * 100) : 0;

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
        <div class="image-container">
          <img src="${p.image}" alt="${p.name}" class="product-img" loading="lazy">
          
          <!-- Category / Stock badge on left -->
          <span class="category-badge ${isOutOfStock ? 'out-of-stock' : ''}">
            ${isOutOfStock ? '✕ Rupture' : (p.category || 'Workspace')}
          </span>
          
          <!-- Status Signs on right -->
          <div class="status-badge-container">
            ${hasCustomBadge ? `<span class="status-badge custom-badge" style="background: linear-gradient(135deg, #0052cc 0%, #00b4d8 100%); color: white; border: none; font-weight: 850;">✨ ${customBadgeText.toUpperCase()}</span>` : ''}
            ${!hasCustomBadge && p.isDeal ? `<span class="status-badge hot-deal" style="background: linear-gradient(135deg, #0052cc 0%, #00b4d8 100%); color: white; border: none; font-weight: 900; box-shadow: 0 4px 10px rgba(0,82,204,0.3);">⚡ FLASH DEAL</span>` : ''}
            ${!hasCustomBadge && !p.isDeal && isHotDeal ? `<span class="status-badge hot-deal">🔥 -${discountVal || 20}% OFF</span>` : ''}
            ${!hasCustomBadge && !p.isDeal && isBestSeller ? `<span class="status-badge bestseller">⭐ BEST SELLER</span>` : ''}
            ${!hasCustomBadge && !p.isDeal && isNew ? `<span class="status-badge new">✨ NEW</span>` : ''}
          </div>
          
          <div class="overlay-actions">
            <button class="action-btn" id="quick-view-btn" title="Quick View">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button class="action-btn ${isWishlisted ? 'wishlisted' : ''}" id="wishlist-add-btn" title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="${isWishlisted ? 'var(--red)' : 'none'}" stroke="${isWishlisted ? 'var(--red)' : 'currentColor'}" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
            <button class="action-btn" id="share-card-btn" title="Share Product">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
            </button>
            <button class="action-btn" id="add-to-cart-btn" title="${isOutOfStock ? 'Rupture de Stock / Out of Stock' : 'Add to Cart'}" ${isOutOfStock ? 'disabled style="opacity: 0.45; cursor: not-allowed; pointer-events: none;"' : ''}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="info-container">
          <div class="rating-row">
            <span class="stars" style="color: #f59e0b;">
              <svg class="star-icon" viewBox="0 0 24 24" width="14" height="14" fill="#f59e0b" stroke="#f59e0b"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              ${ratingVal}
            </span>
            <span class="reviews">(${reviewsDisplayCount})</span>
          </div>
          
          <h3 class="product-title" id="title-click">${p.name}</h3>
          <p class="product-desc">${p.shortDesc}</p>
          
          <div class="price-row">
            <div class="price-box" style="display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap;">
              <span class="price">${formatPrice(p.price)}</span>
              ${hasDiscount ? `
                <span class="original-price" style="text-decoration: line-through; color: #94a3b8; font-size: 0.85rem; font-weight: 550;">${formatPrice(originalPriceVal)}</span>
                <span class="discount-pill" style="font-size: 10px; font-weight: 850; background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 1px 5px; border-radius: 5px;">-${discountVal}%</span>
              ` : ''}
            </div>
            <button class="buy-btn" id="buy-btn" ${isOutOfStock ? 'disabled style="background: #475569; border-color: #475569; opacity: 0.55; cursor: not-allowed; pointer-events: none;"' : ''}>
              ${isOutOfStock ? 'Out' : 'Add +'}
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
    const buyBtn = shadow.getElementById('buy-btn');
    const triggerAddToCart = (e) => {
      e.stopPropagation();
      if (p.stock === 0) return;
      window.dispatchEvent(new CustomEvent('cart:add', { detail: p }));
    };
    addBtn.addEventListener('click', triggerAddToCart);
    buyBtn.addEventListener('click', triggerAddToCart);

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
        const shareTitle = `SWEETOS | ${p.name}`;
        const shareText = `Découvrez ${p.name} sur SWEETOS !\n${p.shortDesc || ''}\n\nPrix: $${p.price.toFixed(2)}`;
        const shareUrl = window.location.origin;

        const copyToClipboardFallback = () => {
          navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`)
            .then(() => {
              window.dispatchEvent(new CustomEvent('toast:show', { detail: '📋 Lien du produit copié ! / Copied to clipboard! 🌟' }));
            })
            .catch(() => {
              const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;
              window.open(whatsappUrl, '_blank');
            });
        };

        if (navigator.share) {
          try {
            // Fetch product image to share as file blob
            const response = await fetch(p.image);
            const blob = await response.blob();
            const extension = p.image.split('.').pop().split('?')[0] || 'jpg';
            const file = new File([blob], `product-${p.id}.${extension}`, { type: blob.type });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: shareTitle,
                text: shareText,
                url: shareUrl,
                files: [file]
              });
            } else {
              await navigator.share({
                title: shareTitle,
                text: shareText,
                url: shareUrl
              });
            }
          } catch (err) {
            console.log('Error sharing image file, falling back to text:', err);
            navigator.share({
              title: shareTitle,
              text: shareText,
              url: shareUrl
            }).catch(() => copyToClipboardFallback());
          }
        } else {
          copyToClipboardFallback();
        }
      });
    }

    const updateCardWishlistState = (wishlist) => {
      const isCurrentlyWishlisted = wishlist.some(item => item.id === p.id);
      if (wishBtn) {
        wishBtn.title = isCurrentlyWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist';
        wishBtn.classList.toggle('wishlisted', isCurrentlyWishlisted);
        const svg = wishBtn.querySelector('svg');
        if (svg) {
          svg.setAttribute('fill', isCurrentlyWishlisted ? 'var(--red)' : 'none');
          svg.setAttribute('stroke', isCurrentlyWishlisted ? 'var(--red)' : 'currentColor');
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

    qvBtn.addEventListener('click', triggerViewDetails);
    titleClick.addEventListener('click', triggerViewDetails);
    cardEl.addEventListener('click', (e) => {
      if (e.target.closest('#add-to-cart-btn') || e.target.closest('#buy-btn') || e.target.closest('#quick-view-btn') || e.target.closest('#wishlist-add-btn')) {
        return;
      }
      triggerViewDetails(e);
    });
  }
}

customElements.define('product-card', ProductCard);
export default ProductCard;
