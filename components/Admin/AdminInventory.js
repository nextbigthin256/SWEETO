import { formatPrice } from '../../utils/storage.js';

let selectedInvProductIds = new Set();
let inventoryStatusFilter = 'All'; // 'All' | 'in_stock' | 'low_stock' | 'out_of_stock'
let categoryFilter = 'All';
let sortBy = 'stock_low'; // 'stock_low' | 'stock_high' | 'margin_high' | 'name_asc'

export function renderAdminInventory(context) {
  const query = (context.searchQuery || '').toLowerCase().trim();
  const rawProducts = context.products || [];
  const rawCategories = context.categories || [];

  // Filter products
  let filtered = rawProducts.filter(p => {
    const stock = p.stock !== undefined ? p.stock : 0;
    const thresh = p.threshold || 5;

    if (query) {
      const matchName = (p.name || '').toLowerCase().includes(query);
      const matchSku = (p.sku || '').toLowerCase().includes(query);
      const matchCat = (p.category || '').toLowerCase().includes(query);
      const matchBrand = (p.brand || '').toLowerCase().includes(query);
      if (!matchName && !matchSku && !matchCat && !matchBrand) return false;
    }

    if (categoryFilter !== 'All') {
      const selectedCat = rawCategories.find(c => c.name === categoryFilter || c.id === parseInt(categoryFilter));
      if (selectedCat) {
        const subCatNames = rawCategories.filter(c => c.parent === selectedCat.id || c.parent === selectedCat.name).map(c => c.name.toLowerCase());
        const itemCat = (p.category || '').toLowerCase();
        const itemSub = (p.subCategory || '').toLowerCase();
        const matchDirect = itemCat === selectedCat.name.toLowerCase() || itemSub === selectedCat.name.toLowerCase();
        const matchSub = subCatNames.includes(itemCat) || subCatNames.includes(itemSub);
        if (!matchDirect && !matchSub) return false;
      } else if ((p.category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
    }

    if (inventoryStatusFilter === 'low_stock') {
      if (stock === 0 || stock > thresh) return false;
    } else if (inventoryStatusFilter === 'out_of_stock') {
      if (stock !== 0) return false;
    } else if (inventoryStatusFilter === 'in_stock') {
      if (stock <= thresh) return false;
    }

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    const stockA = a.stock !== undefined ? a.stock : 0;
    const stockB = b.stock !== undefined ? b.stock : 0;
    const marginA = a.price > 0 ? ((a.price - (a.costPrice || 0)) / a.price) : 0;
    const marginB = b.price > 0 ? ((b.price - (b.costPrice || 0)) / b.price) : 0;

    if (sortBy === 'stock_low') return stockA - stockB;
    if (sortBy === 'stock_high') return stockB - stockA;
    if (sortBy === 'margin_high') return marginB - marginA;
    if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    return 0;
  });

  // KPI Calculations
  const skuCount = rawProducts.length;
  const totalStockUnits = rawProducts.reduce((sum, p) => sum + (p.stock !== undefined ? p.stock : 0), 0);
  const lowStockCount = rawProducts.filter(p => p.stock !== undefined && p.stock <= (p.threshold || 5) && p.stock > 0).length;
  const outOfStockCount = rawProducts.filter(p => (p.stock || 0) === 0).length;
  const totalValuation = rawProducts.reduce((sum, p) => sum + ((p.costPrice || p.price * 0.6) * (p.stock || 0)), 0);

  // Pagination
  const totalItems = filtered.length;
  const itemsPerPage = context.itemsPerPage || 10;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const currentPage = Math.min(context.currentPageIndex || 1, totalPages);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = filtered.slice(startIndex, startIndex + itemsPerPage);

  const allSelected = paginatedList.length > 0 && paginatedList.every(p => selectedInvProductIds.has(p.id));

  return `
    <style>
      .inventory-kpi-grid {
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
      .inventory-toolbar {
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
      .inventory-table-container {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      }
      .inv-row-hover:hover {
        background-color: rgba(241, 245, 249, 0.6) !important;
      }
      .status-pill-btn {
        padding: 7px 14px;
        border-radius: 20px;
        font-size: 12.5px;
        font-weight: 750;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #475569;
        transition: all 0.15s ease;
      }
      .status-pill-btn.active {
        background: #0052cc;
        color: #ffffff;
        border-color: #0052cc;
      }
      .badge-count {
        padding: 1px 7px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 800;
        background: rgba(0,0,0,0.06);
      }
      .status-pill-btn.active .badge-count {
        background: rgba(255,255,255,0.25);
        color: #ffffff;
      }
      .qty-stepper {
        display: inline-flex;
        align-items: center;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
      }
      .qty-step-btn {
        width: 28px;
        height: 28px;
        border: none;
        background: transparent;
        color: #0f172a;
        font-size: 15px;
        font-weight: 850;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .qty-step-btn:hover {
        background: #0052cc;
        color: #ffffff;
      }
      .qty-val-display {
        min-width: 32px;
        text-align: center;
        font-size: 13px;
        font-weight: 850;
        color: #0f172a;
      }
    </style>

    <!-- 1. Inventory KPI Cards -->
    <div class="inventory-kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(0, 82, 204, 0.1); color: #0052cc;">📦</div>
        <div>
          <span class="kpi-title">Catalog SKUs</span>
          <span class="kpi-val">${skuCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(34, 197, 94, 0.1); color: #16a34a;">🪵</div>
        <div>
          <span class="kpi-title">Available Units</span>
          <span class="kpi-val" style="color: #16a34a;">${totalStockUnits}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(245, 158, 11, 0.12); color: #d97706;">⚠️</div>
        <div>
          <span class="kpi-title">Low Stock Warnings</span>
          <span class="kpi-val" style="color: #d97706;">${lowStockCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">🚫</div>
        <div>
          <span class="kpi-title">Out of Stock</span>
          <span class="kpi-val" style="color: #ef4444;">${outOfStockCount}</span>
        </div>
      </div>
    </div>

    <!-- 2. Status Pill Filters -->
    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px;">
      <button class="status-pill-btn ${inventoryStatusFilter === 'All' ? 'active' : ''}" data-status="All">
        <span>All Items</span>
        <span class="badge-count">${skuCount}</span>
      </button>
      <button class="status-pill-btn ${inventoryStatusFilter === 'in_stock' ? 'active' : ''}" data-status="in_stock">
        <span>✓ In Stock</span>
        <span class="badge-count">${skuCount - lowStockCount - outOfStockCount}</span>
      </button>
      <button class="status-pill-btn ${inventoryStatusFilter === 'low_stock' ? 'active' : ''}" data-status="low_stock">
        <span>⚠️ Low Stock</span>
        <span class="badge-count">${lowStockCount}</span>
      </button>
      <button class="status-pill-btn ${inventoryStatusFilter === 'out_of_stock' ? 'active' : ''}" data-status="out_of_stock">
        <span>🚫 Out of Stock</span>
        <span class="badge-count">${outOfStockCount}</span>
      </button>
    </div>

    <!-- 3. Toolbar & Multi-Filters -->
    <div class="inventory-toolbar">
      <div class="filter-controls-group">
        <div class="clean-search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="search" role="searchbox" aria-label="Search" id="inventory-search-input" name="q_search_no_credentials" placeholder="Search SKU, item name, brand..." value="${context.searchQuery || ''}" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false">
        </div>

        <select class="select-filter-btn" id="inv-category-select" title="Filter category" style="font-weight:700;">
          <option value="All" ${categoryFilter === 'All' ? 'selected' : ''}>📂 All Categories</option>
          ${(() => {
            const parents = rawCategories.filter(c => !c.parent || c.parent === null || c.parent === 0 || c.parent === '');
            const subs = rawCategories.filter(c => c.parent && c.parent !== null && c.parent !== 0 && c.parent !== '');

            return parents.map(parent => {
              const parentSubs = subs.filter(sc => sc.parent === parent.id || sc.parent === parent.name);
              return `
                <optgroup label="${parent.icon || '📁'} ${parent.name.toUpperCase()}">
                  <option value="${parent.name}" ${categoryFilter === parent.name ? 'selected' : ''}>
                    ${parent.icon || '📁'} All ${parent.name}
                  </option>
                  ${parentSubs.map(sub => `
                    <option value="${sub.name}" ${categoryFilter === sub.name ? 'selected' : ''}>
                      &nbsp;&nbsp;&nbsp;&nbsp;↳ ${sub.icon || '🌿'} ${sub.name}
                    </option>
                  `).join('')}
                </optgroup>
              `;
            }).join('');
          })()}
        </select>

        <select class="select-filter-btn" id="inv-sort-select" title="Sort inventory">
          <option value="stock_low" ${sortBy === 'stock_low' ? 'selected' : ''}>⚠️ Stock: Low to High (Needs Reorder)</option>
          <option value="stock_high" ${sortBy === 'stock_high' ? 'selected' : ''}>📦 Stock: High to Low</option>
          <option value="margin_high" ${sortBy === 'margin_high' ? 'selected' : ''}>📈 Margin %: High to Low</option>
          <option value="name_asc" ${sortBy === 'name_asc' ? 'selected' : ''}>🔤 Name: A to Z</option>
        </select>
      </div>

      <div style="display:flex; align-items:center; gap:10px;">
        <button class="select-filter-btn" id="export-inv-csv-btn" style="background:#f8fafc; display:flex; align-items:center; gap:6px;">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Export CSV</span>
        </button>
      </div>
    </div>

    <!-- 4. Bulk Actions Bar -->
    ${selectedInvProductIds.size > 0 ? `
      <div class="bulk-action-bar">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-weight:800; font-size:13.5px;">✓ ${selectedInvProductIds.size} item${selectedInvProductIds.size > 1 ? 's' : ''} selected</span>
          <button class="bulk-btn" id="bulk-deselect-inv-btn" style="background:transparent; border:none; text-decoration:underline; font-size:12px; cursor:pointer;">Clear</button>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button class="bulk-btn" id="bulk-add-stock-10-btn">+10 Units Restock</button>
          <button class="bulk-btn" id="bulk-add-stock-50-btn">+50 Units Restock</button>
          <button class="bulk-btn" id="bulk-export-inv-btn">📄 Export Selected</button>
        </div>
      </div>
    ` : ''}

    <!-- 5. 2-Column Responsive Layout: Table + Live Audit Log -->
    <div class="admin-split-grid inventory-split-grid" style="display:grid; grid-template-columns: 1fr minmax(280px, 320px); gap:20px; align-items:start;">
      
      <!-- Left Column: Inventory Data Table -->
      <div class="inventory-table-container">
        <div class="table-wrapper">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0;">
                <th style="padding:12px 16px; width:36px; text-align:center;">
                  <input type="checkbox" id="select-all-inv-cb" ${allSelected ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
                </th>
                <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Product & SKU</th>
                <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Stock Level</th>
                <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Quick Adjust</th>
                <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Price & Margin</th>
                <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase; text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${paginatedList.length === 0 ? `
                <tr>
                  <td colspan="6" style="padding:48px 20px; text-align:center; color:#94a3b8;">
                    <div style="font-size:36px; margin-bottom:8px;">🔍</div>
                    <strong style="font-size:15px; color:#475569; display:block;">No inventory items found</strong>
                    <span style="font-size:13px;">Try changing filters or search terms.</span>
                  </td>
                </tr>
              ` : paginatedList.map(p => {
                const isChecked = selectedInvProductIds.has(p.id);
                const stock = p.stock !== undefined ? p.stock : 0;
                const thresh = p.threshold || 5;
                const cost = p.costPrice || (p.price * 0.65);
                const price = p.price || 0;
                const profit = price - cost;
                const margin = price > 0 ? Math.round((profit / price) * 100) : 0;

                const isLow = stock <= thresh && stock > 0;
                const isOut = stock === 0;

                let statusBadge = `<span class="status-badge status-green">In Stock (${stock})</span>`;
                if (isOut) {
                  statusBadge = `<span class="status-badge status-red">Out of Stock (0)</span>`;
                } else if (isLow) {
                  statusBadge = `<span class="status-badge status-yellow">Low: ${stock} &le; ${thresh}</span>`;
                }

                return `
                  <tr class="inv-row-hover" style="border-bottom:1px solid #e2e8f0; ${isChecked ? 'background:#eff6ff !important;' : ''}">
                    <td style="padding:14px 16px; text-align:center;">
                      <input type="checkbox" class="inv-select-cb" data-product-id="${p.id}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
                    </td>
                    <td style="padding:14px 16px;">
                      <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${p.image || './assets/keyboard_1786712380801.jpg'}" alt="${p.name}" style="width:40px; height:40px; border-radius:8px; object-fit:cover; border:1px solid #e2e8f0; flex-shrink:0;">
                        <div style="display:flex; flex-direction:column;">
                          <strong style="font-size:13.5px; color:#0f172a;">${p.name}</strong>
                          <span style="font-size:11px; color:#64748b;">
                            <code style="color:#0052cc;">${p.sku || `SKU-${p.id}`}</code> · ${p.category || 'General'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style="padding:14px 16px;">
                      ${statusBadge}
                    </td>
                    <td style="padding:14px 16px;">
                      <div class="qty-stepper">
                        <button class="qty-step-btn inline-step-minus" data-product-id="${p.id}" title="Decrease 1 unit">−</button>
                        <span class="qty-val-display">${stock}</span>
                        <button class="qty-step-btn inline-step-plus" data-product-id="${p.id}" title="Increase 1 unit">+</button>
                      </div>
                    </td>
                    <td style="padding:14px 16px;">
                      <div style="display:flex; flex-direction:column;">
                        <strong style="font-size:13.5px; color:#0f172a;">${formatPrice(price)}</strong>
                        <small style="font-size:11px; color:#16a34a; font-weight:700;">${margin}% margin</small>
                      </div>
                    </td>
                    <td style="padding:14px 16px; text-align:right;">
                      <button class="open-inv-adjust-btn admin-btn admin-btn-secondary" data-product-id="${p.id}" style="padding:6px 12px; font-size:12px; font-weight:750;">
                        Adjust
                      </button>
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
            Showing <strong>${totalItems === 0 ? 0 : startIndex + 1}</strong> to <strong>${Math.min(startIndex + itemsPerPage, totalItems)}</strong> of <strong>${totalItems}</strong> items
          </span>
          <div class="pagination-buttons" style="display:flex; align-items:center; gap:8px;">
            <button class="pag-btn" id="prev-inv-page" ${currentPage <= 1 ? 'disabled' : ''} style="padding:6px 14px; border-radius:8px; border:1px solid #cbd5e1; background:#ffffff; font-size:12.5px; font-weight:700; cursor:pointer;">Previous</button>
            <span style="font-size:13px; font-weight:750; color:#334155; padding:0 6px;">${currentPage} / ${totalPages}</span>
            <button class="pag-btn" id="next-inv-page" ${currentPage >= totalPages ? 'disabled' : ''} style="padding:6px 14px; border-radius:8px; border:1px solid #cbd5e1; background:#ffffff; font-size:12.5px; font-weight:700; cursor:pointer;">Next</button>
          </div>
        </div>
      </div>

      <!-- Right Column: Live Audit Trail & History Logs -->
      <div class="glass-panel" style="padding:20px; border-radius:16px; background:rgba(255,255,255,0.85); border:1px solid rgba(226,232,240,0.9);">
        <h3 style="margin:0 0 14px 0; font-size:15px; font-weight:850; color:#0f172a; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">
          📜 Stock Audit Trail
        </h3>
        
        <div class="custom-scroll" style="max-height:450px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-right:4px;">
          ${(context.inventoryLogs || []).length === 0 ? `
            <small style="color:#94a3b8; text-align:center; padding:20px 0;">No stock modifications recorded yet.</small>
          ` : (context.inventoryLogs || []).slice(0, 20).map(l => {
            const isPlus = l.quantity >= 0;
            return `
              <div style="padding:10px 12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; font-size:12px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                  <code style="font-weight:750; color:#0052cc;">${l.sku}</code>
                  <span style="color:#94a3b8; font-size:11px;">${l.date ? l.date.slice(5, 16) : ''}</span>
                </div>
                <div style="color:#334155; font-weight:600; margin-bottom:2px;">${l.action}</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="color:${isPlus ? '#16a34a' : '#ef4444'}; font-size:12.5px;">
                    ${isPlus ? '+' : ''}${l.quantity} unit${Math.abs(l.quantity) !== 1 ? 's' : ''}
                  </strong>
                  <span style="color:#94a3b8; font-size:10.5px;">${l.user || 'Admin'}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

    </div>

    <!-- 6. Quick Stock Adjustment Modal Overlay -->
    <div class="modal-backdrop ${context.showStockModal ? 'show' : ''}" id="stock-modal-backdrop">
      <div class="modal-wrapper product-form-dark-wrapper glass-panel animate-in" style="max-width: 440px; width: 95%;">
        <div class="modal-header-modern" style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:12px;">
            <button class="back-circle-btn" id="close-stock-modal-btn" title="Close">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <div>
              <h3 style="margin:0; font-size:17px; font-weight:850; color:#ffffff;">Stock Adjustment</h3>
              <p style="margin:2px 0 0 0; font-size:12px; color:#94a3b8;">Set exact units & alert threshold</p>
            </div>
          </div>
        </div>

        <div class="modal-body-modern" style="padding:16px 4px;">
          ${context.stockProduct ? `
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px; background:#0c101b; padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
              <img src="${context.stockProduct.image || './assets/keyboard_1786712380801.jpg'}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">
              <div>
                <strong style="color:white; font-size:13.5px; display:block;">${context.stockProduct.name}</strong>
                <code style="color:#60a5fa; font-size:11.5px;">${context.stockProduct.sku || `SKU-${context.stockProduct.id}`}</code>
              </div>
            </div>

            <form id="stock-modal-form" autocomplete="off" style="display:flex; flex-direction:column; gap:14px;">
              <div class="form-group-modern">
                <label>Available Stock Units *</label>
                <input type="number" id="modal-stock-qty" name="modal_stock_qty_no_autofill" required min="0" value="${context.stockProduct.stock !== undefined ? context.stockProduct.stock : 0}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
              </div>

              <div class="form-group-modern">
                <label>Low-Stock Alert Threshold *</label>
                <input type="number" id="modal-stock-thresh" name="modal_stock_thresh_no_autofill" required min="1" value="${context.stockProduct.threshold || 5}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
                <small style="color:#94a3b8; font-size:11px; margin-top:2px;">Trigger alert when stock drops to or below this level.</small>
              </div>

              <div class="form-group-modern">
                <label>Adjustment Reason / Note</label>
                <input type="text" id="modal-stock-reason" name="modal_stock_reason_no_autofill" placeholder="e.g. Received new shipment, Damaged item write-off" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
              </div>

              <button type="submit" class="admin-btn admin-btn-primary" style="padding:12px; font-weight:800; font-size:13.5px; margin-top:6px;">
                ✓ Save Stock Level
              </button>
            </form>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

export function attachAdminInventoryListeners(context, shadow) {
  // 1. Search Input
  const searchInput = shadow.getElementById('inventory-search-input');
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
      const sRef = shadow.getElementById('inventory-search-input');
      if (sRef) {
        sRef.focus();
        sRef.setSelectionRange(sRef.value.length, sRef.value.length);
      }
    });
  }

  // 2. Status Pill Filters
  shadow.querySelectorAll('.status-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      inventoryStatusFilter = btn.getAttribute('data-status');
      context.currentPageIndex = 1;
      context.render();
      context.attachListeners();
    });
  });

  // 3. Category Filter
  const catSelect = shadow.getElementById('inv-category-select');
  if (catSelect) {
    catSelect.addEventListener('change', (e) => {
      categoryFilter = e.target.value;
      context.currentPageIndex = 1;
      context.render();
      context.attachListeners();
    });
  }

  // 4. Sorting
  const sortSelect = shadow.getElementById('inv-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      context.render();
      context.attachListeners();
    });
  }

  // 5. Inline Stepper: Minus (-1)
  shadow.querySelectorAll('.inline-step-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-product-id'));
      const p = (context.products || []).find(item => item.id === id);
      if (p && (p.stock || 0) > 0) {
        p.stock = (p.stock || 0) - 1;
        context.saveDatabase('products');

        if (!context.inventoryLogs) context.inventoryLogs = [];
        context.inventoryLogs.unshift({
          id: Date.now(),
          date: new Date().toISOString().replace('T', ' ').slice(0, 16),
          sku: p.sku || `SKU-${p.id}`,
          action: "Quick decrement (−1 unit)",
          quantity: -1,
          user: "Admin"
        });
        context.saveDatabase('inventory');

        context.render();
        context.attachListeners();
      }
    });
  });

  // 6. Inline Stepper: Plus (+1)
  shadow.querySelectorAll('.inline-step-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-product-id'));
      const p = (context.products || []).find(item => item.id === id);
      if (p) {
        p.stock = (p.stock || 0) + 1;
        context.saveDatabase('products');

        if (!context.inventoryLogs) context.inventoryLogs = [];
        context.inventoryLogs.unshift({
          id: Date.now(),
          date: new Date().toISOString().replace('T', ' ').slice(0, 16),
          sku: p.sku || `SKU-${p.id}`,
          action: "Quick restock (+1 unit)",
          quantity: 1,
          user: "Admin"
        });
        context.saveDatabase('inventory');

        context.render();
        context.attachListeners();
      }
    });
  });

  // 7. Open Stock Modal
  shadow.querySelectorAll('.open-inv-adjust-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-product-id'));
      const p = (context.products || []).find(item => item.id === id);
      if (p) {
        context.stockProduct = p;
        context.showStockModal = true;
        context.render();
        context.attachListeners();
      }
    });
  });

  // Close Modal
  const closeBtn = shadow.getElementById('close-stock-modal-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      context.showStockModal = false;
      context.stockProduct = null;
      context.render();
      context.attachListeners();
    });
  }

  // Handle Modal Form Submit
  const stockForm = shadow.getElementById('stock-modal-form');
  if (stockForm && context.stockProduct) {
    stockForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nextQty = parseInt(shadow.getElementById('modal-stock-qty').value) || 0;
      const nextThresh = parseInt(shadow.getElementById('modal-stock-thresh').value) || 5;
      const reason = shadow.getElementById('modal-stock-reason').value.trim() || 'Manual stock update';

      const p = (context.products || []).find(item => item.id === context.stockProduct.id);
      if (p) {
        const diff = nextQty - (p.stock || 0);
        p.stock = nextQty;
        p.threshold = nextThresh;
        context.saveDatabase('products');

        if (!context.inventoryLogs) context.inventoryLogs = [];
        context.inventoryLogs.unshift({
          id: Date.now(),
          date: new Date().toISOString().replace('T', ' ').slice(0, 16),
          sku: p.sku || `SKU-${p.id}`,
          action: reason,
          quantity: diff,
          user: "Admin"
        });
        context.saveDatabase('inventory');

        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Stock updated for ${p.name}` }));
      }

      context.showStockModal = false;
      context.stockProduct = null;
      context.render();
      context.attachListeners();
    });
  }

  // 8. Checkboxes & Bulk Selection
  const selectAllCb = shadow.getElementById('select-all-inv-cb');
  if (selectAllCb) {
    selectAllCb.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      shadow.querySelectorAll('.inv-select-cb').forEach(cb => {
        const id = parseInt(cb.getAttribute('data-product-id'));
        if (isChecked) selectedInvProductIds.add(id);
        else selectedInvProductIds.delete(id);
      });
      context.render();
      context.attachListeners();
    });
  }

  shadow.querySelectorAll('.inv-select-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = parseInt(cb.getAttribute('data-product-id'));
      if (e.target.checked) selectedInvProductIds.add(id);
      else selectedInvProductIds.delete(id);
      context.render();
      context.attachListeners();
    });
  });

  const deselectBtn = shadow.getElementById('bulk-deselect-inv-btn');
  if (deselectBtn) {
    deselectBtn.addEventListener('click', () => {
      selectedInvProductIds.clear();
      context.render();
      context.attachListeners();
    });
  }

  // Bulk Restock +10
  const bulkPlus10 = shadow.getElementById('bulk-add-stock-10-btn');
  if (bulkPlus10) {
    bulkPlus10.addEventListener('click', () => {
      selectedInvProductIds.forEach(id => {
        const p = (context.products || []).find(item => item.id === id);
        if (p) {
          p.stock = (p.stock || 0) + 10;
          if (!context.inventoryLogs) context.inventoryLogs = [];
          context.inventoryLogs.unshift({
            id: Date.now(),
            date: new Date().toISOString().replace('T', ' ').slice(0, 16),
            sku: p.sku || `SKU-${p.id}`,
            action: "Bulk restock (+10 units)",
            quantity: 10,
            user: "Admin"
          });
        }
      });
      context.saveDatabase('products');
      context.saveDatabase('inventory');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Restocked 10 units to ${selectedInvProductIds.size} products!` }));
      selectedInvProductIds.clear();
      context.render();
      context.attachListeners();
    });
  }

  // Bulk Restock +50
  const bulkPlus50 = shadow.getElementById('bulk-add-stock-50-btn');
  if (bulkPlus50) {
    bulkPlus50.addEventListener('click', () => {
      selectedInvProductIds.forEach(id => {
        const p = (context.products || []).find(item => item.id === id);
        if (p) {
          p.stock = (p.stock || 0) + 50;
          if (!context.inventoryLogs) context.inventoryLogs = [];
          context.inventoryLogs.unshift({
            id: Date.now(),
            date: new Date().toISOString().replace('T', ' ').slice(0, 16),
            sku: p.sku || `SKU-${p.id}`,
            action: "Bulk restock (+50 units)",
            quantity: 50,
            user: "Admin"
          });
        }
      });
      context.saveDatabase('products');
      context.saveDatabase('inventory');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Restocked 50 units to ${selectedInvProductIds.size} products!` }));
      selectedInvProductIds.clear();
      context.render();
      context.attachListeners();
    });
  }

  // 9. Export to CSV
  const exportBtn = shadow.getElementById('export-inv-csv-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportInventoryToCSV(context.products || []);
    });
  }

  // 10. Pagination
  const prevBtn = shadow.getElementById('prev-inv-page');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (context.currentPageIndex > 1) {
        context.currentPageIndex--;
        context.render();
        context.attachListeners();
      }
    });
  }

  const nextBtn = shadow.getElementById('next-inv-page');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      context.currentPageIndex = (context.currentPageIndex || 1) + 1;
      context.render();
      context.attachListeners();
    });
  }
}

function exportInventoryToCSV(products) {
  if (!products || products.length === 0) {
    window.dispatchEvent(new CustomEvent('toast:show', { detail: 'No products to export.' }));
    return;
  }

  const headers = ['Product ID', 'SKU', 'Product Name', 'Category', 'Stock Units', 'Threshold Level', 'Cost Price (CFA)', 'Sale Price (CFA)', 'Status'];
  const rows = products.map(p => {
    const stock = p.stock !== undefined ? p.stock : 0;
    const thresh = p.threshold || 5;
    let status = 'In Stock';
    if (stock === 0) status = 'Out of Stock';
    else if (stock <= thresh) status = 'Low Stock';

    return [
      p.id,
      `"${p.sku || ''}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.category || ''}"`,
      stock,
      thresh,
      p.costPrice || 0,
      p.price || 0,
      status
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SWEETOS_Inventory_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
