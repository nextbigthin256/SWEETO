// Dedicated Admin Category Management with Parent & Subcategory Hierarchy + Cover/Folder Image Support

// Global internal state helpers
let selectedCategoryIds = new Set();
let categoryViewMode = 'tree'; // 'tree' | 'flat'
let parentFilter = 'All';
let sortBy = 'name_asc';

export function renderAdminCategories(context) {
  const query = (context.searchQuery || '').toLowerCase().trim();
  const rawCategories = context.categories || [];
  const rawProducts = context.products || [];

  // Map product counts to categories
  const getProductCount = (catName, catId) => {
    const directCount = rawProducts.filter(p => p.category === catName || p.subCategory === catName).length;
    const subcats = rawCategories.filter(c => c.parent === catId || c.parent === catName);
    const subcatCount = subcats.reduce((sum, sc) => sum + rawProducts.filter(p => p.category === sc.name || p.subCategory === sc.name).length, 0);
    return directCount + subcatCount;
  };

  // Identify Parents and Subcategories
  const parentCategories = rawCategories.filter(c => !c.parent || c.parent === null || c.parent === 0 || c.parent === '');
  const subCategories = rawCategories.filter(c => c.parent && c.parent !== null && c.parent !== 0 && c.parent !== '');

  // Helper to resolve parent name
  const getParentName = (parentId) => {
    const p = rawCategories.find(c => c.id === parentId || c.name === parentId);
    return p ? p.name : 'Unknown Parent';
  };

  // Filter categories
  let filtered = rawCategories.filter(c => {
    if (query) {
      const matchName = (c.name || '').toLowerCase().includes(query);
      const matchSlug = (c.slug || '').toLowerCase().includes(query);
      const matchDesc = (c.description || '').toLowerCase().includes(query);
      if (!matchName && !matchSlug && !matchDesc) return false;
    }
    if (parentFilter === 'parents_only' && (c.parent && c.parent !== null)) return false;
    if (parentFilter === 'subs_only' && (!c.parent || c.parent === null)) return false;
    if (parentFilter !== 'All' && parentFilter !== 'parents_only' && parentFilter !== 'subs_only') {
      if (c.parent !== parentFilter && c.parent !== parseInt(parentFilter) && c.id !== parseInt(parentFilter) && c.name !== parentFilter) return false;
    }
    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
    if (sortBy === 'products_high') return getProductCount(b.name, b.id) - getProductCount(a.name, a.id);
    if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
    return 0;
  });

  // KPI Calculations
  const totalCount = rawCategories.length;
  const totalParents = parentCategories.length;
  const totalSubs = subCategories.length;
  const totalFeatured = rawCategories.filter(c => c.featured).length;

  const isEditing = context.editingCategory !== null && context.editingCategory !== undefined;
  const showModal = context.showCategoryModal === true;
  const editCat = context.editingCategory || {};

  const allSelected = filtered.length > 0 && filtered.every(c => selectedCategoryIds.has(c.id));

  return `
    <style>
      .categories-kpi-grid {
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
      .category-toolbar {
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
      .category-table-container {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      }
      .category-row-hover:hover {
        background-color: rgba(241, 245, 249, 0.6) !important;
      }
      .category-thumb-box {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
        border: 1px solid #e2e8f0;
        overflow: hidden;
      }
      .category-thumb-box img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .badge-parent {
        background: #e0f2fe;
        color: #0369a1;
        border: 1px solid #bae6fd;
        font-size: 11px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 6px;
        text-transform: uppercase;
      }
      .badge-sub {
        background: #ede9fe;
        color: #6d28d9;
        border: 1px solid #ddd6fe;
        font-size: 11px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .tree-nest-line {
        display: inline-block;
        width: 18px;
        height: 18px;
        border-left: 2px solid #cbd5e1;
        border-bottom: 2px solid #cbd5e1;
        margin-right: 6px;
        margin-left: 8px;
        border-bottom-left-radius: 4px;
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
    </style>

    <!-- 1. Category Metrics / KPI Bar -->
    <div class="categories-kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(0, 82, 204, 0.1); color: #0052cc;">📁</div>
        <div>
          <span class="kpi-title">Total Categories</span>
          <span class="kpi-val">${totalCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(14, 165, 233, 0.1); color: #0284c7;">🌳</div>
        <div>
          <span class="kpi-title">Parent Categories</span>
          <span class="kpi-val" style="color: #0284c7;">${totalParents}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6;">🌿</div>
        <div>
          <span class="kpi-title">Subcategories</span>
          <span class="kpi-val" style="color: #8b5cf6;">${totalSubs}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(34, 197, 94, 0.1); color: #16a34a;">⭐</div>
        <div>
          <span class="kpi-title">Featured on Home</span>
          <span class="kpi-val" style="color: #16a34a;">${totalFeatured}</span>
        </div>
      </div>
    </div>

    <!-- 2. Toolbar & Multi-Filters -->
    <div class="category-toolbar">
      <div class="filter-controls-group">
        <!-- Search Box -->
        <div class="clean-search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="category-search-input" name="cat_search_query_no_autofill" placeholder="Search categories, subcategories, slugs..." value="${(context.searchQuery || '').includes('@') ? '' : (context.searchQuery || '')}" autocomplete="new-password" aria-autocomplete="none" spellcheck="false">
        </div>

        <!-- Hierarchy Filter -->
        <select class="select-filter-btn" id="category-hierarchy-filter" title="Filter hierarchy">
          <option value="All" ${parentFilter === 'All' ? 'selected' : ''}>📂 All Structure</option>
          <option value="parents_only" ${parentFilter === 'parents_only' ? 'selected' : ''}>🌳 Parent Categories Only</option>
          <option value="subs_only" ${parentFilter === 'subs_only' ? 'selected' : ''}>🌿 Subcategories Only</option>
          <optgroup label="Filter by Parent">
            ${parentCategories.map(p => `
              <option value="${p.id}" ${parentFilter === p.id.toString() || parentFilter === p.name ? 'selected' : ''}>${p.icon || '📁'} ${p.name} (Subcategories)</option>
            `).join('')}
          </optgroup>
        </select>

        <!-- Sorting -->
        <select class="select-filter-btn" id="category-sort-select" title="Sort categories">
          <option value="name_asc" ${sortBy === 'name_asc' ? 'selected' : ''}>🔤 Name: A to Z</option>
          <option value="name_desc" ${sortBy === 'name_desc' ? 'selected' : ''}>🔤 Name: Z to A</option>
          <option value="products_high" ${sortBy === 'products_high' ? 'selected' : ''}>📦 Most Products</option>
          <option value="newest" ${sortBy === 'newest' ? 'selected' : ''}>⚡ Newest Created</option>
        </select>

        <!-- View Mode Switcher -->
        <div class="view-toggle-group">
          <button class="view-toggle-btn ${categoryViewMode === 'tree' ? 'active' : ''}" id="view-tree-btn" title="Hierarchical Tree View">
            <span>🌳 Tree View</span>
          </button>
          <button class="view-toggle-btn ${categoryViewMode === 'flat' ? 'active' : ''}" id="view-flat-btn" title="Flat Table View">
            <span>📋 Flat View</span>
          </button>
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:10px;">
        <button class="select-filter-btn" id="export-categories-csv-btn" style="background:#f8fafc; display:flex; align-items:center; gap:6px;">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Export CSV</span>
        </button>

        <button class="admin-btn admin-btn-primary" id="add-category-main-btn" style="display:flex; align-items:center; gap:8px; padding:10px 18px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Add Category</span>
        </button>
      </div>
    </div>

    <!-- 3. Bulk Actions Bar -->
    ${selectedCategoryIds.size > 0 ? `
      <div class="bulk-action-bar">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-weight:800; font-size:13.5px;">✓ ${selectedCategoryIds.size} categor${selectedCategoryIds.size > 1 ? 'ies' : 'y'} selected</span>
          <button class="bulk-btn" id="bulk-deselect-cats-btn" style="background:transparent; border:none; text-decoration:underline; font-size:12px; cursor:pointer;">Clear</button>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button class="bulk-btn" id="bulk-feature-cats-btn">⭐ Feature on Home</button>
          <button class="bulk-btn" id="bulk-unfeature-cats-btn">✕ Unfeature</button>
          <button class="bulk-btn bulk-btn-danger" id="bulk-delete-cats-btn">🗑️ Delete Selected</button>
        </div>
      </div>
    ` : ''}

    <!-- 4. Categories Data Table -->
    <div class="category-table-container">
      <div class="table-wrapper">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0;">
              <th style="padding:12px 16px; width:36px; text-align:center;">
                <input type="checkbox" id="select-all-cats-cb" ${allSelected ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
              </th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Category / Folder Cover</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Hierarchy Level</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">URL Slug</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Products Count</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Featured</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${(() => {
              if (filtered.length === 0) {
                return `
                  <tr>
                    <td colspan="7" style="padding:48px 20px; text-align:center; color:#94a3b8;">
                      <div style="font-size:36px; margin-bottom:8px;">🔍</div>
                      <strong style="font-size:15px; color:#475569; display:block;">No categories found</strong>
                      <span style="font-size:13px;">Create your first parent category or subcategory above!</span>
                    </td>
                  </tr>
                `;
              }

              // Render Tree View or Flat View
              if (categoryViewMode === 'tree') {
                return parentCategories.map(parent => {
                  const isChecked = selectedCategoryIds.has(parent.id);
                  const subs = subCategories.filter(sc => sc.parent === parent.id || sc.parent === parent.name);
                  const prodCount = getProductCount(parent.name, parent.id);
                  const hasImg = parent.image && parent.image.length > 0;

                  let rows = `
                    <!-- Parent Category Row -->
                    <tr class="category-row-hover" style="border-bottom:1px solid #e2e8f0; background:rgba(248,250,252,0.5); ${isChecked ? 'background:#eff6ff !important;' : ''}">
                      <td style="padding:14px 16px; text-align:center;">
                        <input type="checkbox" class="cat-select-cb" data-cat-id="${parent.id}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
                      </td>
                      <td style="padding:14px 16px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                          <div class="category-thumb-box">
                            ${hasImg ? `<img src="${parent.image}" alt="${parent.name}">` : (parent.icon || '📁')}
                          </div>
                          <div style="display:flex; flex-direction:column;">
                            <a href="#" class="edit-cat-link" data-cat-id="${parent.id}" style="font-size:14px; font-weight:850; color:#0f172a; text-decoration:none;">
                              ${parent.name}
                            </a>
                            <small style="color:#64748b; font-size:11.5px;">${parent.description || 'Main Department'}</small>
                          </div>
                        </div>
                      </td>
                      <td style="padding:14px 16px;">
                        <span class="badge-parent">🌳 Parent (${subs.length} sub)</span>
                      </td>
                      <td style="padding:14px 16px;">
                        <code style="font-size:12px; font-weight:700; color:#0052cc;">/${parent.slug || parent.name.toLowerCase()}</code>
                      </td>
                      <td style="padding:14px 16px;">
                        <strong style="color:#0f172a; font-size:13.5px;">${prodCount} item${prodCount !== 1 ? 's' : ''}</strong>
                      </td>
                      <td style="padding:14px 16px;">
                        <button class="toggle-featured-btn" data-cat-id="${parent.id}" style="background:transparent; border:none; cursor:pointer; font-size:16px;" title="Toggle homepage feature">
                          ${parent.featured ? '⭐' : '☆'}
                        </button>
                      </td>
                      <td style="padding:14px 16px; text-align:right;">
                        <div style="display:inline-flex; align-items:center; gap:6px;">
                          <button class="action-icon-btn add-subcat-quick-btn" data-parent-id="${parent.id}" title="Add Subcategory under ${parent.name}">
                            <span style="font-size:13px; font-weight:800;">+🌿</span>
                          </button>
                          <button class="action-icon-btn edit-cat-btn" data-cat-id="${parent.id}" title="Edit Category">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                          </button>
                          <button class="action-icon-btn delete-btn delete-cat-btn" data-cat-id="${parent.id}" title="Delete Category">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;

                  subs.forEach(sub => {
                    const isSubChecked = selectedCategoryIds.has(sub.id);
                    const subProdCount = rawProducts.filter(p => p.category === sub.name || p.subCategory === sub.name).length;
                    const hasSubImg = sub.image && sub.image.length > 0;

                    rows += `
                      <!-- Subcategory Row -->
                      <tr class="category-row-hover" style="border-bottom:1px solid #e2e8f0; ${isSubChecked ? 'background:#eff6ff !important;' : ''}">
                        <td style="padding:12px 16px; text-align:center;">
                          <input type="checkbox" class="cat-select-cb" data-cat-id="${sub.id}" ${isSubChecked ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
                        </td>
                        <td style="padding:12px 16px;">
                          <div style="display:flex; align-items:center;">
                            <span class="tree-nest-line"></span>
                            <div class="category-thumb-box" style="width:34px; height:34px; font-size:15px; margin-right:10px;">
                              ${hasSubImg ? `<img src="${sub.image}" alt="${sub.name}">` : (sub.icon || '🌿')}
                            </div>
                            <div style="display:flex; flex-direction:column;">
                              <a href="#" class="edit-cat-link" data-cat-id="${sub.id}" style="font-size:13px; font-weight:750; color:#1e293b; text-decoration:none;">
                                ${sub.name}
                              </a>
                              <small style="color:#94a3b8; font-size:11px;">${sub.description || `Subcategory of ${parent.name}`}</small>
                            </div>
                          </div>
                        </td>
                        <td style="padding:12px 16px;">
                          <span class="badge-sub">🌿 Sub &rarr; ${parent.name}</span>
                        </td>
                        <td style="padding:12px 16px;">
                          <code style="font-size:11.5px; color:#64748b;">/${parent.slug || parent.name.toLowerCase()}/${sub.slug || sub.name.toLowerCase()}</code>
                        </td>
                        <td style="padding:12px 16px;">
                          <span style="color:#475569; font-size:13px; font-weight:600;">${subProdCount} item${subProdCount !== 1 ? 's' : ''}</span>
                        </td>
                        <td style="padding:12px 16px;">
                          <button class="toggle-featured-btn" data-cat-id="${sub.id}" style="background:transparent; border:none; cursor:pointer; font-size:16px;" title="Toggle homepage feature">
                            ${sub.featured ? '⭐' : '☆'}
                          </button>
                        </td>
                        <td style="padding:12px 16px; text-align:right;">
                          <div style="display:inline-flex; align-items:center; gap:6px;">
                            <button class="action-icon-btn edit-cat-btn" data-cat-id="${sub.id}" title="Edit Subcategory">
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            </button>
                            <button class="action-icon-btn delete-btn delete-cat-btn" data-cat-id="${sub.id}" title="Delete Subcategory">
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  });

                  return rows;
                }).join('');
              } else {
                return filtered.map(c => {
                  const isChecked = selectedCategoryIds.has(c.id);
                  const isSub = c.parent && c.parent !== null;
                  const parentName = isSub ? getParentName(c.parent) : null;
                  const prodCount = getProductCount(c.name, c.id);
                  const hasImg = c.image && c.image.length > 0;

                  return `
                    <tr class="category-row-hover" style="border-bottom:1px solid #e2e8f0; ${isChecked ? 'background:#eff6ff !important;' : ''}">
                      <td style="padding:14px 16px; text-align:center;">
                        <input type="checkbox" class="cat-select-cb" data-cat-id="${c.id}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; accent-color:#0052cc;">
                      </td>
                      <td style="padding:14px 16px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                          <div class="category-thumb-box">
                            ${hasImg ? `<img src="${c.image}" alt="${c.name}">` : (c.icon || (isSub ? '🌿' : '📁'))}
                          </div>
                          <div style="display:flex; flex-direction:column;">
                            <a href="#" class="edit-cat-link" data-cat-id="${c.id}" style="font-size:13.5px; font-weight:800; color:#0f172a; text-decoration:none;">
                              ${c.name}
                            </a>
                            <small style="color:#64748b; font-size:11.5px;">${c.description || 'No description'}</small>
                          </div>
                        </div>
                      </td>
                      <td style="padding:14px 16px;">
                        ${isSub ? `<span class="badge-sub">🌿 Sub &rarr; ${parentName}</span>` : `<span class="badge-parent">🌳 Parent</span>`}
                      </td>
                      <td style="padding:14px 16px;">
                        <code style="font-size:12px; font-weight:700; color:#0052cc;">/${c.slug || c.name.toLowerCase()}</code>
                      </td>
                      <td style="padding:14px 16px;">
                        <strong style="color:#0f172a; font-size:13.5px;">${prodCount} items</strong>
                      </td>
                      <td style="padding:14px 16px;">
                        <button class="toggle-featured-btn" data-cat-id="${c.id}" style="background:transparent; border:none; cursor:pointer; font-size:16px;">
                          ${c.featured ? '⭐' : '☆'}
                        </button>
                      </td>
                      <td style="padding:14px 16px; text-align:right;">
                        <div style="display:inline-flex; align-items:center; gap:6px;">
                          <button class="action-icon-btn edit-cat-btn" data-cat-id="${c.id}" title="Edit Category">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                          </button>
                          <button class="action-icon-btn delete-btn delete-cat-btn" data-cat-id="${c.id}" title="Delete Category">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('');
              }
            })()}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 5. Category / Subcategory Modal -->
    <div class="modal-backdrop ${showModal ? 'show' : ''}" id="cat-crud-modal">
      <div class="modal-wrapper product-form-dark-wrapper glass-panel animate-in" style="max-width: 650px; width: 95%;">
        
        <!-- Modal Header -->
        <div class="modal-header-modern" style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:14px;">
            <button class="back-circle-btn" id="close-cat-modal-btn" title="Back">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <div>
              <h3 style="margin:0; font-size:18px; font-weight:850; color:#ffffff;">
                ${isEditing ? `Edit Category: ${editCat.name || ''}` : 'Add New Category'}
              </h3>
              <p style="margin:2px 0 0 0; font-size:12.5px; color:#94a3b8;">Set parent structure, folder cover images, and slugs</p>
            </div>
          </div>
        </div>

        <!-- Modal Form Body -->
        <div class="modal-body-modern custom-scroll" style="max-height:78vh; overflow-y:auto; padding:10px 4px;">
          <form id="cat-crud-form" style="display:flex; flex-direction:column; gap:18px;">
            
            <!-- Category Level Selector (Parent vs Subcategory) -->
            <div class="form-group-modern">
              <label>Category Hierarchy Level *</label>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <label class="cat-level-card" style="display:flex; align-items:center; gap:10px; padding:12px; border-radius:10px; background:#0c101b; border:1.5px solid ${!editCat.parent ? 'var(--primary)' : 'rgba(255,255,255,0.08)'}; cursor:pointer;">
                  <input type="radio" name="cat-level" value="parent" ${!editCat.parent ? 'checked' : ''} style="accent-color:#0052cc;">
                  <div>
                    <strong style="color:white; font-size:13px; display:block;">🌳 Parent Category</strong>
                    <small style="color:#94a3b8; font-size:11px;">Main department (e.g. Keyboards)</small>
                  </div>
                </label>

                <label class="cat-level-card" style="display:flex; align-items:center; gap:10px; padding:12px; border-radius:10px; background:#0c101b; border:1.5px solid ${editCat.parent ? 'var(--primary)' : 'rgba(255,255,255,0.08)'}; cursor:pointer;">
                  <input type="radio" name="cat-level" value="sub" ${editCat.parent ? 'checked' : ''} style="accent-color:#0052cc;">
                  <div>
                    <strong style="color:white; font-size:13px; display:block;">🌿 Subcategory</strong>
                    <small style="color:#94a3b8; font-size:11px;">Nested under a parent</small>
                  </div>
                </label>
              </div>
            </div>

            <!-- Parent Category Dropdown (Conditional when Subcategory selected) -->
            <div class="form-group-modern" id="parent-select-group" style="${editCat.parent ? 'display:flex;' : 'display:none;'}">
              <label>Select Parent Category *</label>
              <select id="cat-parent-select" class="admin-input" style="padding:12px 14px;">
                <option value="" disabled ${!editCat.parent ? 'selected' : ''}>Choose a parent category...</option>
                ${parentCategories.filter(p => !isEditing || p.id !== editCat.id).map(p => `
                  <option value="${p.id}" ${editCat.parent === p.id || editCat.parent === p.name ? 'selected' : ''}>
                    ${p.icon || '📁'} ${p.name}
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Name & Slug -->
            <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:14px;">
              <div class="form-group-modern">
                <label>Category Name *</label>
                <input type="text" id="cat-name-input" required placeholder="e.g. Mechanical Keyboards" value="${editCat.name || ''}" autocomplete="off">
              </div>

              <div class="form-group-modern">
                <label>URL Slug</label>
                <input type="text" id="cat-slug-input" placeholder="e.g. mechanical-keyboards" value="${editCat.slug || ''}">
              </div>
            </div>

            <!-- Category / Folder Cover Image Uploader (Dual Dropzone & URL) -->
            <div class="form-group-modern">
              <label>Category / Folder Cover Image</label>
              
              <!-- URL input fallback -->
              <div style="display:flex; gap:8px; margin-bottom:8px;">
                <input type="text" id="cat-image-url-input" placeholder="Or paste image URL (https://...)" value="${editCat.image || ''}" style="padding:8px 12px; font-size:12px;">
                <button type="button" id="apply-cat-img-url-btn" class="admin-btn" style="background:rgba(255,255,255,0.1); color:white; padding:8px 14px; font-size:12px; white-space:nowrap;">Load</button>
              </div>

              <!-- Dropzone Box -->
              <div class="image-upload-dropzone" id="cat-image-dropzone" style="height:150px;">
                <input type="file" id="cat-image-file-input" accept="image/*" style="display:none;">
                
                <div class="dropzone-empty-state" id="cat-dropzone-empty" style="${editCat.image ? 'display:none;' : ''}">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#64748b" stroke-width="2" style="width:24px; height:24px; margin-bottom:6px;">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span class="upload-title">DROP CATEGORY BANNER OR CLICK TO UPLOAD</span>
                  <span class="upload-formats">PNG · JPG · WEBP</span>
                </div>
                
                <div class="dropzone-preview-state" id="cat-dropzone-preview" style="${editCat.image ? '' : 'display:none;'}">
                  <img id="cat-image-preview" src="${editCat.image || ''}" alt="Preview" style="max-height:120px; border-radius:8px; object-fit:contain;">
                  <button type="button" class="remove-preview-btn" id="remove-cat-image-btn" title="Remove image">&times;</button>
                </div>
              </div>
              <input type="hidden" id="cat-image-val" value="${editCat.image || ''}">
            </div>

            <!-- Icon & Featured Toggle -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
              <div class="form-group-modern">
                <label>Category Icon / Emoji (Optional)</label>
                <input type="text" id="cat-icon-input" placeholder="e.g. 📁 or ⌨️" value="${editCat.icon || ''}" style="width:100%; font-size:14px;">
              </div>

              <div class="form-group-modern" style="justify-content:center;">
                <label>Storefront Placement</label>
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:white; font-size:13px; font-weight:700; margin-top:6px;">
                  <input type="checkbox" id="cat-featured-toggle" ${editCat.featured ? 'checked' : ''} style="width:16px; height:16px; accent-color:#0052cc;">
                  <span>⭐ Feature in Header Tabs</span>
                </label>
              </div>
            </div>

            <!-- Description -->
            <div class="form-group-modern">
              <label>Short Description</label>
              <textarea id="cat-desc-input" rows="2" placeholder="Brief summary of items in this category...">${editCat.description || ''}</textarea>
            </div>

            <div id="cat-error-msg" class="error-text" style="color:#ef4444; font-size:13px; font-weight:700;"></div>

            <!-- Submit Button -->
            <button type="submit" class="admin-btn admin-btn-primary" id="save-cat-btn" style="padding:14px; font-size:14px; font-weight:800; margin-top:6px;">
              ${isEditing ? '✓ Save Category Changes' : '🚀 Create Category'}
            </button>

          </form>
        </div>

      </div>
    </div>
  `;
}

export function attachAdminCategoriesListeners(context, shadow) {
  // 1. Search Input
  const searchInput = shadow.getElementById('category-search-input');
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
      const sRef = shadow.getElementById('category-search-input');
      if (sRef) {
        sRef.focus();
        sRef.setSelectionRange(sRef.value.length, sRef.value.length);
      }
    });
  }

  // 2. Hierarchy Filter
  const hierarchyFilter = shadow.getElementById('category-hierarchy-filter');
  if (hierarchyFilter) {
    hierarchyFilter.addEventListener('change', (e) => {
      parentFilter = e.target.value;
      context.render();
      context.attachListeners();
    });
  }

  // 3. Sorting Filter
  const sortSelect = shadow.getElementById('category-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      context.render();
      context.attachListeners();
    });
  }

  // 4. View Mode Switcher (Tree vs Flat)
  const treeBtn = shadow.getElementById('view-tree-btn');
  const flatBtn = shadow.getElementById('view-flat-btn');
  if (treeBtn) {
    treeBtn.addEventListener('click', () => {
      categoryViewMode = 'tree';
      context.render();
      context.attachListeners();
    });
  }
  if (flatBtn) {
    flatBtn.addEventListener('click', () => {
      categoryViewMode = 'flat';
      context.render();
      context.attachListeners();
    });
  }

  // 5. Open Add Modal
  const addMainBtn = shadow.getElementById('add-category-main-btn');
  if (addMainBtn) {
    addMainBtn.addEventListener('click', () => {
      context.editingCategory = null;
      context.showCategoryModal = true;
      context.render();
      context.attachListeners();
    });
  }

  // Quick Add Subcategory under specific parent
  shadow.querySelectorAll('.add-subcat-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parentId = parseInt(btn.getAttribute('data-parent-id'));
      context.editingCategory = { parent: parentId };
      context.showCategoryModal = true;
      context.render();
      context.attachListeners();
    });
  });

  // Edit category
  shadow.querySelectorAll('.edit-cat-btn, .edit-cat-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = parseInt(btn.getAttribute('data-cat-id'));
      const cat = (context.categories || []).find(c => c.id === id);
      if (cat) {
        context.editingCategory = cat;
        context.showCategoryModal = true;
        context.render();
        context.attachListeners();
      }
    });
  });

  // Close Modal
  const closeBtn = shadow.getElementById('close-cat-modal-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      context.showCategoryModal = false;
      context.editingCategory = null;
      context.render();
      context.attachListeners();
    });
  }

  // Radio button hierarchy toggle in modal
  shadow.querySelectorAll('input[name="cat-level"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const parentSelectGroup = shadow.getElementById('parent-select-group');
      if (parentSelectGroup) {
        parentSelectGroup.style.display = e.target.value === 'sub' ? 'flex' : 'none';
      }
    });
  });

  // Name to slug auto generator
  const nameInput = shadow.getElementById('cat-name-input');
  const slugInput = shadow.getElementById('cat-slug-input');
  if (nameInput && slugInput) {
    nameInput.addEventListener('input', () => {
      if (!context.editingCategory) {
        slugInput.value = nameInput.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      }
    });
  }



  // Category Image Upload Dropzone & URL Loader
  const dropzone = shadow.getElementById('cat-image-dropzone');
  const fileInput = shadow.getElementById('cat-image-file-input');
  const removeImgBtn = shadow.getElementById('remove-cat-image-btn');
  const imgUrlVal = shadow.getElementById('cat-image-val');
  const imgUrlInput = shadow.getElementById('cat-image-url-input');
  const applyImgUrlBtn = shadow.getElementById('apply-cat-img-url-btn');
  const dropzoneEmpty = shadow.getElementById('cat-dropzone-empty');
  const dropzonePreview = shadow.getElementById('cat-dropzone-preview');
  const previewImg = shadow.getElementById('cat-image-preview');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', (e) => {
      if (e.target.closest('#remove-cat-image-btn')) return;
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
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
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Category image loaded from URL!' }));
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

  // 6. Delete Category with safety check
  shadow.querySelectorAll('.delete-cat-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.getAttribute('data-cat-id'));
      const index = (context.categories || []).findIndex(c => c.id === id);
      if (index > -1) {
        const cat = context.categories[index];
        const hasSubs = context.categories.some(c => c.parent === id || c.parent === cat.name);
        if (hasSubs) {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Cannot delete "${cat.name}" because it has active subcategories! Delete or reassign subcategories first.` }));
          return;
        }

        const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
          title: '🔥 Permanent Delete Category',
          message: `Are you sure you want to PERMANENTLY DELETE category "${cat.name}"? It will be removed from local storage and Supabase cloud.`,
          confirmText: '🔥 Delete Forever',
          cancelText: 'Cancel',
          type: 'danger',
          icon: '🏷️'
        }) : Promise.resolve(confirm(`Are you sure you want to permanently delete category "${cat.name}"?`)));

        if (confirmed) {
          // Permanently delete from Supabase cloud
          import('../../utils/supabase.js').then(({ supabase }) => {
            if (supabase) {
              supabase.from('categories').delete().or(`name.eq.${encodeURIComponent(cat.name)},slug.eq.${encodeURIComponent(cat.slug || cat.name)}`).then();
            }
          }).catch(() => {});

          context.categories.splice(index, 1);
          context.saveDatabase('categories');
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `🔥 Category "${cat.name}" permanently deleted forever.` }));
          context.render();
          context.attachListeners();
        }
      }
    });
  });

  // 7. Toggle Featured
  shadow.querySelectorAll('.toggle-featured-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-cat-id'));
      const cat = (context.categories || []).find(c => c.id === id);
      if (cat) {
        cat.featured = !cat.featured;
        context.saveDatabase('categories');
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `"${cat.name}" is now ${cat.featured ? 'Featured' : 'Unfeatured'}.` }));
        context.render();
        context.attachListeners();
      }
    });
  });

  // 8. Checkboxes & Bulk Selection
  const selectAllCb = shadow.getElementById('select-all-cats-cb');
  if (selectAllCb) {
    selectAllCb.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      shadow.querySelectorAll('.cat-select-cb').forEach(cb => {
        const id = parseInt(cb.getAttribute('data-cat-id'));
        if (isChecked) selectedCategoryIds.add(id);
        else selectedCategoryIds.delete(id);
      });
      context.render();
      context.attachListeners();
    });
  }

  shadow.querySelectorAll('.cat-select-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = parseInt(cb.getAttribute('data-cat-id'));
      if (e.target.checked) selectedCategoryIds.add(id);
      else selectedCategoryIds.delete(id);
      context.render();
      context.attachListeners();
    });
  });

  const deselectBtn = shadow.getElementById('bulk-deselect-cats-btn');
  if (deselectBtn) {
    deselectBtn.addEventListener('click', () => {
      selectedCategoryIds.clear();
      context.render();
      context.attachListeners();
    });
  }

  const bulkFeature = shadow.getElementById('bulk-feature-cats-btn');
  if (bulkFeature) {
    bulkFeature.addEventListener('click', () => {
      selectedCategoryIds.forEach(id => {
        const c = (context.categories || []).find(cat => cat.id === id);
        if (c) c.featured = true;
      });
      context.saveDatabase('categories');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Featured ${selectedCategoryIds.size} categories on homepage.` }));
      selectedCategoryIds.clear();
      context.render();
      context.attachListeners();
    });
  }

  const bulkUnfeature = shadow.getElementById('bulk-unfeature-cats-btn');
  if (bulkUnfeature) {
    bulkUnfeature.addEventListener('click', () => {
      selectedCategoryIds.forEach(id => {
        const c = (context.categories || []).find(cat => cat.id === id);
        if (c) c.featured = false;
      });
      context.saveDatabase('categories');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Unfeatured selected categories.` }));
      selectedCategoryIds.clear();
      context.render();
      context.attachListeners();
    });
  }

  const bulkDelete = shadow.getElementById('bulk-delete-cats-btn');
  if (bulkDelete) {
    bulkDelete.addEventListener('click', async () => {
      const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
        title: 'Bulk Delete Categories',
        message: `Are you sure you want to delete ${selectedCategoryIds.size} selected categories?`,
        confirmText: 'Delete Selected',
        cancelText: 'Cancel',
        type: 'danger',
        icon: '🗑️'
      }) : Promise.resolve(confirm(`Are you sure you want to delete ${selectedCategoryIds.size} selected categories?`)));

      if (confirmed) {
        context.categories = context.categories.filter(c => !selectedCategoryIds.has(c.id));
        context.saveDatabase('categories');
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Deleted selected categories.` }));
        selectedCategoryIds.clear();
        context.render();
        context.attachListeners();
      }
    });
  }

  // 9. Export to CSV
  const exportBtn = shadow.getElementById('export-categories-csv-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportCategoriesToCSV(context.categories || []);
    });
  }

  // 10. Form Submission
  const form = shadow.getElementById('cat-crud-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = shadow.getElementById('cat-name-input').value.trim();
      const slug = shadow.getElementById('cat-slug-input').value.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const icon = shadow.getElementById('cat-icon-input').value.trim() || '📁';
      const image = imgUrlVal.value.trim();
      const description = shadow.getElementById('cat-desc-input').value.trim();
      const featured = shadow.getElementById('cat-featured-toggle').checked;
      const isSub = shadow.querySelector('input[name="cat-level"]:checked')?.value === 'sub';
      const parentSelect = shadow.getElementById('cat-parent-select');
      const parentId = isSub && parentSelect ? parseInt(parentSelect.value) || parentSelect.value : null;

      const errorMsg = shadow.getElementById('cat-error-msg');
      errorMsg.textContent = '';

      if (!name) {
        errorMsg.textContent = 'Category name is required.';
        return;
      }

      if (isSub && !parentId) {
        errorMsg.textContent = 'Please select a Parent Category for this subcategory.';
        return;
      }

      if (context.editingCategory && context.editingCategory.id) {
        // Edit mode
        const id = context.editingCategory.id;
        const idx = context.categories.findIndex(c => c.id === id);
        if (idx > -1) {
          context.categories[idx] = {
            ...context.categories[idx],
            name,
            slug,
            icon,
            image,
            description,
            featured,
            parent: isSub ? parentId : null
          };
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Category "${name}" updated!` }));
        }
      } else {
        // Create new
        const newId = context.categories.length > 0 ? (Math.max(...context.categories.map(c => c.id || 0)) + 1) : 1;
        context.categories.push({
          id: newId,
          name,
          slug,
          icon,
          image,
          description,
          featured,
          parent: isSub ? parentId : null,
          count: 0
        });
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Created category "${name}"!` }));
      }

      context.saveDatabase('categories');
      context.showCategoryModal = false;
      context.editingCategory = null;
      context.render();
      context.attachListeners();
    });
  }
}

// Export Categories to CSV
function exportCategoriesToCSV(categories) {
  if (!categories || categories.length === 0) {
    window.dispatchEvent(new CustomEvent('toast:show', { detail: 'No categories to export.' }));
    return;
  }

  const headers = ['ID', 'Category Name', 'Slug', 'Level', 'Parent ID', 'Icon', 'Featured', 'Description'];
  const rows = categories.map(c => [
    c.id,
    `"${(c.name || '').replace(/"/g, '""')}"`,
    `"${c.slug || ''}"`,
    c.parent ? 'Subcategory' : 'Parent Category',
    c.parent || '',
    `"${c.icon || ''}"`,
    c.featured ? 'Yes' : 'No',
    `"${(c.description || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SWEETOS_Categories_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
