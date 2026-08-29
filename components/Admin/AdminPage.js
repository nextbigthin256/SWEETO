import { formatPrice, getAllOrdersFromStorage, saveAllOrdersToStorage, isLocalDevHost, saveStorageItem, getStorageItem } from '../../utils/storage.js';
import '../../utils/modal.js';
import { 
  syncProductsToSupabase, 
  syncCategoriesToSupabase, 
  syncBrandsToSupabase, 
  syncCouponsToSupabase, 
  syncReviewsToSupabase, 
  syncInventoryLogsToSupabase, 
  syncSectionsToSupabase, 
  createOrderInSupabase,
  fetchProductsFromSupabase,
  fetchCategoriesFromSupabase,
  fetchBrandsFromSupabase,
  fetchOrdersFromSupabase,
  fetchCustomersFromSupabase,
  fetchCouponsFromSupabase,
  fetchSectionsFromSupabase,
  fetchSettingsFromSupabase
} from '../../utils/supabase.js';

import { bootstrapFromSupabase } from '../../utils/supabaseBootstrap.js';

import products from '../../data/products.js';
import categories from '../../data/categories.js';
import brands from '../../data/brands.js';
import orders from '../../data/orders.js';
import { renderAdminSidebar, attachAdminSidebarListeners } from './AdminSidebar.js';
import { renderAdminHeader, attachAdminHeaderListeners } from './AdminHeader.js';
import { renderAdminDashboard, attachAdminDashboardListeners } from './AdminDashboard.js';
import { renderAdminProducts, attachAdminProductsListeners } from './AdminProducts.js';
import { renderAdminCategories, attachAdminCategoriesListeners } from './AdminCategories.js';
import { renderAdminBrands, attachAdminBrandsListeners } from './AdminBrands.js';
import { renderAdminOrders, attachAdminOrdersListeners } from './AdminOrders.js';
import { renderAdminCustomers, attachAdminCustomersListeners } from './AdminCustomers.js';
import { renderAdminInventory, attachAdminInventoryListeners } from './AdminInventory.js';
import { renderAdminCoupons, attachAdminCouponsListeners } from './AdminCoupons.js';
import { renderAdminAnalytics, attachAdminAnalyticsListeners } from './AdminAnalytics.js';
import { renderAdminNotifications, attachAdminNotificationsListeners } from './AdminNotifications.js';
import { renderAdminSettings, attachAdminSettingsListeners } from './AdminSettings.js';
import { renderAdminSections, attachAdminSectionsListeners } from './AdminSections.js';
import { renderAdminReviews, attachAdminReviewsListeners } from './AdminReviews.js';
import { renderAdminLoyalty, attachAdminLoyaltyListeners } from './AdminLoyalty.js';
import { renderAdminTodaysDeals, attachAdminTodaysDealsListeners } from './AdminTodaysDeals.js';
import { renderAdminMoreToLove, attachAdminMoreToLoveListeners } from './AdminMoreToLove.js';

window.showConfirm = function(message, title = 'Confirm Action') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.45)';
    overlay.style.backdropFilter = 'blur(10px)';
    overlay.style.webkitBackdropFilter = 'blur(10px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '999999';
    overlay.style.fontFamily = "'Outfit', sans-serif";
    overlay.style.padding = '20px';
    overlay.style.animation = 'confirm-fade-in 0.25s ease';

    const styleTag = document.createElement('style');
    styleTag.textContent = `
      @keyframes confirm-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes confirm-scale-in {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .confirm-btn-primary {
        background: #ef4444;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .confirm-btn-primary:hover {
        background: #dc2626;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        transform: translateY(-1px);
      }
      .confirm-btn-secondary {
        background: #f8fafc;
        color: #475569;
        border: 1.5px solid #e2e8f0;
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .confirm-btn-secondary:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
        transform: translateY(-1px);
      }
    `;
    overlay.appendChild(styleTag);

    const dialog = document.createElement('div');
    dialog.style.background = 'rgba(255, 255, 255, 0.95)';
    dialog.style.border = '1.5px solid rgba(255, 255, 255, 0.8)';
    dialog.style.boxShadow = '0 25px 50px -12px rgba(15, 23, 42, 0.15)';
    dialog.style.borderRadius = '24px';
    dialog.style.padding = '32px';
    dialog.style.width = '100%';
    dialog.style.maxWidth = '420px';
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';
    dialog.style.gap = '20px';
    dialog.style.animation = 'confirm-scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';

    // Icon & Header
    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.alignItems = 'center';
    headerRow.style.gap = '16px';

    const iconBox = document.createElement('div');
    iconBox.style.fontSize = '24px';
    iconBox.style.background = 'rgba(239, 68, 68, 0.08)';
    iconBox.style.color = '#ef4444';
    iconBox.style.width = '48px';
    iconBox.style.height = '48px';
    iconBox.style.borderRadius = '50%';
    iconBox.style.display = 'flex';
    iconBox.style.alignItems = 'center';
    iconBox.style.justifyContent = 'center';
    iconBox.textContent = '⚠️';

    const titleEl = document.createElement('h3');
    titleEl.style.margin = '0';
    titleEl.style.fontSize = '18.5px';
    titleEl.style.fontWeight = '800';
    titleEl.style.color = '#0f172a';
    titleEl.textContent = title;

    headerRow.appendChild(iconBox);
    headerRow.appendChild(titleEl);

    // Message
    const msgEl = document.createElement('p');
    msgEl.style.margin = '0';
    msgEl.style.fontSize = '14.5px';
    msgEl.style.color = '#64748b';
    msgEl.style.lineHeight = '1.6';
    msgEl.textContent = message;

    // Action buttons row
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'flex-end';
    btnRow.style.gap = '12px';
    btnRow.style.marginTop = '8px';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'confirm-btn-secondary';
    cancelBtn.textContent = 'Cancel';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'confirm-btn-primary';
    confirmBtn.textContent = 'Confirm';

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(confirmBtn);

    dialog.appendChild(headerRow);
    dialog.appendChild(msgEl);
    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);

    const cleanup = (value) => {
      overlay.style.animation = 'confirm-fade-in 0.2s ease reverse';
      dialog.style.animation = 'confirm-scale-in 0.2s ease reverse';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        resolve(value);
      }, 180);
    };

    confirmBtn.addEventListener('click', () => cleanup(true));
    cancelBtn.addEventListener('click', () => cleanup(false));
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });

    document.body.appendChild(overlay);
  });
};

window.showAlert = function(message, title = 'Attention Required') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.45)';
    overlay.style.backdropFilter = 'blur(10px)';
    overlay.style.webkitBackdropFilter = 'blur(10px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '999999';
    overlay.style.fontFamily = "'Outfit', sans-serif";
    overlay.style.padding = '20px';
    overlay.style.animation = 'confirm-fade-in 0.25s ease';

    const styleTag = document.createElement('style');
    styleTag.textContent = `
      @keyframes confirm-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes confirm-scale-in {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .alert-btn-primary {
        background: #0052cc;
        color: white;
        border: none;
        padding: 10px 24px;
        border-radius: 10px;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .alert-btn-primary:hover {
        background: #0040a3;
        box-shadow: 0 4px 12px rgba(0, 82, 204, 0.2);
        transform: translateY(-1px);
      }
    `;
    overlay.appendChild(styleTag);

    const dialog = document.createElement('div');
    dialog.style.background = 'rgba(255, 255, 255, 0.95)';
    dialog.style.border = '1.5px solid rgba(255, 255, 255, 0.8)';
    dialog.style.boxShadow = '0 25px 50px -12px rgba(15, 23, 42, 0.15)';
    dialog.style.borderRadius = '24px';
    dialog.style.padding = '32px';
    dialog.style.width = '100%';
    dialog.style.maxWidth = '420px';
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';
    dialog.style.gap = '20px';
    dialog.style.animation = 'confirm-scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';

    // Icon & Header
    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.alignItems = 'center';
    headerRow.style.gap = '16px';

    const iconBox = document.createElement('div');
    iconBox.style.fontSize = '24px';
    iconBox.style.background = 'rgba(0, 82, 204, 0.08)';
    iconBox.style.color = '#0052cc';
    iconBox.style.width = '48px';
    iconBox.style.height = '48px';
    iconBox.style.borderRadius = '50%';
    iconBox.style.display = 'flex';
    iconBox.style.alignItems = 'center';
    iconBox.style.justifyContent = 'center';
    iconBox.textContent = 'ℹ️';

    const titleEl = document.createElement('h3');
    titleEl.style.margin = '0';
    titleEl.style.fontSize = '18.5px';
    titleEl.style.fontWeight = '800';
    titleEl.style.color = '#0f172a';
    titleEl.textContent = title;

    headerRow.appendChild(iconBox);
    headerRow.appendChild(titleEl);

    // Message
    const msgEl = document.createElement('p');
    msgEl.style.margin = '0';
    msgEl.style.fontSize = '14.5px';
    msgEl.style.color = '#64748b';
    msgEl.style.lineHeight = '1.6';
    msgEl.textContent = message;

    // Action buttons row
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'flex-end';
    btnRow.style.gap = '12px';
    btnRow.style.marginTop = '8px';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'alert-btn-primary';
    confirmBtn.textContent = 'OK';

    btnRow.appendChild(confirmBtn);

    dialog.appendChild(headerRow);
    dialog.appendChild(msgEl);
    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);

    const cleanup = () => {
      overlay.style.animation = 'confirm-fade-in 0.2s ease reverse';
      dialog.style.animation = 'confirm-scale-in 0.2s ease reverse';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        resolve();
      }, 180);
    };

    confirmBtn.addEventListener('click', () => cleanup());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup();
    });

    document.body.appendChild(overlay);
  });
};

class AdminPage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Auth state
    this.isAuthenticated = sessionStorage.getItem('SWEETOS_admin_authenticated') === 'true';
    
    // View state
    this.currentTab = sessionStorage.getItem('SWEETOS_admin_current_tab') || 'dashboard';
    this.settingsSubTab = sessionStorage.getItem('SWEETOS_admin_settings_subtab') || 'general';
    this.sidebarCollapsed = sessionStorage.getItem('SWEETOS_admin_sidebar_collapsed') === 'true';
    
    // Filter & Search states
    this.searchQueries = {
      dashboard: '',
      products: '',
      categories: '',
      brands: '',
      orders: '',
      customers: '',
      reviews: '',
      inventory: '',
      sections: '',
      coupons: '',
      analytics: '',
      notifications: '',
      settings: ''
    };
    this.categoryFilter = 'All';
    this.statusFilter = 'All';
    this.stockFilter = 'All';
    this.currentPageIndex = 1;
    this.itemsPerPage = 10;
    
    // Order states
    this.selectedOrderId = null;
    
    // Customer states
    this.selectedCustomerEmail = null;
    
    // CRUD Modals
    this.showProductModal = false;
    this.editingProduct = null;
    this.showCouponModal = false;
    this.editingCoupon = null;
    this.showStockModal = false;
    this.stockProduct = null;
    this.showSectionModal = false;
    this.editingSection = null;
    
    // Data structures loaded dynamically
    this.products = [];
    this.orders = [];
    this.customers = [];
    this.coupons = [];
    this.categories = [];
    this.inventoryLogs = [];
    this.homepageSections = [];
    this.loadDatabase();
  }

  isAutofilledCredential(val) {
    if (!val || typeof val !== 'string') return false;
    const trimmed = val.trim().toLowerCase();
    
    // Check saved login email from session
    const savedEmail = (sessionStorage.getItem('SWEETOS_admin_login_email') || '').trim().toLowerCase();
    if (savedEmail && trimmed === savedEmail) return true;
    
    // Check SWEETOS_admin_user email
    const userObjStr = sessionStorage.getItem('SWEETOS_admin_user');
    if (userObjStr) {
      try {
        const parsed = JSON.parse(userObjStr);
        if (parsed && parsed.email && trimmed === parsed.email.trim().toLowerCase()) return true;
      } catch (e) {}
    }

    return false;
  }

  get searchQuery() {
    const q = this.searchQueries[this.currentTab] || '';
    if (this.isAutofilledCredential(q)) {
      return '';
    }
    return q;
  }

  set searchQuery(val) {
    if (this.isAutofilledCredential(val)) {
      this.searchQueries[this.currentTab] = '';
      return;
    }
    this.searchQueries[this.currentTab] = val || '';
  }

  sanitizeAutofilledSearchBars() {
    const shadow = this.shadowRoot;
    if (!shadow) return;

    const searchInputs = shadow.querySelectorAll('input[type="search"], #global-admin-search, [id*="search-input"]');
    searchInputs.forEach(input => {
      if (this.isAutofilledCredential(input.value)) {
        input.value = '';
        this.searchQueries[this.currentTab] = '';
      }
    });
  }

   checkSessionValidity() {
    const isAuth = sessionStorage.getItem('SWEETOS_admin_authenticated') === 'true';
    const globalVersion = sessionStorage.getItem('SWEETOS_admin_session_version');
    const deviceVersion = sessionStorage.getItem('SWEETOS_admin_device_session_version');

    if (isAuth && globalVersion && deviceVersion !== globalVersion) {
      sessionStorage.removeItem('SWEETOS_admin_authenticated');
      sessionStorage.removeItem('SWEETOS_admin_device_session_version');
      this.isAuthenticated = false;
    }
  }

  setupToastListener() {
    const shadow = this.shadowRoot;
    this._toastListener = (e) => {
      const container = shadow.getElementById('admin-toast-container');
      if (!container) return;
      
      const toast = document.createElement('div');
      
      let isError = false;
      let isAlert = false;
      let isKey = false;
      
      if (e.detail) {
        const detailLower = e.detail.toLowerCase();
        isError = detailLower.includes('error') || detailLower.includes('incorrect') || detailLower.includes('invalid');
        isAlert = detailLower.includes('bell') || detailLower.includes('live alert');
        isKey = detailLower.includes('key') || detailLower.includes('password');
      }

      toast.className = `admin-toast ${isError ? 'error' : 'success'}`;
      
      let icon = '✅';
      if (isError) icon = '❌';
      else if (isAlert) icon = '🔔';
      else if (isKey) icon = '🔑';
      
      toast.innerHTML = `<span>${icon}</span> <span>${e.detail || ''}</span>`;
      container.appendChild(toast);
      
      setTimeout(() => toast.classList.add('show'), 10);
      
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    };
    
    window.addEventListener('toast:show', this._toastListener);
  }

  connectedCallback() {
    this.checkSessionValidity();
    this.render();
    this.attachListeners();
    this.setupToastListener();

    this._storageEventListener = (e) => {
      if (e.key === 'SWEETOS_admin_session_version') {
        const isAuth = sessionStorage.getItem('SWEETOS_admin_authenticated') === 'true';
        const deviceVersion = sessionStorage.getItem('SWEETOS_admin_device_session_version');
        if (isAuth && e.newValue && deviceVersion !== e.newValue) {
          sessionStorage.removeItem('SWEETOS_admin_authenticated');
          sessionStorage.removeItem('SWEETOS_admin_device_session_version');
          this.isAuthenticated = false;
          this.render();
          this.attachListeners();
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Session expired: logged out from another device.' }));
        }
      }
    };
    window.addEventListener('storage', this._storageEventListener);

    this._failedSearchesListener = () => {
      if (this.currentTab === 'analytics') {
        this.render();
        this.attachListeners();
      }
    };
    window.addEventListener('failed_searches:updated', this._failedSearchesListener);

    // Live order updates across tabs & local checkout actions
    this._ordersUpdatedHandler = () => {
      const prevJson = JSON.stringify(this.orders || []);
      this.loadDatabase();
      const newJson = JSON.stringify(this.orders || []);
      
      // Only re-render if order data actually changed
      if (prevJson !== newJson) {
        if (['orders', 'dashboard', 'analytics', 'customers', 'loyalty'].includes(this.currentTab)) {
          this.render();
          this.attachListeners();
        }
      }
    };
    window.addEventListener('orders:updated', this._ordersUpdatedHandler);

    this._storageOrdersListener = (e) => {
      if (e.key === 'SWEETOS_all_orders' || (e.key && e.key.startsWith('SWEETOS_user_profile_'))) {
        this._ordersUpdatedHandler();
      }
    };
    window.addEventListener('storage', this._storageOrdersListener);

    // Load database state from Supabase Cloud on mount
    bootstrapFromSupabase(this).then(() => {
      this.render();
      this.attachListeners();
    });

    // Listen to live database sync & order update signals
    this._supabaseListener = () => {
      this.loadDatabase().then(() => {
        this.render();
        this.attachListeners();
      });
    };
    window.addEventListener('supabase:ready', this._supabaseListener);
    window.addEventListener('orders:updated', this._supabaseListener);
    window.addEventListener('storage', this._supabaseListener);

    // Fallback local API fetch
    const safeFetchJson = (url) => fetch(url).then(res => {
      if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return null;
      return res.json().catch(() => null);
    }).catch(() => null);

    Promise.all([
      safeFetchJson('/api/products'),
      safeFetchJson('/api/categories'),
      safeFetchJson('/api/brands'),
      safeFetchJson('/api/reviews'),
      safeFetchJson('/api/orders'),
      safeFetchJson('/api/coupons')
    ]).then(([products, categories, brands, reviews, orders, coupons]) => {
      let needsRender = false;
      if (Array.isArray(products) && products.length > 0) {
        this.products = products;
        sessionStorage.setItem('SWEETOS_products', JSON.stringify(products));
        needsRender = true;
      }
      if (Array.isArray(categories) && categories.length > 0) {
        this.categories = categories;
        sessionStorage.setItem('SWEETOS_categories', JSON.stringify(categories));
        needsRender = true;
      }
      if (Array.isArray(brands) && brands.length > 0) {
        this.brands = brands;
        sessionStorage.setItem('SWEETOS_brands', JSON.stringify(brands));
        needsRender = true;
      }
      if (Array.isArray(reviews) && reviews.length > 0) {
        this.reviews = reviews;
        sessionStorage.setItem('SWEETOS_reviews_all', JSON.stringify(reviews));
        needsRender = true;
      }
      if (Array.isArray(orders) && orders.length > 0) {
        this.orders = orders;
        saveAllOrdersToStorage(orders);
        needsRender = true;
      }
      if (Array.isArray(coupons) && coupons.length > 0) {
        this.coupons = coupons;
        sessionStorage.setItem('SWEETOS_coupons', JSON.stringify(coupons));
        needsRender = true;
      }
      if (needsRender) {
        this.render();
        this.attachListeners();
      }

      // Establish real-time notification stream (SSE)
      this.initRealTimeNotificationStream();
    });
  }

  async loadDatabase() {
    console.log('[Supabase Cloud] Loading database state from Cloud...');
    try {
      const [prods, cats, brands, ords, custs, cpps, secs] = await Promise.allSettled([
        fetchProductsFromSupabase(),
        fetchCategoriesFromSupabase(),
        fetchBrandsFromSupabase(),
        fetchOrdersFromSupabase(),
        fetchCustomersFromSupabase(),
        fetchCouponsFromSupabase(),
        fetchSectionsFromSupabase()
      ]);

      if (prods.status === 'fulfilled' && Array.isArray(prods.value) && prods.value.length > 0) {
        this.products = prods.value;
      } else {
        const storedProds = getStorageItem('SWEETOS_products');
        if (storedProds) try { this.products = JSON.parse(storedProds); } catch(e) {}
      }

      if (cats.status === 'fulfilled' && Array.isArray(cats.value) && cats.value.length > 0) {
        this.categories = cats.value;
      } else {
        const storedCats = getStorageItem('SWEETOS_categories');
        if (storedCats) try { this.categories = JSON.parse(storedCats); } catch(e) {}
      }

      if (brands.status === 'fulfilled' && Array.isArray(brands.value) && brands.value.length > 0) {
        this.brands = brands.value;
      } else {
        const storedBrands = getStorageItem('SWEETOS_brands');
        if (storedBrands) try { this.brands = JSON.parse(storedBrands); } catch(e) {}
      }

      // Merge Cloud + Local Storage Orders
      const cloudOrders = (ords.status === 'fulfilled' && Array.isArray(ords.value)) ? ords.value : [];
      const localOrders = getAllOrdersFromStorage();
      const ordersMap = new Map();
      cloudOrders.forEach(o => { if (o && (o.id || o.order_number)) ordersMap.set(o.id || o.order_number, o); });
      localOrders.forEach(o => { if (o && (o.id || o.order_number)) ordersMap.set(o.id || o.order_number, o); });
      this.orders = Array.from(ordersMap.values());

      // Merge Cloud + Local Storage Customers
      const cloudCusts = (custs.status === 'fulfilled' && Array.isArray(custs.value)) ? custs.value : [];
      const localCusts = this.loadCustomers();
      const custsMap = new Map();
      cloudCusts.forEach(c => { if (c && c.email) custsMap.set(c.email.trim().toLowerCase(), c); });
      localCusts.forEach(c => {
        if (c && c.email) {
          const emailLower = c.email.trim().toLowerCase();
          if (!custsMap.has(emailLower)) {
            custsMap.set(emailLower, c);
          } else {
            const existing = custsMap.get(emailLower);
            existing.ordersCount = Math.max(existing.ordersCount || 0, c.ordersCount || 0);
            existing.totalSpent = Math.max(existing.totalSpent || 0, c.totalSpent || 0);
          }
        }
      });
      this.customers = Array.from(custsMap.values());

      if (cpps.status === 'fulfilled' && Array.isArray(cpps.value) && cpps.value.length > 0) {
        this.coupons = cpps.value;
      } else {
        const storedCoupons = getStorageItem('SWEETOS_coupons');
        if (storedCoupons) try { this.coupons = JSON.parse(storedCoupons); } catch(e) {}
      }

      if (secs.status === 'fulfilled' && Array.isArray(secs.value) && secs.value.length > 0) {
        this.homepageSections = secs.value;
      } else {
        const storedSections = sessionStorage.getItem('SWEETOS_homepage_sections');
        if (storedSections) try { this.homepageSections = JSON.parse(storedSections); } catch(e) {}
      }

      const storedReviews = sessionStorage.getItem('SWEETOS_reviews_all');
      if (storedReviews) try { this.reviews = JSON.parse(storedReviews); } catch(e) {}

      sessionStorage.setItem('SWEETOS_db_initialized', 'true');
    } catch (err) {
      console.warn('[Supabase Cloud] loadDatabase notice:', err);
    }
  }

  loadCustomers() {
    const customersMap = new Map();

    const scanStorage = (storageObj) => {
      if (!storageObj) return;
      try {
        for (let i = 0; i < storageObj.length; i++) {
          const key = storageObj.key(i);
          if (key && (key.startsWith('SWEETOS_user_profile_') || key === 'SWEETOS_logged_in_user') && !key.endsWith('_guest')) {
            try {
              const profile = JSON.parse(storageObj.getItem(key));
              if (profile && profile.email) {
                const email = profile.email.toLowerCase().trim();
                const orders = profile.orders || [];
                const spent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
                const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.name || 'SWEETOS Member';
                
                const existing = customersMap.get(email);
                customersMap.set(email, {
                  name: existing && existing.name !== 'SWEETOS Member' ? existing.name : name,
                  email: profile.email,
                  phone: profile.phone || existing?.phone || '',
                  ordersCount: Math.max(orders.length, existing?.ordersCount || 0),
                  totalSpent: Math.max(spent, existing?.totalSpent || 0),
                  registrationDate: profile.registrationDate || existing?.registrationDate || "14 août, 2026",
                  addresses: profile.addresses || existing?.addresses || []
                });
              }
            } catch(e) {}
          }
        }
      } catch(e) {}
    };

    scanStorage(localStorage);
    scanStorage(sessionStorage);

    // Add values from checkout orders
    (this.orders || []).forEach(order => {
      if (order && order.customerEmail) {
        const email = String(order.customerEmail).toLowerCase().trim();
        const matchingOrders = (this.orders || []).filter(o => o && String(o.customerEmail || '').toLowerCase().trim() === email);
        const totalSpent = matchingOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

        if (customersMap.has(email)) {
          const exist = customersMap.get(email);
          exist.ordersCount = Math.max(exist.ordersCount, matchingOrders.length);
          exist.totalSpent = Math.max(exist.totalSpent, totalSpent);
          if (order.customerName && exist.name === 'Guest User') {
            exist.name = order.customerName;
          }
          if (order.customerPhone && !exist.phone) {
            exist.phone = order.customerPhone;
          }
        } else {
          customersMap.set(email, {
            name: order.customerName || "Guest User",
            email: order.customerEmail,
            phone: order.customerPhone || "",
            ordersCount: matchingOrders.length,
            totalSpent: totalSpent,
            registrationDate: order.date || "14 août, 2026",
            addresses: order.customerAddress ? [order.customerAddress] : []
          });
        }
      }
    });

    return Array.from(customersMap.values());
  }

  saveDatabase(type) {
    if (type === 'products') {
      saveStorageItem('SWEETOS_products', this.products);
      window.dispatchEvent(new CustomEvent('products:updated', { detail: this.products }));
      syncProductsToSupabase(this.products);
    } else if (type === 'orders') {
      saveAllOrdersToStorage(this.orders);
      if (Array.isArray(this.orders)) {
        this.orders.forEach(o => createOrderInSupabase(o));
      }
    } else if (type === 'coupons') {
      saveStorageItem('SWEETOS_coupons', this.coupons);
      syncCouponsToSupabase(this.coupons);
    } else if (type === 'categories') {
      saveStorageItem('SWEETOS_categories', this.categories);
      syncCategoriesToSupabase(this.categories);
    } else if (type === 'inventory') {
      saveStorageItem('SWEETOS_inventory_logs', this.inventoryLogs);
      syncInventoryLogsToSupabase(this.inventoryLogs);
    } else if (type === 'sections') {
      saveStorageItem('SWEETOS_homepage_sections', this.homepageSections);
      syncSectionsToSupabase(this.homepageSections);
    } else if (type === 'brands') {
      saveStorageItem('SWEETOS_brands', this.brands);
      window.dispatchEvent(new CustomEvent('brands:updated', { detail: this.brands }));
      syncBrandsToSupabase(this.brands);
    } else if (type === 'reviews') {
      saveStorageItem('SWEETOS_reviews_all', this.reviews);
      syncReviewsToSupabase(this.reviews);
    }
  }

  syncCouponsToServer() {
    if (isLocalDevHost()) {
      fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.coupons)
      }).catch(() => {});
    }

    try {
      import('../../utils/supabase.js').then(({ syncCouponsToSupabase }) => {
        syncCouponsToSupabase(this.coupons);
      });
    } catch(e) {}
  }

  syncProductsToServer() {
    if (isLocalDevHost()) {
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.products)
      }).catch(() => {});
    }

    try {
      import('../../utils/supabase.js').then(({ syncProductsToSupabase }) => {
        syncProductsToSupabase(this.products);
      });
    } catch(e) {}
  }

  syncCategoriesToServer() {
    if (isLocalDevHost()) {
      fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.categories)
      }).catch(() => {});
    }

    try {
      import('../../utils/supabase.js').then(({ syncCategoriesToSupabase }) => {
        syncCategoriesToSupabase(this.categories);
      });
    } catch(e) {}
  }

  syncBrandsToServer() {
    if (isLocalDevHost()) {
      fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.brands)
      }).catch(() => {});
    }

    try {
      import('../../utils/supabase.js').then(({ syncBrandsToSupabase }) => {
        syncBrandsToSupabase(this.brands);
      });
    } catch(e) {}
  }

  syncReviewsToServer() {
    if (isLocalDevHost()) {
      fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.reviews)
      }).catch(() => {});
    }

    try {
      import('../../utils/supabase.js').then(({ syncReviewsToSupabase }) => {
        syncReviewsToSupabase(this.reviews);
      });
    } catch(e) {}
  }

  syncOrdersToServer() {
    if (isLocalDevHost()) {
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.orders)
      }).catch(() => {});
    }

    try {
      import('../../utils/supabase.js').then(({ createOrderInSupabase }) => {
        if (Array.isArray(this.orders)) {
          this.orders.forEach(o => createOrderInSupabase(o));
        }
      });
    } catch(e) {}
  }

  initRealTimeNotificationStream() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // Check if SSE endpoint is supported on host before initializing EventSource
    fetch('/api/live-alerts', { method: 'HEAD' })
      .then(res => {
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('text/event-stream')) {
          this.eventSource = new EventSource('/api/live-alerts');
          
          this.eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              console.log('Real-time notification alert received:', data);
              window.dispatchEvent(new CustomEvent('toast:show', { detail: `🔔 LIVE ALERT: ${data.message}` }));
              this.syncAllDatabasesFromServer();
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          };

          this.eventSource.onerror = () => {
            // Silently close on static/serverless hosts where SSE is unsupported
            if (this.eventSource) {
              this.eventSource.close();
              this.eventSource = null;
            }
          };
        }
      })
      .catch(() => {
        // Quietly ignore network failures on static deployments
      });
  }

  syncAllDatabasesFromServer() {
    const safeFetchJson = (url) => fetch(url).then(res => {
      if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return null;
      return res.json().catch(() => null);
    }).catch(() => null);

    Promise.all([
      safeFetchJson('/api/products'),
      safeFetchJson('/api/categories'),
      safeFetchJson('/api/brands'),
      safeFetchJson('/api/reviews'),
      safeFetchJson('/api/orders'),
      safeFetchJson('/api/coupons')
    ]).then(([products, categories, brands, reviews, orders, coupons]) => {
      if (products) {
        this.products = products;
        sessionStorage.setItem('SWEETOS_products', JSON.stringify(products));
      }
      if (categories) {
        this.categories = categories;
        sessionStorage.setItem('SWEETOS_categories', JSON.stringify(categories));
      }
      if (brands) {
        this.brands = brands;
        sessionStorage.setItem('SWEETOS_brands', JSON.stringify(brands));
      }
      if (reviews) {
        this.reviews = reviews;
        sessionStorage.setItem('SWEETOS_reviews_all', JSON.stringify(reviews));
      }
      if (orders) {
        this.orders = orders;
        saveAllOrdersToStorage(orders);
      }
      if (coupons) {
        this.coupons = coupons;
        sessionStorage.setItem('SWEETOS_coupons', JSON.stringify(coupons));
      }
      
      this.render();
      this.attachListeners();
    });
  }

  render() {
    // 1. Ensure stylesheet is injected exactly once to prevent FOUC on tab changes
    if (!this.shadowRoot.querySelector('link[href*="AdminPage.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = './components/Admin/AdminPage.css';
      this.shadowRoot.appendChild(link);
    }
    
    // 2. Ensure container exists
    let container = this.shadowRoot.querySelector('.admin-page-wrapper');
    if (!container) {
      container = document.createElement('div');
      container.className = 'admin-page-wrapper';
      container.style.opacity = '0';
      container.style.transition = 'opacity 0.15s ease';
      this.shadowRoot.appendChild(container);
      
      const link = this.shadowRoot.querySelector('link[href*="AdminPage.css"]');
      if (link) {
        link.addEventListener('load', () => {
          container.style.opacity = '1';
        });
      }
      setTimeout(() => {
        container.style.opacity = '1';
      }, 50);
    }
    
    // 3. Render HTML content inside container
    container.innerHTML = `
      ${!this.isAuthenticated ? this.renderLogin() : this.renderDashboardLayout()}
      <div class="admin-toast-container" id="admin-toast-container"></div>
    `;
  }

  renderLogin() {
    return `
      <div class="admin-login-wrapper">
        <div class="admin-login-card animate-in">
          <div class="brand-logo-glow"></div>
          <div class="login-header">
            <div class="admin-logo-badge">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <h2>SWEETOS Admin Portal</h2>
            <p>⚡ Authentification Cloud Supabase</p>
          </div>
          <form id="admin-login-form" autocomplete="off">
            <div class="form-group">
              <label>Email Admin Supabase</label>
              <input type="email" id="admin-email" name="admin_login_email_no_autofill" required placeholder="admin@example.com" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
            </div>
            <div class="form-group">
              <label>Mot de Passe Admin</label>
              <input type="password" id="admin-password" name="admin_login_pass_no_autofill" required placeholder="••••••••" autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
            </div>
            <div id="login-error-msg" class="error-text" style="color: #f87171; font-size: 13px; font-weight: 650; margin-bottom: 12px; text-align: center;"></div>
            <button type="submit" id="admin-submit-btn">Connexion Supabase 🚀</button>
          </form>
          
          <div style="margin-top: 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px;">
            <span style="font-size: 11px; color: rgba(255,255,255,0.45); font-weight: 600;">
              🔒 Session Sécurisée Supabase Cloud 256-bit
            </span>
          </div>
        </div>
      </div>
    `;
  }

  renderDashboardLayout() {
    return `
      <div class="admin-dashboard-container animate-in">
        ${renderAdminSidebar(this)}
        <main class="admin-main">
          ${renderAdminHeader(this)}
          <div class="admin-viewport custom-scroll">
            ${this.renderTabContent()}
          </div>
        </main>

        <!-- 3-Digit PIN Security Modal -->
        <div class="pin-modal-overlay" id="pin-modal-overlay">
          <div class="pin-modal-card">
            <div class="pin-modal-icon">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h3 style="font-size: 20px; font-weight: 850; margin: 0 0 6px 0; color: #ffffff;">Sécurité PIN Admin</h3>
            <p style="font-size: 12.5px; color: #94a3b8; margin: 0;">Entrez le code PIN à 3 chiffres pour déconnecter les autres appareils</p>
            
            <div class="pin-inputs-row">
              <input type="password" maxlength="1" class="pin-digit-box" id="pin-digit-1" name="pin_digit_1_no_autofill" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
              <input type="password" maxlength="1" class="pin-digit-box" id="pin-digit-2" name="pin_digit_2_no_autofill" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
              <input type="password" maxlength="1" class="pin-digit-box" id="pin-digit-3" name="pin_digit_3_no_autofill" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
            </div>

            <div id="pin-modal-error" style="color: #f87171; font-size: 12.5px; font-weight: 700; margin-bottom: 16px; min-height: 18px;"></div>

            <div style="display: flex; gap: 12px;">
              <button class="admin-btn admin-btn-secondary" id="btn-cancel-pin" style="flex: 1; justify-content: center;">Annuler</button>
              <button class="admin-btn admin-btn-primary" id="btn-confirm-pin" style="flex: 1; justify-content: center; background: linear-gradient(135deg, #0052cc 0%, #0066ff 100%);">Confirmer PIN 🔒</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTabContent() {
    if (this.lastTab !== this.currentTab) {
      this.currentPageIndex = 1;
      this.lastTab = this.currentTab;
    }
    switch (this.currentTab) {
      case 'dashboard':
        return renderAdminDashboard(this);
      case 'products':
        return renderAdminProducts(this);
      case 'categories':
        return renderAdminCategories(this);
      case 'brands':
        return renderAdminBrands(this);
      case 'orders':
        return renderAdminOrders(this);
      case 'customers':
        return renderAdminCustomers(this);
      case 'inventory':
        return renderAdminInventory(this);
      case 'coupons':
        return renderAdminCoupons(this);
      case 'analytics':
        return renderAdminAnalytics(this);
      case 'notifications':
        return renderAdminNotifications(this);
      case 'settings':
        return renderAdminSettings(this);
      case 'sections':
        return renderAdminSections(this);
      case 'deals':
        return renderAdminTodaysDeals(this);
      case 'more-to-love':
        return renderAdminMoreToLove(this);
      case 'reviews':
        return renderAdminReviews(this);
      case 'loyalty':
        return renderAdminLoyalty(this);
      default:
        return renderAdminDashboard(this);
    }
  }

  attachListeners() {
    const shadow = this.shadowRoot;
    
    // Check if authenticated
    if (!this.isAuthenticated) {
      const loginForm = shadow.getElementById('admin-login-form');
      if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const emailInput = shadow.getElementById('admin-email');
          const passInput = shadow.getElementById('admin-password');
          const errorMsg = shadow.getElementById('login-error-msg');
          const submitBtn = shadow.getElementById('admin-submit-btn');

          const email = (emailInput?.value || '').trim();
          const pass = (passInput?.value || '').trim();

          if (errorMsg) errorMsg.textContent = '';
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Vérification Supabase Cloud...';
          }

          try {
            const { adminSignInWithSupabase } = await import('../../utils/supabase.js');
            const result = await adminSignInWithSupabase(email, pass);

            if (result.success) {
              this.isAuthenticated = true;
              sessionStorage.setItem('SWEETOS_admin_authenticated', 'true');
              if (email) sessionStorage.setItem('SWEETOS_admin_login_email', email);
              const sessionVersion = sessionStorage.getItem('SWEETOS_admin_session_version') || Date.now().toString();
              sessionStorage.setItem('SWEETOS_admin_session_version', sessionVersion);
              sessionStorage.setItem('SWEETOS_admin_device_session_version', sessionVersion);
              
              if (result.user && result.user.email) {
                sessionStorage.setItem('SWEETOS_admin_user', JSON.stringify({ email: result.user.email }));
                sessionStorage.setItem('SWEETOS_admin_login_email', result.user.email);
              }

              this.render();
              this.attachListeners();
              window.dispatchEvent(new CustomEvent('toast:show', { detail: '⚡ Connecté au Portail Admin Supabase Cloud avec succès !' }));
            } else {
              if (errorMsg) errorMsg.textContent = result.error || 'Authentification Supabase échouée.';
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Connexion Supabase 🚀';
              }
            }
          } catch (err) {
            if (errorMsg) errorMsg.textContent = err.message || 'Erreur de connexion Supabase.';
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Connexion Supabase 🚀';
            }
          }
        });
      }
      return;
    }

    // Sanitize any search bars that browser autofilled credentials into
    this.sanitizeAutofilledSearchBars();

    // Attach modular components listeners
    attachAdminSidebarListeners(this, shadow);
    attachAdminHeaderListeners(this, shadow);

    switch (this.currentTab) {
      case 'dashboard':
        attachAdminDashboardListeners(this, shadow);
        break;
      case 'products':
        attachAdminProductsListeners(this, shadow);
        break;
      case 'categories':
        attachAdminCategoriesListeners(this, shadow);
        break;
      case 'brands':
        attachAdminBrandsListeners(this, shadow);
        break;
      case 'orders':
        attachAdminOrdersListeners(this, shadow);
        break;
      case 'customers':
        attachAdminCustomersListeners(this, shadow);
        break;
      case 'loyalty':
        attachAdminLoyaltyListeners(this, shadow);
        break;
      case 'inventory':
        attachAdminInventoryListeners(this, shadow);
        break;
      case 'coupons':
        attachAdminCouponsListeners(this, shadow);
        break;
      case 'analytics':
        attachAdminAnalyticsListeners(this, shadow);
        break;
      case 'notifications':
        attachAdminNotificationsListeners(this, shadow);
        break;
      case 'settings':
        attachAdminSettingsListeners(this, shadow);
        break;
      case 'sections':
        attachAdminSectionsListeners(this, shadow);
        break;
      case 'deals':
        attachAdminTodaysDealsListeners(this, shadow);
        break;
      case 'more-to-love':
        attachAdminMoreToLoveListeners(this, shadow);
        break;
      case 'reviews':
        attachAdminReviewsListeners(this, shadow);
        break;
    }

    // 3-Digit PIN Digit Auto-Advance & Confirmation
    const digit1 = shadow.getElementById('pin-digit-1');
    const digit2 = shadow.getElementById('pin-digit-2');
    const digit3 = shadow.getElementById('pin-digit-3');
    const pinOverlay = shadow.getElementById('pin-modal-overlay');
    const cancelPinBtn = shadow.getElementById('btn-cancel-pin');
    const confirmPinBtn = shadow.getElementById('btn-confirm-pin');
    const pinError = shadow.getElementById('pin-modal-error');

    if (digit1 && digit2 && digit3) {
      digit1.addEventListener('input', () => { if (digit1.value) digit2.focus(); });
      digit2.addEventListener('input', () => { if (digit2.value) digit3.focus(); });
      digit3.addEventListener('input', () => { if (digit3.value && confirmPinBtn) confirmPinBtn.focus(); });

      digit2.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !digit2.value) digit1.focus(); });
      digit3.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !digit3.value) digit2.focus(); });
    }

    if (cancelPinBtn && pinOverlay) {
      cancelPinBtn.addEventListener('click', () => {
        pinOverlay.classList.remove('active');
        if (digit1) digit1.value = '';
        if (digit2) digit2.value = '';
        if (digit3) digit3.value = '';
        if (pinError) pinError.textContent = '';
      });
    }

    if (confirmPinBtn) {
      confirmPinBtn.addEventListener('click', async () => {
        const pin = ((digit1?.value || '') + (digit2?.value || '') + (digit3?.value || '')).trim();
        if (pin.length !== 3) {
          if (pinError) pinError.textContent = 'Veuillez saisir les 3 chiffres du code PIN.';
          return;
        }

        if (confirmPinBtn) {
          confirmPinBtn.disabled = true;
          confirmPinBtn.textContent = 'Vérification...';
        }

        try {
          const { revokeOtherAdminDevicesInSupabase } = await import('../../utils/supabase.js');
          const deviceId = sessionStorage.getItem('SWEETOS_admin_primary_device_id') || ('dev_' + Math.random().toString(36).substr(2, 7));
          const res = await revokeOtherAdminDevicesInSupabase(pin, deviceId);

          if (res.success) {
            if (pinOverlay) pinOverlay.classList.remove('active');
            if (digit1) digit1.value = '';
            if (digit2) digit2.value = '';
            if (digit3) digit3.value = '';
            if (pinError) pinError.textContent = '';

            window.dispatchEvent(new CustomEvent('toast:show', { detail: '🔒 Tous les autres appareils ont été déconnectés avec succès !' }));
          } else {
            if (pinError) pinError.textContent = res.error || 'Code PIN incorrect.';
          }
        } catch (err) {
          if (pinError) pinError.textContent = 'Erreur lors de la révocation.';
        } finally {
          if (confirmPinBtn) {
            confirmPinBtn.disabled = false;
            confirmPinBtn.textContent = 'Confirmer PIN 🔒';
          }
        }
      });
    }
  }

  disconnectedCallback() {
    if (this._storageEventListener) {
      window.removeEventListener('storage', this._storageEventListener);
    }
    if (this._toastListener) {
      window.removeEventListener('toast:show', this._toastListener);
    }
    if (this._sessionGuardTimer) {
      clearInterval(this._sessionGuardTimer);
    }
    if (this._ordersUpdatedHandler) {
      window.removeEventListener('orders:updated', this._ordersUpdatedHandler);
    }
    if (this._storageOrdersListener) {
      window.removeEventListener('storage', this._storageOrdersListener);
    }
  }

  updateProductsTable() {
    this.render();
    this.attachListeners();
    const s = this.shadowRoot.getElementById('product-search');
    if (s) {
      s.focus();
      s.setSelectionRange(s.value.length, s.value.length);
    }
  }
}

customElements.define('admin-page', AdminPage);
export default AdminPage;
