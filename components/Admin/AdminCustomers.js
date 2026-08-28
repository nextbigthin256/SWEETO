import { formatPrice, getProfileStorageKey } from '../../utils/storage.js';
import { CUSTOMER_LEVELS, VERIFIED_BADGES, renderVerificationBadge, renderLevelPill, getCustomerLevel, grantBadgeReward, notifyCustomerAchievement, getCustomerAvatarStyle, renderLevelChevronV } from '../../utils/badges.js';

let selectedCustomerEmails = new Set();
let tierFilter = 'All'; // 'All' | 'vip' | 'active' | 'new'
let sortBy = 'spent_high';

export function renderAdminCustomers(context) {
  if (context.selectedCustomerEmail) {
    return renderAdminCustomerProfile(context);
  }

  const query = (context.searchQuery || '').toLowerCase().trim();
  const rawCustomers = context.customers || [];
  const rawOrders = context.orders || [];

  // Enhance customer objects with live order stats & level
  const enrichedCustomers = rawCustomers.map(c => {
    const custOrders = rawOrders.filter(o => o.customerEmail && o.customerEmail.toLowerCase() === (c.email || '').toLowerCase());
    const ordersCount = custOrders.length > 0 ? custOrders.length : (c.ordersCount || 0);
    const totalSpent = custOrders.length > 0 
      ? custOrders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
      : (c.totalSpent || 0);
    const isVip = totalSpent >= 100000;
    const levelInfo = getCustomerLevel(totalSpent, c.level);
    return {
      ...c,
      ordersCount,
      totalSpent,
      isVip,
      level: c.level || levelInfo.id,
      badgeType: c.badgeType || (isVip ? 'gold_verified' : (ordersCount > 0 ? 'blue_verified' : 'none')),
      custOrders
    };
  });

  // Filter customers
  let filtered = enrichedCustomers.filter(c => {
    if (query) {
      const matchName = (c.name || '').toLowerCase().includes(query);
      const matchEmail = (c.email || '').toLowerCase().includes(query);
      const matchPhone = (c.phone || '').toLowerCase().includes(query);
      const matchAddr = (c.addresses || []).some(a => a.toLowerCase().includes(query));
      if (!matchName && !matchEmail && !matchPhone && !matchAddr) return false;
    }
    if (tierFilter === 'vip' && !c.isVip) return false;
    if (tierFilter === 'active' && c.ordersCount === 0) return false;
    if (tierFilter === 'new' && c.ordersCount > 0) return false;
    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (sortBy === 'spent_high') return (b.totalSpent || 0) - (a.totalSpent || 0);
    if (sortBy === 'spent_low') return (a.totalSpent || 0) - (b.totalSpent || 0);
    if (sortBy === 'orders_high') return (b.ordersCount || 0) - (a.ordersCount || 0);
    if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    return 0;
  });

  // Metrics calculations
  const totalCount = enrichedCustomers.length;
  const activeCount = enrichedCustomers.filter(c => c.ordersCount > 0).length;
  const vipCount = enrichedCustomers.filter(c => c.isVip).length;
  const totalSpentAll = enrichedCustomers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  const avgSpent = totalCount > 0 ? Math.round(totalSpentAll / totalCount) : 0;

  // Pagination bounds
  const totalItems = filtered.length;
  const itemsPerPage = context.itemsPerPage || 10;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const currentPage = Math.min(context.currentPageIndex || 1, totalPages);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = filtered.slice(startIndex, startIndex + itemsPerPage);

  const allSelected = paginatedList.length > 0 && paginatedList.every(c => selectedCustomerEmails.has(c.email));

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'CU';
  };

  return `
    <style>
      .customer-kpi-grid {
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
      .customer-toolbar {
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
      .customer-table-container {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      }
      .customer-row-hover:hover {
        background-color: rgba(241, 245, 249, 0.6) !important;
      }
      .avatar-badge {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: linear-gradient(135deg, #0052cc 0%, #00b4d8 100%);
        color: white;
        font-weight: 850;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 82, 204, 0.2);
        flex-shrink: 0;
      }
      .vip-tag {
        font-size: 10px;
        font-weight: 850;
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
        padding: 2px 6px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        gap: 3px;
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
        text-decoration: none;
      }
      .action-icon-btn:hover {
        background: #0052cc;
        color: #ffffff;
        border-color: #0052cc;
        transform: translateY(-1px);
      }
      .whatsapp-btn:hover {
        background: #25d366 !important;
        color: #ffffff !important;
        border-color: #25d366 !important;
      }
    </style>

    <!-- 1. Customer Metrics / KPI Cards -->
    <div class="customer-kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(0, 82, 204, 0.1); color: #0052cc;">👥</div>
        <div>
          <span class="kpi-title">Registered Clients</span>
          <span class="kpi-val">${totalCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(34, 197, 94, 0.1); color: #16a34a;">🛍️</div>
        <div>
          <span class="kpi-title">Active Buyers</span>
          <span class="kpi-val" style="color: #16a34a;">${activeCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(245, 158, 11, 0.12); color: #d97706;">👑</div>
        <div>
          <span class="kpi-title">VIP Spenders (>100k)</span>
          <span class="kpi-val" style="color: #d97706;">${vipCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(99, 102, 241, 0.1); color: #6366f1;">💎</div>
        <div>
          <span class="kpi-title">Average LTV Spend</span>
          <span class="kpi-val" style="color: #6366f1; font-size: 19px;">${formatPrice(avgSpent)}</span>
        </div>
      </div>
    </div>

    <!-- 2. Toolbar & Multi-Filters -->
    <div class="customer-toolbar">
      <div class="filter-controls-group">
        <!-- Live Instant Search -->
        <div class="clean-search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="customer-search-input" name="cust_search_query" placeholder="Search customer name, email, phone, city..." value="${context.searchQuery || ''}" autocomplete="off" spellcheck="false">
        </div>

        <!-- Tier Filter -->
        <select class="select-filter-btn" id="customer-tier-select" title="Filter tier">
          <option value="All" ${tierFilter === 'All' ? 'selected' : ''}>👥 All Customers</option>
          <option value="vip" ${tierFilter === 'vip' ? 'selected' : ''}>👑 VIP Clients (> 100k CFA)</option>
          <option value="active" ${tierFilter === 'active' ? 'selected' : ''}>🛍️ Active Buyers (1+ Orders)</option>
          <option value="new" ${tierFilter === 'new' ? 'selected' : ''}>🆕 New / No Orders</option>
        </select>

        <!-- Sorting -->
        <select class="select-filter-btn" id="customer-sort-select" title="Sort customers">
          <option value="spent_high" ${sortBy === 'spent_high' ? 'selected' : ''}>💰 Total Spent: High to Low</option>
          <option value="spent_low" ${sortBy === 'spent_low' ? 'selected' : ''}>💵 Total Spent: Low to High</option>
          <option value="orders_high" ${sortBy === 'orders_high' ? 'selected' : ''}>📦 Orders: High to Low</option>
          <option value="name_asc" ${sortBy === 'name_asc' ? 'selected' : ''}>🔤 Name: A to Z</option>
        </select>
      </div>

      <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <button class="admin-btn admin-btn-danger" id="wipe-all-customers-btn" style="display:flex; align-items:center; gap:6px; padding:9px 16px; font-weight:800; font-size:13px; background:#dc2626; border-radius:10px; cursor:pointer;" title="Permanently delete ALL customer accounts and profiles">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span>🔥 Delete All Accounts (0 Clients)</span>
        </button>

        <button class="select-filter-btn" id="export-customers-csv-btn" style="background:#f8fafc; display:flex; align-items:center; gap:6px;">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Export CSV</span>
        </button>
      </div>
    </div>

    <!-- 3. Bulk Actions Bar -->
    ${selectedCustomerEmails.size > 0 ? `
      <div class="bulk-action-bar">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-weight:800; font-size:13.5px;">✓ ${selectedCustomerEmails.size} customer${selectedCustomerEmails.size > 1 ? 's' : ''} selected</span>
          <button class="bulk-btn" id="bulk-deselect-cust-btn" style="background:transparent; border:none; text-decoration:underline; font-size:12px; cursor:pointer;">Clear</button>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button class="bulk-btn" id="bulk-email-cust-btn">✉️ Compose Email</button>
          <button class="bulk-btn" id="bulk-export-selected-cust-btn">📄 Export Selected</button>
          <button class="bulk-btn bulk-btn-danger" id="bulk-delete-cust-btn" style="background:#dc2626; color:white;">🗑️ Delete Selected Accounts</button>
        </div>
      </div>
    ` : ''}

    <!-- 4. Customers Data Table -->
    <div class="customer-table-container">
      <div class="table-wrapper">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0;">
              <th style="padding:12px 16px; width:36px; text-align:center;">
                <input type="checkbox" id="select-all-customers-cb" ${allSelected ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
              </th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Customer</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Contact & Phone</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Orders Placed</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Total Lifetime Spend</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Member Since</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paginatedList.length === 0 ? `
              <tr>
                <td colspan="7" style="padding:48px 20px; text-align:center; color:#94a3b8;">
                  <div style="font-size:36px; margin-bottom:8px;">🔍</div>
                  <strong style="font-size:15px; color:#475569; display:block;">No matching customers found</strong>
                  <span style="font-size:13px;">Try adjusting your search query or filter.</span>
                </td>
              </tr>
            ` : paginatedList.map(c => {
              const isChecked = selectedCustomerEmails.has(c.email);
              const cleanPhone = (c.phone || '').replace(/[^0-9+]/g, '');
              const waLink = cleanPhone ? `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(`Bonjour ${c.name}, nous vous contactons depuis le service client SWEETOS.`)}` : null;

              return `
                <tr class="customer-row-hover" style="border-bottom:1px solid #e2e8f0; ${isChecked ? 'background:#eff6ff !important;' : ''}">
                  <td style="padding:14px 16px; text-align:center;">
                    <input type="checkbox" class="cust-select-cb" data-customer-email="${c.email}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
                  </td>
                  <td style="padding:14px 16px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                      <div class="avatar-badge" style="${getCustomerAvatarStyle(c, 36).style}">
                        ${c.avatar ? '' : getInitials(c.name)}
                      </div>
                      <div style="display:flex; flex-direction:column; gap:3px;">
                        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                          <a href="#" class="view-cust-link" data-customer-email="${c.email}" style="font-size:14px; font-weight:850; color:#0f172a; text-decoration:none;">
                            ${c.name}
                          </a>
                          ${renderVerificationBadge(c.badgeType, 16)}
                          ${renderLevelPill(c.level)}
                        </div>
                        <code style="font-size:11.5px; color:#64748b;">${c.email}</code>
                      </div>
                    </div>
                  </td>
                  <td style="padding:14px 16px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:13px; font-weight:600; color:#334155;">${c.phone || 'N/A'}</span>
                      ${waLink ? `
                        <a href="${waLink}" target="_blank" rel="noopener" class="action-icon-btn whatsapp-btn" style="width:24px; height:24px; font-size:12px;" title="Chat on WhatsApp">
                          💬
                        </a>
                      ` : ''}
                    </div>
                  </td>
                  <td style="padding:14px 16px;">
                    <span class="status-badge ${c.ordersCount > 0 ? 'status-blue' : 'status-yellow'}" style="font-weight:750;">
                      ${c.ordersCount} order${c.ordersCount !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td style="padding:14px 16px;">
                    <strong style="color:#0f172a; font-size:14px; font-weight:850;">
                      ${formatPrice(c.totalSpent)}
                    </strong>
                  </td>
                  <td style="padding:14px 16px;">
                    <span style="color:#64748b; font-size:12.5px; font-weight:600;">${c.registrationDate || '2026'}</span>
                  </td>
                  <td style="padding:14px 16px; text-align:right;">
                    <div style="display:inline-flex; align-items:center; gap:6px;">
                      <button class="view-customer-profile-btn admin-btn admin-btn-secondary" data-customer-email="${c.email}" style="padding:6px 12px; font-size:12px; font-weight:750;">
                        <span>View Profile</span>
                      </button>
                      <button class="delete-customer-btn admin-btn admin-btn-danger" data-customer-email="${c.email}" data-customer-name="${c.name}" style="padding:6px 10px; font-size:12px; font-weight:750; background:#dc2626;" title="Permanently delete this account">
                        <span>🗑️</span>
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
      <div class="pagination-footer" style="padding:14px 20px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <span class="pagination-info" style="font-size:13px; color:#64748b; font-weight:600;">
          Showing <strong>${totalItems === 0 ? 0 : startIndex + 1}</strong> to <strong>${Math.min(startIndex + itemsPerPage, totalItems)}</strong> of <strong>${totalItems}</strong> customers
        </span>
        <div class="pagination-buttons" style="display:flex; align-items:center; gap:8px;">
          <button class="pag-btn" id="prev-customer-page" ${currentPage <= 1 ? 'disabled' : ''} style="padding:6px 14px; border-radius:8px; border:1px solid #cbd5e1; background:#ffffff; font-size:12.5px; font-weight:700; cursor:pointer;">Previous</button>
          <span style="font-size:13px; font-weight:750; color:#334155; padding:0 6px;">${currentPage} / ${totalPages}</span>
          <button class="pag-btn" id="next-customer-page" ${currentPage >= totalPages ? 'disabled' : ''} style="padding:6px 14px; border-radius:8px; border:1px solid #cbd5e1; background:#ffffff; font-size:12.5px; font-weight:700; cursor:pointer;">Next</button>
        </div>
      </div>
    </div>
  `;
}

export function renderAdminCustomerProfile(context) {
  const rawCustomers = context.customers || [];
  const rawOrders = context.orders || [];
  const customer = rawCustomers.find(c => c.email === context.selectedCustomerEmail);
  if (!customer) return `<div class="error-text">Customer not found.</div>`;

  const customerOrders = rawOrders.filter(o => o.customerEmail && o.customerEmail.toLowerCase() === customer.email.toLowerCase());
  const totalSpent = customerOrders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  const cleanPhone = (customer.phone || '').replace(/[^0-9+]/g, '');
  const waLink = cleanPhone ? `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(`Bonjour ${customer.name}, nous vous contactons concernant votre compte SWEETOS.`)}` : null;

  const currentLevel = customer.level || (totalSpent >= 100000 ? 'gold' : (customerOrders.length > 0 ? 'silver' : 'bronze'));
  const currentBadge = customer.badgeType || (totalSpent >= 100000 ? 'gold_verified' : (customerOrders.length > 0 ? 'blue_verified' : 'none'));

  return `
    <!-- Back to Directory Navigation -->
    <div style="margin-bottom: 20px;">
      <button class="back-to-list-btn" id="back-to-customers-list-btn" style="display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.7); border:1px solid #cbd5e1; padding:8px 16px; border-radius:10px; font-size:13px; font-weight:750; color:#334155; cursor:pointer;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        <span>Back to Customers Directory</span>
      </button>
    </div>

    <!-- 2-Column Responsive Layout -->
    <div style="display:grid; grid-template-columns: minmax(320px, 380px) 1fr; gap:20px; align-items:start;">
      
      <!-- Left Column: Customer Profile & Contact Card -->
      <div class="glass-panel" style="padding:24px; border-radius:16px; background:rgba(255,255,255,0.85); border:1px solid rgba(226,232,240,0.9); display:flex; flex-direction:column; gap:18px;">
        <div style="display:flex; align-items:center; gap:16px; border-bottom:1px solid #e2e8f0; padding-bottom:18px;">
          <div style="position:relative; width:64px; height:64px; flex-shrink:0; display:inline-flex; align-items:center; justify-content:center;">
            <div style="width:64px; height:64px; border-radius:50%; font-size:22px; font-weight:850; display:flex; align-items:center; justify-content:center; ${getCustomerAvatarStyle(customer, 64).style}">
              ${customer.avatar ? '' : customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            ${renderLevelChevronV(customer, 22)}
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <h3 style="margin:0; font-size:18px; font-weight:850; color:#0f172a;">${customer.name}</h3>
              ${renderVerificationBadge(currentBadge, 18)}
            </div>
            <div style="margin-top:4px; display:flex; align-items:center; gap:6px;">
              ${renderLevelPill(currentLevel)}
              <span style="font-size:11.5px; color:#64748b; font-weight:600;">Since ${customer.registrationDate || '2026'}</span>
            </div>
          </div>
        </div>

        <!-- Loyalty Level & Verification Badge Management -->
        <div style="background:#f8fafc; padding:16px; border-radius:14px; border:1.5px solid #e2e8f0; display:flex; flex-direction:column; gap:12px;">
          <h4 style="margin:0; font-size:12.5px; font-weight:850; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:6px;">
            <span>🎖️</span> Loyalty Level & Verification Badges
          </h4>

          <!-- Level Selector -->
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label style="font-size:11.5px; font-weight:750; color:#475569;">Customer Tier / Level:</label>
            <select id="admin-cust-level-select" style="padding:8px 12px; border-radius:8px; border:1px solid #cbd5e1; background:white; font-size:13px; font-weight:600; color:#0f172a;">
              <option value="starter" ${currentLevel === 'starter' || currentLevel === 'bronze' ? 'selected' : ''}>🥉 Nouveau Client (0 - 49k FCFA)</option>
              <option value="level_1" ${currentLevel === 'level_1' || currentLevel === 'silver' ? 'selected' : ''}>🥈 Niveau 1 (50k+ FCFA) • 1% Coupon</option>
              <option value="level_2" ${currentLevel === 'level_2' || currentLevel === 'gold' ? 'selected' : ''}>🥇 Niveau 2 (100k+ FCFA) • 2% Coupon</option>
              <option value="level_3" ${currentLevel === 'level_3' || currentLevel === 'platinum' ? 'selected' : ''}>💎 Niveau 3 (500k+ FCFA) • 3% Coupon</option>
              <option value="level_4" ${currentLevel === 'level_4' || currentLevel === 'diamond' ? 'selected' : ''}>👑 Niveau 4 (1M+ FCFA) • 4% Coupon</option>
              <option value="level_5" ${currentLevel === 'level_5' ? 'selected' : ''}>🌟 Niveau 5 (1.5M+ FCFA) • 5% Coupon</option>
              <option value="level_6" ${currentLevel === 'level_6' ? 'selected' : ''}>🔥 Niveau 6 (2M+ FCFA) • 6% Coupon</option>
              <option value="level_7" ${currentLevel === 'level_7' ? 'selected' : ''}>⚡ Niveau 7 (2.5M+ FCFA) • 7% Coupon</option>
              <option value="level_8" ${currentLevel === 'level_8' ? 'selected' : ''}>🏆 Niveau 8 (3M+ FCFA) • 8% Coupon</option>
            </select>
          </div>

          <!-- Badge Selector -->
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label style="font-size:11.5px; font-weight:750; color:#475569;">Badge Principal Affiché:</label>
            <select id="admin-cust-badge-select" style="padding:8px 12px; border-radius:8px; border:1px solid #cbd5e1; background:white; font-size:13px; font-weight:600; color:#0f172a;">
              <option value="none" ${currentBadge === 'none' ? 'selected' : ''}>🚫 Aucun badge / None</option>
              <option value="blue_verified" ${currentBadge === 'blue_verified' ? 'selected' : ''}>🔵 Bleu Vérifié (Instagram / Facebook)</option>
              <option value="gold_verified" ${currentBadge === 'gold_verified' ? 'selected' : ''}>🟡 Or VIP Vérifié (Twitter / Royal)</option>
              <option value="tiktok_verified" ${currentBadge === 'tiktok_verified' ? 'selected' : ''}>🎵 TikTok Néon Gradient</option>
              <option value="purple_diamond" ${currentBadge === 'purple_diamond' ? 'selected' : ''}>💎 Diamant VIP Pur</option>
              <option value="green_trusted" ${currentBadge === 'green_trusted' ? 'selected' : ''}>🟢 Vert Acheteur Certifié</option>
            </select>
          </div>

          <!-- Multi-Badge Checklist (5 Badges = 25 Uses) -->
          <div style="background:white; border:1px solid #cbd5e1; border-radius:10px; padding:10px;">
            <div style="font-size:11px; font-weight:800; color:#0f172a; text-transform:uppercase; margin-bottom:6px;">
              🎖️ Débloquer les 5 Badges (+5 uses/badge) :
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              ${[
                { id: 'blue_verified', label: '🔵 Bleu Vérifié' },
                { id: 'gold_verified', label: '🟡 Or VIP Vérifié' },
                { id: 'tiktok_verified', label: '🎵 TikTok Néon' },
                { id: 'purple_diamond', label: '💎 Diamant VIP' },
                { id: 'green_trusted', label: '🟢 Vert Acheteur' }
              ].map(b => {
                const isUnlocked = customer.unlockedBadges?.includes(b.id) || currentBadge === b.id;
                return `
                  <label style="display:flex; align-items:center; justify-content:space-between; font-size:11.5px; font-weight:600; color:#334155; cursor:pointer;">
                    <span style="display:flex; align-items:center; gap:6px;">
                      <input type="checkbox" class="admin-cust-badge-cb" value="${b.id}" ${isUnlocked ? 'checked' : ''} style="accent-color:#0052cc; cursor:pointer;">
                      ${b.label}
                    </span>
                    <span style="font-size:10px; color:#059669; font-weight:700;">+5 uses</span>
                  </label>
                `;
              }).join('')}
            </div>
            <button type="button" id="admin-cust-unlock-all-badges-btn" style="width:100%; margin-top:8px; padding:6px; background:#eff6ff; border:1px dashed #0066ff; border-radius:8px; color:#0052cc; font-size:11px; font-weight:800; cursor:pointer;">
              ✨ Débloquer les 5 Badges (25 Utilisations)
            </button>
          </div>

          <button id="admin-save-cust-badge-btn" data-customer-email="${customer.email}" class="admin-btn admin-btn-primary" style="padding:9px; font-weight:800; font-size:12.5px; margin-top:2px;">
            💾 Save Level & Badges
          </button>
        </div>

        <!-- Quick Contact Actions -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          ${waLink ? `
            <a href="${waLink}" target="_blank" rel="noopener" style="display:flex; align-items:center; justify-content:center; gap:6px; background:#25d366; color:white; padding:10px; border-radius:10px; font-size:12.5px; font-weight:800; text-decoration:none;">
              <span>💬 WhatsApp</span>
            </a>
          ` : ''}
          <a href="mailto:${customer.email}" style="display:flex; align-items:center; justify-content:center; gap:6px; background:#0052cc; color:white; padding:10px; border-radius:10px; font-size:12.5px; font-weight:800; text-decoration:none;">
            <span>✉️ Email</span>
          </a>
        </div>

        <!-- Info Fields -->
        <div style="display:flex; flex-direction:column; gap:12px; background:#f8fafc; padding:16px; border-radius:12px; border:1px solid #e2e8f0; font-size:13px;">
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#64748b; font-weight:600;">Email:</span>
            <code style="font-weight:750; color:#0052cc;">${customer.email}</code>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#64748b; font-weight:600;">Phone:</span>
            <strong style="color:#0f172a;">${customer.phone || 'N/A'}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#64748b; font-weight:600;">Total Orders:</span>
            <strong style="color:#0f172a;">${customerOrders.length}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#64748b; font-weight:600;">Gross Lifetime Spent:</span>
            <strong style="color:#16a34a; font-size:14px;">${formatPrice(totalSpent)}</strong>
          </div>
        </div>

        <!-- Delivery Addresses -->
        <div>
          <h4 style="margin:0 0 8px 0; font-size:13px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">📍 Saved Delivery Addresses</h4>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${(customer.addresses || []).length === 0 ? `
              <small style="color:#94a3b8;">No saved addresses on file.</small>
            ` : customer.addresses.map(a => `
              <div style="padding:8px 12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; font-size:12.5px; color:#334155;">
                ${a}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Danger Zone: Permanent Account Deletion -->
        <div style="border-top: 1px solid #fee2e2; padding-top: 14px;">
          <button class="delete-customer-btn admin-btn admin-btn-danger" data-customer-email="${customer.email}" data-customer-name="${customer.name}" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; background: #dc2626; border-radius: 10px; font-weight: 800; font-size: 13px;">
            <span>🗑️ Permanently Delete Customer Account</span>
          </button>
        </div>
      </div>

      <!-- Right Column: Orders & Purchase History -->
      <div class="glass-panel" style="padding:24px; border-radius:16px; background:rgba(255,255,255,0.85); border:1px solid rgba(226,232,240,0.9);">
        <h3 style="margin:0 0 16px 0; font-size:16px; font-weight:850; color:#0f172a; border-bottom:1px solid #e2e8f0; padding-bottom:12px;">
          📦 Order Purchase History (${customerOrders.length})
        </h3>
        
        <div class="table-wrapper">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0;">
                <th style="padding:10px 14px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Order ID</th>
                <th style="padding:10px 14px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Date</th>
                <th style="padding:10px 14px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Amount</th>
                <th style="padding:10px 14px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Status</th>
                <th style="padding:10px 14px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase; text-align:right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${customerOrders.length === 0 ? `
                <tr>
                  <td colspan="5" style="padding:32px 14px; text-align:center; color:#94a3b8;">No orders recorded for this customer.</td>
                </tr>
              ` : customerOrders.map(o => `
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:12px 14px;">
                    <strong style="color:#0052cc; font-size:13px;">${o.id}</strong>
                  </td>
                  <td style="padding:12px 14px; font-size:12.5px; color:#64748b; font-weight:600;">
                    ${o.date}
                  </td>
                  <td style="padding:12px 14px; font-size:13.5px; font-weight:850; color:#0f172a;">
                    ${formatPrice(o.total)}
                  </td>
                  <td style="padding:12px 14px;">
                    <span class="status-badge ${o.status === 'Delivered' || o.status === 'Livré' ? 'status-green' : (o.status === 'Cancelled' ? 'status-red' : 'status-blue')}">
                      ${o.status}
                    </span>
                  </td>
                  <td style="padding:12px 14px; text-align:right;">
                    <button class="view-order-details-btn admin-btn admin-btn-secondary" data-order-id="${o.id}" style="padding:5px 12px; font-size:11.5px; font-weight:750;">
                      View Order
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

export function attachAdminCustomersListeners(context, shadow) {
  // 1. Search Input
  const searchInput = shadow.getElementById('customer-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      context.searchQuery = e.target.value;
      context.currentPageIndex = 1;
      context.render();
      context.attachListeners();
      const sRef = shadow.getElementById('customer-search-input');
      if (sRef) {
        sRef.focus();
        sRef.setSelectionRange(sRef.value.length, sRef.value.length);
      }
    });
  }

  // 2. Tier Filter
  const tierSelect = shadow.getElementById('customer-tier-select');
  if (tierSelect) {
    tierSelect.addEventListener('change', (e) => {
      tierFilter = e.target.value;
      context.currentPageIndex = 1;
      context.render();
      context.attachListeners();
    });
  }

  // 3. Sorting
  const sortSelect = shadow.getElementById('customer-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      context.render();
      context.attachListeners();
    });
  }

  // 4. View Profile Triggers
  shadow.querySelectorAll('.view-customer-profile-btn, .view-cust-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      context.selectedCustomerEmail = btn.getAttribute('data-customer-email');
      context.render();
      context.attachListeners();
    });
  });

  // Back to list
  const backBtn = shadow.getElementById('back-to-customers-list-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      context.selectedCustomerEmail = null;
      context.render();
      context.attachListeners();
    });
  }

  // 5. Checkboxes & Bulk Selection
  const selectAllCb = shadow.getElementById('select-all-customers-cb');
  if (selectAllCb) {
    selectAllCb.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      shadow.querySelectorAll('.cust-select-cb').forEach(cb => {
        const email = cb.getAttribute('data-customer-email');
        if (isChecked) selectedCustomerEmails.add(email);
        else selectedCustomerEmails.delete(email);
      });
      context.render();
      context.attachListeners();
    });
  }

  shadow.querySelectorAll('.cust-select-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const email = cb.getAttribute('data-customer-email');
      if (e.target.checked) selectedCustomerEmails.add(email);
      else selectedCustomerEmails.delete(email);
      context.render();
      context.attachListeners();
    });
  });

  const deselectBtn = shadow.getElementById('bulk-deselect-cust-btn');
  if (deselectBtn) {
    deselectBtn.addEventListener('click', () => {
      selectedCustomerEmails.clear();
      context.render();
      context.attachListeners();
    });
  }

  const bulkEmail = shadow.getElementById('bulk-email-cust-btn');
  if (bulkEmail) {
    bulkEmail.addEventListener('click', () => {
      const emails = Array.from(selectedCustomerEmails).join(',');
      window.location.href = `mailto:${emails}?subject=Message%20from%20SWEETOS%20Store`;
    });
  }

  const bulkExport = shadow.getElementById('bulk-export-selected-cust-btn');
  if (bulkExport) {
    bulkExport.addEventListener('click', () => {
      const selectedList = (context.customers || []).filter(c => selectedCustomerEmails.has(c.email));
      exportCustomersToCSV(selectedList, context.orders || []);
    });
  }

  // Wipe All Customer Accounts in 1 Click
  const wipeAllCustBtn = shadow.getElementById('wipe-all-customers-btn');
  if (wipeAllCustBtn) {
    wipeAllCustBtn.addEventListener('click', async () => {
      const total = (context.customers || []).length;
      const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
        title: '🔥 Delete All Customer Accounts',
        message: `Are you sure you want to PERMANENTLY ERASE ALL ${total} CUSTOMER ACCOUNTS?\n\nThis will remove all customer profiles, addresses, and account credentials from Localhost and Supabase cloud. This action cannot be undone.`,
        confirmText: '🔥 Yes, Delete All Accounts Forever',
        cancelText: 'Cancel',
        type: 'danger',
        icon: '👥'
      }) : Promise.resolve(confirm(`Are you sure you want to delete all ${total} customer accounts forever?`)));

      if (confirmed) {
        // 1. Purge profiles from Supabase cloud
        import('../../utils/supabase.js').then(async ({ supabase }) => {
          if (supabase) {
            await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          }
        }).catch(() => {});

        // 2. Remove all local user profile keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('SWEETOS_user_profile_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        localStorage.setItem('SWEETOS_customers', JSON.stringify([]));

        context.customers = [];
        selectedCustomerEmails.clear();
        context.selectedCustomerEmail = null;

        window.dispatchEvent(new CustomEvent('toast:show', { detail: '🔥 All customer accounts permanently deleted from store and cloud! (0 Accounts)' }));
        context.render();
        context.attachListeners();
      }
    });
  }

  // Bulk Delete Selected Customer Accounts
  const bulkDeleteCustBtn = shadow.getElementById('bulk-delete-cust-btn');
  if (bulkDeleteCustBtn) {
    bulkDeleteCustBtn.addEventListener('click', async () => {
      const count = selectedCustomerEmails.size;
      if (!count) return;

      const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
        title: '🗑️ Delete Selected Accounts',
        message: `Are you sure you want to permanently delete ${count} selected customer account${count > 1 ? 's' : ''}?`,
        confirmText: `🔥 Delete ${count} Account${count > 1 ? 's' : ''}`,
        cancelText: 'Cancel',
        type: 'danger',
        icon: '🗑️'
      }) : Promise.resolve(confirm(`Delete ${count} selected accounts?`)));

      if (confirmed) {
        const emailsArray = Array.from(selectedCustomerEmails);

        // Delete from Supabase & Revoke active sessions live
        import('../../utils/supabase.js').then(async ({ deleteCustomerFromSupabase }) => {
          for (const email of emailsArray) {
            await deleteCustomerFromSupabase(email);
          }
        }).catch(() => {});

        // Delete from localStorage
        emailsArray.forEach(email => {
          localStorage.removeItem(getProfileStorageKey(email));
          localStorage.removeItem(`SWEETOS_user_profile_${email}`);
        });

        context.customers = (context.customers || []).filter(c => !selectedCustomerEmails.has(c.email));
        selectedCustomerEmails.clear();

        window.dispatchEvent(new CustomEvent('toast:show', { detail: `🗑️ ${count} customer accounts permanently deleted.` }));
        context.render();
        context.attachListeners();
      }
    });
  }

  // Single Delete Customer Account Trigger
  shadow.querySelectorAll('.delete-customer-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const email = btn.getAttribute('data-customer-email');
      const name = btn.getAttribute('data-customer-name') || email;
      if (!email) return;

      const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
        title: '🗑️ Delete Customer Account',
        message: `Are you sure you want to permanently delete the account for "${name}" (${email})?`,
        confirmText: '🔥 Delete Account Forever',
        cancelText: 'Cancel',
        type: 'danger',
        icon: '🗑️'
      }) : Promise.resolve(confirm(`Permanently delete account for ${email}?`)));

      if (confirmed) {
        import('../../utils/supabase.js').then(async ({ deleteCustomerFromSupabase }) => {
          await deleteCustomerFromSupabase(email);
        }).catch(() => {});

        localStorage.removeItem(getProfileStorageKey(email));
        localStorage.removeItem(`SWEETOS_user_profile_${email}`);

        context.customers = (context.customers || []).filter(c => c.email && c.email.toLowerCase() !== email.toLowerCase());
        selectedCustomerEmails.delete(email);
        if (context.selectedCustomerEmail === email) {
          context.selectedCustomerEmail = null;
        }

        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Account for "${name}" deleted.` }));
        context.render();
        context.attachListeners();
      }
    });
  });

  // 6. Export to CSV
  const exportBtn = shadow.getElementById('export-customers-csv-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportCustomersToCSV(context.customers || [], context.orders || []);
    });
  }

  // 7. Pagination
  const prevBtn = shadow.getElementById('prev-customer-page');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (context.currentPageIndex > 1) {
        context.currentPageIndex--;
        context.render();
        context.attachListeners();
      }
    });
  }

  const nextBtn = shadow.getElementById('next-customer-page');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      context.currentPageIndex = (context.currentPageIndex || 1) + 1;
      context.render();
      context.attachListeners();
    });
  }

  // 8. View Order Details from Customer Profile
  shadow.querySelectorAll('.view-order-details-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.getAttribute('data-order-id');
      context.selectedOrderId = orderId;
      context.currentTab = 'orders';
      context.render();
      context.attachListeners();
    });
  });

  // Quick Unlock All 5 Badges Button
  const unlockAllCustBtn = shadow.getElementById('admin-cust-unlock-all-badges-btn');
  if (unlockAllCustBtn) {
    unlockAllCustBtn.addEventListener('click', () => {
      const cbs = shadow.querySelectorAll('.admin-cust-badge-cb');
      cbs.forEach(cb => cb.checked = true);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: '✨ Les 5 Badges ont été sélectionnés (25 utilisations 5% OFF) ! Cliquez sur Save.' }));
    });
  }

  // Save Customer Level & Badges Button
  const saveCustBadgeBtn = shadow.getElementById('admin-save-cust-badge-btn');
  if (saveCustBadgeBtn) {
    saveCustBadgeBtn.addEventListener('click', () => {
      const custEmail = saveCustBadgeBtn.getAttribute('data-customer-email');
      const selectedLevel = shadow.getElementById('admin-cust-level-select')?.value || 'bronze';
      const selectedBadge = shadow.getElementById('admin-cust-badge-select')?.value || 'none';

      // Gather all checked badges
      const checkedBadges = Array.from(shadow.querySelectorAll('.admin-cust-badge-cb:checked')).map(cb => cb.value);
      if (selectedBadge !== 'none' && !checkedBadges.includes(selectedBadge)) {
        checkedBadges.push(selectedBadge);
      }

      if (!custEmail) return;

      // Update in context.customers
      let customers = context.customers || [];
      const target = customers.find(c => c.email && c.email.toLowerCase() === custEmail.toLowerCase());
      if (target) {
        target.level = selectedLevel;
        target.badgeType = selectedBadge;
        target.unlockedBadges = checkedBadges;
      } else {
        customers.push({
          email: custEmail,
          level: selectedLevel,
          badgeType: selectedBadge,
          unlockedBadges: checkedBadges
        });
      }

      localStorage.setItem('SWEETOS_customers', JSON.stringify(customers));

      // Sync customer user profile in localStorage if matches
      try {
        const safeKey = custEmail.replace(/[^a-zA-Z0-9]/g, '_');
        const specificProfileKey = `SWEETOS_user_profile_${safeKey}`;
        let prof = JSON.parse(localStorage.getItem(specificProfileKey) || localStorage.getItem('SWEETOS_user_profile') || '{}');
        prof.level = selectedLevel;
        prof.badgeType = selectedBadge;
        prof.unlockedBadges = checkedBadges;
        localStorage.setItem(specificProfileKey, JSON.stringify(prof));
        localStorage.setItem('SWEETOS_user_profile', JSON.stringify(prof));
      } catch(e) {}

      // If badges are granted, unlock 5% OFF coupon (5 uses per badge = up to 25 uses for 5 badges)
      let rewardNotice = '';
      if (checkedBadges.length > 0) {
        const rewardObj = grantBadgeReward(custEmail, checkedBadges);
        if (rewardObj) {
          rewardNotice = ` • 🎟️ ${checkedBadges.length} Badge(s) (${rewardObj.remainingUses}/${rewardObj.totalUses} utilisations 5% OFF, sans expiration)`;
          notifyCustomerAchievement(custEmail, {
            level: selectedLevel,
            badges: checkedBadges,
            rewardUses: rewardObj.remainingUses,
            totalUses: rewardObj.totalUses,
            title: `${selectedLevel || 'Niveau Débloqué'} & ${checkedBadges.length} Badge(s) Accordés par l'Administration !`
          });
        }
      } else if (selectedLevel && selectedLevel !== 'Starter') {
        notifyCustomerAchievement(custEmail, {
          level: selectedLevel,
          badges: [],
          rewardUses: 5,
          totalUses: 5,
          title: `Niveau ${selectedLevel} Accordé par l'Administration !`
        });
      }

      // Broadcast changes
      window.dispatchEvent(new CustomEvent('profile:updated'));
      window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true } }));
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Niveau & ${checkedBadges.length} Badge(s) mis à jour avec succès !${rewardNotice} ✨` }));

      // Server sync
      fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customers)
      }).catch(err => console.error('Failed to sync updated customer badge:', err));

      context.render();
      context.attachListeners();
    });
  }
}

function exportCustomersToCSV(customers, orders) {
  if (!customers || customers.length === 0) {
    window.dispatchEvent(new CustomEvent('toast:show', { detail: 'No customers to export.' }));
    return;
  }

  const headers = ['Name', 'Email', 'Phone', 'Orders Count', 'Total Spent (CFA)', 'VIP Status', 'Registered Date'];
  const rows = customers.map(c => {
    const custOrders = orders.filter(o => o.customerEmail && o.customerEmail.toLowerCase() === (c.email || '').toLowerCase());
    const ordersCount = custOrders.length > 0 ? custOrders.length : (c.ordersCount || 0);
    const totalSpent = custOrders.length > 0 
      ? custOrders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
      : (c.totalSpent || 0);
    const isVip = totalSpent >= 100000 ? 'VIP' : 'Standard';

    return [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.email || ''}"`,
      `"${c.phone || ''}"`,
      ordersCount,
      totalSpent,
      isVip,
      `"${c.registrationDate || ''}"`
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SWEETOS_Customers_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
