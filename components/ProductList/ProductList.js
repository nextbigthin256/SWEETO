import products from '../../data/products.js';
import defaultSections from '../../data/sections.js';
import { showEditAddressModal } from '../Modals/EditAddressModal.js';
import { showCancelOrderModal } from '../Modals/CancelOrderModal.js';
import { getAuthPageHTML, attachAuthListeners } from '../Auth/AuthPage.js';
import { getCartStorageKey, getProfileStorageKey, getNotificationsStorageKey, getScratchcardsStorageKey, formatPrice, formatTimeAgo, syncDeliveredNotifications, getAllOrdersFromStorage, saveAllOrdersToStorage, getStorageItem, saveStorageItem } from '../../utils/storage.js';

import { CUSTOMER_LEVELS, VERIFIED_BADGES, renderVerificationBadge, renderLevelPill, getCustomerLevel, getCustomerBadge, getBadgeRewardCoupon, getCustomerAvatarStyle, renderLevelChevronV, scratchBadgeReward, isBadgeRewardScratched } from '../../utils/badges.js';
import { getTodaysDealsConfig, isTodaysDealsActive, getTimeRemaining, awardMysteryBoxForDeliveredOrder, getTodaysDealsTheme, DEAL_BANNER_THEMES } from '../../utils/todaysDeals.js';
import { getMoreToLoveConfig } from '../../utils/moreToLove.js';
import '../Admin/AdminPage.js';

function safeParseArray(raw) {
  if (!raw) return [];
  let p = raw;
  if (typeof p === 'string') { try { p = JSON.parse(p); } catch(e) {} }
  if (typeof p === 'string') { try { p = JSON.parse(p); } catch(e) {} }
  return Array.isArray(p) ? p : [];
}

class ProductList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Initialize products database from storage to enable Admin Panel synchronization
    let loadedProducts = null;
    try {
      const storedProds = getStorageItem('SWEETOS_products');
      const parsed = safeParseArray(storedProds);
      if (parsed.length > 0) {
        loadedProducts = parsed;
      }
    } catch (e) {}

    if (!loadedProducts || loadedProducts.length === 0) {
      loadedProducts = products;
      this.initializeHomepageSectionsForProducts(loadedProducts);
      saveStorageItem('SWEETOS_products', loadedProducts);
    }

    this.products = loadedProducts;

    // Auto-sanitize all product categories and names
    if (Array.isArray(this.products)) {
      let prodsModified = false;
      this.products.forEach(p => {
        if (!p.category || p.category === 'undefined' || p.category === 'null') {
          p.category = 'General';
          prodsModified = true;
        }
        if (!p.name || p.name === 'undefined') {
          p.name = 'Product #' + (p.id || 1);
          prodsModified = true;
        }
      });
      if (prodsModified) {
        saveStorageItem('SWEETOS_products', this.products);
      }
    }

    // Auto-sanitize categories and homepage sections
    try {
      const rawCats = safeParseArray(getStorageItem('SWEETOS_categories'));
      const cleanCats = rawCats.filter(c => c && c.name && c.name !== 'undefined' && c.name !== 'null');
      if (cleanCats.length !== rawCats.length) {
        saveStorageItem('SWEETOS_categories', cleanCats);
      }
    } catch(e) {}

    try {
      const rawSecs = safeParseArray(getStorageItem('SWEETOS_homepage_sections'));
      const cleanSecs = rawSecs.filter(s => s && s.name && s.name !== 'undefined' && s.name !== 'null');
      if (cleanSecs.length !== rawSecs.length) {
        saveStorageItem('SWEETOS_homepage_sections', cleanSecs);
      }
    } catch(e) {}
    
    // Page state with undefined guards
    this.currentPage = getStorageItem('SWEETOS_current_page') || 'home';
    let catVal = getStorageItem('SWEETOS_current_category');
    this.currentCategory = (catVal && catVal !== 'undefined' && catVal !== 'null') ? catVal : 'All';
    this.currentQuery = getStorageItem('SWEETOS_current_query') || '';
    let brandVal = getStorageItem('SWEETOS_current_brand');
    this.currentBrand = (brandVal && brandVal !== 'undefined' && brandVal !== 'null') ? brandVal : '';
    let brandFilterVal = getStorageItem('SWEETOS_current_brand_filter');
    this.currentBrandFilter = (brandFilterVal && brandFilterVal !== 'undefined' && brandFilterVal !== 'null') ? brandFilterVal : 'All';
    const savedProdId = getStorageItem('SWEETOS_current_product_id');
    this.currentProductId = (savedProdId && savedProdId !== 'undefined' && savedProdId !== 'null') ? parseInt(savedProdId) : null;
    
    // Catalog filter & sort states
    this.catalogSort = 'featured';
    this.catalogBrandFilter = 'All';
    this.catalogInStockOnly = false;
    this.catalogLocalQuery = '';
    this.activeFeaturedIndex = 0;

    // Brand filter & sort states
    this.brandSort = 'featured';
    this.brandCategoryFilter = 'All';
    this.brandInStockOnly = false;
    this.brandLocalQuery = '';
    
    // PDP states
    this.pdpQuantity = 1;
    this.selectedColor = '';
    this.activeThumbnailIdx = 0;
    this.openAccordions = {
      description: true,
      specs: false,
      shipping: false
    };
    this.activeReviewFilter = 'All';
    this.visibleReviewsCount = 5; 
    
    // Review form states
    this.showReviewForm = false;
    this.formRating = 5;
    
    // Timer state
    this.timerInterval = null;
    this.countdownTime = 2 * 3600 + 45 * 60 + 18; 
    
    // Profile active tab state
    this.activeProfileTab = sessionStorage.getItem('SWEETOS_active_profile_tab') || 'overview';
    this.activeAboutTab = 'about-us';

    // Infinite scroll "For You" states
    this.forYouIndex = 0;
    this.forYouLoading = false;
    
    // Interactive category carousel active state
    this.activeFeaturedIndex = 0;
  }

  parseHashRoute() {
    const hash = window.location.hash || '';
    if (hash.startsWith('#/')) {
      const route = hash.substring(2);
      if (route.startsWith('product/')) {
        const idStr = route.split('/')[1];
        const pId = parseInt(idStr);
        if (!isNaN(pId)) {
          this.currentPage = 'pdp';
          this.currentProductId = pId;
        }
      } else if (route.startsWith('coupons/')) {
        this.currentPage = 'coupons';
        this.currentCouponCode = route.split('/')[1];
      } else if (route === 'coupons') {
        this.currentPage = 'coupons';
        this.currentCouponCode = null;
      } else if (route === 'terms') {
        this.currentPage = 'terms';
      } else if (route === 'about-us' || route === 'about') {
        this.currentPage = 'about-us';
      } else if (route === 'refund') {
        this.currentPage = 'refund';
      } else if (route === 'contact') {
        this.currentPage = 'contact';
      } else if (route.startsWith('catalog/')) {
        const cat = decodeURIComponent(route.split('/')[1]);
        this.currentPage = 'catalog';
        this.currentCategory = cat;
        this.currentBrand = '';
      } else {
        this.currentPage = route || 'home';
        if (this.currentPage === 'catalog') {
          this.currentCategory = 'All';
        }
      }
    } else {
      this.currentPage = 'home';
    }
  }

  updateHashURL() {
    let hash = '#/';
    if (this.currentPage === 'pdp' && this.currentProductId) {
      hash += 'product/' + this.currentProductId;
    } else if (this.currentPage === 'coupons') {
      hash += 'coupons' + (this.currentCouponCode ? '/' + this.currentCouponCode : '');
    } else if (this.currentPage === 'catalog' && this.currentCategory && this.currentCategory !== 'All') {
      hash += 'catalog/' + encodeURIComponent(this.currentCategory);
    } else if (this.currentPage === 'home') {
      hash = '#/';
    } else {
      hash += this.currentPage;
    }
    
    if (window.location.hash !== hash) {
      history.pushState(null, '', hash);
    }
  }

  connectedCallback() {
    this.parseHashRoute();

    // Fetch from Supabase Cloud on startup
    import('../../utils/supabase.js').then(async ({ fetchProductsFromSupabase, fetchCategoriesFromSupabase, fetchBrandsFromSupabase }) => {
      try {
        const [cloudProds, cloudCats, cloudBrands] = await Promise.allSettled([
          fetchProductsFromSupabase(),
          fetchCategoriesFromSupabase(),
          fetchBrandsFromSupabase()
        ]);
        let needsReRender = false;
        if (cloudProds.status === 'fulfilled' && Array.isArray(cloudProds.value)) {
          this.products = cloudProds.value;
          sessionStorage.setItem('SWEETOS_products', JSON.stringify(this.products));
          needsReRender = true;
        }
        if (cloudCats.status === 'fulfilled' && Array.isArray(cloudCats.value)) {
          sessionStorage.setItem('SWEETOS_categories', JSON.stringify(cloudCats.value));
          needsReRender = true;
        }
        if (cloudBrands.status === 'fulfilled' && Array.isArray(cloudBrands.value)) {
          sessionStorage.setItem('SWEETOS_brands', JSON.stringify(cloudBrands.value));
          needsReRender = true;
        }
        if (needsReRender) {
          this.renderPageContent();
        }
      } catch(e) {}
    }).catch(() => {});

    // Check if product ID is passed in URL query params (e.g. from share button)
    const urlParams = new URLSearchParams(window.location.search);
    const sharedProductId = urlParams.get('product');
    if (sharedProductId) {
      const pId = parseInt(sharedProductId);
      const product = this.products.find(p => p.id === pId);
      if (product) {
        this.currentPage = 'pdp';
        this.currentProductId = pId;
      }
    }

    this.render();
    this.renderPageContent();
    this.setupEventListeners();

    // Listen to URL hash routing updates
    window.addEventListener('hashchange', () => {
      this.parseHashRoute();
      this.renderPageContent();
      
      // Dispatch sync event for other navigation elements (Sidebar, MobileNav, Header)
      window.dispatchEvent(new CustomEvent('navigation:changed', {
        detail: {
          page: this.currentPage,
          category: this.currentCategory,
          brand: this.currentBrand
        }
      }));
    });
    // Listen to cross-tab updates to sync products, categories, and brands reactively
    this._storageListener = (e) => {
      if (e.key === 'SWEETOS_products') {
        try {
          const stored = getStorageItem('SWEETOS_products');
          if (stored) this.products = JSON.parse(stored);
        } catch (err) {}
        this.renderPageContent();
      } else if (e.key === 'SWEETOS_categories' || e.key === 'SWEETOS_brands') {
        this.renderPageContent();
      } else if (e.key === 'SWEETOS_all_orders' || e.key === 'SWEETOS_customers' || (e.key && e.key.startsWith('SWEETOS_user_profile'))) {
        this.renderPageContent();
        if (this.currentPage === 'profile' || this.currentPage === 'orders') {
          this.injectProfileTabContent();
        }
      }
    };
    window.addEventListener('storage', this._storageListener);

    // Live Order Updates Listener
    this._ordersUpdatedHandler = () => {
      this.renderPageContent();
      if (this.currentPage === 'profile' || this.currentPage === 'orders') {
        this.injectProfileTabContent();
      }
    };
    window.addEventListener('orders:updated', this._ordersUpdatedHandler);

    // Listen to live Supabase and product updates
    this._productsUpdatedHandler = (e) => {
      try {
        const prevJson = JSON.stringify(this.products || []);
        const stored = getStorageItem('SWEETOS_products');
        if (stored) {
          this.products = JSON.parse(stored);
        } else if (e.detail && Array.isArray(e.detail)) {
          this.products = e.detail;
        }
        const newJson = JSON.stringify(this.products || []);
        if (prevJson !== newJson) {
          this.renderPageContent();
        }
      } catch (err) {}
    };

    window.addEventListener('products:updated', this._productsUpdatedHandler);
    window.addEventListener('supabase:ready', this._productsUpdatedHandler);
    window.addEventListener('categories:updated', () => this.renderPageContent());
    window.addEventListener('brands:updated', () => this.renderPageContent());

    // Reactive Profile and Auth listeners for real-time customer level and badge updates
    window.addEventListener('profile:updated', () => {
      if (this.currentPage === 'profile') {
        this.injectProfileTabContent();
      }
    });

    window.addEventListener('auth:changed', (e) => {
      const isLoggedIn = sessionStorage.getItem('SWEETOS_logged_in_user') !== null || (e.detail && e.detail.loggedIn);
      if (isLoggedIn && (this.currentPage === 'auth' || window.location.hash === '#/auth' || window.location.hash === '#/auth/')) {
        this.currentPage = 'home';
        this.currentCategory = 'All';
        this.updateHashURL();
        this.renderPageContent();
        window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'home' } }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (this.currentPage === 'profile') {
        this.injectProfileTabContent();
      }
    });

    window.addEventListener('todays_deals:updated', () => {
      if (this.currentPage === 'home' || (this.currentPage === 'catalog' && this.currentCategory === 'All')) {
        this.renderPageContent();
      }
    });

    window.addEventListener('more_to_love:updated', () => {
      if (this.currentPage === 'home' || (this.currentPage === 'catalog' && this.currentCategory === 'All')) {
        this.renderPageContent();
      }
    });

    // Start Live Deals Countdown Ticker
    if (this._dealsTicker) clearInterval(this._dealsTicker);
    this._dealsTicker = setInterval(() => {
      const dealsCfg = getTodaysDealsConfig();
      if (!isTodaysDealsActive(dealsCfg)) {
        const activeSections = this.shadowRoot.querySelectorAll('.todays-deals-storefront-section');
        activeSections.forEach(el => el.remove());
        return;
      }
      const t = getTimeRemaining(dealsCfg.endsAt);
      if (t.isExpired) {
        this.renderPageContent();
        return;
      }
      const daysText = t.days < 10 ? '0' + t.days : String(t.days);
      const hrsText = t.hours < 10 ? '0' + t.hours : String(t.hours);
      const minsText = t.minutes < 10 ? '0' + t.minutes : String(t.minutes);
      const secsText = t.seconds < 10 ? '0' + t.seconds : String(t.seconds);

      this.shadowRoot.querySelectorAll('.deal-countdown-days, #deals-time-days').forEach(el => el.textContent = daysText);
      this.shadowRoot.querySelectorAll('.deal-countdown-hours, #deals-time-hours, #store-deal-hours').forEach(el => el.textContent = hrsText);
      this.shadowRoot.querySelectorAll('.deal-countdown-mins, #deals-time-minutes, #store-deal-mins').forEach(el => el.textContent = minsText);
      this.shadowRoot.querySelectorAll('.deal-countdown-secs, #deals-time-seconds, #store-deal-secs').forEach(el => el.textContent = secsText);
    }, 1000);
  }

  disconnectedCallback() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this._dealsTicker) {
      clearInterval(this._dealsTicker);
    }
    if (this._dealsSliderInterval) {
      clearInterval(this._dealsSliderInterval);
    }
    if (this._hotDealsAutoSlideInterval) {
      clearInterval(this._hotDealsAutoSlideInterval);
    }
    if (this._storageListener) {
      window.removeEventListener('storage', this._storageListener);
    }
    if (this._ordersUpdatedHandler) {
      window.removeEventListener('orders:updated', this._ordersUpdatedHandler);
    }
    if (this._productsUpdatedHandler) {
      window.removeEventListener('products:updated', this._productsUpdatedHandler);
      window.removeEventListener('supabase:ready', this._productsUpdatedHandler);
    }
  }

  // --- Functional Wishlist Utility Methods ---
  loadWishlistFromStorage() {
    const saved = sessionStorage.getItem('SWEETOS_wishlist');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  saveWishlistToStorage(wishlist) {
    sessionStorage.setItem('SWEETOS_wishlist', JSON.stringify(wishlist));
    window.dispatchEvent(new CustomEvent('wishlist:updated', { detail: wishlist }));
  }

  addToWishlist(product) {
    const wishlist = this.loadWishlistFromStorage();
    const existingIdx = wishlist.findIndex(item => item.id === product.id);
    if (existingIdx === -1) {
      wishlist.push(product);
      this.saveWishlistToStorage(wishlist);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Added ${product.name} to Wishlist! ❤️` }));
    } else {
      wishlist.splice(existingIdx, 1);
      this.saveWishlistToStorage(wishlist);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Removed ${product.name} from Wishlist.` }));
    }
    if (this.currentPage === 'wishlist') {
      this.renderPageContent();
    }
  }

  removeFromWishlist(productId) {
    let wishlist = this.loadWishlistFromStorage();
    wishlist = wishlist.filter(item => item.id !== productId);
    this.saveWishlistToStorage(wishlist);
    window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Removed from Wishlist.' }));
    if (this.currentPage === 'wishlist') {
      this.renderPageContent();
    }
  }

  // --- Functional User Profile Utility Methods ---
  loadUserProfile() {
    const loggedInUserStr = getStorageItem('SWEETOS_logged_in_user') || sessionStorage.getItem('SWEETOS_logged_in_user');
    if (!loggedInUserStr) {
      return null;
    }

    let loggedUser = null;
    try {
      loggedUser = JSON.parse(loggedInUserStr);
    } catch(e) {}

    if (!loggedUser || !loggedUser.email) {
      return null;
    }

    const currentEmail = loggedUser.email.toLowerCase().trim();
    const profileKey = getProfileStorageKey(currentEmail);
    const saved = getStorageItem(profileKey) || sessionStorage.getItem(profileKey);
    let profile = null;
    if (saved) {
      try {
        profile = JSON.parse(saved);
        if (profile && (profile.email || '').toLowerCase().trim() !== currentEmail) {
          profile = null;
        }
      } catch (e) {}
    }

    if (!profile) {
      const emailName = loggedUser.email.split('@')[0];
      profile = {
        firstName: loggedUser.fullname ? loggedUser.fullname.split(' ')[0] : emailName,
        lastName: loggedUser.fullname ? loggedUser.fullname.split(' ').slice(1).join(' ') : "",
        email: loggedUser.email,
        phone: loggedUser.phone || "",
        bio: "Client SWEETOS Côte d'Ivoire.",
        theme: "Ice Blue",
        avatar: "",
        level: "starter",
        badgeType: "none",
        twoFactor: false,
        marketingEmails: true,
        smsUpdates: false,
        addresses: [],
        orders: []
      };
    }

    let hasAdminBadgeOverride = false;
    let hasAdminLevelOverride = false;

    // Check if admin customer record has level, badge or avatar override
    try {
      const customersList = JSON.parse(sessionStorage.getItem('SWEETOS_customers') || '[]');
      if (currentEmail) {
        const custRecord = customersList.find(c => c.email && c.email.toLowerCase() === currentEmail);
        if (custRecord) {
          if (custRecord.level) {
            profile.level = custRecord.level;
            hasAdminLevelOverride = true;
          }
          if (custRecord.badgeType) {
            profile.badgeType = custRecord.badgeType;
            hasAdminBadgeOverride = true;
          }
          if (custRecord.avatar) profile.avatar = custRecord.avatar;
          if (custRecord.phone && !profile.phone) profile.phone = custRecord.phone;
        }
      }
    } catch(e) {}

    // Pull real orders from SWEETOS_all_orders to calculate live gross spend & orders count
    try {
      const allOrders = getAllOrdersFromStorage();
      const userGlobalOrders = allOrders.filter(o => {
        const oEmail = (o.customerEmail || o.email || o.userEmail || '').toLowerCase().trim();
        return oEmail === currentEmail && (o.status || '').toLowerCase() !== 'deleted';
      });

      if (!Array.isArray(profile.orders)) profile.orders = [];

      // 1. Update status & attributes of existing profile orders from latest global orders
      profile.orders.forEach(po => {
        const latest = userGlobalOrders.find(go => go.id === po.id);
        if (latest) {
          po.status = latest.status;
          po.trackingNumber = latest.trackingNumber;
          po.customerAddress = latest.customerAddress || po.customerAddress;
        }
      });

      // 2. Add missing global orders
      userGlobalOrders.forEach(go => {
        if (!profile.orders.some(po => po.id === go.id)) {
          profile.orders.unshift(go);
        }
      });

      // 3. Filter out deleted orders
      profile.orders = profile.orders.filter(po => (po.status || '').toLowerCase() !== 'deleted');
    } catch(e) {}

    if (!Array.isArray(profile.orders)) {
      profile.orders = [];
    }

    try {
      const totalSpent = profile.orders.filter(o => (o.status || '').toLowerCase() !== 'cancelled').reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
      
      // Auto-compute level from spend if not manually overridden by admin
      if (!hasAdminLevelOverride) {
        const lvl = getCustomerLevel(totalSpent);
        profile.level = lvl.id;
      }

      // Badges are independent and only applied if assigned
      if (!hasAdminBadgeOverride) {
        profile.badgeType = profile.badgeType || 'none';
      }
    } catch(e) {}

    return profile;
  }

  saveUserProfile(profile) {
    const profileKey = getProfileStorageKey();
    sessionStorage.setItem(profileKey, JSON.stringify(profile));
    sessionStorage.setItem('SWEETOS_user_profile', JSON.stringify(profile));

    // Synchronize with SWEETOS_customers if exists
    try {
      let customers = JSON.parse(sessionStorage.getItem('SWEETOS_customers') || '[]');
      const idx = customers.findIndex(c => c.email && c.email.toLowerCase() === (profile.email || '').toLowerCase());
      if (idx > -1) {
        customers[idx].name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        customers[idx].phone = profile.phone;
        if (profile.avatar !== undefined) customers[idx].avatar = profile.avatar;
        if (profile.level) customers[idx].level = profile.level;
        if (profile.badgeType) customers[idx].badgeType = profile.badgeType;
        sessionStorage.setItem('SWEETOS_customers', JSON.stringify(customers));
      }
    } catch(e) {}
  }

  // --- Category & Subcategory Hierarchy Methods ---
  getCategoryAndSubcategoryNames(targetCatName) {
    if (!targetCatName || targetCatName === 'All') return null; // null means matches all
    
    let categories = [];
    try {
      categories = JSON.parse(getStorageItem('SWEETOS_categories') || '[]');
    } catch(e) {}
    
    const targetLower = String(targetCatName).trim().toLowerCase();
    
    // Find category record by name, slug, or id
    const rootCat = categories.find(c => 
      c && (
        String(c.name || '').trim().toLowerCase() === targetLower ||
        String(c.slug || '').trim().toLowerCase() === targetLower ||
        String(c.id) === String(targetCatName)
      )
    );

    const matchingNames = new Set([targetLower]);
    if (rootCat) {
      if (rootCat.name) matchingNames.add(String(rootCat.name).trim().toLowerCase());
      if (rootCat.slug) matchingNames.add(String(rootCat.slug).trim().toLowerCase());
      
      // Recursively collect all descendant subcategories
      const collectChildren = (parentId, parentName) => {
        categories.forEach(c => {
          if (!c || !c.name) return;
          const pVal = c.parent;
          const isChild = pVal !== null && pVal !== undefined && pVal !== '' && pVal !== 0 && (
            String(pVal) === String(parentId) ||
            String(pVal).trim().toLowerCase() === String(parentName || '').trim().toLowerCase()
          );
          if (isChild) {
            const childNameLower = String(c.name).trim().toLowerCase();
            if (!matchingNames.has(childNameLower)) {
              matchingNames.add(childNameLower);
              if (c.slug) matchingNames.add(String(c.slug).trim().toLowerCase());
              collectChildren(c.id, c.name);
            }
          }
        });
      };
      collectChildren(rootCat.id, rootCat.name);
    }
    
    return matchingNames;
  }

  isProductInCategory(product, targetCatName) {
    if (!targetCatName || targetCatName === 'All') return true;
    if (!product) return false;
    
    const targetLower = String(targetCatName).trim().toLowerCase();
    const prodCatLower = String(product.category || '').trim().toLowerCase();
    const prodSubCatLower = String(product.subcategory || product.sub_category || '').trim().toLowerCase();

    // 1. Direct match on category or subcategory
    if (prodCatLower === targetLower || prodSubCatLower === targetLower) return true;

    // 2. Allowed names from category hierarchy
    const allowedNames = this.getCategoryAndSubcategoryNames(targetCatName);
    if (allowedNames) {
      if (allowedNames.has(prodCatLower) || allowedNames.has(prodSubCatLower)) return true;
      for (const name of allowedNames) {
        if (prodCatLower && (prodCatLower.includes(name) || name.includes(prodCatLower))) return true;
        if (prodSubCatLower && (prodSubCatLower.includes(name) || name.includes(prodSubCatLower))) return true;
      }
    }

    // 3. Fallback partial/substring match
    if (prodCatLower && (prodCatLower.includes(targetLower) || targetLower.includes(prodCatLower))) return true;
    if (prodSubCatLower && (prodSubCatLower.includes(targetLower) || targetLower.includes(prodSubCatLower))) return true;

    return false;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="./components/ProductList/ProductList.css">
      <section class="shop-section">


        <!-- Dynamic Content Area -->
        <div id="page-content">
          <!-- Injected via JS -->
        </div>

        <!-- Custom Creation Modal Dialog Overlay -->
        <div class="custom-modal-overlay" id="create-col-modal">
          <div class="custom-modal-content glass-panel">
            <h4>Create Custom Collection</h4>
            <p>Give your curated workspace setup folder a name.</p>
            <input type="text" id="new-col-name-input" placeholder="e.g. Dream Setup v2, Coding Corner..." />
            <div class="custom-modal-actions">
              <button class="btn-secondary" id="cancel-col-modal-btn" style="border:1px solid var(--border); background:white;">Cancel</button>
              <button class="btn-primary" id="confirm-col-modal-btn">Create Folder</button>
            </div>
          </div>
        </div>

      </section>
    `;
  }

  formatSectionTitleHtml(title) {
    if (!title) return '';
    const low = title.toLowerCase().trim();
    if (low === 'more to love' || low === 'more to love.' || low.includes('more to love')) {
      return `<span class="more-to-love-title" style="font-family: 'Fraunces', Georgia, serif; font-weight: 700; color: var(--text-dark, #0A2540); letter-spacing: -0.015em;">More to <em style="font-style: italic; color: #1F6FEB; font-family: 'Fraunces', Georgia, serif;">love.</em></span>`;
    }
    return title;
  }

  getPdpHexColor(name) {
    if (!name) return '#1F6FEB';
    const m = {
      'sandstone': '#C9A87C', 'sand': '#C9A87C',
      'midnight': '#1C1B1A', 'noir': '#1C1B1A', 'black': '#1C1B1A',
      'moss': '#7A8471', 'vert': '#7A8471', 'green': '#7A8471',
      'blue': '#1F6FEB', 'bleu': '#1F6FEB',
      'red': '#ff3b30', 'rouge': '#ff3b30',
      'yellow': '#ffcc00', 'jaune': '#ffcc00',
      'white': '#ffffff', 'blanc': '#ffffff',
      'grey': '#8e8e93', 'gris': '#8e8e93',
      'gold': '#C5A059', 'opal white': '#f0f4f8',
      'cobalt blue': '#0052cc', 'felt brown': '#92400e',
      'light gold': '#fef3c7', 'studio black': '#102a43',
      'ice blue': '#00b4d8', 'sunset bronze': '#ff9a3c',
      'pure white': '#ffffff', 'aurora rgb': '#ff2e93',
      'warm amber': '#ff9a3c', 'ice white': '#f0f4f8',
      'space grey': '#486581', 'natural oak': '#d9b48f',
      'white felt': '#ffffff'
    };
    const low = name.toLowerCase().trim();
    for (const [k, v] of Object.entries(m)) {
      if (low.includes(k)) return v;
    }
    let hash = 0;
    for (let i = 0; i < low.length; i++) {
      hash = low.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }

  getPdpStarsSvg(value, size = 15, fillPrimary = '#1F6FEB', fillEmpty = '#D9E3F2') {
    const rounded = Math.round(Number(value) || 0);
    let html = '';
    for (let i = 1; i <= 5; i++) {
      const fill = i <= rounded ? fillPrimary : fillEmpty;
      html += `<svg viewBox="0 0 24 24" style="width:${size}px;height:${size}px;fill:${fill};display:inline-block;vertical-align:middle;"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"/></svg>`;
    }
    return html;
  }

  getPdpFeatureDetails(prod) {
    const cat = (prod.category || '').toLowerCase();
    if (cat.includes('audio') || cat.includes('headphone') || cat.includes('sound')) {
      return {
        feat1: {
          eyebrow: "Materials & Comfort",
          title: "Premium Build, <em>Zero fatigue.</em>",
          desc: "Ergonomically tuned shape designed for prolonged daily usage. Memory cushions seal in the acoustics without applying excess pressure to your head.",
          bullets: ["Replaceable high-comfort padding", "Brushed metal hinges for extended durability", "Lightweight framework"]
        },
        feat2: {
          eyebrow: "Acoustic Engineering",
          title: "Sound that reads <em>the room.</em>",
          desc: "High-definition custom speakers tuned for rich bass response, transparent mids, and crystal-clear vocals. Immerse yourself in studio-quality music anywhere.",
          bullets: ["Adaptive frequency response", "Deep passive isolation seal", "Enhanced call clarity hardware"]
        }
      };
    } else if (cat.includes('keyboard') || cat.includes('clavier')) {
      return {
        feat1: {
          eyebrow: "ACOUSTIC & FEEL",
          title: "Gasket Mounted, <em>Silky Typing.</em>",
          desc: "Multi-layered sound dampening foam with factory pre-lubed switches creates a deep, satisfying acoustic profile for every keystroke.",
          bullets: ["Hot-swappable PCB sockets", "Double-shot PBT keycaps", "Custom stabilizer tuning"]
        },
        feat2: {
          eyebrow: "WIRELESS FREEDOM",
          title: "Tri-Mode Ultra Low <em>Latency.</em>",
          desc: "Switch instantly between Bluetooth 5.2, 2.4GHz wireless, and wired USB-C mode across multiple devices without missing a beat.",
          bullets: ["Up to 200 hours battery life", "Fast USB-C charging", "Cross-platform Mac & Windows toggle"]
        }
      };
    } else if (cat.includes('lighting') || cat.includes('light') || cat.includes('lamp')) {
      return {
        feat1: {
          eyebrow: "OPTICAL ARCHITECTURE",
          title: "Zero Glare, <em>Pure Focus.</em>",
          desc: "Asymmetrical optical design directs smooth ambient lighting precisely across your workspace without reflecting into your monitor or eyes.",
          bullets: ["Auto-dimming ambient sensor", "Dynamic color temperature control", "Touch capacitive adjustment dial"]
        },
        feat2: {
          eyebrow: "BUILD & FINISH",
          title: "Aircraft-grade <em>Aluminum.</em>",
          desc: "Machined from premium solid alloy with weighted counterbalanced clamp fitting ultra-thin to curved panoramic displays.",
          bullets: ["Universal weighted clamp system", "Matte anodized scratch-free coating", "Clean single-cable power feed"]
        }
      };
    }
    return {
      feat1: {
        eyebrow: "DESIGN PHILOSOPHY",
        title: "Crafted for <em>Everyday Excellence.</em>",
        desc: "Carefully engineered using robust, premium materials. Form and function aligned to deliver the most reliable user experience under heavy daily operation.",
        bullets: ["Durable lightweight chassis", "Scratch-resistant sleek surfaces", "Strict quality control tested"]
      },
      feat2: {
        eyebrow: "INTELLIGENT TECHNOLOGY",
        title: "Powering your <em>lifestyle.</em>",
        desc: "Packs next-generation internal hardware to maximize efficiency and speed. Designed to connect instantly and keep operating without interruptions.",
        bullets: ["High efficiency power management", "Seamless multi-device connectivity", "Official manufacturer certification"]
      }
    };
  }

  loadProductReviews(productId, targetRating, defaultCount) {
    let allReviews = [];
    try {
      const stored = sessionStorage.getItem('SWEETOS_reviews') || sessionStorage.getItem('SWEETOS_reviews_all');
      if (stored) {
        allReviews = JSON.parse(stored);
      }
    } catch (e) {}

    // Filter reviews belonging to this product and that are approved, excluding mock reviews
    return allReviews.filter(r => {
      const isMock = String(r.id || '').startsWith('rev_1') || String(r.id || '') === 'rev_2' || String(r.id || '') === 'rev_3' || String(r.id || '') === 'rev_4' || String(r.id || '') === 'rev_5';
      if (isMock) return false;
      const matchProd = r.productId === productId || r.productId === String(productId) || r.productId === Number(productId);
      return matchProd && (r.status || 'approved') === 'approved';
    });
  }

  saveProductReviews(productId, newReviewsForProduct) {
    let allReviews = [];
    try {
      const stored = sessionStorage.getItem('SWEETOS_reviews') || sessionStorage.getItem('SWEETOS_reviews_all');
      if (stored) {
        allReviews = JSON.parse(stored);
      }
    } catch (e) {}

    // Remove old mock entries and keep reviews for other products
    allReviews = allReviews.filter(r => {
      const isMock = String(r.id || '').startsWith('rev_1') || String(r.id || '') === 'rev_2' || String(r.id || '') === 'rev_3' || String(r.id || '') === 'rev_4' || String(r.id || '') === 'rev_5';
      if (isMock) return false;
      return r.productId !== productId && r.productId !== String(productId) && r.productId !== Number(productId);
    });

    // Map storefront new reviews to include standard metadata
    const mapped = newReviewsForProduct.map((r, index) => {
      return {
        id: r.id || 'rev_' + Date.now() + '_' + index,
        productId: productId,
        user: r.user || 'Client Vérifié',
        email: r.email || '',
        rating: Number(r.rating) || 5,
        comment: r.comment || '',
        date: r.date || new Date().toISOString().split('T')[0],
        status: r.status || 'approved',
        verified: r.verified !== undefined ? r.verified : true,
        storeReply: r.storeReply || ''
      };
    });

    allReviews = [...mapped, ...allReviews];
    sessionStorage.setItem('SWEETOS_reviews', JSON.stringify(allReviews));
    sessionStorage.setItem('SWEETOS_reviews_all', JSON.stringify(allReviews));
    window.dispatchEvent(new CustomEvent('reviews:updated', { detail: allReviews }));

    // Sync to server disk if backend API is active
    fetch('/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(allReviews)
    }).catch(() => {});
  }

  renderPageContent() {
    window.scrollTo(0, 0);
    
    // Log user activity
    let pageLabel = this.currentPage;
    if (this.currentPage === 'home') pageLabel = 'Home';
    else if (this.currentPage === 'catalog') pageLabel = `Catalog: ${this.currentCategory}`;
    else if (this.currentPage === 'pdp' && this.currentProductId) {
      const p = this.products.find(item => item.id === this.currentProductId);
      pageLabel = p ? `Product: ${p.name}` : 'Product Detail';
    } else if (this.currentPage === 'auth') pageLabel = 'Authentication';
    else if (this.currentPage === 'profile') pageLabel = 'Profile Settings';
    else if (this.currentPage === 'wishlist') pageLabel = 'Wishlist';
    else if (this.currentPage === 'about-us') pageLabel = 'About Us';
    else if (this.currentPage === 'terms') pageLabel = 'Terms & Conditions';
    else if (this.currentPage === 'refund') pageLabel = 'Refund Policy';
    else if (this.currentPage === 'contact') pageLabel = 'Contact Us';
    else if (this.currentPage === 'checkout') pageLabel = 'Checkout Form';
    else if (this.currentPage === 'coupons') pageLabel = 'Coupons & Offers';
    
    try {
      this.logCustomerActivity(pageLabel);
    } catch(err) {}

    // Reload products database to reflect Admin changes dynamically
    const storedProds = sessionStorage.getItem('SWEETOS_products');
    if (storedProds) {
      try {
        this.products = JSON.parse(storedProds);
        const hasMigrated = this.initializeHomepageSectionsForProducts(this.products);
        if (hasMigrated) {
          sessionStorage.setItem('SWEETOS_products', JSON.stringify(this.products));
        }
      } catch (e) {}
    }

    const isLoggedIn = sessionStorage.getItem('SWEETOS_logged_in_user') !== null;
    if (!isLoggedIn && (this.currentPage === 'profile' || this.currentPage === 'orders')) {
      this.currentPage = 'auth';
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: "Please sign in to access this page." }));
      }, 50);
    }

    // Persist current navigation state
    sessionStorage.setItem('SWEETOS_current_page', this.currentPage);
    sessionStorage.setItem('SWEETOS_current_category', this.currentCategory);
    sessionStorage.setItem('SWEETOS_current_query', this.currentQuery);
    sessionStorage.setItem('SWEETOS_current_brand', this.currentBrand || '');
    sessionStorage.setItem('SWEETOS_current_brand_filter', this.currentBrandFilter || 'All');
    if (this.currentProductId !== null) {
      sessionStorage.setItem('SWEETOS_current_product_id', this.currentProductId);
    } else {
      sessionStorage.removeItem('SWEETOS_current_product_id');
    }
    sessionStorage.setItem('SWEETOS_active_profile_tab', this.activeProfileTab);
    this.updateHashURL();

    const contentArea = this.shadowRoot.getElementById('page-content');
    const catRow = this.shadowRoot.getElementById('quick-category-row');
    
    const hero = document.getElementById('main-hero');
    if (hero) {
      hero.style.display = (this.currentPage === 'home') ? 'block' : 'none';
    }

    if (catRow) {
      catRow.style.display = (this.currentPage === 'home' || this.currentPage === 'catalog') ? 'block' : 'none';
    }
    if (this.currentPage === 'home') {
      let sectionsList = [];
      try {
        const storedSecs = getStorageItem('SWEETOS_homepage_sections');
        sectionsList = storedSecs ? JSON.parse(storedSecs) : [];
      } catch(e) {}

      const defaultSecs = defaultSections;

      let needsSave = false;
      if (sectionsList.length === 0) {
        sectionsList = [...defaultSecs];
        needsSave = true;
      } else {
        defaultSecs.forEach(ds => {
          if (!sectionsList.some(s => s.id === ds.id)) {
            sectionsList.push(ds);
            needsSave = true;
          }
        });
      }

      // Ensure order index is initialized
      sectionsList.forEach((s, idx) => {
        if (s.order === undefined) {
          s.order = idx;
          needsSave = true;
        }
      });

      if (needsSave) {
        saveStorageItem('SWEETOS_homepage_sections', sectionsList);
      }

      // Sort active sections by order
      const activeSortedSections = sectionsList.filter(s => s.active).sort((a, b) => (a.order || 0) - (b.order || 0));

      let homepageSectionsHTML = '';
      activeSortedSections.forEach(s => {
        if (s.type === 'categories') {
          homepageSectionsHTML += `
            <!-- Shop by Category Section (Charming Luxury Cards) -->
            <div class="home-section home-category-showcase-section animate-in" style="margin-bottom: 44px;">
              <div class="section-header" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 22px; flex-wrap: wrap; gap: 14px;">
                <div>
                  <div style="display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 850; color: #2563eb; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; background: rgba(37, 99, 235, 0.08); padding: 4px 12px; border-radius: 20px;">
                    <span>✨ DÉCOUVREZ PAR UNIVERS</span>
                    <span>•</span>
                    <span style="color: #64748b;">COLLECTIONS PREMIUM</span>
                  </div>
                  <h3 class="section-title" style="font-size: 24px; font-weight: 900; color: var(--text-dark); margin: 0; letter-spacing: -0.5px;">${s.name || "Explorer par Catégorie"}</h3>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <button class="view-all-btn" data-target-page="catalog" style="font-size: 13.5px; font-weight: 800; color: #2563eb; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; transition: all 0.2s;">
                    <span>Tout voir</span>
                    <span style="font-size: 15px;">→</span>
                  </button>
                  <div class="category-carousel-arrows" style="display: flex; gap: 6px;">
                    <button class="carousel-control-btn prev-btn" data-target-carousel="home-category-row" title="Précédent" style="border: 1px solid var(--border); border-radius: 10px; width: 36px; height: 36px; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">←</button>
                    <button class="carousel-control-btn next-btn" data-target-carousel="home-category-row" title="Suivant" style="border: 1px solid var(--border); border-radius: 10px; width: 36px; height: 36px; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">→</button>
                  </div>
                </div>
              </div>

              <div class="home-category-row custom-scroll" id="home-category-row">
                ${(() => {
                  const storedCats = JSON.parse(getStorageItem('SWEETOS_categories') || '[]');
                  const themeMap = {
                    "Keyboards": {
                      bg: "linear-gradient(145deg, #0b1528 0%, #1e3a8a 100%)",
                      accent: "#38bdf8",
                      accentLight: "rgba(56, 189, 248, 0.16)",
                      glow: "rgba(56, 189, 248, 0.35)",
                      tag: "Pro Typing & Custom",
                      desc: "Switches mécaniques, touches PBT et claviers sans fil"
                    },
                    "Audio": {
                      bg: "linear-gradient(145deg, #19092c 0%, #581c87 100%)",
                      accent: "#c084fc",
                      accentLight: "rgba(192, 132, 252, 0.16)",
                      glow: "rgba(192, 132, 252, 0.35)",
                      tag: "Son Haute Fidélité",
                      desc: "Casques de studio, écouteurs sans fil & amplificateurs DAC"
                    },
                    "Lighting": {
                      bg: "linear-gradient(145deg, #2a0f05 0%, #9a3412 100%)",
                      accent: "#fb923c",
                      accentLight: "rgba(251, 146, 60, 0.16)",
                      glow: "rgba(251, 146, 60, 0.35)",
                      tag: "Ambiance Studio RGB",
                      desc: "Lampes d'écran anti-reflets et barres lumineuses immersives"
                    },
                    "Desks": {
                      bg: "linear-gradient(145deg, #03251c 0%, #065f46 100%)",
                      accent: "#34d399",
                      accentLight: "rgba(52, 211, 153, 0.16)",
                      glow: "rgba(52, 211, 153, 0.35)",
                      tag: "Organisation & Bois Noble",
                      desc: "Supports d'écrans en chêne, tapis feutrine et passe-câbles"
                    }
                  };

                  const defaultThemes = [
                    {
                      bg: "linear-gradient(145deg, #0f172a 0%, #0284c7 100%)",
                      accent: "#38bdf8",
                      accentLight: "rgba(56, 189, 248, 0.16)",
                      glow: "rgba(56, 189, 248, 0.35)",
                      tag: "Tech & Productivité",
                      desc: "Accessoires optimisés pour vos sessions de travail"
                    },
                    {
                      bg: "linear-gradient(145deg, #2e081e 0%, #be185d 100%)",
                      accent: "#f472b6",
                      accentLight: "rgba(244, 114, 182, 0.16)",
                      glow: "rgba(244, 114, 182, 0.35)",
                      tag: "Édition Limitée",
                      desc: "Designs épurés et finitions haut de gamme"
                    }
                  ];

                  return storedCats.slice(0, 8).map((c, idx) => {
                    const theme = themeMap[c.name] || defaultThemes[idx % defaultThemes.length];
                    
                    // Match category products including all subcategories
                    const catProducts = (this.products || []).filter(p => this.isProductInCategory(p, c.name || c.id));
                    const count = catProducts.length;

                    // Get image of the first product added to this category
                    let firstProductImg = null;
                    if (catProducts.length > 0) {
                      const firstP = catProducts[0];
                      firstProductImg = firstP.image || (Array.isArray(firstP.images) && firstP.images.length > 0 ? firstP.images[0] : null);
                    }

                    // Priority: explicit category image -> first product's image in category -> empty
                    const catCoverImage = c.image || firstProductImg || '';

                    return `
                      <div class="home-category-card" data-category="${c.name}">
                        <!-- Category Image Full-Cover Background -->
                        ${catCoverImage ? `
                          <img src="${catCoverImage}" alt="${c.name}" loading="lazy" class="cat-cover-img">
                        ` : `
                          <div class="cat-cover-fallback" style="background: ${theme.bg}; width: 100%; height: 100%; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 52px; z-index: 0;">
                            ${c.icon || '📁'}
                          </div>
                        `}

                        <!-- High-Contrast Atmospheric Gradient Overlay -->
                        <div class="cat-cover-overlay"></div>
                        <div class="cat-card-glow" style="background: ${theme.glow};"></div>
                        <div class="cat-card-shine"></div>

                        <!-- Top Meta Header -->
                        <div class="cat-card-header">
                          <span class="cat-card-badge" style="color: white; border-color: rgba(255,255,255,0.25); background: rgba(15, 23, 42, 0.65);">
                            <span class="cat-badge-icon">${c.icon || '✨'}</span>
                            <span>${count > 0 ? `${count} Articles` : 'Explorer'}</span>
                          </span>
                          <span class="cat-card-tag">${theme.tag}</span>
                        </div>

                        <!-- Bottom Content & Animated CTA -->
                        <div class="cat-card-footer">
                          <div class="cat-card-titles">
                            <h4>${c.name}</h4>
                            <p>${c.description || theme.desc}</p>
                          </div>
                          <div class="cat-card-action">
                            <span class="action-label" style="color: ${theme.accent};">Explorer</span>
                            <div class="action-arrow" style="background: ${theme.accent};">
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('');
                })()}
              </div>
            </div>
          `;

          // TODAY'S DEALS: Render Dynamic Banner + 12-Product Grid right under Shop by Category if active
          const homeDealsConfig = getTodaysDealsConfig();
          if (isTodaysDealsActive(homeDealsConfig)) {
            const timeInfo = getTimeRemaining(homeDealsConfig.endsAt);
            const pool = homeDealsConfig.couponPool || { totalCoupons: 5, remainingCoupons: 5 };
            const theme = getTodaysDealsTheme(homeDealsConfig);
            const dealProductIds = new Set(homeDealsConfig.productIds || []);
            let dealProducts = this.products.filter(p => dealProductIds.has(p.id));
            if (dealProducts.length === 0) dealProducts = this.products.slice(0, 8);

            homepageSectionsHTML += `
              <!-- Today's Deals Section (Dynamic Hero Banner + 2x6 Product Grid) -->
              <div class="home-section todays-deals-storefront-section animate-in" style="margin-bottom: 48px;">
                <!-- Modern Dynamic Deals Hero Banner -->
                <div class="todays-deals-hero-banner" style="background: ${theme.bg};">
                  
                  <!-- Dynamic Background Product Slides -->
                  <div class="deals-bg-slider" id="deals-bg-slider">
                    ${dealProducts.map((p, idx) => `
                      <img src="${p.image}" class="deals-bg-slide ${idx === 0 ? 'active' : ''}" alt="${p.name}" loading="lazy">
                    `).join('')}
                  </div>

                  <!-- Gradient & Atmospheric Theme Overlay -->
                  <div class="deals-gradient-overlay" style="background: ${theme.overlayGradient};"></div>
                  <div class="deals-theme-ambient-glow" style="background: ${theme.accentColor};"></div>

                  <!-- Content Wrapper -->
                  <div class="deals-banner-content">
                    
                    <!-- Top Section: Text, Countdown & Action Buttons -->
                    <div class="deals-banner-top">
                      
                      <!-- Limited Time Badge -->
                      <div class="deals-badge" style="background: ${theme.badgeBg}; border-color: ${theme.badgeBorder}; color: ${theme.badgeText};">
                        <span>${theme.badgeIcon}</span>
                        <span>${theme.tag}</span>
                        <span style="opacity: 0.5;">•</span>
                        <span style="color: ${theme.accentColor}; font-weight: 900;">TODAY'S SPECIAL</span>
                      </div>

                      <!-- Main Headline -->
                      <h2 class="deals-headline">
                        ${homeDealsConfig.title || "Offres Flash du Jour"}
                      </h2>

                      <!-- Subheadline -->
                      <p class="deals-subheadline">
                        ${homeDealsConfig.subtitle || "Sélection exclusive limitée avec compte à rebours — Jusqu'à 50% de réduction !"}
                      </p>

                      <!-- First-Come Limited Coupon Bounty Badge -->
                      <div class="deals-bounty-badge">
                        <span style="font-size: 16px;">🎁</span>
                        <span><strong>${pool.totalCoupons} Coupons 5% OFF</strong> offerts aux <strong>${pool.totalCoupons} premiers acheteurs</strong> !</span>
                        <span class="bounty-rem-pill" style="background: ${theme.accentColor};">${pool.remainingCoupons} RESTANTS</span>
                      </div>

                      <!-- Countdown Timer Glass Panels -->
                      <div class="deals-countdown-row">
                        <div class="glass-timer-panel">
                          <div class="timer-num deal-countdown-days" id="deals-time-days">${timeInfo.days < 10 ? '0' + timeInfo.days : timeInfo.days}</div>
                          <div class="timer-label">Jours</div>
                        </div>
                        <div class="glass-timer-panel">
                          <div class="timer-num deal-countdown-hours" id="deals-time-hours">${timeInfo.hours < 10 ? '0' + timeInfo.hours : timeInfo.hours}</div>
                          <div class="timer-label">Heures</div>
                        </div>
                        <div class="glass-timer-panel">
                          <div class="timer-num deal-countdown-mins" id="deals-time-minutes">${timeInfo.minutes < 10 ? '0' + timeInfo.minutes : timeInfo.minutes}</div>
                          <div class="timer-label">Mins</div>
                        </div>
                        <div class="glass-timer-panel timer-panel-secs">
                          <div class="timer-num secs-num deal-countdown-secs" style="color: ${theme.timerAccent};" id="deals-time-seconds">${timeInfo.seconds < 10 ? '0' + timeInfo.seconds : timeInfo.seconds}</div>
                          <div class="timer-label">Secs</div>
                        </div>
                      </div>

                      <!-- Action Buttons -->
                      <div class="deals-actions-row">
                        <button class="deals-shop-now-btn" id="btn-scroll-deals-grid" style="background: ${theme.btnBg}; box-shadow: ${theme.btnShadow};">
                          <span>Découvrir les Offres</span>
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                        </button>
                        
                        <button class="deals-view-all-btn" id="btn-deals-goto-catalog">
                          Voir Tout le Catalogue
                        </button>
                      </div>

                    </div>

                    <!-- Bottom Section: Sliding Products Marquee Rail -->
                    <div class="deals-marquee-container">
                      <div class="deals-marquee-content" id="deals-marquee-track">
                        ${[...dealProducts, ...dealProducts, ...dealProducts].map(p => `
                          <div class="deals-marquee-card" data-product-id="${p.id}">
                            <div class="marquee-card-thumb">
                              <img src="${p.image}" alt="${p.name}">
                            </div>
                            <div class="marquee-card-info">
                              <span class="marquee-prod-name">${p.name}</span>
                              <span class="marquee-prod-price" style="color: ${theme.accentColor};">${formatPrice(p.price)}</span>
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    </div>

                  </div>
                </div>

                <!-- 2 Lines x 6 Products Grid = 12 Items Total -->
                <div class="product-grid todays-deals-grid-2x6" id="grid-todays-deals"></div>
              </div>
            `;
          }
        } else if (s.type === 'deals') {
          homepageSectionsHTML += `
            <!-- Hot Deals Section (Slidable 1-Line Row) -->
            <div class="home-section" style="margin-bottom: 40px;">
              <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
                <h3 class="section-title" style="margin: 0;">${this.formatSectionTitleHtml(s.name)}</h3>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button class="view-all-btn" data-target-page="deals">View All →</button>
                  <button class="carousel-control-btn prev-btn" data-target-carousel="grid-hot-deals" title="Précédent" style="border: 1px solid var(--border); border-radius: 8px; width: 34px; height: 34px; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;">←</button>
                  <button class="carousel-control-btn next-btn" data-target-carousel="grid-hot-deals" title="Suivant" style="border: 1px solid var(--border); border-radius: 8px; width: 34px; height: 34px; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;">→</button>
                </div>
              </div>
              <div class="carousel-scroll-wrapper slidable-product-row" id="grid-hot-deals"></div>
            </div>
          `;
        } else if (s.type === 'new-arrivals') {
          homepageSectionsHTML += `
            <!-- New Arrivals Section (Slidable 1-Line Row) -->
            <div class="home-section" style="margin-bottom: 40px;">
              <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
                <h3 class="section-title" style="margin: 0;">${this.formatSectionTitleHtml(s.name)}</h3>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button class="view-all-btn" data-target-page="new-arrivals">View All →</button>
                  <button class="carousel-control-btn prev-btn" data-target-carousel="grid-new-arrivals" title="Précédent" style="border: 1px solid var(--border); border-radius: 8px; width: 34px; height: 34px; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;">←</button>
                  <button class="carousel-control-btn next-btn" data-target-carousel="grid-new-arrivals" title="Suivant" style="border: 1px solid var(--border); border-radius: 8px; width: 34px; height: 34px; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;">→</button>
                </div>
              </div>
              <div class="carousel-scroll-wrapper slidable-product-row" id="grid-new-arrivals"></div>
            </div>
          `;
        } else if (s.type === 'best-sellers') {
          homepageSectionsHTML += `
            <!-- Best Sellers Section (Slidable 1-Line Row) -->
            <div class="home-section" style="margin-bottom: 40px;">
              <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
                <h3 class="section-title" style="margin: 0;">${this.formatSectionTitleHtml(s.name)}</h3>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button class="view-all-btn" data-target-page="best-sellers">View All →</button>
                  <button class="carousel-control-btn prev-btn" data-target-carousel="grid-best-sellers" title="Précédent" style="border: 1px solid var(--border); border-radius: 8px; width: 34px; height: 34px; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;">←</button>
                  <button class="carousel-control-btn next-btn" data-target-carousel="grid-best-sellers" title="Suivant" style="border: 1px solid var(--border); border-radius: 8px; width: 34px; height: 34px; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;">→</button>
                </div>
              </div>
              <div class="carousel-scroll-wrapper slidable-product-row" id="grid-best-sellers"></div>
            </div>
          `;
        } else if (s.type === 'grid') {
          homepageSectionsHTML += `
            <div class="home-section" style="margin-bottom: 40px;">
              <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
                <h3 class="section-title" style="font-size: 20px; font-weight: 850; color: var(--text-dark); margin: 0; display: flex; align-items: center; gap: 8px;">
                  <span>${this.formatSectionTitleHtml(s.name)}</span>
                  ${s.category ? `<span style="font-size: 11px; font-weight: 700; color: var(--primary); background: var(--primary-light); padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-left: 4px;">${s.category}</span>` : ''}
                </h3>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button class="carousel-control-btn prev-btn" data-target-carousel="grid-dynamic-${s.id}" title="Précédent" style="border: 1px solid var(--border); border-radius: 8px; width: 34px; height: 34px; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;">←</button>
                  <button class="carousel-control-btn next-btn" data-target-carousel="grid-dynamic-${s.id}" title="Suivant" style="border: 1px solid var(--border); border-radius: 8px; width: 34px; height: 34px; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;">→</button>
                </div>
              </div>
              <div class="carousel-scroll-wrapper slidable-product-row" id="grid-dynamic-${s.id}"></div>
            </div>
          `;
        } else if (s.type === 'carousel') {
          homepageSectionsHTML += `
            <div class="home-section" style="margin-bottom: 40px;">
              <div class="section-header" style="margin-bottom: 24px;">
                <h3 class="section-title" style="font-size: 22px; font-weight: 850; color: var(--text-dark); margin:0;">${this.formatSectionTitleHtml(s.name)}</h3>
                <div style="display: flex; gap: 8px;">
                  <button class="carousel-control-btn prev-btn" id="btn-prev-${s.id}" style="border: 1px solid var(--border); border-radius: 8px; width: 36px; height: 36px; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;">←</button>
                  <button class="carousel-control-btn next-btn" id="btn-next-${s.id}" style="border: 1px solid var(--border); border-radius: 8px; width: 36px; height: 36px; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;">→</button>
                </div>
              </div>
              <div class="carousel-scroll-wrapper slidable-product-row" id="carousel-${s.id}" style="overflow-x: auto; scroll-behavior: smooth; display: flex; gap: 20px; padding-bottom: 12px;">
                <!-- Appended dynamically -->
              </div>
            </div>
          `;
        } else if (s.type === 'banner') {
          homepageSectionsHTML += `
            <div class="hero-banner-promo" style="
              background: linear-gradient(135deg, var(--primary) 0%, var(--primary-accent) 100%);
              border-radius: 24px;
              padding: 48px;
              color: white;
              margin-bottom: 40px;
              position: relative;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0, 82, 204, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.1);
            ">
              <div style="position: absolute; right: -50px; bottom: -50px; width: 300px; height: 300px; background: rgba(255, 255, 255, 0.1); filter: blur(60px); border-radius: 50%;"></div>
              <div style="max-width: 550px; position: relative; z-index: 2; display: flex; flex-direction: column; gap: 16px;">
                <span style="font-size: 11px; font-weight: 800; background: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 20px; width: fit-content; text-transform: uppercase; letter-spacing: 0.5px;">PROMOTION</span>
                <h2 style="font-size: 32px; font-weight: 850; margin: 0; color: white; line-height: 1.2;">${s.name}</h2>
                <p style="font-size: 15px; color: rgba(255, 255, 255, 0.85); margin: 0; line-height: 1.6;">Discover our limited release custom collections filtered by ${s.category}. Save up to 20% today.</p>
                <button class="shop-now-btn" style="background: white; color: var(--primary); border: none; padding: 12px 28px; border-radius: 12px; font-weight: 800; font-size: 14px; cursor: pointer; width: fit-content; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-top: 8px;" data-category="${s.category}">Shop ${s.category} Now</button>
              </div>
            </div>
          `;
        }
      });

      contentArea.innerHTML = `
        ${homepageSectionsHTML}

        <div class="home-section" id="for-you-section" style="margin-bottom: 40px;">
          <div class="section-header" style="margin-bottom: 24px;">
            <h3 class="section-title" style="font-size: 22px; font-weight: 850; color: var(--text-dark); margin:0;">For You</h3>
          </div>
          <div class="home-grid-4" id="grid-for-you"></div>
          
          <div id="for-you-loading" style="display: flex; justify-content: center; align-items: center; padding: 40px; font-weight: 750; color: #ff2e93; gap: 10px; font-size: 14px; opacity: 0; transition: opacity 0.2s ease;">
            <svg width="20" height="20" viewBox="0 0 50 50" style="animation: rotate 1s linear infinite; fill: none; stroke: #ff2e93; stroke-width: 5; stroke-linecap: round;">
              <circle cx="25" cy="25" r="20" stroke-dasharray="80, 200" stroke-dashoffset="0"></circle>
            </svg>
            Loading more premium gear...
          </div>
        </div>
      `;

      this.injectHomeProducts();
      this.startCountdownTimer();
      this.attachHomeCarouselListeners(activeSortedSections);

    } else if (this.currentPage === 'catalog') {
      const isSearchActive = Boolean(this.currentQuery && this.currentQuery.trim() !== '');

      // Hierarchical dynamic breadcrumbs
      const allCatsList = JSON.parse(getStorageItem('SWEETOS_categories') || '[]');
      const activeCatObj = allCatsList.find(c => c && (
        String(c.name || '').trim().toLowerCase() === String(this.currentCategory).trim().toLowerCase() ||
        String(c.id) === String(this.currentCategory)
      ));
      
      let parentCatObj = null;
      if (activeCatObj && activeCatObj.parent) {
        parentCatObj = allCatsList.find(c => c && (
          String(c.id) === String(activeCatObj.parent) ||
          String(c.name || '').trim().toLowerCase() === String(activeCatObj.parent).trim().toLowerCase()
        ));
      }

      let breadcrumbsHTML = `<span class="breadcrumb-link" id="crumb-home" style="cursor: pointer; transition: color 0.2s ease;">Accueil</span> <span>/</span> <span class="breadcrumb-link" id="crumb-catalog-all" style="cursor: pointer; transition: color 0.2s ease;">Catalogue</span>`;
      
      if (isSearchActive) {
        breadcrumbsHTML += ` <span>/</span> <span>Recherche</span> <span>/</span> <span style="color: var(--primary); font-weight: 750;">"${this.currentQuery}"</span>`;
      } else if (this.currentBrand) {
        breadcrumbsHTML += ` <span>/</span> <span>Marques</span> <span>/</span> <span style="color: var(--primary); font-weight: 750;">${this.currentBrand}</span>`;
      } else if (this.currentCategory !== 'All') {
        if (parentCatObj) {
          breadcrumbsHTML += ` <span>/</span> <span class="breadcrumb-link crumb-parent-cat" data-parent="${parentCatObj.name}" style="cursor: pointer; transition: color 0.2s ease;">${parentCatObj.name}</span>`;
        }
        breadcrumbsHTML += ` <span>/</span> <span style="color: var(--primary); font-weight: 800;">${this.currentCategory}</span>`;
      }

      // Brand list for filter dropdown
      const brandOptions = Array.from(new Set(this.products.map(p => p.brand).filter(Boolean))).sort();

      contentArea.innerHTML = `
        <!-- Breadcrumbs Navigation -->
        <nav style="display: flex; gap: 8px; font-size: 13px; color: var(--text-gray); font-weight: 600; margin-bottom: 22px; align-items: center; flex-wrap: wrap;">
          ${breadcrumbsHTML}
        </nav>

        ${isSearchActive ? `
          <!-- Active Global Search Banner -->
          <div class="search-active-banner glass-panel animate-in" style="background: white; border: 1.5px solid var(--border); border-radius: 20px; padding: 18px 24px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 24px;">🔍</span>
              <div>
                <h4 style="margin: 0; font-size: 17px; font-weight: 850; color: #0f172a;">
                  Résultats pour "<span style="color: var(--primary);">${this.currentQuery}</span>"
                </h4>
                <span style="font-size: 13px; color: #64748b;" id="catalog-count-badge">Recherche globale</span>
              </div>
            </div>
            <button id="catalog-clear-search-btn" class="btn-secondary" style="height: 38px; padding: 0 18px; font-size: 13px; font-weight: 750; border-radius: 12px; background: #f1f5f9; border: 1px solid var(--border); cursor: pointer; color: #0f172a; transition: all 0.2s;">
              ✕ Effacer la recherche / Voir tout
            </button>
          </div>
        ` : `
          <!-- Luxury Dynamic Category Hero Banner -->
          <div class="category-hero-banner-luxury animate-in" id="category-hero-banner-container">
            <!-- Dynamically injected via renderCategoryHeroBanner() -->
          </div>
        `}

        <!-- Dynamic Hierarchical Subcategory Navigation System -->
        <div id="category-smart-pills-row" class="category-pills-row" style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px; overflow-x: auto; padding-bottom: 6px;">
          <!-- Dynamically populated in injectCatalogPills() -->
        </div>

        <!-- Modern Category Controls & Filters Toolbar -->
        <div class="category-toolbar-container animate-in" id="category-toolbar">
          <div class="category-toolbar-left">
            <div class="category-search-box">
              <span style="font-size: 14px; margin-right: 6px; opacity: 0.6;">🔍</span>
              <input type="text" id="cat-local-search" placeholder="Filtrer dans cette catégorie..." value="${this.catalogLocalQuery || ''}">
            </div>

            <select id="cat-brand-select" class="category-toolbar-select">
              <option value="All" ${this.catalogBrandFilter === 'All' ? 'selected' : ''}>Toutes les marques</option>
              ${brandOptions.map(b => `<option value="${b}" ${this.catalogBrandFilter === b ? 'selected' : ''}>${b}</option>`).join('')}
            </select>

            <select id="cat-sort-select" class="category-toolbar-select">
              <option value="featured" ${this.catalogSort === 'featured' ? 'selected' : ''}>✨ Tri : En vedette</option>
              <option value="price_low" ${this.catalogSort === 'price_low' ? 'selected' : ''}>💰 Prix : Moins cher</option>
              <option value="price_high" ${this.catalogSort === 'price_high' ? 'selected' : ''}>💎 Prix : Plus cher</option>
              <option value="rating" ${this.catalogSort === 'rating' ? 'selected' : ''}>⭐ Mieux notés</option>
              <option value="newest" ${this.catalogSort === 'newest' ? 'selected' : ''}>🔥 Nouveautés</option>
            </select>

            <button id="cat-stock-toggle" class="category-stock-toggle-btn ${this.catalogInStockOnly ? 'active' : ''}">
              <span>📦</span> En stock uniquement
            </button>
          </div>

          <div class="category-toolbar-right">
            <span class="category-count-pill" id="cat-count-pill">0 articles</span>
          </div>
        </div>

        <!-- Product Grid & Sections -->
        <div id="catalog-grouped-sections"></div>
        <div class="no-results" id="no-results" style="display: none;"></div>
      `;

      if (!isSearchActive) {
        this.renderCategoryHeroBanner();
      }
      this.injectCatalogPills();
      this.injectCatalogProducts();
      this.attachCatalogHeaderListeners();

    } else if (this.currentPage === 'deals') {
      contentArea.innerHTML = `
        <!-- Sleek Samsung Count Down Hero Banner -->
        <div class="deals-hero-banner animate-in">
          <!-- Background oval glow shape in banner -->
          <div class="deals-hero-glow"></div>
          
          <div class="deals-hero-content">
            <span class="deals-hero-badge">🔥 LIMITED TIME OFFER</span>
            <h2>Smartphones & Tablets</h2>
            <p>Hurry! Take advantage of discounts of up to 50% on our collection.</p>
            
            <!-- Countdown Columns Row -->
            <div class="deals-countdown-row">
              <div class="deals-countdown-block">
                <span class="time-num" id="deals-days">06</span>
                <span class="time-lbl">DAYS</span>
              </div>
              <div class="deals-countdown-block">
                <span class="time-num" id="deals-hours">23</span>
                <span class="time-lbl">HOURS</span>
              </div>
              <div class="deals-countdown-block">
                <span class="time-num" id="deals-mins">59</span>
                <span class="time-lbl">MINS</span>
              </div>
              <div class="deals-countdown-block">
                <span class="time-num" id="deals-secs">00</span>
                <span class="time-lbl">SECS</span>
              </div>
            </div>
            <!-- Countdown Columns Row Ends -->
          </div>
        </div>

        <div class="shop-header" style="margin-top: 10px;">
          <h3 class="shop-title">Hot Deals & Promos</h3>
          <p class="shop-subtitle">Save on premium desk pads, mechanical modules, and DAC hardware.</p>
        </div>
        <div class="product-grid" id="grid-deals"></div>
      `;
      this.injectCategorizedProducts('deals');
      this.startDealsCountdownTimer();
      this.attachDealsHeroListeners();

    } else if (this.currentPage === 'new-arrivals') {
      contentArea.innerHTML = `
        <div class="page-hero-banner page-new-arrivals animate-in">
          <div class="page-hero-glow"></div>
          <div class="page-hero-content">
            <span class="page-hero-badge">✨ FRESH ARRIVALS</span>
            <h2>New Arrivals</h2>
            <p>The absolute latest additions in keycaps, wall hexagon tiles, and accent shelves.</p>
          </div>
        </div>
        <div class="product-grid" id="grid-new"></div>
      `;
      this.injectCategorizedProducts('new');

    } else if (this.currentPage === 'best-sellers') {
      contentArea.innerHTML = `
        <div class="page-hero-banner page-best-sellers animate-in">
          <div class="page-hero-glow"></div>
          <div class="page-hero-content">
            <span class="page-hero-badge">🏆 POPULAR SELECTIONS</span>
            <h2>Best Sellers</h2>
            <p>Our most popular community choices in dynamic audio, mechanical switches, and premium layouts.</p>
          </div>
        </div>
        <div class="product-grid" id="grid-best"></div>
      `;
      this.injectCategorizedProducts('best');

    } else if (this.currentPage === 'brands') {
      const storedBrands = JSON.parse(sessionStorage.getItem('SWEETOS_brands') || '[]');
      const isAll = !this.currentBrandFilter || this.currentBrandFilter === 'All';
      const activeBrandObj = storedBrands.find(b => b && b.name && b.name.toLowerCase() === (this.currentBrandFilter || '').toLowerCase());

      contentArea.innerHTML = `
        <!-- Hierarchical Breadcrumbs Navigation -->
        <nav style="display: flex; gap: 6px; font-size: 13px; color: #64748b; font-weight: 600; margin-bottom: 22px; align-items: center; flex-wrap: wrap;">
          <span style="cursor: pointer; color: #475569; transition: color 0.2s;" id="crumb-home">Accueil</span>
          <span style="opacity: 0.4;">/</span>
          <span style="cursor: pointer; color: ${isAll ? 'var(--primary)' : '#475569'}; font-weight: ${isAll ? '750' : '600'};" id="crumb-brand-all">Nos Marques</span>
          ${!isAll ? `
            <span style="opacity: 0.4;">/</span>
            <span style="color: var(--primary); font-weight: 750;">${activeBrandObj?.name || this.currentBrandFilter}</span>
          ` : ''}
        </nav>

        <!-- Dynamic Luxury Brand Hero Banner Container -->
        <div class="brand-hero-banner-luxury animate-in" id="brand-hero-banner-container">
          <!-- Populated in renderBrandHeroBanner() -->
        </div>

        <!-- Smart Brand Navigation Pills Row -->
        <div class="category-pills-row brand-pills-row" id="brand-smart-pills-row" style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 28px;">
          <!-- Populated in injectBrandPills() -->
        </div>

        <!-- Modern Brand Controls & Filtering Toolbar -->
        <div class="brand-toolbar-container animate-in" id="brand-toolbar">
          <div class="brand-toolbar-left">
            <div class="brand-search-box">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748b" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="brand-local-search" placeholder="Rechercher dans cette marque..." value="${this.brandLocalQuery || ''}">
            </div>
            
            <select class="brand-toolbar-select" id="brand-cat-select" aria-label="Filtrer par catégorie">
              <option value="All" ${this.brandCategoryFilter === 'All' ? 'selected' : ''}>Toutes les catégories</option>
              ${(() => {
                const cats = JSON.parse(sessionStorage.getItem('SWEETOS_categories') || '[]');
                return cats.map(c => `
                  <option value="${c.name || c}" ${this.brandCategoryFilter === (c.name || c) ? 'selected' : ''}>${c.name || c}</option>
                `).join('');
              })()}
            </select>
          </div>

          <div class="brand-toolbar-right">
            <button class="brand-stock-toggle-btn ${this.brandInStockOnly ? 'active' : ''}" id="brand-stock-toggle" title="Afficher uniquement les articles en stock">
              <span>📦</span>
              <span>En stock uniquement</span>
            </button>

            <select class="brand-toolbar-select" id="brand-sort-select" aria-label="Trier les articles">
              <option value="featured" ${this.brandSort === 'featured' ? 'selected' : ''}>🌟 Recommandés</option>
              <option value="price_low" ${this.brandSort === 'price_low' ? 'selected' : ''}>💵 Prix: Croissant</option>
              <option value="price_high" ${this.brandSort === 'price_high' ? 'selected' : ''}>💎 Prix: Décroissant</option>
              <option value="rating" ${this.brandSort === 'rating' ? 'selected' : ''}>⭐ Mieux Notés</option>
              <option value="newest" ${this.brandSort === 'newest' ? 'selected' : ''}>🚀 Nouveautés</option>
            </select>

            <span class="brand-count-pill" id="brand-count-pill">0 articles</span>
          </div>
        </div>

        <!-- Brand Grouped / Grid Container -->
        <div id="brands-grouped-container"></div>
      `;

      this.renderBrandHeroBanner();
      this.injectBrandPills();
      this.injectBrandsGrouped();
      this.attachBrandHeaderListeners();

    } else if (this.currentPage === 'collections') {
      contentArea.innerHTML = `
        <div class="page-hero-banner page-collections animate-in">
          <div class="page-hero-glow"></div>
          <div class="page-hero-content-wrapper">
            <div class="page-hero-content">
              <span class="page-hero-badge">🎒 DESIGN BLUEPRINTS</span>
              <h2>Curated Workspace Collections</h2>
              <p>Pre-packaged theme setups designed by workspace specialists. Elevate your focus in one click.</p>
            </div>
            <button class="btn-primary" id="col-header-create-btn" style="height: 40px; padding: 0 20px; font-weight: 750; border-radius: 10px; background: white; color: var(--primary); border: none; cursor: pointer; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              + Create Collection
            </button>
          </div>
        </div>
        <div class="collections-dashboard-grid" id="collections-dashboard-grid"></div>
      `;
      this.injectCuratedCollections();
      this.attachCollectionsHeaderListeners();

    } else if (this.currentPage === 'wishlist') {
      const wishlist = this.loadWishlistFromStorage();
      const totalWishlistValue = wishlist.reduce((sum, p) => sum + (p.price || 0), 0);

      contentArea.innerHTML = `
        <div class="wishlist-container animate-in" style="max-width: 1280px; margin: 0 auto; padding: 0 16px 40px 16px;">
          <!-- Top Hero Banner -->
          <div class="page-hero-banner page-wishlist animate-in" style="margin-bottom: 24px; background: linear-gradient(135deg, #0b1a30 0%, #172554 100%); border-radius: 24px; padding: 32px 36px; position: relative; overflow: hidden; box-shadow: 0 12px 32px rgba(11,26,48,0.2);">
            <div class="page-hero-glow" style="position: absolute; top: -50%; right: -20%; width: 300px; height: 300px; background: rgba(225, 29, 72, 0.25); filter: blur(60px); border-radius: 50%;"></div>
            <div class="page-hero-content-wrapper" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; position: relative; z-index: 1;">
              <div class="page-hero-content">
                <span class="page-hero-badge" style="background: rgba(225, 29, 72, 0.15); color: #f43f5e; border: 1px solid rgba(225, 29, 72, 0.3); padding: 4px 12px; border-radius: 20px; font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; margin-bottom: 8px;">
                  💖 ARTICLES FAVORIS
                </span>
                <h2 style="font-size: 28px; font-weight: 900; color: white; margin: 0 0 6px 0; letter-spacing: -0.5px;">
                  Votre Liste de Souhaits (${wishlist.length})
                </h2>
                <p style="font-size: 14px; color: rgba(255,255,255,0.75); margin: 0; max-width: 500px;">
                  Conservez vos équipements favoris et commandez-les en un clic. Valeur totale: <strong style="color: white;">${formatPrice(totalWishlistValue)}</strong>
                </p>
              </div>
              
              ${wishlist.length > 0 ? `
                <div class="wishlist-hero-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
                  <button class="btn-primary" id="wishlist-move-all-btn" style="height: 42px; padding: 0 20px; font-size: 13.5px; font-weight: 800; border-radius: 12px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(0,82,204,0.3);">
                    <span>🛒</span> Tout ajouter au panier
                  </button>
                  <button class="btn-secondary" id="wishlist-share-wa-btn" style="height: 42px; padding: 0 18px; font-size: 13.5px; font-weight: 800; border-radius: 12px; background: #25d366; color: white; border: none; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <span>📲</span> Partager (WhatsApp)
                  </button>
                  <button class="btn-secondary" id="wishlist-clear-btn" style="height: 42px; padding: 0 16px; font-size: 13px; font-weight: 750; border-radius: 12px; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); border: 1.5px solid rgba(255,255,255,0.2); cursor: pointer;">
                    🗑️ Vider
                  </button>
                </div>
              ` : ''}
            </div>
          </div>

          ${wishlist.length === 0 ? `
            <div class="wishlist-empty-card glass-panel" style="margin-top: 24px; padding: 60px 24px; text-align: center; border-radius: 24px; border: 1.5px solid var(--border); background: white;">
              <div class="wishlist-floating-heart" style="font-size: 54px; margin-bottom: 16px; animation: pulse 2s infinite;">💖</div>
              <h4 style="font-size: 20px; font-weight: 850; color: #0f172a; margin: 0 0 8px 0;">Votre liste de favoris est vide</h4>
              <p style="font-size: 14px; color: #64748b; max-width: 460px; margin: 0 auto 24px auto; line-height: 1.6;">
                Enregistrez vos articles préférés en cliquant sur le cœur afin de les retrouver facilement et passer commande plus tard !
              </p>
              <button class="btn-primary wishlist-browse-btn" id="wishlist-explore-btn" style="padding: 12px 28px; font-size: 14px; font-weight: 800; border-radius: 12px;">
                Explorer le Catalogue 🛍️
              </button>
            </div>
          ` : `
            <div class="home-grid-4" style="margin-top: 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px;">
              ${wishlist.map(p => {
                const inStock = p.stock === undefined || p.stock > 0;
                return `
                  <div class="wishlist-item-card glass-panel animate-in" data-id="${p.id}" style="background: white; border: 1.5px solid var(--border); border-radius: 20px; padding: 16px; position: relative; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease;">
                    <button class="wishlist-item-remove-btn" data-id="${p.id}" title="Retirer des favoris" style="position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; border-radius: 50%; background: #f8fafc; border: 1px solid var(--border); font-size: 18px; color: #94a3b8; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; z-index: 2;">×</button>
                    
                    <div>
                      <div class="wishlist-item-image" style="width: 100%; height: 180px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 14px; overflow: hidden; margin-bottom: 14px; cursor: pointer;">
                        <img src="${p.image}" alt="${p.name}" loading="lazy" style="max-width: 90%; max-height: 90%; object-fit: contain; transition: transform 0.3s ease;">
                      </div>
                      
                      <div class="wishlist-item-details">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                          <span class="wishlist-item-cat" style="font-size: 11px; font-weight: 750; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px;">
                            ${p.category || 'Équipement'}
                          </span>
                          <span style="font-size: 10.5px; font-weight: 800; padding: 3px 8px; border-radius: 6px; background: ${inStock ? '#ecfdf5' : '#fef2f2'}; color: ${inStock ? '#059669' : '#dc2626'};">
                            ${inStock ? '✓ En stock' : '✕ Rupture'}
                          </span>
                        </div>
                        <h4 class="wishlist-item-title" style="font-size: 14.5px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; line-height: 1.4; cursor: pointer;">
                          ${p.name}
                        </h4>
                        <div class="wishlist-item-price" style="font-size: 17px; font-weight: 900; color: #0052cc; margin-bottom: 14px;">
                          ${formatPrice(p.price)}
                        </div>
                      </div>
                    </div>

                    <div class="wishlist-item-actions">
                      <button class="wishlist-add-to-cart-btn btn-primary" data-id="${p.id}" style="width: 100%; height: 40px; border-radius: 10px; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <span>🛒</span> Ajouter au Panier
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      `;

      this.attachWishlistListeners();

    } else if (['about-us', 'terms', 'refund', 'contact'].includes(this.currentPage)) {
      contentArea.innerHTML = `
        <div class="about-page-container animate-in" style="padding-bottom: 40px;">
          <div class="page-hero-banner page-about animate-in" style="margin-bottom: 24px;">
            <div class="page-hero-glow"></div>
            <div class="page-hero-content">
              <span class="page-hero-badge">🌿 KNOWLEDGE BASE</span>
              <h2>SWEETOS Information Desk</h2>
              <p>Explore our company story, design standards, policies, or contact our support concierge.</p>
            </div>
          </div>

          <!-- Dynamic Page Navigation Tabs -->
          <div class="profile-sidebar-tabs" style="display: flex; flex-direction: row; gap: 12px; margin-bottom: 24px; width: 100%; border-bottom: 1.5px solid var(--border); padding-bottom: 16px; justify-content: flex-start; flex-wrap: wrap;">
            <button class="profile-tab-btn ${this.currentPage === 'about-us' ? 'active' : ''}" data-nav-page="about-us" style="margin: 0; padding: 10px 20px; border-radius: 10px; height: auto;">
              🌿 About Us
            </button>
            <button class="profile-tab-btn ${this.currentPage === 'terms' ? 'active' : ''}" data-nav-page="terms" style="margin: 0; padding: 10px 20px; border-radius: 10px; height: auto;">
              📄 Terms & Conditions
            </button>
            <button class="profile-tab-btn ${this.currentPage === 'refund' ? 'active' : ''}" data-nav-page="refund" style="margin: 0; padding: 10px 20px; border-radius: 10px; height: auto;">
              🔄 Refund Policy
            </button>
            <button class="profile-tab-btn ${this.currentPage === 'contact' ? 'active' : ''}" data-nav-page="contact" style="margin: 0; padding: 10px 20px; border-radius: 10px; height: auto;">
              ✉️  Contact Us
            </button>
          </div>

          <!-- Tab Content Panel -->
          <div class="about-content-panel" id="about-tab-content" style="background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1.5px solid var(--border); border-radius: 20px; padding: 40px; box-shadow: 0 10px 30px rgba(0, 82, 204, 0.02);">
            <!-- Swapped tab content dynamically injected -->
          </div>
        </div>
      `;

      this.activeAboutTab = this.currentPage;
      this.injectAboutTabContent();
      this.attachAboutPageListeners();

    } else if (this.currentPage === 'coupons') {
      let scratchcardsList = [];
      try {
        const loggedInUserStr = sessionStorage.getItem('SWEETOS_logged_in_user');
        if (loggedInUserStr) {
          const scratchKey = getScratchcardsStorageKey();
          const stored = sessionStorage.getItem(scratchKey);
          let rawList = stored ? JSON.parse(stored) : [];
          const now = Date.now();

          let userEmail = '';
          try {
            userEmail = JSON.parse(loggedInUserStr).email?.toLowerCase().trim() || '';
          } catch(e) {}

          // Filter cards for current user, and exclude expired unscratched cards
          scratchcardsList = rawList.filter(card => {
            if (!card.scratched && card.expiresAt && now > card.expiresAt) {
              return false;
            }
            if (userEmail && card.email && card.email.toLowerCase().trim() !== userEmail) {
              return false;
            }
            return true;
          });
        }
      } catch(e) {}
      
      if (this.currentCouponCode) {
        let couponsList = [];
        try {
          couponsList = JSON.parse(sessionStorage.getItem('SWEETOS_coupons') || '[]');
        } catch(e) {}
        const c = couponsList.find(item => item.code === this.currentCouponCode);
        if (c) {
          const discountText = c.type === 'percentage' ? `${c.value}% OFF` : `${formatPrice(c.value)} OFF`;
          contentArea.innerHTML = `
            <div class="pdp-container animate-in" style="max-width: 600px; margin: 0 auto; padding-top: 20px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; flex-wrap: wrap; gap: 12px;">
                <button class="pdp-back-btn" id="coupon-back-btn">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 16px; height: 16px; transform: scaleX(-1);"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  Retour / Back
                </button>
                <div class="pdp-breadcrumb" style="margin: 0;">
                  <span class="pdp-crumb-item" id="coupon-crumb-home">Home</span>
                  <span class="pdp-crumb-sep">›</span>
                  <span class="pdp-crumb-item" id="coupon-crumb-list">Coupons</span>
                  <span class="pdp-crumb-sep">›</span>
                  <span class="pdp-crumb-current">${c.code}</span>
                </div>
              </div>

              <div class="glass-panel" style="border: 2px dashed var(--primary); padding: 40px; border-radius: 24px; text-align: center; background: rgba(255, 255, 255, 0.4); box-shadow: 0 10px 30px rgba(0,0,0,0.05); position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; gap: 24px;">
                <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: var(--primary-light); filter: blur(50px); border-radius: 50%; z-index: 1;"></div>
                
                <div style="font-size: 48px; position: relative; z-index: 2;">🎫</div>
                
                <div style="position: relative; z-index: 2;">
                  <h2 style="font-size: 28px; font-weight: 850; color: var(--text-dark); margin: 0 0 8px 0;">${discountText}</h2>
                  <p style="font-size: 14px; color: var(--text-gray); font-weight: 600; margin: 0;">Promo Code Voucher</p>
                </div>

                <div style="background: white; border: 1.5px solid var(--border); padding: 16px 32px; border-radius: 16px; font-size: 24px; font-weight: 900; letter-spacing: 2px; color: var(--primary); display: inline-block; cursor: pointer; position: relative; z-index: 2; box-shadow: 0 4px 12px rgba(0,0,0,0.03);" id="detail-coupon-code-box" title="Click to copy code">
                  ${c.code}
                </div>

                <div style="width: 100%; border-top: 1.5px solid var(--border); margin: 10px 0; position: relative; z-index: 2;"></div>

                <div style="text-align: left; width: 100%; display: flex; flex-direction: column; gap: 10px; font-size: 13.5px; color: var(--text-dark); position: relative; z-index: 2;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-light); font-weight: 600;">Minimum Order:</span>
                    <strong style="font-weight: 750;">${c.minOrder ? `${formatPrice(c.minOrder)}` : 'No minimum order'}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-light); font-weight: 600;">Expires On:</span>
                    <strong style="font-weight: 750;">${c.expiry}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-light); font-weight: 600;">Status:</span>
                    <span style="font-weight: 800; color: #36b37e; text-transform: uppercase;">Active</span>
                  </div>
                </div>

                <div style="display: flex; gap: 12px; width: 100%; margin-top: 16px; position: relative; z-index: 2;">
                  <button id="detail-coupon-apply-btn" style="flex: 1; background: var(--primary); color: white; border: none; padding: 14px; border-radius: 12px; font-weight: 800; font-size: 14px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px var(--primary-light);">
                    Apply to Cart
                  </button>
                  <button id="detail-coupon-share-btn" style="background: #25d366; color: white; border: none; padding: 14px 20px; border-radius: 12px; font-weight: 850; font-size: 14px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px;" title="Partager sur WhatsApp">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="width: 18px; height: 18px;"><path d="M17.472 14.382c-.022-.08-.124-.184-.282-.232-.078-.024-.464-.232-.536-.252-.072-.02-.124-.03-.178.05-.054.082-.21.26-.258.312-.048.052-.096.06-.178.02a1.866 1.866 0 0 1-.502-.308c-.287-.25-.482-.56-.538-.65-.056-.092-.006-.142.04-.188.04-.04.096-.11.144-.168.048-.058.064-.1.096-.168.032-.068.016-.128-.008-.178-.024-.05-.178-.436-.244-.594-.064-.158-.13-.136-.178-.138-.046-.002-.098-.002-.15-.002a.287.287 0 0 0-.208.098c-.072.078-.276.27-.276.658 0 .388.282.764.32.816.04.052.556.85 1.348 1.192.188.082.336.13.45.166.19.06.362.052.498.032.152-.022.464-.19.53-.374.066-.184.066-.342.046-.374-.022-.03-.078-.05-.156-.088zm-5.467 1.162a6.3 6.3 0 0 1-3.237-.893l-.233-.14-2.404.63 2.443-2.38-.152-.243a6.262 6.262 0 0 1-.958-3.326c0-3.468 2.82-6.29 6.29-6.29 3.47 0 6.29 2.822 6.29 6.29 0 3.47-2.82 6.29-6.29 6.29zm0-13.82c-4.148 0-7.527 3.38-7.527 7.527 0 1.326.347 2.62 1.006 3.766L4 19.5l4.636-1.216a7.487 7.487 0 0 0 3.37.804c4.148 0 7.527-3.378 7.527-7.527 0-4.15-3.38-7.527-7.527-7.527z"/></svg>
                    Partager / Share
                  </button>
                </div>
              </div>
            </div>
          `;
          this.attachCouponDetailListeners(c);
        } else {
          this.currentCouponCode = null;
          this.renderPageContent();
        }
      } else {
        let scratchCardsGridHtml = '';
        if (scratchcardsList.length === 0) {
          scratchCardsGridHtml = `
            <div class="glass-panel text-center animate-in" style="padding: 50px; border-radius: 16px; border: 1.5px solid var(--border); background: rgba(255, 255, 255, 0.4); text-align: center; width: 100%;">
              <span style="font-size: 36px; display: block; margin-bottom: 12px;">🎁</span>
              <h4 style="font-size: 16px; font-weight: 800; color: var(--text-dark); margin: 0 0 6px 0;">Aucune Boîte Mystère / No Mystery Boxes</h4>
              <p style="font-size: 13.5px; color: var(--text-gray); margin: 0;">Passez commande sur notre boutique pour recevoir automatiquement votre boîte mystère !</p>
            </div>
          `;
        } else {
          scratchCardsGridHtml = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;" class="animate-in">
              ${scratchcardsList.map(card => {
                if (!card.scratched) {
                  return `
                    <div style="position: relative; width: 280px; height: 180px; border-radius: 16px; overflow: hidden; border: 1.5px solid var(--border); box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                      <canvas class="scratch-canvas" data-scratchcard-id="${card.id}" width="280" height="180" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: crosshair; z-index: 10;"></canvas>
                      <div class="scratch-revealed-content" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; text-align: center; background: white; z-index: 5;">
                        <!-- Decided dynamically when scratching completes -->
                      </div>
                    </div>
                  `;
                } else {
                  if (card.couponWon === 'lost') {
                    return `
                      <div style="width: 280px; height: 180px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; text-align: center; background: rgba(255,255,255,0.7); border: 1.5px solid var(--border); box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
                        <span style="font-size: 32px; display: block; margin-bottom: 6px;">🍀</span>
                        <h4 style="font-size: 14px; font-weight: 850; color: var(--text-dark); margin: 0 0 4px 0;">Oups ! Bonne chance pour la prochaine fois !</h4>
                        <p style="font-size: 11.5px; color: var(--text-gray); margin: 0; line-height: 1.4;">${card.emptyMessage || 'Pour débloquer un coupon, achetez pour au moins le montant requis dans les Offres du Jour ou atteignez 50 000 FCFA !'}</p>
                      </div>
                    `;
                  } else {
                    const c = card.couponWon;
                    const discountText = c.type === 'percentage' ? `${c.value}% OFF` : `${formatPrice(c.value)} OFF`;
                    return `
                      <div class="unlocked-coupon-card" data-coupon-code="${c.code}" style="width: 280px; height: 180px; border-radius: 16px; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; box-sizing: border-box; background: white; border: 2px dashed var(--primary); box-shadow: 0 4px 15px rgba(0,0,0,0.03); cursor: pointer; transition: all 0.2s;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                          <span style="font-size: 20px;">🎉 GAGNÉ !</span>
                          <span style="font-size: 10px; font-weight: 800; color: var(--primary); background: var(--primary-light); padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">Won</span>
                        </div>
                        <div>
                          <h4 style="font-size: 16px; font-weight: 850; color: var(--text-dark); margin: 0 0 4px 0;">${discountText}</h4>
                          <code style="font-size: 13px; font-weight: 800; color: var(--primary); letter-spacing: 0.5px; background: var(--primary-light); padding: 3px 8px; border-radius: 4px; display: inline-block;">${c.code}</code>
                        </div>
                        <div style="border-top: 1px solid var(--border); padding-top: 8px; font-size: 11px; color: var(--text-gray); font-weight: 600; display: flex; justify-content: space-between; align-items: center; width: 100%;">
                          <span>Exp: ${c.expiry}</span>
                          <span style="color: var(--primary); font-weight: 800;">Détails →</span>
                        </div>
                      </div>
                    `;
                  }
                }
              }).join('')}
            </div>
          `;
        }
        
        const wonCoupons = scratchcardsList.filter(sc => sc.scratched && sc.couponWon !== 'lost').map(sc => sc.couponWon);
        let unlockedCouponsHtml = '';
        if (wonCoupons.length > 0) {
          unlockedCouponsHtml = `
            <div style="margin-top: 40px; width: 100%;">
              <h3 style="font-size: 18px; font-weight: 850; color: var(--text-dark); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                <span>🎫</span> Mes Coupons Débloqués / My Unlocked Coupons
              </h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;" class="animate-in">
                ${wonCoupons.map(c => {
                  const isBadge = c.badgeCoupon || (c.code && c.code.startsWith('BADGE5'));
                  const remaining = c.remainingUses !== undefined ? c.remainingUses : 5;
                  const total = c.totalUses || 5;
                  const discountText = c.type === 'percentage' ? `${c.value}% OFF` : `${formatPrice(c.value)} OFF`;
                  return `
                    <div class="unlocked-coupon-card" data-coupon-code="${c.code}" style="position: relative; background: ${isBadge ? 'rgba(0, 102, 255, 0.04)' : 'rgba(255, 255, 255, 0.4)'}; border: 2px dashed ${isBadge ? '#0066ff' : 'var(--border)'}; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; gap: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); transition: all 0.2s ease; min-height: 190px; cursor: pointer;">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                        <span style="font-size: 24px;">${isBadge ? '🎖️' : '🎟️'}</span>
                        <div style="display: flex; align-items: center; gap: 6px;">
                          ${isBadge ? `
                            <span style="font-size: 11px; font-weight: 850; color: white; background: #0066ff; padding: 4px 10px; border-radius: 8px;">
                              🔄 ${remaining}/${total} RESTANTES
                            </span>
                          ` : `
                            <span style="font-size: 11px; font-weight: 800; color: var(--primary); background: var(--primary-light); padding: 4px 10px; border-radius: 8px; text-transform: uppercase;">
                              Usage Unique
                            </span>
                          `}
                        </div>
                      </div>
                      
                      <div>
                        <h4 style="font-size: 18px; font-weight: 850; color: var(--text-dark); margin: 0 0 6px 0;">${discountText}</h4>
                        <code style="font-size: 14px; font-weight: 800; color: ${isBadge ? '#0066ff' : 'var(--primary)'}; letter-spacing: 0.5px; background: white; padding: 4px 10px; border-radius: 6px; border: 1.5px solid ${isBadge ? '#0066ff' : 'var(--border)'}; display: inline-block;">${c.code}</code>
                      </div>

                      <div style="border-top: 1px solid var(--border); padding-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: var(--text-gray); font-weight: 600;">
                        <span>${isBadge ? 'Sans expiration' : `Exp: ${c.expiry || '7 jours'}`}</span>
                        <span style="color: ${isBadge ? '#0066ff' : 'var(--primary)'}; font-weight: 800; display: flex; align-items: center; gap: 4px;">Détails →</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }

        contentArea.innerHTML = `
          <div class="about-page-container animate-in" style="padding-bottom: 40px;">
            <div class="page-hero-banner page-about animate-in" style="margin-bottom: 30px;">
              <div class="page-hero-glow"></div>
              <div class="page-hero-content">
                <span class="page-hero-badge">🎁 BOÎTES MYSTÈRES</span>
                <h2>Boîtes Mystères & Récompenses / Mystery Boxes & Rewards</h2>
                <p>Débloquez et grattez des boîtes mystères après la livraison de vos commandes pour gagner des coupons.</p>
              </div>
            </div>
            
            <h3 style="font-size: 18px; font-weight: 850; color: var(--text-dark); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span>🎁</span> Mes Boîtes Mystères / My Mystery Boxes
            </h3>
            
            ${scratchCardsGridHtml}
            ${unlockedCouponsHtml}
          </div>
        `;
        
        this.attachCouponsListListeners();
      }

    } else if (this.currentPage === 'profile') {
      contentArea.innerHTML = `
        <div class="page-hero-banner page-profile animate-in" style="margin-bottom: 24px;">
          <div class="page-hero-glow"></div>
          <div class="page-hero-content">
            <span class="page-hero-badge">👤 USER DASHBOARD</span>
            <h2>Profile Settings</h2>
            <p>Manage your account credentials, security access protocols, and cloud shipping addresses.</p>
          </div>
        </div>

        <div class="profile-page-container">
          <div class="profile-sidebar-tabs">
            <button class="profile-tab-btn ${this.activeProfileTab === 'overview' ? 'active' : ''}" data-tab="overview">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect>
                <rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect>
              </svg>
              Overview Dashboard
            </button>
            <button class="profile-tab-btn ${this.activeProfileTab === 'settings' ? 'active' : ''}" data-tab="settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
              </svg>
              Edit Profile Info
            </button>
            <button class="profile-tab-btn ${this.activeProfileTab === 'addresses' ? 'active' : ''}" data-tab="addresses">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>
              </svg>
              Saved Addresses
            </button>
            <button class="profile-tab-btn ${this.activeProfileTab === 'security' ? 'active' : ''}" data-tab="security">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Security & Safety
            </button>
            <button class="profile-tab-btn" id="profile-sign-out-btn" style="color: var(--red); margin-top: auto; border: 1px solid rgba(255, 86, 48, 0.15);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--red);">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Sign Out
            </button>
          </div>
          <div class="profile-content-panel glass-panel" id="profile-tab-content">
            <!-- Swapped tab content dynamically injected -->
          </div>
        </div>
      `;
      
      this.injectProfileTabContent();
      this.attachProfileTabListeners();

    } else if (this.currentPage === 'orders') {
      contentArea.innerHTML = `
        <div class="orders-page-container animate-in">
          <!-- Top Title Banner -->
          <div class="page-hero-banner page-orders animate-in" style="margin-bottom: 24px;">
            <div class="page-hero-glow"></div>
            <div class="page-hero-content-wrapper">
              <div class="page-hero-content">
                <span class="page-hero-badge">📦 LIVE TRACKING</span>
                <h2>Your Real-time Orders</h2>
                <p>Live tracking, real-time status sync, and cloud-persisted order management.</p>
              </div>
              <div class="header-action-block">
                <button class="orders-action-nav-btn btn-primary" id="orders-continue-shopping-btn" style="background: white; color: var(--primary); border: none; border-radius: 10px; height: 40px; padding: 0 20px; font-weight:750; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px; vertical-align:middle;">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                  Continue Shopping
                </button>
                <button class="orders-action-nav-btn btn-secondary" id="orders-export-btn" style="background: rgba(255,255,255,0.12); color: white; border: 1.5px solid rgba(255,255,255,0.25); border-radius: 10px; height: 40px; padding: 0 20px; font-weight:750;">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px; vertical-align:middle;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Export Order History
                </button>
              </div>
            </div>
          </div>

          <!-- Stats Cards Grid -->
          <div class="orders-stats-grid">
            <div class="order-stat-card glass-panel">
              <div class="stat-left">
                <span class="stat-label">TOTAL ORDERS</span>
                <span class="stat-value text-blue" id="stat-total-orders">0</span>
              </div>
              <div class="stat-icon-wrapper blue-box">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                  <polyline points="2 17 12 22 22 17"></polyline>
                  <polyline points="2 12 12 17 22 12"></polyline>
                </svg>
              </div>
            </div>

            <div class="order-stat-card glass-panel">
              <div class="stat-left">
                <span class="stat-label">IN TRANSIT</span>
                <span class="stat-value text-blue" id="stat-in-transit">0</span>
              </div>
              <div class="stat-icon-wrapper truck-box">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
              </div>
            </div>

            <div class="order-stat-card glass-panel">
              <div class="stat-left">
                <span class="stat-label">PROCESSING</span>
                <span class="stat-value text-orange" id="stat-processing">0</span>
              </div>
              <div class="stat-icon-wrapper orange-box">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
            </div>

            <div class="order-stat-card glass-panel">
              <div class="stat-left">
                <span class="stat-label">TOTAL SPENT</span>
                <span class="stat-value text-green" id="stat-total-spent">0 F CFA</span>
              </div>
              <div class="stat-icon-wrapper green-box">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                  <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
              </div>
            </div>
          </div>

          <!-- Filters & Search Panel -->
          <div class="orders-filter-control-panel glass-panel">
            <div class="filter-top-row">
              <div class="search-input-box">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" class="search-icon">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" id="orders-search-input" placeholder="Search live by Order ID or item name...">
              </div>
              <div class="timeframe-box">
                <span class="timeframe-label">TIMEFRAME:</span>
                <select id="orders-timeframe-selector">
                  <option value="All Time">All Time</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                  <option value="Last 6 Months">Last 6 Months</option>
                  <option value="This Year">This Year</option>
                </select>
              </div>
            </div>

            <!-- Tab pills -->
            <div class="orders-tab-pills-row" style="gap: 8px; flex-wrap: wrap;">
              <button class="order-pill-btn active" data-filter="All">All <span class="pill-badge" id="badge-all">0</span></button>
              <button class="order-pill-btn" data-filter="Placed">Placed <span class="pill-badge" id="badge-placed">0</span></button>
              <button class="order-pill-btn" data-filter="Confirm">Confirm <span class="pill-badge" id="badge-confirm">0</span></button>
              <button class="order-pill-btn" data-filter="Processing">Processing <span class="pill-badge" id="badge-processing">0</span></button>
              <button class="order-pill-btn" data-filter="Shipping">Shipping <span class="pill-badge" id="badge-shipping">0</span></button>
              <button class="order-pill-btn" data-filter="Done">Done <span class="pill-badge" id="badge-done">0</span></button>
              <button class="order-pill-btn" data-filter="Cancelled">Cancelled <span class="pill-badge" id="badge-cancelled">0</span></button>
            </div>
          </div>

          <!-- Active orders list -->
          <div class="orders-dashboard-list" id="orders-dashboard-list"></div>
        </div>
      `;
      
      this.ordersSearchQuery = '';
      this.ordersTimeframe = 'All Time';
      this.activeOrdersFilter = 'All';
      
      this.injectOrdersDashboardList();
      this.attachOrdersDashboardListeners();

    } else if (this.currentPage === 'product-details') {
      const p = this.products.find(item => item.id === this.currentProductId) || this.products[0];
      
      const colorsMap = {
        Keyboards: [
          { name: 'Opal White', priceAdjust: 0 },
          { name: 'Cobalt Blue', priceAdjust: 10 },
          { name: 'Felt Brown', priceAdjust: 15 },
          { name: 'Light Gold', priceAdjust: 20 }
        ],
        Audio: [
          { name: 'Studio Black', priceAdjust: 0 },
          { name: 'Ice Blue', priceAdjust: 10 },
          { name: 'Sunset Bronze', priceAdjust: 15 },
          { name: 'Pure White', priceAdjust: 20 }
        ],
        Lighting: [
          { name: 'Aurora RGB', priceAdjust: 0 },
          { name: 'Warm Amber', priceAdjust: 10 },
          { name: 'Ice White', priceAdjust: 15 }
        ],
        Desks: [
          { name: 'Space Grey', priceAdjust: 0 },
          { name: 'Natural Oak', priceAdjust: 25 },
          { name: 'White Felt', priceAdjust: 15 }
        ]
      };

      const productColors = (p.colors && p.colors.length > 0) 
        ? p.colors 
        : (colorsMap[p.category] || colorsMap['Keyboards']);

      if (this.selectedVariantIndex === undefined || this.selectedVariantIndex >= productColors.length) {
        this.selectedVariantIndex = 0;
      }
      this.selectedColor = productColors[this.selectedVariantIndex]?.name || productColors[0].name;

      const currentVariant = productColors[this.selectedVariantIndex] || productColors[0];
      const finalUnitPrice = p.price + (currentVariant.priceAdjust || 0);
      const oldPrice = p.comparePrice || p.original_price || p.originalPrice || 0;
      const savingsVal = (oldPrice > finalUnitPrice) ? (oldPrice - finalUnitPrice) : 0;
      const discountPercentage = oldPrice > 0 ? Math.round((savingsVal / oldPrice) * 100) : 0;
      const totalPrice = finalUnitPrice * (this.pdpQuantity || 1);

      // Gallery Images
      let allImages = [];
      if (p.images && p.images.length > 0) {
        allImages = p.images;
      } else if (p.image) {
        allImages = [p.image, p.image, p.image, p.image];
      }
      if (allImages.length < 4) {
        while (allImages.length < 4) allImages.push(allImages[0]);
      }
      if (this.activeThumbnailIdx === undefined || this.activeThumbnailIdx >= allImages.length) {
        this.activeThumbnailIdx = 0;
      }
      const currentMainImage = allImages[this.activeThumbnailIdx];

      // Real-time reviews
      const reviews = this.loadProductReviews(p.id, p.rating, p.reviews);
      const totalReviewsCount = reviews.length;
      const averageRating = totalReviewsCount > 0 
        ? (reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / totalReviewsCount).toFixed(1) 
        : (p.rating ? p.rating.toFixed(1) : "4.8");
      
      const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      reviews.forEach(r => {
        const score = Math.round(Number(r.rating) || 5);
        if (starCounts[score] !== undefined) starCounts[score]++;
      });
      
      const starPercentages = {};
      [5, 4, 3, 2, 1].forEach(star => {
        starPercentages[star] = totalReviewsCount > 0 
          ? Math.round((starCounts[star] / totalReviewsCount) * 100) 
          : (star === 5 ? 85 : star === 4 ? 12 : 3);
      });

      const activeFilter = this.activeReviewFilter || 'all';
      const filteredReviews = reviews.filter(r => {
        if (activeFilter === 'all') return true;
        return String(Math.round(Number(r.rating) || 5)) === activeFilter;
      });

      const wishlist = this.loadWishlistFromStorage();
      const isWishlisted = wishlist.some(item => item.id === p.id);
      const stockVal = p.stock !== undefined ? p.stock : 18;
      const isOutOfStock = stockVal === 0;

      // Feature cards
      const featData = this.getPdpFeatureDetails(p);

      // Related products & More to love
      const relatedList = this.products.filter(item => item.id !== p.id && item.category === p.category).slice(0, 4);
      if (relatedList.length < 4) {
        const fb = this.products.filter(item => item.id !== p.id && !relatedList.some(r => r.id === item.id)).slice(0, 4 - relatedList.length);
        relatedList.push(...fb);
      }
      const moreList = this.products.filter(item => item.id !== p.id && !relatedList.some(r => r.id === item.id)).slice(0, 4);

      contentArea.innerHTML = `
        <div class="pdp-premium-container" id="pdpApp">
          <div class="noise" aria-hidden="true"></div>

          <div class="wrap">
            <!-- Breadcrumbs -->
            <div class="crumb">
              <button id="pdpCrumbHome">Home</button>
              <i>/</i>
              <button id="pdpCrumbCategory">${p.category || 'Catalog'}</button>
              <i>/</i>
              <b>${p.name}</b>
            </div>

            <!-- Main Product Section -->
            <section class="pdp">
              <!-- Gallery -->
              <div class="gallery">
                <div class="stage" id="pdpStage">
                  <div class="breathe">
                    <img id="pdpMainImage" src="${currentMainImage}" alt="${p.name}">
                  </div>
                  <div class="badges">
                    ${savingsVal > 0 ? `<span class="badge sale">Save ${discountPercentage}%</span>` : ''}
                    <span class="badge new">${p.badge ? p.badge.toUpperCase() : 'PREMIUM'}</span>
                  </div>
                  <span class="zoom-hint">Hover to zoom</span>
                </div>
                <div class="thumbs" id="pdpThumbsContainer">
                  ${allImages.map((src, idx) => `
                    <button class="thumb ${idx === this.activeThumbnailIdx ? 'active' : ''}" data-index="${idx}">
                      <img src="${src}" alt="Thumb ${idx + 1}">
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Buy Box -->
              <div class="buybox" id="pdpBuybox">
                <div class="eyebrow">${p.brand || 'SWEETO'} · ${p.category}</div>
                <h1 class="pname">${p.name}</h1>
                <div class="rate-row">
                  <span class="stars">${this.getPdpStarsSvg(averageRating, 15)}</span>
                  <b>${averageRating}</b>
                  <a href="#pdpReviewsSection" id="pdpReviewJumpLink">${totalReviewsCount} reviews</a>
                </div>
                <div class="price-row">
                  <span class="price" id="pdpFinalPriceDisplay">${formatPrice(totalPrice)}</span>
                  ${savingsVal > 0 ? `
                    <span class="compare" id="pdpComparePriceDisplay">${formatPrice(oldPrice * (this.pdpQuantity || 1))}</span>
                    <span class="save">You save ${formatPrice(savingsVal * (this.pdpQuantity || 1))}</span>
                  ` : ''}
                </div>
                <p class="pdesc">${p.shortDesc || p.description}</p>

                <!-- Color Variants -->
                <div id="pdpVariantsSection" style="margin-bottom: 20px;">
                  <div class="opt-label">Colour — <span id="pdpSelectedVariantLabel">${this.selectedColor}</span></div>
                  <div class="swatches">
                    ${productColors.map((c, idx) => `
                      <button class="swatch ${idx === this.selectedVariantIndex ? 'active' : ''}" 
                              data-idx="${idx}" 
                              style="background: ${c.hex || this.getPdpHexColor(c.name)};" 
                              title="${c.name}${c.priceAdjust ? ` (+${c.priceAdjust.toLocaleString('fr-FR')} FCFA)` : ''}" 
                              aria-label="${c.name}"></button>
                    `).join('')}
                  </div>
                </div>

                <!-- Actions -->
                <div class="buy-row">
                  <div class="qty">
                    <button id="pdpQtyDec">−</button>
                    <output id="pdpQtyOutput">${this.pdpQuantity || 1}</output>
                    <button id="pdpQtyInc">+</button>
                  </div>
                  <button class="btn-add" id="pdpAddBtn" ${isOutOfStock ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
                    ${isOutOfStock ? 'Out of Stock' : 'Add to cart →'}
                  </button>
                  <button class="btn-wish ${isWishlisted ? 'on' : ''}" id="pdpWishBtn" title="Wishlist">
                    <svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.7-9.5-9C1 7.5 3 4.5 6.5 4.5c2.2 0 3.9 1.3 5.5 3.4 1.6-2.1 3.3-3.4 5.5-3.4C21 4.5 23 7.5 21.5 11c-2 4.3-9.5 9-9.5 9z"/></svg>
                  </button>
                  <div class="col-dropdown-wrap">
                    <button class="btn-col" id="pdpAddColBtn" title="Add to Collection">
                      <svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                    </button>
                    <div class="col-dropdown-menu-pdp" id="pdp-col-dropdown">
                      <div class="col-dropdown-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--line);">
                        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--ink-soft); letter-spacing: 0.05em;">Save to Collection</span>
                        <button id="pdp-col-modal-quick-btn" style="background: none; border: none; font-size: 16px; font-weight: 800; color: var(--accent); cursor: pointer;" title="Create new collection">+</button>
                      </div>
                      <div class="col-dropdown-list" id="pdp-col-dropdown-list">
                        <!-- Populated dynamically -->
                      </div>
                    </div>
                  </div>
                  <button class="btn-share" id="pdpShareBtn" title="Share Product">
                    <svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.6"/><circle cx="17.5" cy="5.5" r="2.6"/><circle cx="17.5" cy="18.5" r="2.6"/><path d="M8.4 10.8l6.8-4M8.4 13.2l6.8 4"/></svg>
                  </button>
                </div>

                <button class="btn-now" id="pdpBuyNowBtn" ${isOutOfStock ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Buy it now</button>

                <!-- Trust badges -->
                <div class="trust">
                  <div>
                    <svg viewBox="0 0 24 24"><path d="M1 8h13v9H1zM14 11h5l3 3v3h-8"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>
                    Free express shipping over $150
                  </div>
                  <div>
                    <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>
                    30-day no-fuss returns
                  </div>
                  <div>
                    <svg viewBox="0 0 24 24"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/></svg>
                    2-year warranty included
                  </div>
                </div>

                <!-- Accordion -->
                <div class="acc" id="pdpAccordion">
                  <div class="acc-item open">
                    <button class="acc-head pdp-acc-btn">Description <span class="pl">+</span></button>
                    <div class="acc-panel"><div><div class="acc-body">
                      ${p.description || p.shortDesc}
                      ${(p.whatsInBox && p.whatsInBox.length > 0) ? `
                        <ul class="boxlist">
                          ${p.whatsInBox.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                      ` : ''}
                    </div></div></div>
                  </div>
                  <div class="acc-item">
                    <button class="acc-head pdp-acc-btn">Specifications <span class="pl">+</span></button>
                    <div class="acc-panel"><div><div class="acc-body">
                      <dl class="spec">
                        ${Object.entries(p.specs || {}).map(([lbl, val]) => `
                          <dt>${lbl}</dt><dd>${val}</dd>
                        `).join('')}
                      </dl>
                    </div></div></div>
                  </div>
                  <div class="acc-item">
                    <button class="acc-head pdp-acc-btn">Shipping & returns <span class="pl">+</span></button>
                    <div class="acc-panel"><div><div class="acc-body">Orders placed before 4 pm ship the same day. Express delivery (1–3 business days) is free over $150. Try the product at home for 30 days — if it isn't the one, returns are free and refunded in full within 48 hours of arrival.</div></div></div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Feature Highlights -->
            <section class="features wrap">
              <div class="feat">
                <div class="feat-img"><img src="${allImages[1] || allImages[0]}" alt="Feature 1"></div>
                <div>
                  <div class="eyebrow">${featData.feat1.eyebrow}</div>
                  <h2 class="big">${featData.feat1.title}</h2>
                  <p>${featData.feat1.desc}</p>
                  <ul>${featData.feat1.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
                </div>
              </div>
              <div class="feat">
                <div class="feat-img"><img src="${allImages[2] || allImages[0]}" alt="Feature 2"></div>
                <div>
                  <div class="eyebrow">${featData.feat2.eyebrow}</div>
                  <h2 class="big">${featData.feat2.title}</h2>
                  <p>${featData.feat2.desc}</p>
                  <ul>${featData.feat2.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
                </div>
              </div>
            </section>

            <!-- Reviews -->
            <section class="reviews wrap" id="pdpReviewsSection">
              <div class="rev-head">
                <div>
                  <div class="eyebrow">From the listening room</div>
                  <h2 class="big"><span id="pdpReviewCountTitle">${totalReviewsCount}</span> honest <em>ears.</em></h2>
                </div>
                <button class="pill" id="pdpOpenReviewModalBtn">✎ Write a review</button>
              </div>
              <div class="rev-grid">
                <aside class="rev-sum">
                  <div class="rev-score">
                    <b>${averageRating}</b>
                    <div>
                      <span class="stars">${this.getPdpStarsSvg(averageRating, 16)}</span>
                      <br>
                      <span>Based on ${totalReviewsCount} reviews</span>
                    </div>
                  </div>
                  <div class="bars">
                    ${[5, 4, 3, 2, 1].map(stars => `
                      <div class="bar-row">
                        <span>${stars} ★</span>
                        <div class="bar"><div class="bar-fill" style="width: ${starPercentages[stars]}%;"></div></div>
                        <span>${starPercentages[stars]}%</span>
                      </div>
                    `).join('')}
                  </div>
                </aside>
                <div>
                  <div class="filters">
                    <button class="pill ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
                    <button class="pill ${activeFilter === '5' ? 'active' : ''}" data-filter="5">5 ★</button>
                    <button class="pill ${activeFilter === '4' ? 'active' : ''}" data-filter="4">4 ★</button>
                    <button class="pill ${activeFilter === '3' ? 'active' : ''}" data-filter="3">3 ★</button>
                  </div>
                  <div class="rev-cards" id="pdpReviewCardsContainer">
                    ${filteredReviews.length > 0 ? filteredReviews.map(r => `
                      <article class="rev-card">
                        <div class="rev-top">
                          <span class="ava" style="background: #1F6FEB;">${(r.user || 'User').substring(0, 2).toUpperCase()}</span>
                          <div class="rev-who">
                            <b>${r.user || 'Client Vérifié'}</b>
                            <span>${r.date || 'Recent'}</span>
                          </div>
                          <span class="verif">✓ Verified</span>
                        </div>
                        <span class="stars">${this.getPdpStarsSvg(r.rating, 13)}</span>
                        <h4>${r.title || 'Excellent Quality'}</h4>
                        <p>${r.comment || ''}</p>
                      </article>
                    `).join('') : `
                      <div style="grid-column: 1/-1; text-align: center; color: var(--ink-soft); padding: 30px; background: var(--card); border-radius: var(--r); border: 1px solid var(--line);">
                        No reviews in this category yet. Be the first to share your thoughts!
                      </div>
                    `}
                  </div>
                </div>
              </div>
            </section>

            <!-- Related Products (Complete the ritual) -->
            <section class="related wrap">
              <div class="eyebrow">Complete the ritual</div>
              <h2 class="big">Pairs well <em>with.</em></h2>
              <div class="rel-grid">
                ${relatedList.map(item => `
                  <div class="rel-card" data-prod-id="${item.id}">
                    <div class="rel-img"><img src="${item.image}" alt="${item.name}"></div>
                    <div class="rel-body">
                      <b>${item.name}</b>
                      <span>${formatPrice(item.price)}</span>
                    </div>
                    <button class="rel-add" data-prod-id="${item.id}">+</button>
                  </div>
                `).join('')}
              </div>
            </section>
          </div>

          <!-- Review Modal -->
          <div class="modal" id="pdpReviewModal">
            <div class="modal-back" id="pdpReviewModalBack"></div>
            <div class="modal-card">
              <button class="modal-x" id="pdpReviewModalClose">✕</button>
              <div class="eyebrow">Your ears, your verdict</div>
              <h3 class="modal-title">Write a review</h3>
              <form id="pdpReviewForm">
                <div class="f-row">
                  <label>Name
                    <input id="pdpRevNameInput" maxlength="40" placeholder="Maya R." required>
                  </label>
                  <label>Email — not published
                    <input type="email" id="pdpRevEmailInput" placeholder="you@email.com">
                  </label>
                </div>
                <div class="f-rate">
                  <span class="f-label">Your rating</span>
                  <div class="star-pick" id="pdpStarPick">
                    ${[1, 2, 3, 4, 5].map(n => `
                      <button type="button" class="${n <= 5 ? 'lit' : ''}" data-star="${n}"><svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"/></svg></button>
                    `).join('')}
                  </div>
                  <span class="f-hint" id="pdpRatingHint">Legendary</span>
                </div>
                <label>Title
                  <input id="pdpRevTitleInput" maxlength="70" placeholder="Sum it up in one line">
                </label>
                <label>Review
                  <textarea id="pdpRevBodyInput" rows="4" maxlength="600" placeholder="What did you hear? Comfort, battery, silence — tell it like it is." required></textarea>
                </label>
                <button class="modal-submit" type="submit">Post review →</button>
              </form>
            </div>
          </div>

          <!-- Share Modal -->
          <div class="modal share-modal" id="pdpShareModal">
            <div class="modal-back" id="pdpShareModalBack"></div>
            <div class="modal-card">
              <button class="modal-x" id="pdpShareModalClose">✕</button>
              <div class="eyebrow">Share this product</div>
              <h3 class="modal-title">${p.name}</h3>
              <div class="share-options">
                <button class="share-option facebook" id="pdpShareFacebook">
                  <svg viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                  Facebook
                </button>
                <button class="share-option twitter" id="pdpShareTwitter">
                  <svg viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
                  Twitter
                </button>
                <button class="share-option linkedin" id="pdpShareLinkedIn">
                  <svg viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V9h4v1.5A6 6 0 0 1 16 8z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                  LinkedIn
                </button>
                <button class="share-option whatsapp" id="pdpShareWhatsApp">
                  <svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L2 21l2.1-6.4A8.5 8.5 0 1 1 21 11.5z"/><path d="M8.5 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1"/></svg>
                  WhatsApp
                </button>
                <button class="share-option native" id="pdpShareNative">
                  <svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.6"/><circle cx="17.5" cy="5.5" r="2.6"/><circle cx="17.5" cy="18.5" r="2.6"/><path d="M8.4 10.8l6.8-4M8.4 13.2l6.8 4"/></svg>
                  More...
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      this.attachPdpListeners(p);
    } else if (this.currentPage === 'auth') {
      contentArea.innerHTML = this.getAuthPageHTML();
      this.attachAuthListeners();
    } else if (this.currentPage === 'admin') {
      contentArea.innerHTML = `<div style="padding: 100px 40px; text-align: center; color: var(--text-dark);"><h4 style="font-size: 20px; font-weight: 800; margin-bottom: 12px;">Redirecting to Standalone Admin Portal...</h4><a href="./admin.html" target="_blank" style="color: var(--primary); text-decoration: underline; font-weight: 750; font-size: 14px;">Open Admin Panel in New Tab ↗</a></div>`;
      window.open('./admin.html', '_blank');
      this.currentPage = 'home';
      setTimeout(() => this.renderPageContent(), 1000);
    }

    if (this.currentPage !== 'home') {
      this.injectGlobalMoreToLove();
    }

    this.attachDynamicUIListeners();
  }

  startCountdownTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    const shadow = this.shadowRoot;
    const formatTime = (time) => {
      const hrs = Math.floor(time / 3600).toString().padStart(2, '0');
      const mins = Math.floor((time % 3600) / 60).toString().padStart(2, '0');
      const secs = (time % 60).toString().padStart(2, '0');
      return `${hrs} : ${mins} : ${secs}`;
    };

    const timerDisplay = shadow.getElementById('countdown-display');
    if (timerDisplay) {
      timerDisplay.textContent = formatTime(this.countdownTime);
    }

    this.timerInterval = setInterval(() => {
      if (this.countdownTime > 0) {
        this.countdownTime--;
        const display = shadow.getElementById('countdown-display');
        if (display) {
          display.textContent = formatTime(this.countdownTime);
        }
      } else {
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  injectHomeProducts() {
    let sectionsList = safeParseArray(getStorageItem('SWEETOS_homepage_sections'));
    if (sectionsList.length === 0) {
      sectionsList = defaultSections || [];
    }

    // Sort active sections by order
    sectionsList.forEach((s, idx) => {
      if (s.order === undefined) s.order = idx;
    });

    const pools = this.getSectionProductPools();

    // Populate Today's Deals (12 items) if active on Home Page
    const gridTodaysDeals = this.shadowRoot.getElementById('grid-todays-deals');
    if (gridTodaysDeals) {
      gridTodaysDeals.innerHTML = '';
      const dealsCfg = getTodaysDealsConfig();
      const dealProducts = (dealsCfg.productIds || [])
        .map(id => this.products.find(p => p.id === id))
        .filter(Boolean)
        .slice(0, 12);

      dealProducts.forEach(p => {
        const card = document.createElement('product-card');
        card.product = { ...p, isDeal: true };
        gridTodaysDeals.appendChild(card);
      });
    }

    sectionsList.filter(s => s.active).forEach(s => {
      // Check if any product has explicitly been assigned to this section
      const assignedProducts = this.products.filter(p => {
        if (!p) return false;
        if (Array.isArray(p.homepageSections) && p.homepageSections.length > 0) {
          return p.homepageSections.includes(s.id) || p.homepageSections.includes(s.type) || p.homepageSections.includes(s.name);
        }
        return false;
      });
      const hasAssigned = assignedProducts.length > 0;

      if (s.type === 'deals') {
        const gridHot = this.shadowRoot.getElementById('grid-hot-deals');
        if (gridHot) {
          gridHot.innerHTML = '';
          const poolDeals = pools.deals || [];
          const displayProducts = [...new Set([...assignedProducts, ...poolDeals])].slice(0, 12);
          const secWrapper = gridHot.closest('.home-section');
          if (displayProducts.length === 0) {
            if (secWrapper) secWrapper.style.display = 'none';
          } else {
            if (secWrapper) secWrapper.style.display = 'block';
            displayProducts.forEach(p => {
              const card = document.createElement('product-card');
              card.product = p;
              card.isHotDeal = true;
              gridHot.appendChild(card);
            });
          }
        }
      } else if (s.type === 'new-arrivals') {
        const gridNew = this.shadowRoot.getElementById('grid-new-arrivals');
        if (gridNew) {
          gridNew.innerHTML = '';
          const poolNew = pools.newArrivals || [];
          const displayProducts = [...new Set([...assignedProducts, ...poolNew])].slice(0, 12);
          const secWrapper = gridNew.closest('.home-section');
          if (displayProducts.length === 0) {
            if (secWrapper) secWrapper.style.display = 'none';
          } else {
            if (secWrapper) secWrapper.style.display = 'block';
            displayProducts.forEach(p => {
              const card = document.createElement('product-card');
              card.product = p;
              gridNew.appendChild(card);
            });
          }
        }
      } else if (s.type === 'best-sellers') {
        const gridBest = this.shadowRoot.getElementById('grid-best-sellers');
        if (gridBest) {
          gridBest.innerHTML = '';
          const poolBest = pools.bestSellers || [];
          const displayProducts = [...new Set([...assignedProducts, ...poolBest])].slice(0, 12);
          const secWrapper = gridBest.closest('.home-section');
          if (displayProducts.length === 0) {
            if (secWrapper) secWrapper.style.display = 'none';
          } else {
            if (secWrapper) secWrapper.style.display = 'block';
            displayProducts.forEach(p => {
              const card = document.createElement('product-card');
              card.product = p;
              gridBest.appendChild(card);
            });
          }
        }
      } else if (s.type === 'grid') {
        const gridDynamic = this.shadowRoot.getElementById(`grid-dynamic-${s.id}`);
        if (gridDynamic) {
          gridDynamic.innerHTML = '';
          let displayProducts = [];
          if (hasAssigned) {
            displayProducts = assignedProducts.slice(0, 12);
          } else {
            if (s.category === 'Apple') {
              displayProducts = this.products.filter(p => (p.name || '').toLowerCase().includes('apple') || (p.brand || '').toLowerCase().includes('apple')).slice(0, 12);
            } else if (s.category && s.category !== 'All') {
              const catLower = String(s.category).toLowerCase().trim();
              displayProducts = this.products.filter(p => 
                (p.category || '').toLowerCase().trim() === catLower ||
                (p.category || '').toLowerCase().includes(catLower) ||
                (p.subcategory || '').toLowerCase().includes(catLower)
              ).slice(0, 12);
            }
          }
          const secWrapper = gridDynamic.closest('.home-section');
          if (displayProducts.length === 0) {
            if (secWrapper) secWrapper.style.display = 'none';
          } else {
            if (secWrapper) secWrapper.style.display = 'block';
            displayProducts.forEach(p => {
              const card = document.createElement('product-card');
              card.product = p;
              gridDynamic.appendChild(card);
            });
          }
        }
      } else if (s.type === 'carousel') {
        const carousel = this.shadowRoot.getElementById(`carousel-${s.id}`);
        if (carousel) {
          carousel.innerHTML = '';
          let displayProducts = [];
          if (hasAssigned) {
            displayProducts = assignedProducts.slice(0, 12);
          } else {
            if (s.category === 'Apple') {
              displayProducts = this.products.filter(p => (p.name || '').toLowerCase().includes('apple') || (p.brand || '').toLowerCase().includes('apple')).slice(0, 8);
            } else if (s.category && s.category !== 'All') {
              const catLower = String(s.category).toLowerCase().trim();
              displayProducts = this.products.filter(p => 
                (p.category || '').toLowerCase().trim() === catLower ||
                (p.category || '').toLowerCase().includes(catLower) ||
                (p.subcategory || '').toLowerCase().includes(catLower)
              ).slice(0, 8);
            }
          }
          const secWrapper = carousel.closest('.home-section');
          if (displayProducts.length === 0) {
            if (secWrapper) secWrapper.style.display = 'none';
          } else {
            if (secWrapper) secWrapper.style.display = 'block';
            displayProducts.forEach(p => {
              const card = document.createElement('product-card');
              card.product = p;
              carousel.appendChild(card);
            });
          }
        }
      }
    });

    // Initial For You products load (1 line of 4 products)
    this.forYouIndex = 0;
    this.forYouLoading = false;
    
    const gridForYou = this.shadowRoot.getElementById('grid-for-you');
    if (gridForYou) {
      gridForYou.innerHTML = '';
      if (this.products && this.products.length > 0) {
        const batchSize = Math.min(4, this.products.length);
        for (let i = 0; i < batchSize; i++) {
          const p = this.products[i % this.products.length];
          if (p) {
            const card = document.createElement('product-card');
            card.product = p;
            gridForYou.appendChild(card);
          }
        }
        this.forYouIndex = batchSize;
      }
    }

    // Attach category card click listeners
    const catCards = this.shadowRoot.querySelectorAll('.home-category-card');
    catCards.forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.getAttribute('data-category');
        this.currentPage = 'catalog';
        this.currentCategory = cat;
        this.renderPageContent();

        setTimeout(() => {
          const sec = this.shadowRoot.getElementById(`cat-sec-${cat.toLowerCase()}`);
          if (sec) {
            sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);

        window.dispatchEvent(new CustomEvent('search:query', {
          detail: { category: cat, query: '' }
        }));
      });
    });

    // Initialize slow auto-sliding for Hot Deals
    this.initHotDealsAutoSlide();
  }

  initHotDealsAutoSlide() {
    if (this._hotDealsAutoSlideInterval) {
      clearInterval(this._hotDealsAutoSlideInterval);
      this._hotDealsAutoSlideInterval = null;
    }

    if (this.currentPage !== 'home') return;

    const grid = this.shadowRoot.getElementById('grid-hot-deals');
    if (!grid) return;

    let isHovered = false;
    grid.addEventListener('mouseenter', () => { isHovered = true; });
    grid.addEventListener('mouseleave', () => { isHovered = false; });
    grid.addEventListener('touchstart', () => { isHovered = true; }, { passive: true });
    grid.addEventListener('touchend', () => {
      setTimeout(() => { isHovered = false; }, 2500);
    }, { passive: true });

    this._hotDealsAutoSlideInterval = setInterval(() => {
      if (isHovered || !grid.isConnected || this.currentPage !== 'home') return;

      const maxScroll = grid.scrollWidth - grid.clientWidth;
      if (maxScroll <= 15) return;

      if (grid.scrollLeft >= maxScroll - 20) {
        grid.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        grid.scrollBy({ left: 300, behavior: 'smooth' });
      }
    }, 4000); // Gentle, slow auto-slide interval (4s)
  }

  attachHomeCarouselListeners(activeSections) {
    const shadow = this.shadowRoot;

    // Generic slidable carousel arrow buttons
    shadow.querySelectorAll('.carousel-control-btn[data-target-carousel]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('data-target-carousel');
        const container = shadow.getElementById(targetId);
        if (container) {
          const isNext = btn.classList.contains('next-btn');
          container.scrollBy({ left: isNext ? 320 : -320, behavior: 'smooth' });
        }
      });
    });

    // Today's Deals Hero Dynamic Background Slider
    if (this._dealsSliderInterval) {
      clearInterval(this._dealsSliderInterval);
    }
    const bgSlides = shadow.querySelectorAll('.deals-bg-slide');
    if (bgSlides.length > 1) {
      let currentSlide = 0;
      this._dealsSliderInterval = setInterval(() => {
        if (!shadow.contains(bgSlides[0])) {
          clearInterval(this._dealsSliderInterval);
          return;
        }
        bgSlides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % bgSlides.length;
        bgSlides[currentSlide].classList.add('active');
      }, 4500);
    }

    // Today's Deals Action Buttons
    const scrollDealsBtn = shadow.getElementById('btn-scroll-deals-grid');
    if (scrollDealsBtn) {
      scrollDealsBtn.addEventListener('click', () => {
        const grid = shadow.getElementById('grid-todays-deals');
        if (grid) {
          grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    const catalogDealsBtn = shadow.getElementById('btn-deals-goto-catalog');
    if (catalogDealsBtn) {
      catalogDealsBtn.addEventListener('click', () => {
        this.currentPage = 'catalog';
        this.renderPageContent();
        this.shadowRoot.host.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'catalog' } }));
      });
    }

    // Today's Deals Marquee Cards Click -> Open Quick View
    shadow.querySelectorAll('.deals-marquee-card').forEach(card => {
      card.addEventListener('click', () => {
        const prodId = parseInt(card.getAttribute('data-product-id'));
        const product = this.products.find(p => p.id === prodId);
        if (product) {
          const quickViewModal = document.querySelector('quick-view-modal');
          if (quickViewModal) {
            quickViewModal.open(product);
          } else {
            const grid = shadow.getElementById('grid-todays-deals');
            if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });
    });

    activeSections.forEach(s => {
      if (s.type === 'carousel') {
        const prev = shadow.getElementById(`btn-prev-${s.id}`);
        const next = shadow.getElementById(`btn-next-${s.id}`);
        const carouselEl = shadow.getElementById(`carousel-${s.id}`);
        if (prev && next && carouselEl) {
          prev.addEventListener('click', () => {
            carouselEl.scrollBy({ left: -320, behavior: 'smooth' });
          });
          next.addEventListener('click', () => {
            carouselEl.scrollBy({ left: 320, behavior: 'smooth' });
          });
        }
      } else if (s.type === 'banner') {
        const btn = shadow.querySelector(`.shop-now-btn[data-category="${s.category}"]`);
        if (btn) {
          btn.addEventListener('click', () => {
            this.currentCategory = s.category;
            this.currentPage = 'catalog';
            this.renderPageContent();
            this.shadowRoot.host.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'catalog', category: s.category } }));
          });
        }
      }
    });
  }

  initializeHomepageSectionsForProducts(productsArray) {
    let migrated = false;
    productsArray.forEach(p => {
      if (!p.homepageSections) {
        p.homepageSections = [];
        const hotDealsIds = [5, 14, 28, 40];
        const bestSellersIds = [1, 13, 26, 39];
        if (hotDealsIds.includes(p.id)) p.homepageSections.push('sec-deals');
        if (bestSellersIds.includes(p.id)) p.homepageSections.push('sec-best');
        if (p.id >= 47 && p.id <= 50) p.homepageSections.push('sec-new');
        if (p.name.toLowerCase().startsWith('apple')) p.homepageSections.push('sec-1');
        if (p.category === 'Keyboards') p.homepageSections.push('sec-2');
        if (p.category === 'Audio') p.homepageSections.push('sec-3');
        migrated = true;
      }
    });
    return migrated;
  }

  loadMoreForYouProducts() {
    if (this.forYouLoading) return;
    this.forYouLoading = true;

    const shadow = this.shadowRoot;
    const grid = shadow.getElementById('grid-for-you');
    const loadingEl = shadow.getElementById('for-you-loading');
    if (!grid || !this.products || this.products.length === 0) {
      this.forYouLoading = false;
      return;
    }

    if (loadingEl) {
      loadingEl.style.opacity = '1';
      loadingEl.style.display = 'block';
    }

    setTimeout(() => {
      const batchSize = 4;
      for (let i = 0; i < batchSize; i++) {
        const prodIndex = (this.forYouIndex + i) % this.products.length;
        const p = this.products[prodIndex];
        if (p) {
          const card = document.createElement('product-card');
          card.product = p;
          grid.appendChild(card);
        }
      }
      this.forYouIndex += batchSize;
      this.forYouLoading = false;
      if (loadingEl) {
        loadingEl.style.opacity = '0';
      }
    }, 350);
  }

  renderCategoryHeroBanner() {
    const banner = this.shadowRoot.getElementById('category-hero-banner-container');
    if (!banner) return;

    const allCats = JSON.parse(getStorageItem('SWEETOS_categories') || '[]');
    const isAll = !this.currentCategory || this.currentCategory === 'All';

    // Matching products for this category (including subcategories)
    const matchingProds = isAll 
      ? this.products 
      : this.products.filter(p => this.isProductInCategory(p, this.currentCategory));

    // Active Category record
    const catRecord = allCats.find(c => c && (
      String(c.name || '').trim().toLowerCase() === String(this.currentCategory).trim().toLowerCase() ||
      String(c.id) === String(this.currentCategory)
    ));

    // Category Theme Colors & Accents
    const themeMap = {
      'Keyboards': { bg: 'linear-gradient(135deg, #09111e 0%, #0d2149 50%, #0052cc 100%)', glow1: 'rgba(0, 82, 204, 0.45)', glow2: 'rgba(0, 180, 216, 0.35)', badge: 'CLAVIERS & PERIPHERIQUES', icon: '⌨️' },
      'Audio': { bg: 'linear-gradient(135deg, #15003b 0%, #310d59 50%, #7000b8 100%)', glow1: 'rgba(147, 51, 234, 0.45)', glow2: 'rgba(236, 72, 153, 0.35)', badge: 'AUDIO & CASQUES STUDIO', icon: '🎧' },
      'Mice': { bg: 'linear-gradient(135deg, #0b132b 0%, #1c2541 50%, #0284c7 100%)', glow1: 'rgba(56, 189, 248, 0.4)', glow2: 'rgba(99, 102, 241, 0.3)', badge: 'SOURIS & POINTEURS PRO', icon: '🖱️' },
      'Desks': { bg: 'linear-gradient(135deg, #06283d 0%, #0f4c81 50%, #0284c7 100%)', glow1: 'rgba(19, 99, 223, 0.45)', glow2: 'rgba(71, 181, 255, 0.35)', badge: 'BUREAUX & MOBILIER TECH', icon: '🪑' },
      'Gaming': { bg: 'linear-gradient(135deg, #1f011b 0%, #4c0033 50%, #9d174d 100%)', glow1: 'rgba(236, 72, 153, 0.45)', glow2: 'rgba(168, 85, 247, 0.35)', badge: 'ESPACE GAMING ULTIME', icon: '🎮' },
      'Accessories': { bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)', glow1: 'rgba(148, 163, 184, 0.35)', glow2: 'rgba(56, 189, 248, 0.25)', badge: 'ACCESSOIRES WORKSPACE', icon: '🔌' }
    };

    const defaultTheme = {
      bg: 'linear-gradient(135deg, #0b0f19 0%, #131b2e 50%, #1e293b 100%)',
      glow1: 'rgba(37, 99, 235, 0.4)',
      glow2: 'rgba(0, 180, 216, 0.25)',
      badge: 'COLLECTION OFFICIELLE',
      icon: catRecord?.icon || '📁'
    };

    const theme = themeMap[this.currentCategory] || defaultTheme;

    // Background cover image (category banner image or first product image)
    let coverImg = catRecord?.image || '';
    if (!coverImg && matchingProds.length > 0) {
      coverImg = matchingProds[0].image || (Array.isArray(matchingProds[0].images) ? matchingProds[0].images[0] : '');
    }

    // Category Title & Subtitle
    const titleText = isAll 
      ? 'Explorez Notre Catalogue Complet' 
      : (catRecord?.name || this.currentCategory);

    const descText = isAll
      ? 'Découvrez une sélection rigoureuse d\'équipements haute performance, périphériques d\'exception et accessoires ergonomiques conçus pour transformer votre espace.'
      : (catRecord?.description || `Explorez notre gamme complète de produits ${this.currentCategory} avec finitions premium, garantie constructeur et livraison express.`);

    // Pick top-rated product as featured showcase item
    let featuredList = matchingProds.filter(p => (p.rating || 5) >= 4.7);
    if (featuredList.length === 0) featuredList = matchingProds.slice(0, 5);

    if (this.activeFeaturedIndex >= featuredList.length) {
      this.activeFeaturedIndex = 0;
    }
    const featProd = featuredList[this.activeFeaturedIndex] || matchingProds[0];

    banner.style.background = theme.bg;

    banner.innerHTML = `
      ${coverImg ? `<img src="${coverImg}" alt="${titleText}" class="category-hero-backdrop">` : ''}
      <div class="category-hero-glow-1" style="background: radial-gradient(circle, ${theme.glow1} 0%, rgba(0,0,0,0) 70%);"></div>
      <div class="category-hero-glow-2" style="background: radial-gradient(circle, ${theme.glow2} 0%, rgba(0,0,0,0) 70%);"></div>

      <!-- Main Banner Content Left Column -->
      <div class="category-hero-main-content">
        <div class="category-hero-meta-badge">
          <span>${theme.icon}</span>
          <span>${isAll ? 'MASTER CATALOG' : (catRecord?.parent ? 'SOUS-CATÉGORIE' : 'COLLECTION PRINCIPALE')}</span>
          <span style="opacity: 0.5;">•</span>
          <span style="color: #38bdf8;">${matchingProds.length} Articles Disponibles</span>
        </div>

        <h1 class="category-hero-title">${titleText}</h1>
        <p class="category-hero-desc">${descText}</p>

        <div class="category-hero-perks">
          <div class="category-hero-perk-item">
            <span style="color: #38bdf8;">🚚</span> Livraison Express Partout
          </div>
          <div class="category-hero-perk-item">
            <span style="color: #38bdf8;">🛡️</span> Garantie & Authenticité 100%
          </div>
          <div class="category-hero-perk-item">
            <span style="color: #38bdf8;">💬</span> Support Client Réactif
          </div>
        </div>
      </div>

      <!-- Featured Product Card Right Column (if products exist) -->
      ${featProd ? `
        <div class="category-hero-featured-card">
          <div class="category-featured-img-box" id="hero-feat-img-box" style="cursor: pointer;" data-id="${featProd.id}">
            <img src="${featProd.image}" alt="${featProd.name}" loading="lazy">
            <span style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); color: #fbbf24; font-size: 11px; font-weight: 850; padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15);">
              ⭐ ${featProd.rating ? Number(featProd.rating).toFixed(1) : '5.0'}
            </span>
          </div>

          <div class="category-featured-meta">
            <span class="category-featured-badge">PRODUIT EN VEDETTE</span>
            <h4 class="category-featured-title" title="${featProd.name}">${featProd.name}</h4>
            <div class="category-featured-price-row">
              <span class="category-featured-price">${formatPrice(featProd.price)}</span>
              ${featProd.originalPrice && featProd.originalPrice > featProd.price ? `
                <span style="font-size: 13px; color: #94a3b8; text-decoration: line-through;">${formatPrice(featProd.originalPrice)}</span>
              ` : ''}
            </div>
          </div>

          <div class="category-featured-actions">
            <button class="btn-cat-buy" id="hero-feat-buy-btn" data-id="${featProd.id}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              <span>Acheter</span>
            </button>
            <button class="btn-cat-view" id="hero-feat-view-btn" data-id="${featProd.id}">
              Détails
            </button>
          </div>
        </div>
      ` : ''}
    `;

    this.attachCatalogHeroListeners(featProd);
  }

  attachCatalogHeroListeners(featProd) {
    if (!featProd) return;
    const shadow = this.shadowRoot;

    const imgBox = shadow.getElementById('hero-feat-img-box');
    const viewBtn = shadow.getElementById('hero-feat-view-btn');
    [imgBox, viewBtn].forEach(el => {
      if (el) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('product:view', { detail: featProd.id }));
        });
      }
    });

    const buyBtn = shadow.getElementById('hero-feat-buy-btn');
    if (buyBtn) {
      buyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('cart:add', {
          detail: { productId: featProd.id, quantity: 1, color: featProd.colors ? featProd.colors[0]?.name : '' }
        }));
      });
    }
  }

  injectCatalogPills() {
    const container = this.shadowRoot.getElementById('category-smart-pills-row');
    if (!container) return;

    const allCats = JSON.parse(getStorageItem('SWEETOS_categories') || '[]');
    const isAll = !this.currentCategory || this.currentCategory === 'All';

    // Find current category object
    const currentCatObj = allCats.find(c => c && (
      String(c.name || '').trim().toLowerCase() === String(this.currentCategory).trim().toLowerCase() ||
      String(c.id) === String(this.currentCategory)
    ));

    let pillsHTML = '';

    // If "All" view: show All + Top-Level Parent Categories
    if (isAll) {
      pillsHTML += `
        <button class="category-pill-btn active" data-category="All">
          <span class="pill-icon">💙</span> Tout le Catalogue <span style="opacity: 0.6; font-size: 11px; margin-left: 4px;">(${this.products.length})</span>
        </button>
      `;
      const parents = allCats.filter(c => c && !c.parent);
      parents.forEach(p => {
        const pProds = this.products.filter(prod => this.isProductInCategory(prod, p.name || p.id));
        pillsHTML += `
          <button class="category-pill-btn" data-category="${p.name}">
            <span class="pill-icon">${p.icon || '📁'}</span> ${p.name} <span style="opacity: 0.6; font-size: 11px; margin-left: 4px;">(${pProds.length})</span>
          </button>
        `;
      });
    } else {
      // Specific Category selected:
      // If current is a parent category, find its subcategories
      const isParent = !currentCatObj?.parent;
      const parentId = isParent ? currentCatObj?.id : currentCatObj?.parent;
      const parentCatObj = isParent ? currentCatObj : allCats.find(c => c && (String(c.id) === String(parentId) || String(c.name).toLowerCase() === String(parentId).toLowerCase()));
      const parentName = parentCatObj?.name || this.currentCategory;

      // Subcategories of this parent
      const subcategories = allCats.filter(c => c && (
        String(c.parent) === String(parentId) ||
        String(c.parent).trim().toLowerCase() === String(parentName).trim().toLowerCase()
      ));

      pillsHTML += `
        <button class="category-pill-btn" data-category="All" style="background: #f1f5f9; border-color: #cbd5e1;">
          <span class="pill-icon">←</span> Tout le Catalogue
        </button>
        <button class="category-pill-btn ${this.currentCategory === parentName ? 'active' : ''}" data-category="${parentName}">
          <span class="pill-icon">${parentCatObj?.icon || '📁'}</span> Tous ${parentName}
        </button>
      `;

      subcategories.forEach(sub => {
        const isCurrentSub = String(this.currentCategory).trim().toLowerCase() === String(sub.name).trim().toLowerCase();
        const subProds = this.products.filter(p => this.isProductInCategory(p, sub.name || sub.id));
        pillsHTML += `
          <button class="category-pill-btn ${isCurrentSub ? 'active' : ''}" data-category="${sub.name}">
            <span class="pill-icon">${sub.icon || '🏷️'}</span> ${sub.name} <span style="opacity: 0.6; font-size: 11px; margin-left: 4px;">(${subProds.length})</span>
          </button>
        `;
      });
    }

    container.innerHTML = pillsHTML;

    // Attach pill click events
    container.querySelectorAll('.category-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-category') || 'All';
        this.currentCategory = cat;
        this.currentQuery = '';
        this.catalogLocalQuery = '';
        this.activeFeaturedIndex = 0;
        window.dispatchEvent(new CustomEvent('search:query', { detail: { query: '', category: cat } }));
        this.renderPageContent();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  injectCatalogProducts() {
    const container = this.shadowRoot.getElementById('catalog-grouped-sections');
    const noResults = this.shadowRoot.getElementById('no-results');
    const countPill = this.shadowRoot.getElementById('cat-count-pill');
    if (!container || !noResults) return;

    container.innerHTML = '';

    // 1. Text Search Filter (header query + category local query)
    const headerQ = (this.currentQuery || '').trim().toLowerCase();
    const localQ = (this.catalogLocalQuery || '').trim().toLowerCase();

    let textFiltered = this.products.filter(product => {
      if (!product) return false;
      const name = (product.name || '').toLowerCase();
      const desc = (product.shortDesc || product.description || '').toLowerCase();
      const cat = (product.category || '').toLowerCase();
      const brand = (product.brand || '').toLowerCase();
      const sku = (product.sku || '').toLowerCase();

      if (headerQ) {
        if (!name.includes(headerQ) && !desc.includes(headerQ) && !cat.includes(headerQ) && !brand.includes(headerQ) && !sku.includes(headerQ)) {
          return false;
        }
      }
      if (localQ) {
        if (!name.includes(localQ) && !desc.includes(localQ) && !cat.includes(localQ) && !brand.includes(localQ) && !sku.includes(localQ)) {
          return false;
        }
      }
      return true;
    });

    // 2. Category / Subcategory Filter
    let catFiltered = textFiltered.filter(p => this.isProductInCategory(p, this.currentCategory));

    // 3. Brand Filter
    if (this.catalogBrandFilter && this.catalogBrandFilter !== 'All') {
      catFiltered = catFiltered.filter(p => p.brand && p.brand.toLowerCase() === this.catalogBrandFilter.toLowerCase());
    }

    // 4. In-Stock Filter
    if (this.catalogInStockOnly) {
      catFiltered = catFiltered.filter(p => (p.stock !== undefined ? p.stock : 10) > 0);
    }

    // 5. Sorting
    catFiltered.sort((a, b) => {
      if (this.catalogSort === 'price_low') return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
      if (this.catalogSort === 'price_high') return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
      if (this.catalogSort === 'rating') return (parseFloat(b.rating) || 5) - (parseFloat(a.rating) || 5);
      if (this.catalogSort === 'newest') return (b.id || 0) - (a.id || 0);
      // 'featured'
      return 0;
    });

    // Update Counter Badge
    if (countPill) {
      countPill.textContent = `${catFiltered.length} articles`;
    }

    // If 0 products match, render rich empty state
    if (catFiltered.length === 0) {
      this.renderEmptySearchExperience(headerQ || localQ || this.currentCategory, container, noResults);
      return;
    }

    noResults.style.display = 'none';
    container.style.display = 'block';

    const isAllView = (!this.currentCategory || this.currentCategory === 'All') && !headerQ && !localQ && this.catalogBrandFilter === 'All' && !this.catalogInStockOnly && this.catalogSort === 'featured';

    if (isAllView) {
      // Group by top-level parent categories
      const storedCats = JSON.parse(getStorageItem('SWEETOS_categories') || '[]');
      const parentCats = storedCats.filter(c => c && !c.parent);
      const catList = parentCats.length > 0 ? parentCats : storedCats;

      catList.forEach(c => {
        const catName = c.name || c;
        const sectionProducts = catFiltered.filter(p => this.isProductInCategory(p, catName));
        if (sectionProducts.length === 0) return;

        const section = document.createElement('div');
        section.className = 'catalog-category-section';
        section.style.marginBottom = '44px';

        section.innerHTML = `
          <div class="category-section-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid var(--border); padding-bottom:12px; margin-bottom:20px;">
            <h4 class="category-section-title" style="font-size: 20px; font-weight: 850; color: var(--text-dark); margin:0; display:flex; align-items:center; gap:8px;">
              <span>${c.icon || '📁'}</span>
              <span>${catName}</span>
              <span class="cat-count" style="font-size: 13px; font-weight: 550; color: var(--text-light); margin-left: 4px;">(${sectionProducts.length} articles)</span>
            </h4>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button class="view-all-cat-btn" data-cat="${catName}" style="background: rgba(0, 82, 204, 0.08); color: var(--primary); border: 1px solid rgba(0, 82, 204, 0.15); padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 750; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s ease;">
                Voir tout (${sectionProducts.length}) →
              </button>
            </div>
          </div>
        `;

        const grid = document.createElement('div');
        grid.className = 'product-grid';
        sectionProducts.slice(0, 8).forEach(p => {
          const card = document.createElement('product-card');
          card.product = p;
          grid.appendChild(card);
        });
        section.appendChild(grid);

        // Attach view all button
        const viewAllBtn = section.querySelector('.view-all-cat-btn');
        if (viewAllBtn) {
          viewAllBtn.addEventListener('click', () => {
            this.currentCategory = catName;
            this.currentQuery = '';
            this.catalogLocalQuery = '';
            window.dispatchEvent(new CustomEvent('search:query', { detail: { query: '', category: catName } }));
            this.renderPageContent();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        }

        container.appendChild(section);
      });

      // Today's Deals Flash Section
      const dealsConfig = getTodaysDealsConfig();
      if (isTodaysDealsActive(dealsConfig)) {
        const dealProducts = (dealsConfig.productIds || [])
          .map(id => this.products.find(p => p.id === id))
          .filter(Boolean)
          .slice(0, 12);

        if (dealProducts.length > 0) {
          const dealsSection = document.createElement('div');
          dealsSection.className = 'todays-deals-storefront-section animate-in';
          dealsSection.style.marginTop = '24px';
          dealsSection.style.marginBottom = '48px';

          dealsSection.innerHTML = `
            <div style="background: linear-gradient(135deg, #0b1a30 0%, #1e3a8a 50%, #0284c7 100%); border-radius: 24px; padding: 32px 36px; color: white; position: relative; overflow: hidden; margin-bottom: 28px; box-shadow: 0 12px 36px rgba(11,26,48,0.22); border: 1.5px solid rgba(255,255,255,0.12);">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                <div>
                  <span style="font-size: 11px; font-weight: 850; background: #ff2e93; color: white; padding: 4px 10px; border-radius: 8px; text-transform: uppercase;">🔥 FLASH DEALS</span>
                  <h3 style="font-size: 24px; font-weight: 850; margin: 8px 0 0 0; color: white;">Offres Spéciales Limitées</h3>
                </div>
                <button id="deals-catalog-view-btn" style="background: white; color: #0052cc; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 800; font-size: 13px; cursor: pointer;">Voir Toutes Les Offres →</button>
              </div>
            </div>
          `;

          const dealsGrid = document.createElement('div');
          dealsGrid.className = 'product-grid';
          dealProducts.forEach(p => {
            const card = document.createElement('product-card');
            card.product = p;
            dealsGrid.appendChild(card);
          });
          dealsSection.appendChild(dealsGrid);

          const viewDealsBtn = dealsSection.querySelector('#deals-catalog-view-btn');
          if (viewDealsBtn) {
            viewDealsBtn.addEventListener('click', () => {
              this.currentPage = 'deals';
              window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'deals' } }));
              this.renderPageContent();
            });
          }

          container.appendChild(dealsSection);
        }
      }

    } else {
      // Direct Single Grid view (for specific category or when filtered)
      const grid = document.createElement('div');
      grid.className = 'product-grid';
      catFiltered.forEach(p => {
        const card = document.createElement('product-card');
        card.product = p;
        grid.appendChild(card);
      });
      container.appendChild(grid);
    }
  }

  renderEmptySearchExperience(query, container, noResults) {
    const cleanQuery = (query || '').trim();

    // 1. Real-time recording to Admin Demand Intelligence
    if (cleanQuery && cleanQuery !== 'All') {
      let failedSearches = [];
      try {
        failedSearches = JSON.parse(sessionStorage.getItem('SWEETOS_failed_searches') || '[]');
      } catch (e) {
        failedSearches = [];
      }

      let loggedUser = null;
      try {
        loggedUser = JSON.parse(sessionStorage.getItem('SWEETOS_logged_in_user') || 'null');
      } catch(e) {}

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const now = new Date();
      const timeStr = `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      const existingIndex = failedSearches.findIndex(f => f.query.toLowerCase() === cleanQuery.toLowerCase());
      if (existingIndex >= 0) {
        failedSearches[existingIndex].count = (failedSearches[existingIndex].count || 1) + 1;
        failedSearches[existingIndex].timestamp = timeStr;
        if (loggedUser) {
          if (!failedSearches[existingIndex].customerName || failedSearches[existingIndex].customerName === 'Store Visitor') {
            failedSearches[existingIndex].customerName = loggedUser.name || loggedUser.email;
          }
          if (!failedSearches[existingIndex].phone && loggedUser.phone) {
            failedSearches[existingIndex].phone = loggedUser.phone;
          }
        }
      } else {
        failedSearches.unshift({
          id: `fs_${Date.now()}`,
          query: cleanQuery,
          customerName: loggedUser ? (loggedUser.name || loggedUser.email) : 'Store Visitor',
          phone: loggedUser ? (loggedUser.phone || '') : '',
          email: loggedUser ? (loggedUser.email || '') : '',
          timestamp: timeStr,
          device: isMobile ? 'Mobile' : 'Desktop',
          city: 'Abidjan, CI',
          count: 1,
          notified: false
        });
      }

      sessionStorage.setItem('SWEETOS_failed_searches', JSON.stringify(failedSearches));
      window.dispatchEvent(new CustomEvent('failed_searches:updated', { detail: failedSearches }));
    }

    // 2. Hide default noResults, display custom rich empty experience in container
    if (noResults) noResults.style.display = 'none';
    if (!container) return;
    container.style.display = 'block';
    container.innerHTML = '';

    // Get related/popular items from the same category or general bestsellers
    const allProds = this.products || [];
    let relatedProds = allProds.filter(p => this.currentCategory !== 'All' && p.category === this.currentCategory);
    if (relatedProds.length === 0) {
      relatedProds = allProds.filter(p => (p.rating || 5) >= 4.8).slice(0, 4);
    } else {
      relatedProds = relatedProds.slice(0, 4);
    }

    let loggedUser = null;
    try {
      loggedUser = JSON.parse(sessionStorage.getItem('SWEETOS_logged_in_user') || 'null');
    } catch(e) {}

    const emptyBox = document.createElement('div');
    emptyBox.className = 'empty-search-showcase animate-in';
    emptyBox.innerHTML = `
      <div style="background: rgba(255, 255, 255, 0.9); border: 1.5px solid var(--border); border-radius: 24px; padding: 40px 32px; text-align: center; margin-bottom: 48px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); backdrop-filter: blur(8px);">
        
        <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(239, 68, 68, 0.08); color: #ef4444; font-size: 34px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
          📦
        </div>

        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 4px 12px; border-radius: 20px; display: inline-block; margin-bottom: 12px;">
          Article Épuisé ou Non Disponible / Out of Stock
        </span>

        <h3 style="font-size: 24px; font-weight: 850; color: var(--text-dark); margin: 0 0 8px 0;">
          Aucun résultat direct pour "<span style="color: var(--primary);">${cleanQuery}</span>"
        </h3>
        
        <p style="font-size: 14.5px; color: var(--text-gray); max-width: 580px; margin: 0 auto 24px auto; line-height: 1.6;">
          Cet article est actuellement en rupture de stock ou en cours d'approvisionnement. Laissez votre numéro WhatsApp ci-dessous pour être alerté(e) directement sur votre téléphone dès son arrivée en rayon !
        </p>

        <!-- Notification subscription form -->
        <div id="restock-notify-box" style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 16px; padding: 20px; max-width: 520px; margin: 0 auto 24px auto;">
          <div style="display: flex; align-items: center; gap: 8px; justify-content: center; margin-bottom: 12px;">
            <span style="font-size: 18px;">📲</span>
            <strong style="font-size: 13.5px; color: #0f172a;">Alerte Réapprovisionnement Téléphone / WhatsApp</strong>
          </div>
          
          <form id="demand-notify-form" style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <input type="text" id="demand-user-name" placeholder="Votre Nom / Name" value="${loggedUser ? (loggedUser.name || '') : ''}" required style="padding: 10px 14px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 13px; outline: none; background: white;">
              <input type="tel" id="demand-user-phone" placeholder="Numéro WhatsApp (ex: +225...)" value="${loggedUser ? (loggedUser.phone || '') : ''}" required style="padding: 10px 14px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 13px; outline: none; background: white;">
            </div>
            <button type="submit" style="background: #0052cc; color: white; border: none; padding: 11px 20px; border-radius: 10px; font-weight: 800; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
              <span>🔔 M'alerter dès réapprovisionnement</span>
            </button>
          </form>
        </div>

        <button id="empty-state-reset-btn" class="btn-primary" style="background: transparent; color: var(--primary); border: 1.5px solid var(--primary); padding: 10px 24px; border-radius: 12px; font-weight: 750; font-size: 13.5px; cursor: pointer;">
          ← Explorer Tout le Catalogue / View All Products
        </button>

      </div>

      <!-- Related Recommended Section -->
      ${relatedProds.length > 0 ? `
        <div class="related-recommendations-section animate-in" style="margin-top: 32px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1.5px solid var(--border); padding-bottom: 12px;">
            <div>
              <h4 style="font-size: 20px; font-weight: 850; color: var(--text-dark); margin: 0;">
                ✨ Articles Similaires & Produits Populaires
              </h4>
              <span style="font-size: 13px; color: var(--text-gray);">Découvrez notre sélection alternative disponible immédiatement :</span>
            </div>
          </div>
          <div class="product-grid" id="empty-related-grid"></div>
        </div>
      ` : ''}
    `;

    container.appendChild(emptyBox);

    // Populate related products
    const relatedGrid = emptyBox.querySelector('#empty-related-grid');
    if (relatedGrid) {
      relatedProds.forEach(p => {
        const card = document.createElement('product-card');
        card.product = p;
        relatedGrid.appendChild(card);
      });
    }

    // Attach notify form submit
    const notifyForm = emptyBox.querySelector('#demand-notify-form');
    if (notifyForm) {
      notifyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameVal = emptyBox.querySelector('#demand-user-name').value.trim();
        const phoneVal = emptyBox.querySelector('#demand-user-phone').value.trim();

        let failedSearches = [];
        try {
          failedSearches = JSON.parse(sessionStorage.getItem('SWEETOS_failed_searches') || '[]');
          const target = failedSearches.find(f => f.query.toLowerCase() === cleanQuery.toLowerCase());
          if (target) {
            target.customerName = nameVal;
            target.phone = phoneVal;
          } else {
            failedSearches.unshift({
              id: `fs_${Date.now()}`,
              query: cleanQuery,
              customerName: nameVal,
              phone: phoneVal,
              email: '',
              timestamp: 'Just now',
              device: 'Mobile',
              city: 'Abidjan, CI',
              count: 1,
              notified: false
            });
          }
          sessionStorage.setItem('SWEETOS_failed_searches', JSON.stringify(failedSearches));
        } catch(err) {}

        const notifyBox = emptyBox.querySelector('#restock-notify-box');
        if (notifyBox) {
          notifyBox.innerHTML = `
            <div style="color: #16a34a; font-weight: 800; font-size: 14px; text-align: center; padding: 10px 0;">
              ✓ Merci ${nameVal} ! Vous recevrez une notification directe par WhatsApp (${phoneVal}) dès que "${cleanQuery}" sera disponible en stock ! 📲
            </div>
          `;
        }
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Demande enregistrée ! Vous serez alerté dès réapprovisionnement.' }));
      });
    }

    // Attach reset button
    const resetBtn = emptyBox.querySelector('#empty-state-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.currentQuery = '';
        this.currentCategory = 'All';
        window.dispatchEvent(new CustomEvent('search:query', { detail: { query: '', category: 'All' } }));
        this.renderPageContent();
      });
    }
  }

  getSectionProductPools() {
    const all = this.products || [];
    if (all.length === 0) return { deals: [], newArrivals: [], bestSellers: [] };

    // 1. Hot Deals: explicit section assigned, sale badge, or discount price
    const deals = all.filter(p => {
      if (!p) return false;
      const b = String(p.badge || '').toUpperCase();
      const sec = Array.isArray(p.homepageSections) ? p.homepageSections : [];
      return sec.includes('sec-deals') || sec.includes('deals') ||
             b.includes('DEAL') || b.includes('SALE') || b.includes('HOT') ||
             (p.comparePrice && parseFloat(p.comparePrice) > parseFloat(p.price)) ||
             (p.originalPrice && parseFloat(p.originalPrice) > parseFloat(p.price));
    });

    // 2. New Arrivals: explicit section assigned or NEW badge
    const newArrivals = all.filter(p => {
      if (!p) return false;
      const b = String(p.badge || '').toUpperCase();
      const sec = Array.isArray(p.homepageSections) ? p.homepageSections : [];
      return sec.includes('sec-new') || sec.includes('new-arrivals') ||
             p.isNew === true || b.includes('NEW') || b.includes('FRESH') || b.includes('ARRIV');
    });

    // 3. Best Sellers: explicit section assigned, isBestseller flag, or BEST/POPULAR badge
    const bestSellers = all.filter(p => {
      if (!p) return false;
      const b = String(p.badge || '').toUpperCase();
      const sec = Array.isArray(p.homepageSections) ? p.homepageSections : [];
      return sec.includes('sec-best') || sec.includes('best-sellers') ||
             p.isBestseller === true ||
             b.includes('BEST') || b.includes('TOP') || b.includes('POPULAR');
    });

    return { deals, newArrivals, bestSellers };
  }

  injectCategorizedProducts(type) {
    let gridElementId = '';
    let filteredList = [];
    const pools = this.getSectionProductPools();

    if (type === 'deals') {
      gridElementId = 'grid-deals';
      filteredList = pools.deals;
    } else if (type === 'new') {
      gridElementId = 'grid-new';
      filteredList = pools.newArrivals;
    } else if (type === 'best') {
      gridElementId = 'grid-best';
      filteredList = pools.bestSellers;
    }

    const grid = this.shadowRoot.getElementById(gridElementId);
    if (!grid) return;
    grid.innerHTML = '';

    if (filteredList.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; color: #64748b; background: rgba(255,255,255,0.6); border-radius: 20px; border: 1px dashed #cbd5e1; margin: 20px 0;">
          <div style="font-size: 42px; margin-bottom: 12px;">🛍️</div>
          <h4 style="font-size: 16px; font-weight: 850; color: #0f172a; margin: 0 0 6px 0;">No products in this collection yet</h4>
          <p style="font-size: 13px; margin: 0;">Check back soon for new additions to this collection!</p>
        </div>
      `;
      return;
    }

    filteredList.forEach(p => {
      const card = document.createElement('product-card');
      card.product = p;
      if (type === 'deals') {
        card.isHotDeal = true;
      }
      grid.appendChild(card);
    });
  }

  setupEventListeners() {
    const shadow = this.shadowRoot;
    
    const cards = shadow.querySelectorAll('.quick-cat-card');
    cards.forEach(card => {
      if (card.getAttribute('data-category') === this.currentCategory) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        
        const cat = card.getAttribute('data-category');
        this.currentCategory = cat;
        
        this.activeFeaturedIndex = 0; // Reset active featured index

        if (this.currentPage !== 'catalog') {
          this.currentPage = 'catalog';
          this.renderPageContent();
        } else {
          // Update pills active states
          shadow.querySelectorAll('.category-pill-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-category') === cat);
          });
          this.injectCatalogCarousel();
          this.injectCatalogProducts();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        window.dispatchEvent(new CustomEvent('search:query', {
          detail: { category: cat, query: '' }
        }));
      });
    });

    window.addEventListener('navigation:changed', (e) => {
      const { page, category, brand } = e.detail;
      let targetPage = page || 'home';
      if (targetPage === 'about') targetPage = 'about-us';

      // Authentication route guard
      const requiresAuthPages = ['orders', 'profile', 'coupons'];
      const isLoggedIn = sessionStorage.getItem('SWEETOS_logged_in_user') !== null;
      if (requiresAuthPages.includes(targetPage) && !isLoggedIn) {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: '🔒 Veuillez vous connecter pour accéder à cette page / Please log in to access this page!' }));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'auth' } }));
        }, 0);
        return;
      }

      this.currentPage = targetPage;
      this.currentCategory = category || 'All';
      this.currentBrand = brand || '';
      this.currentBrandFilter = brand || 'All';
      this.brandCategoryFilter = 'All';
      this.brandLocalQuery = '';
      this.brandInStockOnly = false;
      this.catalogBrandFilter = 'All';
      this.catalogLocalQuery = '';
      this.catalogInStockOnly = false;
      this.activeFeaturedIndex = 0; // Reset active featured index on navigation changes
      if (e.detail && e.detail.query !== undefined) {
        this.currentQuery = e.detail.query;
      } else {
        this.currentQuery = ''; // Clear search query on page/category navigation!
      }
      
      cards.forEach(c => {
        if (c.getAttribute('data-category') === this.currentCategory) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });

      this.updateHashURL();
      this.renderPageContent();
    });

    window.addEventListener('search:query', (e) => {
      const { query, category } = e.detail;
      this.currentQuery = query || '';
      
      if (query && this.currentPage !== 'catalog') {
        this.currentPage = 'catalog';
      }

      if (category) {
        this.currentCategory = category;
        cards.forEach(c => {
          if (c.getAttribute('data-category') === category) {
            c.classList.add('active');
          } else {
            c.classList.remove('active');
          }
        });
      }

      this.renderPageContent();
    });

    window.addEventListener('product:view', (e) => {
      this.currentPage = 'product-details';
      this.currentProductId = e.detail;
      this.pdpQuantity = 1;
      this.selectedColor = '';
      this.activeThumbnailIdx = 0;
      this.showReviewForm = false;
      this.formRating = 5;
      this.openAccordions = {
        description: true,
        specs: false,
        shipping: false
      };
      this.activeReviewFilter = 'All';
      this.visibleReviewsCount = 5; 
      this.renderPageContent();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('wishlist:add', (e) => {
      this.addToWishlist(e.detail);
    });

    window.addEventListener('wishlist:updated', (e) => {
      if (this.currentPage === 'product-details' && this.currentProductId) {
        const wishlist = e.detail || [];
        const isCurrentlyWishlisted = wishlist.some(item => item.id === this.currentProductId);
        
        const wishBtn = this.shadowRoot.getElementById('pdp-wish-btn');
        const wishSideBtn = this.shadowRoot.getElementById('pdp-wish-side-btn');
        
        [wishBtn, wishSideBtn].forEach(btn => {
          if (btn) {
            btn.title = isCurrentlyWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist';
            btn.classList.toggle('wishlisted', isCurrentlyWishlisted);
            const svg = btn.querySelector('svg');
            if (svg) {
              svg.setAttribute('fill', isCurrentlyWishlisted ? 'var(--red)' : 'none');
              svg.setAttribute('stroke', isCurrentlyWishlisted ? 'var(--red)' : 'currentColor');
            }
          }
        });
      }
    });

    window.addEventListener('orders:updated', () => {
      if (this.currentPage === 'orders') {
        this.injectOrdersDashboardList();
      }
    });

    window.addEventListener('reviews:updated', () => {
      if (this.currentPage === 'pdp' && this.currentProductId) {
        this.renderPageContent();
      }
    });

    // Throttled Infinite scroll window listener for "For You"
    let scrollThrottleTimer = null;
    window.addEventListener('scroll', () => {
      if (this.currentPage !== 'home') return;
      if (scrollThrottleTimer) return;
      
      scrollThrottleTimer = setTimeout(() => {
        scrollThrottleTimer = null;
        const threshold = 300; // px from bottom
        const position = window.scrollY + window.innerHeight;
        const height = document.documentElement.scrollHeight;
        
        if (height - position < threshold) {
          this.loadMoreForYouProducts();
        }
      }, 250);
    }, { passive: true });
  }

  attachDynamicUIListeners() {
    const shadow = this.shadowRoot;

    // Generic slidable carousel arrow buttons
    shadow.querySelectorAll('.carousel-control-btn[data-target-carousel]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetId = btn.getAttribute('data-target-carousel');
        const container = shadow.getElementById(targetId);
        if (container) {
          const isNext = btn.classList.contains('next-btn');
          container.scrollBy({ left: isNext ? 320 : -320, behavior: 'smooth' });
        }
      });
    });

    shadow.querySelectorAll('.view-all-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetPage = btn.getAttribute('data-target-page');
        this.currentPage = targetPage;
        this.renderPageContent();

        window.dispatchEvent(new CustomEvent('navigation:changed', {
          detail: { page: targetPage }
        }));
      });
    });

    const resetBtn = shadow.getElementById('reset-filter-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.currentQuery = '';
        this.currentCategory = 'All';
        
        window.dispatchEvent(new CustomEvent('search:query', {
          detail: { query: '', category: 'All' }
        }));

        this.renderPageContent();
      });
    }

    shadow.querySelectorAll('.scroll-shop').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentPage = 'catalog';
        this.currentCategory = 'All';
        this.currentBrand = '';
        this.renderPageContent();
        
        window.dispatchEvent(new CustomEvent('search:query', {
          detail: { category: 'All', query: '' }
        }));
      });
    });

    const viewAllAppleBtn = shadow.getElementById('view-all-apple-btn');
    if (viewAllAppleBtn) {
      viewAllAppleBtn.addEventListener('click', () => {
        this.currentPage = 'catalog';
        this.currentBrand = 'Apple';
        this.currentCategory = 'All';
        this.renderPageContent();

        window.dispatchEvent(new CustomEvent('navigation:changed', {
          detail: { page: 'catalog', category: 'All', brand: 'Apple' }
        }));
      });
    }

    const clearBrandBtn = shadow.getElementById('clear-brand-filter-btn');
    if (clearBrandBtn) {
      clearBrandBtn.addEventListener('click', () => {
        this.currentBrand = '';
        this.currentPage = 'catalog';
        this.renderPageContent();

        window.dispatchEvent(new CustomEvent('navigation:changed', {
          detail: { page: 'catalog', category: this.currentCategory, brand: '' }
        }));
      });
    }

    shadow.querySelectorAll('.category-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        shadow.querySelectorAll('.category-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const cat = btn.getAttribute('data-category') || 'All';
        this.currentCategory = cat;
        this.currentQuery = ''; // Clear search query when choosing a category!
        this.activeFeaturedIndex = 0; // Reset active featured carousel item
        
        // Sync quick selector active states if any
        shadow.querySelectorAll('.quick-cat-card').forEach(c => {
          if (c.getAttribute('data-category') === cat) {
            c.classList.add('active');
          } else {
            c.classList.remove('active');
          }
        });

        window.dispatchEvent(new CustomEvent('search:query', { detail: { query: '', category: cat } }));
        this.renderPageContent();
      });
    });
  }

  attachCatalogHeaderListeners() {
    const shadow = this.shadowRoot;

    // Clear Global Search
    const clearSearchBtn = shadow.getElementById('catalog-clear-search-btn');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        this.currentQuery = '';
        this.catalogLocalQuery = '';
        this.currentCategory = 'All';
        window.dispatchEvent(new CustomEvent('search:query', { detail: { query: '', category: 'All' } }));
        this.renderPageContent();
      });
    }

    // Breadcrumbs Navigation
    const crumbHome = shadow.getElementById('crumb-home');
    if (crumbHome) {
      crumbHome.addEventListener('click', () => {
        this.currentQuery = '';
        this.catalogLocalQuery = '';
        this.currentPage = 'home';
        window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'home' } }));
        this.renderPageContent();
      });
    }

    const crumbCatalogAll = shadow.getElementById('crumb-catalog-all');
    if (crumbCatalogAll) {
      crumbCatalogAll.addEventListener('click', () => {
        this.currentQuery = '';
        this.catalogLocalQuery = '';
        this.currentCategory = 'All';
        this.catalogBrandFilter = 'All';
        this.catalogSort = 'featured';
        this.catalogInStockOnly = false;
        window.dispatchEvent(new CustomEvent('search:query', { detail: { query: '', category: 'All' } }));
        this.renderPageContent();
      });
    }

    const crumbParent = shadow.querySelector('.crumb-parent-cat');
    if (crumbParent) {
      crumbParent.addEventListener('click', () => {
        const parentName = crumbParent.getAttribute('data-parent') || 'All';
        this.currentQuery = '';
        this.catalogLocalQuery = '';
        this.currentCategory = parentName;
        window.dispatchEvent(new CustomEvent('search:query', { detail: { query: '', category: parentName } }));
        this.renderPageContent();
      });
    }

    // In-Category Local Search
    const localSearchInput = shadow.getElementById('cat-local-search');
    if (localSearchInput) {
      let searchTimeout = null;
      localSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.catalogLocalQuery = e.target.value;
          this.injectCatalogProducts();
        }, 200);
      });
    }

    // Brand Select Dropdown
    const brandSelect = shadow.getElementById('cat-brand-select');
    if (brandSelect) {
      brandSelect.addEventListener('change', (e) => {
        this.catalogBrandFilter = e.target.value;
        this.injectCatalogProducts();
      });
    }

    // Sort Select Dropdown
    const sortSelect = shadow.getElementById('cat-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.catalogSort = e.target.value;
        this.injectCatalogProducts();
      });
    }

    // Stock Toggle Button
    const stockToggleBtn = shadow.getElementById('cat-stock-toggle');
    if (stockToggleBtn) {
      stockToggleBtn.addEventListener('click', () => {
        this.catalogInStockOnly = !this.catalogInStockOnly;
        stockToggleBtn.classList.toggle('active', this.catalogInStockOnly);
        this.injectCatalogProducts();
      });
    }
  }

  renderBrandHeroBanner() {
    const banner = this.shadowRoot.getElementById('brand-hero-banner-container');
    if (!banner) return;

    const storedBrands = JSON.parse(sessionStorage.getItem('SWEETOS_brands') || '[]');
    const isAll = !this.currentBrandFilter || this.currentBrandFilter === 'All';

    const isProductOfBrand = (product, brandName) => {
      if (!product || !brandName) return false;
      if (product.brand && product.brand.toLowerCase() === brandName.toLowerCase()) return true;
      return (product.name || '').toLowerCase().startsWith(brandName.toLowerCase());
    };

    // Matching products for this brand
    const matchingProds = isAll 
      ? this.products 
      : this.products.filter(p => isProductOfBrand(p, this.currentBrandFilter));

    // Active Brand record
    const brandRecord = storedBrands.find(b => b && (
      String(b.name || '').trim().toLowerCase() === String(this.currentBrandFilter).trim().toLowerCase() ||
      String(b.id) === String(this.currentBrandFilter)
    ));

    // Brand Theme Presets
    const themeMap = {
      'Apple': { bg: 'linear-gradient(135deg, #090a0f 0%, #181924 50%, #2b2d3c 100%)', glow1: 'rgba(203, 213, 225, 0.35)', glow2: 'rgba(0, 180, 216, 0.25)', badge: 'MAISON OFFICIELLE APPLE', icon: '🍏' },
      'Aero': { bg: 'linear-gradient(135deg, #09111e 0%, #0d2149 50%, #0052cc 100%)', glow1: 'rgba(0, 82, 204, 0.45)', glow2: 'rgba(0, 180, 216, 0.35)', badge: 'ATELIER MECANIQUE AERO', icon: '⌨️' },
      'Keychron': { bg: 'linear-gradient(135deg, #09111e 0%, #0d2149 50%, #0052cc 100%)', glow1: 'rgba(0, 82, 204, 0.45)', glow2: 'rgba(0, 180, 216, 0.35)', badge: 'KEYCHRON OFFICIAL STORE', icon: '⌨️' },
      'SWEETOS': { bg: 'linear-gradient(135deg, #18120b 0%, #301f10 50%, #543818 100%)', glow1: 'rgba(251, 191, 36, 0.4)', glow2: 'rgba(217, 119, 6, 0.3)', badge: 'ARTISANAT NOBLE SWEETOS', icon: '🪵' },
      'Apex': { bg: 'linear-gradient(135deg, #15003b 0%, #310d59 50%, #7000b8 100%)', glow1: 'rgba(147, 51, 234, 0.45)', glow2: 'rgba(236, 72, 153, 0.35)', badge: 'LABORATOIRE AUDIO APEX', icon: '🎧' },
      'Nebula': { bg: 'linear-gradient(135deg, #1f011b 0%, #4c0033 50%, #9d174d 100%)', glow1: 'rgba(236, 72, 153, 0.45)', glow2: 'rgba(168, 85, 247, 0.35)', badge: 'NEBULA AMBIENT LIGHTS', icon: '🌌' }
    };

    const defaultTheme = {
      bg: 'linear-gradient(135deg, #0b0f19 0%, #131b2e 50%, #1e293b 100%)',
      glow1: 'rgba(37, 99, 235, 0.4)',
      glow2: 'rgba(0, 180, 216, 0.25)',
      badge: 'MAISON DU CREATEUR',
      icon: brandRecord?.logo || '🏷️'
    };

    const theme = themeMap[this.currentBrandFilter] || defaultTheme;

    // Background cover image
    let coverImg = brandRecord?.banner || '';
    if (!coverImg && matchingProds.length > 0) {
      coverImg = matchingProds[0].image || '';
    }

    const titleText = isAll
      ? 'Les Plus Grandes Marques de Workspace'
      : `${brandRecord?.name || this.currentBrandFilter} Collection`;

    const descriptionMap = {
      "Aero": "Claviers mécaniques de haute voltige, switches pré-lubrifiés et câbles aviateur conçus pour la précision absolue.",
      "Keychron": "Claviers mécaniques sans fil, layouts personnalisables et compatibilité multi-OS Mac et Windows.",
      "SWEETOS": "Rehausseurs de moniteurs en chêne massif, supports ergonomiques et pièces de bois noble taillées sur mesure.",
      "Apex": "Systèmes acoustiques de monitoring, casques studio à haute impédance et convertisseurs numériques purs.",
      "Nebula": "Barres d'écran intelligentes, luminaires d'ambiance LED réactifs et colonnes de visualisation sonore.",
      "Apple": "Conçu en Californie. Matériel minimaliste, intégration logicielle fluide et écrans 5K Retina de référence."
    };

    const descText = isAll
      ? 'Explorez notre sélection de fabricants de renom. Finitions d\'exception, écosystèmes complets et garantie constructeur officielle.'
      : (descriptionMap[this.currentBrandFilter] || `Découvrez la gamme officielle ${this.currentBrandFilter} avec performances maximales et livraison express.`);

    // Pick top-rated product as featured showcase item
    let featuredList = matchingProds.filter(p => (p.rating || 5) >= 4.7);
    if (featuredList.length === 0) featuredList = matchingProds.slice(0, 5);

    if (this.activeFeaturedIndex >= featuredList.length) {
      this.activeFeaturedIndex = 0;
    }
    const featProd = featuredList[this.activeFeaturedIndex] || matchingProds[0];

    banner.style.background = theme.bg;

    banner.innerHTML = `
      ${coverImg ? `<img src="${coverImg}" alt="${titleText}" class="brand-hero-backdrop">` : ''}
      <div class="brand-hero-glow-1" style="background: radial-gradient(circle, ${theme.glow1} 0%, rgba(0,0,0,0) 70%);"></div>
      <div class="brand-hero-glow-2" style="background: radial-gradient(circle, ${theme.glow2} 0%, rgba(0,0,0,0) 70%);"></div>

      <!-- Main Banner Content Left Column -->
      <div class="brand-hero-main-content">
        <div class="brand-hero-meta-badge">
          <span>${theme.icon}</span>
          <span>${theme.badge}</span>
          <span style="opacity: 0.5;">•</span>
          <span style="color: #38bdf8;">${matchingProds.length} Articles Disponibles</span>
        </div>

        <h1 class="brand-hero-title">${titleText}</h1>
        <p class="brand-hero-desc">${descText}</p>

        <div class="brand-hero-perks">
          <div class="brand-hero-perk-item">
            <span style="color: #38bdf8;">🛡️</span> 100% Produit Authentique & Neuf
          </div>
          <div class="brand-hero-perk-item">
            <span style="color: #38bdf8;">🚚</span> Expédition Rapide & Sécurisée
          </div>
          <div class="brand-hero-perk-item">
            <span style="color: #38bdf8;">⚙️</span> Garantie Constructeur & SAV
          </div>
        </div>
      </div>

      <!-- Featured Product Card Right Column (if products exist) -->
      ${featProd ? `
        <div class="brand-hero-featured-card">
          <div class="brand-featured-img-box" id="brand-feat-img-box" style="cursor: pointer;" data-id="${featProd.id}">
            <img src="${featProd.image}" alt="${featProd.name}" loading="lazy">
            <span style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); color: #fbbf24; font-size: 11px; font-weight: 850; padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15);">
              ⭐ ${featProd.rating ? Number(featProd.rating).toFixed(1) : '5.0'}
            </span>
          </div>

          <div class="brand-featured-meta">
            <span class="brand-featured-badge">PRODUIT PHARE DE LA MARQUE</span>
            <h4 class="brand-featured-title" title="${featProd.name}">${featProd.name}</h4>
            <div class="brand-featured-price-row">
              <span class="brand-featured-price">${formatPrice(featProd.price)}</span>
              ${featProd.originalPrice && featProd.originalPrice > featProd.price ? `
                <span style="font-size: 13px; color: #94a3b8; text-decoration: line-through;">${formatPrice(featProd.originalPrice)}</span>
              ` : ''}
            </div>
          </div>

          <div class="brand-featured-actions">
            <button class="btn-cat-buy" id="brand-feat-buy-btn" data-id="${featProd.id}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              <span>Acheter</span>
            </button>
            <button class="btn-cat-view" id="brand-feat-view-btn" data-id="${featProd.id}">
              Détails
            </button>
          </div>
        </div>
      ` : ''}
    `;

    this.attachBrandHeroListeners(featProd);
  }

  attachBrandHeroListeners(featProd) {
    if (!featProd) return;
    const shadow = this.shadowRoot;

    const imgBox = shadow.getElementById('brand-feat-img-box');
    const viewBtn = shadow.getElementById('brand-feat-view-btn');
    [imgBox, viewBtn].forEach(el => {
      if (el) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('product:view', { detail: featProd.id }));
        });
      }
    });

    const buyBtn = shadow.getElementById('brand-feat-buy-btn');
    if (buyBtn) {
      buyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('cart:add', {
          detail: { productId: featProd.id, quantity: 1, color: featProd.colors ? featProd.colors[0]?.name : '' }
        }));
      });
    }
  }

  injectBrandPills() {
    const container = this.shadowRoot.getElementById('brand-smart-pills-row');
    if (!container) return;

    const storedBrands = JSON.parse(sessionStorage.getItem('SWEETOS_brands') || '[]');
    const isAll = !this.currentBrandFilter || this.currentBrandFilter === 'All';

    const isProductOfBrand = (product, brandName) => {
      if (!product || !brandName) return false;
      if (product.brand && product.brand.toLowerCase() === brandName.toLowerCase()) return true;
      return (product.name || '').toLowerCase().startsWith(brandName.toLowerCase());
    };

    let pillsHTML = `
      <button class="brand-pill-btn ${isAll ? 'active' : ''}" data-brand="All">
        <span class="pill-icon">🌟</span> Toutes les Marques <span style="opacity: 0.6; font-size: 11px; margin-left: 4px;">(${this.products.length})</span>
      </button>
    `;

    storedBrands.forEach(b => {
      const bProds = this.products.filter(p => isProductOfBrand(p, b.name));
      const isActive = !isAll && String(this.currentBrandFilter).trim().toLowerCase() === String(b.name).trim().toLowerCase();
      pillsHTML += `
        <button class="brand-pill-btn ${isActive ? 'active' : ''}" data-brand="${b.name}">
          <span class="pill-icon">${b.logo || '🏷️'}</span> ${b.name} <span style="opacity: 0.6; font-size: 11px; margin-left: 4px;">(${bProds.length})</span>
        </button>
      `;
    });

    container.innerHTML = pillsHTML;

    container.querySelectorAll('.brand-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const brand = btn.getAttribute('data-brand') || 'All';
        this.currentBrandFilter = brand;
        this.brandLocalQuery = '';
        this.activeFeaturedIndex = 0;
        this.renderPageContent();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  injectBrandsGrouped() {
    const container = this.shadowRoot.getElementById('brands-grouped-container');
    const countPill = this.shadowRoot.getElementById('brand-count-pill');
    if (!container) return;
    container.innerHTML = '';

    const isProductOfBrand = (product, brandName) => {
      if (!product || !brandName) return false;
      if (product.brand && product.brand.toLowerCase() === brandName.toLowerCase()) return true;
      return (product.name || '').toLowerCase().startsWith(brandName.toLowerCase());
    };

    // 1. Text Search Filter (brand local query)
    const localQ = (this.brandLocalQuery || '').trim().toLowerCase();
    let textFiltered = this.products.filter(product => {
      if (!product) return false;
      if (!localQ) return true;
      const name = (product.name || '').toLowerCase();
      const desc = (product.shortDesc || product.description || '').toLowerCase();
      const cat = (product.category || '').toLowerCase();
      const brand = (product.brand || '').toLowerCase();
      const sku = (product.sku || '').toLowerCase();
      return name.includes(localQ) || desc.includes(localQ) || cat.includes(localQ) || brand.includes(localQ) || sku.includes(localQ);
    });

    // 2. Brand Filter
    let brandFiltered = this.currentBrandFilter === 'All'
      ? textFiltered
      : textFiltered.filter(p => isProductOfBrand(p, this.currentBrandFilter));

    // 3. Category Filter
    if (this.brandCategoryFilter && this.brandCategoryFilter !== 'All') {
      brandFiltered = brandFiltered.filter(p => this.isProductInCategory(p, this.brandCategoryFilter));
    }

    // 4. In-Stock Filter
    if (this.brandInStockOnly) {
      brandFiltered = brandFiltered.filter(p => (p.stock !== undefined ? p.stock : 10) > 0);
    }

    // 5. Sorting
    brandFiltered.sort((a, b) => {
      if (this.brandSort === 'price_low') return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
      if (this.brandSort === 'price_high') return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
      if (this.brandSort === 'rating') return (parseFloat(b.rating) || 5) - (parseFloat(a.rating) || 5);
      if (this.brandSort === 'newest') return (b.id || 0) - (a.id || 0);
      return 0;
    });

    if (countPill) {
      countPill.textContent = `${brandFiltered.length} articles`;
    }

    // Empty state handling
    if (brandFiltered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'no-results animate-in';
      empty.style.display = 'flex';
      empty.style.flexDirection = 'column';
      empty.style.alignItems = 'center';
      empty.style.justifyContent = 'center';
      empty.style.padding = '60px 20px';
      empty.style.textAlign = 'center';
      empty.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
        <h3 style="font-size: 22px; font-weight: 800; color: var(--text-dark); margin: 0 0 8px 0;">Aucun produit trouvé</h3>
        <p style="font-size: 14px; color: #64748b; margin: 0 0 20px 0; max-width: 420px;">Aucun article ne correspond à vos critères de recherche pour cette marque.</p>
        <button id="reset-brand-filter-btn" style="background: #0052cc; color: white; border: none; padding: 10px 22px; border-radius: 12px; font-weight: 750; font-size: 13px; cursor: pointer;">Réinitialiser les filtres</button>
      `;
      container.appendChild(empty);

      const resetBtn = empty.querySelector('#reset-brand-filter-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.brandLocalQuery = '';
          this.brandCategoryFilter = 'All';
          this.brandInStockOnly = false;
          this.brandSort = 'featured';
          this.renderPageContent();
        });
      }
      return;
    }

    const isAllView = (!this.currentBrandFilter || this.currentBrandFilter === 'All') && !localQ && this.brandCategoryFilter === 'All' && !this.brandInStockOnly && this.brandSort === 'featured';

    if (isAllView) {
      const storedBrands = JSON.parse(sessionStorage.getItem('SWEETOS_brands') || '[]');
      
      storedBrands.forEach(brand => {
        const brandProducts = brandFiltered.filter(p => isProductOfBrand(p, brand.name));
        if (brandProducts.length === 0) return;

        const section = document.createElement('div');
        section.className = 'brand-grouped-section';
        section.style.marginBottom = '44px';

        section.innerHTML = `
          <div class="category-section-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid var(--border); padding-bottom:12px; margin-bottom:20px;">
            <h4 class="category-section-title" style="font-size: 20px; font-weight: 850; color: var(--text-dark); margin:0; display:flex; align-items:center; gap:8px;">
              <span>${brand.logo || '🏷️'}</span>
              <span>${brand.name} Collection</span>
              <span class="cat-count" style="font-size: 13px; font-weight: 550; color: var(--text-light); margin-left: 4px;">(${brandProducts.length} articles)</span>
            </h4>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button class="view-all-brand-btn" data-brand="${brand.name}" style="background: rgba(0, 82, 204, 0.08); color: var(--primary); border: 1px solid rgba(0, 82, 204, 0.15); padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 750; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s ease;">
                Voir la boutique (${brandProducts.length}) →
              </button>
            </div>
          </div>
        `;

        const grid = document.createElement('div');
        grid.className = 'product-grid';
        brandProducts.slice(0, 8).forEach(p => {
          const card = document.createElement('product-card');
          card.product = p;
          grid.appendChild(card);
        });
        section.appendChild(grid);

        const viewAllBtn = section.querySelector('.view-all-brand-btn');
        if (viewAllBtn) {
          viewAllBtn.addEventListener('click', () => {
            this.currentBrandFilter = brand.name;
            this.brandLocalQuery = '';
            this.renderPageContent();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        }

        container.appendChild(section);
      });
    } else {
      const grid = document.createElement('div');
      grid.className = 'product-grid';
      brandFiltered.forEach(p => {
        const card = document.createElement('product-card');
        card.product = p;
        grid.appendChild(card);
      });
      container.appendChild(grid);
    }
  }

  attachBrandHeaderListeners() {
    const shadow = this.shadowRoot;

    const crumbHome = shadow.getElementById('crumb-home');
    if (crumbHome) {
      crumbHome.addEventListener('click', () => {
        this.currentPage = 'home';
        window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'home' } }));
        this.renderPageContent();
      });
    }

    const crumbBrandAll = shadow.getElementById('crumb-brand-all');
    if (crumbBrandAll) {
      crumbBrandAll.addEventListener('click', () => {
        this.currentBrandFilter = 'All';
        this.brandLocalQuery = '';
        this.brandCategoryFilter = 'All';
        this.brandSort = 'featured';
        this.brandInStockOnly = false;
        this.renderPageContent();
      });
    }

    const localSearch = shadow.getElementById('brand-local-search');
    if (localSearch) {
      let searchTimeout = null;
      localSearch.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.brandLocalQuery = e.target.value;
          this.injectBrandsGrouped();
        }, 200);
      });
    }

    const catSelect = shadow.getElementById('brand-cat-select');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.brandCategoryFilter = e.target.value;
        this.injectBrandsGrouped();
      });
    }

    const sortSelect = shadow.getElementById('brand-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.brandSort = e.target.value;
        this.injectBrandsGrouped();
      });
    }

    const stockToggle = shadow.getElementById('brand-stock-toggle');
    if (stockToggle) {
      stockToggle.addEventListener('click', () => {
        this.brandInStockOnly = !this.brandInStockOnly;
        stockToggle.classList.toggle('active', this.brandInStockOnly);
        this.injectBrandsGrouped();
      });
    }
  }

  injectCuratedCollections() {
    const container = this.shadowRoot.getElementById('collections-dashboard-grid');
    if (!container) return;
    container.innerHTML = '';

    const defaultCollections = [
      {
        id: "col-minimalist",
        name: "Ice Obsidian Minimalist",
        subtitle: "Tactile Keyboard, Sound Isolation, & Desk Shelf",
        description: "A clean, tactile workspace designed to eliminate clutter. Combines our premium double-shot mechanical layout, dense felt desk mat, and high-fidelity studio headphones.",
        badge: "FOCUSED TYPING",
        price: 349,
        originalPrice: 387,
        themeColor: "#0052cc",
        productIds: [1, 38, 13]
      },
      {
        id: "col-audio",
        name: "Acoustic Studio Suite",
        subtitle: "Active Monitors, Studio Cans, & Woodcut Riser",
        description: "Engineered for sound developers, audio mixers, and music lovers. Features high-fidelity speaker response, active isolation, and solid wood monitor risers.",
        badge: "HI-FI ACOUSTICS",
        price: 429,
        originalPrice: 497,
        themeColor: "#36b37e",
        productIds: [14, 13, 37]
      },
      {
        id: "col-neon",
        name: "Nebula Cyberpunk Rig",
        subtitle: "Ergonomic Board, Screenbars, & Ambient Pillars",
        description: "Vibrant lighting synchronization for coding after hours. Combines an ergonomic split-board setup, active ambient LED backlighting, and soundwave visualization towers.",
        badge: "AMBIENT FOCUS",
        price: 329,
        originalPrice: 378,
        themeColor: "#ff9a3c",
        productIds: [3, 25, 26]
      }
    ];

    const customCollections = this.loadCustomCollections();

    const allCollections = [
      ...customCollections.map(col => {
        const colProducts = this.products.filter(p => col.productIds.includes(p.id));
        const originalPrice = colProducts.reduce((sum, p) => sum + p.price, 0);
        const price = Math.round(originalPrice * 0.9);
        return {
          ...col,
          price,
          originalPrice,
          isCustom: true
        };
      }),
      ...defaultCollections
    ];

    allCollections.forEach(col => {
      const colProducts = this.products.filter(p => col.productIds.includes(p.id));

      const card = document.createElement('div');
      card.className = 'curated-collection-card glass-panel animate-in';
      card.innerHTML = `
        <div class="col-card-header" style="border-left: 4px solid ${col.themeColor}">
          <div class="header-left">
            <span class="col-badge" style="color: ${col.themeColor}; background: ${col.themeColor}12">
              ${col.badge} ${col.isCustom ? '• CUSTOM' : ''}
            </span>
            <h4>${col.name}</h4>
            <p class="subtitle">${col.subtitle}</p>
          </div>
          <div class="header-price">
            ${col.originalPrice > 0 ? `
              <span class="old-price">${formatPrice(col.originalPrice)}</span>
              <span class="new-price">${formatPrice(col.price)}</span>
            ` : `<span class="new-price">Empty</span>`}
          </div>
        </div>
        
        <p class="col-description">${col.description}</p>
        
        <div class="col-products-preview">
          <h6>INCLUDED GEAR</h6>
          <div class="preview-thumbnails">
            ${colProducts.length === 0 ? `
              <span style="font-size:12px;color:var(--text-light);padding: 10px 0;">No items inside. Open a product page and click "+ Add to Collection"!</span>
            ` : colProducts.map(p => `
              <div class="thumb-item" data-id="${p.id}" title="${p.name}">
                <img src="${p.image}" alt="${p.name}" loading="lazy">
                <div class="thumb-hover-overlay">
                  <span>View Details</span>
                </div>
                ${col.isCustom ? `
                  <button class="remove-from-col-btn" data-col-id="${col.id}" data-prod-id="${p.id}" title="Remove Item">×</button>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="col-actions" style="justify-content: space-between; align-items: center; display: flex;">
          <div>
            ${col.isCustom ? `
              <button class="delete-col-btn btn-secondary" data-id="${col.id}" style="color: var(--red); border-color: var(--red); height: 40px; padding: 0 16px; font-weight:750; border-radius:10px; cursor:pointer; background:white; border:1px solid var(--red);">
                Delete Collection
              </button>
            ` : ''}
          </div>
          <button class="btn-primary buy-col-btn" data-id="${col.id}" ${colProducts.length === 0 ? 'disabled' : ''}>
            Add Entire Bundle to Cart
          </button>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.thumb-item img').forEach(img => {
      img.addEventListener('click', () => {
        const id = parseInt(img.closest('[data-id]').getAttribute('data-id'));
        window.dispatchEvent(new CustomEvent('product:view', { detail: id }));
      });
    });

    container.querySelectorAll('.remove-from-col-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.getAttribute('data-col-id');
        const prodId = parseInt(btn.getAttribute('data-prod-id'));
        const collections = this.loadCustomCollections();
        const col = collections.find(c => c.id === colId);
        if (col) {
          col.productIds = col.productIds.filter(id => id !== prodId);
          this.saveCustomCollections(collections);
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Item removed from collection.' }));
          this.injectCuratedCollections();
        }
      });
    });

    container.querySelectorAll('.delete-col-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        let collections = this.loadCustomCollections();
        collections = collections.filter(c => c.id !== id);
        this.saveCustomCollections(collections);
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Collection deleted.' }));
        this.injectCuratedCollections();
      });
    });

    container.querySelectorAll('.buy-col-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const colId = btn.getAttribute('data-id');
        let col = customCollections.find(c => c.id === colId);
        if (!col) col = defaultCollections.find(c => c.id === colId);
        if (col) {
          const colProducts = this.products.filter(p => col.productIds.includes(p.id));
          colProducts.forEach(p => {
            window.dispatchEvent(new CustomEvent('cart:add', { detail: p }));
          });
          window.dispatchEvent(new CustomEvent('toast:show', { 
            detail: `Added "${col.name}" bundle to your cart! 🛒` 
          }));
        }
      });
    });
  }

  attachPdpListeners(product) {
    const shadow = this.shadowRoot;
    const p = product;

    // Breadcrumb navigation
    const crumbHome = shadow.getElementById('pdpCrumbHome');
    if (crumbHome) {
      crumbHome.addEventListener('click', () => {
        this.currentPage = 'home';
        this.renderPageContent();
        window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'home' } }));
      });
    }

    const crumbCat = shadow.getElementById('pdpCrumbCategory');
    if (crumbCat) {
      crumbCat.addEventListener('click', () => {
        this.currentPage = 'catalog';
        this.currentCategory = p.category || 'All';
        this.renderPageContent();
        window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'catalog', category: this.currentCategory } }));
      });
    }

    // Stage Zoom on hover
    const stage = shadow.getElementById('pdpStage');
    const mainImg = shadow.getElementById('pdpMainImage');
    if (stage && mainImg) {
      stage.addEventListener('mousemove', (e) => {
        const rect = stage.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
        const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
        mainImg.style.transformOrigin = `${x}% ${y}%`;
      });
      stage.addEventListener('mouseenter', () => stage.classList.add('zoomed'));
      stage.addEventListener('mouseleave', () => stage.classList.remove('zoomed'));
    }

    // Thumbnails click
    let allImages = (p.images && p.images.length > 0) ? p.images : [p.image, p.image, p.image, p.image];
    shadow.querySelectorAll('#pdpThumbsContainer .thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const idx = parseInt(thumb.getAttribute('data-index'));
        this.activeThumbnailIdx = idx;
        shadow.querySelectorAll('#pdpThumbsContainer .thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');

        if (stage && mainImg) {
          stage.classList.add('switching');
          mainImg.src = allImages[idx] || allImages[0];
          setTimeout(() => stage.classList.remove('switching'), 200);
        }
      });
    });

    // Swatches selection (in-place update)
    const colorsMap = {
      Keyboards: [
        { name: 'Opal White', priceAdjust: 0 },
        { name: 'Cobalt Blue', priceAdjust: 10 },
        { name: 'Felt Brown', priceAdjust: 15 },
        { name: 'Light Gold', priceAdjust: 20 }
      ],
      Audio: [
        { name: 'Studio Black', priceAdjust: 0 },
        { name: 'Ice Blue', priceAdjust: 10 },
        { name: 'Sunset Bronze', priceAdjust: 15 },
        { name: 'Pure White', priceAdjust: 20 }
      ],
      Lighting: [
        { name: 'Aurora RGB', priceAdjust: 0 },
        { name: 'Warm Amber', priceAdjust: 10 },
        { name: 'Ice White', priceAdjust: 15 }
      ],
      Desks: [
        { name: 'Space Grey', priceAdjust: 0 },
        { name: 'Natural Oak', priceAdjust: 25 },
        { name: 'White Felt', priceAdjust: 15 }
      ]
    };
    const productColors = (p.colors && p.colors.length > 0) 
      ? p.colors 
      : (colorsMap[p.category] || colorsMap['Keyboards']);

    const updatePriceDisplay = () => {
      const currentVariant = productColors[this.selectedVariantIndex] || productColors[0];
      const finalUnitPrice = p.price + (currentVariant.priceAdjust || 0);
      const oldPrice = p.comparePrice || p.original_price || p.originalPrice || 0;
      const savingsVal = (oldPrice > finalUnitPrice) ? (oldPrice - finalUnitPrice) : 0;
      const totalPrice = finalUnitPrice * (this.pdpQuantity || 1);

      const finalPriceEl = shadow.getElementById('pdpFinalPriceDisplay');
      if (finalPriceEl) finalPriceEl.textContent = formatPrice(totalPrice);

      const comparePriceEl = shadow.getElementById('pdpComparePriceDisplay');
      if (comparePriceEl) comparePriceEl.textContent = formatPrice(oldPrice * (this.pdpQuantity || 1));

      const saveEl = shadow.querySelector('.save');
      if (saveEl) saveEl.textContent = `You save ${formatPrice(savingsVal * (this.pdpQuantity || 1))}`;
    };

    shadow.querySelectorAll('.swatches .swatch').forEach(swatch => {
      swatch.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(swatch.getAttribute('data-idx'));
        this.selectedVariantIndex = idx;
        this.selectedColor = productColors[idx]?.name || productColors[0].name;

        shadow.querySelectorAll('.swatches .swatch').forEach((s, i) => {
          s.classList.toggle('active', i === idx);
        });

        const labelEl = shadow.getElementById('pdpSelectedVariantLabel');
        if (labelEl) labelEl.textContent = this.selectedColor;

        updatePriceDisplay();
      });
    });

    // Quantity controls (in-place update)
    const qtyOutput = shadow.getElementById('pdpQtyOutput');
    const qtyDec = shadow.getElementById('pdpQtyDec');
    const qtyInc = shadow.getElementById('pdpQtyInc');

    if (qtyDec && qtyInc) {
      qtyDec.addEventListener('click', (e) => {
        e.preventDefault();
        if ((this.pdpQuantity || 1) > 1) {
          this.pdpQuantity = (this.pdpQuantity || 1) - 1;
          if (qtyOutput) qtyOutput.textContent = this.pdpQuantity;
          updatePriceDisplay();
        }
      });
      qtyInc.addEventListener('click', (e) => {
        e.preventDefault();
        if ((this.pdpQuantity || 1) < (p.stock || 20)) {
          this.pdpQuantity = (this.pdpQuantity || 1) + 1;
          if (qtyOutput) qtyOutput.textContent = this.pdpQuantity;
          updatePriceDisplay();
        }
      });
    }

    // Add to Cart Handlers
    const handleAddToCart = (btnEl) => {
      const addedProduct = { 
        ...p,
        selectedColor: this.selectedColor,
        quantity: this.pdpQuantity || 1
      };

      for (let i = 0; i < (this.pdpQuantity || 1); i++) {
        window.dispatchEvent(new CustomEvent('cart:add', { detail: addedProduct }));
      }

      if (btnEl) {
        btnEl.classList.add('done');
        btnEl.textContent = 'Added ✓';
        setTimeout(() => {
          btnEl.classList.remove('done');
          btnEl.textContent = 'Add to cart →';
        }, 900);
      }
    };

    const addBtn = shadow.getElementById('pdpAddBtn');
    if (addBtn) addBtn.addEventListener('click', () => handleAddToCart(addBtn));

    // Buy Now
    const buyNowBtn = shadow.getElementById('pdpBuyNowBtn');
    if (buyNowBtn) {
      buyNowBtn.addEventListener('click', () => {
        handleAddToCart();
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('checkout:start'));
        }, 120);
      });
    }

    // Wishlist Toggle
    const wishBtn = shadow.getElementById('pdpWishBtn');
    if (wishBtn) {
      wishBtn.addEventListener('click', () => {
        this.addToWishlist(p);
        const isNowWished = wishBtn.classList.toggle('on');
        window.dispatchEvent(new CustomEvent('toast:show', { 
          detail: isNowWished ? `Added "${p.name}" to wishlist ❤️` : `Removed from wishlist` 
        }));
      });
    }

    // Collection Dropdown Handlers
    const addColBtn = shadow.getElementById('pdpAddColBtn');
    const colDropdown = shadow.getElementById('pdp-col-dropdown');
    const colQuickCreateBtn = shadow.getElementById('pdp-col-modal-quick-btn');

    if (addColBtn && colDropdown) {
      this.populatePdpColDropdown(p.id);

      addColBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.populatePdpColDropdown(p.id);
        colDropdown.classList.toggle('open');
      });

      window.addEventListener('click', (e) => {
        if (!e.composedPath().includes(colDropdown) && !e.composedPath().includes(addColBtn)) {
          colDropdown.classList.remove('open');
        }
      });
    }

    if (colQuickCreateBtn) {
      colQuickCreateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (colDropdown) colDropdown.classList.remove('open');
        this.openCustomCreateModal((name) => {
          const collections = this.loadCustomCollections();
          const newCol = {
            id: 'col-' + Date.now(),
            name: name,
            subtitle: "User Curated Gear Setup",
            description: "A custom curated collection of hardware items tailored for your workspace layout.",
            badge: "MY GEAR",
            price: 0,
            originalPrice: 0,
            themeColor: "#0052cc",
            productIds: [p.id]
          };
          collections.push(newCol);
          this.saveCustomCollections(collections);
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Created collection "${name}" and saved item! 📁` }));
          this.populatePdpColDropdown(p.id);
        });
      });
    }

    // Share Modal Handlers
    const shareBtn = shadow.getElementById('pdpShareBtn');
    const shareModal = shadow.getElementById('pdpShareModal');
    const shareModalBack = shadow.getElementById('pdpShareModalBack');
    const shareModalClose = shadow.getElementById('pdpShareModalClose');

    const openShare = () => shareModal && shareModal.classList.add('on');
    const closeShare = () => shareModal && shareModal.classList.remove('on');

    if (shareBtn) shareBtn.addEventListener('click', openShare);
    if (shareModalBack) shareModalBack.addEventListener('click', closeShare);
    if (shareModalClose) shareModalClose.addEventListener('click', closeShare);

    const shareUrl = `${window.location.origin}${window.location.pathname}#/?product=${p.id}`;
    const priceText = formatPrice(p.price);
    const compareText = p.comparePrice && p.comparePrice > p.price 
      ? ` (Was ~${formatPrice(p.comparePrice)}~)` 
      : '';
    const desc = (p.description || `High-precision ${p.name} from ${p.brand || 'SWEETOS'}.`).slice(0, 200);

    const formattedWaMessage = 
`🔥 *NEW ARRIVAL ON SWEETOS* 🔥

📦 *${p.name.toUpperCase()}*
🏷️ *Brand:* ${p.brand || 'SWEETOS'}
📂 *Category:* ${p.category || 'General'}
💰 *Price:* ${priceText}${compareText}

📝 *Details:*
"${desc}"

⚡ *Stock:* ${p.stock > 0 ? `In Stock (${p.stock} units available)` : 'Limited Stock!'}

👇 *Tap link below to view & order directly:*
🔗 ${shareUrl}`;

    const fbBtn = shadow.getElementById('pdpShareFacebook');
    if (fbBtn) {
      fbBtn.addEventListener('click', () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, 'share', 'width=600,height=500');
        closeShare();
      });
    }

    const twBtn = shadow.getElementById('pdpShareTwitter');
    if (twBtn) {
      twBtn.addEventListener('click', () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(p.name + ' - ' + priceText)}`, 'share', 'width=600,height=500');
        closeShare();
      });
    }

    const liBtn = shadow.getElementById('pdpShareLinkedIn');
    if (liBtn) {
      liBtn.addEventListener('click', () => {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, 'share', 'width=600,height=500');
        closeShare();
      });
    }

    const waBtn = shadow.getElementById('pdpShareWhatsApp');
    if (waBtn) {
      waBtn.addEventListener('click', () => {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(formattedWaMessage)}`, '_blank');
        closeShare();
      });
    }

    const nativeShare = shadow.getElementById('pdpShareNative');
    if (nativeShare) {
      if (!navigator.share) nativeShare.style.display = 'none';
      nativeShare.addEventListener('click', async () => {
        closeShare();
        if (navigator.share) {
          const shareData = { title: p.name, text: shareText, url: shareUrl };
          if (p.image) {
            try {
              const res = await fetch(p.image);
              const blob = await res.blob();
              const file = new File([blob], 'product.jpg', { type: blob.type || 'image/jpeg' });
              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                shareData.files = [file];
              }
            } catch(e) {}
          }
          navigator.share(shareData).catch(() => {});
        }
      });
    }

    // Accordions
    shadow.querySelectorAll('.pdp-acc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.acc-item');
        const isOpen = item.classList.contains('open');
        shadow.querySelectorAll('#pdpAccordion .acc-item').forEach(el => el.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });

    // In-place review cards & summary renderer
    const renderReviewsInPlace = (filterVal = 'all') => {
      this.activeReviewFilter = filterVal;
      shadow.querySelectorAll('.reviews .filters .pill').forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-filter') === filterVal);
      });

      const reviews = this.loadProductReviews(p.id);
      const totalCount = reviews.length;
      const avgRating = totalCount > 0 
        ? (reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / totalCount).toFixed(1) 
        : (p.rating ? p.rating.toFixed(1) : "4.8");

      // Update count & avg displays in DOM
      const countTitle = shadow.getElementById('pdpReviewCountTitle');
      if (countTitle) countTitle.textContent = totalCount;

      const jumpLink = shadow.getElementById('pdpReviewJumpLink');
      if (jumpLink) jumpLink.textContent = `${totalCount} reviews`;

      const scoreEl = shadow.querySelector('.rev-score b');
      if (scoreEl) scoreEl.textContent = avgRating;

      const scoreStars = shadow.querySelector('.rev-score .stars');
      if (scoreStars) scoreStars.innerHTML = this.getPdpStarsSvg(avgRating, 16);

      const basedOn = shadow.querySelector('.rev-score div span:last-child');
      if (basedOn) basedOn.textContent = `Based on ${totalCount} reviews`;

      // Recalculate star bar percentages
      const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      reviews.forEach(r => {
        const score = Math.round(Number(r.rating) || 5);
        if (starCounts[score] !== undefined) starCounts[score]++;
      });
      [5, 4, 3, 2, 1].forEach((stars, sIdx) => {
        const pct = totalCount > 0 ? Math.round((starCounts[stars] / totalCount) * 100) : (stars === 5 ? 85 : stars === 4 ? 12 : 3);
        const fillEl = shadow.querySelectorAll('.bars .bar-fill')[sIdx];
        const pctEl = shadow.querySelectorAll('.bars .bar-row span:last-child')[sIdx];
        if (fillEl) fillEl.style.width = `${pct}%`;
        if (pctEl) pctEl.textContent = `${pct}%`;
      });

      // Filter reviews
      const filtered = reviews.filter(r => {
        if (filterVal === 'all') return true;
        return String(Math.round(Number(r.rating) || 5)) === filterVal;
      });

      const cardsContainer = shadow.getElementById('pdpReviewCardsContainer');
      if (cardsContainer) {
        cardsContainer.innerHTML = filtered.length > 0 ? filtered.map(r => `
          <article class="rev-card">
            <div class="rev-top">
              <span class="ava" style="background: #1F6FEB;">${(r.user || 'User').substring(0, 2).toUpperCase()}</span>
              <div class="rev-who">
                <b>${r.user || 'Client Vérifié'}</b>
                <span>${r.date || 'Recent'}</span>
              </div>
              <span class="verif">✓ Verified</span>
            </div>
            <span class="stars">${this.getPdpStarsSvg(r.rating, 13)}</span>
            <h4>${r.title || 'Excellent Quality'}</h4>
            <p>${r.comment || ''}</p>
          </article>
        `).join('') : `
          <div style="grid-column: 1/-1; text-align: center; color: var(--ink-soft); padding: 30px; background: var(--card); border-radius: var(--r); border: 1px solid var(--line);">
            No reviews in this category yet. Be the first to share your thoughts!
          </div>
        `;
      }
    };

    // Review Modal & Rating Picker
    const revModal = shadow.getElementById('pdpReviewModal');
    const openRevBtn = shadow.getElementById('pdpOpenReviewModalBtn');
    const closeRevBtn = shadow.getElementById('pdpReviewModalClose');
    const backRevBtn = shadow.getElementById('pdpReviewModalBack');

    let currentRatingPick = 5;
    const ratingHints = ['', 'Poor', 'Fair', 'Good', 'Great', 'Legendary'];
    const ratingHintEl = shadow.getElementById('pdpRatingHint');

    const updateStarPick = (val) => {
      currentRatingPick = val;
      shadow.querySelectorAll('#pdpStarPick button').forEach((b, idx) => {
        b.classList.toggle('lit', idx < val);
      });
      if (ratingHintEl) ratingHintEl.textContent = ratingHints[val] || '';
    };

    shadow.querySelectorAll('#pdpStarPick button').forEach(b => {
      b.addEventListener('click', () => {
        const val = parseInt(b.getAttribute('data-star'));
        updateStarPick(val);
      });
    });

    const openRevModal = () => {
      if (revModal) {
        revModal.classList.add('on');
        updateStarPick(5);
      }
    };
    const closeRevModal = () => revModal && revModal.classList.remove('on');

    if (openRevBtn) openRevBtn.addEventListener('click', openRevModal);
    if (closeRevBtn) closeRevBtn.addEventListener('click', closeRevModal);
    if (backRevBtn) backRevBtn.addEventListener('click', closeRevModal);

    // Review Form Submit (in-place)
    const revForm = shadow.getElementById('pdpReviewForm');
    if (revForm) {
      revForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = shadow.getElementById('pdpRevNameInput').value.trim();
        const email = shadow.getElementById('pdpRevEmailInput').value.trim();
        const title = shadow.getElementById('pdpRevTitleInput').value.trim() || 'Excellent Quality';
        const body = shadow.getElementById('pdpRevBodyInput').value.trim();

        if (!name || !body) return;

        const reviews = this.loadProductReviews(p.id);
        reviews.unshift({
          user: name,
          email: email,
          title: title,
          rating: currentRatingPick,
          comment: body,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          verified: true
        });

        this.saveProductReviews(p.id, reviews);
        closeRevModal();
        revForm.reset();
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Review submitted successfully! Thank you ⭐' }));
        renderReviewsInPlace(this.activeReviewFilter || 'all');
      });
    }

    // Review Filter Pills (in-place update)
    shadow.querySelectorAll('.reviews .filters .pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        const filterVal = pill.getAttribute('data-filter');
        renderReviewsInPlace(filterVal);
      });
    });

    // Jump to reviews link
    const jumpLink = shadow.getElementById('pdpReviewJumpLink');
    if (jumpLink) {
      jumpLink.addEventListener('click', (e) => {
        e.preventDefault();
        const revSec = shadow.getElementById('pdpReviewsSection');
        if (revSec) revSec.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Related cards and + buttons
    shadow.querySelectorAll('.rel-card').forEach(card => {
      const prodId = parseInt(card.getAttribute('data-prod-id'));
      const addBtn = card.querySelector('.rel-add');

      if (addBtn) {
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetProd = this.products.find(item => item.id === prodId);
          if (targetProd) {
            window.dispatchEvent(new CustomEvent('cart:add', { detail: targetProd }));
            window.dispatchEvent(new CustomEvent('toast:show', { detail: `Added "${targetProd.name}" to cart! 🛒` }));
          }
        });
      }

      card.addEventListener('click', () => {
        this.currentProductId = prodId;
        this.pdpQuantity = 1;
        this.selectedVariantIndex = 0;
        this.renderPageContent();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  // --- Functional Wishlist Event Handlers ---
  attachWishlistListeners() {
    const shadow = this.shadowRoot;

    const exploreBtn = shadow.getElementById('wishlist-explore-btn');
    if (exploreBtn) {
      exploreBtn.addEventListener('click', () => {
        this.currentPage = 'catalog';
        this.currentCategory = 'All';
        this.renderPageContent();
        window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'catalog', category: 'All' } }));
      });
    }

    const moveAllBtn = shadow.getElementById('wishlist-move-all-btn');
    if (moveAllBtn) {
      moveAllBtn.addEventListener('click', () => {
        const wishlist = this.loadWishlistFromStorage();
        if (wishlist.length === 0) return;
        wishlist.forEach(item => {
          window.dispatchEvent(new CustomEvent('cart:add', { detail: item }));
        });
        sessionStorage.setItem('SWEETOS_wishlist', JSON.stringify([]));
        window.dispatchEvent(new CustomEvent('wishlist:updated', { detail: [] }));
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Tous les articles (${wishlist.length}) ont été ajoutés à votre panier ! 🛒` }));
        this.renderPageContent();
      });
    }

    const shareWaBtn = shadow.getElementById('wishlist-share-wa-btn');
    if (shareWaBtn) {
      shareWaBtn.addEventListener('click', () => {
        const wishlist = this.loadWishlistFromStorage();
        if (wishlist.length === 0) return;
        const itemsText = wishlist.map(p => `- ${p.name} (${formatPrice(p.price)})`).join('\n');
        const text = `Découvrez ma liste de souhaits sur SWEETOS 🇨🇮 :\n${itemsText}\n\nCommander sur SWEETOS !`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      });
    }

    const clearWishlistBtn = shadow.getElementById('wishlist-clear-btn');
    if (clearWishlistBtn) {
      clearWishlistBtn.addEventListener('click', () => {
        sessionStorage.setItem('SWEETOS_wishlist', JSON.stringify([]));
        window.dispatchEvent(new CustomEvent('wishlist:updated', { detail: [] }));
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Liste de souhaits vidée.' }));
        this.renderPageContent();
      });
    }

    shadow.querySelectorAll('.wishlist-item-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        this.removeFromWishlist(id);
      });
    });

    shadow.querySelectorAll('.wishlist-add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const product = this.products.find(p => p.id === id);
        if (product) {
          window.dispatchEvent(new CustomEvent('cart:add', { detail: product }));
          this.removeFromWishlist(id); 
        }
      });
    });

    shadow.querySelectorAll('.wishlist-item-image img, .wishlist-item-title').forEach(el => {
      el.addEventListener('click', () => {
        const card = el.closest('[data-id]');
        const id = parseInt(card.getAttribute('data-id'));
        window.dispatchEvent(new CustomEvent('product:view', { detail: id }));
      });
    });
  }

  // --- Functional About Tabs Handlers ---
  injectAboutTabContent() {
    const tabArea = this.shadowRoot.getElementById('about-tab-content');
    if (!tabArea) return;

    if (this.activeAboutTab === 'about-us') {
      const storeName = sessionStorage.getItem('SWEETOS_store_name') || 'SWEETOS';
      const storeAboutStory = sessionStorage.getItem('SWEETOS_store_about_story') || 'We believe that your physical workspace is a direct reflection of your mind. Every tactile keystroke on our mechanical layouts, every frequency shift in our custom studio audio monitors, and every ambient ray of smart lighting is calibrated to enhance focus, creativity, and deep flow.\n\nSWEETOS was founded to rescue professionals from cluttered, generic desks. By sourcing only the finest premium materials — including solid oak, CNC-milled aluminum, and artisan felt wool — we deliver functional luxury that is made to last a lifetime.';
      const storeEntranceImage = sessionStorage.getItem('SWEETOS_store_entrance_image') || './assets/desk_mat_1786712444512.jpg';
      
      const s1Val = sessionStorage.getItem('SWEETOS_about_stat_1_val') || '15,000+';
      const s1Lbl = sessionStorage.getItem('SWEETOS_about_stat_1_lbl') || 'Workspace upgrades';
      const s2Val = sessionStorage.getItem('SWEETOS_about_stat_2_val') || '50+';
      const s2Lbl = sessionStorage.getItem('SWEETOS_about_stat_2_lbl') || 'Countries shipped';
      const s3Val = sessionStorage.getItem('SWEETOS_about_stat_3_val') || '99.4%';
      const s3Lbl = sessionStorage.getItem('SWEETOS_about_stat_3_lbl') || 'Satisfaction Rate';
      const s4Val = sessionStorage.getItem('SWEETOS_about_stat_4_val') || '24/7';
      const s4Lbl = sessionStorage.getItem('SWEETOS_about_stat_4_lbl') || 'Concierge support';

      const p1Title = sessionStorage.getItem('SWEETOS_about_p1_title') || 'Authentic Sourcing';
      const p1Desc = sessionStorage.getItem('SWEETOS_about_p1_desc') || 'Solid wood, premium wool felt, and genuine electronic components sourced ethically from certified sustainable forestry and fabricators.';
      const p2Title = sessionStorage.getItem('SWEETOS_about_p2_title') || 'Ergonomic Tactility';
      const p2Desc = sessionStorage.getItem('SWEETOS_about_p2_desc') || 'Designed to optimize hand postures, wrist health, and auditory acoustics for high-productivity workspace layouts and mechanical switches.';
      const p3Title = sessionStorage.getItem('SWEETOS_about_p3_title') || 'Global Shipping';
      const p3Desc = sessionStorage.getItem('SWEETOS_about_p3_desc') || 'Swift shipping to over 50 African countries and globally with secure tracking and reliable express courier partners.';

      const storyParagraphs = storeAboutStory.split('\n\n').map(p => `
        <p style="font-size: 15.5px; color: var(--text-gray); line-height: 1.8; margin: 0;">${p.trim()}</p>
      `).join('');

      tabArea.innerHTML = `
        <div class="about-us-tab animate-in" style="display: flex; flex-direction: column; gap: 48px;">
          
          <!-- Section 1: Philosophy Row -->
          <div class="about-section" style="display: flex; gap: 40px; align-items: center; flex-wrap: wrap;">
            <div style="flex: 1.2; min-width: 300px; display: flex; flex-direction: column; gap: 16px;">
              <h3 style="font-size: 26px; font-weight: 850; color: var(--text-dark); margin: 0; letter-spacing: -0.5px;">The ${storeName} Design Philosophy</h3>
              ${storyParagraphs}
            </div>
            <div style="flex: 1; min-width: 300px; display: flex; justify-content: center;">
              <img src="${storeEntranceImage}" alt="${storeName} Workspace Layout" style="width: 100%; max-width: 440px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1.5px solid var(--border); max-height: 300px; object-fit: cover;">
            </div>
          </div>

          <!-- Section 2: Key Sourcing / Impact Numbers -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px;">
            <div class="glass-panel" style="padding: 24px; border-radius: 16px; border: 1.5px solid var(--border); text-align: center; background: white; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
              <div style="font-size: 32px; font-weight: 850; color: var(--primary); margin-bottom: 4px;">${s1Val}</div>
              <span style="font-size: 13px; font-weight: 750; color: var(--text-dark); text-transform: uppercase; letter-spacing: 0.5px;">${s1Lbl}</span>
            </div>
            <div class="glass-panel" style="padding: 24px; border-radius: 16px; border: 1.5px solid var(--border); text-align: center; background: white; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
              <div style="font-size: 32px; font-weight: 850; color: var(--primary); margin-bottom: 4px;">${s2Val}</div>
              <span style="font-size: 13px; font-weight: 750; color: var(--text-dark); text-transform: uppercase; letter-spacing: 0.5px;">${s2Lbl}</span>
            </div>
            <div class="glass-panel" style="padding: 24px; border-radius: 16px; border: 1.5px solid var(--border); text-align: center; background: white; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
              <div style="font-size: 32px; font-weight: 850; color: var(--primary); margin-bottom: 4px;">${s3Val}</div>
              <span style="font-size: 13px; font-weight: 750; color: var(--text-dark); text-transform: uppercase; letter-spacing: 0.5px;">${s3Lbl}</span>
            </div>
            <div class="glass-panel" style="padding: 24px; border-radius: 16px; border: 1.5px solid var(--border); text-align: center; background: white; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
              <div style="font-size: 32px; font-weight: 850; color: var(--primary); margin-bottom: 4px;">${s4Val}</div>
              <span style="font-size: 13px; font-weight: 750; color: var(--text-dark); text-transform: uppercase; letter-spacing: 0.5px;">${s4Lbl}</span>
            </div>
          </div>

          <!-- Section 3: Premium Sourcing Principles -->
          <div>
            <h3 style="font-size: 22px; font-weight: 850; color: var(--text-dark); margin: 0 0 24px 0; text-align: center;">Our Design Principles</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px;">
              
              <div class="glass-panel" style="padding: 24px; border-radius: 16px; background: rgba(0, 82, 204, 0.015); border: 1.5px solid var(--border); display: flex; flex-direction: column; gap: 12px;">
                <div style="font-size: 28px; background: rgba(0, 82, 204, 0.05); width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 12px;">🪵</div>
                <h4 style="font-size: 16px; font-weight: 750; color: var(--text-dark); margin: 0;">${p1Title}</h4>
                <p style="font-size: 13.5px; color: var(--text-gray); line-height: 1.6; margin: 0;">${p1Desc}</p>
              </div>

              <div class="glass-panel" style="padding: 24px; border-radius: 16px; background: rgba(0, 82, 204, 0.015); border: 1.5px solid var(--border); display: flex; flex-direction: column; gap: 12px;">
                <div style="font-size: 28px; background: rgba(0, 82, 204, 0.05); width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 12px;">⌨️</div>
                <h4 style="font-size: 16px; font-weight: 750; color: var(--text-dark); margin: 0;">${p2Title}</h4>
                <p style="font-size: 13.5px; color: var(--text-gray); line-height: 1.6; margin: 0;">${p2Desc}</p>
              </div>

              <div class="glass-panel" style="padding: 24px; border-radius: 16px; background: rgba(0, 82, 204, 0.015); border: 1.5px solid var(--border); display: flex; flex-direction: column; gap: 12px;">
                <div style="font-size: 28px; background: rgba(0, 82, 204, 0.05); width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 12px;">🌍</div>
                <h4 style="font-size: 16px; font-weight: 750; color: var(--text-dark); margin: 0;">${p3Title}</h4>
                <p style="font-size: 13.5px; color: var(--text-gray); line-height: 1.6; margin: 0;">${p3Desc}</p>
              </div>

            </div>
          </div>

          <!-- Section 4: Behind the Scenes Gallery Grid -->
          <div>
            <h3 style="font-size: 22px; font-weight: 850; color: var(--text-dark); margin: 0 0 8px 0; text-align: center;">Behind The Scenes</h3>
            <p style="font-size: 14px; color: var(--text-gray); text-align: center; margin: 0 0 28px 0; max-width: 500px; margin-left: auto; margin-right: auto;">Explore the custom raw materials and hardware prototypes that define the SWEETOS ecosystem.</p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px;">
              
              <!-- Gallery Card 1: Keyboards -->
              <div class="glass-panel" style="border: 1.5px solid var(--border); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='none'">
                <img src="./assets/keyboard.jpg" alt="SWEETOS Custom Switches" style="width: 100%; height: 150px; object-fit: cover;">
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 6px;">
                  <strong style="font-size: 14.5px; color: var(--text-dark);">⌨️ Keyboard Mechanics</strong>
                  <span style="font-size: 12.5px; color: var(--text-gray); line-height: 1.4;">CNC aluminum keycaps and customizable mechanical switch housings.</span>
                </div>
              </div>

              <!-- Gallery Card 2: Monitor Stands -->
              <div class="glass-panel" style="border: 1.5px solid var(--border); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='none'">
                <img src="./assets/monitor_stand.jpg" alt="Solid Oak Shelving" style="width: 100%; height: 150px; object-fit: cover;">
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 6px;">
                  <strong style="font-size: 14.5px; color: var(--text-dark);">🪵 Solid Oak Woodcuts</strong>
                  <span style="font-size: 12.5px; color: var(--text-gray); line-height: 1.4;">Hand-sanded solid oak timber logs shaped into monitor risers.</span>
                </div>
              </div>

              <!-- Gallery Card 3: Headphones -->
              <div class="glass-panel" style="border: 1.5px solid var(--border); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='none'">
                <img src="./assets/headphones.jpg" alt="High Fidelity Headphones" style="width: 100%; height: 150px; object-fit: cover;">
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 6px;">
                  <strong style="font-size: 14.5px; color: var(--text-dark);">🎧 Acoustic Engineering</strong>
                  <span style="font-size: 12.5px; color: var(--text-gray); line-height: 1.4;">Beryllium drivers calibrated for true spatial frequency response.</span>
                </div>
              </div>

              <!-- Gallery Card 4: Lighting -->
              <div class="glass-panel" style="border: 1.5px solid var(--border); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='none'">
                <img src="./assets/desk_lamp.jpg" alt="Intelligent Ambient Lights" style="width: 100%; height: 150px; object-fit: cover;">
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 6px;">
                  <strong style="font-size: 14.5px; color: var(--text-dark);">💡 Ambient Raytracing</strong>
                  <span style="font-size: 12.5px; color: var(--text-gray); line-height: 1.4;">Intelligent smart LED strips reflecting warm daylight ambiance.</span>
                </div>
              </div>

            </div>
          </div>

          <!-- Section 5: The SWEETOS Timeline Journey -->
          <div>
            <h3 style="font-size: 22px; font-weight: 850; color: var(--text-dark); margin: 0 0 24px 0; text-align: center;">Notre Parcours (Our Journey)</h3>
            <div style="display: flex; flex-direction: column; gap: 20px; max-width: 700px; margin: 0 auto; position: relative;">
              <!-- Central line connector -->
              <div style="position: absolute; left: 19px; top: 8px; bottom: 8px; width: 3px; background: rgba(0, 82, 204, 0.15); z-index: 1;"></div>
              
              <!-- Timeline Point 1 -->
              <div style="display: flex; gap: 20px; align-items: flex-start; position: relative; z-index: 2;">
                <div style="background: var(--primary); color: white; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 16px; font-weight: 800; flex-shrink: 0; box-shadow: 0 0 0 6px rgba(0, 82, 204, 0.1);">24</div>
                <div class="glass-panel" style="padding: 20px; border-radius: 16px; border: 1.5px solid var(--border); background: white; flex: 1;">
                  <strong style="font-size: 15px; color: var(--text-dark); display: block; margin-bottom: 6px;">2024: Custom Mechanical Core</strong>
                  <p style="font-size: 13.5px; color: var(--text-gray); line-height: 1.5; margin: 0;">Started in a tiny workshop in Abidjan, Côte d'Ivoire, hand-wiring custom mechanical keyboard keycap sets and premium desk mats for digital creators.</p>
                </div>
              </div>

              <!-- Timeline Point 2 -->
              <div style="display: flex; gap: 20px; align-items: flex-start; position: relative; z-index: 2;">
                <div style="background: var(--primary); color: white; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 16px; font-weight: 800; flex-shrink: 0; box-shadow: 0 0 0 6px rgba(0, 82, 204, 0.1);">25</div>
                <div class="glass-panel" style="padding: 20px; border-radius: 16px; border: 1.5px solid var(--border); background: white; flex: 1;">
                  <strong style="font-size: 15px; color: var(--text-dark); display: block; margin-bottom: 6px;">2025: Sustainable Oak Ecosystems</strong>
                  <p style="font-size: 13.5px; color: var(--text-gray); line-height: 1.5; margin: 0;">Introduced custom-crafted monitor stands and risers shaped from solid oak timber and premium acoustic spatial panels.</p>
                </div>
              </div>

              <!-- Timeline Point 3 -->
              <div style="display: flex; gap: 20px; align-items: flex-start; position: relative; z-index: 2;">
                <div style="background: var(--primary); color: white; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 16px; font-weight: 800; flex-shrink: 0; box-shadow: 0 0 0 6px rgba(0, 82, 204, 0.1);">26</div>
                <div class="glass-panel" style="padding: 20px; border-radius: 16px; border: 1.5px solid var(--border); background: white; flex: 1;">
                  <strong style="font-size: 15px; color: var(--text-dark); display: block; margin-bottom: 6px;">2026: Workspace Masterworks & Logistics</strong>
                  <p style="font-size: 13.5px; color: var(--text-gray); line-height: 1.5; margin: 0;">Launched smart ambient lighting, custom audio DACs, and secure express shipping network links serving over 50 African countries and worldwide.</p>
                </div>
              </div>

            </div>
          </div>

          <!-- Section 6: Our Team (Les Artisans) -->
          <div>
            <h3 style="font-size: 22px; font-weight: 850; color: var(--text-dark); margin: 0 0 8px 0; text-align: center;">Our Creative Team</h3>
            <p style="font-size: 14px; color: var(--text-gray); text-align: center; margin: 0 0 28px 0; max-width: 500px; margin-left: auto; margin-right: auto;">The workspace architects, technical engineers, and woodcut artists driving the SWEETOS standard.</p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px;">
              
              <!-- Team Card 1 -->
              <div class="glass-panel" style="padding: 28px 20px; border-radius: 16px; border: 1.5px solid var(--border); text-align: center; background: white; display: flex; flex-direction: column; align-items: center; gap: 14px;">
                <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #0052cc, #00b4d8); color: white; font-size: 22px; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 16px rgba(0, 82, 204, 0.15);">AP</div>
                <div>
                  <strong style="font-size: 15.5px; color: var(--text-dark); display: block;">Alina Putri</strong>
                  <span style="font-size: 12px; font-weight: 700; color: var(--primary); text-transform: uppercase;">Chief Workspace Designer</span>
                </div>
                <p style="font-size: 13px; color: var(--text-gray); line-height: 1.5; margin: 0;">Specializes in ergonomic keycap profiles, aesthetic workspace blueprints, and wool felt layout styling.</p>
              </div>

              <!-- Team Card 2 -->
              <div class="glass-panel" style="padding: 28px 20px; border-radius: 16px; border: 1.5px solid var(--border); text-align: center; background: white; display: flex; flex-direction: column; align-items: center; gap: 14px;">
                <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #a78bfa); color: white; font-size: 22px; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 16px rgba(124, 58, 237, 0.15);">AL</div>
                <div>
                  <strong style="font-size: 15.5px; color: var(--text-dark); display: block;">Austin Lebechi</strong>
                  <span style="font-size: 12px; font-weight: 700; color: var(--primary); text-transform: uppercase;">Technical Audio Architect</span>
                </div>
                <p style="font-size: 13px; color: var(--text-gray); line-height: 1.5; margin: 0;">Calibrates beryllium drivers, custom mechanical switch response timings, and intelligent light sync programs.</p>
              </div>

              <!-- Team Card 3 -->
              <div class="glass-panel" style="padding: 28px 20px; border-radius: 16px; border: 1.5px solid var(--border); text-align: center; background: white; display: flex; flex-direction: column; align-items: center; gap: 14px;">
                <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #36b37e, #85e3b2); color: white; font-size: 22px; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 16px rgba(54, 179, 126, 0.15);">MG</div>
                <div>
                  <strong style="font-size: 15.5px; color: var(--text-dark); display: block;">Marc Gboho</strong>
                  <span style="font-size: 12px; font-weight: 700; color: var(--primary); text-transform: uppercase;">Master Timber Carpenter</span>
                </div>
                <p style="font-size: 13px; color: var(--text-gray); line-height: 1.5; margin: 0;">Oversees premium solid oak timber cutting, manual sanding, and ethical sourcing standards from sustainable forests.</p>
              </div>

            </div>
          </div>

        </div>
      `;

    } else if (this.activeAboutTab === 'terms') {
      const profile = this.loadUserProfile();
      tabArea.innerHTML = `
        <div class="about-terms-tab animate-in" style="display: flex; flex-direction: column; gap: 32px; color: var(--text-dark); line-height: 1.7;">
          
          <!-- Title Banner -->
          <div style="background: linear-gradient(135deg, #0b1a30 0%, #15305b 100%); border-radius: 20px; padding: 36px; display: flex; gap: 24px; align-items: center; box-shadow: 0 10px 30px rgba(11,26,48,0.15); color: white; position: relative; overflow: hidden;">
            <div style="position: absolute; right: -10%; top: -10%; width: 250px; height: 250px; background: rgba(0, 180, 216, 0.12); filter: blur(60px); border-radius: 50%;"></div>
            <div style="background: rgba(255,255,255,0.1); width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; border-radius: 16px; font-size: 26px; flex-shrink: 0; position: relative; z-index: 1;">📄</div>
            <div style="display: flex; flex-direction: column; gap: 8px; position: relative; z-index: 1;">
              <h2 style="font-size: 32px; font-weight: 850; margin: 0; color: white; letter-spacing: -0.5px;">Terms & Conditions · SWEETOS</h2>
              <p style="font-size: 14.5px; color: rgba(255,255,255,0.75); margin: 0; max-width: 680px; line-height: 1.5;">Please read these terms and conditions carefully before using our platform. By accessing or using our services, you agree to be bound by these terms.</p>
              <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.08); padding: 5px 12px; border-radius: 8px; font-size: 12px; width: fit-content; border: 1px solid rgba(255,255,255,0.1); font-weight: 700; margin-top: 4px;">
                ✓ Effective April 2026
              </div>
            </div>
          </div>

          <!-- Last Updated Alert Box -->
          <div class="glass-panel" style="padding: 14px 20px; border-radius: 12px; border: 1.5px solid var(--border); display: flex; align-items: center; gap: 10px; font-size: 13.5px; font-weight: 700; color: var(--text-gray); background: rgba(255,255,255,0.4);">
            <span>🕒</span> Last Updated: April 15, 2026
          </div>

          <!-- Table of Contents -->
          <div class="glass-panel" style="padding: 28px; border-radius: 20px; border: 1.5px solid var(--border); background: white;">
            <h4 style="font-size: 16px; font-weight: 850; margin: 0 0 20px 0; display: flex; align-items: center; gap: 8px; color: var(--text-dark);">
              <span>📋</span> Table of Contents
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px 24px;">
              <a href="#" data-scroll-sec="1" style="font-size: 13.5px; font-weight: 650; color: var(--primary); text-decoration: none; display: flex; gap: 6px; align-items: center;">1. Acceptance of Terms</a>
              <a href="#" data-scroll-sec="2" style="font-size: 13.5px; font-weight: 650; color: var(--primary); text-decoration: none; display: flex; gap: 6px; align-items: center;">2. User Accounts</a>
              <a href="#" data-scroll-sec="3" style="font-size: 13.5px; font-weight: 650; color: var(--primary); text-decoration: none; display: flex; gap: 6px; align-items: center;">3. Orders & Payments</a>
              <a href="#" data-scroll-sec="4" style="font-size: 13.5px; font-weight: 650; color: var(--primary); text-decoration: none; display: flex; gap: 6px; align-items: center;">4. Shipping & Delivery</a>
              <a href="#" data-scroll-sec="5" style="font-size: 13.5px; font-weight: 650; color: var(--primary); text-decoration: none; display: flex; gap: 6px; align-items: center;">5. Returns & Refunds</a>
              <a href="#" data-scroll-sec="6" style="font-size: 13.5px; font-weight: 650; color: var(--primary); text-decoration: none; display: flex; gap: 6px; align-items: center;">6. Intellectual Property</a>
            </div>
          </div>

          <!-- Section 1 -->
          <div id="terms-section-1" style="display: flex; flex-direction: column; gap: 12px; scroll-margin-top: 100px;">
            <h4 style="font-size: 18px; font-weight: 850; margin: 0; display: flex; align-items: center; gap: 8px;">
              <span style="background: var(--primary); color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 13px;">1</span>
              Acceptance of Terms <span style="color: #36b37e; font-size: 15px;">✓</span>
            </h4>
            <p style="font-size: 14.5px; color: var(--text-gray); margin: 0;">By accessing and using the SWEETOS platform, you agree to comply with and be bound by these terms. If you do not agree, please do not use our services.</p>
            <ul style="margin: 0; padding-left: 20px; list-style-type: none; display: flex; flex-direction: column; gap: 8px; font-size: 14px; color: var(--text-gray);">
              <li>🔸 You must be at least 18 years old to order setup products.</li>
              <li>🔸 You agree to provide accurate and complete registration info.</li>
              <li>🔸 You are responsible for maintaining account credential confidentiality.</li>
            </ul>
          </div>

          <hr style="border: 0; border-top: 1px solid var(--border); margin: 8px 0;">

          <!-- Section 2 -->
          <div id="terms-section-2" style="display: flex; flex-direction: column; gap: 12px; scroll-margin-top: 100px;">
            <h4 style="font-size: 18px; font-weight: 850; margin: 0; display: flex; align-items: center; gap: 8px;">
              <span style="background: var(--primary); color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 13px;">2</span>
              User Accounts 👤
            </h4>
            <p style="font-size: 14.5px; color: var(--text-gray); margin: 0;">To place orders and track delivery details, user accounts are securely created and stored on our server database. You are responsible for all activities under your credentials.</p>
          </div>

          <hr style="border: 0; border-top: 1px solid var(--border); margin: 8px 0;">

          <!-- Section 3 -->
          <div id="terms-section-3" style="display: flex; flex-direction: column; gap: 12px; scroll-margin-top: 100px;">
            <h4 style="font-size: 18px; font-weight: 850; margin: 0; display: flex; align-items: center; gap: 8px;">
              <span style="background: var(--primary); color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 13px;">3</span>
              Orders & Payments 💳
            </h4>
            <p style="font-size: 14.5px; color: var(--text-gray); margin: 0;">Prices are subject to change without notice. All submitted orders are processed securely on the server and broadcasted directly to the admin moderation queue.</p>
          </div>

          <hr style="border: 0; border-top: 1px solid var(--border); margin: 8px 0;">

          <!-- Section 4 -->
          <div id="terms-section-4" style="display: flex; flex-direction: column; gap: 12px; scroll-margin-top: 100px;">
            <h4 style="font-size: 18px; font-weight: 850; margin: 0; display: flex; align-items: center; gap: 8px;">
              <span style="background: var(--primary); color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 13px;">4</span>
              Shipping & Delivery 🚚
            </h4>
            <p style="font-size: 14.5px; color: var(--text-gray); margin: 0;">We aim to package and deliver your setup components promptly. Delivery estimates may fluctuate based on customs, logistics dispatch, and regional couriers.</p>
          </div>

          <hr style="border: 0; border-top: 1px solid var(--border); margin: 8px 0;">

          <!-- Section 5 -->
          <div id="terms-section-5" style="display: flex; flex-direction: column; gap: 12px; scroll-margin-top: 100px;">
            <h4 style="font-size: 18px; font-weight: 850; margin: 0; display: flex; align-items: center; gap: 8px;">
              <span style="background: var(--primary); color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 13px;">5</span>
              Returns & Refunds 🔄
            </h4>
            <p style="font-size: 14.5px; color: var(--text-gray); margin: 0;">Unopened mechanical desk setup hardware items are eligible for refund requests inside 7 business days from receipt. Return shipping costs are born by the customer.</p>
          </div>

          <hr style="border: 0; border-top: 1px solid var(--border); margin: 8px 0;">

          <!-- Section 6 -->
          <div id="terms-section-6" style="display: flex; flex-direction: column; gap: 12px; scroll-margin-top: 100px;">
            <h4 style="font-size: 18px; font-weight: 850; margin: 0; display: flex; align-items: center; gap: 8px;">
              <span style="background: var(--primary); color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 13px;">6</span>
              Intellectual Property ©
            </h4>
            <p style="font-size: 14.5px; color: var(--text-gray); margin: 0;">All digital assets, photographs, code segments, logos, and layouts are the exclusive property of SWEETOS and protected under copyright laws.</p>
          </div>

          <hr style="border: 0; border-top: 1px solid var(--border); margin: 8px 0;">

          <!-- Section 7 -->
          <div id="terms-section-7" style="display: flex; flex-direction: column; gap: 20px; scroll-margin-top: 100px;">
            <h4 style="font-size: 18px; font-weight: 850; margin: 0; display: flex; align-items: center; gap: 8px;">
              <span style="background: var(--primary); color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 13px;">7</span>
              Contact Us ✉️
            </h4>
            <p style="font-size: 14.5px; color: var(--text-gray); margin: 0;">If you have questions regarding these terms, contact our support team:</p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
              <div class="glass-panel" style="padding: 20px; border-radius: 12px; border: 1.5px solid var(--border); display: flex; gap: 16px; align-items: center;">
                <div style="font-size: 20px; background: rgba(0, 82, 204, 0.05); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">✉️</div>
                <div>
                  <span style="font-size: 10px; font-weight: 800; color: var(--text-light); text-transform: uppercase;">Support Email</span>
                  <span style="font-size: 13.5px; font-weight: 600; color: var(--text-dark); display: block;">support@SWEETOSdesigns.com</span>
                </div>
              </div>

              <div class="glass-panel" style="padding: 20px; border-radius: 12px; border: 1.5px solid var(--border); display: flex; gap: 16px; align-items: center;">
                <div style="font-size: 20px; background: rgba(0, 82, 204, 0.05); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">📞</div>
                <div>
                  <span style="font-size: 10px; font-weight: 800; color: var(--text-light); text-transform: uppercase;">Support Hotline</span>
                  <span style="font-size: 13.5px; font-weight: 600; color: var(--text-dark); display: block;">+225 07-00-00-00-00</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom sticky acceptance bar -->
          <div class="glass-panel animate-in" style="margin-top: 16px; padding: 24px 32px; border-radius: 20px; border: 1.5px solid var(--border); background: white; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 20px; color: #36b37e; background: rgba(54, 179, 126, 0.08); width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">✓</div>
              <span style="font-size: 14px; font-weight: 750; color: var(--text-gray);">By continuing to use our services, you accept these terms.</span>
            </div>
            <div style="display: flex; gap: 12px;">
              <button id="terms-accept-btn" class="btn-primary" style="height: 42px; padding: 0 24px; font-size: 13.5px; font-weight: 750; border: none; border-radius: 10px; cursor: pointer; background: #10b981; color: white;">I Agree</button>
              <button id="terms-decline-btn" class="btn-secondary" style="height: 42px; padding: 0 24px; font-size: 13.5px; font-weight: 750; background: white; border: 1.5px solid var(--border); border-radius: 10px; cursor: pointer; color: var(--text-gray);">Decline</button>
            </div>
          </div>

        </div>
      `;

      // Programmatic event listeners inside Terms & Conditions page
      const shadow = this.shadowRoot;

      // Acceptance Actions
      shadow.getElementById('terms-accept-btn').addEventListener('click', () => {
        sessionStorage.setItem('SWEETOS_terms_accepted', 'true');
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Conditions générales acceptées ! Merci de faire confiance à SWEETOS. 📄' }));
      });

      shadow.getElementById('terms-decline-btn').addEventListener('click', () => {
        sessionStorage.setItem('SWEETOS_terms_accepted', 'false');
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Vous avez refusé les conditions générales.' }));
      });

      // Smooth scroll triggers for Table of Contents items
      shadow.querySelectorAll('[data-scroll-sec]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const secNum = link.getAttribute('data-scroll-sec');
          const target = shadow.getElementById(`terms-section-${secNum}`);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });

    } else if (this.activeAboutTab === 'refund') {
      tabArea.innerHTML = `
        <div class="about-refund-tab animate-in" style="display: flex; flex-direction: column; gap: 32px; color: var(--text-dark); line-height: 1.7;">
          
          <!-- Policy Hero Banner -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 20px; padding: 36px; display: flex; gap: 24px; align-items: center; box-shadow: 0 10px 30px rgba(0,0,0,0.08); color: white; position: relative; overflow: hidden;">
            <div style="position: absolute; right: -10%; top: -10%; width: 250px; height: 250px; background: rgba(0, 180, 216, 0.1); filter: blur(60px); border-radius: 50%;"></div>
            <div style="background: rgba(255,255,255,0.08); width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; border-radius: 16px; font-size: 26px; flex-shrink: 0; position: relative; z-index: 1;">🔄</div>
            <div style="display: flex; flex-direction: column; gap: 8px; position: relative; z-index: 1;">
              <h2 style="font-size: 28px; font-weight: 850; margin: 0; color: white; letter-spacing: -0.5px;">Politique de Retour & Remboursement</h2>
              <p style="font-size: 14.5px; color: rgba(255,255,255,0.75); margin: 0; max-width: 680px; line-height: 1.5;">Nous nous engageons à vous offrir un processus de retour transparent et équitable. Découvrez ci-dessous nos conditions et délais d'éligibilité pour vos produits.</p>
            </div>
          </div>

          <!-- Refund Step-by-Step Flow -->
          <div>
            <h3 style="font-size: 18px; font-weight: 850; color: var(--text-dark); margin: 0 0 20px 0;">Comment effectuer un retour ?</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
              
              <div class="glass-panel" style="padding: 20px; border-radius: 16px; border: 1.5px solid var(--border); background: white;">
                <div style="font-size: 12px; font-weight: 800; color: var(--primary); margin-bottom: 8px; text-transform: uppercase;">Étape 1</div>
                <strong style="font-size: 14px; color: var(--text-dark); display: block; margin-bottom: 6px;">Création de la demande</strong>
                <span style="font-size: 12.5px; color: var(--text-gray); line-height: 1.4;">Initiez votre demande de retour en ligne depuis votre historique de commande ou contactez notre support.</span>
              </div>

              <div class="glass-panel" style="padding: 20px; border-radius: 16px; border: 1.5px solid var(--border); background: white;">
                <div style="font-size: 12px; font-weight: 800; color: var(--primary); margin-bottom: 8px; text-transform: uppercase;">Étape 2</div>
                <strong style="font-size: 14px; color: var(--text-dark); display: block; margin-bottom: 6px;">Dépôt ou Collecte</strong>
                <span style="font-size: 12.5px; color: var(--text-gray); line-height: 1.4;">Déposez le colis dans un point relais partenaire ou planifiez un retrait à domicile avec nos transporteurs.</span>
              </div>

              <div class="glass-panel" style="padding: 20px; border-radius: 16px; border: 1.5px solid var(--border); background: white;">
                <div style="font-size: 12px; font-weight: 800; color: var(--primary); margin-bottom: 8px; text-transform: uppercase;">Étape 3</div>
                <strong style="font-size: 14px; color: var(--text-dark); display: block; margin-bottom: 6px;">Contrôle Qualité</strong>
                <span style="font-size: 12.5px; color: var(--text-gray); line-height: 1.4;">À l'arrivée dans nos entrepôts, nos techniciens vérifient l'état général et la présence des accessoires sous 2 à 4 jours ouvrés.</span>
              </div>

              <div class="glass-panel" style="padding: 20px; border-radius: 16px; border: 1.5px solid var(--border); background: white;">
                <div style="font-size: 12px; font-weight: 800; color: var(--primary); margin-bottom: 8px; text-transform: uppercase;">Étape 4</div>
                <strong style="font-size: 14px; color: var(--text-dark); display: block; margin-bottom: 6px;">Remboursement</strong>
                <span style="font-size: 12.5px; color: var(--text-gray); line-height: 1.4;">Dès approbation, les fonds sont crédités selon votre mode de paiement choisi sous 3 à 10 jours ouvrés.</span>
              </div>

            </div>
          </div>

          <!-- Mid Section Grid: Conditions & Modes -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 24px;">
            
            <!-- Left Card: Conditions d'éligibilité -->
            <div class="glass-panel" style="padding: 24px; border-radius: 20px; border: 1.5px solid var(--border); background: white; display: flex; flex-direction: column; gap: 16px;">
              <h4 style="font-size: 16px; font-weight: 850; margin: 0; color: var(--text-dark); display: flex; align-items: center; gap: 8px;">
                <span>📋</span> Conditions d'éligibilité
              </h4>
              <ul style="margin: 0; padding-left: 20px; list-style-type: none; display: flex; flex-direction: column; gap: 10px; font-size: 13.5px; color: var(--text-gray);">
                <li>🔹 <strong>Délai de réflexion</strong> : Les demandes de retour doivent être faites sous <strong>7 jours</strong> (ou <strong>15 jours</strong> pour les produits VIP Platinum) après réception.</li>
                <li>🔹 <strong>État du produit</strong> : L'article doit être inutilisé, scellé dans son emballage d'origine et exempt de toute rayure ou trace de montage.</li>
                <li>🔹 <strong>Composants complets</strong> : Tous les accessoires originaux (câbles, touches de rechange, manuels d'utilisation) doivent être présents dans la boîte.</li>
                <li>🔹 <strong>Preuves de condition</strong> : Il est recommandé de photographier votre colis avant de le remettre au coursier de livraison.</li>
              </ul>
            </div>

            <!-- Right Card: Modes de Remboursement -->
            <div class="glass-panel" style="padding: 24px; border-radius: 20px; border: 1.5px solid var(--border); background: white; display: flex; flex-direction: column; gap: 16px;">
              <h4 style="font-size: 16px; font-weight: 850; margin: 0; color: var(--text-dark); display: flex; align-items: center; gap: 8px;">
                <span>💳</span> Modes de Remboursement
              </h4>
              <p style="font-size: 13.5px; color: var(--text-gray); margin: 0; line-height: 1.5;">Une fois votre retour approuvé suite au contrôle de qualité, vous disposez des options de versement suivantes :</p>
              
              <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 4px;">
                <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-dark); font-weight: 700;">
                  <span style="font-size: 18px;">📱</span> Mobile Money (Wave, Orange Money, MTN MoMo) <span style="font-size: 11px; font-weight: 800; background: #e3f2fd; color: #0052cc; padding: 2px 8px; border-radius: 6px; margin-left: auto;">Rapide</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-dark); font-weight: 700;">
                  <span style="font-size: 18px;">🏦</span> Virement bancaire (IBAN local)
                </div>
                <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-dark); font-weight: 700;">
                  <span style="font-size: 18px;">🎫</span> Bon d'achat SWEETOS (Crédit portefeuille instantané)
                </div>
              </div>
            </div>

          </div>

          <!-- Caution Box: Exceptions -->
          <div style="border-left: 4px solid #ff5630; padding: 18px 24px; background: rgba(255, 86, 48, 0.02); border-radius: 0 16px 16px 0; display: flex; flex-direction: column; gap: 6px;">
            <strong style="font-size: 14.5px; color: #ff5630; display: flex; align-items: center; gap: 8px;">
              <span>⚠️</span> Produits exclus du droit de retour
            </strong>
            <p style="font-size: 13px; color: var(--text-gray); line-height: 1.5; margin: 0;">
              Certains articles ne sont pas éligibles aux retours pour des raisons d'hygiène ou de personnalisation logicielle : touches de claviers personnalisées gravées à la demande, licences logicielles activées, et articles en promotion de déstockage final.
            </p>
          </div>

        </div>
      `;

    } else if (this.activeAboutTab === 'contact') {
      const storeName = sessionStorage.getItem('SWEETOS_store_name') || 'SWEETOS';
      const storeAddress = sessionStorage.getItem('SWEETOS_store_addr') || 'Abidjan, Cocody Mermoz';
      const storePhone = sessionStorage.getItem('SWEETOS_store_phone') || '+225 05 00 61 99 23';
      const storeEmail = sessionStorage.getItem('SWEETOS_store_email') || 'support@sweetos.com';
      const storeHours = sessionStorage.getItem('SWEETOS_store_hours') || 'Mon - Fri: 7:00 AM - 8:00 PM | Sun: Closed';
      const storeEntranceImage = sessionStorage.getItem('SWEETOS_store_entrance_image') || './assets/succes_technology_store_1786799642676.jpg';

      tabArea.innerHTML = `
        <div class="about-contact-tab animate-in" style="display: flex; flex-direction: column; gap: 32px;">
          
          <!-- Top Header Banner -->
          <div style="background: linear-gradient(135deg, #0b1a30 0%, #15305b 100%); border-radius: 20px; padding: 32px; display: flex; gap: 32px; align-items: center; justify-content: space-between; flex-wrap: wrap; box-shadow: 0 10px 30px rgba(11,26,48,0.15); color: white; position: relative; overflow: hidden;">
            <div style="position: absolute; right: -10%; top: -10%; width: 200px; height: 200px; background: rgba(0, 180, 216, 0.15); filter: blur(50px); border-radius: 50%;"></div>
            <div style="flex: 1.5; min-width: 280px; display: flex; flex-direction: column; gap: 14px; position: relative; z-index: 1;">
              <div style="background: rgba(255,255,255,0.1); width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-size: 20px;">📍</div>
              <h3 id="contact-banner-title" style="font-size: 28px; font-weight: 850; margin: 0; color: white; letter-spacing: -0.5px;">Contact ${storeName}</h3>
              <p style="font-size: 14.5px; color: rgba(255,255,255,0.75); margin: 0; line-height: 1.5; max-width: 500px;">Your trusted partner for premium technology products and exceptional service.</p>
              <div style="font-size: 13.5px; color: rgba(255,255,255,0.65); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span>📍</span> <span id="contact-banner-address">${storeAddress}</span>
              </div>
              <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.08); padding: 6px 12px; border-radius: 8px; font-size: 12.5px; width: fit-content; border: 1px solid rgba(255,255,255,0.12);">
                <span>🕒</span> ${storeHours}
              </div>
            </div>
            <div style="flex: 1; min-width: 260px; max-width: 380px; position: relative; z-index: 1;">
              <img src="${storeEntranceImage}" alt="Storefront" style="width: 100%; border-radius: 16px; height: 180px; object-fit: cover; border: 2px solid rgba(255,255,255,0.15); box-shadow: 0 10px 20px rgba(0,0,0,0.2);">
            </div>
          </div>

          <!-- Mid Section Grid: Info Rows & Map simulation -->
          <div style="display: flex; gap: 32px; flex-wrap: wrap;">
            
            <!-- Left Side: List of Rows -->
            <div style="flex: 1.2; min-width: 300px; display: flex; flex-direction: column; gap: 16px;">
              
              <!-- Card 1: Magasin Name -->
              <div class="glass-panel" style="padding: 16px 20px; border-radius: 16px; border: 1.5px solid var(--border); display: flex; flex-direction: column; gap: 12px; transition: transform 0.2s;">
                <div style="display: flex; gap: 16px; align-items: center; justify-content: space-between; width: 100%;">
                  <div style="display: flex; gap: 16px; align-items: center;">
                    <div style="font-size: 20px; background: rgba(0, 82, 204, 0.05); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">🏪</div>
                    <div>
                      <span style="font-size: 9.5px; font-weight: 800; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; display: block;">Store Name</span>
                      <span style="font-size: 13px; font-weight: 600; color: var(--text-dark);">Business display name:</span>
                    </div>
                  </div>
                </div>
                <input type="text" id="contact-store-input" value="${storeName}" readonly style="width: 100%; border: 1.5px solid var(--border); border-radius: 10px; height: 40px; padding: 0 16px; font-size: 13px; outline: none; background: #f8fafc; color: var(--text-dark); font-weight: 600; pointer-events: none;">
              </div>

              <!-- Card 2: Emplacement -->
              <div class="glass-panel" style="padding: 16px 20px; border-radius: 16px; border: 1.5px solid var(--border); display: flex; flex-direction: column; gap: 12px; transition: transform 0.2s;">
                <div style="display: flex; gap: 16px; align-items: center; justify-content: space-between; width: 100%;">
                  <div style="display: flex; gap: 16px; align-items: center;">
                    <div style="font-size: 20px; background: rgba(0, 82, 204, 0.05); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">📍</div>
                    <div>
                      <span style="font-size: 9.5px; font-weight: 800; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; display: block;">Location</span>
                      <span style="font-size: 13px; font-weight: 600; color: var(--text-dark);">Physical address coordinates:</span>
                    </div>
                  </div>
                  <button id="contact-map-btn" style="height: 30px; padding: 0 14px; font-size: 11.5px; border-radius: 8px; border: none; cursor: pointer; flex-shrink: 0; background: var(--primary); color: white; font-weight: 750;">Carte</button>
                </div>
                <input type="text" id="contact-address-input" value="${storeAddress}" readonly style="width: 100%; border: 1.5px solid var(--border); border-radius: 10px; height: 40px; padding: 0 16px; font-size: 13px; outline: none; background: #f8fafc; color: var(--text-dark); font-weight: 600; pointer-events: none;">
              </div>

              <!-- Card 3: Phone contact -->
              <div class="glass-panel" style="padding: 16px 20px; border-radius: 16px; border: 1.5px solid var(--border); display: flex; flex-direction: column; gap: 12px; transition: transform 0.2s;">
                <div style="display: flex; gap: 16px; align-items: center; justify-content: space-between; width: 100%;">
                  <div style="display: flex; gap: 16px; align-items: center;">
                    <div style="font-size: 20px; background: rgba(0, 82, 204, 0.05); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">📞</div>
                    <div>
                      <span style="font-size: 9.5px; font-weight: 800; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; display: block;">Phone / Contact</span>
                      <span style="font-size: 13px; font-weight: 600; color: var(--text-dark);">Cellular Dial / WhatsApp text number:</span>
                    </div>
                  </div>
                  <div style="display: flex; gap: 6px; flex-shrink: 0;">
                    <button id="contact-wa-btn" style="height: 30px; padding: 0 12px; font-size: 11px; border-radius: 8px; border: none; cursor: pointer; background: #25d366; color: white; font-weight: 750;">WhatsApp</button>
                    <button id="contact-call-btn" style="height: 30px; padding: 0 12px; font-size: 11px; border-radius: 8px; border: 1.5px solid var(--border); cursor: pointer; background: white; color: var(--text-gray); font-weight: 750;">Appeler</button>
                  </div>
                </div>
                <input type="text" id="contact-phone-input" value="${storePhone}" readonly style="width: 100%; border: 1.5px solid var(--border); border-radius: 10px; height: 40px; padding: 0 16px; font-size: 13px; outline: none; background: #f8fafc; color: var(--text-dark); font-weight: 600; pointer-events: none;">
              </div>

              <!-- Card 4: Email contact -->
              <div class="glass-panel" style="padding: 16px 20px; border-radius: 16px; border: 1.5px solid var(--border); display: flex; flex-direction: column; gap: 12px; transition: transform 0.2s;">
                <div style="display: flex; gap: 16px; align-items: center; justify-content: space-between; width: 100%;">
                  <div style="display: flex; gap: 16px; align-items: center;">
                    <div style="font-size: 20px; background: rgba(0, 82, 204, 0.05); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">✉️ </div>
                    <div>
                      <span style="font-size: 9.5px; font-weight: 800; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; display: block;">E-mail Support</span>
                      <span style="font-size: 13px; font-weight: 600; color: var(--text-dark);">Official support dispatch address:</span>
                    </div>
                  </div>
                  <button id="contact-email-btn" style="height: 30px; padding: 0 14px; font-size: 11.5px; border-radius: 8px; border: none; cursor: pointer; flex-shrink: 0; background: #0052cc; color: white; font-weight: 750;">Envoyer</button>
                </div>
                <input type="email" id="contact-email-input" value="${storeEmail}" readonly style="width: 100%; border: 1.5px solid var(--border); border-radius: 10px; height: 40px; padding: 0 16px; font-size: 13px; outline: none; background: #f8fafc; color: var(--text-dark); font-weight: 600; pointer-events: none;">
              </div>

              <!-- Card 5: Hours -->
              <div class="glass-panel" style="padding: 16px 20px; border-radius: 16px; border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 16px; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                <div style="display: flex; gap: 16px; align-items: center;">
                  <div style="font-size: 20px; background: rgba(0, 82, 204, 0.05); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">🕒</div>
                  <div>
                    <span style="font-size: 9.5px; font-weight: 800; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; display: block;">Horaires d'ouverture</span>
                    <span style="font-size: 13px; font-weight: 600; color: var(--text-dark);">${storeHours}</span>
                  </div>
                </div>
                <span style="font-size: 11px; font-weight: 800; padding: 6px 12px; border-radius: 8px; background: #e3f2fd; color: #0052cc; border: 1px solid rgba(0, 82, 204, 0.15);">Open</span>
              </div>

            </div>

            <!-- Right Side: Simulated Map Card -->
            <div class="glass-panel" style="flex: 1; min-width: 300px; padding: 32px; border-radius: 20px; border: 1.5px solid var(--border); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 20px; background: rgba(255,255,255,0.85);">
              <div style="width: 72px; height: 72px; border-radius: 20px; background: rgba(0, 82, 204, 0.06); display: flex; align-items: center; justify-content: center; font-size: 36px; color: #0052cc;">🗺ï¸</div>
              <div>
                <h4 style="font-size: 18px; font-weight: 850; color: var(--text-dark); margin-bottom: 8px;">Trouvez-nous ici</h4>
                <p id="contact-map-address" style="font-size: 13px; color: var(--text-gray); line-height: 1.5; max-width: 260px; margin: 0 auto 10px;">${storeAddress}</p>
                <div id="contact-map-store" style="font-size: 14.5px; font-weight: 800; color: var(--primary); margin-top: 4px;">Store: ${storeName}</div>
              </div>
              <button id="contact-gmaps-btn" class="btn-primary" style="height: 42px; padding: 0 24px; border-radius: 10px; font-weight: 750; border: none; cursor: pointer;">Ouvrir dans Google Maps</button>
            </div>

          </div>

          <!-- Quick Action Buttons -->
          <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: space-between; margin-top: 8px;">
            <button id="contact-itinerary-btn" class="btn-secondary" style="flex: 1; min-width: 140px; height: 44px; border-radius: 10px; font-size: 13px; font-weight: 750; background: white; cursor: pointer; border: 1.5px solid var(--border); width: 100%;">Itinéraire / Directions</button>
            <button id="contact-share-btn" class="btn-secondary" style="flex: 1; min-width: 140px; height: 44px; border-radius: 10px; font-size: 13px; font-weight: 750; background: white; cursor: pointer; border: 1.5px solid var(--border);">Partager l'emplacement</button>
            <button id="contact-browse-btn" class="btn-secondary" style="flex: 1; min-width: 140px; height: 44px; border-radius: 10px; font-size: 13px; font-weight: 750; background: white; cursor: pointer; border: 1.5px solid var(--border);">Parcourir les produits</button>
          </div>

          <!-- Social Connect Row -->
          <div class="glass-panel" style="padding: 16px 24px; border-radius: 16px; border: 1.5px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-top: 8px;">
            <span style="font-size: 13.5px; font-weight: 750; color: var(--text-dark);">Connectez-vous avec nous sur les réseaux sociaux</span>
            <div style="display: flex; gap: 12px;">
              <span style="font-size: 12px; color: var(--text-light);">No social links available</span>
            </div>
          </div>

          <!-- Footer Visite Banner -->
          <div style="background: linear-gradient(135deg, #0b1a30 0%, #15305b 100%); border-radius: 20px; padding: 40px; text-align: center; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; box-shadow: 0 10px 30px rgba(11,26,48,0.15); margin-top: 16px;">
            <h3 style="font-size: 24px; font-weight: 850; margin: 0; color: white;">Prêt à nous rendre visite ?</h3>
            <p style="font-size: 14px; color: rgba(255,255,255,0.75); margin: 0; max-width: 440px; line-height: 1.5;">Venez découvrir nos produits en personne. Nous sommes ravis de vous servir !</p>
            <div style="display: flex; gap: 16px; width: 100%; max-width: 360px; justify-content: center;">
              <button id="contact-footer-itinerary-btn" class="btn-primary" style="flex: 1; height: 42px; border-radius: 10px; font-weight: 750; font-size: 13.5px; border: none; cursor: pointer;">Itinéraire</button>
              <button id="contact-footer-browse-btn" style="flex: 1; height: 42px; border-radius: 10px; font-weight: 750; font-size: 13.5px; background: rgba(255,255,255,0.08); border: 1.5px solid rgba(255,255,255,0.25); color: white; cursor: pointer;">Visiter le catalogue</button>
            </div>
          </div>

        </div>
      `;

      // Programmatic listeners
      const shadow = this.shadowRoot;

      const triggerMap = () => {
        const addr = shadow.getElementById('contact-address-input').value.trim();
        if (addr) {
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`);
        } else {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Please enter a valid address to search! 📍' }));
        }
      };

      const triggerCall = () => {
        const phone = shadow.getElementById('contact-phone-input').value.trim();
        if (phone) {
          window.open(`tel:${phone}`);
        } else {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'No phone number entered!' }));
        }
      };

      const triggerWhatsApp = () => {
        const phone = shadow.getElementById('contact-phone-input').value.trim().replace(/[^0-9]/g, '');
        if (phone) {
          window.open(`https://wa.me/${phone}`);
        } else {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'No phone number entered for WhatsApp!' }));
        }
      };

      const triggerEmail = () => {
        const email = shadow.getElementById('contact-email-input').value.trim();
        if (email) {
          window.open(`mailto:${email}`);
        } else {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'No email address entered!' }));
        }
      };

      const triggerBrowse = () => {
        this.currentPage = 'catalog';
        this.currentCategory = 'All';
        this.renderPageContent();
        window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'catalog', category: 'All' } }));
      };

      // Address input sync
      shadow.getElementById('contact-address-input').addEventListener('input', (e) => {
        const val = e.target.value;
        shadow.getElementById('contact-banner-address').textContent = val || 'No address specified';
        shadow.getElementById('contact-map-address').textContent = val || 'No address specified';
        
        const profileObj = this.loadUserProfile();
        profileObj.address = val;
        this.saveUserProfile(profileObj);
        sessionStorage.setItem('SWEETOS_store_addr', val);
      });

      // Phone input sync
      shadow.getElementById('contact-phone-input').addEventListener('input', (e) => {
        const val = e.target.value;
        const profileObj = this.loadUserProfile();
        profileObj.phone = val;
        this.saveUserProfile(profileObj);
        sessionStorage.setItem('SWEETOS_store_phone', val);
      });

      // Email input sync
      shadow.getElementById('contact-email-input').addEventListener('input', (e) => {
        const val = e.target.value;
        const profileObj = this.loadUserProfile();
        profileObj.email = val;
        this.saveUserProfile(profileObj);
        sessionStorage.setItem('SWEETOS_store_email', val);
      });

      // Store name input sync
      shadow.getElementById('contact-store-input').addEventListener('input', (e) => {
        const val = e.target.value;
        shadow.getElementById('contact-banner-title').textContent = `Contact ${val || 'Store'}`;
        shadow.getElementById('contact-map-store').textContent = `Store: ${val || 'Store'}`;
        sessionStorage.setItem('SWEETOS_store_name', val);
      });

      shadow.getElementById('contact-map-btn').addEventListener('click', triggerMap);
      shadow.getElementById('contact-gmaps-btn').addEventListener('click', triggerMap);
      shadow.getElementById('contact-itinerary-btn').addEventListener('click', triggerMap);
      shadow.getElementById('contact-footer-itinerary-btn').addEventListener('click', triggerMap);
      
      shadow.getElementById('contact-wa-btn').addEventListener('click', triggerWhatsApp);
      shadow.getElementById('contact-call-btn').addEventListener('click', triggerCall);
      shadow.getElementById('contact-email-btn').addEventListener('click', triggerEmail);

      shadow.getElementById('contact-browse-btn').addEventListener('click', triggerBrowse);
      shadow.getElementById('contact-footer-browse-btn').addEventListener('click', triggerBrowse);

      shadow.getElementById('contact-share-btn').addEventListener('click', () => {
        const addr = shadow.getElementById('contact-address-input').value.trim();
        if (addr) {
          navigator.clipboard.writeText(addr).then(() => {
            window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Address copied to clipboard! 📋' }));
          });
        }
      });
    }
  }

  attachAboutTabListeners() {
    const shadow = this.shadowRoot;
    shadow.querySelectorAll('[data-about-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        shadow.querySelectorAll('[data-about-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tab = btn.getAttribute('data-about-tab');
        this.activeAboutTab = tab;
        this.injectAboutTabContent();
      });
    });
  }

  attachAboutPageListeners() {
    const shadow = this.shadowRoot;
    shadow.querySelectorAll('[data-nav-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetPage = btn.getAttribute('data-nav-page');
        this.currentPage = targetPage;
        this.updateHashURL();
        this.renderPageContent();
      });
    });

    this.attachAboutTabListeners();
  }

  attachCouponsListListeners() {
    const shadow = this.shadowRoot;
    
    shadow.querySelectorAll('.unlocked-coupon-card').forEach(card => {
      card.addEventListener('click', () => {
        const code = card.getAttribute('data-coupon-code');
        this.currentCouponCode = code;
        this.renderPageContent();
      });
    });

    shadow.querySelectorAll('.scratch-canvas').forEach(canvas => {
      const cardId = parseInt(canvas.getAttribute('data-scratchcard-id'));
      const ctx = canvas.getContext('2d');
      
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#cfd8dc');
      grad.addColorStop(0.5, '#eceff1');
      grad.addColorStop(1, '#b0bec5');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#37474f';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GRATTEZ ICI / SCRATCH HERE', canvas.width / 2, canvas.height / 2 - 10);
      ctx.font = '11px sans-serif';
      ctx.fillText('🎁 Boîte Mystère 🎁', canvas.width / 2, canvas.height / 2 + 15);
      
      let isDrawing = false;
      
      const getMousePos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: (clientX - rect.left) * (canvas.width / rect.width),
          y: (clientY - rect.top) * (canvas.height / rect.height)
        };
      };
      
      const scratch = (pos) => {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        ctx.fill();
        checkProgress();
      };
      
      const checkProgress = () => {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;
        let transparent = 0;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] === 0) {
            transparent++;
          }
        }
        const pct = (transparent / (pixels.length / 4)) * 100;
        if (pct > 40) {
          canvas.style.opacity = '0';
          canvas.style.pointerEvents = 'none';
          
          try {
            const scratchKey = getScratchcardsStorageKey();
            let scratchcards = JSON.parse(sessionStorage.getItem(scratchKey) || '[]');
            const rawCardId = canvas.getAttribute('data-scratchcard-id');
            const idx = scratchcards.findIndex(sc => String(sc.id) === String(rawCardId));
            if (idx > -1 && !scratchcards[idx].scratched) {
              scratchcards[idx].scratched = true;
              
              const card = scratchcards[idx];
              const totalCFA = card.amount || 0;
              
              const loggedInUserStr = sessionStorage.getItem('SWEETOS_logged_in_user');
              let userEmail = 'guest@sweetos.com';
              if (loggedInUserStr) {
                try {
                  userEmail = JSON.parse(loggedInUserStr).email;
                } catch(e) {}
              }

              // 1. Check if this is a Badge Reward Mystery Box
              if (card.badgeReward || card.rewardCode) {
                const wonReward = scratchBadgeReward(userEmail);
                const rewardCode = wonReward?.code || card.rewardCode || `BADGE5-${Math.floor(1000 + Math.random() * 9000)}`;
                const uses = wonReward?.remainingUses || 5;
                scratchcards[idx].scratched = true;
                scratchcards[idx].couponWon = {
                  code: rewardCode,
                  type: 'percentage',
                  value: 5,
                  limit: wonReward?.totalUses || uses,
                  remainingUses: uses,
                  totalUses: wonReward?.totalUses || uses,
                  badgeCoupon: true,
                  expiry: 'Sans expiration',
                  status: 'active',
                  description: `5% de réduction (${uses}/${wonReward?.totalUses || uses} utilisations)`
                };
                sessionStorage.setItem(scratchKey, JSON.stringify(scratchcards));
                window.dispatchEvent(new CustomEvent('toast:show', { 
                  detail: `🎉 FÉLICITATIONS ! Badge gratté avec succès ! Coupon de 5% OFF débloqué (Code: ${rewardCode}) disponible dans votre panier ! 🎟️✨` 
                }));
              } 
              // 2. Check if this box is from Today's Deals with minimum spend requirement
              else if (card.dealsActive || card.dealsSpent > 0 || card.meetsRequirement) {
                const dealsCfg = getTodaysDealsConfig();
                const requiredDealSpend = card.requiredDealSpend || dealsCfg.minSpendForReward || 15000;
                const dealsSpent = card.dealsSpent || 0;
                const meetsDealSpend = (dealsSpent >= requiredDealSpend) || Boolean(card.meetsRequirement);

                if (meetsDealSpend) {
                  // Today's Deals Reward Won!
                  const pool = dealsCfg.couponPool || { discountPercent: 5 };
                  const code = `DEAL5-${Math.floor(1000 + Math.random() * 9000)}`;
                  const expiry14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  const dealCoupon = {
                    code: code,
                    type: 'percentage',
                    value: pool.discountPercent || 5,
                    minOrder: 0,
                    limit: 1,
                    used: 0,
                    expiry: expiry14Days,
                    status: 'active',
                    description: `Coupon Offre Flash du Jour (Achat ${formatPrice(dealsSpent || totalCFA)} atteint)`
                  };

                  let adminCoupons = [];
                  try {
                    adminCoupons = JSON.parse(sessionStorage.getItem('SWEETOS_coupons') || '[]');
                  } catch(e) {}
                  adminCoupons.unshift(dealCoupon);
                  sessionStorage.setItem('SWEETOS_coupons', JSON.stringify(adminCoupons));

                  scratchcards[idx].scratched = true;
                  scratchcards[idx].couponWon = dealCoupon;
                  sessionStorage.setItem(scratchKey, JSON.stringify(scratchcards));

                  window.dispatchEvent(new CustomEvent('toast:show', { 
                    detail: `🎉 FÉLICITATIONS ! Palier Offre du Jour atteint ! Coupon de ${dealCoupon.value}% OFF débloqué (Code: ${code}) ! 🎟️✨` 
                  }));
                } else {
                  // Didn't reach the required deal spend
                  scratchcards[idx].scratched = true;
                  scratchcards[idx].couponWon = 'lost';
                  const emptyMessage = `Oups ! Bonne chance pour la prochaine fois ! 🍀 (Pour débloquer ce coupon, achetez pour au moins ${requiredDealSpend.toLocaleString()} FCFA dans les Offres du Jour).`;
                  scratchcards[idx].emptyMessage = emptyMessage;
                  sessionStorage.setItem(scratchKey, JSON.stringify(scratchcards));
                  window.dispatchEvent(new CustomEvent('toast:show', { detail: `📦 ${emptyMessage}` }));
                }
              }
              // 3. Check if customer has unlocked a Level (from 50,000 FCFA up)
              else if (totalCFA >= 50000) {
                const customerTier = getCustomerLevel(totalCFA);
                const couponValue = customerTier.rewardDiscount || customerTier.levelNum || 1;
                const couponCodePrefix = `LOYAL${couponValue}`;

                // Check Admin Market for active valid coupon
                let adminCoupons = [];
                try {
                  adminCoupons = JSON.parse(sessionStorage.getItem('SWEETOS_coupons') || '[]');
                } catch(e) {}

                const expiry7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const code = `${couponCodePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
                const newCoupon = {
                  code: code,
                  type: 'percentage',
                  value: couponValue,
                  minOrder: 5000,
                  limit: 1,
                  used: 0,
                  scratchedAt: Date.now(),
                  expiry: expiry7Days,
                  status: 'active',
                  description: `${couponValue}% de réduction ${customerTier.label}`
                };
                
                adminCoupons.unshift(newCoupon);
                sessionStorage.setItem('SWEETOS_coupons', JSON.stringify(adminCoupons));
                
                scratchcards[idx].couponWon = newCoupon;
                const winMsg = `🎉 Félicitations ! Vous avez débloqué le ${customerTier.label} avec un coupon de ${couponValue}% OFF (Code: ${code}) valable 7 jours ! 🎟️`;
                window.dispatchEvent(new CustomEvent('toast:show', { detail: winMsg }));
              } 
              // 4. Default: No requirements reached -> Oops! Better luck next time!
              else {
                scratchcards[idx].couponWon = 'lost';
                const emptyMessage = 'Oops! Good luck next time! / Oups ! Bonne chance pour la prochaine fois ! 🍀✨';
                scratchcards[idx].emptyMessage = emptyMessage;
                sessionStorage.setItem(scratchKey, JSON.stringify(scratchcards));
                window.dispatchEvent(new CustomEvent('toast:show', { detail: `📦 ${emptyMessage}` }));
              }

              sessionStorage.setItem(scratchKey, JSON.stringify(scratchcards));
              
              setTimeout(() => {
                this.renderPageContent();
              }, 600);
            }
          } catch(e) {
            console.error('Scratching error:', e);
          }
        }
      };
      
      const startDrawing = (e) => {
        isDrawing = true;
        scratch(getMousePos(e));
      };
      
      const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        scratch(getMousePos(e));
      };
      
      const stopDrawing = () => {
        isDrawing = false;
      };
      
      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      window.addEventListener('mouseup', stopDrawing);
      
      canvas.addEventListener('touchstart', startDrawing);
      canvas.addEventListener('touchmove', draw, { passive: false });
      window.addEventListener('touchend', stopDrawing);
    });
  }

  attachCouponDetailListeners(coupon) {
    const shadow = this.shadowRoot;
    
    // Back to Coupons list
    const backBtn = shadow.getElementById('coupon-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.currentCouponCode = null;
        this.renderPageContent();
      });
    }

    // Breadcrumbs home
    const crumbHome = shadow.getElementById('coupon-crumb-home');
    if (crumbHome) {
      crumbHome.addEventListener('click', () => {
        this.currentPage = 'home';
        this.currentCouponCode = null;
        this.renderPageContent();
        window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'home' } }));
      });
    }

    // Breadcrumbs list
    const crumbList = shadow.getElementById('coupon-crumb-list');
    if (crumbList) {
      crumbList.addEventListener('click', () => {
        this.currentCouponCode = null;
        this.renderPageContent();
      });
    }

    // Copy to clipboard
    const codeBox = shadow.getElementById('detail-coupon-code-box');
    if (codeBox) {
      codeBox.addEventListener('click', () => {
        navigator.clipboard.writeText(coupon.code).then(() => {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Code promo "${coupon.code}" copié ! 📋` }));
        });
      });
    }

    // Apply coupon
    const applyBtn = shadow.getElementById('detail-coupon-apply-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('cart:toggle', { detail: { open: true } }));
        setTimeout(() => {
          const drawer = document.querySelector('cart-drawer');
          if (drawer && drawer.shadowRoot) {
            const input = drawer.shadowRoot.getElementById('promoInput');
            const apply = drawer.shadowRoot.getElementById('promoApply');
            if (input && apply) {
              input.value = coupon.code;
              apply.click();
            }
          }
        }, 150);
      });
    }

    // Share to WhatsApp / Web Share
    const shareBtn = shadow.getElementById('detail-coupon-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const discountText = coupon.type === 'percentage' ? `${coupon.value}% OFF` : `${formatPrice(coupon.value)} OFF`;
        const shareTitle = `🎫 Code Promo SWEETOS: ${coupon.code}`;
        const shareText = `🌟 OFFRE SPÉCIALE SWEETOS ! 🌟\nProfitez d'une réduction exclusive sur notre boutique en ligne !\n\nCode Promo : *${coupon.code}*\nRéduction : *${discountText}*\nDate d'expiration : *${coupon.expiry}*\n\nFaites vos achats ici : ${window.location.origin}`;
        
        const copyToClipboardFallback = () => {
          navigator.clipboard.writeText(shareText)
            .then(() => {
              window.dispatchEvent(new CustomEvent('toast:show', { detail: '📋 Coupon copié dans le presse-papiers ! / Copied to clipboard! 🌟' }));
            })
            .catch(() => {
              const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
              window.open(whatsappUrl, '_blank');
            });
        };

        if (navigator.share) {
          navigator.share({
            title: shareTitle,
            text: shareText,
            url: window.location.origin
          }).catch(err => {
            console.log('Error sharing:', err);
            copyToClipboardFallback();
          });
        } else {
          copyToClipboardFallback();
        }
      });
    }
  }

  logCustomerActivity(pageName) {
    let sessionId = sessionStorage.getItem('SWEETOS_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now();
      sessionStorage.setItem('SWEETOS_session_id', sessionId);
    }
    
    let logs = [];
    try {
      logs = JSON.parse(sessionStorage.getItem('SWEETOS_activity_logs') || '[]');
    } catch (err) {}
    
    let userName = 'Guest User';
    let loginType = 'Not Logged In';
    
    const loggedIn = sessionStorage.getItem('SWEETOS_logged_in_user');
    if (loggedIn) {
      try {
        const userObj = JSON.parse(loggedIn);
        userName = userObj.email;
        const creds = JSON.parse(sessionStorage.getItem('SWEETOS_customer_credentials') || '[]');
        const userCred = creds.find(c => c.email.toLowerCase() === userObj.email.toLowerCase());
        if (userCred) {
          userName = userCred.fullname || userCred.email;
          loginType = userCred.password === 'google_oauth_bypass' ? 'Google OAuth' : 'Email & Password';
        } else {
          loginType = 'Email & Password';
        }
      } catch (e) {}
    }
    
    let sessionRecord = logs.find(log => log.id === sessionId);
    const dateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    
    if (!sessionRecord) {
      const ua = navigator.userAgent;
      let browser = "Chrome"; // fallback default
      if (ua.includes("Firefox")) browser = "Firefox";
      else if (ua.includes("SamsungBrowser")) browser = "Samsung";
      else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
      else if (ua.includes("Trident")) browser = "IE";
      else if (ua.includes("Edge") || ua.includes("Edg")) browser = "Edge";
      else if (ua.includes("Chrome")) browser = "Chrome";
      else if (ua.includes("Safari")) browser = "Safari";

      let device = "Desktop";
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        device = "Tablet";
      } else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        device = "Mobile";
      }

      let source = "Direct";
      if (document.referrer) {
        try {
          const url = new URL(document.referrer);
          source = url.hostname.replace('www.', '') || "Referral";
        } catch (e) {
          source = "Referral";
        }
      }

      sessionRecord = {
        id: sessionId,
        user: userName,
        loginType: loginType,
        visits: [],
        bought: false,
        timestamp: dateStr,
        browser: browser,
        device: device,
        source: source
      };
      logs.push(sessionRecord);
    }
    
    if (userName !== 'Guest User') {
      sessionRecord.user = userName;
      sessionRecord.loginType = loginType;
    }
    
    const lastVisit = sessionRecord.visits[sessionRecord.visits.length - 1];
    if (lastVisit !== pageName) {
      sessionRecord.visits.push(pageName);
    }
    
    sessionStorage.setItem('SWEETOS_activity_logs', JSON.stringify(logs));
  }

  // --- Functional Notifications Event Handlers ---
  // --- Functional Profile Tab Handlers ---
  injectProfileTabContent() {
    const tabArea = this.shadowRoot.getElementById('profile-tab-content');
    if (!tabArea) return;
    const profile = this.loadUserProfile();
    
    if (!profile) {
      tabArea.innerHTML = `
        <div class="profile-overview-tab animate-in" style="padding: 60px 20px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 12px;">🔒</div>
          <h3 style="font-size: 22px; font-weight: 850; margin: 0 0 8px 0; color: var(--text-dark);">Connexion Requise</h3>
          <p style="font-size: 14px; color: var(--text-gray); margin: 0 0 20px 0;">Veuillez vous connecter pour accéder à votre profil et suivre vos commandes.</p>
          <button id="goto-auth-btn-profile" class="shop-now-btn" style="padding: 12px 24px; font-size: 14px; font-weight: 800; border-radius: 12px; background: var(--primary); color: white; border: none; cursor: pointer;">
            Se connecter / S'inscrire &rarr;
          </button>
        </div>
      `;
      const btn = tabArea.querySelector('#goto-auth-btn-profile');
      if (btn) {
        btn.addEventListener('click', () => {
          window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'auth' } }));
        });
      }
      return;
    }
    
    if (this.activeProfileTab === 'overview') {
      const wishlist = this.loadWishlistFromStorage();
      
      const notifKey = 'SWEETOS_notifications';
      const savedNotif = sessionStorage.getItem(notifKey);
      let notifCount = 3;
      if (savedNotif) {
        try {
          notifCount = JSON.parse(savedNotif).filter(n => n.unread).length;
        } catch (e) {}
      }

      const avatarData = getCustomerAvatarStyle(profile, 88);
      const avatarStyle = avatarData.style;
      const levelColor = avatarData.color;

      const initials = `${(profile.firstName || 'C').charAt(0)}${(profile.lastName || 'U').charAt(0)}`.toUpperCase();

      tabArea.innerHTML = `
        <div class="profile-overview-tab animate-in">
          <div class="profile-overview-hero">
            <div style="position: relative; width: 88px; height: 88px; flex-shrink: 0;">
              <div class="profile-avatar-circle" style="width: 88px; height: 88px; border-radius: 50%; font-size: 28px; font-weight: 850; display: flex; align-items: center; justify-content: center; position: relative; ${avatarStyle}">
                ${profile.avatar ? '' : initials}
              </div>
              ${renderLevelChevronV(avatarData.level, 26)}
              <button id="profile-upload-avatar-trigger" title="Changer la photo de profil" style="position: absolute; bottom: 0; right: 0; width: 30px; height: 30px; border-radius: 50%; background: ${levelColor}; color: white; border: 2px solid white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 8px ${levelColor}50; transition: all 0.2s; z-index: 4;">
                📷
              </button>
              <input type="file" id="profile-avatar-file-input" accept="image/*" style="display: none;">
            </div>

            <div class="profile-hero-info">
              <div class="profile-hero-name-row" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <h3 style="margin: 0; font-size: 22px; font-weight: 850; color: var(--text-dark);">${profile.firstName} ${profile.lastName}</h3>
                ${renderVerificationBadge(profile.badgeType || 'none', 22)}
                ${renderLevelPill(profile.level || 'starter')}
              </div>
              <p class="profile-hero-email" style="margin: 4px 0 6px 0; color: var(--text-gray); font-size: 13.5px;">${profile.email}</p>
              <p class="profile-hero-bio" style="margin: 0; font-size: 13.5px; color: var(--text-dark);">"${profile.bio || 'Passionné d’accessoires et de tech setups.'}"</p>
              
              ${(() => {
                const badgeReward = getBadgeRewardCoupon(profile.email);
                if (badgeReward && badgeReward.remainingUses > 0) {
                  return `
                    <div style="margin-top: 10px; display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, rgba(0, 102, 255, 0.08), rgba(0, 180, 216, 0.08)); border: 1.5px dashed #0066ff; padding: 6px 14px; border-radius: 12px; font-size: 12px; color: #0052cc; font-weight: 800;">
                      <span>🎟️ Coupon Badge 5% OFF : <code style="background: white; padding: 2px 6px; border-radius: 6px; color: #0052cc; font-weight: 900;">${badgeReward.code}</code></span>
                      <span style="color: #475569; font-weight: 700;">• <strong>${badgeReward.remainingUses}/${badgeReward.totalUses}</strong> utilisations restantes (Sans expiration)</span>
                    </div>
                  `;
                }
                return '';
              })()}
            </div>
          </div>

          <div class="profile-stats-grid">
            <div class="stat-card">
              <div class="stat-icon cart">🛒</div>
              <div class="stat-nums">
                <span class="stat-value">${(profile.orders || []).length}</span>
                <span class="stat-label">Orders Placed</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon dollar">💵</div>
              <div class="stat-nums">
                <span class="stat-value">${formatPrice((profile.orders || []).reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0))}</span>
                <span class="stat-label">Total Spent</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon heart">❤️</div>
              <div class="stat-nums">
                <span class="stat-value" id="profile-wish-count">${wishlist.length}</span>
                <span class="stat-label">Wishlist Items</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon bell">🔔</div>
              <div class="stat-nums">
                <span class="stat-value">${notifCount}</span>
                <span class="stat-label">Unread Alerts</span>
              </div>
            </div>
          </div>

          <div class="profile-orders-list-panel">
            <h4 class="profile-section-title">Order History & Tracking</h4>
            <div class="orders-list-wrapper">
              ${(profile.orders || []).length === 0 ? `
                <div style="padding: 30px; text-align: center; color: var(--text-gray);">
                  <span>📦 Aucune commande enregistrée pour le moment.</span>
                </div>
              ` : (profile.orders || []).map(o => `
                <div class="profile-order-row">
                  <div class="order-info-block">
                    <span class="order-id-label">${o.id}</span>
                    <span class="order-item-desc">${o.items}</span>
                  </div>
                  <div class="order-delivery-progress">
                    <div class="progress-bar-track">
                      <div class="progress-bar-fill delivered"></div>
                    </div>
                    <span class="progress-status-text">Delivered on ${o.date}</span>
                  </div>
                  <div class="order-price-block">
                    <span class="order-total-price">${formatPrice(o.total)}</span>
                    <button class="order-invoice-btn" data-id="${o.id}">Invoice PDF</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      // Attach avatar upload listeners
      const uploadTrigger = tabArea.querySelector('#profile-upload-avatar-trigger');
      const fileInput = tabArea.querySelector('#profile-avatar-file-input');
      if (uploadTrigger && fileInput) {
        uploadTrigger.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (file) {
            window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Uploading avatar to Supabase Cloud Storage...' }));
            try {
              const { uploadFileToSupabaseStorage } = await import('../../utils/supabase.js');
              const cloudUrl = await uploadFileToSupabaseStorage(file);
              const finalUrl = cloudUrl || await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = (loadEvt) => resolve(loadEvt.target.result);
                reader.readAsDataURL(file);
              });

              profile.avatar = finalUrl;
              this.saveUserProfile(profile);
              window.dispatchEvent(new CustomEvent('profile:updated'));
              window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true } }));
              window.dispatchEvent(new CustomEvent('toast:show', { detail: cloudUrl ? 'Photo de profil enregistrée dans Supabase Storage! 📷✨' : 'Photo de profil mise à jour ! 📷✨' }));
              this.injectProfileTabContent();
            } catch(err) {
              const reader = new FileReader();
              reader.onload = (loadEvt) => {
                const base64 = loadEvt.target.result;
                profile.avatar = base64;
                this.saveUserProfile(profile);
                window.dispatchEvent(new CustomEvent('profile:updated'));
                window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true } }));
                window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Photo de profil mise à jour avec succès ! 📷✨' }));
                this.injectProfileTabContent();
              };
              reader.readAsDataURL(file);
            }
          }
        });
      }

      tabArea.querySelectorAll('.order-invoice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Downloading invoice receipt ${id}.pdf... 📄` }));
        });
      });

    } else if (this.activeProfileTab === 'settings') {
      tabArea.innerHTML = `
        <div class="profile-settings-tab animate-in">
          <h4 class="profile-section-title">Edit Profile Information</h4>
          <p class="profile-section-subtitle">Update your personal account credentials, photo and details stored on SWEETOS.</p>
          
          <!-- Avatar Edit Row -->
          <div style="display: flex; align-items: center; gap: 18px; margin-bottom: 24px; padding: 16px; background: rgba(255,255,255,0.7); border: 1.5px solid var(--border); border-radius: 16px;">
            <div style="width: 64px; height: 64px; border-radius: 50%; ${profile.avatar ? `background-image: url('${profile.avatar}'); background-size: cover; background-position: center; border: 2px solid #0052cc;` : 'background: linear-gradient(135deg, #0052cc 0%, #00b4d8 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 850;'}">
              ${profile.avatar ? '' : `${(profile.firstName || 'C').charAt(0)}${(profile.lastName || 'U').charAt(0)}`}
            </div>
            <div>
              <div style="display: flex; gap: 8px; margin-bottom: 4px;">
                <button type="button" id="settings-upload-avatar-btn" style="background: var(--primary); color: white; border: none; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer;">
                  📷 Importer une photo
                </button>
                ${profile.avatar ? `
                  <button type="button" id="settings-remove-avatar-btn" style="background: transparent; color: var(--red); border: 1px solid var(--red); padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 750; cursor: pointer;">
                    Supprimer
                  </button>
                ` : ''}
              </div>
              <small style="color: var(--text-gray); font-size: 11.5px;">Formats acceptés : JPG, PNG, WEBP (Max 5 Mo).</small>
              <input type="file" id="settings-avatar-file-input" accept="image/*" style="display: none;">
            </div>
          </div>

          <form class="profile-settings-form" id="profile-edit-form">
            <div class="form-row-2">
              <div class="form-group">
                <label for="prof-fname">First Name</label>
                <input type="text" id="prof-fname" value="${profile.firstName}" required autocomplete="given-name">
              </div>
              <div class="form-group">
                <label for="prof-lname">Last Name</label>
                <input type="text" id="prof-lname" value="${profile.lastName}" required autocomplete="family-name">
              </div>
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label for="prof-email">Email Address</label>
                <input type="email" id="prof-email" value="${profile.email}" required autocomplete="email">
              </div>
              <div class="form-group">
                <label for="prof-phone">Phone Number</label>
                <input type="text" id="prof-phone" value="${profile.phone}" required autocomplete="tel">
              </div>
            </div>

            <div class="form-group">
              <label for="prof-bio">Short Biography</label>
              <textarea id="prof-bio" rows="4" placeholder="Brief info about your desk setup preferences...">${profile.bio || ''}</textarea>
            </div>

            <button type="submit" class="btn-primary profile-save-submit-btn">Save Changes</button>
          </form>
        </div>
      `;

      const settingsUploadBtn = tabArea.querySelector('#settings-upload-avatar-btn');
      const settingsFileInput = tabArea.querySelector('#settings-avatar-file-input');
      const settingsRemoveBtn = tabArea.querySelector('#settings-remove-avatar-btn');

      if (settingsUploadBtn && settingsFileInput) {
        settingsUploadBtn.addEventListener('click', () => settingsFileInput.click());
        settingsFileInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (file) {
            window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Uploading avatar to Supabase Cloud Storage...' }));
            try {
              const { uploadFileToSupabaseStorage } = await import('../../utils/supabase.js');
              const cloudUrl = await uploadFileToSupabaseStorage(file);
              const finalUrl = cloudUrl || await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = (loadEvt) => resolve(loadEvt.target.result);
                reader.readAsDataURL(file);
              });

              profile.avatar = finalUrl;
              this.saveUserProfile(profile);
              window.dispatchEvent(new CustomEvent('profile:updated'));
              window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true } }));
              window.dispatchEvent(new CustomEvent('toast:show', { detail: cloudUrl ? 'Photo de profil enregistrée dans Supabase Storage! 📷✨' : 'Photo de profil mise à jour ! 📷✨' }));
              this.injectProfileTabContent();
            } catch(err) {
              const reader = new FileReader();
              reader.onload = (loadEvt) => {
                const base64 = loadEvt.target.result;
                profile.avatar = base64;
                this.saveUserProfile(profile);
                window.dispatchEvent(new CustomEvent('profile:updated'));
                window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true } }));
                window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Photo de profil mise à jour ! 📷' }));
                this.injectProfileTabContent();
              };
              reader.readAsDataURL(file);
            }
          }
        });
      }

      if (settingsRemoveBtn) {
        settingsRemoveBtn.addEventListener('click', () => {
          profile.avatar = '';
          this.saveUserProfile(profile);
          window.dispatchEvent(new CustomEvent('profile:updated'));
          window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true } }));
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Photo de profil supprimée.' }));
          this.injectProfileTabContent();
        });
      }

      const editForm = this.shadowRoot.getElementById('profile-edit-form');
      if (editForm) {
        editForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const fname = (this.shadowRoot.getElementById('prof-fname')?.value || '').trim();
          const lname = (this.shadowRoot.getElementById('prof-lname')?.value || '').trim();
          const email = (this.shadowRoot.getElementById('prof-email')?.value || '').trim();
          const phone = (this.shadowRoot.getElementById('prof-phone')?.value || '').trim();
          const bio = (this.shadowRoot.getElementById('prof-bio')?.value || '').trim();

          profile.firstName = fname;
          profile.lastName = lname;
          profile.email = email;
          profile.phone = phone;
          profile.bio = bio;

          this.saveUserProfile(profile);
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Profile updated successfully! ✨' }));
          
          window.dispatchEvent(new CustomEvent('profile:updated'));

          this.injectProfileTabContent();
        });
      }

    } else if (this.activeProfileTab === 'addresses') {
      tabArea.innerHTML = `
        <div class="profile-addresses-tab animate-in">
          <h4 class="profile-section-title">Adresses de Livraison Enregistrées / Saved Addresses</h4>
          <p class="profile-section-subtitle">Gérez vos lieux et repères de livraison en Côte d'Ivoire (Abidjan et villes de l'intérieur).</p>

          <div class="addresses-grid">
            ${profile.addresses.map(a => `
              <div class="address-item-card glass-panel" data-id="${a.id}">
                <div class="address-card-header">
                  <h5>📍 ${a.label || 'Adresse'}</h5>
                  <button class="address-delete-btn" data-id="${a.id}">Supprimer</button>
                </div>
                <p class="address-street" style="font-weight: 750; color: #0f172a; margin: 4px 0;">${a.street || ''}</p>
                <p class="address-city-zip" style="color: #64748b; font-size: 13px; margin: 2px 0;">
                  ${a.commune ? `${a.commune}, ` : ''}${a.city || 'Abidjan'} • Côte d'Ivoire
                </p>
                ${a.phone ? `<p style="font-size: 12px; color: #0052cc; font-weight: 700; margin: 4px 0 0 0;">📞 ${a.phone}</p>` : ''}
              </div>
            `).join('')}
          </div>

          <div class="add-address-form-box glass-panel">
            <h5 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 850; color: #0f172a;">Ajouter un lieu de livraison (Côte d'Ivoire 🇨🇮)</h5>
            <form class="profile-address-form" id="profile-address-form">
              <div class="form-row-2">
                <div class="form-group">
                  <label for="addr-label">Libellé (ex: Domicile, Bureau, Studio) *</label>
                  <input type="text" id="addr-label" placeholder="Ex: Bureau Plateau / Domicile Angré" autocomplete="off" required>
                </div>
                <div class="form-group">
                  <label for="addr-city">Ville / Région *</label>
                  <select id="addr-city" required style="padding: 11px 14px; border-radius: 10px; border: 1.5px solid var(--border); font-size: 13.5px; background: white; outline: none; width: 100%; box-sizing: border-box;">
                    <option value="Abidjan">Abidjan (District Autonome)</option>
                    <option value="Yamoussoukro">Yamoussoukro</option>
                    <option value="Bouaké">Bouaké</option>
                    <option value="San-Pédro">San-Pédro</option>
                    <option value="Korhogo">Korhogo</option>
                    <option value="Daloa">Daloa</option>
                    <option value="Grand-Bassam">Grand-Bassam</option>
                    <option value="Bingerville">Bingerville</option>
                    <option value="Autre Ville">Autre Ville de l'Intérieur</option>
                  </select>
                </div>
              </div>
              <div class="form-row-2">
                <div class="form-group">
                  <label for="addr-commune">Commune / Quartier *</label>
                  <input type="text" id="addr-commune" placeholder="Ex: Cocody Angré 8ème Tranche / Marcory Zone 4 / Plateau" required>
                </div>
                <div class="form-group">
                  <label for="addr-street">Rue / Repère précis de livraison *</label>
                  <input type="text" id="addr-street" placeholder="Ex: Près de la Pharmacie des Grâces, Immeuble Horizon" required>
                </div>
              </div>
              <div class="form-row-2">
                <div class="form-group">
                  <label for="addr-phone">Numéro WhatsApp / Téléphone de réception *</label>
                  <input type="tel" id="addr-phone" placeholder="Ex: +225 05 00 61 99 23" required>
                </div>
                <div class="form-group">
                  <label for="addr-bp">Boîte Postale / Repère complémentaire (Optionnel)</label>
                  <input type="text" id="addr-bp" placeholder="Ex: BP 1234 Abidjan 01 (Optionnel)">
                </div>
              </div>
              <button type="submit" class="btn-primary address-save-btn" style="margin-top: 8px;">Enregistrer l'Adresse</button>
            </form>
          </div>
        </div>
      `;

      tabArea.querySelectorAll('.address-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.getAttribute('data-id'));
          profile.addresses = profile.addresses.filter(a => a.id !== id);
          this.saveUserProfile(profile);
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Adresse supprimée.' }));
          this.injectProfileTabContent();
        });
      });

      const addressForm = this.shadowRoot.getElementById('profile-address-form');
      if (addressForm) {
        addressForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const label = (this.shadowRoot.getElementById('addr-label')?.value || '').trim();
          const city = (this.shadowRoot.getElementById('addr-city')?.value || '').trim();
          const commune = (this.shadowRoot.getElementById('addr-commune')?.value || '').trim();
          const street = (this.shadowRoot.getElementById('addr-street')?.value || '').trim();
          const phone = (this.shadowRoot.getElementById('addr-phone')?.value || '').trim();
          const bp = (this.shadowRoot.getElementById('addr-bp')?.value || '').trim();

          const newAddr = {
            id: Date.now(),
            label,
            street,
            commune,
            city,
            phone,
            bp
          };

          if (!profile.addresses) profile.addresses = [];
          profile.addresses.push(newAddr);
          this.saveUserProfile(profile);
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Adresse "${label}" ajoutée avec succès ! 📍` }));
          this.injectProfileTabContent();
        });
      }

    } else if (this.activeProfileTab === 'security') {
      tabArea.innerHTML = `
        <div class="profile-security-tab animate-in">
          <h4 class="profile-section-title">Security & Preferences</h4>
          <p class="profile-section-subtitle">Fine-tune two-factor safety, alert update settings, and active color layout modes.</p>

          <div class="preferences-toggles-box">
            <h5>Notification Preferences</h5>
            
            <div class="toggle-option-row">
              <div class="toggle-info">
                <h6>Email Newsletter Codes</h6>
                <p>Receive coupon schedules, early access drops, and mechanical kit alerts.</p>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="pref-email" ${profile.marketingEmails ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="toggle-option-row">
              <div class="toggle-info">
                <h6>SMS Delivery Updates</h6>
                <p>Get instant tracking updates text directly to your verification phone number.</p>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="pref-sms" ${profile.smsUpdates ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="toggle-option-row">
              <div class="toggle-info">
                <h6>Two-Factor Account Safety</h6>
                <p>Prompt security verification codes on profile details editing or invoice checking.</p>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="pref-2fa" ${profile.twoFactor ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div class="theme-preference-box glass-panel">
            <h5>Color Palette Profile</h5>
            <p>Select your active dashboard layout palette color accent.</p>
            <div class="theme-dropdown-row">
              <select class="theme-select-menu" id="theme-selector">
                <option value="Ice Blue" ${profile.theme === 'Ice Blue' ? 'selected' : ''}>Classic Ice Blue (Default)</option>
                <option value="Velvet Obsidian" ${profile.theme === 'Velvet Obsidian' ? 'selected' : ''}>Velvet Obsidian</option>
                <option value="Pure White" ${profile.theme === 'Pure White' ? 'selected' : ''}>Pure White Minimalist</option>
              </select>
              <button class="btn-primary" id="theme-apply-btn" style="height:40px;padding:0 20px;">Apply Theme</button>
            </div>
          </div>

          <div class="password-change-box glass-panel">
            <h5>Change Account Password</h5>
            <form id="password-change-form">
              <div class="form-group">
                <label for="pass-current">Current Password</label>
                <input type="password" id="pass-current" autocomplete="current-password" required>
              </div>
              <div class="form-group">
                <label for="pass-new">New Password</label>
                <input type="password" id="pass-new" autocomplete="new-password" required>
              </div>
              <button type="submit" class="btn-primary" style="margin-top:12px;">Update Password</button>
            </form>
          </div>
        </div>
      `;

      const emailCheck = this.shadowRoot.getElementById('pref-email');
      const smsCheck = this.shadowRoot.getElementById('pref-sms');
      const twoFaCheck = this.shadowRoot.getElementById('pref-2fa');

      const savePrefs = () => {
        if (emailCheck) profile.marketingEmails = emailCheck.checked;
        if (smsCheck) profile.smsUpdates = smsCheck.checked;
        if (twoFaCheck) profile.twoFactor = twoFaCheck.checked;
        this.saveUserProfile(profile);
      };

      if (emailCheck) {
        emailCheck.addEventListener('change', () => {
          savePrefs();
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Notification preferences saved.' }));
        });
      }
      if (smsCheck) {
        smsCheck.addEventListener('change', () => {
          savePrefs();
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'SMS alert settings updated.' }));
        });
      }
      if (twoFaCheck) {
        twoFaCheck.addEventListener('change', () => {
          savePrefs();
          const msg = profile.twoFactor ? 'Two-Factor verification activated! 🛡️' : 'Two-Factor verification deactivated.';
          window.dispatchEvent(new CustomEvent('toast:show', { detail: msg }));
        });
      }

      const themeBtn = this.shadowRoot.getElementById('theme-apply-btn');
      if (themeBtn) {
        themeBtn.addEventListener('click', () => {
          const theme = this.shadowRoot.getElementById('theme-selector')?.value || 'Ice Blue';
          profile.theme = theme;
          this.saveUserProfile(profile);
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Accent palette shifted to "${theme}"!` }));
        });
      }

      const passForm = this.shadowRoot.getElementById('password-change-form');
      if (passForm) {
        passForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const curr = this.shadowRoot.getElementById('pass-current');
          const nw = this.shadowRoot.getElementById('pass-new');
          if (curr) curr.value = '';
          if (nw) nw.value = '';
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Password updated successfully! Key secured. 🔑' }));
        });
      }
    }
  }

  attachProfileTabListeners() {
    const shadow = this.shadowRoot;
    
    shadow.querySelectorAll('.profile-tab-btn').forEach(btn => {
      if (btn.id === 'profile-sign-out-btn') return;
      btn.addEventListener('click', () => {
        shadow.querySelectorAll('.profile-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tab = btn.getAttribute('data-tab');
        this.activeProfileTab = tab;
        this.injectProfileTabContent();
      });
    });

    const signOutBtn = shadow.getElementById('profile-sign-out-btn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('SWEETOS_logged_in_user');
        sessionStorage.removeItem('SWEETOS_user_profile');
        sessionStorage.clear();
        window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: false } }));
        window.dispatchEvent(new CustomEvent('notifications:updated'));
        window.dispatchEvent(new CustomEvent('notifications:badge-sync', { detail: 0 }));
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Signed out successfully. 🔓' }));
        this.currentPage = 'home';
        this.renderPageContent();
      });
    }
  }

  // --- Functional Orders Dashboard Handlers ---
  injectOrdersDashboardList() {
    const loggedIn = sessionStorage.getItem('SWEETOS_logged_in_user');
    if (!loggedIn) {
      this.renderOrdersDashboardList();
      return;
    }
    
    let userEmail = "";
    try {
      userEmail = JSON.parse(loggedIn).email;
    } catch(e) {}
    
    if (!userEmail) {
      this.renderOrdersDashboardList();
      return;
    }

    // Fetch latest orders from server to synchronize status
    fetch('/api/orders')
      .then(res => {
        if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return [];
        return res.json().catch(() => []);
      })
      .then(serverOrders => {
        if (Array.isArray(serverOrders)) {
          const profile = this.loadUserProfile();
          let profileChanged = false;
          
          if (!profile.orders) profile.orders = [];
          
          // 1. Update existing orders in profile with latest status from server
          profile.orders.forEach(po => {
            const latest = serverOrders.find(so => so.id === po.id);
            if (latest) {
              if (po.status !== latest.status || po.trackingNumber !== latest.trackingNumber) {
                po.status = latest.status;
                po.trackingNumber = latest.trackingNumber;
                profileChanged = true;
              }
            }
          });
          
          // 2. Fetch missing orders that belong to this customer
          serverOrders.forEach(so => {
            const soEmail = (so.customerEmail || so.email || so.userEmail || '').toLowerCase().trim();
            if (soEmail === userEmail && (so.status || '').toLowerCase() !== 'deleted') {
              if (!profile.orders.some(po => po.id === so.id)) {
                profile.orders.unshift(so);
                profileChanged = true;
              }
            }
          });
          
          if (profileChanged) {
            const profileKey = getProfileStorageKey();
            sessionStorage.setItem(profileKey, JSON.stringify(profile));
            sessionStorage.setItem('SWEETOS_user_profile', JSON.stringify(profile));
          }
        }
        this.renderOrdersDashboardList();
      })
      .catch(err => {
        console.error('Failed to sync orders from server on dashboard open:', err);
        this.renderOrdersDashboardList();
      });
  }

  renderOrdersDashboardList() {
    const container = this.shadowRoot.getElementById('orders-dashboard-list');
    if (!container) return;
    container.innerHTML = '';

    const profile = this.loadUserProfile();
    const orders = profile.orders || [];

    // Filter by timeframe
    const now = new Date();
    const filteredByTime = orders.filter(o => {
      const orderDate = new Date(o.date);
      if (isNaN(orderDate.getTime())) return true;
      
      if (this.ordersTimeframe === 'Last 30 Days') {
        const diffTime = Math.abs(now - orderDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      }
      if (this.ordersTimeframe === 'Last 6 Months') {
        const diffTime = Math.abs(now - orderDate);
        const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.43);
        return diffMonths <= 6;
      }
      if (this.ordersTimeframe === 'This Year') {
        return orderDate.getFullYear() === now.getFullYear();
      }
      return true; // All Time
    });

    // Calculate badge stats based on time-filtered orders with status normalization
    const allCount = filteredByTime.length;
    const placedCount = filteredByTime.filter(o => {
      const s = (o.status || '').toLowerCase();
      return s === 'placed' || s === 'pending';
    }).length;
    const confirmCount = filteredByTime.filter(o => {
      const s = (o.status || '').toLowerCase();
      return s === 'confirmé' || s === 'confirmed';
    }).length;
    const processingCount = filteredByTime.filter(o => {
      const s = (o.status || '').toLowerCase();
      return s === 'en cours' || s === 'processing';
    }).length;
    const shippingCount = filteredByTime.filter(o => {
      const s = (o.status || '').toLowerCase();
      return s === 'shipped' || s.includes('transit');
    }).length;
    const doneCount = filteredByTime.filter(o => {
      const s = (o.status || '').toLowerCase();
      return s === 'livré' || s === 'delivered' || s === 'done' || s === 'livre';
    }).length;
    const cancelledCount = filteredByTime.filter(o => {
      const s = (o.status || '').toLowerCase();
      return s === 'cancelled';
    }).length;

    // Format Total Spent
    const totalSpent = filteredByTime.reduce((sum, o) => sum + o.total, 0);

    // Update stats boxes in UI
    const statOrders = this.shadowRoot.getElementById('stat-total-orders');
    const statTransit = this.shadowRoot.getElementById('stat-in-transit');
    const statProc = this.shadowRoot.getElementById('stat-processing');
    const statSpent = this.shadowRoot.getElementById('stat-total-spent');

    if (statOrders) statOrders.textContent = allCount;
    if (statTransit) statTransit.textContent = shippingCount;
    if (statProc) statProc.textContent = processingCount;
    if (statSpent) statSpent.textContent = formatPrice(totalSpent);

    // Update badge values on tab buttons
    const badgeAll = this.shadowRoot.getElementById('badge-all');
    const badgePlaced = this.shadowRoot.getElementById('badge-placed');
    const badgeConfirm = this.shadowRoot.getElementById('badge-confirm');
    const badgeProc = this.shadowRoot.getElementById('badge-processing');
    const badgeShip = this.shadowRoot.getElementById('badge-shipping');
    const badgeDone = this.shadowRoot.getElementById('badge-done');
    const badgeCancel = this.shadowRoot.getElementById('badge-cancelled');

    if (badgeAll) badgeAll.textContent = allCount;
    if (badgePlaced) badgePlaced.textContent = placedCount;
    if (badgeConfirm) badgeConfirm.textContent = confirmCount;
    if (badgeProc) badgeProc.textContent = processingCount;
    if (badgeShip) badgeShip.textContent = shippingCount;
    if (badgeDone) badgeDone.textContent = doneCount;
    if (badgeCancel) badgeCancel.textContent = cancelledCount;

    // Filter by search query & tab select with status mapping
    let finalFiltered = filteredByTime.filter(o => {
      // Tab filter mapping
      if (this.activeOrdersFilter !== 'All') {
        const s = (o.status || '').toLowerCase();
        if (this.activeOrdersFilter === 'Placed') {
          if (s !== 'placed' && s !== 'pending') return false;
        } else if (this.activeOrdersFilter === 'Confirm') {
          if (s !== 'confirmé' && s !== 'confirmed') return false;
        } else if (this.activeOrdersFilter === 'Processing') {
          if (s !== 'en cours' && s !== 'processing') return false;
        } else if (this.activeOrdersFilter === 'Shipping') {
          if (s !== 'shipped' && !s.includes('transit')) return false;
        } else if (this.activeOrdersFilter === 'Done') {
          if (s !== 'livré' && s !== 'delivered' && s !== 'done' && s !== 'livre') return false;
        } else if (this.activeOrdersFilter === 'Cancelled') {
          if (s !== 'cancelled') return false;
        }
      }
      // Search input matching
      if (this.ordersSearchQuery) {
        const query = this.ordersSearchQuery.toLowerCase();
        const idMatch = o.id.toLowerCase().includes(query);
        const itemMatch = o.items.toLowerCase().includes(query);
        return idMatch || itemMatch;
      }
      return true;
    });

    if (finalFiltered.length === 0) {
      container.innerHTML = `
        <div class="orders-empty-state glass-panel animate-in">
          <div class="orders-empty-icon-circle">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#627d98" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 17 22 12"></polyline>
            </svg>
          </div>
          <h4>No live orders match criteria</h4>
          <p>No real-time orders found. You can place a new order right now!</p>
          <button class="btn-secondary clear-filters-btn" id="orders-clear-filters-btn">Clear Filters</button>
        </div>
      `;
      
      const clearBtn = this.shadowRoot.getElementById('orders-clear-filters-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.ordersSearchQuery = '';
          const searchInput = this.shadowRoot.getElementById('orders-search-input');
          if (searchInput) searchInput.value = '';
          
          this.ordersTimeframe = 'All Time';
          const timeframeSelect = this.shadowRoot.getElementById('orders-timeframe-selector');
          if (timeframeSelect) timeframeSelect.value = 'All Time';
          
          this.activeOrdersFilter = 'All';
          const pills = this.shadowRoot.querySelectorAll('.order-pill-btn');
          pills.forEach(p => {
            if (p.getAttribute('data-filter') === 'All') p.classList.add('active');
            else p.classList.remove('active');
          });

          this.injectOrdersDashboardList();
        });
      }
      return;
    }

    finalFiltered.forEach(o => {
      const card = document.createElement('div');
      card.className = 'order-card-compact glass-panel animate-in';
      
      const statusClass = o.status.toLowerCase();
      const itemCount = o.products ? o.products.reduce((acc, p) => acc + p.quantity, 0) : 1;

      card.innerHTML = `
        <div class="order-compact-top">
          <span class="order-compact-id">${o.id}</span>
          <span class="order-compact-status ${statusClass}">
            <span class="status-dot"></span>${o.status}
          </span>
        </div>
        
        <div class="order-compact-meta">
          <span class="meta-item">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            ${formatTimeAgo(o.createdAt || o.date)} • ${o.date}
          </span>
          <span class="meta-item">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            ${itemCount} ${itemCount === 1 ? 'article' : 'articles'}
          </span>
          <span class="meta-item">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            ${profile.firstName || 'Client'} ${profile.lastName || ''}
          </span>
        </div>

        <div class="order-compact-bottom">
          <span class="order-compact-items-text">${o.items}</span>
          <div class="order-compact-right-side">
            <span class="order-compact-total">${formatPrice(o.total)}</span>
            <svg class="order-compact-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.showOrderDetailsModal(o);
      });

      container.appendChild(card);
    });
  }

  showOrderDetailsModal(o) {
    const profile = this.loadUserProfile();
    
    // Create detailed modal elements overlay
    let overlay = this.shadowRoot.getElementById('order-details-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'order-details-overlay';
      overlay.className = 'order-details-overlay';
      this.shadowRoot.appendChild(overlay);
    }
    
    // Build products list HTML
    let productsHtml = '';
    if (o.products && o.products.length > 0) {
      productsHtml = o.products.map(item => `
        <div class="order-item-row" data-product-id="${item.id}">
          <img class="order-item-img" src="${item.image}" alt="${item.name}">
          <div class="order-item-info">
            <span class="order-item-name">${item.name}</span>
            <span class="order-item-meta">Category: ${item.category || 'Gear'} • Qty: ${item.quantity}</span>
            <span class="order-item-sku">SKU: AET-${item.id}</span>
          </div>
          <div class="order-item-actions">
            <span class="order-item-price">${formatPrice(item.price * item.quantity)}</span>
            <button class="order-buy-again-btn btn-secondary modal-buy-btn" data-id="${item.id}">Buy Again</button>
          </div>
        </div>
      `).join('');
    } else {
      productsHtml = `
        <div class="order-item-row">
          <div class="order-item-fallback-icon" style="font-size:24px; padding:10px; background:#eff6ff; border-radius:10px; margin-right:12px;">📦</div>
          <div class="order-item-info">
            <span class="order-item-name">Premium Workspace Gear</span>
            <span class="order-item-meta">${o.items}</span>
          </div>
          <div class="order-item-actions">
            <span class="order-item-price">${formatPrice(o.total)}</span>
            <button class="order-buy-again-btn btn-secondary modal-buy-btn">Buy Again</button>
          </div>
        </div>
      `;
    }

    const canModify = (o.status === 'Processing' || o.status === 'Pending' || o.status === 'En cours');

    let statusText = '';
    let progressWidth = '0%';
    let step1Class = '';
    let step2Class = '';
    let step3Class = '';
    let step4Class = '';
    let step5Class = '';
    
    let step1Content = '1';
    let step2Content = '2';
    let step3Content = '3';
    let step4Content = '4';
    let step5Content = '5';

    const checkIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

    const statusLower = (o.status || '').toLowerCase();

    if (statusLower === 'pending' || statusLower === 'placed') {
      statusText = 'En attente';
      progressWidth = '0%';
      step1Class = 'active';
      step1Content = '1';
    } else if (statusLower === 'confirmé' || statusLower === 'confirmed') {
      statusText = 'Confirmé';
      progressWidth = '25%';
      step1Class = 'completed';
      step1Content = checkIcon;
      step2Class = 'active';
      step2Content = '2';
    } else if (statusLower === 'en cours' || statusLower === 'processing') {
      statusText = 'En cours';
      progressWidth = '50%';
      step1Class = 'completed';
      step1Content = checkIcon;
      step2Class = 'completed';
      step2Content = checkIcon;
      step3Class = 'active';
      step3Content = '3';
    } else if (statusLower === 'shipped') {
      statusText = 'Expédié';
      progressWidth = '75%';
      step1Class = 'completed';
      step1Content = checkIcon;
      step2Class = 'completed';
      step2Content = checkIcon;
      step3Class = 'completed';
      step3Content = checkIcon;
      step4Class = 'active';
      step4Content = '4';
    } else if (statusLower === 'livré' || statusLower === 'delivered' || statusLower === 'done' || statusLower === 'livre') {
      statusText = 'Livré';
      progressWidth = '100%';
      step1Class = 'completed';
      step1Content = checkIcon;
      step2Class = 'completed';
      step2Content = checkIcon;
      step3Class = 'completed';
      step3Content = checkIcon;
      step4Class = 'completed';
      step4Content = checkIcon;
      step5Class = 'completed';
      step5Content = checkIcon;
    } else {
      statusText = o.status;
      progressWidth = '0%';
    }

    overlay.innerHTML = `
      <div class="invoice-modal">
        <!-- Header -->
        <div class="modal-header">
            <h2 class="modal-title">Order Invoice Details</h2>
            <button class="close-btn" id="details-modal-close-btn">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
            
            <!-- Order ID Section -->
            <div class="section">
                <span class="section-label">Order ID</span>
                <div class="order-id">${o.id}</div>
            </div>

            <!-- Timeline Section -->
            <div class="section">
                <span class="section-label">Timeline & Status</span>
                
                <div class="status-container">
                    <div class="current-status">
                        <div class="status-dot"></div>
                        ${statusText}
                    </div>

                    <div class="timeline">
                        <div class="timeline-progress" style="width: ${progressWidth};"></div>
                        
                        <div class="step ${step1Class}">
                            <div class="step-circle">${step1Content}</div>
                            <span class="step-label">PLACED</span>
                        </div>
                        
                        <div class="step ${step2Class}">
                            <div class="step-circle">${step2Content}</div>
                            <span class="step-label">CONFIRM</span>
                        </div>
                        
                        <div class="step ${step3Class}">
                            <div class="step-circle">${step3Content}</div>
                            <span class="step-label">PROCESSING</span>
                        </div>
                        
                        <div class="step ${step4Class}">
                            <div class="step-circle">${step4Content}</div>
                            <span class="step-label">SHIPPING</span>
                        </div>

                        <div class="step ${step5Class}">
                            <div class="step-circle">${step5Content}</div>
                            <span class="step-label">DONE</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Shipping Address Section -->
            <div class="section">
                <span class="section-label">Shipping Address</span>
                <div class="address-card">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" class="address-icon">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <div class="address-details">
                        <h4>${profile.firstName} ${profile.lastName}</h4>
                        <p>${o.address || 'Saved Address Studio Room 4B, Design House'}</p>
                        <p style="margin-top: 4px; font-weight: 500; color: var(--text-main);">${profile.phone || '+1 (555) 019-2834'}</p>
                    </div>
                </div>
            </div>

            <!-- Purchased Items Section -->
            <div class="section">
                <span class="section-label">Purchased Items</span>
                <div class="items-list">
                    ${productsHtml}
                </div>
            </div>

            <!-- Summary Totals -->
            <div class="section" style="background: #f8fafc; padding: 1.5rem; border-radius: 16px; border: 1.5px dashed #e2e8f0; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; color: #64748b;">
                    <span>Subtotal</span>
                    <span>${formatPrice(o.total - 2000 > 0 ? o.total - 2000 : o.total)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; color: #64748b;">
                    <span>Shipping</span>
                    <span>2 000 CFA</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; font-weight: 700; font-size: 1.1rem; color: #0f172a;">
                    <span>Total Paid</span>
                    <span>${formatPrice(o.total)}</span>
                </div>
            </div>

        </div>

        <!-- Footer -->
        <div class="modal-footer">
            <div class="footer-code">
                Code: <span>#${o.id.substring(o.id.indexOf('-') + 1)}</span>
            </div>
            <div style="display: flex; gap: 0.75rem;">
                <button class="action-btn" id="invoice-print-btn">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="6 9 6 2 18 2 18 9"></polyline>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                      <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Print
                </button>
                ${canModify ? `
                  <button class="action-btn modal-change-addr-btn">Change Address</button>
                  <button class="action-btn delete modal-cancel-order-btn cancel-order-btn">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      Cancel
                  </button>
                ` : ''}
                ${(o.status === 'Shipping' || o.status === 'Shipped') ? `
                  <button class="action-btn modal-confirm-delivery-btn" style="background:var(--primary); color:white; border-color:var(--primary);">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Mark as Received
                  </button>
                ` : ''}
                ${(o.status !== 'Done' && o.status !== 'Livré') ? `
                  <button class="action-btn delete modal-delete-btn" style="background:#fff; color:#ef4444; border-color:#fecaca;" title="Remove Record">Remove</button>
                ` : ''}
            </div>
        </div>
      </div>
    `;

    overlay.classList.add('open');

    // Close button click
    const closeBtn = overlay.querySelector('#details-modal-close-btn');
    closeBtn.addEventListener('click', () => {
      overlay.classList.remove('open');
    });

    // Close on overlay background click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });

    // Buy again button click
    overlay.querySelectorAll('.modal-buy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const productId = parseInt(btn.getAttribute('data-id'));
        if (!productId) return;
        
        const targetProduct = this.products.find(p => p.id === productId);
        if (targetProduct) {
          const cartSaved = sessionStorage.getItem(getCartStorageKey());
          let cart = [];
          if (cartSaved) {
            try {
              cart = JSON.parse(cartSaved);
            } catch (err) {}
          }
          
          const existing = cart.find(item => item.id === productId);
          if (existing) {
            existing.quantity += 1;
          } else {
            cart.push({ ...targetProduct, quantity: 1 });
          }
          
          sessionStorage.setItem(getCartStorageKey(), JSON.stringify(cart));
          window.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Added ${targetProduct.name} to cart!` }));
          overlay.classList.remove('open');
        }
      });
    });

    // Print button click
    const printBtn = overlay.querySelector('#invoice-print-btn');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        printOrderReceipt(o);
      });
    }

    // Change Address click
    const changeAddrBtn = overlay.querySelector('.modal-change-addr-btn');
    if (changeAddrBtn) {
      changeAddrBtn.addEventListener('click', () => {
        const profile = this.loadUserProfile();
        showEditAddressModal(this.shadowRoot, o, profile, (newName, newAddress) => {
          const targetOrder = profile.orders.find(order => order.id === o.id);
          if (targetOrder) {
            targetOrder.address = newAddress;
            
            // 1. Save customer profile to correct key
            const profileKey = getProfileStorageKey();
            sessionStorage.setItem(profileKey, JSON.stringify(profile));
            sessionStorage.setItem('SWEETOS_user_profile', JSON.stringify(profile));
            
            // 2. Fetch latest orders from server, update and POST back
            fetch('/api/orders')
              .then(res => {
                if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return getAllOrdersFromStorage();
                return res.json().catch(() => getAllOrdersFromStorage());
              })
              .then(serverOrders => {
                let allOrders = Array.isArray(serverOrders) ? serverOrders : [];
                const globalOrder = allOrders.find(go => go.id === o.id);
                if (globalOrder) {
                  globalOrder.customerAddress = newAddress;
                }
                saveAllOrdersToStorage(allOrders);
              })
              .catch(e => console.error('Failed to sync updated order address:', e));

            window.dispatchEvent(new CustomEvent('toast:show', { detail: `Address updated for Order ${o.id}!` }));
            overlay.classList.remove('open');
            this.injectOrdersDashboardList();
          }
        });
      });
    }

    // Cancel Order click
    const cancelBtn = overlay.querySelector('.modal-cancel-order-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        showCancelOrderModal(this.shadowRoot, o, () => {
          const profile = this.loadUserProfile();
          const targetOrder = profile.orders.find(order => order.id === o.id);
          if (targetOrder) {
            targetOrder.status = 'Cancelled';
            
            // 1. Save customer profile to correct key
            const profileKey = getProfileStorageKey();
            sessionStorage.setItem(profileKey, JSON.stringify(profile));
            sessionStorage.setItem('SWEETOS_user_profile', JSON.stringify(profile));
            
            // 2. Fetch latest orders from server, update and POST back
            fetch('/api/orders')
              .then(res => {
                if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return getAllOrdersFromStorage();
                return res.json().catch(() => getAllOrdersFromStorage());
              })
              .then(serverOrders => {
                let allOrders = Array.isArray(serverOrders) ? serverOrders : [];
                const globalOrder = allOrders.find(go => go.id === o.id);
                if (globalOrder) {
                  globalOrder.status = 'Cancelled';
                }
                saveAllOrdersToStorage(allOrders);
              })
              .catch(e => console.error('Failed to sync cancelled order status:', e));

            window.dispatchEvent(new CustomEvent('toast:show', { detail: `Order ${o.id} cancelled successfully.` }));
            overlay.classList.remove('open');
            this.injectOrdersDashboardList();
          }
        });
      });
    }

    // Delete click
    const deleteBtn = overlay.querySelector('.modal-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        showDeleteOrderModal(this.shadowRoot, o, () => {
          // 1. Remove from customer profile view
          const profile = this.loadUserProfile();
          profile.orders = profile.orders.filter(order => order.id !== o.id);
          const profileKey = getProfileStorageKey();
          sessionStorage.setItem(profileKey, JSON.stringify(profile));
          sessionStorage.setItem('SWEETOS_user_profile', JSON.stringify(profile));
          
           // 2. Fetch latest orders from server, update and POST back
           fetch('/api/orders')
             .then(res => {
               if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return getAllOrdersFromStorage();
               return res.json().catch(() => getAllOrdersFromStorage());
             })
             .then(serverOrders => {
               let allOrders = Array.isArray(serverOrders) ? serverOrders : [];
               const globalOrder = allOrders.find(go => go.id === o.id);
               if (globalOrder) {
                 globalOrder.status = 'Deleted';
               }
               saveAllOrdersToStorage(allOrders);
             })
             .catch(e => console.error('Failed to sync deleted order status:', e));

          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Order record deleted.' }));
          overlay.classList.remove('open');
          this.injectOrdersDashboardList();
        });
      });
    }

    // Confirm Delivery click
    const confirmDeliveryBtn = overlay.querySelector('.modal-confirm-delivery-btn');
    if (confirmDeliveryBtn) {
      confirmDeliveryBtn.addEventListener('click', () => {
        // 1. Update customer profile status to 'Done'
        const profile = this.loadUserProfile();
        const targetOrder = profile.orders.find(order => order.id === o.id);
        if (targetOrder) {
          targetOrder.status = 'Done';
          const profileKey = getProfileStorageKey();
          sessionStorage.setItem(profileKey, JSON.stringify(profile));
          sessionStorage.setItem('SWEETOS_user_profile', JSON.stringify(profile));
          
          // 2. Fetch latest orders from server, update and POST back
          fetch('/api/orders')
            .then(res => {
              if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return getAllOrdersFromStorage();
              return res.json().catch(() => getAllOrdersFromStorage());
            })
            .then(serverOrders => {
              let allOrders = Array.isArray(serverOrders) ? serverOrders : [];
              const globalOrder = allOrders.find(go => go.id === o.id);
              if (globalOrder) {
                globalOrder.status = 'Done';
              }
              saveAllOrdersToStorage(allOrders);
            })
            .then(() => {
              // 3. Broadcast custom alert to admin panel
              fetch('/api/broadcast-alert', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  type: 'orders',
                  message: `Order ${o.id} has been marked as Received (Done) by the customer!`
                })
              }).catch(e => console.error('Failed to broadcast received order alert:', e));
            })
            .catch(e => console.error('Failed to sync received order status:', e));

          // 5. Award Mystery Box upon order Delivery / Confirmation
          awardMysteryBoxForDeliveredOrder(targetOrder);
            
            // Add customer notifications
            const notifKey = getNotificationsStorageKey();
            let customerNotifs = [];
            try {
              customerNotifs = JSON.parse(sessionStorage.getItem(notifKey) || '[]');
            } catch(e) {}
            
            const currentHour = new Date().getHours();
            let greeting = 'Bonjour';
            if (currentHour >= 12 && currentHour < 18) {
              greeting = 'Bon après-midi';
            } else if (currentHour >= 18) {
              greeting = 'Bonsoir';
            }
            
            // Push delivered notification
            customerNotifs.unshift({
              id: Date.now(),
              type: 'shipping',
              icon: '✅',
              title: `Commande #${targetOrder.id} livrée !`,
              desc: `${greeting} ! Merci infiniment pour votre achat chez SWEETOS. Votre commande #${targetOrder.id} a été livrée avec succès.<br>
                <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
                  <button class="download-receipt-btn" data-order-id="${targetOrder.id}" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">Reçu 📄</button>
                  <button class="view-mystery-email-btn" data-order-id="${targetOrder.id}" style="background:#ff5630; color:white; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">Mystery Box 🎁</button>
                </div>`,
              time: 'Just now',
              unread: true
            });
            
            // Push simulated email notification
            customerNotifs.unshift({
              id: Date.now() + 2,
              type: 'email',
              icon: '📧',
              title: `Nouveau Message: Votre Boîte Mystère`,
              desc: `Vous avez reçu un e-mail concernant votre Boîte Mystère de la commande #${targetOrder.id}.<br>
                <div style="margin-top:8px;">
                  <button class="open-email-modal-btn" data-order-id="${targetOrder.id}" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">Ouvrir l'E-mail 📩</button>
                </div>`,
              time: 'Just now',
              unread: true
            });
            
            sessionStorage.setItem(notifKey, JSON.stringify(customerNotifs));
            window.dispatchEvent(new CustomEvent('notifications:updated'));

            window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Order marked as Received! Thank you! 🎁' }));
            overlay.classList.remove('open');
            this.injectOrdersDashboardList();
          }
        });
      }
    }


  isTimelineStepActive(status, step) {
    if (status === 'Processing') {
      if (step === 'placed' || step === 'processing') return true;
    }
    if (status === 'Shipped') {
      if (step === 'placed' || step === 'processing' || step === 'shipped') return true;
    }
    if (status === 'Delivered') {
      return true;
    }
    return step === 'placed';
  }

  attachOrdersDashboardListeners() {
    const shadow = this.shadowRoot;
    
    // Search input
    const searchInput = shadow.getElementById('orders-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.ordersSearchQuery = e.target.value.trim();
        this.injectOrdersDashboardList();
      });
    }

    // Timeframe selector
    const timeframeSelect = shadow.getElementById('orders-timeframe-selector');
    if (timeframeSelect) {
      timeframeSelect.addEventListener('change', (e) => {
        this.ordersTimeframe = e.target.value;
        this.injectOrdersDashboardList();
      });
    }

    // Tab pills
    shadow.querySelectorAll('.order-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        shadow.querySelectorAll('.order-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const filter = btn.getAttribute('data-filter');
        this.activeOrdersFilter = filter;
        this.injectOrdersDashboardList();
      });
    });

    // Header buttons
    const continueBtn = shadow.getElementById('orders-continue-shopping-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        this.currentPage = 'catalog';
        this.currentCategory = 'All';
        this.renderPageContent();
        window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'catalog', category: 'All' } }));
      });
    }

    const exportBtn = shadow.getElementById('orders-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Order history spreadsheet exported successfully! 📊' }));
      });
    }
  }

  loadCustomCollections() {
    const saved = sessionStorage.getItem('SWEETOS_custom_collections');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    // Pre-seed a default collection so the list is never empty!
    const defaults = [
      {
        id: "col-default-user",
        name: "My Dream Setup",
        subtitle: "Personalized workspace theme",
        description: "Your own curated list of switches, lighting arrays, and studio hardware layouts.",
        badge: "MY DESIGN",
        price: 0,
        originalPrice: 0,
        themeColor: "#0052cc",
        productIds: []
      }
    ];
    this.saveCustomCollections(defaults);
    return defaults;
  }

  openCustomCreateModal(onConfirm) {
    const shadow = this.shadowRoot;
    const modal = shadow.getElementById('create-col-modal');
    const input = shadow.getElementById('new-col-name-input');
    const cancelBtn = shadow.getElementById('cancel-col-modal-btn');
    const confirmBtn = shadow.getElementById('confirm-col-modal-btn');

    if (!modal || !input) return;

    input.value = '';
    modal.classList.add('open');
    input.focus();

    const newCancel = cancelBtn.cloneNode(true);
    const newConfirm = confirmBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);

    newCancel.addEventListener('click', () => {
      modal.classList.remove('open');
    });

    newConfirm.addEventListener('click', () => {
      const name = input.value.trim();
      if (!name) {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Please enter a name.' }));
        input.focus();
        return;
      }
      modal.classList.remove('open');
      onConfirm(name);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
      }
    });
  }

  saveCustomCollections(collections) {
    sessionStorage.setItem('SWEETOS_custom_collections', JSON.stringify(collections));
  }

  populatePdpColDropdown(productId) {
    const list = this.shadowRoot.getElementById('pdp-col-dropdown-list');
    if (!list) return;
    list.innerHTML = '';

    const collections = this.loadCustomCollections();
    if (collections.length === 0) {
      list.innerHTML = `<div style="padding: 14px; font-size: 12px; color: var(--ink-soft); text-align: center;">No collections yet.<br><span style="font-size: 11px; color: var(--accent); font-weight: 700;">Click + above to create one</span></div>`;
      return;
    }

    collections.forEach(col => {
      const isInside = col.productIds && col.productIds.includes(productId);
      const btn = document.createElement('button');
      btn.className = 'col-dropdown-item';
      btn.style.display = 'flex';
      btn.style.justifyContent = 'space-between';
      btn.style.alignItems = 'center';
      btn.style.padding = '10px 14px';
      btn.style.border = 'none';
      btn.style.background = 'none';
      btn.style.cursor = 'pointer';
      btn.style.width = '100%';
      btn.style.fontSize = '13px';
      btn.innerHTML = `
        <span style="font-weight: 650; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">📁 ${col.name}</span>
        <span style="font-size: 11px; font-weight: 700; color: ${isInside ? 'var(--accent)' : 'var(--ink-soft)'};">${isInside ? '✓ Saved' : '+ Add'}</span>
      `;
      btn.addEventListener('click', () => {
        if (!isInside) {
          col.productIds.push(productId);
          this.saveCustomCollections(collections);
          window.dispatchEvent(new CustomEvent('toast:show', { 
            detail: `Saved to "${col.name}"! 📁` 
          }));
        } else {
          col.productIds = col.productIds.filter(id => id !== productId);
          this.saveCustomCollections(collections);
          window.dispatchEvent(new CustomEvent('toast:show', { 
            detail: `Removed from "${col.name}".` 
          }));
        }
        this.populatePdpColDropdown(productId);
      });
      list.appendChild(btn);
    });
  }

  startDealsCountdownTimer() {
    if (this.dealsTimerInterval) {
      clearInterval(this.dealsTimerInterval);
    }

    const shadow = this.shadowRoot;
    let secondsLeft = 6 * 86400 + 23 * 3600 + 59 * 60;

    const updateDisplay = () => {
      const d = Math.floor(secondsLeft / 86400).toString().padStart(2, '0');
      const h = Math.floor((secondsLeft % 86400) / 3600).toString().padStart(2, '0');
      const m = Math.floor((secondsLeft % 3600) / 60).toString().padStart(2, '0');
      const s = (secondsLeft % 60).toString().padStart(2, '0');

      const elDays = shadow.getElementById('deals-days');
      const elHours = shadow.getElementById('deals-hours');
      const elMins = shadow.getElementById('deals-mins');
      const elSecs = shadow.getElementById('deals-secs');

      if (elDays) elDays.textContent = d;
      if (elHours) elHours.textContent = h;
      if (elMins) elMins.textContent = m;
      if (elSecs) elSecs.textContent = s;
    };

    updateDisplay();

    this.dealsTimerInterval = setInterval(() => {
      if (secondsLeft > 0) {
        secondsLeft--;
        updateDisplay();
      } else {
        clearInterval(this.dealsTimerInterval);
      }
    }, 1000);
  }

  attachDealsHeroListeners() {
    const shadow = this.shadowRoot;
    const shopNowBtn = shadow.getElementById('deals-shop-now-btn');
    if (shopNowBtn) {
      shopNowBtn.addEventListener('click', () => {
        const grid = shadow.getElementById('grid-deals');
        if (grid) {
          grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    const viewAllBtn = shadow.getElementById('deals-view-all-btn');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => {
        this.currentPage = 'catalog';
        this.currentCategory = 'All';
        this.renderPageContent();
        window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'catalog', category: 'All' } }));
      });
    }
  }

  attachCollectionsHeaderListeners() {
    const shadow = this.shadowRoot;
    const colHeaderCreate = shadow.getElementById('col-header-create-btn');
    if (colHeaderCreate) {
      colHeaderCreate.addEventListener('click', () => {
        this.openCustomCreateModal((name) => {
          const collections = this.loadCustomCollections();
          const newCol = {
            id: 'col-' + Date.now(),
            name: name,
            subtitle: "User Curated Gear Setup",
            description: "A custom curated collection of hardware items tailored for your workspace layout.",
            badge: "MY GEAR",
            price: 0,
            originalPrice: 0,
            themeColor: "#0052cc",
            productIds: [] // starts empty!
          };
          collections.push(newCol);
          this.saveCustomCollections(collections);
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Created collection "${name}"! 📁` }));
          this.injectCuratedCollections();
        });
      });
    }
  }

  injectGlobalMoreToLove() {
    const contentArea = this.shadowRoot.getElementById('page-content');
    if (!contentArea) return;

    const config = getMoreToLoveConfig();
    if (config.enabled === false) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'more-to-love-recommendations-section animate-in';
    wrapper.style.maxWidth = '1280px';
    wrapper.style.margin = '40px auto 30px';
    wrapper.style.padding = '0 24px';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.width = '100%';
    
    wrapper.innerHTML = `
      <div class="section-header" style="margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 12px;">
        <div>
          <h3 class="more-to-love-title" style="margin: 0; font-family: 'Fraunces', Georgia, serif; font-weight: 700; font-size: clamp(24px, 3.2vw, 32px); line-height: 1.15; color: var(--text-dark, #0A2540); letter-spacing: -0.015em;">
            More to <em style="font-style: italic; color: #1F6FEB; font-family: 'Fraunces', Georgia, serif;">love.</em>
          </h3>
          ${config.subtitle ? `<p style="margin: 6px 0 0 0; font-size: 13.5px; color: var(--text-gray, #5A6B84); font-weight: 500;">${config.subtitle}</p>` : ''}
        </div>
        <button class="view-all-btn" id="global-more-love-view-all" style="font-size: 13px; font-weight: 700; color: #1F6FEB; background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 6px 0;">View All →</button>
      </div>
      <div class="home-grid-4" id="global-more-to-love-grid"></div>
    `;
    
    contentArea.appendChild(wrapper);

    const productMap = new Map((this.products || []).map(p => [p.id, p]));
    let moreToLove = (config.productIds || []).map(id => productMap.get(id)).filter(Boolean);
    if (moreToLove.length < 2 && (this.products || []).length >= 2) {
      const currentId = this.currentProductId;
      moreToLove = (this.products || []).filter(p => p.id !== currentId).slice(0, 4);
    }
    const gridMore = this.shadowRoot.getElementById('global-more-to-love-grid');
    if (gridMore) {
      moreToLove.forEach(p => {
        const card = document.createElement('product-card');
        card.product = p;
        gridMore.appendChild(card);
      });
    }

    const viewAllBtn = this.shadowRoot.getElementById('global-more-love-view-all');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => {
        this.currentPage = 'catalog';
        this.currentCategory = 'All';
        this.renderPageContent();
        window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'catalog', category: 'All' } }));
      });
    }
  }

  getAuthPageHTML() {
    return getAuthPageHTML();
  }

  attachAuthListeners() {
    attachAuthListeners(this.shadowRoot, () => {
      this.currentPage = 'home';
      this.currentCategory = 'All';
      this.updateHashURL();
      this.renderPageContent();
      window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'home' } }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

customElements.define('product-list', ProductList);
export default ProductList;

// Global styled receipt generator for storefront
function printOrderReceipt(order) {
  const storeName = sessionStorage.getItem('SWEETOS_store_name') || 'SWEETOS';
  const storePhone = sessionStorage.getItem('SWEETOS_store_phone') || '+225 05 00 61 99 23';
  const storeEmail = sessionStorage.getItem('SWEETOS_store_email') || 'support@sweetos.com';
  const storeAddress = sessionStorage.getItem('SWEETOS_store_addr') || 'Abidjan, Cocody Mermoz';
  const currency = sessionStorage.getItem('SWEETOS_currency') || 'CFA';
  
  let clientName = order.customerName || order.name;
  let clientPhone = order.customerPhone || order.phone;
  let clientEmail = order.email || order.customerEmail;
  let clientAddress = order.customerAddress || order.address;

  // Let's try to resolve from profile key if present
  let resolvedProfile = null;
  const emailKey = clientEmail || (order.email ? order.email : '');
  if (emailKey) {
    const safeKey = emailKey.replace(/[^a-zA-Z0-9]/g, '_');
    const profileSaved = sessionStorage.getItem(`SWEETOS_user_profile_${safeKey}`) || sessionStorage.getItem(`SWEETOS_user_profile`);
    if (profileSaved) {
      try {
        resolvedProfile = JSON.parse(profileSaved);
      } catch(e) {}
    }
  } else {
    const profileSaved = sessionStorage.getItem(`SWEETOS_user_profile`);
    if (profileSaved) {
      try {
        resolvedProfile = JSON.parse(profileSaved);
      } catch(e) {}
    }
  }

  if (resolvedProfile) {
    if (!clientName) {
      clientName = `${resolvedProfile.firstName || ''} ${resolvedProfile.lastName || ''}`.trim();
    }
    if (!clientPhone) {
      clientPhone = resolvedProfile.phone;
    }
    if (!clientEmail) {
      clientEmail = resolvedProfile.email;
    }
    if (!clientAddress) {
      clientAddress = resolvedProfile.address;
    }
  }

  clientName = clientName || 'Client Invité';
  clientPhone = clientPhone || 'N/A';
  clientEmail = clientEmail || 'N/A';
  clientAddress = clientAddress || 'N/A';

  const localFormatPrice = (price) => {
    let symbol = currency;
    if (currency === 'USD') symbol = '$';
    else if (currency === 'EUR') symbol = '€';
    else if (currency === 'CFA' || currency === 'XOF' || currency === 'FCFA') symbol = 'FCFA';
    
    if (symbol === '$' || symbol === '€') {
      return `${symbol}${Math.round(price).toLocaleString()}`;
    }
    return `${Math.round(price).toLocaleString()} ${symbol}`;
  };

  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) return;
  
  let itemsHtml = '';
  let subtotal = 0;
  
  const products = order.products || [];
  products.forEach(p => {
    const itemTotal = p.price * p.quantity;
    subtotal += itemTotal;
    itemsHtml += `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 13.5px; font-weight: 600; color: #1e293b;">
          ${p.name}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center; color: #64748b;">
          ${localFormatPrice(p.price)}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center; color: #64748b;">
          ${p.quantity}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 13.5px; font-weight: 700; text-align: right; color: #0052cc;">
          ${localFormatPrice(itemTotal)}
        </td>
      </tr>
    `;
  });

  const shippingRate = parseFloat(sessionStorage.getItem('SWEETOS_shipping_rate') || '2000');
  const freeThreshold = parseFloat(sessionStorage.getItem('SWEETOS_free_shipping_threshold') || '15000');
  const shippingFee = subtotal >= freeThreshold ? 0 : shippingRate;
  
  const vatRate = parseFloat(sessionStorage.getItem('SWEETOS_vat_rate') || '18');
  const taxMode = sessionStorage.getItem('SWEETOS_tax_mode') || 'inclusive';
  
  let taxAmount = 0;
  if (taxMode === 'exclusive') {
    taxAmount = subtotal * (vatRate / 100);
  } else {
    taxAmount = (subtotal / (1 + vatRate / 100)) * (vatRate / 100);
  }
  
  const total = subtotal + shippingFee + (taxMode === 'exclusive' ? taxAmount : 0);
  const formattedDate = order.date || new Date().toISOString().replace('T', ' ').slice(0, 16);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Facture de Commande #${order.id}</title>
      <meta charset="utf-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        body {
          font-family: 'Outfit', sans-serif;
          margin: 0;
          padding: 40px;
          color: #334155;
          background: #ffffff;
        }
        .receipt-card {
          max-width: 700px;
          margin: 0 auto;
          padding: 24px;
          border: 1.5px solid #e2e8f0;
          border-radius: 20px;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .header-left {
          text-align: left;
        }
        .header-right {
          text-align: right;
        }
        .store-logo {
          font-size: 28px;
          font-weight: 900;
          color: #0052cc;
          margin-bottom: 6px;
        }
        .meta-label {
          font-size: 11px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .meta-val {
          font-size: 13.5px;
          font-weight: 600;
          color: #1e293b;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 30px;
          padding-bottom: 24px;
          border-bottom: 1.5px dashed #e2e8f0;
        }
        .info-block {
          background: #f8fafc;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
        }
        .info-title {
          font-size: 12px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .table-items {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .table-items th {
          background: #f1f5f9;
          padding: 10px 8px;
          font-size: 11px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1.5px solid #cbd5e1;
        }
        .summary-block {
          width: 300px;
          margin-left: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 13.5px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          color: #64748b;
        }
        .summary-row.total {
          font-size: 18px;
          font-weight: 900;
          color: #0052cc;
          border-top: 1.5px solid #e2e8f0;
          padding-top: 10px;
          margin-top: 5px;
        }
        .footer-note {
          text-align: center;
          margin-top: 50px;
          font-size: 12.5px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
        }
        @media print {
          body {
            padding: 0;
          }
          .receipt-card {
            border: none;
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <table class="header-table">
          <tr>
            <td class="header-left">
              <div class="store-logo">${storeName}</div>
              <div style="font-size: 13px; color: #64748b; line-height: 1.4;">
                ${storeAddress}<br>
                Tél: ${storePhone}<br>
                Email: ${storeEmail}
              </div>
            </td>
            <td class="header-right" valign="top">
              <div style="font-size: 20px; font-weight: 800; color: #1e293b; margin-bottom: 6px;">FACTURE / REÇU</div>
              <div>
                <span class="meta-label">Numéro de Commande:</span><br>
                <span class="meta-val" style="color: #0052cc;">#${order.id}</span>
              </div>
              <div style="margin-top: 8px;">
                <span class="meta-label">Date d'Émission:</span><br>
                <span class="meta-val">${formattedDate}</span>
              </div>
            </td>
          </tr>
        </table>

        <div class="details-grid">
          <div class="info-block">
            <div class="info-title">Facturé à (Client)</div>
            <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">
              ${clientName}
            </div>
            <div style="font-size: 13px; color: #64748b; line-height: 1.4;">
              Téléphone: ${clientPhone}<br>
              Email: ${clientEmail}<br>
              Adresse: ${clientAddress}
            </div>
          </div>
          <div class="info-block">
            <div class="info-title">Mode & Options de Livraison</div>
            <div style="font-size: 13.5px; font-weight: 600; color: #1e293b; margin-bottom: 4px;">
              Status: <span style="color:#0052cc;">${order.status}</span>
            </div>
            <div style="font-size: 13px; color: #64748b; line-height: 1.4;">
              Paiement: ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'COD'}<br>
              Suivi #: ${order.trackingNumber || 'En attente'}<br>
              Notes: ${order.notes || 'Aucune note.'}
            </div>
          </div>
        </div>

        <table class="table-items">
          <thead>
            <tr>
              <th align="left">Désignation</th>
              <th align="center">Prix Unitaire</th>
              <th align="center">Quantité</th>
              <th align="right">Montant Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="summary-block">
          <div class="summary-row">
            <span>Sous-total:</span>
            <strong>${localFormatPrice(subtotal)}</strong>
          </div>
          <div class="summary-row">
            <span>Frais de port:</span>
            <strong>${shippingFee === 0 ? 'Gratuit' : localFormatPrice(shippingFee)}</strong>
          </div>
          <div class="summary-row">
            <span>TVA (${vatRate}% - ${taxMode === 'inclusive' ? 'incluse' : 'non-incluse'}):</span>
            <strong>${localFormatPrice(taxAmount)}</strong>
          </div>
          <div class="summary-row total">
            <span>Total Général:</span>
            <span>${localFormatPrice(total)}</span>
          </div>
        </div>

        <div class="footer-note">
          Merci pour votre confiance et votre commande chez <strong>${storeName}</strong> !<br>
          <span style="font-size:11px; margin-top:6px; display:block;">Ceci est un reçu de commande officiel. Pour toute réclamation, veuillez contacter le support client.</span>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
