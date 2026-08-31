import { formatPrice } from '../../utils/storage.js';

class ProductDetailsModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isOpen = false;
    this.product = null;
    this.activeTab = 'description'; // 'description' or 'specs'
  }

  connectedCallback() {
    this.setupEventListeners();
  }

  render() {
    if (!this.product) return;
    const p = this.product;

    const origPrice = p.comparePrice || p.originalPrice || p.original_price || 0;
    const hasDiscount = Boolean(origPrice > p.price);
    const originalPriceVal = hasDiscount ? origPrice : 0;
    const discountVal = hasDiscount ? Math.round(((originalPriceVal - p.price) / originalPriceVal) * 100) : 0;

    // 1. Ensure stylesheet link is injected exactly once to prevent layout style drops on re-renders
    if (!this.shadowRoot.querySelector('link[href*="ProductDetailsModal.css"]')) {
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = './components/ProductDetails/ProductDetailsModal.css';
      this.shadowRoot.appendChild(cssLink);
    }

    // 2. Ensure wrapper container exists
    let container = this.shadowRoot.querySelector('.modal-container-wrapper');
    if (!container) {
      container = document.createElement('div');
      container.className = 'modal-container-wrapper';
      this.shadowRoot.appendChild(container);
    }

    container.innerHTML = `
      <div class="modal-overlay ${this.isOpen ? 'open' : ''}" id="overlay">
        <div class="modal-container glass-panel">
          <button class="close-btn" id="close-btn" aria-label="Close details">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px; flex-shrink: 0; display: inline-block;">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          <div class="modal-grid">
            <div class="modal-visual">
              <img src="${p.image}" alt="${p.name}" class="details-img">
              <span class="category-badge">${p.category}</span>
            </div>
            
            <div class="modal-info">
              <div class="rating-row">
                <span class="stars">
                  <svg class="star-icon" viewBox="0 0 24 24" width="14" height="14" fill="#00b4d8" stroke="#00b4d8" style="width: 14px; height: 14px; flex-shrink: 0; display: inline-block; vertical-align: middle;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  ${p.rating}
                </span>
                <span class="reviews">${p.reviews} verified reviews</span>
              </div>
              
              <h2 class="details-title">${p.name}</h2>
              <div class="price-row" style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;">
                <span class="price-badge" style="margin: 0; font-size: 20px; font-weight: 900; color: var(--primary);">${formatPrice(p.price)}</span>
                ${hasDiscount ? `
                  <span class="original-price" style="text-decoration: line-through; color: #94a3b8; font-size: 14px; font-weight: 600;">${formatPrice(originalPriceVal)}</span>
                  <span style="font-size: 11px; font-weight: 850; background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 2px 7px; border-radius: 6px;">-${discountVal}% OFF</span>
                ` : ''}
              </div>
              
              <div class="tabs-nav">
                <button class="tab-btn ${this.activeTab === 'description' ? 'active' : ''}" id="tab-desc">Overview</button>
                <button class="tab-btn ${this.activeTab === 'specs' ? 'active' : ''}" id="tab-specs">Specifications</button>
              </div>
              
              <div class="tab-content" id="tab-content-area">
                ${this.activeTab === 'description' ? `
                  <p class="desc-text">${p.description}</p>
                ` : `
                  <table class="specs-table">
                    <tbody>
                      ${Object.entries(p.specs || {}).map(([key, val]) => `
                        <tr>
                          <th>${key}</th>
                          <td>${val}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                `}
              </div>
              
              <div class="actions-row" style="display: flex; gap: 12px; align-items: center; width: 100%;">
                <button class="add-to-cart-btn btn-primary" id="add-btn" style="flex: 1;">
                  Add to Shopping Cart
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px; flex-shrink: 0; display: inline-block; margin-left: 4px; vertical-align: middle;">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                </button>
                <button class="share-details-btn" id="details-share-btn" style="background: rgba(0, 82, 204, 0.05); color: #0052cc; border: 1.5px solid rgba(0, 82, 204, 0.15); width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;" title="Share Product">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px; flex-shrink: 0;">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachDynamicListeners();
  }

  setupEventListeners() {
    window.addEventListener('product:details-open', (e) => {
      this.product = e.detail;
      this.isOpen = true;
      this.activeTab = 'description';
      this.render();
      this.updateState();
    });
  }

  attachDynamicListeners() {
    const shadow = this.shadowRoot;
    
    // Close clicks
    shadow.addEventListener('click', (e) => {
      if (e.target.id === 'close-btn' || e.target.id === 'overlay') {
        this.isOpen = false;
        this.updateState();
      }
    });

    // Add to cart click
    const addBtn = shadow.getElementById('add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('cart:add', { detail: this.product }));
        this.isOpen = false;
        this.updateState();
      });
    }

    // Product details share btn
    const shareBtn = shadow.getElementById('details-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const p = this.product;
        if (!p) return;
        
        const storeName = sessionStorage.getItem('SWEETOS_store_name') || 'SWEETOS';
        const productUrl = `${window.location.origin}${window.location.pathname}#/?product=${p.id}`;
        const priceText = formatPrice(p.price);
        const compareText = p.comparePrice && p.comparePrice > p.price 
          ? ` (Was ~${formatPrice(p.comparePrice)}~)` 
          : '';

        const shareText = 
`🔥 *NEW ARRIVAL ON ${storeName.toUpperCase()}* 🔥

📦 *${p.name.toUpperCase()}*
🏷️ *Brand:* ${p.brand || 'SWEETOS'}
📂 *Category:* ${p.category || 'General'}
💰 *Price:* ${priceText}${compareText}

📝 *Details:*
"${(p.description || p.shortDesc || '').slice(0, 220)}"

👇 *Tap link below to view & order directly:*
🔗 ${productUrl}`;

        const copyToClipboardFallback = () => {
          const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
          window.open(whatsappUrl, '_blank');
          window.dispatchEvent(new CustomEvent('toast:show', { detail: '📱 Opening WhatsApp! Select "My Status" to publish.' }));
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

    // Tabs switches
    const tabDesc = shadow.getElementById('tab-desc');
    const tabSpecs = shadow.getElementById('tab-specs');

    if (tabDesc && tabSpecs) {
      tabDesc.addEventListener('click', () => {
        this.activeTab = 'description';
        this.render();
        this.updateState();
      });
      tabSpecs.addEventListener('click', () => {
        this.activeTab = 'specs';
        this.render();
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

customElements.define('product-details-modal', ProductDetailsModal);
export default ProductDetailsModal;
