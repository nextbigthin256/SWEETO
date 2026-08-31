class Footer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.updateVisibility();
    
    this._brandingListener = () => {
      this.render();
      this.setupEventListeners();
    };
    window.addEventListener('branding:updated', this._brandingListener);

    this._hashListener = () => this.updateVisibility();
    window.addEventListener('hashchange', this._hashListener);
  }

  disconnectedCallback() {
    if (this._brandingListener) {
      window.removeEventListener('branding:updated', this._brandingListener);
    }
    if (this._hashListener) {
      window.removeEventListener('hashchange', this._hashListener);
    }
  }

  updateVisibility() {
    const hash = window.location.hash || '#/';
    const isHome = hash === '' || hash === '#' || hash === '#/' || hash === '#/home';
    this.style.display = isHome ? 'none' : 'block';
  }

  render() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="./components/Footer/Footer.css">
      <footer class="footer glass-panel">
        <div class="footer-container">
          
          <div class="footer-brand">
            <a href="#" class="logo">
              <svg class="logo-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
              <span class="logo-text">${sessionStorage.getItem('SWEETOS_store_name') || 'SWEETOS'}</span>
            </a>
            <p class="brand-desc">${sessionStorage.getItem('SWEETOS_store_desc') || 'High-precision minimalist desk accessories curated for developers, designers, and creators.'}</p>
          </div>
          
          <div class="footer-links">
            <div class="link-group">
              <h4>Collection</h4>
              <a href="#" data-category="Keyboards">Keyboards</a>
              <a href="#" data-category="Audio">Audio</a>
              <a href="#" data-category="Lighting">Lighting</a>
              <a href="#" data-category="Desks">Desks</a>
            </div>
            
            <div class="link-group footer-support-links">
              <h4>Support</h4>
              <a href="#/contact" data-page="contact">Contact Us</a>
              <a href="#/refund" data-page="refund">Shipping & Refund FAQ</a>
              <a href="#/terms" data-page="terms">Terms & Conditions</a>
            </div>
          </div>
          
          <div class="footer-newsletter">
            <h4>Join The Studio</h4>
            <p>Subscribe to receive product release announcements, discounts, and custom setups tips.</p>
            <form id="newsletter-form">
              <input type="email" id="newsletter-input" placeholder="your@email.com" required autocomplete="email">
              <button type="submit" class="submit-btn" aria-label="Subscribe">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
            <p class="feedback-msg" id="newsletter-feedback"></p>
          </div>
          
        </div>
        
        <div class="footer-bottom">
          <p class="copyright">&copy; ${new Date().getFullYear()} ${sessionStorage.getItem('SWEETOS_store_name') || 'SWEETOS'}. All rights reserved.</p>
          <div class="socials">
            <a href="#" aria-label="Twitter">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>
            </a>
            <a href="#" aria-label="Instagram">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="#" aria-label="GitHub">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </a>
          </div>
        </div>
      </footer>
    `;
  }

  setupEventListeners() {
    const shadow = this.shadowRoot;

    // Category click redirection
    const collLinks = shadow.querySelectorAll('.link-group a');
    collLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const cat = link.getAttribute('data-category');
        if (cat) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('search:query', {
            detail: { category: cat, query: '' }
          }));
          const productListEl = document.getElementById('main-product-list');
          if (productListEl) {
            productListEl.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });

    // Support pages redirection
    shadow.querySelectorAll('.footer-support-links a').forEach(link => {
      link.addEventListener('click', (e) => {
        const page = link.getAttribute('data-page');
        if (page) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('navigation:changed', {
            detail: { page }
          }));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });

    // Newsletter Sign Up
    const newsletterForm = shadow.getElementById('newsletter-form');
    const feedback = shadow.getElementById('newsletter-feedback');
    const input = shadow.getElementById('newsletter-input');

    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value;
      feedback.textContent = `Thanks for subscribing, ${val}!`;
      feedback.className = 'feedback-msg success';
      input.value = '';
      
      // Clear message after delay
      setTimeout(() => {
        feedback.textContent = '';
        feedback.className = 'feedback-msg';
      }, 5000);
    });
  }
}

customElements.define('app-footer', Footer);
export default Footer;
