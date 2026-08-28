import { formatPrice } from '../../utils/storage.js';
import { awardMysteryBoxForDeliveredOrder } from '../../utils/todaysDeals.js';

// Global internal state helpers for filters & selection
let selectedOrderIds = new Set();
let dateFilter = 'all';
let paymentFilter = 'all';
let sortBy = 'newest';

export function renderAdminOrders(context) {
  if (context.selectedOrderId) {
    return renderAdminOrderDetails(context);
  }

  // Ensure default orders array
  const rawOrders = context.orders || [];

  // 1. Filter out deleted unless filter is specifically 'Deleted'
  let list = [...rawOrders];
  if (context.statusFilter !== 'Deleted') {
    list = list.filter(o => (o.status || '').toLowerCase() !== 'deleted');
  } else {
    list = list.filter(o => (o.status || '').toLowerCase() === 'deleted');
  }

  // 2. Search query filter
  if (context.searchQuery) {
    const q = context.searchQuery.toLowerCase().trim();
    list = list.filter(o => 
      (o.id && o.id.toLowerCase().includes(q)) || 
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.customerEmail && o.customerEmail.toLowerCase().includes(q)) ||
      (o.customerPhone && o.customerPhone.toLowerCase().includes(q)) ||
      (o.items && o.items.toLowerCase().includes(q)) ||
      (o.products && o.products.some(p => p.name && p.name.toLowerCase().includes(q)))
    );
  }

  // 3. Status tab filter
  if (context.statusFilter && context.statusFilter !== 'All' && context.statusFilter !== 'Deleted') {
    list = list.filter(o => {
      const s = (o.status || '').toLowerCase();
      const target = context.statusFilter.toLowerCase();
      if (target === 'placed' || target === 'pending') return s === 'placed' || s === 'pending';
      if (target === 'confirm' || target === 'confirmed') return s === 'confirm' || s === 'confirmé' || s === 'confirmed';
      if (target === 'processing') return s === 'processing' || s === 'en cours';
      if (target === 'shipping' || target === 'shipped') return s === 'shipping' || s === 'shipped';
      if (target === 'done' || target === 'delivered') return s === 'done' || s === 'livré' || s === 'delivered';
      if (target === 'cancelled') return s === 'cancelled' || s === 'annulé';
      return s === target;
    });
  }

  // 4. Date filter
  if (dateFilter !== 'all') {
    const now = new Date();
    list = list.filter(o => {
      if (!o.date) return true;
      const orderDate = new Date(o.date);
      if (isNaN(orderDate.getTime())) return true;
      
      const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);
      if (dateFilter === 'today') return diffDays <= 1;
      if (dateFilter === 'week') return diffDays <= 7;
      if (dateFilter === 'month') return diffDays <= 30;
      return true;
    });
  }

  // 5. Payment method filter
  if (paymentFilter !== 'all') {
    list = list.filter(o => {
      const p = (o.paymentMethod || 'cod').toLowerCase();
      if (paymentFilter === 'cod') return p.includes('cod') || p.includes('livraison') || p.includes('cash');
      if (paymentFilter === 'momo') return p.includes('momo') || p.includes('wave') || p.includes('orange') || p.includes('mtn');
      if (paymentFilter === 'card') return p.includes('card') || p.includes('carte') || p.includes('stripe');
      return true;
    });
  }

  // 6. Sorting
  list.sort((a, b) => {
    if (sortBy === 'newest') {
      return (new Date(b.date || 0)) - (new Date(a.date || 0));
    }
    if (sortBy === 'oldest') {
      return (new Date(a.date || 0)) - (new Date(b.date || 0));
    }
    if (sortBy === 'amount_high') {
      return (parseFloat(b.total) || 0) - (parseFloat(a.total) || 0);
    }
    if (sortBy === 'amount_low') {
      return (parseFloat(a.total) || 0) - (parseFloat(b.total) || 0);
    }
    return 0;
  });

  // Calculate Metrics
  const totalCount = rawOrders.length;
  const totalRevenue = rawOrders
    .filter(o => (o.status || '').toLowerCase() !== 'cancelled' && (o.status || '').toLowerCase() !== 'deleted')
    .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

  const pendingCount = rawOrders.filter(o => {
    const s = (o.status || '').toLowerCase();
    return s === 'placed' || s === 'pending';
  }).length;

  const activeCount = rawOrders.filter(o => {
    const s = (o.status || '').toLowerCase();
    return s === 'confirm' || s === 'confirmé' || s === 'confirmed' || s === 'processing' || s === 'en cours' || s === 'shipping' || s === 'shipped';
  }).length;

  const completedCount = rawOrders.filter(o => {
    const s = (o.status || '').toLowerCase();
    return s === 'done' || s === 'livré' || s === 'delivered';
  }).length;

  const totalItems = list.length;
  const itemsPerPage = context.itemsPerPage || 10;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const currentPage = Math.min(context.currentPageIndex || 1, totalPages);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = list.slice(startIndex, startIndex + itemsPerPage);

  const allSelected = paginatedList.length > 0 && paginatedList.every(o => selectedOrderIds.has(o.id));

  return `
    <style>
      @keyframes pulse-yellow {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.6); }
        70% { transform: scale(1.05); box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
      }
      .pulse-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        background: #f59e0b;
        border-radius: 50%;
        animation: pulse-yellow 1.8s infinite;
      }
      .orders-kpi-grid {
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
      .order-toolbar {
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
        min-width: 260px;
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
      .status-pill-list {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 4px;
        margin-bottom: 16px;
      }
      .status-pill-tab {
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
      .status-pill-tab:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        transform: translateY(-1px);
      }
      .status-pill-tab.active {
        background: #0052cc;
        color: #ffffff;
        border-color: #0052cc;
        box-shadow: 0 4px 12px rgba(0, 82, 204, 0.25);
      }
      .status-pill-badge {
        font-size: 11px;
        padding: 1px 7px;
        border-radius: 10px;
        font-weight: 800;
        background: rgba(0, 0, 0, 0.07);
      }
      .status-pill-tab.active .status-pill-badge {
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
      .order-table-container {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      }
      .order-row-hover:hover {
        background-color: rgba(241, 245, 249, 0.6) !important;
      }
      .customer-avatar-badge {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #e2e8f0;
        color: #0052cc;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 800;
        flex-shrink: 0;
      }
      .status-select-inline {
        padding: 5px 10px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 750;
        border: 1.5px solid transparent;
        cursor: pointer;
        outline: none;
        transition: all 0.2s ease;
      }
      .status-select-inline.pending { background: #fef3c7; color: #92400e; border-color: #fde68a; }
      .status-select-inline.confirmed { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
      .status-select-inline.processing { background: #e0e7ff; color: #3730a3; border-color: #c7d2fe; }
      .status-select-inline.shipping { background: #ede9fe; color: #5b21b6; border-color: #ddd6fe; }
      .status-select-inline.done { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
      .status-select-inline.cancelled { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
      
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
        text-decoration: none;
      }
      .action-icon-btn:hover {
        background: #0052cc;
        color: #ffffff;
        border-color: #0052cc;
        transform: translateY(-1px);
      }
      .whatsapp-icon-btn {
        background: #f0fdf4;
        border-color: #bbf7d0;
        color: #15803d;
      }
      .whatsapp-icon-btn:hover {
        background: #22c55e;
        color: #ffffff;
        border-color: #22c55e;
      }
    </style>

    <!-- 1. Orders KPI Summary Bar -->
    <div class="orders-kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(0, 82, 204, 0.1); color: #0052cc;">📦</div>
        <div>
          <span class="kpi-title">Total Orders</span>
          <span class="kpi-val">${totalCount}</span>
        </div>
      </div>

      <div class="kpi-card" style="${pendingCount > 0 ? 'border-color: #f59e0b; background: rgba(254, 243, 199, 0.3);' : ''}">
        <div class="kpi-icon-box" style="background: rgba(245, 158, 11, 0.12); color: #d97706;">⏳</div>
        <div>
          <span class="kpi-title" style="display:flex; align-items:center; gap:6px;">
            Pending Action ${pendingCount > 0 ? '<span class="pulse-indicator"></span>' : ''}
          </span>
          <span class="kpi-val" style="color: #d97706;">${pendingCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(99, 102, 241, 0.1); color: #6366f1;">🚚</div>
        <div>
          <span class="kpi-title">In Progress / Transit</span>
          <span class="kpi-val" style="color: #6366f1;">${activeCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(34, 197, 94, 0.1); color: #16a34a;">✅</div>
        <div>
          <span class="kpi-title">Delivered & Closed</span>
          <span class="kpi-val" style="color: #16a34a;">${completedCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(14, 165, 233, 0.1); color: #0284c7;">💰</div>
        <div>
          <span class="kpi-title">Total Net Sales</span>
          <span class="kpi-val" style="font-size: 19px; color: #0284c7;">${formatPrice(totalRevenue)}</span>
        </div>
      </div>
    </div>

    <!-- 2. Status Pill Filters Row -->
    <div class="status-pill-list">
      ${[
        { key: 'All', label: 'All Orders', count: rawOrders.length },
        { key: 'Placed', label: 'Pending', count: rawOrders.filter(o => ['placed', 'pending'].includes((o.status || '').toLowerCase())).length },
        { key: 'Confirm', label: 'Confirmed', count: rawOrders.filter(o => ['confirm', 'confirmé', 'confirmed'].includes((o.status || '').toLowerCase())).length },
        { key: 'Processing', label: 'Processing', count: rawOrders.filter(o => ['processing', 'en cours'].includes((o.status || '').toLowerCase())).length },
        { key: 'Shipping', label: 'Shipping', count: rawOrders.filter(o => ['shipping', 'shipped'].includes((o.status || '').toLowerCase())).length },
        { key: 'Done', label: 'Delivered', count: rawOrders.filter(o => ['done', 'livré', 'delivered'].includes((o.status || '').toLowerCase())).length },
        { key: 'Cancelled', label: 'Cancelled', count: rawOrders.filter(o => ['cancelled', 'annulé'].includes((o.status || '').toLowerCase())).length }
      ].map(tab => `
        <button class="status-pill-tab ${context.statusFilter === tab.key ? 'active' : ''}" data-status="${tab.key}">
          <span>${tab.label}</span>
          <span class="status-pill-badge">${tab.count}</span>
        </button>
      `).join('')}
    </div>

    <!-- 3. Toolbar & Multi-Filters -->
    <div class="order-toolbar">
      <div class="filter-controls-group">
        <!-- Live Search -->
        <div class="clean-search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="order-search-input" name="order_search_query" placeholder="Search by ID, customer name, phone, item..." value="${context.searchQuery || ''}" autocomplete="off" spellcheck="false">
        </div>

        <!-- Date Range Filter -->
        <select class="select-filter-btn" id="order-date-filter" title="Filter by date range">
          <option value="all" ${dateFilter === 'all' ? 'selected' : ''}>📅 All Dates</option>
          <option value="today" ${dateFilter === 'today' ? 'selected' : ''}>📅 Today</option>
          <option value="week" ${dateFilter === 'week' ? 'selected' : ''}>📅 Last 7 Days</option>
          <option value="month" ${dateFilter === 'month' ? 'selected' : ''}>📅 Last 30 Days</option>
        </select>

        <!-- Payment Method Filter -->
        <select class="select-filter-btn" id="order-payment-filter" title="Filter by payment method">
          <option value="all" ${paymentFilter === 'all' ? 'selected' : ''}>💳 All Payments</option>
          <option value="cod" ${paymentFilter === 'cod' ? 'selected' : ''}>💵 Cash on Delivery (COD)</option>
          <option value="momo" ${paymentFilter === 'momo' ? 'selected' : ''}>📱 Mobile Money (Wave/Orange/MTN)</option>
          <option value="card" ${paymentFilter === 'card' ? 'selected' : ''}>💳 Credit Card</option>
        </select>

        <!-- Sorting -->
        <select class="select-filter-btn" id="order-sort-by" title="Sort orders">
          <option value="newest" ${sortBy === 'newest' ? 'selected' : ''}>⚡ Newest First</option>
          <option value="oldest" ${sortBy === 'oldest' ? 'selected' : ''}>⏳ Oldest First</option>
          <option value="amount_high" ${sortBy === 'amount_high' ? 'selected' : ''}>💰 Amount: High to Low</option>
          <option value="amount_low" ${sortBy === 'amount_low' ? 'selected' : ''}>💵 Amount: Low to High</option>
        </select>
      </div>

      <!-- Export CSV Action -->
      <button class="select-filter-btn" id="export-orders-csv-btn" style="background:#f8fafc; display:flex; align-items:center; gap:6px;">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        <span>Export CSV</span>
      </button>
    </div>

    <!-- 4. Bulk Actions Bar (conditionally shown when items selected) -->
    ${selectedOrderIds.size > 0 ? `
      <div class="bulk-action-bar">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-weight:800; font-size:13.5px;">✓ ${selectedOrderIds.size} order${selectedOrderIds.size > 1 ? 's' : ''} selected</span>
          <button class="bulk-btn" id="bulk-deselect-btn" style="background:transparent; border:none; text-decoration:underline; font-size:12px; cursor:pointer;">Clear</button>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button class="bulk-btn" id="bulk-confirm-btn">✓ Mark Confirmed</button>
          <button class="bulk-btn" id="bulk-shipping-btn">🚚 Mark Shipping</button>
          <button class="bulk-btn" id="bulk-delivered-btn">✅ Mark Delivered</button>
          <button class="bulk-btn" id="bulk-print-invoices-btn">📄 Print Invoices</button>
          <button class="bulk-btn bulk-btn-danger" id="bulk-cancel-btn">✕ Cancel</button>
        </div>
      </div>
    ` : ''}

    <!-- 5. Orders Table -->
    <div class="order-table-container">
      <div class="table-wrapper">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0;">
              <th style="padding:12px 16px; width:36px; text-align:center;">
                <input type="checkbox" id="select-all-orders-cb" ${allSelected ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
              </th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Order ID & Date</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Customer</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Items Summary</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Total</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Payment</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Quick Status</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paginatedList.length === 0 ? `
              <tr>
                <td colspan="8" style="padding:48px 20px; text-align:center; color:#94a3b8;">
                  <div style="font-size:36px; margin-bottom:8px;">🔍</div>
                  <strong style="font-size:15px; color:#475569; display:block;">No orders found</strong>
                  <span style="font-size:13px;">Try adjusting your search terms or filter criteria.</span>
                </td>
              </tr>
            ` : paginatedList.map(o => {
              const isChecked = selectedOrderIds.has(o.id);
              const sLower = (o.status || 'placed').toLowerCase();
              let statusClass = 'pending';
              if (sLower.includes('confirm')) statusClass = 'confirmed';
              else if (sLower.includes('en cours') || sLower.includes('processing')) statusClass = 'processing';
              else if (sLower.includes('shipping') || sLower.includes('shipped')) statusClass = 'shipping';
              else if (sLower.includes('done') || sLower.includes('livr') || sLower.includes('deliver')) statusClass = 'done';
              else if (sLower.includes('cancel') || sLower.includes('annul')) statusClass = 'cancelled';

              const phoneClean = (o.customerPhone || o.phone || '').replace(/[^0-9]/g, '');
              const waUrl = phoneClean ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(`Bonjour ${o.customerName || 'client'} ! Nous vous contactons au sujet de votre commande #${o.id} chez SWEETOS.`)}` : null;

              // Products preview thumbs
              const prods = o.products || [];
              const firstImg = prods[0]?.image || './assets/succes_technology_store.jpg';

              const initials = (o.customerName || 'Customer').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

              return `
                <tr class="order-row-hover" style="border-bottom:1px solid #e2e8f0; transition:all 0.15s ease; ${isChecked ? 'background:#eff6ff;' : ''}">
                  <!-- Checkbox -->
                  <td style="padding:14px 16px; text-align:center;">
                    <input type="checkbox" class="order-select-cb" data-order-id="${o.id}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
                  </td>

                  <!-- Order ID & Date -->
                  <td style="padding:14px 16px;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <a href="#" class="view-order-link" data-order-id="${o.id}" style="color:#0052cc; font-weight:800; font-size:13.5px; text-decoration:none;">
                          #${o.id}
                        </a>
                        <button class="copy-order-id-btn" data-id="${o.id}" title="Copy Order ID" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; padding:2px; font-size:11px;">📋</button>
                      </div>
                      <small style="color:#64748b; font-size:11.5px;">${o.date || 'Recent'}</small>
                    </div>
                  </td>

                  <!-- Customer -->
                  <td style="padding:14px 16px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <div class="customer-avatar-badge">${initials}</div>
                      <div style="display:flex; flex-direction:column; max-width:180px;">
                        <strong style="color:#1e293b; font-size:13px; font-weight:750; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                          ${o.customerName || 'Guest User'}
                        </strong>
                        <small style="color:#64748b; font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                          ${o.customerPhone || o.customerEmail || 'No contact'}
                        </small>
                      </div>
                    </div>
                  </td>

                  <!-- Items Summary with Thumbnail -->
                  <td style="padding:14px 16px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <img src="${firstImg}" alt="Product" style="width:34px; height:34px; border-radius:8px; object-fit:cover; border:1px solid #e2e8f0; flex-shrink:0;">
                      <div style="display:flex; flex-direction:column; max-width:200px;">
                        <span style="font-size:12.5px; font-weight:600; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${o.items || ''}">
                          ${o.items || (prods.length + ' items')}
                        </span>
                        <small style="color:#94a3b8; font-size:11px;">${prods.length || 1} product${(prods.length || 1) > 1 ? 's' : ''}</small>
                      </div>
                    </div>
                  </td>

                  <!-- Total -->
                  <td style="padding:14px 16px;">
                    <strong style="color:#0f172a; font-size:14px; font-weight:850;">
                      ${formatPrice(o.total)}
                    </strong>
                  </td>

                  <!-- Payment Method -->
                  <td style="padding:14px 16px;">
                    <span style="display:inline-block; font-size:11px; font-weight:800; text-transform:uppercase; background:#f1f5f9; color:#475569; padding:3px 8px; border-radius:6px; border:1px solid #e2e8f0;">
                      ${(o.paymentMethod || 'cod').toUpperCase()}
                    </span>
                  </td>

                  <!-- Quick Inline Status Switcher -->
                  <td style="padding:14px 16px;">
                    <select class="status-select-inline ${statusClass}" data-order-id="${o.id}">
                      <option value="Placed" ${sLower === 'placed' || sLower === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                      <option value="Confirm" ${sLower === 'confirm' || sLower === 'confirmé' || sLower === 'confirmed' ? 'selected' : ''}>👍 Confirmed</option>
                      <option value="Processing" ${sLower === 'processing' || sLower === 'en cours' ? 'selected' : ''}>⚙️ Processing</option>
                      <option value="Shipping" ${sLower === 'shipping' || sLower === 'shipped' ? 'selected' : ''}>🚚 Shipping</option>
                      <option value="Done" ${sLower === 'done' || sLower === 'livré' || sLower === 'delivered' ? 'selected' : ''}>✅ Delivered</option>
                      <option value="Cancelled" ${sLower === 'cancelled' || sLower === 'annulé' ? 'selected' : ''}>✕ Cancelled</option>
                    </select>
                  </td>

                  <!-- Actions -->
                  <td style="padding:14px 16px; text-align:right;">
                    <div style="display:inline-flex; align-items:center; gap:6px;">
                      ${waUrl ? `
                        <a href="${waUrl}" target="_blank" class="action-icon-btn whatsapp-icon-btn" title="Chat on WhatsApp">
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        </a>
                      ` : ''}

                      <button class="action-icon-btn print-single-invoice-btn" data-order-id="${o.id}" title="Print Invoice">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                      </button>

                      <button class="action-icon-btn view-order-details-btn" data-order-id="${o.id}" title="View Full Details">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
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
          Showing <strong>${totalItems === 0 ? 0 : startIndex + 1}</strong> to <strong>${Math.min(startIndex + itemsPerPage, totalItems)}</strong> of <strong>${totalItems}</strong> orders
        </span>
        <div class="pagination-buttons" style="display:flex; align-items:center; gap:8px;">
          <button class="pag-btn" id="prev-order-page" ${currentPage <= 1 ? 'disabled' : ''} style="padding:6px 14px; border-radius:8px; border:1px solid #cbd5e1; background:#ffffff; font-size:12.5px; font-weight:700; cursor:pointer;">Previous</button>
          <span style="font-size:13px; font-weight:750; color:#334155; padding:0 6px;">${currentPage} / ${totalPages}</span>
          <button class="pag-btn" id="next-order-page" ${currentPage >= totalPages ? 'disabled' : ''} style="padding:6px 14px; border-radius:8px; border:1px solid #cbd5e1; background:#ffffff; font-size:12.5px; font-weight:700; cursor:pointer;">Next</button>
        </div>
      </div>
    </div>
  `;
}

// Modern, Simplified & Advanced Order Details View
export function renderAdminOrderDetails(context) {
  const order = context.orders.find(o => o.id === context.selectedOrderId);
  if (!order) {
    return `
      <div style="padding: 40px; text-align: center;">
        <h3>Order not found.</h3>
        <button class="admin-btn admin-btn-primary" id="back-to-orders-list-btn">Back to list</button>
      </div>
    `;
  }

  const sLower = (order.status || 'placed').toLowerCase();
  
  // Pipeline Step calculation
  const steps = [
    { key: 'placed', label: 'Order Placed', icon: '📝', targetStatus: 'Placed' },
    { key: 'confirm', label: 'Confirmed', icon: '👍', targetStatus: 'Confirm' },
    { key: 'processing', label: 'In Preparation', icon: '⚙️', targetStatus: 'Processing' },
    { key: 'shipping', label: 'Dispatched (In Transit)', icon: '🚚', targetStatus: 'Shipping' },
    { key: 'done', label: 'Delivered', icon: '✅', targetStatus: 'Done' }
  ];

  let currentStepIdx = 0;
  if (sLower.includes('confirm')) currentStepIdx = 1;
  else if (sLower.includes('processing') || sLower.includes('en cours')) currentStepIdx = 2;
  else if (sLower.includes('shipping') || sLower.includes('shipped')) currentStepIdx = 3;
  else if (sLower.includes('done') || sLower.includes('livr') || sLower.includes('deliver')) currentStepIdx = 4;
  else if (sLower.includes('cancel')) currentStepIdx = -1;

  const phoneClean = (order.customerPhone || order.phone || '').replace(/[^0-9]/g, '');
  const waUrl = phoneClean ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(`Bonjour ${order.customerName || 'client'} ! Votre commande #${order.id} sur SWEETOS est actuellement : ${order.status}. N'hésitez pas si vous avez des questions !`)}` : null;

  return `
    <style>
      .order-step-pipeline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: relative;
        margin: 24px 0 32px;
        padding: 0 10px;
      }
      .pipeline-track-bg {
        position: absolute;
        top: 20px;
        left: 30px;
        right: 30px;
        height: 4px;
        background: #e2e8f0;
        z-index: 1;
      }
      .pipeline-track-fill {
        position: absolute;
        top: 20px;
        left: 30px;
        height: 4px;
        background: #0052cc;
        z-index: 2;
        transition: width 0.3s ease;
      }
      .pipeline-step-node {
        position: relative;
        z-index: 3;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        background: transparent;
        border: none;
        padding: 0;
      }
      .step-circle {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: #ffffff;
        border: 2.5px solid #cbd5e1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .pipeline-step-node.completed .step-circle {
        background: #0052cc;
        border-color: #0052cc;
        color: white;
      }
      .pipeline-step-node.current .step-circle {
        border-color: #0052cc;
        background: #eff6ff;
        transform: scale(1.15);
        box-shadow: 0 0 0 4px rgba(0, 82, 204, 0.2);
      }
      .step-label {
        font-size: 12px;
        font-weight: 750;
        color: #64748b;
        text-align: center;
        white-space: nowrap;
      }
      .pipeline-step-node.completed .step-label,
      .pipeline-step-node.current .step-label {
        color: #0052cc;
      }
    </style>

    <!-- Header Navigation & Quick Actions -->
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <button class="admin-btn" id="back-to-orders-list-btn" style="background:#ffffff; border:1px solid #cbd5e1; display:flex; align-items:center; gap:6px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          <span>Back to orders</span>
        </button>
        <div>
          <h2 style="margin:0; font-size:20px; font-weight:850; color:#0f172a; display:flex; align-items:center; gap:10px;">
            Order #${order.id}
            <span style="font-size:12px; font-weight:800; padding:4px 10px; border-radius:8px; ${
              sLower.includes('done') ? 'background:#dcfce7; color:#166534;' :
              sLower.includes('shipping') ? 'background:#ede9fe; color:#5b21b6;' :
              sLower.includes('confirm') ? 'background:#dbeafe; color:#1e40af;' :
              sLower.includes('cancel') ? 'background:#fee2e2; color:#991b1b;' :
              'background:#fef3c7; color:#92400e;'
            }">
              ${order.status}
            </span>
          </h2>
          <small style="color:#64748b;">Placed on ${order.date || 'N/A'}</small>
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:10px;">
        <button class="admin-btn admin-btn-secondary" id="print-order-invoice-btn" style="display:flex; align-items:center; gap:6px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          <span>Print Official Receipt</span>
        </button>

        ${waUrl ? `
          <a href="${waUrl}" target="_blank" class="admin-btn" style="background:#22c55e; color:white; border:none; display:flex; align-items:center; gap:6px; text-decoration:none;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            <span>WhatsApp Client</span>
          </a>
        ` : ''}
      </div>
    </div>

    <!-- Interactive Fulfillment Pipeline Flow -->
    <div class="glass-panel" style="background:rgba(255,255,255,0.85); border-radius:18px; padding:24px 30px; margin-bottom:24px; border:1px solid #e2e8f0;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <strong style="font-size:14px; font-weight:800; color:#1e293b;">⚡ Interactive Fulfillment Pipeline</strong>
        <span style="font-size:12px; color:#64748b;">Click any stage to instantly transition status</span>
      </div>

      <div class="order-step-pipeline">
        <div class="pipeline-track-bg"></div>
        <div class="pipeline-track-fill" style="width: ${currentStepIdx >= 0 ? (currentStepIdx / (steps.length - 1)) * 100 : 0}%;"></div>

        ${steps.map((step, idx) => {
          const isCompleted = currentStepIdx >= idx;
          const isCurrent = currentStepIdx === idx;
          return `
            <button class="pipeline-step-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} quick-step-jump-btn" data-target-status="${step.targetStatus}">
              <div class="step-circle">${step.icon}</div>
              <span class="step-label">${step.label}</span>
            </button>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 2-Column Grid Layout -->
    <div style="display:grid; grid-template-columns: 1.3fr 0.9fr; gap:24px; align-items:start;">
      
      <!-- LEFT COLUMN: Items & Pricing & Audit Notes -->
      <div style="display:flex; flex-direction:column; gap:24px;">
        
        <!-- Products Card -->
        <div class="glass-panel" style="background:rgba(255,255,255,0.85); border-radius:18px; padding:24px; border:1px solid #e2e8f0;">
          <h3 style="margin:0 0 18px 0; font-size:16px; font-weight:850; color:#0f172a; display:flex; align-items:center; justify-content:space-between;">
            <span>Ordered Items (${(order.products || []).length})</span>
          </h3>

          <div style="display:flex; flex-direction:column; gap:12px;">
            ${(order.products || []).map(p => `
              <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:#f8fafc; border-radius:12px; border:1px solid #f1f5f9;">
                <div style="display:flex; align-items:center; gap:14px;">
                  <img src="${p.image || './assets/succes_technology_store.jpg'}" style="width:48px; height:48px; border-radius:10px; object-fit:cover; border:1px solid #e2e8f0;">
                  <div>
                    <h4 style="margin:0; font-size:14px; font-weight:800; color:#1e293b;">${p.name}</h4>
                    <span style="font-size:12px; color:#64748b;">${formatPrice(p.price)} &times; ${p.quantity}</span>
                  </div>
                </div>
                <strong style="font-size:14px; font-weight:850; color:#0052cc;">
                  ${formatPrice(p.price * p.quantity)}
                </strong>
              </div>
            `).join('')}
          </div>

          <!-- Cost Breakdown -->
          <div style="margin-top:20px; padding-top:16px; border-top:1.5px dashed #e2e8f0; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; font-size:13.5px; color:#64748b;">
              <span>Items Subtotal</span>
              <span>${formatPrice(Math.max(0, order.total - 2000))}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:13.5px; color:#64748b;">
              <span>Delivery Fee</span>
              <span>2,000 CFA</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:850; color:#0f172a; margin-top:8px; padding-top:10px; border-top:1.5px solid #e2e8f0;">
              <span>Grand Total</span>
              <span style="color:#0052cc;">${formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        <!-- Internal Admin Notes -->
        <div class="glass-panel" style="background:rgba(255,255,255,0.85); border-radius:18px; padding:24px; border:1px solid #e2e8f0;">
          <h3 style="margin:0 0 12px 0; font-size:16px; font-weight:850; color:#0f172a;">📝 Internal Staff Notes</h3>
          <p style="font-size:12.5px; color:#64748b; margin:0 0 14px 0;">Record delivery notes, customer call agreements, or dispatch updates (visible to admins only).</p>
          
          <textarea id="order-internal-notes" class="admin-input" rows="3" placeholder="e.g. Client confirmed via phone, preferred delivery before 2 PM...">${order.notes || ''}</textarea>
          
          <button class="admin-btn admin-btn-primary" id="save-order-notes-btn" style="margin-top:10px;">Save Notes</button>
        </div>

      </div>

      <!-- RIGHT COLUMN: Customer Details & Fulfillment Management -->
      <div style="display:flex; flex-direction:column; gap:24px;">
        
        <!-- Customer Info Card -->
        <div class="glass-panel" style="background:rgba(255,255,255,0.85); border-radius:18px; padding:24px; border:1px solid #e2e8f0;">
          <h3 style="margin:0 0 16px 0; font-size:16px; font-weight:850; color:#0f172a;">👤 Customer Contact</h3>
          
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; font-size:13px;">
              <span style="color:#64748b; font-weight:600;">Full Name:</span>
              <strong style="color:#1e293b;">${order.customerName || 'Guest User'}</strong>
            </div>

            <div style="display:flex; justify-content:space-between; font-size:13px; align-items:center;">
              <span style="color:#64748b; font-weight:600;">Phone:</span>
              <div style="display:flex; align-items:center; gap:6px;">
                <a href="tel:${order.customerPhone || ''}" style="color:#0052cc; font-weight:700; text-decoration:none;">${order.customerPhone || 'N/A'}</a>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; font-size:13px; align-items:center;">
              <span style="color:#64748b; font-weight:600;">Email:</span>
              <a href="mailto:${order.customerEmail || ''}" style="color:#0052cc; font-weight:600; text-decoration:none;">${order.customerEmail || 'N/A'}</a>
            </div>

            <div style="display:flex; justify-content:space-between; font-size:13px;">
              <span style="color:#64748b; font-weight:600;">Address:</span>
              <span style="color:#1e293b; text-align:right; max-width:200px;">${order.customerAddress || 'Ivory Coast'}</span>
            </div>

            <div style="display:flex; justify-content:space-between; font-size:13px;">
              <span style="color:#64748b; font-weight:600;">Payment:</span>
              <span style="text-transform:uppercase; font-weight:800; color:#0052cc;">${order.paymentMethod || 'COD'}</span>
            </div>
          </div>
        </div>

        <!-- Fulfillment Management Card -->
        <div class="glass-panel" style="background:rgba(255,255,255,0.85); border-radius:18px; padding:24px; border:1px solid #e2e8f0;">
          <h3 style="margin:0 0 16px 0; font-size:16px; font-weight:850; color:#0f172a;">🚚 Fulfillment Settings</h3>
          
          <div class="form-group-modern" style="margin-bottom:14px;">
            <label style="font-size:11.5px; font-weight:750; color:#64748b; text-transform:uppercase; margin-bottom:6px; display:block;">Update Status</label>
            <select id="order-status-dropdown" class="select-filter-btn" style="width:100%;">
              <option value="Placed" ${sLower === 'placed' || sLower === 'pending' ? 'selected' : ''}>⏳ Placed (Pending Confirmation)</option>
              <option value="Confirm" ${sLower === 'confirm' || sLower === 'confirmé' || sLower === 'confirmed' ? 'selected' : ''}>👍 Confirm</option>
              <option value="Processing" ${sLower === 'processing' || sLower === 'en cours' ? 'selected' : ''}>⚙️ Processing (In Preparation)</option>
              <option value="Shipping" ${sLower === 'shipping' || sLower === 'shipped' ? 'selected' : ''}>🚚 Shipping (In Transit)</option>
              <option value="Done" ${sLower === 'done' || sLower === 'livré' || sLower === 'delivered' ? 'selected' : ''}>✅ Delivered (Completed)</option>
              <option value="Cancelled" ${sLower === 'cancelled' || sLower === 'annulé' ? 'selected' : ''}>✕ Cancelled</option>
            </select>
          </div>

          <div class="form-group-modern" style="margin-bottom:14px;">
            <label style="font-size:11.5px; font-weight:750; color:#64748b; text-transform:uppercase; margin-bottom:6px; display:block;">Assigned Courier</label>
            <select id="order-courier-select" class="select-filter-btn" style="width:100%;">
              <option value="Yango Delivery" ${order.courier === 'Yango Delivery' ? 'selected' : ''}>Yango Delivery</option>
              <option value="Express Abidjan" ${order.courier === 'Express Abidjan' ? 'selected' : ''}>Express Abidjan</option>
              <option value="DHL Express" ${order.courier === 'DHL Express' ? 'selected' : ''}>DHL Express</option>
              <option value="In-house Courier" ${order.courier === 'In-house Courier' ? 'selected' : ''}>In-house Courier</option>
            </select>
          </div>

          <div class="form-group-modern" id="tracking-num-group" style="margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label style="font-size:11.5px; font-weight:750; color:#64748b; text-transform:uppercase; margin:0;">Tracking Number</label>
              <button id="generate-tracking-btn" style="background:transparent; border:none; color:#0052cc; font-size:11.5px; font-weight:750; cursor:pointer;">Generate ID ⚡</button>
            </div>
            <input type="text" id="order-tracking-num" class="admin-input" placeholder="e.g. WV-ABJ-89234" value="${order.trackingNumber || ''}" style="width:100%;">
          </div>

          <button class="admin-btn admin-btn-success" id="save-order-status-btn" style="width:100%; padding:12px; font-size:14px;">
            Save Fulfillment Changes
          </button>
        </div>

        <!-- Danger Zone -->
        <div class="glass-panel" style="background:rgba(254,242,242,0.6); border-radius:18px; padding:20px; border:1px solid #fecaca;">
          <h4 style="margin:0 0 8px 0; font-size:13.5px; font-weight:850; color:#991b1b;">⚠️ Danger Zone</h4>
          <p style="font-size:12px; color:#7f1d1d; margin:0 0 12px 0;">Cancelling an order automatically restocks the reserved products back to the inventory.</p>
          <button class="admin-btn" id="danger-cancel-order-btn" style="background:#ef4444; color:white; border:none; width:100%; font-size:13px;">Cancel & Restock Order</button>
        </div>

      </div>

    </div>
  `;
}

export function attachAdminOrdersListeners(context, shadow) {
  // 1. Navigation to details
  shadow.querySelectorAll('.view-order-details-btn, .view-order-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      context.selectedOrderId = btn.getAttribute('data-order-id');
      context.render();
      context.attachListeners();
    });
  });

  // 2. Back to list button
  const backBtn = shadow.getElementById('back-to-orders-list-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      context.selectedOrderId = null;
      context.render();
      context.attachListeners();
    });
  }

  // 3. Search input with debounce / reactive re-render
  const searchInput = shadow.getElementById('order-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      context.searchQuery = e.target.value;
      context.currentPageIndex = 1;
      context.render();
      context.attachListeners();
      const sRef = shadow.getElementById('order-search-input');
      if (sRef) {
        sRef.focus();
        sRef.setSelectionRange(sRef.value.length, sRef.value.length);
      }
    });
  }

  // 4. Status pill filter tabs
  shadow.querySelectorAll('.status-pill-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      context.statusFilter = tab.getAttribute('data-status');
      context.currentPageIndex = 1;
      context.render();
      context.attachListeners();
    });
  });

  // 5. Date Filter
  const dateSelect = shadow.getElementById('order-date-filter');
  if (dateSelect) {
    dateSelect.addEventListener('change', (e) => {
      dateFilter = e.target.value;
      context.currentPageIndex = 1;
      context.render();
      context.attachListeners();
    });
  }

  // 6. Payment Filter
  const paymentSelect = shadow.getElementById('order-payment-filter');
  if (paymentSelect) {
    paymentSelect.addEventListener('change', (e) => {
      paymentFilter = e.target.value;
      context.currentPageIndex = 1;
      context.render();
      context.attachListeners();
    });
  }

  // 7. Sort by
  const sortSelect = shadow.getElementById('order-sort-by');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      context.render();
      context.attachListeners();
    });
  }

  // 8. Copy Order ID
  shadow.querySelectorAll('.copy-order-id-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      navigator.clipboard?.writeText(id).then(() => {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Copied #${id} to clipboard!` }));
      });
    });
  });

  // 9. Inline Status Selector
  shadow.querySelectorAll('.status-select-inline').forEach(select => {
    select.addEventListener('change', (e) => {
      const orderId = select.getAttribute('data-order-id');
      const newStatus = select.value;
      updateOrderStatus(context, orderId, newStatus, null, shadow);
    });
  });

  // 10. Checkboxes & Bulk Selection
  const selectAllCb = shadow.getElementById('select-all-orders-cb');
  if (selectAllCb) {
    selectAllCb.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      shadow.querySelectorAll('.order-select-cb').forEach(cb => {
        const id = cb.getAttribute('data-order-id');
        if (isChecked) selectedOrderIds.add(id);
        else selectedOrderIds.delete(id);
      });
      context.render();
      context.attachListeners();
    });
  }

  shadow.querySelectorAll('.order-select-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = cb.getAttribute('data-order-id');
      if (e.target.checked) selectedOrderIds.add(id);
      else selectedOrderIds.delete(id);
      context.render();
      context.attachListeners();
    });
  });

  const deselectBtn = shadow.getElementById('bulk-deselect-btn');
  if (deselectBtn) {
    deselectBtn.addEventListener('click', () => {
      selectedOrderIds.clear();
      context.render();
      context.attachListeners();
    });
  }

  // 11. Bulk Actions Handlers
  const bulkConfirm = shadow.getElementById('bulk-confirm-btn');
  if (bulkConfirm) {
    bulkConfirm.addEventListener('click', () => {
      bulkUpdateStatus(context, 'Confirm');
    });
  }

  const bulkShipping = shadow.getElementById('bulk-shipping-btn');
  if (bulkShipping) {
    bulkShipping.addEventListener('click', () => {
      bulkUpdateStatus(context, 'Shipping');
    });
  }

  const bulkDelivered = shadow.getElementById('bulk-delivered-btn');
  if (bulkDelivered) {
    bulkDelivered.addEventListener('click', () => {
      bulkUpdateStatus(context, 'Done');
    });
  }

  const bulkCancel = shadow.getElementById('bulk-cancel-btn');
  if (bulkCancel) {
    bulkCancel.addEventListener('click', () => {
      bulkUpdateStatus(context, 'Cancelled');
    });
  }

  const bulkPrint = shadow.getElementById('bulk-print-invoices-btn');
  if (bulkPrint) {
    bulkPrint.addEventListener('click', () => {
      const ordersToPrint = context.orders.filter(o => selectedOrderIds.has(o.id));
      if (ordersToPrint.length > 0) {
        printMultipleOrderReceipts(ordersToPrint);
      }
    });
  }

  // 12. Export to CSV
  const exportBtn = shadow.getElementById('export-orders-csv-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportOrdersToCSV(context.orders);
    });
  }

  // 13. Pagination Controls
  const prevBtn = shadow.getElementById('prev-order-page');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (context.currentPageIndex > 1) {
        context.currentPageIndex--;
        context.render();
        context.attachListeners();
      }
    });
  }

  const nextBtn = shadow.getElementById('next-order-page');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      context.currentPageIndex = (context.currentPageIndex || 1) + 1;
      context.render();
      context.attachListeners();
    });
  }

  // 14. Single Invoice Print
  shadow.querySelectorAll('.print-single-invoice-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-order-id');
      const o = context.orders.find(ord => ord.id === id);
      if (o) printOrderReceipt(o);
    });
  });

  const printDetailBtn = shadow.getElementById('print-order-invoice-btn');
  if (printDetailBtn) {
    printDetailBtn.addEventListener('click', () => {
      const o = context.orders.find(ord => ord.id === context.selectedOrderId);
      if (o) printOrderReceipt(o);
    });
  }

  // 15. Quick Step Jump in Pipeline
  shadow.querySelectorAll('.quick-step-jump-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetStatus = btn.getAttribute('data-target-status');
      if (context.selectedOrderId) {
        updateOrderStatus(context, context.selectedOrderId, targetStatus, null, shadow);
      }
    });
  });

  // 16. Generate Tracking Number Button
  const genTrackBtn = shadow.getElementById('generate-tracking-btn');
  if (genTrackBtn) {
    genTrackBtn.addEventListener('click', () => {
      const input = shadow.getElementById('order-tracking-num');
      if (input) {
        const rand = Math.floor(100000 + Math.random() * 900000);
        input.value = `WV-ABJ-${rand}`;
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Generated Tracking Code!' }));
      }
    });
  }

  // 17. Save Fulfillment Settings
  const saveStatusBtn = shadow.getElementById('save-order-status-btn');
  if (saveStatusBtn) {
    saveStatusBtn.addEventListener('click', () => {
      const statusDrop = shadow.getElementById('order-status-dropdown');
      const trackInput = shadow.getElementById('order-tracking-num');
      const courierSelect = shadow.getElementById('order-courier-select');

      const nextStatus = statusDrop ? statusDrop.value : 'Placed';
      const tracking = trackInput ? trackInput.value.trim() : '';
      const courier = courierSelect ? courierSelect.value : 'Yango Delivery';

      const order = context.orders.find(o => o.id === context.selectedOrderId);
      if (order) {
        order.courier = courier;
        updateOrderStatus(context, order.id, nextStatus, tracking, shadow);
      }
    });
  }

  // 18. Save Notes
  const saveNotesBtn = shadow.getElementById('save-order-notes-btn');
  if (saveNotesBtn) {
    saveNotesBtn.addEventListener('click', () => {
      const notesInput = shadow.getElementById('order-internal-notes');
      const order = context.orders.find(o => o.id === context.selectedOrderId);
      if (order && notesInput) {
        order.notes = notesInput.value.trim();
        context.saveDatabase('orders');
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Internal notes saved!' }));
      }
    });
  }

  // 19. Danger Cancel Button
  const dangerCancel = shadow.getElementById('danger-cancel-order-btn');
  if (dangerCancel) {
    dangerCancel.addEventListener('click', async () => {
      const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
        title: 'Cancel Order',
        message: 'Are you sure you want to cancel this order and restock the products?',
        confirmText: 'Cancel Order',
        cancelText: 'Keep Order',
        type: 'danger',
        icon: '🛑'
      }) : Promise.resolve(confirm('Are you sure you want to cancel this order and restock the products?')));

      if (confirmed) {
        updateOrderStatus(context, context.selectedOrderId, 'Cancelled', null, shadow);
      }
    });
  }
}

// Reusable Order Status Update Logic
function updateOrderStatus(context, orderId, nextStatus, trackingNum, shadow) {
  const order = context.orders.find(o => o.id === orderId);
  if (!order) return;

  const originalStatus = order.status;
  order.status = nextStatus;
  if (trackingNum !== null && trackingNum !== undefined) {
    order.trackingNumber = trackingNum;
  }

  context.saveDatabase('orders');

  // Customer Notification Sync
  const clientEmail = order.customerEmail || order.email;
  if (clientEmail) {
    const safeKey = clientEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const notifKey = `SWEETOS_notifications_${safeKey}`;
    
    let customerNotifs = [];
    try {
      customerNotifs = JSON.parse(localStorage.getItem(notifKey) || '[]');
    } catch(e) {}

    let icon = '📦';
    let title = `Mise à jour commande #${order.id}`;
    let desc = `Le statut de votre commande #${order.id} a été mis à jour : ${nextStatus}.`;

    if (nextStatus === 'Shipping' || nextStatus === 'Shipped') {
      icon = '🚚';
      title = `Commande #${order.id} expédiée !`;
      desc = `Votre colis #${order.id} est en cours de livraison. Suivi : ${order.trackingNumber || 'En cours'}`;
    } else if (['done', 'livré', 'delivered'].includes(nextStatus.toLowerCase())) {
      icon = '✅';
      title = `Commande #${order.id} livrée !`;
      desc = `Votre commande #${order.id} a été livrée avec succès. Merci de votre confiance !`;
    } else if (nextStatus === 'Cancelled') {
      icon = '❌';
      title = `Commande #${order.id} annulée`;
      desc = `Votre commande #${order.id} a été annulée.`;
    }

    customerNotifs.unshift({
      id: Date.now(),
      type: 'shipping',
      icon: icon,
      title: title,
      desc: desc,
      time: 'Just now',
      unread: true
    });

    localStorage.setItem(notifKey, JSON.stringify(customerNotifs));
    window.dispatchEvent(new CustomEvent('notifications:updated'));
  }

  // Restock if Cancelled
  if (nextStatus === 'Cancelled' && originalStatus !== 'Cancelled') {
    (order.products || []).forEach(item => {
      const catalogProd = (context.products || []).find(p => p.id === item.id);
      if (catalogProd) {
        catalogProd.stock = (catalogProd.stock || 0) + item.quantity;
      }
    });
    context.saveDatabase('products');
  }

  // Award Mystery Box if marked Delivered / Done
  if (['done', 'livré', 'delivered'].includes(nextStatus.toLowerCase())) {
    awardMysteryBoxForDeliveredOrder(order);
  }

  window.dispatchEvent(new CustomEvent('orders:updated'));
  window.dispatchEvent(new CustomEvent('toast:show', { detail: `Order #${order.id} updated to ${nextStatus}` }));

  context.render();
  context.attachListeners();
}

// Bulk Status Updates
function bulkUpdateStatus(context, nextStatus) {
  if (selectedOrderIds.size === 0) return;

  selectedOrderIds.forEach(orderId => {
    const order = context.orders.find(o => o.id === orderId);
    if (order) {
      order.status = nextStatus;
      if (['done', 'livré', 'delivered'].includes(nextStatus.toLowerCase())) {
        awardMysteryBoxForDeliveredOrder(order);
      }
    }
  });

  context.saveDatabase('orders');
  window.dispatchEvent(new CustomEvent('orders:updated'));
  window.dispatchEvent(new CustomEvent('toast:show', { detail: `Updated ${selectedOrderIds.size} orders to: ${nextStatus}` }));

  selectedOrderIds.clear();
  context.render();
  context.attachListeners();
}

// Export Orders to CSV
function exportOrdersToCSV(orders) {
  if (!orders || orders.length === 0) {
    window.dispatchEvent(new CustomEvent('toast:show', { detail: 'No orders to export.' }));
    return;
  }

  const headers = ['Order ID', 'Date', 'Customer Name', 'Customer Email', 'Customer Phone', 'Address', 'Items', 'Total (CFA)', 'Status', 'Payment Method', 'Tracking Number'];
  const rows = orders.map(o => [
    `"${o.id || ''}"`,
    `"${o.date || ''}"`,
    `"${(o.customerName || '').replace(/"/g, '""')}"`,
    `"${o.customerEmail || ''}"`,
    `"${o.customerPhone || ''}"`,
    `"${(o.customerAddress || '').replace(/"/g, '""')}"`,
    `"${(o.items || '').replace(/"/g, '""')}"`,
    `"${o.total || 0}"`,
    `"${o.status || ''}"`,
    `"${o.paymentMethod || 'COD'}"`,
    `"${o.trackingNumber || ''}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SWEETOS_Orders_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Global Receipt & Invoice Generator
function printOrderReceipt(order) {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) return;

  const storeName = localStorage.getItem('SWEETOS_store_name') || 'SWEETOS';
  const storePhone = localStorage.getItem('SWEETOS_store_phone') || '+225 05 00 61 99 23';
  const storeEmail = localStorage.getItem('SWEETOS_store_email') || 'support@sweetos.com';
  const storeAddress = localStorage.getItem('SWEETOS_store_addr') || 'Abidjan, Cocody Mermoz';

  const prods = order.products || [];
  let subtotal = 0;
  let itemsHtml = prods.map(p => {
    const itemTotal = p.price * p.quantity;
    subtotal += itemTotal;
    return `
      <tr>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; font-size:13px; font-weight:700; color:#1e293b;">${p.name}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:center; color:#64748b;">${formatPrice(p.price)}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:center; color:#64748b;">${p.quantity}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:800; color:#0052cc;">${formatPrice(itemTotal)}</td>
      </tr>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Facture Commande #${order.id}</title>
      <meta charset="utf-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        body { font-family: 'Outfit', sans-serif; margin: 0; padding: 40px; color: #1e293b; }
        .receipt-card { max-width: 680px; margin: 0 auto; border: 1.5px solid #e2e8f0; border-radius: 20px; padding: 32px; }
        @media print { body { padding: 0; } .receipt-card { border: none; padding: 0; } }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:30px; border-bottom:1.5px solid #f1f5f9; padding-bottom:20px;">
          <div>
            <h1 style="margin:0; font-size:26px; color:#0052cc; font-weight:900;">${storeName}</h1>
            <p style="margin:4px 0 0 0; font-size:12.5px; color:#64748b; line-height:1.4;">${storeAddress}<br>Tél: ${storePhone} | Email: ${storeEmail}</p>
          </div>
          <div style="text-align:right;">
            <span style="font-size:18px; font-weight:850; color:#0f172a; display:block;">COMMERCIAL INVOICE</span>
            <strong style="color:#0052cc; font-size:15px;">#${order.id}</strong>
            <small style="display:block; color:#64748b; font-size:11.5px; margin-top:2px;">Date: ${order.date || 'N/A'}</small>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:28px; background:#f8fafc; padding:18px; border-radius:14px; border:1px solid #f1f5f9;">
          <div>
            <span style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Facturé à / Customer</span>
            <h4 style="margin:4px 0; font-size:14px; color:#0f172a;">${order.customerName || 'Client Invité'}</h4>
            <p style="margin:0; font-size:12.5px; color:#64748b; line-height:1.4;">
              Tél: ${order.customerPhone || 'N/A'}<br>
              Email: ${order.customerEmail || 'N/A'}<br>
              Adresse: ${order.customerAddress || 'Ivory Coast'}
            </p>
          </div>
          <div>
            <span style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Fulfillment Details</span>
            <p style="margin:4px 0 0 0; font-size:12.5px; color:#64748b; line-height:1.5;">
              Mode de paiement: <strong style="color:#0f172a; text-transform:uppercase;">${order.paymentMethod || 'COD'}</strong><br>
              Statut: <strong style="color:#0052cc;">${order.status}</strong><br>
              Suivi #: <strong>${order.trackingNumber || 'En attente'}</strong>
            </p>
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
          <thead>
            <tr style="background:#f1f5f9; border-bottom:1.5px solid #cbd5e1;">
              <th align="left" style="padding:10px 12px; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase;">Désignation</th>
              <th align="center" style="padding:10px 12px; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase;">Prix</th>
              <th align="center" style="padding:10px 12px; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase;">Qté</th>
              <th align="right" style="padding:10px 12px; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="max-width:280px; margin-left:auto; display:flex; flex-direction:column; gap:8px; margin-bottom:30px;">
          <div style="display:flex; justify-content:space-between; font-size:13px; color:#64748b;">
            <span>Sous-total:</span>
            <strong>${formatPrice(subtotal)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:13px; color:#64748b;">
            <span>Livraison:</span>
            <strong>${order.total - subtotal > 0 ? formatPrice(order.total - subtotal) : 'Gratuit'}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:900; color:#0052cc; border-top:1.5px solid #e2e8f0; padding-top:8px; margin-top:4px;">
            <span>Total Général:</span>
            <span>${formatPrice(order.total)}</span>
          </div>
        </div>

        <div style="text-align:center; font-size:12px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:16px;">
          Merci pour votre confiance chez <strong>${storeName}</strong> !
        </div>
      </div>
      <script>
        window.onload = function() { setTimeout(function() { window.print(); }, 250); };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function printMultipleOrderReceipts(orders) {
  orders.forEach(o => printOrderReceipt(o));
}
