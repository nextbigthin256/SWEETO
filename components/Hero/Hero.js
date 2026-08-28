import products from '../../data/products.js';
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
    try {
      const stored = localStorage.getItem('SWEETOS_products');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch(e) {}
    return products;
  }

  initSlides() {
    const allProds = this.getProductsList();
    const storeName = localStorage.getItem('SWEETOS_store_name') || 'SWEETOS';
    const heroTitle = localStorage.getItem('SWEETOS_hero_title') || 'Find Your Style, Love Your Look ✨';
    const heroSubtitle = localStorage.getItem('SWEETOS_hero_subtitle') || 'Discover the latest trends in high-end tech layouts, accessories, and premium workspace gear.';
    const entranceImg = localStorage.getItem('SWEETOS_store_entrance_image') || null;

    if (!Array.isArray(allProds) || allProds.length === 0) {
      // 0 Products in store - Clean branded showcase without any mock cards
      this.slides = [
        {
          tag: `✨ ${storeName.toUpperCase()} OFFICIAL STORE`,
          title: heroTitle.includes('<br>') ? heroTitle : heroTitle.replace('\n', '<br>'),
          subtitle: heroSubtitle,
          bg: "linear-gradient(135deg, rgba(9, 17, 30, 0.65) 0%, rgba(13, 33, 73, 0.55) 50%, rgba(0, 82, 204, 0.45) 100%)",
          glow1: "rgba(0, 82, 204, 0.35)",
          glow2: "rgba(0, 180, 216, 0.25)",
          product: null,
          bannerImage: entranceImg,
          perks: ["Authentic Guaranteed", "Fast Delivery", "Official Warranty"],
          ctaText: "Explore Catalog",
          actionTarget: "catalog"
        }
      ];
      return;
    }

    // Dynamic slides generated purely from REAL products in catalog
    const gradients = [
      { bg: "linear-gradient(135deg, rgba(9, 17, 30, 0.65) 0%, rgba(13, 33, 73, 0.55) 50%, rgba(0, 82, 204, 0.45) 100%)", glow1: "rgba(0, 82, 204, 0.35)", glow2: "rgba(0, 180, 216, 0.25)" },
      { bg: "linear-gradient(135deg, rgba(11, 15, 25, 0.65) 0%, rgba(23, 23, 44, 0.55) 50%, rgba(49, 16, 78, 0.45) 100%)", glow1: "rgba(147, 51, 234, 0.35)", glow2: "rgba(0, 180, 216, 0.25)" },
      { bg: "linear-gradient(135deg, rgba(21, 0, 43, 0.65) 0%, rgba(41, 8, 73, 0.55) 50%, rgba(91, 14, 140, 0.45) 100%)", glow1: "rgba(217, 70, 239, 0.35)", glow2: "rgba(99, 102, 241, 0.25)" },
      { bg: "linear-gradient(135deg, rgba(24, 18, 11, 0.65) 0%, rgba(48, 31, 16, 0.55) 50%, rgba(84, 56, 24, 0.45) 100%)", glow1: "rgba(245, 158, 11, 0.35)", glow2: "rgba(217, 119, 6, 0.25)" }
    ];

    this.slides = allProds.slice(0, 4).map((p, idx) => {
      const g = gradients[idx % gradients.length];
      const isFirst = idx === 0;
      return {
        tag: `✨ ${storeName.toUpperCase()} • ${(p.category || 'FEATURED').toUpperCase()}`,
        title: isFirst ? (heroTitle.includes('<br>') ? heroTitle : heroTitle.replace('\n', '<br>')) : p.name,
        subtitle: isFirst ? heroSubtitle : (p.description ? p.description.slice(0, 130) + '...' : `Premium quality ${p.name} available now in stock.`),
        bg: g.bg,
        glow1: g.glow1,
        glow2: g.glow2,
        product: p,
        bannerImage: null,
        perks: ["Authentic Quality", "2-Year Warranty", "Verified In Stock"],
        ctaText: "Shop Now",
        actionTarget: "catalog"
      };
    });
  }

  connectedCallback() {
    this.initSlides();
    this.render();
    this.setupEventListeners();
    this.startAutoSlide();
    
    this._dataListener = () => {
      this.initSlides();
      this.render();
      this.setupEventListeners();
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
      <section class="hero-carousel" id="hero-carousel-container">
        <!-- Previous Arrow Button -->
        ${hasMultipleSlides ? `
          <button class="hero-nav-arrow prev" id="hero-prev-btn" aria-label="Slide précédente">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        ` : ''}

        <div class="slides-wrapper">
          ${this.slides.map((slide, idx) => {
            const p = slide.product;
            const bImg = slide.bannerImage;
            return `
              <div class="slide ${idx === this.currentSlide ? 'active' : ''}" data-index="${idx}">
                <div class="slide-card" style="background: ${slide.bg};">
                  <div class="hero-glow-1" style="background: radial-gradient(circle, ${slide.glow1} 0%, rgba(0,0,0,0) 70%);"></div>
                  <div class="hero-glow-2" style="background: radial-gradient(circle, ${slide.glow2} 0%, rgba(0,0,0,0) 70%);"></div>

                  <!-- Left Content Column -->
                  <div class="hero-content" style="${!p && !bImg ? 'max-width: 800px;' : ''}">
                    <span class="hero-tag">${slide.tag}</span>
                    <h2 class="hero-title">${slide.title}</h2>
                    <p class="hero-subtitle">${slide.subtitle}</p>

                    <div class="hero-perks-row">
                      ${(slide.perks || []).map(perk => `
                        <div class="hero-perk-item">
                          <span style="color: #38bdf8;">✓</span> ${perk}
                        </div>
                      `).join('')}
                    </div>

                    <div class="hero-cta-group">
                      <button class="shop-btn shop-cta" data-target="${slide.actionTarget}" data-id="${p?.id || 1}">
                        <span>${slide.ctaText}</span>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </button>

                      ${p ? `
                        <button class="shop-btn-secondary hero-view-details-btn" data-id="${p.id}">
                          <span>Quick View</span>
                        </button>
                      ` : ''}
                    </div>
                  </div>

                  <!-- Right Showcase Preview Card -->
                  ${p ? `
                    <div class="hero-visual">
                      <div class="hero-card-img-box hero-inspect-trigger" data-id="${p.id}">
                        <img src="${p.image}" alt="${p.name}" loading="lazy">
                        <span class="hero-card-badge">
                          ⭐ ${p.rating ? Number(p.rating).toFixed(1) : '5.0'}
                        </span>
                      </div>

                      <div class="hero-card-meta">
                        <span class="hero-card-label">FEATURED GEAR</span>
                        <h4 class="hero-card-title" title="${p.name}">${p.name}</h4>
                        <div class="hero-card-price-row">
                          <span class="hero-card-price">${formatPrice(p.price)}</span>
                          ${p.originalPrice && p.originalPrice > p.price ? `
                            <span style="font-size: 13px; color: #94a3b8; text-decoration: line-through;">${formatPrice(p.originalPrice)}</span>
                          ` : ''}
                        </div>
                      </div>

                      <div class="hero-card-actions">
                        <button class="btn-hero-buy hero-buy-direct" data-id="${p.id}">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                          <span>Buy Now</span>
                        </button>
                        <button class="btn-hero-view hero-inspect-trigger" data-id="${p.id}">
                          Details
                        </button>
                      </div>
                    </div>
                  ` : (bImg ? `
                    <div class="hero-visual" style="display:flex; align-items:center; justify-content:center;">
                      <img src="${bImg}" alt="Store Banner" style="max-height: 280px; max-width: 100%; border-radius: 16px; object-fit: cover; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                    </div>
                  ` : '')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Next Arrow Button -->
        ${hasMultipleSlides ? `
          <button class="hero-nav-arrow next" id="hero-next-btn" aria-label="Slide suivante">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        ` : ''}

        <!-- Capsule Dot Indicators -->
        ${hasMultipleSlides ? `
          <div class="dot-indicators">
            ${this.slides.map((_, idx) => `
              <button class="dot ${idx === this.currentSlide ? 'active' : ''}" data-index="${idx}" aria-label="Aller à la slide ${idx + 1}"></button>
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
    const dots = shadow.querySelectorAll('.dot');
    dots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(dot.getAttribute('data-index'));
        this.goToSlide(idx);
        this.resetAutoSlide();
      });
    });

    // Pause on hover
    const carouselContainer = shadow.getElementById('hero-carousel-container');
    if (carouselContainer) {
      carouselContainer.addEventListener('mouseenter', () => {
        this.isHovered = true;
        this.stopAutoSlide();
      });
      carouselContainer.addEventListener('mouseleave', () => {
        this.isHovered = false;
        this.startAutoSlide();
      });
    }

    // CTA & Shop clicks
    shadow.addEventListener('click', (e) => {
      const inspectBtn = e.target.closest('.hero-inspect-trigger') || e.target.closest('.hero-view-details-btn');
      if (inspectBtn) {
        e.stopPropagation();
        const id = parseInt(inspectBtn.getAttribute('data-id'));
        if (id) {
          window.dispatchEvent(new CustomEvent('product:view', { detail: id }));
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
          window.dispatchEvent(new CustomEvent('cart:add', {
            detail: { productId: prod.id, quantity: 1, color: prod.colors ? prod.colors[0]?.name : '' }
          }));
        }
        return;
      }

      const cta = e.target.closest('.shop-cta');
      if (cta) {
        e.stopPropagation();
        const target = cta.getAttribute('data-target');
        if (target === 'keyboards') {
          window.dispatchEvent(new CustomEvent('search:query', { detail: { query: 'Keyboards', category: 'Keyboards' } }));
        } else if (target === 'audio') {
          window.dispatchEvent(new CustomEvent('search:query', { detail: { query: 'Audio', category: 'Audio' } }));
        } else if (target === 'desks') {
          window.dispatchEvent(new CustomEvent('search:query', { detail: { query: 'Desks', category: 'Desks' } }));
        } else {
          // Scroll down smoothly to product list
          const prodList = document.querySelector('product-list');
          if (prodList) {
            prodList.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    });
  }

  goToSlide(index) {
    const shadow = this.shadowRoot;
    const slides = shadow.querySelectorAll('.slide');
    const dots = shadow.querySelectorAll('.dot');
    
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

