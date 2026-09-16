import { loadStyles } from '../../utils/cssLoader.js';
import { searchBarCSS } from './SearchBar.styles.js';

class SearchBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    loadStyles(this.shadowRoot, searchBarCSS);
    this.isOpen = false;
    this.currentQuery = '';
    this.currentCategory = 'All';
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="search-overlay ${this.isOpen ? 'open' : ''}" id="overlay">
        <div class="search-panel glass-panel">
          <div class="search-header">
            <div class="search-input-wrapper">
              <svg class="search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input type="text" id="search-input" placeholder="Search premium desk accessories..." value="${this.currentQuery}" autocomplete="off">
              <button class="clear-btn" id="clear-btn" style="display: ${this.currentQuery ? 'flex' : 'none'}">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <button class="close-btn" id="close-btn">Close</button>
          </div>
          
          <div class="search-suggestions">
            <span class="suggestion-title">Popular Searches:</span>
            <div class="suggestion-chips">
              <button class="chip" data-query="Keyboard">Keyboard</button>
              <button class="chip" data-query="Audio">Audio</button>
              <button class="chip" data-query="Desk Pad">Desk Pad</button>
              <button class="chip" data-query="Lamp">Lamp</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const shadow = this.shadowRoot;
    const input = shadow.getElementById('search-input');
    const clearBtn = shadow.getElementById('clear-btn');
    const closeBtn = shadow.getElementById('close-btn');
    const overlay = shadow.getElementById('overlay');
    const chips = shadow.querySelectorAll('.chip');

    // Handle toggle event
    window.addEventListener('search:toggle', () => {
      this.isOpen = !this.isOpen;
      this.updateState();
    });

    // Input changes
    input.addEventListener('input', (e) => {
      this.currentQuery = e.target.value;
      clearBtn.style.display = this.currentQuery ? 'flex' : 'none';
      this.dispatchSearch();
    });

    // Clear input
    clearBtn.addEventListener('click', () => {
      input.value = '';
      this.currentQuery = '';
      clearBtn.style.display = 'none';
      input.focus();
      this.dispatchSearch();
    });

    // Close search panel
    closeBtn.addEventListener('click', () => {
      this.isOpen = false;
      this.updateState();
    });

    // Close on clicking overlay background
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.isOpen = false;
        this.updateState();
      }
    });

    // Click suggestions chips
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.getAttribute('data-query');
        input.value = query;
        this.currentQuery = query;
        clearBtn.style.display = 'flex';
        this.dispatchSearch();
        
        // Optionally close search after suggestion selection
        this.isOpen = false;
        this.updateState();
        
        // Scroll to product list page section
        const productListEl = document.getElementById('main-product-list');
        if (productListEl) {
          productListEl.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Synchronize global category select clears query
    window.addEventListener('search:query', (e) => {
      if (e.detail.category !== this.currentCategory && e.detail.query === '') {
        this.currentCategory = e.detail.category;
        input.value = '';
        this.currentQuery = '';
        clearBtn.style.display = 'none';
      }
    });
  }

  updateState() {
    const overlay = this.shadowRoot.getElementById('overlay');
    const input = this.shadowRoot.getElementById('search-input');
    if (overlay) {
      if (this.isOpen) {
        overlay.classList.add('open');
        setTimeout(() => input.focus(), 200);
      } else {
        overlay.classList.remove('open');
      }
    }
  }

  dispatchSearch() {
    window.dispatchEvent(new CustomEvent('search:query', {
      detail: { query: this.currentQuery, category: this.currentCategory }
    }));
  }
}

customElements.define('search-bar', SearchBar);
export default SearchBar;
