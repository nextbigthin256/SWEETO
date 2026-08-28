// Dedicated Admin Brand Management Module with Logo / Cover Image Support

let selectedBrandIds = new Set();
let brandViewMode = 'table'; // 'table' | 'grid'
let sortBy = 'name_asc';

export function renderAdminBrands(context) {
  const query = (context.searchQuery || '').toLowerCase().trim();
  const rawBrands = context.brands || [];
  const rawProducts = context.products || [];

  // Helper to count products linked to a brand
  const getProductCount = (brandName) => {
    return rawProducts.filter(p => p.brand === brandName).length;
  };

  // Filter brands
  let filtered = rawBrands.filter(b => {
    if (query) {
      const matchName = (b.name || '').toLowerCase().includes(query);
      const matchSlug = (b.slug || '').toLowerCase().includes(query);
      const matchDesc = (b.description || '').toLowerCase().includes(query);
      if (!matchName && !matchSlug && !matchDesc) return false;
    }
    return true;
  });

  // Sort brands
  filtered.sort((a, b) => {
    if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
    if (sortBy === 'products_high') return getProductCount(b.name) - getProductCount(a.name);
    if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
    return 0;
  });

  // KPI Calculations
  const totalCount = rawBrands.length;
  const featuredCount = rawBrands.filter(b => b.featured).length;
  const activeCount = rawBrands.filter(b => getProductCount(b.name) > 0).length;
  const totalProductsLinked = rawProducts.filter(p => p.brand).length;

  const isEditing = context.editingBrand !== null && context.editingBrand !== undefined;
  const showModal = context.showBrandModal === true;
  const editBrand = context.editingBrand || {};

  const allSelected = filtered.length > 0 && filtered.every(b => selectedBrandIds.has(b.id));

  return `
    <style>
      .brands-kpi-grid {
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
      .brand-toolbar {
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
      .view-toggle-group {
        display: inline-flex;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        background: #ffffff;
        overflow: hidden;
      }
      .view-toggle-btn {
        padding: 8px 12px;
        background: transparent;
        border: none;
        font-size: 12.5px;
        font-weight: 750;
        color: #64748b;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
      }
      .view-toggle-btn.active {
        background: #0052cc;
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
      .brand-table-container {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      }
      .brand-row-hover:hover {
        background-color: rgba(241, 245, 249, 0.6) !important;
      }
      .brand-logo-thumb {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        object-fit: cover;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
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
      .action-icon-btn.delete-btn:hover {
        background: #ef4444;
        color: #ffffff;
        border-color: #ef4444;
      }
      .brand-grid-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 16px;
      }
      .brand-card {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 16px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        position: relative;
        transition: all 0.2s ease;
      }
      .brand-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
      }
    </style>

    <!-- 1. Brand Metrics / KPI Bar -->
    <div class="brands-kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(0, 82, 204, 0.1); color: #0052cc;">🏷️</div>
        <div>
          <span class="kpi-title">Total Brands</span>
          <span class="kpi-val">${totalCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(34, 197, 94, 0.1); color: #16a34a;">📦</div>
        <div>
          <span class="kpi-title">Active in Catalog</span>
          <span class="kpi-val" style="color: #16a34a;">${activeCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(245, 158, 11, 0.12); color: #d97706;">⭐</div>
        <div>
          <span class="kpi-title">Featured Brands</span>
          <span class="kpi-val" style="color: #d97706;">${featuredCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(99, 102, 241, 0.1); color: #6366f1;">💎</div>
        <div>
          <span class="kpi-title">Branded Items</span>
          <span class="kpi-val" style="color: #6366f1;">${totalProductsLinked}</span>
        </div>
      </div>
    </div>

    <!-- 2. Toolbar & Multi-Filters -->
    <div class="brand-toolbar">
      <div class="filter-controls-group">
        <!-- Search Box -->
        <div class="clean-search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="search" role="searchbox" aria-label="Search" id="brand-search-input" name="q_search_no_credentials" placeholder="Search brands, slugs, websites..." value="${context.searchQuery || ''}" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false">
        </div>

        <!-- Sorting -->
        <select class="select-filter-btn" id="brand-sort-select" title="Sort brands">
          <option value="name_asc" ${sortBy === 'name_asc' ? 'selected' : ''}>🔤 Name: A to Z</option>
          <option value="name_desc" ${sortBy === 'name_desc' ? 'selected' : ''}>🔤 Name: Z to A</option>
          <option value="products_high" ${sortBy === 'products_high' ? 'selected' : ''}>📦 Most Products</option>
          <option value="newest" ${sortBy === 'newest' ? 'selected' : ''}>⚡ Newest Created</option>
        </select>

        <!-- View Mode Switcher -->
        <div class="view-toggle-group">
          <button class="view-toggle-btn ${brandViewMode === 'table' ? 'active' : ''}" id="brand-view-table-btn" title="Table View">
            <span>📋 Table</span>
          </button>
          <button class="view-toggle-btn ${brandViewMode === 'grid' ? 'active' : ''}" id="brand-view-grid-btn" title="Grid Cards View">
            <span>🎴 Cards</span>
          </button>
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:10px;">
        <button class="select-filter-btn" id="export-brands-csv-btn" style="background:#f8fafc; display:flex; align-items:center; gap:6px;">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Export CSV</span>
        </button>

        <button class="admin-btn admin-btn-primary" id="add-brand-main-btn" style="display:flex; align-items:center; gap:8px; padding:10px 18px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Add Brand</span>
        </button>
      </div>
    </div>

    <!-- 3. Bulk Actions Bar -->
    ${selectedBrandIds.size > 0 ? `
      <div class="bulk-action-bar">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-weight:800; font-size:13.5px;">✓ ${selectedBrandIds.size} brand${selectedBrandIds.size > 1 ? 's' : ''} selected</span>
          <button class="bulk-btn" id="bulk-deselect-brands-btn" style="background:transparent; border:none; text-decoration:underline; font-size:12px; cursor:pointer;">Clear</button>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button class="bulk-btn" id="bulk-feature-brands-btn">⭐ Feature on Store</button>
          <button class="bulk-btn" id="bulk-unfeature-brands-btn">✕ Unfeature</button>
          <button class="bulk-btn bulk-btn-danger" id="bulk-delete-brands-btn">🗑️ Delete Selected</button>
        </div>
      </div>
    ` : ''}

    <!-- 4. Brands Content (Table or Grid) -->
    ${brandViewMode === 'table' ? `
      <div class="brand-table-container">
        <div class="table-wrapper">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0;">
                <th style="padding:12px 16px; width:36px; text-align:center;">
                  <input type="checkbox" id="select-all-brands-cb" ${allSelected ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
                </th>
                <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Brand Logo & Name</th>
                <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Slug URL</th>
                <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Website / Store</th>
                <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Catalog Products</th>
                <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Featured</th>
                <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase; text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="7" style="padding:48px 20px; text-align:center; color:#94a3b8;">
                    <div style="font-size:36px; margin-bottom:8px;">🔍</div>
                    <strong style="font-size:15px; color:#475569; display:block;">No brands found</strong>
                    <span style="font-size:13px;">Create your first brand above!</span>
                  </td>
                </tr>
              ` : filtered.map(b => {
                const isChecked = selectedBrandIds.has(b.id);
                const prodCount = getProductCount(b.name);
                const hasImg = b.image && b.image.length > 0;

                return `
                  <tr class="brand-row-hover" style="border-bottom:1px solid #e2e8f0; ${isChecked ? 'background:#eff6ff !important;' : ''}">
                    <td style="padding:14px 16px; text-align:center;">
                      <input type="checkbox" class="brand-select-cb" data-brand-id="${b.id}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
                    </td>
                    <td style="padding:14px 16px;">
                      <div style="display:flex; align-items:center; gap:12px;">
                        ${hasImg ? `
                          <img src="${b.image}" alt="${b.name}" class="brand-logo-thumb">
                        ` : `
                          <div class="brand-logo-thumb">${b.logo || '🏷️'}</div>
                        `}
                        <div style="display:flex; flex-direction:column;">
                          <a href="#" class="edit-brand-link" data-brand-id="${b.id}" style="font-size:14px; font-weight:850; color:#0f172a; text-decoration:none;">
                            ${b.name}
                          </a>
                          <small style="color:#64748b; font-size:11.5px;">${b.description || 'Verified Brand'}</small>
                        </div>
                      </div>
                    </td>
                    <td style="padding:14px 16px;">
                      <code style="font-size:12px; font-weight:700; color:#0052cc;">/brand/${b.slug || b.name.toLowerCase()}</code>
                    </td>
                    <td style="padding:14px 16px;">
                      ${b.website ? `
                        <a href="${b.website}" target="_blank" rel="noopener" style="color:#0052cc; font-size:12.5px; text-decoration:none; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
                          <span>Visit</span>
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </a>
                      ` : `<span style="color:#94a3b8; font-size:12px;">—</span>`}
                    </td>
                    <td style="padding:14px 16px;">
                      <span class="status-badge ${prodCount > 0 ? 'status-blue' : 'status-yellow'}" style="font-weight:750;">
                        ${prodCount} product${prodCount !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td style="padding:14px 16px;">
                      <button class="toggle-brand-featured-btn" data-brand-id="${b.id}" style="background:transparent; border:none; cursor:pointer; font-size:16px;" title="Toggle featured status">
                        ${b.featured ? '⭐' : '☆'}
                      </button>
                    </td>
                    <td style="padding:14px 16px; text-align:right;">
                      <div style="display:inline-flex; align-items:center; gap:6px;">
                        <button class="action-icon-btn edit-brand-btn" data-brand-id="${b.id}" title="Edit Brand">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </button>
                        <button class="action-icon-btn delete-btn delete-brand-btn" data-brand-id="${b.id}" title="Delete Brand">
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
    ` : `
      <!-- Grid Cards View -->
      <div class="brand-grid-container">
        ${filtered.map(b => {
          const prodCount = getProductCount(b.name);
          const hasImg = b.image && b.image.length > 0;
          const isChecked = selectedBrandIds.has(b.id);

          return `
            <div class="brand-card" style="${isChecked ? 'border-color:#0052cc; background:#eff6ff;' : ''}">
              <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="display:flex; align-items:center; gap:12px;">
                  ${hasImg ? `
                    <img src="${b.image}" alt="${b.name}" class="brand-logo-thumb" style="width:52px; height:52px;">
                  ` : `
                    <div class="brand-logo-thumb" style="width:52px; height:52px; font-size:24px;">${b.logo || '🏷️'}</div>
                  `}
                  <div>
                    <strong style="font-size:15px; color:#0f172a; display:block;">${b.name}</strong>
                    <code style="font-size:11px; color:#0052cc;">/brand/${b.slug || b.name.toLowerCase()}</code>
                  </div>
                </div>
                <button class="toggle-brand-featured-btn" data-brand-id="${b.id}" style="background:transparent; border:none; cursor:pointer; font-size:18px;">
                  ${b.featured ? '⭐' : '☆'}
                </button>
              </div>

              <p style="margin:0; font-size:12.5px; color:#64748b; line-height:1.4;">${b.description || 'Premium brand products collection.'}</p>

              <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e2e8f0; padding-top:12px; margin-top:auto;">
                <span class="status-badge ${prodCount > 0 ? 'status-blue' : 'status-yellow'}" style="font-weight:750; font-size:11px;">
                  ${prodCount} product${prodCount !== 1 ? 's' : ''}
                </span>
                <div style="display:flex; gap:6px;">
                  <button class="action-icon-btn edit-brand-btn" data-brand-id="${b.id}" title="Edit Brand">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  </button>
                  <button class="action-icon-btn delete-btn delete-brand-btn" data-brand-id="${b.id}" title="Delete Brand">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}

    <!-- 5. Brand Add/Edit Modal -->
    <div class="modal-backdrop ${showModal ? 'show' : ''}" id="brand-crud-modal">
      <div class="modal-wrapper product-form-dark-wrapper glass-panel animate-in" style="max-width: 650px; width: 95%;">
        
        <!-- Modal Header -->
        <div class="modal-header-modern" style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:14px;">
            <button class="back-circle-btn" id="close-brand-modal-btn" title="Back">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <div>
              <h3 style="margin:0; font-size:18px; font-weight:850; color:#ffffff;">
                ${isEditing ? `Edit Brand: ${editBrand.name || ''}` : 'Register New Brand'}
              </h3>
              <p style="margin:2px 0 0 0; font-size:12.5px; color:#94a3b8;">Set brand logos, cover images, and company links</p>
            </div>
          </div>
        </div>

        <!-- Modal Form Body -->
        <div class="modal-body-modern custom-scroll" style="max-height:78vh; overflow-y:auto; padding:10px 4px;">
          <form id="brand-crud-form" autocomplete="off" style="display:flex; flex-direction:column; gap:18px;">
            
            <!-- Brand Name & Slug -->
            <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:14px;">
              <div class="form-group-modern">
                <label>Brand Name *</label>
                <input type="text" id="brand-name-input" name="brand_name_no_autofill" required placeholder="e.g. Keychron, Sony, Apple" value="${editBrand.name || ''}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
              </div>

              <div class="form-group-modern">
                <label>URL Slug</label>
                <input type="text" id="brand-slug-input" name="brand_slug_no_autofill" placeholder="e.g. keychron" value="${editBrand.slug || ''}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
              </div>
            </div>

            <!-- Brand Logo / Cover Image Uploader (Dual Dropzone & URL) -->
            <div class="form-group-modern">
              <label>Brand Logo / Cover Image</label>
              
              <!-- URL input fallback -->
              <div style="display:flex; gap:8px; margin-bottom:8px;">
                <input type="text" id="brand-image-url-input" name="brand_img_url_no_autofill" placeholder="Or paste image URL (https://...)" value="${editBrand.image || ''}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none" style="padding:8px 12px; font-size:12px;">
                <button type="button" id="apply-brand-img-url-btn" class="admin-btn" style="background:rgba(255,255,255,0.1); color:white; padding:8px 14px; font-size:12px; white-space:nowrap;">Load</button>
              </div>

              <!-- Dropzone Box -->
              <div class="image-upload-dropzone" id="brand-image-dropzone" style="height:150px;">
                <input type="file" id="brand-image-file-input" accept="image/*" style="display:none;">
                
                <div class="dropzone-empty-state" id="brand-dropzone-empty" style="${editBrand.image ? 'display:none;' : ''}">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#64748b" stroke-width="2" style="width:24px; height:24px; margin-bottom:6px;">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span class="upload-title">DROP BRAND LOGO OR CLICK TO UPLOAD</span>
                  <span class="upload-formats">PNG · JPG · WEBP · SVG</span>
                </div>
                
                <div class="dropzone-preview-state" id="brand-dropzone-preview" style="${editBrand.image ? '' : 'display:none;'}">
                  <img id="brand-image-preview" src="${editBrand.image || ''}" alt="Preview" style="max-height:120px; border-radius:8px; object-fit:contain;">
                  <button type="button" class="remove-preview-btn" id="remove-brand-image-btn" title="Remove image">&times;</button>
                </div>
              </div>
              <input type="hidden" id="brand-image-val" value="${editBrand.image || ''}">
            </div>

            <!-- Emoji Fallback & Website URL -->
            <div style="display:grid; grid-template-columns:0.8fr 1.2fr; gap:14px;">
              <div class="form-group-modern">
                <label>Emoji / Logo Icon</label>
                <input type="text" id="brand-logo-input" name="brand_logo_icon_no_autofill" placeholder="e.g. 🏷️" value="${editBrand.logo || '🏷️'}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none" style="text-align:center; font-size:18px;">
              </div>

              <div class="form-group-modern">
                <label>Official Website / Store</label>
                <input type="url" id="brand-website-input" name="brand_website_no_autofill" placeholder="https://brand.com" value="${editBrand.website || ''}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
              </div>
            </div>

            <!-- Description -->
            <div class="form-group-modern">
              <label>Brand Story / Description</label>
              <textarea id="brand-desc-input" rows="3" placeholder="Tell customers about the brand philosophy and build quality...">${editBrand.description || ''}</textarea>
            </div>

            <!-- Featured in Carousel Toggle -->
            <div class="form-group-modern">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:white; font-size:13px; font-weight:700;">
                <input type="checkbox" id="brand-featured-toggle" ${editBrand.featured ? 'checked' : ''} style="width:16px; height:16px; accent-color:#0052cc;">
                <span>⭐ Feature in Homepage Brand Carousel</span>
              </label>
            </div>

            <div id="brand-error-msg" class="error-text" style="color:#ef4444; font-size:13px; font-weight:700;"></div>

            <!-- Submit Button -->
            <button type="submit" class="admin-btn admin-btn-primary" id="save-brand-btn" style="padding:14px; font-size:14px; font-weight:800; margin-top:6px;">
              ${isEditing ? '✓ Save Brand Changes' : '🚀 Register Brand'}
            </button>

          </form>
        </div>

      </div>
    </div>
  `;
}

export function attachAdminBrandsListeners(context, shadow) {
  // 1. Search Input
  const searchInput = shadow.getElementById('brand-search-input');
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
      context.render();
      context.attachListeners();
      const sRef = shadow.getElementById('brand-search-input');
      if (sRef) {
        sRef.focus();
        sRef.setSelectionRange(sRef.value.length, sRef.value.length);
      }
    });
  }

  // 2. Sorting
  const sortSelect = shadow.getElementById('brand-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      context.render();
      context.attachListeners();
    });
  }

  // 3. View Switcher (Table vs Grid)
  const tableBtn = shadow.getElementById('brand-view-table-btn');
  const gridBtn = shadow.getElementById('brand-view-grid-btn');
  if (tableBtn) {
    tableBtn.addEventListener('click', () => {
      brandViewMode = 'table';
      context.render();
      context.attachListeners();
    });
  }
  if (gridBtn) {
    gridBtn.addEventListener('click', () => {
      brandViewMode = 'grid';
      context.render();
      context.attachListeners();
    });
  }

  // 4. Open Add Modal
  const addMainBtn = shadow.getElementById('add-brand-main-btn');
  if (addMainBtn) {
    addMainBtn.addEventListener('click', () => {
      context.editingBrand = null;
      context.showBrandModal = true;
      context.render();
      context.attachListeners();
    });
  }

  // Edit Brand
  shadow.querySelectorAll('.edit-brand-btn, .edit-brand-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = parseInt(btn.getAttribute('data-brand-id'));
      const brand = (context.brands || []).find(b => b.id === id);
      if (brand) {
        context.editingBrand = brand;
        context.showBrandModal = true;
        context.render();
        context.attachListeners();
      }
    });
  });

  // Close Modal
  const closeBtn = shadow.getElementById('close-brand-modal-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      context.showBrandModal = false;
      context.editingBrand = null;
      context.render();
      context.attachListeners();
    });
  }

  // Name to slug auto generator
  const nameInput = shadow.getElementById('brand-name-input');
  const slugInput = shadow.getElementById('brand-slug-input');
  if (nameInput && slugInput) {
    nameInput.addEventListener('input', () => {
      if (!context.editingBrand) {
        slugInput.value = nameInput.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      }
    });
  }

  // Image Upload Dropzone & URL Loader
  const dropzone = shadow.getElementById('brand-image-dropzone');
  const fileInput = shadow.getElementById('brand-image-file-input');
  const removeImgBtn = shadow.getElementById('remove-brand-image-btn');
  const imgUrlVal = shadow.getElementById('brand-image-val');
  const imgUrlInput = shadow.getElementById('brand-image-url-input');
  const applyImgUrlBtn = shadow.getElementById('apply-brand-img-url-btn');
  const dropzoneEmpty = shadow.getElementById('brand-dropzone-empty');
  const dropzonePreview = shadow.getElementById('brand-dropzone-preview');
  const previewImg = shadow.getElementById('brand-image-preview');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', (e) => {
      if (e.target.closest('#remove-brand-image-btn')) return;
      fileInput.click();
    });

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (file) {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Uploading brand image to Supabase Cloud Storage...' }));
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
          window.dispatchEvent(new CustomEvent('toast:show', { detail: cloudUrl ? 'Brand image saved to Supabase Cloud Storage! ☁️' : 'Image loaded!' }));
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
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Brand logo loaded from URL!' }));
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

  // 5. Delete Brand with check for active products
  shadow.querySelectorAll('.delete-brand-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.getAttribute('data-brand-id'));
      const index = (context.brands || []).findIndex(b => b.id === id);
      if (index > -1) {
        const brand = context.brands[index];
        const hasProducts = (context.products || []).some(p => p.brand === brand.name);
        if (hasProducts) {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Cannot delete brand "${brand.name}" because it still has active catalog products assigned!` }));
          return;
        }

        const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
          title: '🔥 Permanent Delete Brand',
          message: `Are you sure you want to PERMANENTLY DELETE brand "${brand.name}"? It will be erased from local storage and Supabase cloud.`,
          confirmText: '🔥 Delete Forever',
          cancelText: 'Cancel',
          type: 'danger',
          icon: '🏷️'
        }) : Promise.resolve(confirm(`Are you sure you want to permanently delete brand "${brand.name}"?`)));

        if (confirmed) {
          // Permanently delete from Supabase cloud
          import('../../utils/supabase.js').then(({ supabase }) => {
            if (supabase) {
              supabase.from('brands').delete().or(`name.eq.${encodeURIComponent(brand.name)},slug.eq.${encodeURIComponent(brand.slug || brand.name)}`).then();
            }
          }).catch(() => {});

          context.brands.splice(index, 1);
          context.saveDatabase('brands');
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `🔥 Brand "${brand.name}" permanently deleted forever.` }));
          context.render();
          context.attachListeners();
        }
      }
    });
  });

  // 6. Toggle Featured
  shadow.querySelectorAll('.toggle-brand-featured-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-brand-id'));
      const brand = (context.brands || []).find(b => b.id === id);
      if (brand) {
        brand.featured = !brand.featured;
        context.saveDatabase('brands');
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `"${brand.name}" is now ${brand.featured ? 'Featured' : 'Unfeatured'}.` }));
        context.render();
        context.attachListeners();
      }
    });
  });

  // 7. Checkboxes & Bulk Actions
  const selectAllCb = shadow.getElementById('select-all-brands-cb');
  if (selectAllCb) {
    selectAllCb.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      shadow.querySelectorAll('.brand-select-cb').forEach(cb => {
        const id = parseInt(cb.getAttribute('data-brand-id'));
        if (isChecked) selectedBrandIds.add(id);
        else selectedBrandIds.delete(id);
      });
      context.render();
      context.attachListeners();
    });
  }

  shadow.querySelectorAll('.brand-select-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = parseInt(cb.getAttribute('data-brand-id'));
      if (e.target.checked) selectedBrandIds.add(id);
      else selectedBrandIds.delete(id);
      context.render();
      context.attachListeners();
    });
  });

  const deselectBtn = shadow.getElementById('bulk-deselect-brands-btn');
  if (deselectBtn) {
    deselectBtn.addEventListener('click', () => {
      selectedBrandIds.clear();
      context.render();
      context.attachListeners();
    });
  }

  const bulkFeature = shadow.getElementById('bulk-feature-brands-btn');
  if (bulkFeature) {
    bulkFeature.addEventListener('click', () => {
      selectedBrandIds.forEach(id => {
        const b = (context.brands || []).find(br => br.id === id);
        if (b) b.featured = true;
      });
      context.saveDatabase('brands');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Featured ${selectedBrandIds.size} brands on storefront.` }));
      selectedBrandIds.clear();
      context.render();
      context.attachListeners();
    });
  }

  const bulkUnfeature = shadow.getElementById('bulk-unfeature-brands-btn');
  if (bulkUnfeature) {
    bulkUnfeature.addEventListener('click', () => {
      selectedBrandIds.forEach(id => {
        const b = (context.brands || []).find(br => br.id === id);
        if (b) b.featured = false;
      });
      context.saveDatabase('brands');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Unfeatured selected brands.` }));
      selectedBrandIds.clear();
      context.render();
      context.attachListeners();
    });
  }

  const bulkDelete = shadow.getElementById('bulk-delete-brands-btn');
  if (bulkDelete) {
    bulkDelete.addEventListener('click', async () => {
      const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
        title: 'Bulk Delete Brands',
        message: `Are you sure you want to delete ${selectedBrandIds.size} selected brands?`,
        confirmText: 'Delete Selected',
        cancelText: 'Cancel',
        type: 'danger',
        icon: '🗑️'
      }) : Promise.resolve(confirm(`Are you sure you want to delete ${selectedBrandIds.size} selected brands?`)));

      if (confirmed) {
        context.brands = context.brands.filter(b => !selectedBrandIds.has(b.id));
        context.saveDatabase('brands');
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Deleted selected brands.` }));
        selectedBrandIds.clear();
        context.render();
        context.attachListeners();
      }
    });
  }

  // 8. Export to CSV
  const exportBtn = shadow.getElementById('export-brands-csv-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportBrandsToCSV(context.brands || [], context.products || []);
    });
  }

  // 9. Form Submission
  const form = shadow.getElementById('brand-crud-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = shadow.getElementById('brand-name-input').value.trim();
      const slug = shadow.getElementById('brand-slug-input').value.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const image = imgUrlVal.value.trim();
      const logo = shadow.getElementById('brand-logo-input').value.trim() || '🏷️';
      const website = shadow.getElementById('brand-website-input').value.trim();
      const description = shadow.getElementById('brand-desc-input').value.trim();
      const featured = shadow.getElementById('brand-featured-toggle').checked;

      const errorMsg = shadow.getElementById('brand-error-msg');
      errorMsg.textContent = '';

      if (!name) {
        errorMsg.textContent = 'Brand name is required.';
        return;
      }

      if (context.editingBrand && context.editingBrand.id) {
        // Edit mode
        const id = context.editingBrand.id;
        const idx = context.brands.findIndex(b => b.id === id);
        if (idx > -1) {
          const oldName = context.brands[idx].name;
          // If brand name changed, sync product brand fields
          if (oldName !== name) {
            (context.products || []).forEach(p => {
              if (p.brand === oldName) p.brand = name;
            });
            context.saveDatabase('products');
          }

          context.brands[idx] = {
            ...context.brands[idx],
            name,
            slug,
            image,
            logo,
            website,
            description,
            featured
          };
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Brand "${name}" updated!` }));
        }
      } else {
        // Create new
        const newId = context.brands.length > 0 ? (Math.max(...context.brands.map(b => b.id || 0)) + 1) : 1;
        context.brands.push({
          id: newId,
          name,
          slug,
          image,
          logo,
          website,
          description,
          featured
        });
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Brand "${name}" created!` }));
      }

      context.saveDatabase('brands');
      context.showBrandModal = false;
      context.editingBrand = null;
      context.render();
      context.attachListeners();
    });
  }
}

// Export Brands to CSV
function exportBrandsToCSV(brands, products) {
  if (!brands || brands.length === 0) {
    window.dispatchEvent(new CustomEvent('toast:show', { detail: 'No brands to export.' }));
    return;
  }

  const headers = ['ID', 'Brand Name', 'Slug', 'Website', 'Products Count', 'Featured', 'Description'];
  const rows = brands.map(b => {
    const pCount = products.filter(p => p.brand === b.name).length;
    return [
      b.id,
      `"${(b.name || '').replace(/"/g, '""')}"`,
      `"${b.slug || ''}"`,
      `"${b.website || ''}"`,
      pCount,
      b.featured ? 'Yes' : 'No',
      `"${(b.description || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SWEETOS_Brands_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
