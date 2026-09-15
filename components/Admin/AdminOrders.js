import { formatPrice, getOrderCategory, getNotificationsFromStorage, saveNotificationsToStorage } from '../../utils/storage.js';
import { awardMysteryBoxForDeliveredOrder } from '../../utils/todaysDeals.js';
import { updateOrderInSupabase } from '../../utils/supabase.js';

/**
 * Escapes HTML characters to prevent XSS vulnerabilities when rendering user-supplied strings.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Ensures state fields exist on context rather than relying on global module variables.
 */
function ensureOrderState(context) {
  if (!context.selectedOrderIds || !(context.selectedOrderIds instanceof Set)) {
    context.selectedOrderIds = new Set();
  }
  if (!context.dateFilter) context.dateFilter = 'all';
  if (!context.paymentFilter) context.paymentFilter = 'all';
  if (!context.sortBy) context.sortBy = 'newest';
  if (!context.statusFilter) context.statusFilter = 'All';
}

/**
 * Returns a reliable numeric timestamp for date sorting and filtering.
 */
function getOrderTimestamp(o) {
  if (!o) return 0;
  const raw = o.createdAt || o.updatedAt || o.date;
  if (!raw) return 0;
  const ts = new Date(raw).getTime();
  return isNaN(ts) ? 0 : ts;
}

/**
 * Helper to retrieve currently selected order from context.
 */
export function getSelectedOrder(context) {
  if (!context || !context.orders || !context.selectedOrderId) return null;
  return context.orders.find(o => o && (o.id === context.selectedOrderId || o.order_number === context.selectedOrderId)) || null;
}

export function renderAdminOrders(context) {
  ensureOrderState(context);

  if (context.selectedOrderId) {
    return renderAdminOrderDetails(context);
  }

  const rawOrders = context.orders || [];

  // Prune stale selection IDs
  const validOrderIds = new Set(rawOrders.map(o => o.id));
  for (const id of context.selectedOrderIds) {
    if (!validOrderIds.has(id)) {
      context.selectedOrderIds.delete(id);
    }
  }

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
      (o.id && String(o.id).toLowerCase().includes(q)) || 
      (o.customerName && String(o.customerName).toLowerCase().includes(q)) ||
      (o.customerEmail && String(o.customerEmail).toLowerCase().includes(q)) ||
      (o.customerPhone && String(o.customerPhone).toLowerCase().includes(q)) ||
      (typeof o.items === 'string' && o.items.toLowerCase().includes(q)) ||
      (Array.isArray(o.products) && o.products.some(p => p && p.name && String(p.name).toLowerCase().includes(q)))
    );
  }

  // 3. Status tab filter
  if (context.statusFilter && context.statusFilter !== 'All' && context.statusFilter !== 'Deleted') {
    list = list.filter(o => getOrderCategory(o.status) === context.statusFilter);
  }

  // 4. Date filter
  if (context.dateFilter !== 'all') {
    const now = Date.now();
    list = list.filter(o => {
      const ts = getOrderTimestamp(o);
      if (!ts) return true;
      const diffDays = (now - ts) / (1000 * 60 * 60 * 24);
      if (context.dateFilter === 'today') return diffDays <= 1;
      if (context.dateFilter === 'week') return diffDays <= 7;
      if (context.dateFilter === 'month') return diffDays <= 30;
      return true;
    });
  }

  // 5. Payment method filter
  if (context.paymentFilter !== 'all') {
    list = list.filter(o => {
      const p = (o.paymentMethod || 'cod').toLowerCase();
      if (context.paymentFilter === 'cod') return p.includes('cod') || p.includes('livraison') || p.includes('cash');
      if (context.paymentFilter === 'momo') return p.includes('momo') || p.includes('wave') || p.includes('orange') || p.includes('mtn');
      if (context.paymentFilter === 'card') return p.includes('card') || p.includes('carte') || p.includes('stripe');
      return true;
    });
  }

  // 6. Sorting
  list.sort((a, b) => {
    if (context.sortBy === 'newest') {
      return getOrderTimestamp(b) - getOrderTimestamp(a);
    }
    if (context.sortBy === 'oldest') {
      return getOrderTimestamp(a) - getOrderTimestamp(b);
    }
    if (context.sortBy === 'amount_high') {
      return (parseFloat(b.total) || 0) - (parseFloat(a.total) || 0);
    }
    if (context.sortBy === 'amount_low') {
      return (parseFloat(a.total) || 0) - (parseFloat(b.total) || 0);
    }
    return 0;
  });

  // Calculate Metrics
  const activeOrdersList = rawOrders.filter(o => getOrderCategory(o.status) !== 'Deleted');
  const totalCount = activeOrdersList.length;
  const totalRevenue = activeOrdersList
    .filter(o => getOrderCategory(o.status) !== 'Cancelled')
    .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

  const pendingCount = activeOrdersList.filter(o => getOrderCategory(o.status) === 'Placed').length;

  const activeCount = activeOrdersList.filter(o => {
    const cat = getOrderCategory(o.status);
    return cat === 'Confirm' || cat === 'Processing' || cat === 'Shipping';
  }).length;

  const completedCount = activeOrdersList.filter(o => getOrderCategory(o.status) === 'Done').length;

  const totalItems = list.length;
  const itemsPerPage = context.itemsPerPage || 10;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const currentPage = Math.min(context.currentPageIndex || 1, totalPages);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = list.slice(startIndex, startIndex + itemsPerPage);

  const allSelected = paginatedList.length > 0 && paginatedList.every(o => context.selectedOrderIds.has(o.id));

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
      .status-select-inline {
        padding: 6px 10px;
        border-radius: 8px;
        border: 1px solid #cbd5e1;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        outline: none;
        font-family: inherit;
        transition: all 0.2s ease;
      }
      .status-select-inline.pending { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
      .status-select-inline.confirmed { background: #dbeafe; color: #1e40af; border-color: #93c5fd; }
      .status-select-inline.processing { background: #e0e7ff; color: #3730a3; border-color: #a5b4fc; }
      .status-select-inline.shipping { background: #ede9fe; color: #5b21b6; border-color: #c4b5fd; }
      .status-select-inline.done { background: #dcfce7; color: #166534; border-color: #86efac; }
      .status-select-inline.cancelled { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }

      .customer-avatar-badge {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #0052cc, #2563eb);
        color: white;
        font-weight: 800;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .action-icon-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        color: #475569;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .action-icon-btn:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #0052cc;
      }
      .action-icon-btn.whatsapp-icon-btn {
        background: #22c55e;
        color: white;
        border: none;
      }
      .action-icon-btn.whatsapp-icon-btn:hover {
        background: #16a34a;
      }
    </style>

    <!-- KPI Summary Grid -->
    <div class="orders-kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-box" style="background:#eff6ff; color:#0052cc;">📦</div>
        <div>
          <span class="kpi-title">Total Orders</span>
          <div class="kpi-val">${totalCount}</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background:#fef3c7; color:#d97706;">
          <span class="pulse-indicator"></span>
        </div>
        <div>
          <span class="kpi-title">Pending Orders</span>
          <div class="kpi-val">${pendingCount}</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background:#ede9fe; color:#7c3aed;">🚚</div>
        <div>
          <span class="kpi-title">In Progress</span>
          <div class="kpi-val">${activeCount}</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background:#dcfce7; color:#16a34a;">💰</div>
        <div>
          <span class="kpi-title">Total Sales</span>
          <div class="kpi-val">${formatPrice(totalRevenue)}</div>
        </div>
      </div>
    </div>

    <!-- Status Tabs -->
    <div class="status-pill-list">
      <button class="status-pill-tab ${(!context.statusFilter || context.statusFilter === 'All') ? 'active' : ''}" data-status="All">
        <span>All Orders</span>
        <span class="status-pill-badge">${activeOrdersList.length}</span>
      </button>

      <button class="status-pill-tab ${context.statusFilter === 'Placed' ? 'active' : ''}" data-status="Placed">
        <span>⏳ Pending</span>
        <span class="status-pill-badge">${pendingCount}</span>
      </button>

      <button class="status-pill-tab ${context.statusFilter === 'Confirm' ? 'active' : ''}" data-status="Confirm">
        <span>👍 Confirmed</span>
        <span class="status-pill-badge">${activeOrdersList.filter(o => getOrderCategory(o.status) === 'Confirm').length}</span>
      </button>

      <button class="status-pill-tab ${context.statusFilter === 'Processing' ? 'active' : ''}" data-status="Processing">
        <span>⚙️ Processing</span>
        <span class="status-pill-badge">${activeOrdersList.filter(o => getOrderCategory(o.status) === 'Processing').length}</span>
      </button>

      <button class="status-pill-tab ${context.statusFilter === 'Shipping' ? 'active' : ''}" data-status="Shipping">
        <span>🚚 Shipping</span>
        <span class="status-pill-badge">${activeOrdersList.filter(o => getOrderCategory(o.status) === 'Shipping').length}</span>
      </button>

      <button class="status-pill-tab ${context.statusFilter === 'Done' ? 'active' : ''}" data-status="Done">
        <span>✅ Delivered</span>
        <span class="status-pill-badge">${completedCount}</span>
      </button>

      <button class="status-pill-tab ${context.statusFilter === 'Cancelled' ? 'active' : ''}" data-status="Cancelled">
        <span>✕ Cancelled</span>
        <span class="status-pill-badge">${activeOrdersList.filter(o => getOrderCategory(o.status) === 'Cancelled').length}</span>
      </button>

      <button class="status-pill-tab ${context.statusFilter === 'Deleted' ? 'active' : ''}" data-status="Deleted">
        <span>🗑️ Deleted</span>
        <span class="status-pill-badge">${rawOrders.filter(o => (o.status || '').toLowerCase() === 'deleted').length}</span>
      </button>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="order-toolbar">
      <div class="filter-controls-group">
        <!-- Search Box -->
        <div class="clean-search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="order-search-input" autocomplete="off" placeholder="Search ID, customer, email, phone or product..." value="${escapeHtml(context.searchQuery || '')}">
        </div>

        <!-- Date Range Filter -->
        <select class="select-filter-btn" id="order-date-filter">
          <option value="all" ${context.dateFilter === 'all' ? 'selected' : ''}>📅 All Dates</option>
          <option value="today" ${context.dateFilter === 'today' ? 'selected' : ''}>Today</option>
          <option value="week" ${context.dateFilter === 'week' ? 'selected' : ''}>Last 7 Days</option>
          <option value="month" ${context.dateFilter === 'month' ? 'selected' : ''}>Last 30 Days</option>
        </select>

        <!-- Payment Method Filter -->
        <select class="select-filter-btn" id="order-payment-filter">
          <option value="all" ${context.paymentFilter === 'all' ? 'selected' : ''}>💳 All Payments</option>
          <option value="cod" ${context.paymentFilter === 'cod' ? 'selected' : ''}>Cash on Delivery (COD)</option>
          <option value="momo" ${context.paymentFilter === 'momo' ? 'selected' : ''}>Mobile Money (Wave/MTN)</option>
          <option value="card" ${context.paymentFilter === 'card' ? 'selected' : ''}>Bank Card</option>
        </select>

        <!-- Sort By Dropdown -->
        <select class="select-filter-btn" id="order-sort-by">
          <option value="newest" ${context.sortBy === 'newest' ? 'selected' : ''}>⬇️ Newest First</option>
          <option value="oldest" ${context.sortBy === 'oldest' ? 'selected' : ''}>⬆️ Oldest First</option>
          <option value="amount_high" ${context.sortBy === 'amount_high' ? 'selected' : ''}>💰 Amount: High to Low</option>
          <option value="amount_low" ${context.sortBy === 'amount_low' ? 'selected' : ''}>💸 Amount: Low to High</option>
        </select>
      </div>

      <!-- Export CSV Button -->
      <button class="admin-btn admin-btn-secondary" id="export-orders-csv-btn" style="padding:9px 14px; font-size:13px; display:flex; align-items:center; gap:6px;">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        <span>Export CSV</span>
      </button>
    </div>

    <!-- Floating Bulk Selection Bar -->
    ${context.selectedOrderIds.size > 0 ? `
      <div class="bulk-action-bar">
        <div style="display:flex; align-items:center; gap:10px;">
          <strong style="font-size:13.5px;">${context.selectedOrderIds.size} order${context.selectedOrderIds.size > 1 ? 's' : ''} selected</strong>
          <button class="admin-btn" id="clear-selected-orders-btn" style="background:rgba(255,255,255,0.15); color:white; border:none; padding:4px 10px; font-size:11.5px;">Deselect All</button>
        </div>

        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button class="admin-btn bulk-status-change-btn" data-status="Confirm" style="background:#2563eb; color:white; border:none; font-size:12px; padding:6px 12px;">Confirm Selected</button>
          <button class="admin-btn bulk-status-change-btn" data-status="Shipping" style="background:#7c3aed; color:white; border:none; font-size:12px; padding:6px 12px;">Ship Selected</button>
          <button class="admin-btn bulk-status-change-btn" data-status="Done" style="background:#16a34a; color:white; border:none; font-size:12px; padding:6px 12px;">Mark Delivered</button>
          <button class="admin-btn bulk-status-change-btn" data-status="Cancelled" style="background:#dc2626; color:white; border:none; font-size:12px; padding:6px 12px;">Cancel Selected</button>
          <button class="admin-btn" id="bulk-print-invoices-btn" style="background:#ffffff; color:#0f172a; border:none; font-size:12px; padding:6px 12px;">🖨️ Print Receipts</button>
        </div>
      </div>
    ` : ''}

    <!-- Main Orders Data Table -->
    <div class="glass-panel" style="background:rgba(255, 255, 255, 0.85); border-radius:18px; padding:0; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 4px 20px rgba(0,0,0,0.03);">
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; text-align:left; font-family:inherit;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:1.5px solid #cbd5e1;">
              <th style="padding:12px 16px; width:36px; text-align:center;">
                <input type="checkbox" id="select-all-orders-cb" ${allSelected ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
              </th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Order ID & Date</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Customer</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Products / Items</th>
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
              const isChecked = context.selectedOrderIds.has(o.id);
              const sLower = (o.status || 'placed').toLowerCase();
              let statusClass = 'pending';
              if (sLower.includes('confirm')) statusClass = 'confirmed';
              else if (sLower.includes('en cours') || sLower.includes('processing')) statusClass = 'processing';
              else if (sLower.includes('shipping') || sLower.includes('shipped')) statusClass = 'shipping';
              else if (sLower.includes('done') || sLower.includes('livr') || sLower.includes('deliver')) statusClass = 'done';
              else if (sLower.includes('cancel') || sLower.includes('annul')) statusClass = 'cancelled';

              const phoneClean = (o.customerPhone || o.phone || '').replace(/[^0-9]/g, '');
              const waUrl = phoneClean ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(`Bonjour ${o.customerName || 'client'} ! Nous vous contactons au sujet de votre commande #${o.id} chez SWEETOS.`)}` : null;

              const prods = o.products || [];
              const firstImg = prods[0]?.image || './assets/sweetos_share.jpg';

              const initials = (o.customerName || 'Customer').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

              return `
                <tr class="order-row-hover" style="border-bottom:1px solid #e2e8f0; transition:all 0.15s ease; ${isChecked ? 'background:#eff6ff;' : ''}">
                  <!-- Checkbox -->
                  <td style="padding:14px 16px; text-align:center;">
                    <input type="checkbox" class="order-select-cb" data-order-id="${escapeHtml(o.id)}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
                  </td>

                  <!-- Order ID & Date -->
                  <td style="padding:14px 16px;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <a href="#" class="view-order-link" data-order-id="${escapeHtml(o.id)}" style="color:#0052cc; font-weight:800; font-size:13.5px; text-decoration:none;">
                          #${escapeHtml(o.id)}
                        </a>
                        <button class="copy-order-id-btn" data-id="${escapeHtml(o.id)}" title="Copy Order ID" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; padding:2px; font-size:11px;">📋</button>
                      </div>
                      <small style="color:#64748b; font-size:11.5px;">${escapeHtml(o.date || 'Recent')}</small>
                    </div>
                  </td>

                  <!-- Customer -->
                  <td style="padding:14px 16px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <div class="customer-avatar-badge">${escapeHtml(initials)}</div>
                      <div style="display:flex; flex-direction:column; max-width:180px;">
                        <strong style="color:#1e293b; font-size:13px; font-weight:750; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                          ${escapeHtml(o.customerName || 'Guest User')}
                        </strong>
                        <small style="color:#64748b; font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                          ${escapeHtml(o.customerPhone || o.customerEmail || 'No contact')}
                        </small>
                      </div>
                    </div>
                  </td>

                  <!-- Items Summary with Thumbnail -->
                  <td style="padding:14px 16px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <img src="${escapeHtml(firstImg)}" alt="Product" style="width:34px; height:34px; border-radius:8px; object-fit:cover; border:1px solid #e2e8f0; flex-shrink:0;">
                      <div style="display:flex; flex-direction:column; max-width:200px;">
                        <span style="font-size:12.5px; font-weight:600; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(typeof o.items === 'string' ? o.items : '')}">
                          ${escapeHtml(typeof o.items === 'string' ? o.items : (prods.length + ' items'))}
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
                      ${escapeHtml((o.paymentMethod || 'cod').toUpperCase())}
                    </span>
                  </td>

                  <!-- Quick Inline Status Switcher -->
                  <td style="padding:14px 16px;">
                    <select class="status-select-inline ${statusClass}" data-order-id="${escapeHtml(o.id)}">
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
                        <a href="${escapeHtml(waUrl)}" target="_blank" rel="noopener" class="action-icon-btn whatsapp-icon-btn" title="Chat on WhatsApp">
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        </a>
                      ` : ''}

                      <button class="action-icon-btn print-single-invoice-btn" data-order-id="${escapeHtml(o.id)}" title="Print Invoice">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                      </button>

                      <button class="action-icon-btn view-order-details-btn" data-order-id="${escapeHtml(o.id)}" title="View Full Details">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div style="padding:16px 20px; border-top:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; background:#f8fafc;">
        <span style="font-size:13px; color:#64748b;">
          Showing <strong>${startIndex + 1}-${Math.min(startIndex + itemsPerPage, totalItems)}</strong> of <strong>${totalItems}</strong> orders
        </span>

        <div style="display:flex; align-items:center; gap:8px;">
          <button class="admin-btn admin-btn-secondary" id="prev-order-page" ${currentPage <= 1 ? 'disabled' : ''} style="padding:6px 12px; font-size:12.5px;">Previous</button>
          <span style="font-size:12.5px; font-weight:700; color:#334155;">Page ${currentPage} of ${totalPages}</span>
          <button class="admin-btn admin-btn-secondary" id="next-order-page" ${currentPage >= totalPages ? 'disabled' : ''} style="padding:6px 12px; font-size:12.5px;">Next</button>
        </div>
      </div>
    </div>
  `;
}

export function renderAdminOrderDetails(context) {
  ensureOrderState(context);
  const order = getSelectedOrder(context);

  if (!order) {
    return `
      <div style="padding:40px; text-align:center;">
        <h3>Order not found.</h3>
        <button class="admin-btn" id="back-to-orders-list-btn">Back to Orders</button>
      </div>
    `;
  }

  const sLower = (order.status || 'placed').toLowerCase();

  const steps = [
    { label: 'Placed', icon: '⏳', targetStatus: 'Placed' },
    { label: 'Confirmed', icon: '👍', targetStatus: 'Confirm' },
    { label: 'Processing', icon: '⚙️', targetStatus: 'Processing' },
    { label: 'Shipping', icon: '🚚', targetStatus: 'Shipping' },
    { label: 'Delivered', icon: '✅', targetStatus: 'Done' }
  ];

  let currentStepIdx = 0;
  if (sLower.includes('confirm')) currentStepIdx = 1;
  else if (sLower.includes('processing') || sLower.includes('en cours')) currentStepIdx = 2;
  else if (sLower.includes('shipping') || sLower.includes('shipped')) currentStepIdx = 3;
  else if (sLower.includes('done') || sLower.includes('livr') || sLower.includes('deliver')) currentStepIdx = 4;
  else if (sLower.includes('cancel')) currentStepIdx = -1;

  const phoneClean = (order.customerPhone || order.phone || '').replace(/[^0-9]/g, '');
  const waUrl = phoneClean ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(`Bonjour ${order.customerName || 'client'} ! Votre commande #${order.id} sur SWEETOS est actuellement : ${order.status}. N'hésitez pas si vous avez des questions !`)}` : null;

  const stepPercentage = currentStepIdx >= 0 ? (currentStepIdx / (steps.length - 1)) * 100 : 0;
  const stepOffset = currentStepIdx >= 0 ? (60 * currentStepIdx / (steps.length - 1)) : 0;
  const trackFillStyle = `width: calc(${stepPercentage}% - ${stepOffset}px);`;

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
            Order #${escapeHtml(order.id)}
            <span style="font-size:12px; font-weight:800; padding:4px 10px; border-radius:8px; ${
              sLower.includes('done') ? 'background:#dcfce7; color:#166534;' :
              sLower.includes('shipping') ? 'background:#ede9fe; color:#5b21b6;' :
              sLower.includes('confirm') ? 'background:#dbeafe; color:#1e40af;' :
              sLower.includes('cancel') ? 'background:#fee2e2; color:#991b1b;' :
              'background:#fef3c7; color:#92400e;'
            }">
              ${escapeHtml(order.status)}
            </span>
          </h2>
          <small style="color:#64748b;">Placed on ${escapeHtml(order.date || 'N/A')}</small>
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:10px;">
        <button class="admin-btn admin-btn-secondary" id="print-order-invoice-btn" style="display:flex; align-items:center; gap:6px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          <span>Print Official Receipt</span>
        </button>

        ${waUrl ? `
          <a href="${escapeHtml(waUrl)}" target="_blank" rel="noopener" class="admin-btn" style="background:#22c55e; color:white; border:none; display:flex; align-items:center; gap:6px; text-decoration:none;">
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
        <div class="pipeline-track-fill" style="${trackFillStyle}"></div>

        ${steps.map((step, idx) => {
          const isCompleted = currentStepIdx >= idx;
          const isCurrent = currentStepIdx === idx;
          return `
            <button class="pipeline-step-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} quick-step-jump-btn" data-target-status="${escapeHtml(step.targetStatus)}">
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

          <div style="display:flex; flex-direction:column; gap:14px;">
            ${(order.products || []).map(p => {
              const pQty = parseFloat(p.quantity) || 1;
              const pPrice = parseFloat(p.price) || 0;
              return `
                <div style="display:flex; align-items:center; justify-content:space-between; padding-bottom:14px; border-bottom:1px solid #f1f5f9;">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${escapeHtml(p.image || './assets/sweetos_share.jpg')}" alt="${escapeHtml(p.name)}" style="width:44px; height:44px; border-radius:10px; object-fit:cover; border:1px solid #e2e8f0;">
                    <div>
                      <strong style="font-size:13.5px; color:#1e293b; display:block;">${escapeHtml(p.name)}</strong>
                      <small style="color:#64748b;">${formatPrice(pPrice)} x ${pQty}</small>
                    </div>
                  </div>
                  <strong style="font-size:14px; color:#0f172a;">${formatPrice(pPrice * pQty)}</strong>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Total Calculation Summary -->
          <div style="margin-top:18px; padding-top:14px; border-top:1.5px solid #e2e8f0; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; font-size:13px; color:#64748b;">
              <span>Subtotal:</span>
              <span>${formatPrice((order.products || []).reduce((sum, p) => sum + (parseFloat(p.price) || 0) * (parseFloat(p.quantity) || 1), 0))}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:13px; color:#64748b;">
              <span>Delivery Fee:</span>
              <span>${(parseFloat(order.total) || 0) > (order.products || []).reduce((sum, p) => sum + (parseFloat(p.price) || 0) * (parseFloat(p.quantity) || 1), 0) ? formatPrice((parseFloat(order.total) || 0) - (order.products || []).reduce((sum, p) => sum + (parseFloat(p.price) || 0) * (parseFloat(p.quantity) || 1), 0)) : 'Gratuit'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:900; color:#0052cc; margin-top:6px; padding-top:8px; border-top:1px solid #f1f5f9;">
              <span>Total Amount:</span>
              <span>${formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        <!-- Notes & Internal Remarks -->
        <div class="glass-panel" style="background:rgba(255,255,255,0.85); border-radius:18px; padding:24px; border:1px solid #e2e8f0;">
          <h3 style="margin:0 0 12px 0; font-size:15px; font-weight:800; color:#0f172a;">📝 Internal Notes & Logistics</h3>
          <textarea id="order-internal-notes" style="width:100%; height:80px; border-radius:10px; border:1px solid #cbd5e1; padding:10px; font-family:inherit; font-size:13px; box-sizing:border-box; outline:none; resize:none;" placeholder="Add internal remarks about this customer or delivery instructions...">${escapeHtml(order.notes || '')}</textarea>
          <div style="text-align:right; margin-top:10px;">
            <button class="admin-btn" id="save-order-notes-btn" style="padding:6px 14px; font-size:12.5px;">Save Notes</button>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: Customer Details & Fulfillment Form -->
      <div style="display:flex; flex-direction:column; gap:24px;">
        
        <!-- Customer Details Card -->
        <div class="glass-panel" style="background:rgba(255,255,255,0.85); border-radius:18px; padding:24px; border:1px solid #e2e8f0;">
          <h3 style="margin:0 0 16px 0; font-size:15px; font-weight:800; color:#0f172a;">👤 Customer Information</h3>
          <div style="display:flex; flex-direction:column; gap:12px; font-size:13px;">
            <div>
              <span style="color:#64748b; font-size:11.5px; font-weight:700; text-transform:uppercase; display:block;">Customer Name</span>
              <strong style="color:#1e293b; font-size:14px;">${escapeHtml(order.customerName || 'Guest Client')}</strong>
            </div>
            <div>
              <span style="color:#64748b; font-size:11.5px; font-weight:700; text-transform:uppercase; display:block;">Phone Number</span>
              <span style="color:#1e293b;">${escapeHtml(order.customerPhone || 'N/A')}</span>
            </div>
            <div>
              <span style="color:#64748b; font-size:11.5px; font-weight:700; text-transform:uppercase; display:block;">Email Address</span>
              <span style="color:#1e293b;">${escapeHtml(order.customerEmail || 'N/A')}</span>
            </div>
            <div>
              <span style="color:#64748b; font-size:11.5px; font-weight:700; text-transform:uppercase; display:block;">Delivery Address</span>
              <span style="color:#1e293b; line-height:1.4;">${escapeHtml(typeof order.customerAddress === 'string' ? order.customerAddress : (order.customerAddress?.street || 'Abidjan, Ivory Coast'))}</span>
            </div>
          </div>
        </div>

        <!-- Fulfillment Actions Form -->
        <div class="glass-panel" style="background:rgba(255,255,255,0.85); border-radius:18px; padding:24px; border:1px solid #e2e8f0;">
          <h3 style="margin:0 0 16px 0; font-size:15px; font-weight:800; color:#0f172a;">🚚 Shipping & Fulfillment</h3>

          <div style="display:flex; flex-direction:column; gap:14px;">
            <div>
              <label style="font-size:12px; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Order Status</label>
              <select id="order-status-dropdown" style="width:100%; padding:9px 12px; border-radius:10px; border:1px solid #cbd5e1; font-family:inherit; font-size:13px; font-weight:700;">
                <option value="Placed" ${sLower === 'placed' || sLower === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                <option value="Confirm" ${sLower === 'confirm' || sLower === 'confirmé' || sLower === 'confirmed' ? 'selected' : ''}>👍 Confirmed</option>
                <option value="Processing" ${sLower === 'processing' || sLower === 'en cours' ? 'selected' : ''}>⚙️ Processing</option>
                <option value="Shipping" ${sLower === 'shipping' || sLower === 'shipped' ? 'selected' : ''}>🚚 Shipping</option>
                <option value="Done" ${sLower === 'done' || sLower === 'livré' || sLower === 'delivered' ? 'selected' : ''}>✅ Delivered</option>
                <option value="Cancelled" ${sLower === 'cancelled' || sLower === 'annulé' ? 'selected' : ''}>✕ Cancelled</option>
              </select>
            </div>

            <div>
              <label style="font-size:12px; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Courier Service</label>
              <select id="order-courier-select" style="width:100%; padding:9px 12px; border-radius:10px; border:1px solid #cbd5e1; font-family:inherit; font-size:13px;">
                <option value="Yango Delivery" ${(order.courier || '').includes('Yango') ? 'selected' : ''}>Yango Delivery</option>
                <option value="La Poste CI" ${(order.courier || '').includes('Poste') ? 'selected' : ''}>La Poste CI</option>
                <option value="Livraison Express" ${(order.courier || '').includes('Express') ? 'selected' : ''}>Livraison Express Abidjan</option>
                <option value="Retrait Magasin" ${(order.courier || '').includes('Retrait') ? 'selected' : ''}>Retrait en Magasin</option>
              </select>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label style="font-size:12px; font-weight:700; color:#475569;">Tracking Number</label>
                <button type="button" id="generate-tracking-btn" style="background:none; border:none; color:#0052cc; font-size:11.5px; font-weight:700; cursor:pointer;">Generate Code</button>
              </div>
              <input type="text" id="order-tracking-num" style="width:100%; padding:9px 12px; border-radius:10px; border:1px solid #cbd5e1; font-family:inherit; font-size:13px; box-sizing:border-box;" placeholder="e.g. WV-ABJ-920412" value="${escapeHtml(order.trackingNumber || '')}">
            </div>

            <button class="admin-btn" id="save-order-status-btn" style="width:100%; padding:10px; font-size:13.5px; margin-top:6px;">Update Order Status</button>
          </div>

          <div style="margin-top:20px; padding-top:16px; border-top:1px solid #fee2e2;">
            <button class="admin-btn" id="danger-cancel-order-btn" style="width:100%; padding:8px; font-size:12.5px; background:#fee2e2; color:#dc2626; border:1px solid #fca5a5;">Cancel Order & Restock</button>
          </div>
        </div>

      </div>
    </div>
  `;
}

export function attachAdminOrdersListeners(shadow, context) {
  ensureOrderState(context);

  // 1. Return to list button
  const backBtn = shadow.getElementById('back-to-orders-list-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      context.selectedOrderId = null;
      context.render();
      context.attachListeners();
    });
  }

  // 2. Tab filtering
  shadow.querySelectorAll('.status-pill-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      context.statusFilter = tab.getAttribute('data-status');
      context.currentPageIndex = 1;
      context.render();
      context.attachListeners();
    });
  });

  // 3. Search input filtering with focus preservation
  const searchInput = shadow.getElementById('order-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      context.searchQuery = e.target.value;
      context.currentPageIndex = 1;
      context.render();
      context.attachListeners();

      const newSearchRef = shadow.getElementById('order-search-input');
      if (newSearchRef) {
        newSearchRef.focus();
        newSearchRef.setSelectionRange(newSearchRef.value.length, newSearchRef.value.length);
      }
    });
  }

  // 4. Date filter dropdown
  const dateSelect = shadow.getElementById('order-date-filter');
  if (dateSelect) {
    dateSelect.addEventListener('change', (e) => {
      context.dateFilter = e.target.value;
      context.currentPageIndex = 1;
      context.render();
      context.attachListeners();
    });
  }

  // 5. Payment filter dropdown
  const paySelect = shadow.getElementById('order-payment-filter');
  if (paySelect) {
    paySelect.addEventListener('change', (e) => {
      context.paymentFilter = e.target.value;
      context.currentPageIndex = 1;
      context.render();
      context.attachListeners();
    });
  }

  // 6. Sort by dropdown
  const sortSelect = shadow.getElementById('order-sort-by');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      context.sortBy = e.target.value;
      context.render();
      context.attachListeners();
    });
  }

  // 7. Select All Checkbox
  const selectAllCb = shadow.getElementById('select-all-orders-cb');
  if (selectAllCb) {
    selectAllCb.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      shadow.querySelectorAll('.order-select-cb').forEach(cb => {
        const id = cb.getAttribute('data-order-id');
        if (id) {
          if (isChecked) context.selectedOrderIds.add(id);
          else context.selectedOrderIds.delete(id);
        }
      });
      context.render();
      context.attachListeners();
    });
  }

  // 8. Individual Row Selection Checkbox
  shadow.querySelectorAll('.order-select-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = cb.getAttribute('data-order-id');
      if (id) {
        if (e.target.checked) context.selectedOrderIds.add(id);
        else context.selectedOrderIds.delete(id);
        context.render();
        context.attachListeners();
      }
    });
  });

  // 9. Clear Selection Button
  const clearSelBtn = shadow.getElementById('clear-selected-orders-btn');
  if (clearSelBtn) {
    clearSelBtn.addEventListener('click', () => {
      context.selectedOrderIds.clear();
      context.render();
      context.attachListeners();
    });
  }

  // 10. View Detail View Links & Buttons
  shadow.querySelectorAll('.view-order-link, .view-order-details-btn').forEach(elem => {
    elem.addEventListener('click', (e) => {
      e.preventDefault();
      const id = elem.getAttribute('data-order-id');
      if (id) {
        context.selectedOrderId = id;
        context.render();
        context.attachListeners();
      }
    });
  });

  // 11. Quick Inline Status Change
  shadow.querySelectorAll('.status-select-inline').forEach(select => {
    select.addEventListener('change', (e) => {
      const id = select.getAttribute('data-order-id');
      const nextStatus = e.target.value;
      if (id) {
        updateOrderStatus(context, id, nextStatus, null, shadow);
      }
    });
  });

  // 12. Copy Order ID Button
  shadow.querySelectorAll('.copy-order-id-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (id) {
        navigator.clipboard.writeText(id).then(() => {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Copied #${id}!` }));
        }).catch(() => {});
      }
    });
  });

  // 13. Bulk Status Action Buttons
  shadow.querySelectorAll('.bulk-status-change-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextStatus = btn.getAttribute('data-status');
      if (nextStatus) {
        bulkUpdateStatus(context, nextStatus);
      }
    });
  });

  // 14. Bulk Print Invoices
  const bulkPrintBtn = shadow.getElementById('bulk-print-invoices-btn');
  if (bulkPrintBtn) {
    bulkPrintBtn.addEventListener('click', () => {
      const ordersToPrint = context.orders.filter(o => context.selectedOrderIds.has(o.id));
      if (ordersToPrint.length > 0) {
        printMultipleOrderReceipts(ordersToPrint);
      }
    });
  }

  // 15. Export to CSV
  const exportBtn = shadow.getElementById('export-orders-csv-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportOrdersToCSV(context.orders);
    });
  }

  // 16. Pagination Controls
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

  // 17. Single Invoice Print
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
      const o = getSelectedOrder(context);
      if (o) printOrderReceipt(o);
    });
  }

  // 18. Quick Step Jump in Pipeline
  shadow.querySelectorAll('.quick-step-jump-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetStatus = btn.getAttribute('data-target-status');
      if (context.selectedOrderId) {
        updateOrderStatus(context, context.selectedOrderId, targetStatus, null, shadow);
      }
    });
  });

  // 19. Generate Tracking Number Button
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

  // 20. Save Fulfillment Settings
  const saveStatusBtn = shadow.getElementById('save-order-status-btn');
  if (saveStatusBtn) {
    saveStatusBtn.addEventListener('click', () => {
      const statusDrop = shadow.getElementById('order-status-dropdown');
      const trackInput = shadow.getElementById('order-tracking-num');
      const courierSelect = shadow.getElementById('order-courier-select');

      const nextStatus = statusDrop ? statusDrop.value : 'Placed';
      const tracking = trackInput ? trackInput.value.trim() : '';
      const courier = courierSelect ? courierSelect.value : 'Yango Delivery';

      const order = getSelectedOrder(context);
      if (order) {
        order.courier = courier;
        updateOrderStatus(context, order.id, nextStatus, tracking, shadow);
      }
    });
  }

  // 21. Save Notes
  const saveNotesBtn = shadow.getElementById('save-order-notes-btn');
  if (saveNotesBtn) {
    saveNotesBtn.addEventListener('click', () => {
      const notesInput = shadow.getElementById('order-internal-notes');
      const order = getSelectedOrder(context);
      if (order && notesInput) {
        order.notes = notesInput.value.trim();
        context.saveDatabase('orders');
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Internal notes saved!' }));
      }
    });
  }

  // 22. Danger Cancel Button
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

      if (confirmed && context.selectedOrderId) {
        updateOrderStatus(context, context.selectedOrderId, 'Cancelled', null, shadow);
      }
    });
  }
}

// Reusable Order Status Update Logic
function updateOrderStatus(context, orderId, nextStatus, trackingNum, shadow) {
  const order = context.orders.find(o => o.id === orderId || o.order_number === orderId);
  if (!order) return;

  const originalStatus = order.status;
  if (originalStatus === nextStatus && (trackingNum === null || trackingNum === undefined || trackingNum === order.trackingNumber)) {
    return;
  }

  context._isSelfUpdatingOrders = true;

  try {
    order.status = nextStatus;
    order.updatedAt = new Date().toISOString();
    if (trackingNum !== null && trackingNum !== undefined) {
      order.trackingNumber = trackingNum;
    }

    context.saveDatabase('orders');

    // Targeted cloud update
    updateOrderInSupabase(order.id, {
      status: nextStatus,
      trackingNumber: order.trackingNumber,
      courier: order.courier
    }).catch(err => console.warn('[Supabase Cloud Update Notice]:', err));

    // Customer Notification Sync (Only if status actually changed)
    if (originalStatus !== nextStatus) {
      const clientEmail = order.customerEmail || order.email;
      if (clientEmail) {
        let customerNotifs = getNotificationsFromStorage(clientEmail);

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

        const notifId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        customerNotifs.unshift({
          id: notifId,
          type: 'shipping',
          icon: icon,
          title: title,
          desc: desc,
          time: 'Just now',
          unread: true
        });

        saveNotificationsToStorage(customerNotifs, clientEmail);
      }
    }

    // Restock if Cancelled
    if (nextStatus === 'Cancelled' && originalStatus !== 'Cancelled') {
      let restockedAny = false;
      (order.products || []).forEach(item => {
        const qty = parseFloat(item.quantity) || 1;
        const catalogProd = (context.products || []).find(p => p.id === item.id);
        if (catalogProd) {
          catalogProd.stock = (parseFloat(catalogProd.stock) || 0) + qty;
          restockedAny = true;
        }
      });
      if (restockedAny) {
        context.saveDatabase('products');
      }
    }

    // Award Mystery Box if marked Delivered / Done
    if (['done', 'livré', 'delivered'].includes(nextStatus.toLowerCase()) && !['done', 'livré', 'delivered'].includes((originalStatus || '').toLowerCase())) {
      awardMysteryBoxForDeliveredOrder(order);
    }

    window.dispatchEvent(new CustomEvent('toast:show', { detail: `Order #${order.id} updated to ${nextStatus}` }));

    if (context._adminSyncChannel) {
      try {
        context._adminSyncChannel.postMessage({ type: 'ORDER_STATUS_UPDATED', orderId: order.id, status: nextStatus });
      } catch(e) {}
    }

    context.render();
    context.attachListeners();
  } finally {
    setTimeout(() => {
      context._isSelfUpdatingOrders = false;
    }, 500);
  }
}

// Bulk Status Updates
function bulkUpdateStatus(context, nextStatus) {
  ensureOrderState(context);
  if (context.selectedOrderIds.size === 0) return;

  context._isSelfUpdatingOrders = true;

  try {
    let updatedCount = 0;
    let restockedAny = false;

    context.selectedOrderIds.forEach(orderId => {
      const order = context.orders.find(o => o.id === orderId);
      if (order) {
        const originalStatus = order.status;
        if (originalStatus === nextStatus) return;

        order.status = nextStatus;
        order.updatedAt = new Date().toISOString();
        updatedCount++;

        // Targeted Cloud Update
        updateOrderInSupabase(order.id, { status: nextStatus })
          .catch(err => console.warn('[Supabase Bulk Cloud Update Notice]:', err));

        // Restock on Bulk Cancel
        if (nextStatus === 'Cancelled' && originalStatus !== 'Cancelled') {
          (order.products || []).forEach(item => {
            const qty = parseFloat(item.quantity) || 1;
            const catalogProd = (context.products || []).find(p => p.id === item.id);
            if (catalogProd) {
              catalogProd.stock = (parseFloat(catalogProd.stock) || 0) + qty;
              restockedAny = true;
            }
          });
        }

        // Mystery box award on delivery
        if (['done', 'livré', 'delivered'].includes(nextStatus.toLowerCase()) && !['done', 'livré', 'delivered'].includes((originalStatus || '').toLowerCase())) {
          awardMysteryBoxForDeliveredOrder(order);
        }
      }
    });

    if (updatedCount > 0) {
      context.saveDatabase('orders');
      if (restockedAny) context.saveDatabase('products');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Updated ${updatedCount} orders to: ${nextStatus}` }));
    }

    context.selectedOrderIds.clear();
    context.render();
    context.attachListeners();
  } finally {
    setTimeout(() => {
      context._isSelfUpdatingOrders = false;
    }, 500);
  }
}

// Export Orders to CSV
function exportOrdersToCSV(orders) {
  if (!orders || orders.length === 0) {
    window.dispatchEvent(new CustomEvent('toast:show', { detail: 'No orders to export.' }));
    return;
  }

  const cleanCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
    return `"${str}"`;
  };

  const headers = ['Order ID', 'Date', 'Customer Name', 'Customer Email', 'Customer Phone', 'Address', 'Items', 'Total (CFA)', 'Status', 'Payment Method', 'Tracking Number'];
  const rows = orders.map(o => [
    cleanCell(o.id || o.order_number),
    cleanCell(o.date),
    cleanCell(o.customerName),
    cleanCell(o.customerEmail || o.email),
    cleanCell(o.customerPhone),
    cleanCell(typeof o.customerAddress === 'string' ? o.customerAddress : (o.customerAddress?.street || '')),
    cleanCell(typeof o.items === 'string' ? o.items : (o.products || []).map(p => `${p.name} (x${p.quantity || 1})`).join(', ')),
    cleanCell(o.total || 0),
    cleanCell(o.status),
    cleanCell(o.paymentMethod || 'COD'),
    cleanCell(o.trackingNumber)
  ]);

  const csvText = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `SWEETOS_Orders_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Global Receipt & Invoice Generator
function printOrderReceipt(order) {
  const printWindow = window.open('', '_blank', 'width=800,height=900,noopener=false');
  if (!printWindow) return;

  const storeName = escapeHtml(sessionStorage.getItem('SWEETOS_store_name') || 'SWEETOS');
  const storePhone = escapeHtml(sessionStorage.getItem('SWEETOS_store_phone') || '+225 05 00 61 99 23');
  const storeEmail = escapeHtml(sessionStorage.getItem('SWEETOS_store_email') || 'support@sweetos.com');
  const storeAddress = escapeHtml(sessionStorage.getItem('SWEETOS_store_addr') || 'Abidjan, Cocody Mermoz');

  const prods = order.products || [];
  let subtotal = 0;
  let itemsHtml = prods.map(p => {
    const pQty = parseFloat(p.quantity) || 1;
    const pPrice = parseFloat(p.price) || 0;
    const itemTotal = pPrice * pQty;
    subtotal += itemTotal;
    return `
      <tr>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; font-size:13px; font-weight:700; color:#1e293b;">${escapeHtml(p.name)}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:center; color:#64748b;">${formatPrice(pPrice)}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:center; color:#64748b;">${pQty}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:800; color:#0052cc;">${formatPrice(itemTotal)}</td>
      </tr>
    `;
  }).join('');

  const orderTotal = parseFloat(order.total) || 0;
  const deliveryFee = orderTotal - subtotal > 0 ? formatPrice(orderTotal - subtotal) : 'Gratuit';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Facture Commande #${escapeHtml(order.id)}</title>
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
            <strong style="color:#0052cc; font-size:15px;">#${escapeHtml(order.id)}</strong>
            <small style="display:block; color:#64748b; font-size:11.5px; margin-top:2px;">Date: ${escapeHtml(order.date || 'N/A')}</small>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:28px; background:#f8fafc; padding:18px; border-radius:14px; border:1px solid #f1f5f9;">
          <div>
            <span style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Facturé à / Customer</span>
            <h4 style="margin:4px 0; font-size:14px; color:#0f172a;">${escapeHtml(order.customerName || 'Client Invité')}</h4>
            <p style="margin:0; font-size:12.5px; color:#64748b; line-height:1.4;">
              Tél: ${escapeHtml(order.customerPhone || 'N/A')}<br>
              Email: ${escapeHtml(order.customerEmail || 'N/A')}<br>
              Adresse: ${escapeHtml(typeof order.customerAddress === 'string' ? order.customerAddress : (order.customerAddress?.street || 'Ivory Coast'))}
            </p>
          </div>
          <div>
            <span style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Fulfillment Details</span>
            <p style="margin:4px 0 0 0; font-size:12.5px; color:#64748b; line-height:1.5;">
              Mode de paiement: <strong style="color:#0f172a; text-transform:uppercase;">${escapeHtml(order.paymentMethod || 'COD')}</strong><br>
              Statut: <strong style="color:#0052cc;">${escapeHtml(order.status)}</strong><br>
              Suivi #: <strong>${escapeHtml(order.trackingNumber || 'En attente')}</strong>
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
            <strong>${deliveryFee}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:900; color:#0052cc; border-top:1.5px solid #e2e8f0; padding-top:8px; margin-top:4px;">
            <span>Total Général:</span>
            <span>${formatPrice(orderTotal)}</span>
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
  if (!orders || orders.length === 0) return;
  const printWindow = window.open('', '_blank', 'width=800,height=900,noopener=false');
  if (!printWindow) return;

  const storeName = escapeHtml(sessionStorage.getItem('SWEETOS_store_name') || 'SWEETOS');
  const storePhone = escapeHtml(sessionStorage.getItem('SWEETOS_store_phone') || '+225 05 00 61 99 23');
  const storeEmail = escapeHtml(sessionStorage.getItem('SWEETOS_store_email') || 'support@sweetos.com');
  const storeAddress = escapeHtml(sessionStorage.getItem('SWEETOS_store_addr') || 'Abidjan, Cocody Mermoz');

  const invoicesHtml = orders.map((order, idx) => {
    const prods = order.products || [];
    let subtotal = 0;
    let itemsHtml = prods.map(p => {
      const pQty = parseFloat(p.quantity) || 1;
      const pPrice = parseFloat(p.price) || 0;
      const itemTotal = pPrice * pQty;
      subtotal += itemTotal;
      return `
        <tr>
          <td style="padding:12px; border-bottom:1px solid #e2e8f0; font-size:13px; font-weight:700; color:#1e293b;">${escapeHtml(p.name)}</td>
          <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:center; color:#64748b;">${formatPrice(pPrice)}</td>
          <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:center; color:#64748b;">${pQty}</td>
          <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:800; color:#0052cc;">${formatPrice(itemTotal)}</td>
        </tr>
      `;
    }).join('');

    const orderTotal = parseFloat(order.total) || 0;
    const deliveryFee = orderTotal - subtotal > 0 ? formatPrice(orderTotal - subtotal) : 'Gratuit';
    const isLast = idx === orders.length - 1;
    const pageBreak = isLast ? '' : '<div class="page-break" style="page-break-after: always; height: 0;"></div>';

    return `
      <div class="receipt-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:30px; border-bottom:1.5px solid #f1f5f9; padding-bottom:20px;">
          <div>
            <h1 style="margin:0; font-size:26px; color:#0052cc; font-weight:900;">${storeName}</h1>
            <p style="margin:4px 0 0 0; font-size:12.5px; color:#64748b; line-height:1.4;">${storeAddress}<br>Tél: ${storePhone} | Email: ${storeEmail}</p>
          </div>
          <div style="text-align:right;">
            <span style="font-size:18px; font-weight:850; color:#0f172a; display:block;">COMMERCIAL INVOICE</span>
            <strong style="color:#0052cc; font-size:15px;">#${escapeHtml(order.id)}</strong>
            <small style="display:block; color:#64748b; font-size:11.5px; margin-top:2px;">Date: ${escapeHtml(order.date || 'N/A')}</small>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:28px; background:#f8fafc; padding:18px; border-radius:14px; border:1px solid #f1f5f9;">
          <div>
            <span style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Facturé à / Customer</span>
            <h4 style="margin:4px 0; font-size:14px; color:#0f172a;">${escapeHtml(order.customerName || 'Client Invité')}</h4>
            <p style="margin:0; font-size:12.5px; color:#64748b; line-height:1.4;">
              Tél: ${escapeHtml(order.customerPhone || 'N/A')}<br>
              Email: ${escapeHtml(order.customerEmail || 'N/A')}<br>
              Adresse: ${escapeHtml(typeof order.customerAddress === 'string' ? order.customerAddress : (order.customerAddress?.street || 'Ivory Coast'))}
            </p>
          </div>
          <div>
            <span style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Fulfillment Details</span>
            <p style="margin:4px 0 0 0; font-size:12.5px; color:#64748b; line-height:1.5;">
              Mode de paiement: <strong style="color:#0f172a; text-transform:uppercase;">${escapeHtml(order.paymentMethod || 'COD')}</strong><br>
              Statut: <strong style="color:#0052cc;">${escapeHtml(order.status)}</strong><br>
              Suivi #: <strong>${escapeHtml(order.trackingNumber || 'En attente')}</strong>
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
            <strong>${deliveryFee}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:900; color:#0052cc; border-top:1.5px solid #e2e8f0; padding-top:8px; margin-top:4px;">
            <span>Total Général:</span>
            <span>${formatPrice(orderTotal)}</span>
          </div>
        </div>

        <div style="text-align:center; font-size:12px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:16px;">
          Merci pour votre confiance chez <strong>${storeName}</strong> !
        </div>
      </div>
      ${pageBreak}
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Factures Commandes (${orders.length})</title>
      <meta charset="utf-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        body { font-family: 'Outfit', sans-serif; margin: 0; padding: 40px; color: #1e293b; }
        .receipt-card { max-width: 680px; margin: 0 auto 30px auto; border: 1.5px solid #e2e8f0; border-radius: 20px; padding: 32px; }
        @media print {
          body { padding: 0; }
          .receipt-card { border: none; padding: 0; margin-bottom: 0; }
          .page-break { page-break-after: always; height: 0; }
        }
      </style>
    </head>
    <body>
      ${invoicesHtml}
      <script>
        window.onload = function() { setTimeout(function() { window.print(); }, 250); };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
