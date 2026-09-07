import { formatPrice } from '../../utils/storage.js';

class Hero extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.currentSlide = 0;
    this.intervalTime = 6000;
    this.timer = null;
    this.isHovered = false;

    this.initSlides();
  }

  getProductsList() {
    const pl = document.querySelector('product-list');
    if (pl && Array.isArray(pl.products) && pl.products.length > 0) {
      return pl.products;
    }
    if (window.__SWEETOS_PRODUCTS__ && Array.isArray(window.__SWEETOS_PRODUCTS__)) {
      return window.__SWEETOS_PRODUCTS__;
    }
    try {
      const stored = sessionStorage.getItem('SWEETOS_cloud_products') || localStorage.getItem('SWEETOS_cloud_products');
      if (stored) {
        const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch(e) {}
    return [];
  }

  async initSlides() {
    let allProds = this.getProductsList();
    if (!Array.isArray(allProds) || allProds.length === 0) {
      try {
        const { fetchProductsFromSupabase } = await import('../../utils/supabase.js');
        const cloudProds = await fetchProductsFromSupabase();
        if (Array.isArray(cloudProds) && cloudProds.length > 0) {
          allProds = cloudProds;
        }
      } catch(e) {}
    }

    const storeName = sessionStorage.getItem('SWEETOS_store_name') || 'SWEETOS';
    const heroTitle = sessionStorage.getItem('SWEETOS_hero_title') || 'Find Your Style, Love Your Look ✨';
    const heroSubtitle = sessionStorage.getItem('SWEETOS_hero_subtitle') || 'Discover the latest trends in high-end tech layouts, accessories, and premium workspace gear.';
    const entranceImg = sessionStorage.getItem('SWEETOS_store_entrance_image') || 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=1200&q=80';

    if (!Array.isArray(allProds) || allProds.length === 0) {
      // 0 Products in store - Default fallback slide
      this.slides = [
        {
          badgeText: `${storeName.toUpperCase()} • OFFICIAL STORE`,
          title: heroTitle,
          desc: heroSubtitle,
          bgImage: entranceImg,
          productImage: entranceImg,
          name: 'Premium Accessories',
          price: 15000,
          oldPrice: 18000,
          rating: '5.0',
          product: null
        }
      ];
      return;
    }

    // Dynamic slides generated from REAL catalog products
    this.slides = allProds.slice(0, 5).map((p) => {
      const pCategory = (p.category || 'COMPUTER & IT').toUpperCase();
      const pBrand = p.brand ? p.brand.toUpperCase() : 'SWEETOS';
      const origPrice = p.comparePrice || p.originalPrice || p.original_price || 0;
      
      const pDesc = p.description 
        ? (p.description.length > 150 ? p.description.slice(0, 150) + '...' : p.description) 
        : `Engineered by ${pBrand}, ${p.name} delivers high-end reliability and refined aesthetics for your setup.`;

      return {
        badgeText: `${storeName.toUpperCase()} • ${pCategory}`,
        title: p.name,
        desc: pDesc,
        bgImage: p.image || entranceImg,
        productImage: p.image || entranceImg,
        name: p.name,
        price: p.price,
        oldPrice: origPrice > p.price ? origPrice : 0,
        rating: p.rating ? Number(p.rating).toFixed(1) : '5.0',
        product: p
      };
    });
  }

  async connectedCallback() {
    await this.initSlides();
    this.render();
    this.setupEventListeners();
    this.startAutoSlide();
    
    this._dataListener = async () => {
      await this.initSlides();
      this.render();
      this.setupEventListeners();
      this.startAutoSlide();
    };

    window.addEventListener('branding:updated', this._dataListener);
    window.addEventListener('products:updated', this._dataListener);
    window.addEventListener('supabase:ready', this._dataListener);
    window.addEventListener('storage', this._dataListener);
  }

  disconnectedCallback() {
    this.stopAutoSlide();
    if (this._dataListener) {
      window.removeEventListener('branding:updated', this._dataListener);
      window.removeEventListener('products:updated', this._dataListener);
      window.removeEventListener('supabase:ready', this._dataListener);
      window.removeEventListener('storage', this._dataListener);
    }
  }

  render() {
    const hasMultipleSlides = this.slides.length > 1;

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="./components/Hero/Hero.css">
      <section class="hero-carousel" id="heroBanner">
        
        <!-- Left Arrow -->
        ${hasMultipleSlides ? `
          <button class="nav-arrow left" id="hero-prev-btn" aria-label="Previous">‹</button>
        ` : ''}

        <div class="slides-wrapper">
          ${this.slides.map((slide, idx) => {
            const p = slide.product;
            const pId = p?.id || 1;
            return `
              <div class="slide ${idx === this.currentSlide ? 'active' : ''}" data-index="${idx}">
                
                <!-- Full Background Image -->
                <img class="hero-bg-image" src="${slide.bgImage}" alt="${slide.name} Background">
                
                <!-- Dark Overlay -->
                <div class="hero-overlay"></div>

                <!-- SLIDE CONTENT GRID -->
                <div class="slide-content-grid">
                  
                  <!-- LEFT CONTENT -->
                  <div class="hero-left">
                    <div class="hero-badge">
                      <span class="sparkle">✨</span>
                      ${slide.badgeText}
                    </div>

                    <h1 class="hero-title">${slide.title}</h1>

                    <p class="hero-description">${slide.desc}</p>

                    <div class="hero-features">
                      <div class="hero-feature">
                        <span class="check">✓</span> Authentic Quality
                      </div>
                      <div class="hero-feature">
                        <span class="check">✓</span> 2-Year Warranty
                      </div>
                      <div class="hero-feature">
                        <span class="check">✓</span> Verified In Stock
                      </div>
                    </div>

                    <div class="hero-buttons">
                      <button class="btn-shop shop-cta" data-id="${pId}">
                        Shop Now <span class="arrow">→</span>
                      </button>
                      <button class="btn-quick hero-quick-view-btn" data-id="${pId}">Quick View</button>
                    </div>
                  </div>

                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Right Arrow -->
        ${hasMultipleSlides ? `
          <button class="nav-arrow right" id="hero-next-btn" aria-label="Next">›</button>
        ` : ''}

        <!-- Capsule Dot Indicators -->
        ${hasMultipleSlides ? `
          <div class="hero-dots" id="heroDots">
            ${this.slides.map((_, idx) => `
              <button class="hero-dot ${idx === this.currentSlide ? 'active' : ''}" data-index="${idx}" aria-label="Go to slide ${idx + 1}"></button>
            `).join('')}
          </div>
        ` : ''}

      </section>
    `;
  }

  setupEventListeners() {
    const shadow = this.shadowRoot;
    
    // Previous & Next Arrow Clicks
    const prevBtn = shadow.getElementById('hero-prev-btn');
    const nextBtn = shadow.getElementById('hero-next-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.prevSlide();
        this.resetAutoSlide();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.nextSlide();
        this.resetAutoSlide();
      });
    }

    // Dot indicator clicks
    const dots = shadow.querySelectorAll('.hero-dot');
    dots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(dot.getAttribute('data-index'));
        this.goToSlide(idx);
        this.resetAutoSlide();
      });
    });

    // Pause on hover
    const banner = shadow.getElementById('heroBanner');
    if (banner) {
      banner.addEventListener('mouseenter', () => {
        this.isHovered = true;
        this.stopAutoSlide();
      });
      banner.addEventListener('mouseleave', () => {
        this.isHovered = false;
        this.startAutoSlide();
      });

      // Touch swipe support for mobile
      let touchStartX = 0;
      let touchEndX = 0;

      banner.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      banner.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 40) {
          if (diff > 0) this.nextSlide();
          else this.prevSlide();
          this.resetAutoSlide();
        }
      }, { passive: true });
    }

    // CTA & Action clicks
    shadow.addEventListener('click', (e) => {
      const inspectBtn = e.target.closest('.hero-inspect-trigger') || e.target.closest('.hero-quick-view-btn') || e.target.closest('.btn-details');
      if (inspectBtn) {
        e.stopPropagation();
        const id = parseInt(inspectBtn.getAttribute('data-id'));
        if (id) {
          const allProds = this.getProductsList();
          const prod = allProds.find(p => p.id === id);
          if (prod) {
            window.dispatchEvent(new CustomEvent('product:details-open', { detail: prod }));
          }
        }
        return;
      }

      const buyDirectBtn = e.target.closest('.hero-buy-direct');
      if (buyDirectBtn) {
        e.stopPropagation();
        const id = parseInt(buyDirectBtn.getAttribute('data-id'));
        const allProds = this.getProductsList();
        const prod = allProds.find(p => p.id === id);
        if (prod) {
          window.dispatchEvent(new CustomEvent('cart:add', { detail: prod }));
        }
        return;
      }

      const cta = e.target.closest('.shop-cta');
      if (cta) {
        e.stopPropagation();
        const prodList = document.querySelector('product-list');
        if (prodList) {
          prodList.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }

  goToSlide(index) {
    const shadow = this.shadowRoot;
    const slides = shadow.querySelectorAll('.slide');
    const dots = shadow.querySelectorAll('.hero-dot');
    
    if (slides.length === 0) return;

    slides[this.currentSlide]?.classList.remove('active');
    dots[this.currentSlide]?.classList.remove('active');

    this.currentSlide = (index + this.slides.length) % this.slides.length;

    slides[this.currentSlide]?.classList.add('active');
    dots[this.currentSlide]?.classList.add('active');
  }

  prevSlide() {
    this.goToSlide(this.currentSlide - 1);
  }

  nextSlide() {
    this.goToSlide(this.currentSlide + 1);
  }

  startAutoSlide() {
    this.stopAutoSlide();
    this.timer = setInterval(() => {
      if (!this.isHovered) {
        this.nextSlide();
      }
    }, this.intervalTime);
  }

  stopAutoSlide() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  resetAutoSlide() {
    this.stopAutoSlide();
    this.startAutoSlide();
  }
}

customElements.define('app-hero', Hero);
export default Hero;

