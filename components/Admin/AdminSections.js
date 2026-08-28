// Dedicated Admin Homepage Section Layout Management

let typeFilter = 'All';

export function renderAdminSections(context) {
  const query = (context.searchQuery || '').toLowerCase().trim();
  const rawSections = context.homepageSections || [];
  const rawCategories = context.categories || [];
  const isEditing = context.editingSection !== null && context.editingSection !== undefined;
  const showModal = context.showSectionModal === true;
  const editSec = context.editingSection || {};

  // Ensure every section has an integer order index
  rawSections.forEach((s, idx) => {
    if (s.order === undefined || s.order === null) s.order = idx;
  });

  // Sort sections by their display sequence order
  const sortedSections = [...rawSections].sort((a, b) => (a.order || 0) - (b.order || 0));

  // Filter sections
  const filtered = sortedSections.filter(s => {
    if (query) {
      const matchName = (s.name || '').toLowerCase().includes(query);
      const matchType = (s.type || '').toLowerCase().includes(query);
      const matchCat = (s.category || '').toLowerCase().includes(query);
      if (!matchName && !matchType && !matchCat) return false;
    }
    if (typeFilter !== 'All' && s.type !== typeFilter) return false;
    return true;
  });

  // KPI Calculations
  const totalSections = rawSections.length;
  const activeSections = rawSections.filter(s => s.active).length;
  const inactiveSections = totalSections - activeSections;
  const layoutTypesCount = new Set(rawSections.map(s => s.type)).size;

  const getLayoutTypeBadge = (type) => {
    switch (type) {
      case 'categories': return { icon: '📁', label: 'Category Grid', bg: '#e0f2fe', color: '#0369a1' };
      case 'deals': return { icon: '⚡', label: 'Flash Deals', bg: '#fef3c7', color: '#92400e' };
      case 'new-arrivals': return { icon: '✨', label: 'New Arrivals', bg: '#ede9fe', color: '#6d28d9' };
      case 'best-sellers': return { icon: '🏆', label: 'Best Sellers', bg: '#dcfce7', color: '#15803d' };
      case 'carousel': return { icon: '🎠', label: 'Slider Carousel', bg: '#fce7f3', color: '#9d174d' };
      case 'banner': return { icon: '🖼️', label: 'Promo Banner', bg: '#ffedd5', color: '#c2410c' };
      case 'grid': default: return { icon: '▦', label: 'Custom Grid', bg: '#f1f5f9', color: '#334155' };
    }
  };

  return `
    <style>
      .sections-kpi-grid {
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
      .section-toolbar {
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
      .sections-table-container {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      }
      .section-row-hover:hover {
        background-color: rgba(241, 245, 249, 0.6) !important;
      }
      .order-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: #f1f5f9;
        color: #0052cc;
        font-weight: 850;
        font-size: 13px;
        border: 1px solid #e2e8f0;
      }
      .reorder-btn {
        width: 26px;
        height: 26px;
        border-radius: 6px;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .reorder-btn:hover:not([disabled]) {
        background: #0052cc;
        color: #ffffff;
        border-color: #0052cc;
      }
      .reorder-btn[disabled] {
        opacity: 0.3;
        cursor: not-allowed;
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

    <!-- 1. KPI Cards -->
    <div class="sections-kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(0, 82, 204, 0.1); color: #0052cc;">📑</div>
        <div>
          <span class="kpi-title">Total Sections</span>
          <span class="kpi-val">${totalSections}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(34, 197, 94, 0.1); color: #16a34a;">🟢</div>
        <div>
          <span class="kpi-title">Active on Homepage</span>
          <span class="kpi-val" style="color: #16a34a;">${activeSections}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(245, 158, 11, 0.12); color: #d97706;">⏸️</div>
        <div>
          <span class="kpi-title">Drafts / Inactive</span>
          <span class="kpi-val" style="color: #d97706;">${inactiveSections}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6;">🎨</div>
        <div>
          <span class="kpi-title">Layout Varieties</span>
          <span class="kpi-val" style="color: #8b5cf6;">${layoutTypesCount} types</span>
        </div>
      </div>
    </div>

    <!-- 2. Toolbar & Filters -->
    <div class="section-toolbar">
      <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; flex:1;">
        <div class="clean-search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="search" role="searchbox" aria-label="Search" id="section-search-input" name="q_search_no_credentials" placeholder="Search section title, layout type, category..." value="${context.searchQuery || ''}" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false">
        </div>

        <select class="select-filter-btn" id="section-type-filter" title="Filter by layout type">
          <option value="All" ${typeFilter === 'All' ? 'selected' : ''}>🎨 All Layouts</option>
          <option value="categories" ${typeFilter === 'categories' ? 'selected' : ''}>📁 Shop by Category Grid</option>
          <option value="deals" ${typeFilter === 'deals' ? 'selected' : ''}>⚡ Hot Deals Showcase</option>
          <option value="new-arrivals" ${typeFilter === 'new-arrivals' ? 'selected' : ''}>✨ New Arrivals</option>
          <option value="best-sellers" ${typeFilter === 'best-sellers' ? 'selected' : ''}>🏆 Best Sellers</option>
          <option value="grid" ${typeFilter === 'grid' ? 'selected' : ''}>▦ Custom Product Grid</option>
          <option value="carousel" ${typeFilter === 'carousel' ? 'selected' : ''}>🎠 Slider Carousel</option>
          <option value="banner" ${typeFilter === 'banner' ? 'selected' : ''}>🖼️ Promo Banner</option>
        </select>
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        <button class="admin-btn" id="open-more-love-studio-btn" style="background: #fdf2f8; color: #db2777; border: 1.5px solid #fbcfe8; display: flex; align-items: center; gap: 6px; padding: 10px 16px; font-weight: 800; border-radius: 10px; cursor: pointer;" title="Configurer la section More to Love">
          <span>💖 More to Love Studio</span>
        </button>
        <button class="admin-btn admin-btn-primary" id="add-section-main-btn" style="display:flex; align-items:center; gap:8px; padding:10px 18px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Add Section</span>
        </button>
      </div>
    </div>

    <!-- 3. Sections Data Table with Sequence Controls -->
    <div class="sections-table-container">
      <div class="table-wrapper">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0;">
              <th style="padding:12px 16px; width:70px; text-align:center; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Sequence</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Section Name</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Layout Style</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Target Category</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Storefront Visibility</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr>
                <td colspan="6" style="padding:48px 20px; text-align:center; color:#94a3b8;">
                  <div style="font-size:36px; margin-bottom:8px;">🎨</div>
                  <strong style="font-size:15px; color:#475569; display:block;">No homepage sections found</strong>
                  <span style="font-size:13px;">Create a new custom banner, carousel, or deal showcase above!</span>
                </td>
              </tr>
            ` : filtered.map((s, idx) => {
              const badge = getLayoutTypeBadge(s.type);
              const isFirst = idx === 0;
              const isLast = idx === filtered.length - 1;

              return `
                <tr class="section-row-hover" style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:14px 16px; text-align:center;">
                    <div style="display:flex; align-items:center; justify-content:center; gap:6px;">
                      <div class="order-pill">#${idx + 1}</div>
                      <div style="display:flex; flex-direction:column; gap:2px;">
                        <button class="reorder-btn move-up-btn" data-sec-id="${s.id}" ${isFirst ? 'disabled' : ''} title="Move Up">▲</button>
                        <button class="reorder-btn move-down-btn" data-sec-id="${s.id}" ${isLast ? 'disabled' : ''} title="Move Down">▼</button>
                      </div>
                    </div>
                  </td>
                  <td style="padding:14px 16px;">
                    <div style="display:flex; flex-direction:column;">
                      <strong style="font-size:14px; color:#0f172a;">${s.name}</strong>
                      <small style="color:#64748b; font-size:11.5px;">${s.subtitle || 'Homepage Section'}</small>
                    </div>
                  </td>
                  <td style="padding:14px 16px;">
                    <span style="display:inline-flex; align-items:center; gap:6px; background:${badge.bg}; color:${badge.color}; font-size:11.5px; font-weight:800; padding:4px 10px; border-radius:6px; text-transform:uppercase;">
                      <span>${badge.icon}</span>
                      <span>${badge.label}</span>
                    </span>
                  </td>
                  <td style="padding:14px 16px;">
                    <code style="font-size:12px; font-weight:700; color:#0052cc;">${s.category || 'All Products'}</code>
                  </td>
                  <td style="padding:14px 16px;">
                    <button class="toggle-section-active-btn" data-sec-id="${s.id}" style="background:transparent; border:none; cursor:pointer;" title="Click to toggle active state">
                      <span class="status-badge ${s.active ? 'status-green' : 'status-red'}" style="font-size:11.5px; font-weight:800; cursor:pointer;">
                        ${s.active ? '● Live on Storefront' : '○ Hidden / Draft'}
                      </span>
                    </button>
                  </td>
                  <td style="padding:14px 16px; text-align:right;">
                    <div style="display:inline-flex; align-items:center; gap:6px;">
                      <button class="action-icon-btn edit-sec-btn" data-sec-id="${s.id}" title="Edit Section">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                      </button>
                      <button class="action-icon-btn delete-btn delete-sec-btn" data-sec-id="${s.id}" title="Delete Section">
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

    <!-- 4. Add / Edit Section Modal Overlay -->
    <div class="modal-backdrop ${showModal ? 'show' : ''}" id="section-modal-backdrop">
      <div class="modal-wrapper product-form-dark-wrapper glass-panel animate-in" style="max-width: 520px; width: 95%;">
        
        <div class="modal-header-modern" style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:12px;">
            <button class="back-circle-btn" id="close-sec-modal-btn" title="Close">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <div>
              <h3 style="margin:0; font-size:18px; font-weight:850; color:#ffffff;">
                ${isEditing ? `Edit Section: ${editSec.name || ''}` : 'Add Homepage Section'}
              </h3>
              <p style="margin:2px 0 0 0; font-size:12px; color:#94a3b8;">Control storefront showcase feeds & layout blocks</p>
            </div>
          </div>
        </div>

        <div class="modal-body-modern custom-scroll" style="max-height:75vh; overflow-y:auto; padding:12px 4px;">
          <form id="section-crud-form" autocomplete="off" style="display:flex; flex-direction:column; gap:16px;">
            
            <div class="form-group-modern">
              <label>Section Display Title *</label>
              <input type="text" id="sec-name-input" name="sec_name_no_autofill" required placeholder="e.g. ⚡ Flash Deals & Weekend Specials" value="${editSec.name || ''}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
            </div>

            <div class="form-group-modern">
              <label>Subtitle / Description Tagline</label>
              <input type="text" id="sec-subtitle-input" name="sec_subtitle_no_autofill" placeholder="e.g. Handcrafted wooden desk risers & artisan keycaps" value="${editSec.subtitle || ''}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
            </div>

            <div class="form-group-modern">
              <label>Layout Presentation Style *</label>
              <select id="sec-type-input" class="admin-input" style="padding:12px 14px;">
                <option value="categories" ${editSec.type === 'categories' ? 'selected' : ''}>📁 Shop by Category Grid</option>
                <option value="deals" ${editSec.type === 'deals' ? 'selected' : ''}>⚡ Hot Deals & Flash Sales Showcase</option>
                <option value="new-arrivals" ${editSec.type === 'new-arrivals' ? 'selected' : ''}>✨ New Arrivals Showcase</option>
                <option value="best-sellers" ${editSec.type === 'best-sellers' ? 'selected' : ''}>🏆 Best Sellers Showcase</option>
                <option value="grid" ${editSec.type === 'grid' || !editSec.type ? 'selected' : ''}>▦ Custom Product Grid</option>
                <option value="carousel" ${editSec.type === 'carousel' ? 'selected' : ''}>🎠 Interactive Slider Carousel</option>
                <option value="banner" ${editSec.type === 'banner' ? 'selected' : ''}>🖼️ Full-Width Promo Banner</option>
              </select>
            </div>

            <div class="form-group-modern">
              <label>Category Source Filter</label>
              <select id="sec-category-input" class="admin-input" style="padding:12px 14px; font-weight:700;">
                <option value="All" ${editSec.category === 'All' || !editSec.category ? 'selected' : ''}>📂 All Catalog Products</option>
                ${(() => {
                  const parents = rawCategories.filter(c => !c.parent || c.parent === null || c.parent === 0 || c.parent === '');
                  const subs = rawCategories.filter(c => c.parent && c.parent !== null && c.parent !== 0 && c.parent !== '');

                  return parents.map(parent => {
                    const parentSubs = subs.filter(sc => sc.parent === parent.id || sc.parent === parent.name);
                    return `
                      <optgroup label="${parent.icon || '📁'} ${parent.name.toUpperCase()}">
                        <option value="${parent.name}" ${editSec.category === parent.name ? 'selected' : ''}>
                          ${parent.icon || '📁'} All ${parent.name}
                        </option>
                        ${parentSubs.map(sub => `
                          <option value="${sub.name}" ${editSec.category === sub.name ? 'selected' : ''}>
                            &nbsp;&nbsp;&nbsp;&nbsp;↳ ${sub.icon || '🌿'} ${sub.name}
                          </option>
                        `).join('')}
                      </optgroup>
                    `;
                  }).join('');
                })()}
              </select>
            </div>

            <div class="form-group-modern" style="margin-top:4px;">
              <label style="display:flex; align-items:center; gap:10px; cursor:pointer; color:white; font-size:13px; font-weight:750;">
                <input type="checkbox" id="sec-active-toggle" ${editSec.active !== false ? 'checked' : ''} style="width:16px; height:16px; accent-color:#0052cc;">
                <span>🟢 Display as Active Section on Homepage</span>
              </label>
            </div>

            <button type="submit" class="admin-btn admin-btn-primary" style="padding:14px; font-size:14px; font-weight:800; margin-top:8px;">
              ${isEditing ? '✓ Save Section Changes' : '🚀 Publish Section'}
            </button>
          </form>
        </div>

      </div>
    </div>
  `;
}

export function attachAdminSectionsListeners(context, shadow) {
  // 1. Search Input
  const searchInput = shadow.getElementById('section-search-input');
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
      const sRef = shadow.getElementById('section-search-input');
      if (sRef) {
        sRef.focus();
        sRef.setSelectionRange(sRef.value.length, sRef.value.length);
      }
    });
  }

  // 2. Type Filter
  const typeSelect = shadow.getElementById('section-type-filter');
  if (typeSelect) {
    typeSelect.addEventListener('change', (e) => {
      typeFilter = e.target.value;
      context.render();
      context.attachListeners();
    });
  }

  // 3. Open More to Love Studio
  const moreLoveBtn = shadow.getElementById('open-more-love-studio-btn');
  if (moreLoveBtn) {
    moreLoveBtn.addEventListener('click', () => {
      context.currentTab = 'more-to-love';
      sessionStorage.setItem('SWEETOS_admin_current_tab', 'more-to-love');
      context.render();
      context.attachListeners();
    });
  }

  // 4. Open Add Modal
  const addBtn = shadow.getElementById('add-section-main-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      context.showSectionModal = true;
      context.editingSection = null;
      context.render();
      context.attachListeners();
    });
  }

  // Close Modal
  const closeBtn = shadow.getElementById('close-sec-modal-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      context.showSectionModal = false;
      context.editingSection = null;
      context.render();
      context.attachListeners();
    });
  }

  // 4. Edit section trigger
  shadow.querySelectorAll('.edit-sec-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-sec-id');
      const sec = (context.homepageSections || []).find(s => s.id === id);
      if (sec) {
        context.editingSection = { ...sec };
        context.showSectionModal = true;
        context.render();
        context.attachListeners();
      }
    });
  });

  // 5. Toggle Active state inline
  shadow.querySelectorAll('.toggle-section-active-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-sec-id');
      const sec = (context.homepageSections || []).find(s => s.id === id);
      if (sec) {
        sec.active = !sec.active;
        context.saveDatabase('sections');
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Section "${sec.name}" is now ${sec.active ? 'Active' : 'Hidden'}.` }));
        context.render();
        context.attachListeners();
      }
    });
  });

  // 6. Move Up Action
  shadow.querySelectorAll('.move-up-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-sec-id');
      const sorted = [...(context.homepageSections || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
      const idx = sorted.findIndex(s => s.id === id);
      if (idx > 0) {
        const temp = sorted[idx].order;
        sorted[idx].order = sorted[idx - 1].order;
        sorted[idx - 1].order = temp;

        context.homepageSections = sorted;
        context.saveDatabase('sections');
        context.render();
        context.attachListeners();
      }
    });
  });

  // 7. Move Down Action
  shadow.querySelectorAll('.move-down-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-sec-id');
      const sorted = [...(context.homepageSections || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
      const idx = sorted.findIndex(s => s.id === id);
      if (idx !== -1 && idx < sorted.length - 1) {
        const temp = sorted[idx].order;
        sorted[idx].order = sorted[idx + 1].order;
        sorted[idx + 1].order = temp;

        context.homepageSections = sorted;
        context.saveDatabase('sections');
        context.render();
        context.attachListeners();
      }
    });
  });

  // 8. Delete Section
  shadow.querySelectorAll('.delete-sec-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-sec-id');
      const sec = (context.homepageSections || []).find(s => s.id === id);
      if (sec) {
        const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
          title: 'Delete Section',
          message: `Are you sure you want to delete section "${sec.name}"?`,
          confirmText: 'Delete Section',
          cancelText: 'Cancel',
          type: 'danger',
          icon: '🗑️'
        }) : Promise.resolve(confirm(`Are you sure you want to delete section "${sec.name}"?`)));

        if (confirmed) {
          context.homepageSections = (context.homepageSections || []).filter(s => s.id !== id);
          context.saveDatabase('sections');
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Deleted section "${sec.name}".` }));
          context.render();
          context.attachListeners();
        }
      }
    });
  });

  // 9. Form Submit
  const form = shadow.getElementById('section-crud-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = shadow.getElementById('sec-name-input').value.trim();
      const subtitle = shadow.getElementById('sec-subtitle-input').value.trim();
      const type = shadow.getElementById('sec-type-input').value;
      const category = shadow.getElementById('sec-category-input').value;
      const active = shadow.getElementById('sec-active-toggle').checked;

      if (!name) return;

      if (context.editingSection && context.editingSection.id) {
        const id = context.editingSection.id;
        const idx = (context.homepageSections || []).findIndex(s => s.id === id);
        if (idx !== -1) {
          context.homepageSections[idx] = {
            ...context.homepageSections[idx],
            name,
            subtitle,
            type,
            category,
            active
          };
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Updated section "${name}"!` }));
        }
      } else {
        const nextOrder = (context.homepageSections || []).length;
        const newId = 'sec-' + Date.now();
        context.homepageSections.push({
          id: newId,
          name,
          subtitle,
          type,
          category,
          active,
          order: nextOrder
        });
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Published new section "${name}"!` }));
      }

      context.saveDatabase('sections');
      context.showSectionModal = false;
      context.editingSection = null;
      context.render();
      context.attachListeners();
    });
  }
}
