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
      : (p.rating || 5.0).toFixed(1);
    const reviewsDisplayCount = realReviewsCount > 0 
      ? realReviewsCount 
      : (p.reviews || 24);

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
        <div class="image-wrapper">
          <img src="${p.image}" alt="${p.name}" class="card-image" loading="lazy">
          
          <span class="category-badge ${isOutOfStock ? 'out-of-stock' : ''}">
            ${isOutOfStock ? '✕ Rupture' : (p.category || 'Workspace')}
          </span>
          
          <div class="status-badge-container">
            ${hasCustomBadge ? `<span class="status-badge custom-badge" style="background: linear-gradient(135deg, #0052cc 0%, #00b4d8 100%);">✨ ${customBadgeText.toUpperCase()}</span>` : ''}
            ${!hasCustomBadge && p.isDeal ? `<span class="status-badge hot-deal">⚡ FLASH DEAL</span>` : ''}
            ${!hasCustomBadge && !p.isDeal && isHotDeal ? `<span class="status-badge hot-deal">🔥 -${discountVal || 20}%</span>` : ''}
            ${!hasCustomBadge && !p.isDeal && isBestSeller ? `<span class="status-badge bestseller">⭐ BEST</span>` : ''}
            ${!hasCustomBadge && !p.isDeal && isNew ? `<span class="status-badge new">✨ NEW</span>` : ''}
          </div>
          
          <button class="heart-btn ${isWishlisted ? 'active' : ''}" id="wishlist-add-btn" title="${isWishlisted ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>

          <div class="overlay-side-actions">
            <button class="action-btn-mini" id="quick-view-btn" title="Aperçu rapide">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button class="action-btn-mini" id="share-card-btn" title="Partager">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
          </div>
        </div>
        
        <div class="card-content">
          <div class="rating-container">
            <svg class="star-icon" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span class="rating-score">${ratingVal}</span>
            <span class="rating-count">(${reviewsDisplayCount})</span>
          </div>
          
          <h2 class="product-title" id="title-click">${p.name}</h2>
          
          <div class="divider"></div>
          
          <div class="price-row">
            <div class="price-info">
              <p class="current-price">${formatPrice(p.price)}</p>
              ${hasDiscount ? `
                <div class="old-price-row">
                  <span class="old-price">${formatPrice(originalPriceVal)}</span>
                  <span class="discount-badge">-${discountVal}%</span>
                </div>
              ` : ''}
            </div>
            
            <button class="add-btn" id="add-to-cart-btn" ${isOutOfStock ? 'disabled style="opacity: 0.45; cursor: not-allowed; background: #64748b;"' : ''}>
              <span class="add-btn-text">${isOutOfStock ? 'Out' : 'Add'}</span>
              <span class="add-btn-icon">+</span>
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
        const shareTitle = `SWEETOS | ${p.name}`;
        const shareText = `Découvrez ${p.name} sur SWEETOS !\n${p.shortDesc || ''}\n\nPrix: ${formatPrice(p.price)}`;
        const shareUrl = window.location.origin;

        const copyToClipboardFallback = () => {
          navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`)
            .then(() => {
              window.dispatchEvent(new CustomEvent('toast:show', { detail: '📋 Lien du produit copié ! 🌟' }));
            })
            .catch(() => {
              const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;
              window.open(whatsappUrl, '_blank');
            });
        };

        if (navigator.share) {
          try {
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
