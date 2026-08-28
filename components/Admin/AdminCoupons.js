import { formatPrice } from '../../utils/storage.js';

let selectedCouponCodes = new Set();
let couponTypeFilter = 'All'; // 'All' | 'percentage' | 'fixed' | 'active' | 'expired'
let sortBy = 'newest';

export function renderAdminCoupons(context) {
  const query = (context.searchQuery || '').toLowerCase().trim();
  const rawCoupons = context.coupons || [];
  const rawOrders = context.orders || [];

  // Enhance coupon with usage & stats
  const enrichedCoupons = rawCoupons.map(c => {
    const isExpired = c.expiry && new Date(c.expiry) < new Date();
    const status = isExpired ? 'expired' : (c.status || 'active');
    const used = c.used || 0;
    const limit = c.limit || 100;
    return {
      ...c,
      isExpired,
      status,
      used,
      limit
    };
  });

  // Filter coupons
  let filtered = enrichedCoupons.filter(c => {
    if (query) {
      const matchCode = (c.code || '').toLowerCase().includes(query);
      const matchType = (c.type || '').toLowerCase().includes(query);
      if (!matchCode && !matchType) return false;
    }
    if (couponTypeFilter === 'percentage' && c.type !== 'percentage') return false;
    if (couponTypeFilter === 'fixed' && c.type !== 'fixed') return false;
    if (couponTypeFilter === 'active' && c.status !== 'active') return false;
    if (couponTypeFilter === 'expired' && c.status !== 'expired') return false;
    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
    if (sortBy === 'val_high') return (b.value || 0) - (a.value || 0);
    if (sortBy === 'used_high') return (b.used || 0) - (a.used || 0);
    if (sortBy === 'code_asc') return (a.code || '').localeCompare(b.code || '');
    return 0;
  });

  // KPI Calculations
  const totalCoupons = enrichedCoupons.length;
  const activeCoupons = enrichedCoupons.filter(c => c.status === 'active').length;
  const totalUsedCount = enrichedCoupons.reduce((sum, c) => sum + (c.used || 0), 0);
  const totalDiscountsGiven = enrichedCoupons.reduce((sum, c) => sum + ((c.used || 0) * (c.type === 'percentage' ? 4500 : (c.value || 0))), 0);

  const showModal = context.showCouponModal === true;
  const editCoup = context.editingCoupon || {};
  const isEditing = context.editingCoupon !== null && context.editingCoupon !== undefined;

  const allSelected = filtered.length > 0 && filtered.every(c => selectedCouponCodes.has(c.code));

  return `
    <style>
      .coupons-kpi-grid {
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
      .coupon-toolbar {
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
      .coupon-table-container {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      }
      .coupon-row-hover:hover {
        background-color: rgba(241, 245, 249, 0.6) !important;
      }
      .coupon-code-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #eff6ff;
        border: 1.5px dashed #0052cc;
        color: #0052cc;
        padding: 4px 10px;
        border-radius: 8px;
        font-family: monospace;
        font-weight: 850;
        font-size: 13.5px;
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
      .action-icon-btn.delete-btn:hover {
        background: #ef4444;
        color: #ffffff;
        border-color: #ef4444;
      }
    </style>

    <!-- 1. Coupon KPIs -->
    <div class="coupons-kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(0, 82, 204, 0.1); color: #0052cc;">🎟️</div>
        <div>
          <span class="kpi-title">Total Promo Codes</span>
          <span class="kpi-val">${totalCoupons}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(34, 197, 94, 0.1); color: #16a34a;">🟢</div>
        <div>
          <span class="kpi-title">Active Campaigns</span>
          <span class="kpi-val" style="color: #16a34a;">${activeCoupons}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(245, 158, 11, 0.12); color: #d97706;">⚡</div>
        <div>
          <span class="kpi-title">Redemptions Used</span>
          <span class="kpi-val" style="color: #d97706;">${totalUsedCount} times</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6;">🎁</div>
        <div>
          <span class="kpi-title">Customer Savings</span>
          <span class="kpi-val" style="color: #8b5cf6; font-size: 19px;">${formatPrice(totalDiscountsGiven)}</span>
        </div>
      </div>
    </div>

    <!-- 2. Toolbar & Multi-Filters -->
    <div class="coupon-toolbar">
      <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; flex:1;">
        <div class="clean-search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="coupon-search-input" name="coup_search_query_no_autofill" placeholder="Search coupon code or discount type..." value="${(context.searchQuery || '').includes('@') ? '' : (context.searchQuery || '')}" autocomplete="new-password" aria-autocomplete="none" spellcheck="false">
        </div>

        <select class="select-filter-btn" id="coupon-type-filter" title="Filter by type">
          <option value="All" ${couponTypeFilter === 'All' ? 'selected' : ''}>🎟️ All Coupons</option>
          <option value="active" ${couponTypeFilter === 'active' ? 'selected' : ''}>🟢 Active Campaigns</option>
          <option value="percentage" ${couponTypeFilter === 'percentage' ? 'selected' : ''}>% Percentage Off</option>
          <option value="fixed" ${couponTypeFilter === 'fixed' ? 'selected' : ''}>💵 Fixed CFA Off</option>
          <option value="expired" ${couponTypeFilter === 'expired' ? 'selected' : ''}>⌛ Expired Codes</option>
        </select>

        <select class="select-filter-btn" id="coupon-sort-select" title="Sort coupons">
          <option value="newest" ${sortBy === 'newest' ? 'selected' : ''}>⚡ Newest Created</option>
          <option value="val_high" ${sortBy === 'val_high' ? 'selected' : ''}>💰 Highest Discount</option>
          <option value="used_high" ${sortBy === 'used_high' ? 'selected' : ''}>📈 Most Redeemed</option>
          <option value="code_asc" ${sortBy === 'code_asc' ? 'selected' : ''}>🔤 Code: A to Z</option>
        </select>
      </div>

      <div style="display:flex; align-items:center; gap:10px;">
        <button class="select-filter-btn" id="export-coupons-csv-btn" style="background:#f8fafc; display:flex; align-items:center; gap:6px;">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Export CSV</span>
        </button>

        <button class="admin-btn admin-btn-primary" id="add-coupon-main-btn" style="display:flex; align-items:center; gap:8px; padding:10px 18px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Add Coupon</span>
        </button>
      </div>
    </div>

    <!-- 3. Bulk Actions Bar -->
    ${selectedCouponCodes.size > 0 ? `
      <div class="bulk-action-bar">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-weight:800; font-size:13.5px;">✓ ${selectedCouponCodes.size} coupon${selectedCouponCodes.size > 1 ? 's' : ''} selected</span>
          <button class="bulk-btn" id="bulk-deselect-coup-btn" style="background:transparent; border:none; text-decoration:underline; font-size:12px; cursor:pointer;">Clear</button>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button class="bulk-btn" id="bulk-activate-coup-btn">🟢 Set Active</button>
          <button class="bulk-btn" id="bulk-pause-coup-btn">⏸️ Pause</button>
          <button class="bulk-btn bulk-btn-danger" id="bulk-delete-coup-btn">🗑️ Delete Selected</button>
        </div>
      </div>
    ` : ''}

    <!-- 4. Coupons Data Table -->
    <div class="coupon-table-container">
      <div class="table-wrapper">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0;">
              <th style="padding:12px 16px; width:36px; text-align:center;">
                <input type="checkbox" id="select-all-coupons-cb" ${allSelected ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
              </th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Coupon Code</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Discount Reward</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Min. Purchase</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Usage / Limit</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Expiry Date</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Status</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr>
                <td colspan="8" style="padding:48px 20px; text-align:center; color:#94a3b8;">
                  <div style="font-size:36px; margin-bottom:8px;">🎟️</div>
                  <strong style="font-size:15px; color:#475569; display:block;">No coupon promotions found</strong>
                  <span style="font-size:13px;">Create your first promo code or flash discount above!</span>
                </td>
              </tr>
            ` : filtered.map(c => {
              const isChecked = selectedCouponCodes.has(c.code);
              const discountLabel = c.type === 'percentage' ? `${c.value}% OFF` : `${formatPrice(c.value)} OFF`;
              const discountText = c.type === 'percentage' ? `${c.value}% de réduction` : `${formatPrice(c.value)} de réduction`;
              const shareMsg = `🌟 PROMO EXCLUSIVE SWEETOS !\nUtilisez le code promo : *${c.code}* pour obtenir *${discountText}* sur votre commande !\n${c.minOrder > 0 ? `(Minimum d'achat : ${formatPrice(c.minOrder)})\n` : ''}Valable jusqu'au ${c.expiry}.\nBoutique : ${window.location.origin}`;
              const waShareUrl = `https://wa.me/?text=${encodeURIComponent(shareMsg)}`;

              return `
                <tr class="coupon-row-hover" style="border-bottom:1px solid #e2e8f0; ${isChecked ? 'background:#eff6ff !important;' : ''}">
                  <td style="padding:14px 16px; text-align:center;">
                    <input type="checkbox" class="coup-select-cb" data-coupon-code="${c.code}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
                  </td>
                  <td style="padding:14px 16px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span class="coupon-code-badge">${c.code}</span>
                      <button class="copy-coupon-btn action-icon-btn" data-code="${c.code}" style="width:24px; height:24px;" title="Copy Code">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                    </div>
                  </td>
                  <td style="padding:14px 16px;">
                    <strong style="color:#0f172a; font-size:13.5px;">${discountLabel}</strong>
                  </td>
                  <td style="padding:14px 16px;">
                    <span style="color:#64748b; font-size:12.5px; font-weight:600;">
                      ${c.minOrder > 0 ? formatPrice(c.minOrder) : 'No minimum'}
                    </span>
                  </td>
                  <td style="padding:14px 16px;">
                    <span style="font-size:12.5px; font-weight:700; color:#0f172a;">
                      ${c.used || 0} / ${c.stock !== undefined ? c.stock : (c.limit || '∞')} uses
                    </span>
                  </td>
                  <td style="padding:14px 16px;">
                    <span style="font-size:12.5px; color:${c.isExpired ? '#ef4444' : '#64748b'}; font-weight:600;">
                      ${c.expiry || 'No expiry'}
                    </span>
                  </td>
                  <td style="padding:14px 16px;">
                    <span class="status-badge ${c.status === 'active' ? 'status-green' : (c.status === 'expired' ? 'status-red' : 'status-yellow')}">
                      ${c.status === 'active' ? '● Active' : (c.status === 'expired' ? '✕ Expired' : '○ Paused')}
                    </span>
                  </td>
                  <td style="padding:14px 16px; text-align:right;">
                    <div style="display:inline-flex; align-items:center; gap:6px;">
                      <a href="${waShareUrl}" target="_blank" rel="noopener" class="action-icon-btn whatsapp-btn" title="Share Promotion on WhatsApp">
                        💬
                      </a>
                      <button class="action-icon-btn edit-coup-btn" data-coupon-code="${c.code}" title="Edit Coupon">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                      </button>
                      <button class="action-icon-btn delete-btn delete-coup-btn" data-coupon-code="${c.code}" title="Delete Coupon">
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
    </div>

    <!-- 5. Add / Edit Coupon Modal Overlay -->
    <div class="modal-backdrop ${showModal ? 'show' : ''}" id="coupon-modal-backdrop">
      <div class="modal-wrapper product-form-dark-wrapper glass-panel animate-in" style="max-width: 500px; width: 95%;">
        
        <div class="modal-header-modern" style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:12px;">
            <button class="back-circle-btn" id="close-coup-modal-btn" title="Close">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <div>
              <h3 style="margin:0; font-size:18px; font-weight:850; color:#ffffff;">
                ${isEditing ? `Edit Coupon: ${editCoup.code || ''}` : 'Create Marketing Promo'}
              </h3>
              <p style="margin:2px 0 0 0; font-size:12px; color:#94a3b8;">Set discount percentages, usage limits & valid dates</p>
            </div>
          </div>
        </div>

        <div class="modal-body-modern custom-scroll" style="max-height:75vh; overflow-y:auto; padding:12px 4px;">
          <form id="coupon-crud-form" style="display:flex; flex-direction:column; gap:16px;">
            
            <div class="form-group-modern">
              <label>Coupon Code *</label>
              <div style="display:flex; gap:8px;">
                <input type="text" id="coup-code-input" required placeholder="e.g. FLASH25" value="${editCoup.code || ''}" style="text-transform:uppercase; font-family:monospace; font-weight:800; letter-spacing:1px; flex:1;">
                <button type="button" id="auto-gen-code-btn" class="admin-btn" style="background:rgba(255,255,255,0.1); color:white; font-size:12px; padding:8px 12px; white-space:nowrap;">
                  ⚡ Auto-Gen
                </button>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="form-group-modern">
                <label>Discount Type *</label>
                <select id="coup-type-select" class="admin-input" style="padding:10px 12px;">
                  <option value="percentage" ${editCoup.type === 'percentage' || !editCoup.type ? 'selected' : ''}>Percentage (%)</option>
                  <option value="fixed" ${editCoup.type === 'fixed' ? 'selected' : ''}>Fixed Amount (CFA)</option>
                </select>
              </div>

              <div class="form-group-modern">
                <label>Discount Value *</label>
                <input type="number" id="coup-val-input" required min="1" placeholder="e.g. 20" value="${editCoup.value || ''}">
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="form-group-modern">
                <label>Min. Order Requirement (CFA)</label>
                <input type="number" id="coup-min-input" min="0" placeholder="0" value="${editCoup.minOrder || 0}">
              </div>

              <div class="form-group-modern">
                <label>Max Quantity / Available Stock</label>
                <input type="number" id="coup-stock-input" min="1" placeholder="50" value="${editCoup.stock !== undefined ? editCoup.stock : (editCoup.limit || 50)}">
              </div>
            </div>

            <div class="form-group-modern">
              <label>Expiration Date *</label>
              <input type="date" id="coup-expiry-input" required value="${editCoup.expiry || '2026-12-31'}">
            </div>

            <div id="coup-error-msg" style="color:#ef4444; font-size:12.5px; font-weight:700;"></div>

            <button type="submit" class="admin-btn admin-btn-primary" style="padding:14px; font-size:14px; font-weight:800; margin-top:6px;">
              ${isEditing ? '✓ Save Coupon Changes' : '🚀 Publish Coupon'}
            </button>
          </form>
        </div>

      </div>
    </div>
  `;
}

export function attachAdminCouponsListeners(context, shadow) {
  // 1. Search Input
  const searchInput = shadow.getElementById('coupon-search-input');
  if (searchInput) {
    if (searchInput.value.includes('@')) {
      searchInput.value = '';
      context.searchQuery = '';
    }
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.includes('@')) {
        searchInput.value = '';
        context.searchQuery = '';
      }
    });

    searchInput.addEventListener('input', (e) => {
      context.searchQuery = e.target.value;
      context.render();
      context.attachListeners();
      const sRef = shadow.getElementById('coupon-search-input');
      if (sRef) {
        sRef.focus();
        sRef.setSelectionRange(sRef.value.length, sRef.value.length);
      }
    });
  }

  // 2. Type Filter
  const typeFilter = shadow.getElementById('coupon-type-filter');
  if (typeFilter) {
    typeFilter.addEventListener('change', (e) => {
      couponTypeFilter = e.target.value;
      context.render();
      context.attachListeners();
    });
  }

  // 3. Sorting
  const sortSelect = shadow.getElementById('coupon-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      context.render();
      context.attachListeners();
    });
  }

  // 4. Open Add Modal
  const addBtn = shadow.getElementById('add-coupon-main-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      context.showCouponModal = true;
      context.editingCoupon = null;
      context.render();
      context.attachListeners();
    });
  }

  // Auto-Gen code
  const autoGenBtn = shadow.getElementById('auto-gen-code-btn');
  if (autoGenBtn) {
    autoGenBtn.addEventListener('click', () => {
      const codeInput = shadow.getElementById('coup-code-input');
      if (codeInput) {
        const rand = 'SWEET-' + Math.floor(1000 + Math.random() * 9000);
        codeInput.value = rand;
      }
    });
  }

  // Close Modal
  const closeBtn = shadow.getElementById('close-coup-modal-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      context.showCouponModal = false;
      context.editingCoupon = null;
      context.render();
      context.attachListeners();
    });
  }

  // Edit coupon
  shadow.querySelectorAll('.edit-coup-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-coupon-code');
      const coup = (context.coupons || []).find(c => c.code === code);
      if (coup) {
        context.editingCoupon = { ...coup };
        context.showCouponModal = true;
        context.render();
        context.attachListeners();
      }
    });
  });

  // Copy code to clipboard
  shadow.querySelectorAll('.copy-coupon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code');
      navigator.clipboard.writeText(code).then(() => {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Copied "${code}" to clipboard!` }));
      });
    });
  });

  // Delete coupon
  shadow.querySelectorAll('.delete-coup-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code = btn.getAttribute('data-coupon-code');
      const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
        title: 'Delete Coupon',
        message: `Are you sure you want to delete coupon code "${code}"?`,
        confirmText: 'Delete Coupon',
        cancelText: 'Cancel',
        type: 'danger',
        icon: '🎟️'
      }) : Promise.resolve(confirm(`Are you sure you want to delete coupon code "${code}"?`)));

      if (confirmed) {
        context.coupons = (context.coupons || []).filter(c => c.code !== code);
        context.saveDatabase('coupons');
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Deleted coupon ${code}.` }));
        context.render();
        context.attachListeners();
      }
    });
  });

  // 5. Checkboxes & Bulk Selection
  const selectAllCb = shadow.getElementById('select-all-coupons-cb');
  if (selectAllCb) {
    selectAllCb.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      shadow.querySelectorAll('.coup-select-cb').forEach(cb => {
        const code = cb.getAttribute('data-coupon-code');
        if (isChecked) selectedCouponCodes.add(code);
        else selectedCouponCodes.delete(code);
      });
      context.render();
      context.attachListeners();
    });
  }

  shadow.querySelectorAll('.coup-select-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const code = cb.getAttribute('data-coupon-code');
      if (e.target.checked) selectedCouponCodes.add(code);
      else selectedCouponCodes.delete(code);
      context.render();
      context.attachListeners();
    });
  });

  const deselectBtn = shadow.getElementById('bulk-deselect-coup-btn');
  if (deselectBtn) {
    deselectBtn.addEventListener('click', () => {
      selectedCouponCodes.clear();
      context.render();
      context.attachListeners();
    });
  }

  const bulkActivate = shadow.getElementById('bulk-activate-coup-btn');
  if (bulkActivate) {
    bulkActivate.addEventListener('click', () => {
      selectedCouponCodes.forEach(code => {
        const c = (context.coupons || []).find(item => item.code === code);
        if (c) c.status = 'active';
      });
      context.saveDatabase('coupons');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Activated ${selectedCouponCodes.size} coupons.` }));
      selectedCouponCodes.clear();
      context.render();
      context.attachListeners();
    });
  }

  const bulkPause = shadow.getElementById('bulk-pause-coup-btn');
  if (bulkPause) {
    bulkPause.addEventListener('click', () => {
      selectedCouponCodes.forEach(code => {
        const c = (context.coupons || []).find(item => item.code === code);
        if (c) c.status = 'paused';
      });
      context.saveDatabase('coupons');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Paused ${selectedCouponCodes.size} coupons.` }));
      selectedCouponCodes.clear();
      context.render();
      context.attachListeners();
    });
  }

  const bulkDelete = shadow.getElementById('bulk-delete-coup-btn');
  if (bulkDelete) {
    bulkDelete.addEventListener('click', async () => {
      const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
        title: 'Bulk Delete Coupons',
        message: `Are you sure you want to delete ${selectedCouponCodes.size} selected coupons?`,
        confirmText: 'Delete Selected',
        cancelText: 'Cancel',
        type: 'danger',
        icon: '🗑️'
      }) : Promise.resolve(confirm(`Are you sure you want to delete ${selectedCouponCodes.size} selected coupons?`)));

      if (confirmed) {
        context.coupons = (context.coupons || []).filter(c => !selectedCouponCodes.has(c.code));
        context.saveDatabase('coupons');
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Deleted selected coupons.` }));
        selectedCouponCodes.clear();
        context.render();
        context.attachListeners();
      }
    });
  }

  // 6. Export to CSV
  const exportBtn = shadow.getElementById('export-coupons-csv-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportCouponsToCSV(context.coupons || []);
    });
  }

  // 7. Form Submit
  const form = shadow.getElementById('coupon-crud-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = shadow.getElementById('coup-code-input').value.trim().toUpperCase();
      const type = shadow.getElementById('coup-type-select').value;
      const value = parseFloat(shadow.getElementById('coup-val-input').value) || 0;
      const minOrder = parseFloat(shadow.getElementById('coup-min-input').value) || 0;
      const stock = parseInt(shadow.getElementById('coup-stock-input').value) || 50;
      const expiry = shadow.getElementById('coup-expiry-input').value;
      const errorMsg = shadow.getElementById('coup-error-msg');

      if (!code || value <= 0) {
        errorMsg.textContent = 'Please provide a valid code and discount value.';
        return;
      }

      if (context.editingCoupon && context.editingCoupon.code) {
        const oldCode = context.editingCoupon.code;
        const idx = (context.coupons || []).findIndex(c => c.code === oldCode);
        if (idx !== -1) {
          context.coupons[idx] = {
            ...context.coupons[idx],
            code,
            type,
            value,
            minOrder,
            stock,
            expiry
          };
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Coupon "${code}" updated!` }));
        }
      } else {
        const duplicate = (context.coupons || []).some(c => c.code === code);
        if (duplicate) {
          errorMsg.textContent = `Coupon code "${code}" already exists!`;
          return;
        }

        context.coupons.unshift({
          code,
          type,
          value,
          minOrder,
          stock,
          used: 0,
          expiry,
          status: 'active'
        });
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Coupon "${code}" created successfully!` }));
      }

      context.saveDatabase('coupons');
      context.showCouponModal = false;
      context.editingCoupon = null;
      context.render();
      context.attachListeners();
    });
  }
}

function exportCouponsToCSV(coupons) {
  if (!coupons || coupons.length === 0) {
    window.dispatchEvent(new CustomEvent('toast:show', { detail: 'No coupons to export.' }));
    return;
  }

  const headers = ['Coupon Code', 'Discount Type', 'Discount Value', 'Min Order (CFA)', 'Used Count', 'Total Stock', 'Expiry Date', 'Status'];
  const rows = coupons.map(c => [
    `"${c.code || ''}"`,
    c.type,
    c.value,
    c.minOrder || 0,
    c.used || 0,
    c.stock || 'Unlimited',
    `"${c.expiry || ''}"`,
    c.status || 'active'
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SWEETOS_Coupons_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
