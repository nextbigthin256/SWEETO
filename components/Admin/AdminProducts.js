import { formatPrice, getStorageItem, saveStorageItem } from '../../utils/storage.js';
import { showConfirmModal, showPromptModal } from '../../utils/modal.js';
import { deleteProductPermanentlyFromSupabase, deleteMultipleProductsPermanentlyFromSupabase } from '../../utils/supabase.js';

// Global internal state helpers for filters & selection
let selectedProductIds = new Set();
let brandFilter = 'All';
let sortBy = 'newest';

function getCatAndSubNames(targetCat, allCats) {
  if (!targetCat || targetCat === 'All') return null;
  const targetLower = String(targetCat).trim().toLowerCase();
  const root = (allCats || []).find(c => c && (
    String(c.name || '').trim().toLowerCase() === targetLower ||
    String(c.slug || '').trim().toLowerCase() === targetLower ||
    String(c.id) === String(targetCat)
  ));
  const set = new Set([targetLower]);
  if (root) {
    if (root.name) set.add(String(root.name).trim().toLowerCase());
    if (root.slug) set.add(String(root.slug).trim().toLowerCase());
    const findChildren = (pId, pName) => {
      (allCats || []).forEach(c => {
        if (!c || !c.name) return;
        const pVal = c.parent;
        const isChild = pVal !== null && pVal !== undefined && pVal !== '' && pVal !== 0 && (
          String(pVal) === String(pId) ||
          String(pVal).trim().toLowerCase() === String(pName || '').trim().toLowerCase()
        );
        if (isChild) {
          const cNameLower = String(c.name).trim().toLowerCase();
          if (!set.has(cNameLower)) {
            set.add(cNameLower);
            if (c.slug) set.add(String(c.slug).trim().toLowerCase());
            findChildren(c.id, c.name);
          }
        }
      });
    };
    findChildren(root.id, root.name);
  }
  return set;
}

function isProductInCat(product, targetCat, allCats) {
  if (!targetCat || targetCat === 'All') return true;
  if (!product || !product.category) return false;
  const set = getCatAndSubNames(targetCat, allCats);
  if (!set) return true;
  return set.has(String(product.category).trim().toLowerCase());
}

function generateShortProductDescription({ name, category, brand, price, image }) {
  const cleanName = name || 'Product';
  const cleanBrand = brand && brand !== 'All' ? brand : 'SWEETOS';
  const cleanCat = category && category !== 'All' ? category : 'tech & workspace gear';
  
  let imgHint = 'premium build quality';
  if (image) {
    const lowerImg = String(image).toLowerCase();
    if (lowerImg.includes('leather') || lowerImg.includes('mat') || lowerImg.includes('desk')) imgHint = 'artisan craftsmanship and smooth desk coverage';
    else if (lowerImg.includes('keyboard') || lowerImg.includes('key')) imgHint = 'tactile mechanical feedback and custom keycap styling';
    else if (lowerImg.includes('audio') || lowerImg.includes('headphone') || lowerImg.includes('bose') || lowerImg.includes('speaker')) imgHint = 'immersive acoustics and studio-grade noise isolation';
    else if (lowerImg.includes('lamp') || lowerImg.includes('light')) imgHint = 'eye-care ambient illumination and sleek minimalist geometry';
    else if (lowerImg.includes('stand') || lowerImg.includes('monitor') || lowerImg.includes('riser')) imgHint = 'heavy-duty ergonomic support and clean cable routing';
    else if (lowerImg.includes('laptop') || lowerImg.includes('macbook') || lowerImg.includes('computer') || lowerImg.includes('book')) imgHint = 'high-performance processing, vibrant display clarity, and sleek portability';
  }

  const templates = [
    `Engineered by ${cleanBrand}, ${cleanName} delivers high-end reliability and refined aesthetics for your ${cleanCat.toLowerCase()} setup. Features ${imgHint} for everyday modern productivity.`,
    `Discover ${cleanName} by ${cleanBrand}. Crafted for minimalist ${cleanCat.toLowerCase()} setups, featuring ${imgHint}, seamless functionality, and clean studio styling to elevate workspace performance.`,
    `Upgrade your workspace with ${cleanName} from ${cleanBrand}. Built with high-grade components, ${imgHint}, and precision ergonomics, delivering unmatched comfort and sleek contemporary design.`
  ];

  const index = (cleanName.length + (price ? parseInt(price) || 0 : 0)) % templates.length;
  let text = templates[index];

  const words = text.split(/\s+/);
  if (words.length > 32) {
    text = words.slice(0, 30).join(' ') + '.';
  }

  return text;
}

function shareProductToWhatsAppStatus(product) {
  if (!product) return;
  
  const origin = window.location.origin;
  const path = window.location.pathname;
  const productUrl = `${origin}${path}#/?product=${product.id}`;

  const storeName = sessionStorage.getItem('SWEETOS_store_name') || 'SWEETOS';
  const priceText = formatPrice(product.price);
  const compareText = product.comparePrice && product.comparePrice > product.price 
    ? ` (Was ~${formatPrice(product.comparePrice)}~)` 
    : '';

  let desc = (product.description || '').trim();
  if (!desc || desc.length > 240) {
    desc = generateShortProductDescription({
      name: product.name,
      category: product.category,
      brand: product.brand,
      price: product.price,
      image: product.image
    });
  }

  const message = 
`🔥 *NEW ARRIVAL ON ${storeName.toUpperCase()}* 🔥

📦 *${product.name.toUpperCase()}*
🏷️ *Brand:* ${product.brand || 'SWEETOS'}
📂 *Category:* ${product.category || 'General'}
💰 *Price:* ${priceText}${compareText}

📝 *Details:*
"${desc}"

⚡ *Stock:* ${product.stock > 0 ? `In Stock (${product.stock} units available)` : 'Limited Stock!'}

👇 *Tap link below to view & order directly:*
🔗 ${productUrl}`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
  
  window.dispatchEvent(new CustomEvent('toast:show', { 
    detail: '📱 Opening WhatsApp! Select "My Status" to publish.' 
  }));
}

export function renderAdminProducts(context) {
  const query = (context.searchQuery || '').toLowerCase().trim();
  const cat = context.categoryFilter || 'All';
  const stockF = context.stockFilter || 'All';
  const rawProducts = context.products || [];
  
  // 1. Filter products list (including subcategories)
  let filtered = rawProducts.filter(p => {
    if (query) {
      const matchName = (p.name || '').toLowerCase().includes(query);
      const matchSku = (p.sku || '').toLowerCase().includes(query);
      const matchBrand = (p.brand || '').toLowerCase().includes(query);
      const matchCat = (p.category || '').toLowerCase().includes(query);
      if (!matchName && !matchSku && !matchBrand && !matchCat) return false;
    }
    if (cat !== 'All' && !isProductInCat(p, cat, context.categories)) return false;
    if (brandFilter !== 'All' && p.brand !== brandFilter) return false;
    if (stockF !== 'All') {
      const stock = p.stock !== undefined ? p.stock : 0;
      const threshold = p.threshold !== undefined ? p.threshold : 5;
      if (stockF === 'In Stock' && stock <= threshold) return false;
      if (stockF === 'Low Stock' && (stock === 0 || stock > threshold)) return false;
      if (stockF === 'Out of Stock' && stock !== 0) return false;
    }
    return true;
  });

  // 2. Sorting
  filtered.sort((a, b) => {
    if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
    if (sortBy === 'oldest') return (a.id || 0) - (b.id || 0);
    if (sortBy === 'price_high') return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
    if (sortBy === 'price_low') return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
    if (sortBy === 'stock_high') return (parseInt(b.stock) || 0) - (parseInt(a.stock) || 0);
    if (sortBy === 'stock_low') return (parseInt(a.stock) || 0) - (parseInt(b.stock) || 0);
    if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    return 0;
  });

  // Metrics calculations
  const totalCount = rawProducts.length;
  const inStockCount = rawProducts.filter(p => (p.stock || 0) > (p.threshold || 5)).length;
  const lowStockCount = rawProducts.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= (p.threshold || 5)).length;
  const outOfStockCount = rawProducts.filter(p => (p.stock || 0) === 0).length;
  const totalInventoryValue = rawProducts.reduce((sum, p) => sum + ((parseFloat(p.price) || 0) * (parseInt(p.stock) || 0)), 0);

  // Pagination bounds
  const totalItems = filtered.length;
  const itemsPerPage = context.itemsPerPage || 10;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const currentPage = Math.min(context.currentPageIndex || 1, totalPages);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filtered.slice(startIndex, startIndex + itemsPerPage);

  const isEditing = context.editingProduct !== null;
  const showModal = context.showProductModal;
  const productStatus = context.editingProduct ? (context.editingProduct.status || 'Active') : (context.productStatus || 'Active');

  const allSelected = paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProductIds.has(p.id));

  // Extract unique brands
  const savedBrands = JSON.parse(sessionStorage.getItem('SWEETOS_brands') || '[]');
  const brandNames = Array.from(new Set([...savedBrands.map(b => b.name), ...rawProducts.map(p => p.brand).filter(Boolean)]));

  return `
    <style>
      @keyframes pulse-red {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
        70% { transform: scale(1.05); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      }
      .pulse-red-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        background: #ef4444;
        border-radius: 50%;
        animation: pulse-red 1.8s infinite;
      }
      .products-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      }
      .kpi-card {
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 16px;
        padding: 18px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
        transition: all 0.2s ease;
        backdrop-filter: blur(8px);
      }
      .kpi-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
      }
      .kpi-icon-box {
        width: 46px;
        height: 46px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        flex-shrink: 0;
      }
      .kpi-title {
        font-size: 11.5px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin-bottom: 3px;
        display: block;
      }
      .kpi-val {
        font-size: 22px;
        font-weight: 850;
        color: #0f172a;
        line-height: 1.2;
      }
      .product-toolbar {
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 16px;
        padding: 14px 18px;
        margin-bottom: 16px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
      }
      .filter-controls-group {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        flex: 1;
      }
      .clean-search-box {
        position: relative;
        min-width: 240px;
        flex: 1;
      }
      .clean-search-box input {
        width: 100%;
        padding: 9px 14px 9px 38px;
        border-radius: 10px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        font-size: 13.5px;
        font-family: inherit;
        color: #1e293b;
        outline: none;
        transition: all 0.2s ease;
        box-sizing: border-box;
      }
      .clean-search-box input:focus {
        border-color: #0052cc;
        box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.12);
      }
      .clean-search-box svg {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
        pointer-events: none;
      }
      .select-filter-btn {
        padding: 9px 14px;
        border-radius: 10px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        font-size: 13px;
        font-weight: 600;
        color: #334155;
        font-family: inherit;
        outline: none;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .select-filter-btn:focus, .select-filter-btn:hover {
        border-color: #0052cc;
      }
      .category-pill-list {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 4px;
        margin-bottom: 16px;
      }
      .category-pill-tab {
        background: rgba(255, 255, 255, 0.7);
        border: 1.5px solid #e2e8f0;
        padding: 7px 14px;
        border-radius: 20px;
        font-size: 12.5px;
        font-weight: 700;
        color: #475569;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
        transition: all 0.2s ease;
      }
      .category-pill-tab:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        transform: translateY(-1px);
      }
      .category-pill-tab.active {
        background: #0052cc;
        color: #ffffff;
        border-color: #0052cc;
        box-shadow: 0 4px 12px rgba(0, 82, 204, 0.25);
      }
      .category-pill-badge {
        font-size: 11px;
        padding: 1px 7px;
        border-radius: 10px;
        font-weight: 800;
        background: rgba(0, 0, 0, 0.07);
      }
      .category-pill-tab.active .category-pill-badge {
        background: rgba(255, 255, 255, 0.25);
        color: #ffffff;
      }
      .bulk-action-bar {
        background: #0f172a;
        color: #ffffff;
        padding: 10px 18px;
        border-radius: 12px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        animation: slide-down 0.2s ease;
        box-shadow: 0 6px 20px rgba(15, 23, 42, 0.15);
      }
      @keyframes slide-down {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .bulk-btn {
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #ffffff;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .bulk-btn:hover {
        background: rgba(255, 255, 255, 0.22);
        border-color: rgba(255, 255, 255, 0.35);
      }
      .bulk-btn-danger:hover {
        background: #ef4444;
        border-color: #ef4444;
      }
      .product-table-container {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      }
      .product-row-hover:hover {
        background-color: rgba(241, 245, 249, 0.6) !important;
      }
      .stock-stepper-box {
        display: inline-flex;
        align-items: center;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #ffffff;
        overflow: hidden;
      }
      .stock-stepper-btn {
        background: #f8fafc;
        border: none;
        width: 24px;
        height: 26px;
        font-size: 13px;
        font-weight: 800;
        color: #475569;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.1s ease;
      }
      .stock-stepper-btn:hover {
        background: #0052cc;
        color: #ffffff;
      }
      .stock-stepper-val {
        padding: 0 8px;
        font-size: 12.5px;
        font-weight: 800;
        color: #1e293b;
        min-width: 28px;
        text-align: center;
      }
      .status-toggle-pill {
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 11.5px;
        font-weight: 800;
        cursor: pointer;
        border: 1px solid transparent;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: all 0.15s ease;
      }
      .status-toggle-pill.active {
        background: #dcfce7;
        color: #166534;
        border-color: #bbf7d0;
      }
      .status-toggle-pill.draft {
        background: #fef3c7;
        color: #92400e;
        border-color: #fde68a;
      }
      .action-icon-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #475569;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .action-icon-btn:hover {
        background: #0052cc;
        color: #ffffff;
        border-color: #0052cc;
        transform: translateY(-1px);
      }
      .action-icon-btn.delete-btn:hover {
        background: #ef4444;
        color: #ffffff;
        border-color: #ef4444;
      }
    </style>

    <!-- 1. Products Metrics & KPI Summary Cards -->
    <div class="products-kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(0, 82, 204, 0.1); color: #0052cc;">📦</div>
        <div>
          <span class="kpi-title">Total Catalog</span>
          <span class="kpi-val">${totalCount} Items</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(34, 197, 94, 0.1); color: #16a34a;">✅</div>
        <div>
          <span class="kpi-title">Healthy Stock</span>
          <span class="kpi-val" style="color: #16a34a;">${inStockCount}</span>
        </div>
      </div>

      <div class="kpi-card" style="${lowStockCount > 0 ? 'border-color: #f59e0b; background: rgba(254, 243, 199, 0.3);' : ''}">
        <div class="kpi-icon-box" style="background: rgba(245, 158, 11, 0.12); color: #d97706;">⚠️</div>
        <div>
          <span class="kpi-title" style="display:flex; align-items:center; gap:6px;">
            Low Stock Alerts ${lowStockCount > 0 ? '<span class="pulse-indicator"></span>' : ''}
          </span>
          <span class="kpi-val" style="color: #d97706;">${lowStockCount}</span>
        </div>
      </div>

      <div class="kpi-card" style="${outOfStockCount > 0 ? 'border-color: #ef4444; background: rgba(254, 242, 242, 0.4);' : ''}">
        <div class="kpi-icon-box" style="background: rgba(239, 68, 68, 0.12); color: #dc2626;">❌</div>
        <div>
          <span class="kpi-title" style="display:flex; align-items:center; gap:6px;">
            Out of Stock ${outOfStockCount > 0 ? '<span class="pulse-red-indicator"></span>' : ''}
          </span>
          <span class="kpi-val" style="color: #dc2626;">${outOfStockCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(99, 102, 241, 0.1); color: #6366f1;">💎</div>
        <div>
          <span class="kpi-title">Catalog Asset Value</span>
          <span class="kpi-val" style="font-size: 18.5px; color: #6366f1;">${formatPrice(totalInventoryValue)}</span>
        </div>
      </div>
    </div>

    <!-- 2. Category Pill Tabs -->
    <div class="category-pill-list">
      <button class="category-pill-tab ${cat === 'All' ? 'active' : ''}" data-cat="All">
        <span>All Categories</span>
        <span class="category-pill-badge">${rawProducts.length}</span>
      </button>
      ${(context.categories || []).map(c => {
        const count = rawProducts.filter(p => p.category === c.name).length;
        return `
          <button class="category-pill-tab ${cat === c.name ? 'active' : ''}" data-cat="${c.name}">
            <span>${c.name}</span>
            <span class="category-pill-badge">${count}</span>
          </button>
        `;
      }).join('')}
    </div>

    <!-- 3. Toolbar & Multi-Filters -->
    <div class="product-toolbar">
      <div class="filter-controls-group">
        <!-- Live Instant Search -->
        <div class="clean-search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="search" role="searchbox" aria-label="Search" id="product-search-input" name="q_search_no_credentials" placeholder="Search by name, SKU, brand, category..." value="${context.searchQuery || ''}" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false">
        </div>

        <!-- Stock Filter -->
        <select class="select-filter-btn" id="product-stock-select" title="Filter by stock">
          <option value="All" ${stockF === 'All' ? 'selected' : ''}>📦 All Stock Levels</option>
          <option value="In Stock" ${stockF === 'In Stock' ? 'selected' : ''}>✅ In Stock (> 5)</option>
          <option value="Low Stock" ${stockF === 'Low Stock' ? 'selected' : ''}>⚠️ Low Stock (1 - 5)</option>
          <option value="Out of Stock" ${stockF === 'Out of Stock' ? 'selected' : ''}>❌ Out of Stock (0)</option>
        </select>

        <!-- Brand Filter -->
        <select class="select-filter-btn" id="product-brand-select" title="Filter by brand">
          <option value="All" ${brandFilter === 'All' ? 'selected' : ''}>🏷️ All Brands</option>
          ${brandNames.map(b => `
            <option value="${b}" ${brandFilter === b ? 'selected' : ''}>${b}</option>
          `).join('')}
        </select>

        <!-- Sorting -->
        <select class="select-filter-btn" id="product-sort-select" title="Sort products">
          <option value="newest" ${sortBy === 'newest' ? 'selected' : ''}>⚡ Newest First</option>
          <option value="oldest" ${sortBy === 'oldest' ? 'selected' : ''}>⏳ Oldest First</option>
          <option value="price_high" ${sortBy === 'price_high' ? 'selected' : ''}>💰 Price: High to Low</option>
          <option value="price_low" ${sortBy === 'price_low' ? 'selected' : ''}>💵 Price: Low to High</option>
          <option value="stock_high" ${sortBy === 'stock_high' ? 'selected' : ''}>📦 Stock: High to Low</option>
          <option value="stock_low" ${sortBy === 'stock_low' ? 'selected' : ''}>⚠️ Stock: Low to High</option>
          <option value="name_asc" ${sortBy === 'name_asc' ? 'selected' : ''}>🔤 Name: A to Z</option>
        </select>
      </div>

      <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <button class="admin-btn admin-btn-danger" id="wipe-all-products-btn" style="display:flex; align-items:center; gap:6px; padding:10px 16px; font-weight:800; font-size:13px; background:#dc2626; border-radius:10px; cursor:pointer;" title="Permanently delete ALL products from database & Supabase cloud">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span>🔥 Wipe All Products (0 Items)</span>
        </button>

        <button class="select-filter-btn" id="export-products-csv-btn" style="background:#f8fafc; display:flex; align-items:center; gap:6px;">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Export CSV</span>
        </button>

        <button class="admin-btn admin-btn-primary" id="add-product-btn" style="display:flex; align-items:center; gap:8px; padding:10px 18px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Add New Product</span>
        </button>
      </div>
    </div>

    <!-- 4. Bulk Actions Bar -->
    ${selectedProductIds.size > 0 ? `
      <div class="bulk-action-bar">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-weight:800; font-size:13.5px;">✓ ${selectedProductIds.size} product${selectedProductIds.size > 1 ? 's' : ''} selected</span>
          <button class="bulk-btn" id="bulk-deselect-products-btn" style="background:transparent; border:none; text-decoration:underline; font-size:12px; cursor:pointer;">Clear</button>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button class="bulk-btn" id="bulk-activate-btn">✓ Mark Active</button>
          <button class="bulk-btn" id="bulk-draft-btn">⏳ Mark Draft</button>
          <button class="bulk-btn" id="bulk-restock-btn">📦 Restock (+10)</button>
          <button class="bulk-btn bulk-btn-danger" id="bulk-delete-products-btn">🗑️ Delete Selected</button>
        </div>
      </div>
    ` : ''}

    <!-- 5. Products Data Table -->
    <div class="product-table-container">
      <div class="table-wrapper">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0;">
              <th style="padding:12px 16px; width:36px; text-align:center;">
                <input type="checkbox" id="select-all-products-cb" ${allSelected ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
              </th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Product</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">SKU & Brand</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Category</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Price</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Quick Stock</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Status</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paginatedProducts.length === 0 ? `
              <tr>
                <td colspan="8" style="padding:48px 20px; text-align:center; color:#94a3b8;">
                  <div style="font-size:36px; margin-bottom:8px;">🔍</div>
                  <strong style="font-size:15px; color:#475569; display:block;">No products found</strong>
                  <span style="font-size:13px;">Try adjusting your search query or filter options.</span>
                </td>
              </tr>
            ` : paginatedProducts.map(p => {
              const isChecked = selectedProductIds.has(p.id);
              const isLowStock = p.stock !== undefined && p.stock <= (p.threshold || 5) && p.stock > 0;
              const isOutOfStock = p.stock === 0;
              const hasCompare = p.comparePrice && p.comparePrice > p.price;
              const discountPct = hasCompare ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0;

              return `
                <tr class="product-row-hover" style="border-bottom:1px solid #e2e8f0; transition:all 0.15s ease; ${isChecked ? 'background:#eff6ff;' : ''}">
                  <!-- Checkbox -->
                  <td style="padding:14px 16px; text-align:center;">
                    <input type="checkbox" class="product-select-cb" data-product-id="${p.id}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
                  </td>

                  <!-- Product Info -->
                  <td style="padding:14px 16px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                      <img src="${p.image || './assets/keyboard_1786712380801.jpg'}" alt="${p.name}" style="width:44px; height:44px; border-radius:10px; object-fit:cover; border:1px solid #e2e8f0; flex-shrink:0;">
                      <div style="display:flex; flex-direction:column; max-width:260px;">
                        <a href="#" class="edit-prod-title-link" data-product-id="${p.id}" style="font-size:13.5px; font-weight:800; color:#0f172a; text-decoration:none;">
                          ${p.name}
                        </a>
                        ${p.badge ? `<span style="font-size:10px; font-weight:800; text-transform:uppercase; color:#0052cc; background:#e0f2fe; padding:2px 6px; border-radius:4px; width:fit-content; margin-top:2px;">${p.badge}</span>` : ''}
                      </div>
                    </div>
                  </td>

                  <!-- SKU & Brand -->
                  <td style="padding:14px 16px;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                      <code style="font-size:12px; font-weight:800; color:#0052cc; background:rgba(0,82,204,0.06); padding:2px 6px; border-radius:4px; width:fit-content;">${p.sku || 'N/A'}</code>
                      <small style="color:#64748b; font-size:11px;">Brand: <strong>${p.brand || 'SWEETOS'}</strong></small>
                    </div>
                  </td>

                  <!-- Category -->
                  <td style="padding:14px 16px;">
                    <span style="display:inline-block; font-size:12px; font-weight:700; background:#f1f5f9; color:#334155; padding:3px 10px; border-radius:12px; border:1px solid #e2e8f0;">
                      ${p.category || 'General'}
                    </span>
                  </td>

                  <!-- Price -->
                  <td style="padding:14px 16px;">
                    <div style="display:flex; flex-direction:column;">
                      <strong style="color:#0f172a; font-size:14px; font-weight:850;">
                        ${formatPrice(p.price)}
                      </strong>
                      ${hasCompare ? `
                        <div style="display:flex; align-items:center; gap:4px;">
                          <small style="color:#94a3b8; text-decoration:line-through; font-size:11px;">${formatPrice(p.comparePrice)}</small>
                          <span style="color:#ef4444; font-size:10px; font-weight:800;">-${discountPct}%</span>
                        </div>
                      ` : ''}
                    </div>
                  </td>

                  <!-- Quick Stock Adjust Stepper -->
                  <td style="padding:14px 16px;">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                      <div class="stock-stepper-box">
                        <button class="stock-stepper-btn stock-decrement-btn" data-product-id="${p.id}" title="Decrease Stock">-</button>
                        <span class="stock-stepper-val" style="${isOutOfStock ? 'color:#dc2626;' : (isLowStock ? 'color:#d97706;' : '')}">${p.stock !== undefined ? p.stock : 10}</span>
                        <button class="stock-stepper-btn stock-increment-btn" data-product-id="${p.id}" title="Increase Stock">+</button>
                      </div>
                      ${isOutOfStock ? `
                        <small style="color:#dc2626; font-size:10.5px; font-weight:800;">Out of Stock</small>
                      ` : isLowStock ? `
                        <small style="color:#d97706; font-size:10.5px; font-weight:800;">⚠️ Low (${p.stock})</small>
                      ` : `
                        <small style="color:#16a34a; font-size:10.5px; font-weight:700;">In Stock</small>
                      `}
                    </div>
                  </td>

                  <!-- Status Toggle Pill -->
                  <td style="padding:14px 16px;">
                    <button class="status-toggle-pill ${p.status === 'Draft' ? 'draft' : 'active'} quick-status-toggle-btn" data-product-id="${p.id}" title="Click to toggle Active/Draft">
                      <span>${p.status === 'Draft' ? '⏳ Draft' : '✅ Active'}</span>
                    </button>
                  </td>

                  <!-- Actions -->
                  <td style="padding:14px 16px; text-align:right;">
                    <div style="display:inline-flex; align-items:center; gap:6px;">
                      <!-- WhatsApp Status Share -->
                      <button class="action-icon-btn whatsapp-share-prod-btn" data-product-id="${p.id}" title="Share Product to WhatsApp Status" style="background:#25d366; color:#ffffff; border-color:#25d366;">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                      </button>

                      <!-- Duplicate -->
                      <button class="action-icon-btn duplicate-prod-btn" data-product-id="${p.id}" title="Duplicate Product">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>

                      <!-- Edit -->
                      <button class="action-icon-btn edit-prod-action-btn" data-product-id="${p.id}" title="Edit Product">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                      </button>

                      <!-- Delete -->
                      <button class="action-icon-btn delete-btn delete-prod-action-btn" data-product-id="${p.id}" title="Delete Product">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- 6. Pagination Footer -->
      <div class="pagination-footer" style="padding:14px 20px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <span class="pagination-info" style="font-size:13px; color:#64748b; font-weight:600;">
          Showing <strong>${totalItems === 0 ? 0 : startIndex + 1}</strong> to <strong>${Math.min(startIndex + itemsPerPage, totalItems)}</strong> of <strong>${totalItems}</strong> products
        </span>
        <div class="pagination-buttons" style="display:flex; align-items:center; gap:8px;">
          <button class="pag-btn" id="prev-page-btn" ${currentPage <= 1 ? 'disabled' : ''} style="padding:6px 14px; border-radius:8px; border:1px solid #cbd5e1; background:#ffffff; font-size:12.5px; font-weight:700; cursor:pointer;">Previous</button>
          <span style="font-size:13px; font-weight:750; color:#334155; padding:0 6px;">${currentPage} / ${totalPages}</span>
          <button class="pag-btn" id="next-page-btn" ${currentPage >= totalPages ? 'disabled' : ''} style="padding:6px 14px; border-radius:8px; border:1px solid #cbd5e1; background:#ffffff; font-size:12.5px; font-weight:700; cursor:pointer;">Next</button>
        </div>
      </div>
    </div>

    <!-- 7. Advanced & Simple Product CRUD Modal Overlay -->
    <div class="modal-backdrop ${showModal ? 'show' : ''}" id="prod-crud-modal">
      <div class="modal-wrapper product-form-dark-wrapper glass-panel animate-in" style="max-width: 900px; width: 95%;">
        
        <!-- Modal Header -->
        <div class="modal-header-modern" style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:14px;">
            <button class="back-circle-btn" id="close-prod-modal-btn" title="Back to list">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <div>
              <h3 style="margin:0; font-size:18px; font-weight:850; color:#ffffff;">
                ${isEditing ? `Edit Product: ${context.editingProduct.name}` : 'Create New Product'}
              </h3>
              <p style="margin:2px 0 0 0; font-size:12.5px; color:#94a3b8;">Fill out catalog specifications and pricing</p>
            </div>
          </div>

          <!-- Quick status switcher in header -->
          <div class="status-button-toggle" style="margin:0;">
            <button type="button" class="status-toggle-option ${productStatus === 'Active' ? 'active' : ''}" id="status-active-btn" style="padding:6px 14px; font-size:12px;">Active</button>
            <button type="button" class="status-toggle-option ${productStatus === 'Draft' ? 'active' : ''}" id="status-draft-btn" style="padding:6px 14px; font-size:12px;">Draft</button>
          </div>
          <input type="hidden" id="prod-status-val" value="${productStatus}">
        </div>
        
        <!-- Modal Body -->
        <div class="modal-body-modern custom-scroll" style="max-height:76vh; overflow-y:auto; padding-right:6px;">
          <form id="prod-crud-form" class="product-modern-form" autocomplete="off">
            
            <!-- LEFT COLUMN: Core Details, Pricing, Inventory -->
            <div class="form-col-left">
              
              <!-- Product Title -->
              <div class="form-group-modern">
                <label>Product Title / Name *</label>
                <input type="text" id="prod-name" name="prod_name_no_autofill" required placeholder="e.g. Ergonomic Split Mechanical Keyboard" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none" value="${isEditing ? (context.editingProduct.name || '') : ''}">
              </div>

              <!-- Category & Brand -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group-modern">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <label>Category *</label>
                    <button type="button" id="quick-add-cat-btn" style="background:transparent; border:none; color:#38bdf8; font-size:11px; font-weight:750; cursor:pointer;">+ New</button>
                  </div>
                  <select id="prod-cat" required style="padding:12px 14px;">
                    <option value="" disabled ${!isEditing ? 'selected' : ''}>Select Category / Subcategory</option>
                    ${(() => {
                      const allCats = context.categories || [];
                      const parents = allCats.filter(c => !c.parent);
                      return parents.map(parent => {
                        const subs = allCats.filter(sc => sc.parent === parent.id || sc.parent === parent.name);
                        return `
                          <option value="${parent.name}" ${isEditing && context.editingProduct.category === parent.name ? 'selected' : ''} style="font-weight:800;">
                            ${parent.icon || '📁'} ${parent.name}
                          </option>
                          ${subs.map(sub => `
                            <option value="${sub.name}" ${isEditing && context.editingProduct.category === sub.name ? 'selected' : ''}>
                              &nbsp;&nbsp;&nbsp;&nbsp;↳ ${sub.icon || '🌿'} ${sub.name}
                            </option>
                          `).join('')}
                        `;
                      }).join('');
                    })()}
                  </select>
                </div>

                <div class="form-group-modern">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <label>Brand</label>
                    <button type="button" id="quick-add-brand-btn" style="background:transparent; border:none; color:#38bdf8; font-size:11px; font-weight:750; cursor:pointer;">+ New</button>
                  </div>
                  <select id="prod-brand" style="padding:12px 14px;">
                    <option value="SWEETOS" ${!isEditing || context.editingProduct.brand === 'SWEETOS' ? 'selected' : ''}>SWEETOS</option>
                    ${brandNames.filter(b => b !== 'SWEETOS').map(b => `
                      <option value="${b}" ${isEditing && context.editingProduct.brand === b ? 'selected' : ''}>${b}</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <!-- Pricing Section -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group-modern">
                  <label>Sale Price (CFA) *</label>
                  <div class="price-input-wrapper">
                    <input type="text" inputmode="numeric" id="prod-price" name="prod_price_no_autofill" required placeholder="e.g. 200000" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none" value="${isEditing ? (context.editingProduct.price || '') : ''}">
                  </div>
                </div>

                <div class="form-group-modern">
                  <label>Compare-At Price (Optional Original)</label>
                  <div class="price-input-wrapper">
                    <input type="text" inputmode="numeric" id="prod-compare-price" name="prod_compare_no_autofill" placeholder="Leave empty if no discount" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none" value="${isEditing && (context.editingProduct.comparePrice || context.editingProduct.originalPrice) ? (context.editingProduct.comparePrice || context.editingProduct.originalPrice) : ''}">
                  </div>
                </div>
              </div>

              <!-- Inventory & SKU Section -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group-modern">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <label>SKU Code</label>
                    <button type="button" id="auto-sku-btn" style="background:transparent; border:none; color:#38bdf8; font-size:11px; font-weight:750; cursor:pointer;">Auto ⚡</button>
                  </div>
                  <input type="text" id="prod-sku" name="prod_sku_no_autofill" placeholder="e.g. KB-SPLIT-920" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none" value="${isEditing ? (context.editingProduct.sku || '') : ''}">
                </div>

                <div class="form-group-modern">
                  <label>Initial Stock Quantity *</label>
                  <input type="number" id="prod-stock" name="prod_stock_no_autofill" required min="0" placeholder="e.g. 10" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none" value="${isEditing ? (context.editingProduct.stock !== undefined ? context.editingProduct.stock : 15) : 15}">
                </div>
              </div>

              <!-- Low Stock Warning Threshold & Cost Price -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group-modern">
                  <label>Low-Stock Alert Level</label>
                  <input type="number" id="prod-threshold" name="prod_threshold_no_autofill" min="1" placeholder="e.g. 5" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none" value="${isEditing ? (context.editingProduct.threshold || 5) : 5}">
                </div>

                <div class="form-group-modern">
                  <label>Cost Price (CFA)</label>
                  <input type="number" id="prod-cost-price" name="prod_cost_no_autofill" min="0" placeholder="e.g. 28000" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none" value="${isEditing && context.editingProduct.costPrice ? context.editingProduct.costPrice : ''}">
                </div>
              </div>

              <!-- Description with Auto-Generate Button -->
              <div class="form-group-modern">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <label style="margin:0;">Product Description</label>
                  <button type="button" id="auto-gen-desc-btn" style="background: linear-gradient(135deg, #0052cc 0%, #00b4d8 100%); color: white; border: none; border-radius: 8px; padding: 5px 12px; font-size: 11.5px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(0,82,204,0.3); transition: all 0.2s ease;" title="Auto-generate a 30-word description based on product name, category, and image">
                    <span>✨ Auto-Generate (30 Words)</span>
                  </button>
                </div>
                <textarea id="prod-desc" rows="4" placeholder="Highlight key features, or click ✨ Auto-Generate for a concise 30-word description...">${isEditing ? (context.editingProduct.description || '') : ''}</textarea>
              </div>

            </div>

            <!-- RIGHT COLUMN: Media, Gallery, Badges, Homepage Sections -->
            <div class="form-col-right">
              
              <!-- Primary Image -->
              <div class="form-group-modern">
                <label>Primary Cover Image</label>
                
                <!-- URL input fallback -->
                <div style="display:flex; gap:8px; margin-bottom:8px;">
                  <input type="text" id="prod-image-url-input" name="prod_img_url_no_autofill" placeholder="Or paste image URL (https://...)" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none" value="${isEditing ? (context.editingProduct.image || '') : ''}" style="padding:8px 12px; font-size:12px;">
                  <button type="button" id="apply-img-url-btn" class="admin-btn" style="background:rgba(255,255,255,0.1); color:white; padding:8px 14px; font-size:12px; white-space:nowrap;">Load</button>
                </div>

                <!-- Dropzone Box -->
                <div class="image-upload-dropzone" id="primary-image-dropzone" style="height:170px;">
                  <input type="file" id="primary-image-file-input" accept="image/*" style="display:none;">
                  
                  <div class="dropzone-empty-state" id="dropzone-empty" style="${isEditing && context.editingProduct.image ? 'display:none;' : ''}">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#64748b" stroke-width="2" style="width:24px; height:24px; margin-bottom:8px;">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <span class="upload-title">DROP FILE OR CLICK TO UPLOAD</span>
                    <span class="upload-formats">JPG · PNG · WEBP</span>
                  </div>
                  
                  <div class="dropzone-preview-state" id="dropzone-preview" style="${isEditing && context.editingProduct.image ? '' : 'display:none;'}">
                    <img id="primary-image-preview" src="${isEditing ? (context.editingProduct.image || '') : ''}" alt="Preview" style="max-height:140px; border-radius:8px; object-fit:contain;">
                    <button type="button" class="remove-preview-btn" id="remove-primary-image-btn" title="Remove image">&times;</button>
                  </div>
                </div>
                <input type="hidden" id="prod-image-url-val" value="${isEditing ? (context.editingProduct.image || '') : ''}">
              </div>

              <!-- Product Badge / Ribbon -->
              <div class="form-group-modern">
                <label>Promotional Ribbon / Badge Tag</label>
                <div style="display:flex; gap:8px;">
                  <input type="text" id="prod-badge" name="prod_badge_no_autofill" placeholder="e.g. NEW, 30% OFF, BESTSELLER" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none" value="${isEditing ? (context.editingProduct.badge || '') : ''}">
                  <select id="preset-badge-select" style="width:130px; font-size:12px;">
                    <option value="">Preset...</option>
                    <option value="NEW">NEW</option>
                    <option value="HOT">HOT</option>
                    <option value="BESTSELLER">BESTSELLER</option>
                    <option value="LIMITED">LIMITED</option>
                    <option value="20% OFF">20% OFF</option>
                  </select>
                </div>
              </div>

              <!-- Product Variants Toggle -->
              <div class="form-group-modern variant-toggle-card" style="padding:14px; background:#0c101b; border-radius:10px; border:1px solid rgba(255,255,255,0.08); margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                  <div>
                    <strong style="color:white; font-size:13px; display:block;">Enable Multiple Variants</strong>
                    <small style="color:#94a3b8; font-size:11.5px;">Allows buyers to select colors / switch styles</small>
                  </div>
                  <label class="switch-toggle" style="margin:0;">
                    <input type="checkbox" id="variants-toggle" ${(isEditing && (context.editingProduct.hasVariants || (context.editingProduct.colors && context.editingProduct.colors.length > 0))) ? 'checked' : ''}>
                    <span class="switch-slider"></span>
                  </label>
                </div>
              </div>

              <!-- Dynamic Colors & Variants Manager Section -->
              <div id="product-colors-manager-section" style="display: ${(isEditing && (context.editingProduct.hasVariants || (context.editingProduct.colors && context.editingProduct.colors.length > 0))) ? 'block' : 'none'}; background:#0c101b; border:1px solid rgba(0,82,204,0.35); border-radius:12px; padding:16px; margin-bottom:18px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                  <div>
                    <span style="color:white; font-size:13px; font-weight:750; display:flex; align-items:center; gap:6px;">
                      🎨 <span>Product Colors & Variants</span>
                      <span id="colors-count-badge" style="background:rgba(0,82,204,0.2); color:#38bdf8; font-size:11px; font-weight:800; padding:2px 8px; border-radius:6px;">0 Colors</span>
                    </span>
                    <small style="color:#94a3b8; font-size:11px; display:block; margin-top:2px;">Set the available color options, color codes, and extra price adjustments for this product.</small>
                  </div>
                  <button type="button" id="add-color-variant-btn" style="background:#0052cc; color:white; border:none; padding:7px 14px; border-radius:8px; font-size:12px; font-weight:750; cursor:pointer; display:flex; align-items:center; gap:5px; transition: all 0.2s;">
                    <span>+ Add Color</span>
                  </button>
                </div>

                <!-- Quick Color Presets -->
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; align-items:center; background:rgba(255,255,255,0.02); padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                  <span style="font-size:11px; color:#94a3b8; font-weight:700;">Quick Presets:</span>
                  <button type="button" class="quick-add-color-preset" data-name="Midnight Black" data-hex="#1C1B1A" style="background:#1e293b; color:#cbd5e1; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:3px 8px; font-size:11px; cursor:pointer;">+ Black</button>
                  <button type="button" class="quick-add-color-preset" data-name="Arctic White" data-hex="#FFFFFF" style="background:#1e293b; color:#cbd5e1; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:3px 8px; font-size:11px; cursor:pointer;">+ White</button>
                  <button type="button" class="quick-add-color-preset" data-name="Space Gray" data-hex="#4A4D52" style="background:#1e293b; color:#cbd5e1; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:3px 8px; font-size:11px; cursor:pointer;">+ Silver/Gray</button>
                  <button type="button" class="quick-add-color-preset" data-name="Cobalt Blue" data-hex="#0052CC" style="background:#1e293b; color:#cbd5e1; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:3px 8px; font-size:11px; cursor:pointer;">+ Blue</button>
                  <button type="button" class="quick-add-color-preset" data-name="Forest Green" data-hex="#15803D" style="background:#1e293b; color:#cbd5e1; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:3px 8px; font-size:11px; cursor:pointer;">+ Green</button>
                  <button type="button" class="quick-add-color-preset" data-name="Crimson Red" data-hex="#DC2626" style="background:#1e293b; color:#cbd5e1; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:3px 8px; font-size:11px; cursor:pointer;">+ Red</button>
                  <button type="button" class="quick-add-color-preset" data-name="Rose Gold" data-hex="#E0A9A5" style="background:#1e293b; color:#cbd5e1; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:3px 8px; font-size:11px; cursor:pointer;">+ Rose Gold</button>
                </div>

                <!-- Color List Container -->
                <div id="product-colors-list" style="display:flex; flex-direction:column; gap:8px; max-height:260px; overflow-y:auto; padding-right:4px;">
                  <!-- Dynamically Rendered -->
                </div>
              </div>

              <!-- Homepage Sections Placement -->
              <div class="form-group-modern">
                <label>Show in Homepage Curated Sections</label>
                <div class="sections-checkbox-grid" style="display:flex; flex-direction:column; gap:8px; background:#0c101b; padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); max-height:140px; overflow-y:auto;">
                  ${(() => {
                    const secs = JSON.parse(getStorageItem('SWEETOS_homepage_sections') || '[]');
                    const targetSecs = secs.filter(s => s.type !== 'categories');
                    if (targetSecs.length === 0) {
                      return `<small style="color:#64748b;">No dynamic sections configured.</small>`;
                    }
                    return targetSecs.map(sec => {
                      const isChecked = isEditing && context.editingProduct.homepageSections && context.editingProduct.homepageSections.includes(sec.id);
                      return `
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:#ffffff; font-size:13px; font-weight:600; margin:0;">
                          <input type="checkbox" class="product-section-checkbox" value="${sec.id}" ${isChecked ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer; accent-color:#0052cc; margin:0;">
                          <span>${sec.name}</span>
                        </label>
                      `;
                    }).join('');
                  })()}
                </div>
              </div>

              <div id="prod-error-msg" class="error-text" style="margin-top:10px;"></div>
              
              <!-- Submit & Permanent Delete Buttons -->
              ${isEditing ? `
                <div style="display:flex; gap:12px; margin-top:16px; align-items:center;">
                  <button type="submit" class="publish-submit-btn" id="publish-submit-btn" style="flex:1; padding:14px; font-size:14px; font-weight:800; margin:0;">
                    ✓ Save Changes
                  </button>
                  <button type="button" class="admin-btn admin-btn-danger modal-permanent-delete-btn" data-product-id="${context.editingProduct.id}" style="padding:14px 18px; font-size:13px; font-weight:800; background:#dc2626; border-radius:10px; display:flex; align-items:center; gap:6px; cursor:pointer; flex-shrink:0;" title="Permanently delete from database & cloud">
                    🔥 Delete Permanently
                  </button>
                </div>
              ` : `
                <button type="submit" class="publish-submit-btn" id="publish-submit-btn" style="margin-top:16px; width:100%; padding:14px; font-size:14px; font-weight:800;">
                  🚀 Publish Product to Store
                </button>
              `}
            </div>

          </form>
        </div>
      </div>
    </div>
  `;
}

export function attachAdminProductsListeners(context, shadow) {
  // 1. Search Input
  const searchInput = shadow.getElementById('product-search-input');
  if (searchInput) {
    if (context.isAutofilledCredential && context.isAutofilledCredential(searchInput.value)) {
      searchInput.value = '';
      context.searchQuery = '';
    }
    searchInput.addEventListener('focus', () => {
      if (context.isAutofilledCredential && context.isAutofilledCredential(searchInput.value)) {
        searchInput.value = '';
        context.searchQuery = '';
      }
    });

    searchInput.addEventListener('input', (e) => {
      let val = e.target.value;
      if (context.isAutofilledCredential && context.isAutofilledCredential(val)) {
        e.target.value = '';
        val = '';
      }
      context.searchQuery = val;
      context.currentPageIndex = 1;
      context.render();
      context.attachListeners();
      const sRef = shadow.getElementById('product-search-input');
      if (sRef) {
        sRef.focus();
        sRef.setSelectionRange(sRef.value.length, sRef.value.length);
      }
    });
  }

  // 2. Category Pill Tabs
  shadow.querySelectorAll('.category-pill-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      context.categoryFilter = tab.getAttribute('data-cat');
      context.currentPageIndex = 1;
      context.render();
      context.attachListeners();
    });
  });

  // 3. Stock Filter
  const stockSelect = shadow.getElementById('product-stock-select');
  if (stockSelect) {
    stockSelect.addEventListener('change', (e) => {
      context.stockFilter = e.target.value;
      context.currentPageIndex = 1;
      context.render();
      context.attachListeners();
    });
  }

  // 4. Brand Filter
  const brandSelect = shadow.getElementById('product-brand-select');
  if (brandSelect) {
    brandSelect.addEventListener('change', (e) => {
      brandFilter = e.target.value;
      context.currentPageIndex = 1;
      context.render();
      context.attachListeners();
    });
  }

  // 5. Sort Filter
  const sortSelect = shadow.getElementById('product-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      context.render();
      context.attachListeners();
    });
  }

  // 6. Pagination
  const prevBtn = shadow.getElementById('prev-page-btn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (context.currentPageIndex > 1) {
        context.currentPageIndex--;
        context.render();
        context.attachListeners();
      }
    });
  }

  const nextBtn = shadow.getElementById('next-page-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      context.currentPageIndex = (context.currentPageIndex || 1) + 1;
      context.render();
      context.attachListeners();
    });
  }

  // 7. Checkbox Selection & Bulk Actions
  const selectAllCb = shadow.getElementById('select-all-products-cb');
  if (selectAllCb) {
    selectAllCb.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      shadow.querySelectorAll('.product-select-cb').forEach(cb => {
        const id = parseInt(cb.getAttribute('data-product-id'));
        if (isChecked) selectedProductIds.add(id);
        else selectedProductIds.delete(id);
      });
      context.render();
      context.attachListeners();
    });
  }

  shadow.querySelectorAll('.product-select-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = parseInt(cb.getAttribute('data-product-id'));
      if (e.target.checked) selectedProductIds.add(id);
      else selectedProductIds.delete(id);
      context.render();
      context.attachListeners();
    });
  });

  const deselectBtn = shadow.getElementById('bulk-deselect-products-btn');
  if (deselectBtn) {
    deselectBtn.addEventListener('click', () => {
      selectedProductIds.clear();
      context.render();
      context.attachListeners();
    });
  }

  // Bulk Handlers
  const bulkActivate = shadow.getElementById('bulk-activate-btn');
  if (bulkActivate) {
    bulkActivate.addEventListener('click', () => {
      selectedProductIds.forEach(id => {
        const p = context.products.find(prod => prod.id === id);
        if (p) p.status = 'Active';
      });
      context.saveDatabase('products');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Marked ${selectedProductIds.size} products as Active.` }));
      selectedProductIds.clear();
      context.render();
      context.attachListeners();
    });
  }

  const bulkDraft = shadow.getElementById('bulk-draft-btn');
  if (bulkDraft) {
    bulkDraft.addEventListener('click', () => {
      selectedProductIds.forEach(id => {
        const p = context.products.find(prod => prod.id === id);
        if (p) p.status = 'Draft';
      });
      context.saveDatabase('products');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Marked ${selectedProductIds.size} products as Draft.` }));
      selectedProductIds.clear();
      context.render();
      context.attachListeners();
    });
  }

  const bulkRestock = shadow.getElementById('bulk-restock-btn');
  if (bulkRestock) {
    bulkRestock.addEventListener('click', () => {
      selectedProductIds.forEach(id => {
        const p = context.products.find(prod => prod.id === id);
        if (p) p.stock = (p.stock || 0) + 10;
      });
      context.saveDatabase('products');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Added +10 stock units to ${selectedProductIds.size} products.` }));
      selectedProductIds.clear();
      context.render();
      context.attachListeners();
    });
  }

  // Wipe All Products in 1 Click
  const wipeAllBtn = shadow.getElementById('wipe-all-products-btn');
  if (wipeAllBtn) {
    wipeAllBtn.addEventListener('click', async () => {
      const total = (context.products || []).length;
      const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
        title: '🔥 Permanent Wipe All Products (0 Items)',
        message: `Are you sure you want to PERMANENTLY ERASE ALL ${total} PRODUCTS?\n\nThis will immediately delete every product from Localhost and the Supabase Cloud Database. Your store will have 0 products and be 100% clean for your real catalog. This action cannot be undone.`,
        confirmText: '🔥 Yes, Wipe All to 0 Forever',
        cancelText: 'Cancel',
        type: 'danger',
        icon: '🗑️'
      }) : Promise.resolve(confirm(`Are you sure you want to permanently delete all ${total} products forever?`)));

      if (confirmed) {
        // 1. Purge Supabase cloud database table
        import('../../utils/supabase.js').then(async ({ supabase }) => {
          if (supabase) {
            await supabase.from('products').delete().neq('name', '___NON_EXISTENT___');
          }
        }).catch(() => {});

        // 2. Clear local store and server cache
        context.products = [];
        selectedProductIds.clear();
        context.saveDatabase('products');

        // 3. Clear curated sections
        try {
          const secs = JSON.parse(getStorageItem('SWEETOS_homepage_sections') || '[]');
          secs.forEach(s => { s.productIds = []; });
          saveStorageItem('SWEETOS_homepage_sections', JSON.stringify(secs));
        } catch(e) {}

        window.dispatchEvent(new CustomEvent('toast:show', { detail: '🔥 All products permanently wiped from store and cloud! (0 Items)' }));
        context.render();
        context.attachListeners();
      }
    });
  }

  const bulkDelete = shadow.getElementById('bulk-delete-products-btn');
  if (bulkDelete) {
    bulkDelete.addEventListener('click', async () => {
      const count = selectedProductIds.size;
      if (!count) return;
      const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
        title: '🔥 Permanent Delete (Irreversible)',
        message: `Are you sure you want to PERMANENTLY DELETE ${count} selected products?\n\nThey will be immediately purged from your local storage, server, and Supabase cloud database. They will NEVER exist or return again.`,
        confirmText: `🔥 Delete ${count} Forever`,
        cancelText: 'Cancel',
        type: 'danger',
        icon: '🗑️'
      }) : Promise.resolve(confirm(`Are you sure you want to permanently delete ${count} selected products forever?`)));

      if (confirmed) {
        const idsArray = Array.from(selectedProductIds);
        // 1. Permanently delete from Supabase cloud
        deleteMultipleProductsPermanentlyFromSupabase(idsArray);

        // 2. Remove from local store and sync
        context.products = context.products.filter(p => !selectedProductIds.has(p.id));
        context.saveDatabase('products');
        
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `🔥 ${count} products permanently deleted forever.` }));
        selectedProductIds.clear();
        context.render();
        context.attachListeners();
      }
    });
  }

  // Helper for permanent single product deletion
  const executePermanentDelete = async (prod) => {
    if (!prod) return;
    const hasActiveOrders = (context.orders || []).some(o => 
      ['Pending', 'En cours', 'Confirmé', 'Processing', 'Shipping'].includes(o.status) && 
      o.products && o.products.some(item => item.id === prod.id)
    );
    if (hasActiveOrders) {
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Cannot delete "${prod.name}" because it is part of active orders!` }));
      return;
    }
    const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
      title: '🔥 Permanent Delete (Irreversible)',
      message: `Are you sure you want to PERMANENTLY DELETE "${prod.name}"?\n\nThis product will be instantly wiped from your local storage, server, and Supabase cloud database. It will NEVER exist or return again.`,
      confirmText: '🔥 Delete Forever',
      cancelText: 'Cancel',
      type: 'danger',
      icon: '🗑️'
    }) : Promise.resolve(confirm(`Are you sure you want to permanently delete "${prod.name}" forever?`)));

    if (confirmed) {
      // 1. Delete from Supabase cloud
      deleteProductPermanentlyFromSupabase(prod);

      // 2. Delete from local state & storage
      context.products = context.products.filter(p => p.id !== prod.id);
      context.showProductModal = false;
      context.editingProduct = null;
      context.saveDatabase('products');

      // 3. Clean up from curated homepage sections
      try {
        const secs = JSON.parse(getStorageItem('SWEETOS_homepage_sections') || '[]');
        let secMod = false;
        secs.forEach(s => {
          if (s.productIds && s.productIds.includes(prod.id)) {
            s.productIds = s.productIds.filter(id => id !== prod.id);
            secMod = true;
          }
        });
        if (secMod) saveStorageItem('SWEETOS_homepage_sections', JSON.stringify(secs));
      } catch(e) {}

      window.dispatchEvent(new CustomEvent('toast:show', { detail: `🔥 "${prod.name}" permanently deleted forever.` }));
      context.render();
      context.attachListeners();
    }
  };

  // 8. Inline Stock Stepper Adjusters
  shadow.querySelectorAll('.stock-increment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-product-id'));
      const p = context.products.find(prod => prod.id === id);
      if (p) {
        p.stock = (p.stock || 0) + 1;
        context.saveDatabase('products');
        context.render();
        context.attachListeners();
      }
    });
  });

  shadow.querySelectorAll('.stock-decrement-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-product-id'));
      const p = context.products.find(prod => prod.id === id);
      if (p && (p.stock || 0) > 0) {
        p.stock = p.stock - 1;
        context.saveDatabase('products');
        context.render();
        context.attachListeners();
      }
    });
  });

  // 9. Quick Status Toggle Button
  shadow.querySelectorAll('.quick-status-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-product-id'));
      const p = context.products.find(prod => prod.id === id);
      if (p) {
        p.status = p.status === 'Draft' ? 'Active' : 'Draft';
        context.saveDatabase('products');
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Product "${p.name}" is now ${p.status}.` }));
        context.render();
        context.attachListeners();
      }
    });
  });

  // 10. Duplicate Product
  shadow.querySelectorAll('.duplicate-prod-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-product-id'));
      const orig = context.products.find(prod => prod.id === id);
      if (orig) {
        const newId = context.products.length > 0 ? (Math.max(...context.products.map(p => p.id)) + 1) : 1;
        const copy = {
          ...orig,
          id: newId,
          name: `${orig.name} (Copy)`,
          sku: `${orig.sku || 'PROD'}-COPY`,
          stock: orig.stock || 10
        };
        context.products.unshift(copy);
        context.saveDatabase('products');
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Duplicated "${orig.name}" successfully!` }));
        context.render();
        context.attachListeners();
      }
    });
  });

  // WhatsApp Status Share button listener (Table rows & Modal)
  shadow.querySelectorAll('.whatsapp-share-prod-btn, .modal-whatsapp-share-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = parseInt(btn.getAttribute('data-product-id'));
      const prod = context.products.find(p => p.id === id);
      if (prod) {
        shareProductToWhatsAppStatus(prod);
      }
    });
  });

  // 11. Export to CSV
  const exportBtn = shadow.getElementById('export-products-csv-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportProductsToCSV(context.products);
    });
  }

  // 12. Add Product Modal Triggers
  const addBtn = shadow.getElementById('add-product-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      context.editingProduct = null;
      context.productStatus = 'Active';
      context.showProductModal = true;
      context.render();
      context.attachListeners();
    });
  }

  // Edit triggers
  shadow.querySelectorAll('.edit-prod-action-btn, .edit-prod-title-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = parseInt(btn.getAttribute('data-product-id'));
      const prod = context.products.find(p => p.id === id);
      if (prod) {
        context.editingProduct = prod;
        context.productStatus = prod.status || 'Active';
        context.showProductModal = true;
        context.render();
        context.attachListeners();
      }
    });
  });

  // Close Modal
  const closeBtn = shadow.getElementById('close-prod-modal-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      context.showProductModal = false;
      context.editingProduct = null;
      context.render();
      context.attachListeners();
    });
  }

  // Permanent Delete Product (Table row button)
  shadow.querySelectorAll('.delete-prod-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-product-id'));
      const prod = context.products.find(p => p.id === id);
      if (prod) {
        executePermanentDelete(prod);
      }
    });
  });

  // Permanent Delete Product (Modal action button)
  shadow.querySelectorAll('.modal-permanent-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-product-id'));
      const prod = context.products.find(p => p.id === id);
      if (prod) {
        executePermanentDelete(prod);
      }
    });
  });

  // Auto SKU button
  const autoSkuBtn = shadow.getElementById('auto-sku-btn');
  if (autoSkuBtn) {
    autoSkuBtn.addEventListener('click', () => {
      const nameInput = shadow.getElementById('prod-name');
      const catInput = shadow.getElementById('prod-cat');
      const skuInput = shadow.getElementById('prod-sku');

      const nameVal = (nameInput ? nameInput.value : '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'ITEM';
      const catVal = (catInput && catInput.value ? catInput.value.slice(0, 2).toUpperCase() : 'SW');
      const rand = Math.floor(100 + Math.random() * 900);
      skuInput.value = `${catVal}-${nameVal}-${rand}`;
    });
  }

  // Preset badge select
  const presetBadge = shadow.getElementById('preset-badge-select');
  const badgeInput = shadow.getElementById('prod-badge');
  if (presetBadge && badgeInput) {
    presetBadge.addEventListener('change', () => {
      if (presetBadge.value) {
        badgeInput.value = presetBadge.value;
      }
    });
  }

  // Quick Add Category prompt
  const quickAddCat = shadow.getElementById('quick-add-cat-btn');
  if (quickAddCat) {
    quickAddCat.addEventListener('click', async () => {
      const newCat = await showPromptModal({
        title: 'New Category',
        message: 'Enter name of new category:',
        placeholder: 'e.g. Mechanical Keyboards, Studio Audio...',
        confirmText: '+ Create Category',
        icon: '📁'
      });
      if (newCat && newCat.trim()) {
        const catName = newCat.trim();
        if (!context.categories.some(c => c.name.toLowerCase() === catName.toLowerCase())) {
          context.categories.push({ id: Date.now(), name: catName, count: 0 });
          context.saveDatabase('categories');
          const catSelect = shadow.getElementById('prod-cat');
          if (catSelect) {
            const opt = document.createElement('option');
            opt.value = catName;
            opt.textContent = catName;
            opt.selected = true;
            catSelect.appendChild(opt);
          }
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Category "${catName}" added!` }));
        }
      }
    });
  }

  // Quick Add Brand prompt
  const quickAddBrand = shadow.getElementById('quick-add-brand-btn');
  if (quickAddBrand) {
    quickAddBrand.addEventListener('click', async () => {
      const newBrand = await showPromptModal({
        title: 'New Brand',
        message: 'Enter name of new brand:',
        placeholder: 'e.g. Keychron, Logitech, Sony, Apple...',
        confirmText: '+ Create Brand',
        icon: '🏷️'
      });
      if (newBrand && newBrand.trim()) {
        const bName = newBrand.trim();
        const brandSelect = shadow.getElementById('prod-brand');
        if (brandSelect) {
          const opt = document.createElement('option');
          opt.value = bName;
          opt.textContent = bName;
          opt.selected = true;
          brandSelect.appendChild(opt);
        }
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Brand "${bName}" added!` }));
      }
    });
  }

  // Image Upload Dropzone & URL Loader
  const dropzone = shadow.getElementById('primary-image-dropzone');
  const fileInput = shadow.getElementById('primary-image-file-input');
  const removeImgBtn = shadow.getElementById('remove-primary-image-btn');
  const imgUrlVal = shadow.getElementById('prod-image-url-val');
  const imgUrlInput = shadow.getElementById('prod-image-url-input');
  const applyImgUrlBtn = shadow.getElementById('apply-img-url-btn');
  const dropzoneEmpty = shadow.getElementById('dropzone-empty');
  const dropzonePreview = shadow.getElementById('dropzone-preview');
  const previewImg = shadow.getElementById('primary-image-preview');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', (e) => {
      if (e.target.closest('#remove-primary-image-btn')) return;
      fileInput.click();
    });

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (file) {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Uploading file to Supabase Cloud Storage...' }));
        try {
          const { uploadFileToSupabaseStorage } = await import('../../utils/supabase.js');
          const cloudUrl = await uploadFileToSupabaseStorage(file);
          const finalUrl = cloudUrl || await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
          });

          imgUrlVal.value = finalUrl;
          previewImg.src = finalUrl;
          if (imgUrlInput) imgUrlInput.value = finalUrl;
          dropzoneEmpty.style.display = 'none';
          dropzonePreview.style.display = 'block';
          window.dispatchEvent(new CustomEvent('toast:show', { detail: cloudUrl ? 'File saved to Supabase Cloud Storage! ☁️' : 'Image loaded!' }));
        } catch(err) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target.result;
            imgUrlVal.value = dataUrl;
            previewImg.src = dataUrl;
            if (imgUrlInput) imgUrlInput.value = '';
            dropzoneEmpty.style.display = 'none';
            dropzonePreview.style.display = 'block';
          };
          reader.readAsDataURL(file);
        }
      }
    });
  }

  if (applyImgUrlBtn && imgUrlInput) {
    applyImgUrlBtn.addEventListener('click', () => {
      const url = imgUrlInput.value.trim();
      if (url) {
        imgUrlVal.value = url;
        previewImg.src = url;
        dropzoneEmpty.style.display = 'none';
        dropzonePreview.style.display = 'block';
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Image loaded from URL!' }));
      }
    });
  }

  if (removeImgBtn) {
    removeImgBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (fileInput) fileInput.value = '';
      if (imgUrlInput) imgUrlInput.value = '';
      imgUrlVal.value = '';
      previewImg.src = '';
      dropzoneEmpty.style.display = 'flex';
      dropzonePreview.style.display = 'none';
    });
  }

  // Active / Draft Status Toggle in Modal
  const activeBtn = shadow.getElementById('status-active-btn');
  const draftBtn = shadow.getElementById('status-draft-btn');
  const statusVal = shadow.getElementById('prod-status-val');

  if (activeBtn && draftBtn) {
    activeBtn.addEventListener('click', () => {
      context.productStatus = 'Active';
      statusVal.value = 'Active';
      activeBtn.classList.add('active');
      draftBtn.classList.remove('active');
    });

    draftBtn.addEventListener('click', () => {
      context.productStatus = 'Draft';
      statusVal.value = 'Draft';
      draftBtn.classList.add('active');
      activeBtn.classList.remove('active');
    });
  }

  // Variants toggle & Color Manager logic
  const variantsToggle = shadow.getElementById('variants-toggle');
  const colorsSection = shadow.getElementById('product-colors-manager-section');
  const colorsList = shadow.getElementById('product-colors-list');
  const addColorBtn = shadow.getElementById('add-color-variant-btn');
  const colorsCountBadge = shadow.getElementById('colors-count-badge');

  let currentVariants = [];
  if (context.editingProduct && Array.isArray(context.editingProduct.colors) && context.editingProduct.colors.length > 0) {
    currentVariants = JSON.parse(JSON.stringify(context.editingProduct.colors));
  } else if (context.editingProduct && context.editingProduct.hasVariants) {
    currentVariants = [
      { name: 'Standard Black', hex: '#1C1B1A', priceAdjust: 0 }
    ];
  }

  const renderColorRows = () => {
    if (!colorsList) return;
    if (colorsCountBadge) {
      colorsCountBadge.textContent = `${currentVariants.length} Color${currentVariants.length === 1 ? '' : 's'}`;
    }
    if (currentVariants.length === 0) {
      colorsList.innerHTML = `
        <div style="text-align:center; padding:16px; color:#64748b; font-size:12px; border:1px dashed rgba(255,255,255,0.1); border-radius:8px;">
          No colors configured yet. Click <strong>+ Add Color</strong> or choose a preset above.
        </div>
      `;
      return;
    }

    colorsList.innerHTML = currentVariants.map((c, index) => {
      const hex = c.hex || '#0052cc';
      const name = c.name || '';
      const priceAdj = c.priceAdjust || 0;
      return `
        <div class="color-variant-row" data-index="${index}" style="display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px 10px;">
          <input type="color" class="variant-color-picker" data-index="${index}" value="${hex}" style="width:32px; height:32px; border-radius:6px; border:1px solid rgba(255,255,255,0.2); cursor:pointer; background:none; padding:0; flex-shrink:0;">
          
          <div style="flex:2; min-width:120px;">
            <input type="text" class="variant-color-name" name="variant_color_name_no_autofill" data-index="${index}" placeholder="Color Name (e.g. Midnight Black)" value="${name}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none" style="width:100%; background:#141b2d; border:1px solid rgba(255,255,255,0.1); color:white; padding:6px 8px; border-radius:6px; font-size:12px;">
          </div>

          <div style="flex:1; min-width:95px;">
            <input type="number" class="variant-price-adjust" name="variant_price_adjust_no_autofill" data-index="${index}" placeholder="± Extra FCFA" value="${priceAdj}" title="Extra Price (FCFA)" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none" style="width:100%; background:#141b2d; border:1px solid rgba(255,255,255,0.1); color:white; padding:6px 8px; border-radius:6px; font-size:12px;">
          </div>

          <button type="button" class="delete-color-variant-btn" data-index="${index}" style="background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); border-radius:6px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; flex-shrink:0;" title="Remove Color">✕</button>
        </div>
      `;
    }).join('');

    // Attach row events
    colorsList.querySelectorAll('.variant-color-picker').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        if (currentVariants[idx]) currentVariants[idx].hex = e.target.value;
      });
    });

    colorsList.querySelectorAll('.variant-color-name').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        if (currentVariants[idx]) currentVariants[idx].name = e.target.value;
      });
    });

    colorsList.querySelectorAll('.variant-price-adjust').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        if (currentVariants[idx]) currentVariants[idx].priceAdjust = parseFloat(e.target.value) || 0;
      });
    });

    colorsList.querySelectorAll('.delete-color-variant-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-index'));
        currentVariants.splice(idx, 1);
        renderColorRows();
      });
    });
  };

  if (variantsToggle && colorsSection) {
    variantsToggle.addEventListener('change', () => {
      if (variantsToggle.checked) {
        colorsSection.style.display = 'block';
        if (currentVariants.length === 0) {
          currentVariants.push({ name: 'Standard Edition', hex: '#1C1B1A', priceAdjust: 0 });
        }
        renderColorRows();
      } else {
        colorsSection.style.display = 'none';
      }
    });
  }

  if (addColorBtn) {
    addColorBtn.addEventListener('click', () => {
      currentVariants.push({ name: `Color Variant ${currentVariants.length + 1}`, hex: '#0052CC', priceAdjust: 0 });
      renderColorRows();
    });
  }

  shadow.querySelectorAll('.quick-add-color-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const pName = btn.getAttribute('data-name');
      const pHex = btn.getAttribute('data-hex');
      currentVariants.push({ name: pName, hex: pHex, priceAdjust: 0 });
      renderColorRows();
    });
  });

  if (variantsToggle && variantsToggle.checked) {
    renderColorRows();
  }

  // Auto-Generate 30-Word Description Button Listener
  const autoGenBtn = shadow.getElementById('auto-gen-desc-btn');
  if (autoGenBtn) {
    autoGenBtn.addEventListener('click', () => {
      const prodName = (shadow.getElementById('prod-name')?.value || '').trim();
      const prodCat = shadow.getElementById('prod-cat')?.value || '';
      const prodBrand = shadow.getElementById('prod-brand')?.value || '';
      const prodPrice = shadow.getElementById('prod-price')?.value || '';
      const imgInput = shadow.getElementById('prod-image-url-input')?.value || shadow.getElementById('prod-img-val')?.value || '';

      if (!prodName) {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: '⚠️ Please type a product name first to auto-generate a description.' }));
        const nameEl = shadow.getElementById('prod-name');
        if (nameEl) nameEl.focus();
        return;
      }

      autoGenBtn.disabled = true;
      autoGenBtn.innerHTML = `<span>⏳ Generating...</span>`;

      setTimeout(() => {
        const desc = generateShortProductDescription({
          name: prodName,
          category: prodCat,
          brand: prodBrand,
          price: prodPrice,
          image: imgInput
        });

        const descTextarea = shadow.getElementById('prod-desc');
        if (descTextarea) {
          descTextarea.value = desc;
          descTextarea.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
          descTextarea.style.borderColor = '#0052cc';
          descTextarea.style.boxShadow = '0 0 0 4px rgba(0, 82, 204, 0.25)';
          setTimeout(() => {
            descTextarea.style.borderColor = '';
            descTextarea.style.boxShadow = '';
          }, 1500);
        }

        autoGenBtn.disabled = false;
        autoGenBtn.innerHTML = `<span>✨ Auto-Generate (30 Words)</span>`;
        window.dispatchEvent(new CustomEvent('toast:show', { detail: '✨ Auto-generated 30-word description!' }));
      }, 300);
    });
  }

  // Modal Submit Action
  const form = shadow.getElementById('prod-crud-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = shadow.getElementById('prod-name').value.trim();

      const parsePriceInput = (val) => {
        if (!val) return NaN;
        let str = String(val).trim().replace(/\s+/g, '').replace(/,/g, '');
        if (/^\d+\.\d{3}$/.test(str)) {
          str = str.replace('.', '');
        }
        return parseFloat(str);
      };

      const price = parsePriceInput(shadow.getElementById('prod-price').value);
      const rawCompare = shadow.getElementById('prod-compare-price').value;
      const comparePrice = rawCompare ? (parsePriceInput(rawCompare) || 0) : 0;
      const category = shadow.getElementById('prod-cat').value;
      const brand = shadow.getElementById('prod-brand').value || 'SWEETOS';
      const stock = parseInt(shadow.getElementById('prod-stock').value) || 0;
      const sku = shadow.getElementById('prod-sku').value.trim();
      const threshold = parseInt(shadow.getElementById('prod-threshold').value) || 5;
      const costPrice = parseFloat(shadow.getElementById('prod-cost-price').value) || null;
      const description = shadow.getElementById('prod-desc').value.trim();
      const badge = shadow.getElementById('prod-badge').value.trim();
      const status = statusVal.value || 'Active';
      const imageUrl = imgUrlVal.value || './assets/keyboard_1786712380801.jpg';
      const hasVariants = shadow.getElementById('variants-toggle').checked;
      const checkedSections = Array.from(shadow.querySelectorAll('.product-section-checkbox:checked')).map(cb => cb.value);
      
      const finalColors = hasVariants ? currentVariants.filter(c => c && c.name && c.name.trim() !== '') : [];

      const errorMsg = shadow.getElementById('prod-error-msg');
      errorMsg.textContent = '';

      if (!name || isNaN(price) || !category) {
        errorMsg.textContent = 'Please fill out all required fields marked with *';
        return;
      }

      if (context.editingProduct) {
        // Edit mode saving
        const pId = context.editingProduct.id;
        const index = context.products.findIndex(p => p.id === pId);
        if (index > -1) {
          context.products[index] = {
            ...context.products[index],
            name,
            sku: sku || context.products[index].sku,
            price,
            comparePrice,
            originalPrice: comparePrice,
            category,
            brand,
            stock,
            threshold,
            costPrice,
            description,
            badge: badge || null,
            status,
            image: imageUrl,
            hasVariants: hasVariants && finalColors.length > 0,
            colors: finalColors,
            homepageSections: checkedSections
          };
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Product "${name}" updated successfully!` }));
        }
      } else {
        // Create new product
        const finalSku = sku || `${category.slice(0,2).toUpperCase()}-${name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        const newId = context.products.length > 0 ? (Math.max(...context.products.map(p => p.id)) + 1) : 1;
        
        context.products.unshift({
          id: newId,
          sku: finalSku,
          name,
          price,
          comparePrice,
          originalPrice: comparePrice,
          category,
          brand,
          stock,
          threshold,
          costPrice,
          description,
          badge: badge || null,
          status,
          image: imageUrl,
          hasVariants: hasVariants && finalColors.length > 0,
          colors: finalColors,
          homepageSections: checkedSections,
          rating: 5.0,
          reviews: 0
        });
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `New product "${name}" added to store!` }));
      }

      context.saveDatabase('products');
      context.showProductModal = false;
      context.editingProduct = null;
      context.render();
      context.attachListeners();
    });
  }
}

// Export to CSV
function exportProductsToCSV(products) {
  if (!products || products.length === 0) {
    window.dispatchEvent(new CustomEvent('toast:show', { detail: 'No products to export.' }));
    return;
  }

  const headers = ['ID', 'Product Name', 'SKU', 'Category', 'Brand', 'Price (CFA)', 'Compare Price', 'Stock', 'Threshold', 'Cost Price', 'Status', 'Badge'];
  const rows = products.map(p => [
    p.id,
    `"${(p.name || '').replace(/"/g, '""')}"`,
    `"${p.sku || ''}"`,
    `"${p.category || ''}"`,
    `"${p.brand || 'SWEETOS'}"`,
    p.price || 0,
    p.comparePrice || '',
    p.stock !== undefined ? p.stock : 0,
    p.threshold || 5,
    p.costPrice || '',
    `"${p.status || 'Active'}"`,
    `"${p.badge || ''}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SWEETOS_Products_Catalog_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
