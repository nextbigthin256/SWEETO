import products from '../../data/products.js';
import { getCartStorageKey, getProfileStorageKey, getNotificationsStorageKey, formatPrice } from '../../utils/storage.js';
import { renderVerificationBadge, getCustomerBadge, getCustomerLevel, getCustomerAvatarStyle, renderLevelChevronV } from '../../utils/badges.js';

class Header extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.selectedScope = 'All';
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.updateUserPill();
    this.syncCartBadge();
    this.syncNotificationBadge();
    this.syncWishlistBadge();
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

  updateUserPill() {
    const shadow = this.shadowRoot;
    const profilePill = shadow.getElementById('profile-pill');
    if (!profilePill) return;
    
    const loggedInUserStr = localStorage.getItem('SWEETOS_logged_in_user');
    
    // If user is NOT logged in, display clean Guest Connexion/Registration state
    if (!loggedInUserStr) {
      profilePill.innerHTML = `
        <div class="user-avatar" style="background: rgba(0, 82, 204, 0.1); color: #0052cc; font-size: 13px; font-weight: 800;">👤</div>
        <span class="user-name" style="font-weight: 750; color: #0f172a;">Connexion / S'inscrire</span>
      `;
      return;
    }

    let loggedObj = null;
    try { loggedObj = JSON.parse(loggedInUserStr); } catch(e) {}

    if (!loggedObj || !loggedObj.email) {
      profilePill.innerHTML = `
        <div class="user-avatar" style="background: rgba(0, 82, 204, 0.1); color: #0052cc; font-size: 13px; font-weight: 800;">👤</div>
        <span class="user-name" style="font-weight: 750; color: #0f172a;">Connexion / S'inscrire</span>
      `;
      return;
    }

    const profileKey = getProfileStorageKey();
    let profileSaved = localStorage.getItem(profileKey);
    let profile = null;
    if (profileSaved) {
      try { profile = JSON.parse(profileSaved); } catch (e) {}
    }

    if (!profile) {
      profile = {
        firstName: loggedObj.fullname ? loggedObj.fullname.split(' ')[0] : (loggedObj.email ? loggedObj.email.split('@')[0] : 'Client'),
        lastName: loggedObj.fullname ? loggedObj.fullname.split(' ').slice(1).join(' ') : '',
        email: loggedObj.email,
        badgeType: 'none',
        level: 'starter',
        avatar: ''
      };
    }

    const curEmail = (profile.email || loggedObj?.email || '').toLowerCase();
    let hasAdminBadgeOverride = false;
    let hasAdminLevelOverride = false;

    // Always check SWEETOS_customers by email to get latest badge, level and avatar assigned by Admin
    try {
      const custs = JSON.parse(localStorage.getItem('SWEETOS_customers') || '[]');
      if (curEmail) {
        const match = custs.find(c => c.email && c.email.toLowerCase() === curEmail);
        if (match) {
          if (match.badgeType) {
            profile.badgeType = match.badgeType;
            hasAdminBadgeOverride = true;
          }
          if (match.level) {
            profile.level = match.level;
            hasAdminLevelOverride = true;
          }
          if (match.avatar) profile.avatar = match.avatar;
        }
      }
    } catch(e) {}

    // Calculate customer total spent to compute dynamic level and 500k+ badge if not manually overridden
    try {
      const allOrders = JSON.parse(localStorage.getItem('SWEETOS_all_orders') || '[]');
      const userOrders = allOrders.filter(o => o.customerEmail && o.customerEmail.toLowerCase() === curEmail && (o.status || '').toLowerCase() !== 'deleted');
      const totalSpent = userOrders.filter(o => (o.status || '').toLowerCase() !== 'cancelled').reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

      if (!hasAdminLevelOverride) {
        const lvl = getCustomerLevel(totalSpent);
        profile.level = lvl.id;
      }
      if (!hasAdminBadgeOverride) {
        profile.badgeType = profile.badgeType || 'none';
      }
    } catch(e) {}

    const initials = (((profile.firstName || 'C')[0] || '') + ((profile.lastName || 'U')[0] || '')).toUpperCase();
    const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Client';
    const badgeHtml = renderVerificationBadge(profile.badgeType || 'none', 18);
    const avatarData = getCustomerAvatarStyle(profile, 34);
    const avatarStyle = avatarData.style;

    if (loggedInUser || profileSaved) {
      profilePill.innerHTML = `
        <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
          <div class="user-avatar" style="${avatarStyle}">
            ${profile.avatar ? '' : initials}
          </div>
          ${renderLevelChevronV(avatarData.level, 15)}
        </div>
        <span class="user-name" style="display:inline-flex; align-items:center; gap:5px; font-weight: 750;">
          ${fullName}
          ${badgeHtml}
        </span>
        <svg class="chevron-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      `;
    } else {
      profilePill.innerHTML = `
        <div class="user-avatar" style="background: #e2e8f0; color: #475569; font-size: 13px;">👤</div>
        <span class="user-name" style="font-weight: 750;">Connexion</span>
      `;
    }
  }

  syncCartBadge() {
    const saved = localStorage.getItem(getCartStorageKey());
    let count = 0;
    if (saved) {
      try {
        const cart = JSON.parse(saved);
        count = cart.reduce((acc, item) => acc + item.quantity, 0);
      } catch(e) {}
    }
    const badge = this.shadowRoot.getElementById('cartBadge');
    if (badge) {
      badge.textContent = count;
    }
  }

  syncNotificationBadge() {
    const key = getNotificationsStorageKey();
    const saved = localStorage.getItem(key);
    let count = 0;
    if (saved) {
      try {
        const notifs = JSON.parse(saved);
        count = notifs.filter(n => n.unread).length;
      } catch (e) {}
    } else {
      count = 1;
    }
    const badge = this.shadowRoot.getElementById('notificationBadge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  syncWishlistBadge() {
    const saved = localStorage.getItem('SWEETOS_wishlist');
    let count = 0;
    if (saved) {
      try {
        const wishlist = JSON.parse(saved);
        count = wishlist.length;
      } catch (e) {}
    }
    const badge = this.shadowRoot.getElementById('wishlistBadge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  render() {
    const storeName = localStorage.getItem('SWEETOS_store_name') || 'SWEETOS';
    const categories = JSON.parse(localStorage.getItem('SWEETOS_categories') || '[]');

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="./components/Header/Header.css">
      <header class="top-nav">
        <!-- Left Zone: Logo & Official Badge -->
        <div class="header-left-zone">
          <div class="logo" id="logo-btn" title="Retour à l'accueil">
            <div class="logo-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </div>
            <div class="logo-text-col">
              <span class="logo-title">${storeName}</span>
              <span class="logo-badge-pill">BOUTIQUE OFFICIELLE</span>
            </div>
          </div>
        </div>
        
        <!-- Center Zone: Luxury Omnisearch Bar with Category Scope -->
        <div class="search-bar">
          <!-- Category Scope Selector -->
          <div class="search-scope-wrapper">
            <select id="header-search-scope" aria-label="Portée de recherche">
              <option value="All">Tout</option>
              ${categories.map(c => `
                <option value="${c.name || c}">${c.name || c}</option>
              `).join('')}
            </select>
            <svg class="scope-arrow" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>

          <div class="search-divider"></div>

          <!-- Text Input -->
          <input type="text" id="header-search-input" placeholder="Rechercher un produit, marque, setup..." autocomplete="off">
          
          <!-- Actions Cluster -->
          <div class="search-actions-cluster">
            <!-- Clear button -->
            <button id="header-search-clear-btn" class="icon-input-btn search-clear-btn" title="Effacer" style="display: none;">
              ✕
            </button>

            <!-- Visual search -->
            <button class="icon-input-btn camera-search-btn" id="camera-btn" title="Recherche visuelle par IA">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </button>
            
            <!-- Voice search -->
            <button class="icon-input-btn voice-search-btn" id="voice-btn" title="Recherche vocale">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"></path>
              </svg>
            </button>

            <!-- Search Action Submit Button -->
            <button id="header-search-btn" class="search-action-btn" title="Lancer la recherche">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <span class="search-btn-label">Rechercher</span>
            </button>
          </div>

          <!-- Live Search Suggestions Dropdown -->
          <div class="search-suggestions-dropdown" id="search-suggestions-dropdown"></div>
        </div>
        
        <!-- Right Zone: Navigation Actions & Profile -->
        <div class="nav-actions">
          <!-- Wishlist -->
          <button class="nav-btn" id="wishlist-btn" title="Mes Favoris">
            <div class="nav-btn-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span class="badge" id="wishlistBadge" style="display: none;">0</span>
            </div>
            <span class="nav-btn-label">Favoris</span>
          </button>
          
          <!-- Notifications -->
          <button class="nav-btn" id="notification-bell-btn" title="Notifications">
            <div class="nav-btn-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span class="badge" id="notificationBadge">1</span>
            </div>
            <span class="nav-btn-label">Alertes</span>
          </button>

          <!-- Shopping Cart -->
          <button class="nav-btn nav-btn-cart" id="cart-btn" title="Mon Panier">
            <div class="nav-btn-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <span class="badge" id="cartBadge">0</span>
            </div>
            <span class="nav-btn-label">Panier</span>
          </button>
          
          <!-- Customer Profile -->
          <div class="user-profile" id="profile-pill">
            <div class="user-avatar" style="background: #e2e8f0; color: #475569;">👤</div>
            <span class="user-name" style="font-weight: 750;">Connexion</span>
          </div>
        </div>
      </header>
    `;
  }

  setupEventListeners() {
    const shadow = this.shadowRoot;
    const searchInput = shadow.getElementById('header-search-input');
    const searchBtn = shadow.getElementById('header-search-btn');
    const clearSearchBtn = shadow.getElementById('header-search-clear-btn');
    const scopeSelect = shadow.getElementById('header-search-scope');

    const updateClearBtnVisibility = () => {
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchInput.value.trim() ? 'flex' : 'none';
      }
    };

    const triggerSearch = () => {
      const query = searchInput.value;
      const category = scopeSelect ? scopeSelect.value : 'All';
      updateClearBtnVisibility();
      window.dispatchEvent(new CustomEvent('search:query', {
        detail: { query, category }
      }));
    };

    if (scopeSelect) {
      scopeSelect.addEventListener('change', (e) => {
        this.selectedScope = e.target.value;
        if (searchInput.value.trim()) {
          this.showSuggestions(searchInput.value);
        }
        triggerSearch();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        updateClearBtnVisibility();
        const dropdown = shadow.getElementById('search-suggestions-dropdown');
        if (dropdown) dropdown.classList.remove('visible');
        window.dispatchEvent(new CustomEvent('search:query', {
          detail: { query: '', category: scopeSelect ? scopeSelect.value : 'All' }
        }));
      });
    }

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const dropdown = shadow.getElementById('search-suggestions-dropdown');
        if (dropdown) dropdown.classList.remove('visible');
        triggerSearch();
      }
    });

    let debounceSearch = null;
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value;
      updateClearBtnVisibility();
      this.showSuggestions(query);
      
      clearTimeout(debounceSearch);
      debounceSearch = setTimeout(() => {
        triggerSearch();
      }, 250);
    });

    searchBtn.addEventListener('click', () => {
      const dropdown = shadow.getElementById('search-suggestions-dropdown');
      if (dropdown) dropdown.classList.remove('visible');
      triggerSearch();
    });

    // Listen to external search / navigation events to clear input if needed
    window.addEventListener('search:query', (e) => {
      if (e.detail && e.detail.query === '' && searchInput.value !== '') {
        searchInput.value = '';
        updateClearBtnVisibility();
      }
    });

    window.addEventListener('navigation:changed', (e) => {
      if (e.detail && e.detail.page && e.detail.page !== 'catalog') {
        searchInput.value = '';
        updateClearBtnVisibility();
      }
    });

    // Close suggestions dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const dropdown = shadow.getElementById('search-suggestions-dropdown');
      if (dropdown && !this.contains(e.target)) {
        dropdown.classList.remove('visible');
      }
    });

    const cameraBtn = shadow.getElementById('camera-btn');
    const voiceBtn = shadow.getElementById('voice-btn');

    // Create file input for camera search
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    shadow.appendChild(fileInput);

    cameraBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Analyse de l\'image par IA en cours...' }));
      cameraBtn.classList.add('active');

      setTimeout(() => {
        cameraBtn.classList.remove('active');
        const name = file.name.toLowerCase();
        let query = 'Keyboards';
        let detected = 'Mechanical Keyboard';

        if (name.includes('head') || name.includes('audio') || name.includes('sound') || name.includes('ear') || name.includes('music')) {
          query = 'Audio';
          detected = 'Studio Headphones';
        } else if (name.includes('light') || name.includes('lamp') || name.includes('led') || name.includes('glow')) {
          query = 'Lighting';
          detected = 'Ambient Lighting';
        } else if (name.includes('desk') || name.includes('table') || name.includes('wood') || name.includes('stand')) {
          query = 'Desks';
          detected = 'Solid Wood Desk';
        }

        searchInput.value = detected;
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Recherche Visuelle : ${detected}` }));
        
        window.dispatchEvent(new CustomEvent('search:query', {
          detail: { query: detected, category: 'All' }
        }));
      }, 1400);
    });

    // Voice search logic using Web Speech API with fallback
    let recognition;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        voiceBtn.classList.add('active');
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Écoute en cours... Parlez maintenant 🎙' }));
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        searchInput.value = transcript;
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Recherche Vocale : "${transcript}"` }));
        window.dispatchEvent(new CustomEvent('search:query', {
          detail: { query: transcript, category: 'All' }
        }));
      };

      recognition.onerror = (event) => {
        voiceBtn.classList.remove('active');
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Erreur vocale: ${event.error}` }));
      };

      recognition.onend = () => {
        voiceBtn.classList.remove('active');
      };
    }

    voiceBtn.addEventListener('click', () => {
      if (recognition) {
        try {
          recognition.start();
        } catch (err) {
          recognition.stop();
        }
      } else {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Simulation Recherche Vocale... 🎙' }));
        voiceBtn.classList.add('active');
        
        setTimeout(() => {
          voiceBtn.classList.remove('active');
          const queries = ['Clavier Tactile', 'Casque Audio Studio', 'Barre d\'Écran LED', 'Support Moniteur Bois'];
          const randomQuery = queries[Math.floor(Math.random() * queries.length)];
          
          searchInput.value = randomQuery;
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Reconnu: "${randomQuery}"` }));
          window.dispatchEvent(new CustomEvent('search:query', {
            detail: { query: randomQuery, category: 'All' }
          }));
        }, 1800);
      }
    });

    // Notification bell click
    shadow.getElementById('notification-bell-btn').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('notifications:toggle'));
    });

    // Cart drawer toggle
    shadow.getElementById('cart-btn').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('cart:toggle'));
    });

    // Profile page navigation
    shadow.getElementById('profile-pill').addEventListener('click', () => {
      const loggedInUser = localStorage.getItem('SWEETOS_logged_in_user');
      const targetPage = loggedInUser ? 'profile' : 'auth';
      window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: targetPage } }));
    });

    // Wishlist click
    shadow.getElementById('wishlist-btn').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigation:changed', {
        detail: { page: 'wishlist' }
      }));
    });

    // Logo click home
    const logoBtn = shadow.getElementById('logo-btn');
    if (logoBtn) {
      logoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.dispatchEvent(new CustomEvent('navigation:changed', {
          detail: { page: 'home', category: 'All' }
        }));
      });
    }

    // Sync count on Cart badge
    window.addEventListener('cart:updated', (e) => {
      const cart = e.detail || [];
      const count = cart.reduce((acc, item) => acc + item.quantity, 0);
      const badge = shadow.getElementById('cartBadge');
      if (badge) {
        badge.textContent = count;
      }
    });

    // Sync notifications unread badge
    window.addEventListener('notifications:badge-sync', (e) => {
      const count = e.detail;
      const badge = shadow.getElementById('notificationBadge');
      if (badge) {
        if (count > 0) {
          badge.textContent = count;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }
    });

    // Sync search input
    window.addEventListener('search:query', (e) => {
      const { query } = e.detail;
      if (query !== undefined && query !== searchInput.value) {
        searchInput.value = query;
      }
    });

    // Real-time Event listeners for user status and notifications updates
    window.addEventListener('auth:changed', () => {
      this.updateUserPill();
    });

    window.addEventListener('profile:updated', () => {
      this.updateUserPill();
    });

    window.addEventListener('auth:changed', () => {
      this.updateUserPill();
      this.syncCartBadge();
      this.syncNotificationBadge();
      this.syncWishlistBadge();
    });

    window.addEventListener('profile:updated', () => {
      this.updateUserPill();
    });

    window.addEventListener('notifications:updated', () => {
      this.syncNotificationBadge();
    });

    window.addEventListener('storage', (e) => {
      const key = getNotificationsStorageKey();
      if (e.key === key) {
        this.syncNotificationBadge();
      }
      if (e.key === 'SWEETOS_customers' || (e.key && e.key.startsWith('SWEETOS_user_profile')) || e.key === 'SWEETOS_logged_in_user') {
        this.updateUserPill();
      }
    });

    window.addEventListener('wishlist:updated', () => {
      this.syncWishlistBadge();
    });
    
    window.addEventListener('branding:updated', () => {
      this.render();
      this.setupEventListeners();
      this.updateUserPill();
      this.syncCartBadge();
      this.syncNotificationBadge();
      this.syncWishlistBadge();
    });
  }

  showSuggestions(query) {
    const dropdown = this.shadowRoot.getElementById('search-suggestions-dropdown');
    if (!dropdown) return;

    if (!query.trim()) {
      dropdown.innerHTML = '';
      dropdown.classList.remove('visible');
      return;
    }

    const allProds = this.getProductsList();
    const scopeSelect = this.shadowRoot.getElementById('header-search-scope');
    const selectedScope = scopeSelect ? scopeSelect.value : 'All';
    const qLower = query.toLowerCase();

    let matches = allProds.filter(p => {
      if (!p) return false;
      const matchName = (p.name || '').toLowerCase().includes(qLower);
      const matchCat = (p.category || '').toLowerCase().includes(qLower);
      const matchBrand = (p.brand || '').toLowerCase().includes(qLower);
      const matchDesc = (p.shortDesc || p.description || '').toLowerCase().includes(qLower);
      const matchesText = matchName || matchCat || matchBrand || matchDesc;

      if (!matchesText) return false;
      if (selectedScope !== 'All') {
        return (p.category || '').toLowerCase() === selectedScope.toLowerCase();
      }
      return true;
    });

    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div class="no-suggestions-item">
          <span>🔍</span>
          <span>Aucun produit trouvé pour "<strong>${query}</strong>"</span>
        </div>
      `;
      dropdown.classList.add('visible');
      return;
    }

    const displayMatches = matches.slice(0, 5);

    dropdown.innerHTML = `
      <div class="suggestion-header">
        <span>SUGGESTIONS EN DIRECT</span>
        <span>${matches.length} trouvé${matches.length > 1 ? 's' : ''}</span>
      </div>

      ${displayMatches.map(p => `
        <div class="suggestion-item" data-id="${p.id}">
          <img class="suggestion-img" src="${p.image}" alt="${p.name}" loading="lazy">
          <div class="suggestion-info">
            <span class="suggestion-name">${p.name}</span>
            <div class="suggestion-meta-row">
              <span class="suggestion-cat-badge">${p.category || 'Général'}</span>
              <span class="suggestion-price">${formatPrice(p.price)}</span>
            </div>
          </div>
        </div>
      `).join('')}

      <div class="suggestion-footer">
        <button class="suggestion-view-all-btn" id="suggestion-view-all-btn">
          Afficher tous les résultats (${matches.length}) →
        </button>
      </div>
    `;

    dropdown.classList.add('visible');

    // Add click listeners to item cards
    dropdown.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(item.getAttribute('data-id'));
        dropdown.classList.remove('visible');
        
        const input = this.shadowRoot.getElementById('header-search-input');
        const matchProduct = allProds.find(p => p.id === id);
        if (matchProduct && input) {
          input.value = matchProduct.name;
        }

        window.dispatchEvent(new CustomEvent('product:view', { detail: id }));
      });
    });

    // View all button
    const viewAllBtn = dropdown.querySelector('#suggestion-view-all-btn');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.remove('visible');
        window.dispatchEvent(new CustomEvent('search:query', {
          detail: { query, category: selectedScope }
        }));
      });
    }
  }
}

customElements.define('app-header', Header);
export default Header;

