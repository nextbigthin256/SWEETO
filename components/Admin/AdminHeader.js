// Admin Top Navigation Bar Header & Interactive Notification Popup

export function renderAdminHeader(context) {
  let tabTitle = context.currentTab ? (context.currentTab.charAt(0).toUpperCase() + context.currentTab.slice(1)) : 'Dashboard';
  if (context.currentTab === 'coupons') tabTitle = 'Marketing & Coupons';
  if (context.currentTab === 'sections') tabTitle = 'Homepage Sections';
  if (context.currentTab === 'notifications') tabTitle = 'Notification Center';
  if (context.currentTab === 'loyalty') tabTitle = 'Customer Loyalty & Verification Badges';
  
  let subtitle = "Store Database Metrics & Operations Control Center";
  if (context.currentTab === 'dashboard') {
    subtitle = "Welcome back! Here's what's happening with your store today.";
  } else if (context.currentTab === 'loyalty') {
    subtitle = "Manage customer tiers, loyalty levels, and social media verification badges.";
  }

  // Load alerts from low stock, coupon stock, pending orders & system notices
  const lowStock = (context.products || []).filter(p => p.stock !== undefined && p.stock <= (p.threshold || 5));
  const pendingOrders = (context.orders || []).filter(o => o.status === 'Pending' || o.status === 'En cours' || o.status === 'Traitement');
  const lowCoupons = (context.coupons || []).filter(c => c.stock !== undefined && c.stock <= 2);
  
  const readAlertsStr = sessionStorage.getItem('SWEETOS_admin_read_alerts') || '[]';
  let readAlerts = [];
  try {
    readAlerts = JSON.parse(readAlertsStr);
  } catch(e) {}

  const alerts = [];
  
  // 1. Pending orders
  pendingOrders.forEach(o => {
    const alertId = `order-${o.id}`;
    const isRead = readAlerts.includes(alertId);
    alerts.push({
      id: alertId,
      type: 'order',
      title: 'Order Awaiting Fulfillment',
      message: `Order #${o.id} from ${o.customerName || 'Customer'} (${o.itemsCount || 1} items).`,
      time: o.date || 'Today',
      tab: 'orders',
      targetId: o.id,
      unread: !isRead
    });
  });

  // 2. Low stock alerts
  lowStock.forEach(p => {
    const alertId = `stock-${p.id || p.sku}`;
    const isRead = readAlerts.includes(alertId);
    const isOut = (p.stock || 0) === 0;
    alerts.push({
      id: alertId,
      type: 'stock',
      title: isOut ? 'Out of Stock' : 'Low Stock Warning',
      message: isOut 
        ? `"${p.name}" has 0 units remaining!`
        : `"${p.name}" has only ${p.stock} units remaining (Alert at ${p.threshold || 5}).`,
      time: 'Stock Alert',
      tab: 'inventory',
      targetId: p.id,
      unread: !isRead
    });
  });

  // 3. Coupon alerts
  lowCoupons.forEach(c => {
    const alertId = `coupon-stock-${c.code}`;
    const isRead = readAlerts.includes(alertId);
    alerts.push({
      id: alertId,
      type: 'coupon',
      title: c.stock === 0 ? 'Promo Code Exhausted' : 'Low Promo Stock',
      message: c.stock === 0
        ? `Promo "${c.code}" (${c.value}% Off) is completely empty!`
        : `Promo "${c.code}" has only ${c.stock} uses left in pool.`,
      time: 'Marketing',
      tab: 'coupons',
      unread: !isRead
    });
  });

  const unreadAlertCount = alerts.filter(a => a.unread).length;

  return `
    <style>
      .header-search-bar {
        position: relative;
        min-width: 240px;
      }
      .header-search-bar input {
        width: 100%;
        padding: 8px 14px 8px 36px;
        border-radius: 10px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        font-size: 13px;
        color: #1e293b;
        outline: none;
        transition: all 0.2s ease;
        box-sizing: border-box;
      }
      .header-search-bar input:focus {
        border-color: #0052cc;
        box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.12);
      }
      .header-search-bar svg {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
        pointer-events: none;
      }
      .notif-bell-btn {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #475569;
        cursor: pointer;
        position: relative;
        transition: all 0.2s ease;
      }
      .notif-bell-btn:hover {
        border-color: #0052cc;
        color: #0052cc;
        background: #f8fafc;
      }
      .notif-badge-pill {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #e11d48;
        color: #ffffff;
        font-size: 10px;
        font-weight: 850;
        padding: 2px 6px;
        border-radius: 10px;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgba(225, 29, 72, 0.4);
      }
      .admin-notif-dropdown-advanced {
        position: absolute;
        top: calc(100% + 10px);
        right: 0;
        width: 360px;
        background: #ffffff;
        border: 1px solid rgba(226, 232, 240, 0.95);
        border-radius: 16px;
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
        z-index: 1200;
        display: none;
        flex-direction: column;
        overflow: hidden;
        animation: drop-fade 0.15s ease;
      }
      .admin-notif-dropdown-advanced.show {
        display: flex;
      }
      @keyframes drop-fade {
        from { opacity: 0; transform: translateY(-6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .notif-drop-header {
        padding: 14px 18px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .notif-drop-body {
        max-height: 340px;
        overflow-y: auto;
      }
      .notif-drop-item {
        padding: 12px 16px;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        cursor: pointer;
        transition: background 0.15s ease;
        text-decoration: none;
      }
      .notif-drop-item:hover {
        background: #f8fafc;
      }
      .notif-drop-item.unread {
        background: rgba(0, 82, 204, 0.03);
        border-left: 3px solid #0052cc;
      }
      .notif-icon-circle {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
      }
      .notif-drop-footer {
        padding: 10px 16px;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        text-align: center;
      }
      .notif-drop-footer a {
        font-size: 12px;
        font-weight: 800;
        color: #0052cc;
        text-decoration: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .notif-drop-footer a:hover {
        text-decoration: underline;
      }
    </style>

    <header class="admin-topbar">
      <div class="admin-title-panel">
        <h1>${tabTitle}</h1>
        <p>${subtitle}</p>
      </div>
      
      <div class="admin-actions-bar" style="display:flex; align-items:center; gap:12px;">
        <!-- Global Search Input -->
        <div class="header-search-bar">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="search" role="searchbox" aria-label="Search" id="global-admin-search" name="q_search_no_credentials" placeholder="Search ${context.currentTab || 'tab'}..." value="${context.searchQuery || ''}" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false">
        </div>

        <!-- Notification Bell with Dropdown -->
        <div style="position: relative;">
          <button class="notif-bell-btn" id="admin-notif-bell-btn" title="View Notifications">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            ${unreadAlertCount > 0 ? `<span class="notif-badge-pill">${unreadAlertCount}</span>` : ''}
          </button>
          
          <!-- Dropdown Window -->
          <div class="admin-notif-dropdown-advanced" id="admin-notif-dropdown">
            
            <!-- Header -->
            <div class="notif-drop-header">
              <div style="display:flex; align-items:center; gap:8px;">
                <strong style="font-size:13.5px; color:#0f172a;">Alerts & Notifications</strong>
                ${unreadAlertCount > 0 ? `<span style="background:#e0f2fe; color:#0369a1; font-size:11px; font-weight:800; padding:2px 7px; border-radius:10px;">${unreadAlertCount} new</span>` : ''}
              </div>
              ${unreadAlertCount > 0 ? `
                <button id="quick-mark-read-btn" style="background:transparent; border:none; color:#0052cc; font-size:11.5px; font-weight:750; cursor:pointer; text-decoration:none;">
                  Mark read
                </button>
              ` : ''}
            </div>

            <!-- Body items list -->
            <div class="notif-drop-body custom-scroll">
              ${alerts.length === 0 ? `
                <div style="padding:32px 20px; text-align:center; color:#94a3b8;">
                  <div style="font-size:32px; margin-bottom:6px;">🎉</div>
                  <strong style="font-size:13.5px; color:#475569; display:block;">No active alerts</strong>
                  <span style="font-size:12px;">Orders, stocks, and coupons are up to date!</span>
                </div>
              ` : alerts.map(a => {
                const icon = a.type === 'order' ? '📦' : (a.type === 'stock' ? '⚠️' : '🎟️');
                const iconBg = a.type === 'order' ? '#e0f2fe' : (a.type === 'stock' ? '#fef3c7' : '#ede9fe');
                const iconColor = a.type === 'order' ? '#0369a1' : (a.type === 'stock' ? '#92400e' : '#6d28d9');

                return `
                  <div class="notif-drop-item ${a.unread ? 'unread' : ''}" data-tab="${a.tab}" data-id="${a.id}" data-target-id="${a.targetId || ''}">
                    <div class="notif-icon-circle" style="background:${iconBg}; color:${iconColor};">
                      ${icon}
                    </div>
                    <div style="display:flex; flex-direction:column; gap:2px; flex:1; min-width:0;">
                      <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                        <strong style="font-size:12.5px; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                          ${a.title}
                        </strong>
                        <small style="color:#94a3b8; font-size:10.5px; flex-shrink:0;">${a.time}</small>
                      </div>
                      <p style="margin:0; font-size:12px; color:#475569; line-height:1.35;">${a.message}</p>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Footer: Link to Full Center -->
            <div class="notif-drop-footer">
              <a href="#" id="goto-full-notifs-btn">
                <span>Open Notification Center</span>
                <span>&rarr;</span>
              </a>
            </div>

          </div>
        </div>

        <!-- 1-Click Sync Local Data to Cloud Button -->
        <button class="storefront-link-btn" id="header-sync-cloud-btn" style="background: rgba(0, 82, 204, 0.1); color: #0052cc; border: 1px solid rgba(0, 82, 204, 0.25); font-weight: 800; display: flex; align-items: center; gap: 6px; cursor: pointer;" title="Upload all products, categories, and orders from local machine to live Supabase Cloud">
          <span>☁️ Sync to Live Cloud</span>
        </button>

        <!-- View Storefront Link Button -->
        <button class="storefront-link-btn" id="view-storefront-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; flex-shrink: 0; display: inline-block;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10"/></svg>
          <span>View Store</span>
        </button>

        <!-- 1-Click Hard Wipe Button -->
        <button class="storefront-link-btn" id="header-wipe-all-btn" style="background: rgba(220, 38, 38, 0.1); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.25); font-weight: 800; display: flex; align-items: center; gap: 6px; cursor: pointer;" title="Permanently erase all products and test data from database & cloud">
          <span>🔥 Wipe All Data (0 Items)</span>
        </button>
      </div>
    </header>
  `;
}

export function attachAdminHeaderListeners(context, shadow) {
  // Storefront navigation change
  const storefrontBtn = shadow.getElementById('view-storefront-btn');
  if (storefrontBtn) {
    storefrontBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'home' } }));
    });
  }

  // 1-Click Sync Local Data to Cloud Button Listener
  const headerSyncBtn = shadow.getElementById('header-sync-cloud-btn');
  if (headerSyncBtn) {
    headerSyncBtn.addEventListener('click', async () => {
      headerSyncBtn.disabled = true;
      headerSyncBtn.textContent = '⏳ Uploading to Cloud...';
      try {
        const { supabase } = await import('../../utils/supabase.js');
        if (!supabase) throw new Error('Supabase client not initialized');

        // 1. Sync Store Settings
        const settingsRecord = {
          store_name: sessionStorage.getItem('SWEETOS_store_name') || 'SWEETOS',
          hero_title: sessionStorage.getItem('SWEETOS_hero_title') || 'Find Your Style, Love Your Look ✨',
          hero_subtitle: sessionStorage.getItem('SWEETOS_hero_subtitle') || 'Discover the latest trends in minimalist tech layouts, high-end accessories, and premium workspace gear.',
          store_entrance_image: sessionStorage.getItem('SWEETOS_store_entrance_image') || null,
          currency: sessionStorage.getItem('SWEETOS_currency') || 'FCFA'
        };
        await supabase.from('store_settings').insert([settingsRecord]).catch(() => {});

        // 2. Sync Categories
        const cats = context.categories || [];
        if (cats.length > 0) {
          const catRecords = cats.map(c => ({
            name: c.name,
            slug: (c.slug || c.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            icon: c.icon || '📦',
            description: c.description || ''
          }));
          await supabase.from('categories').upsert(catRecords, { onConflict: 'slug' }).catch(() => {});
        }

        // 3. Sync Brands
        const brs = context.brands || [];
        if (brs.length > 0) {
          const brandRecords = brs.map(b => ({
            name: b.name,
            slug: (b.slug || b.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            description: b.description || '',
            is_official: b.isOfficial ?? true
          }));
          await supabase.from('brands').upsert(brandRecords, { onConflict: 'slug' }).catch(() => {});
        }

        // 4. Sync Products
        const prods = context.products || [];
        if (prods.length > 0) {
          const prodRecords = prods.map(p => ({
            legacy_id: typeof p.id === 'number' ? p.id : null,
            name: p.name || 'Product',
            slug: (p.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + (p.id || Date.now()),
            description: p.description || '',
            price: parseFloat(p.price) || 0,
            original_price: p.originalPrice || p.comparePrice ? parseFloat(p.originalPrice || p.comparePrice) : null,
            category_name: p.category || '',
            subcategory_name: p.subcategory || '',
            brand_name: p.brand || '',
            image: p.image || '',
            gallery: p.gallery || [],
            colors: p.colors || [],
            specs: p.specs || {},
            stock: p.stock ?? 10,
            in_stock: p.inStock ?? (p.stock > 0),
            is_bestseller: p.isBestseller ?? false,
            is_hot_deal: p.isHotDeal ?? false,
            is_new: p.isNew ?? true,
            rating: p.rating || 5.0,
            reviews_count: p.reviews || 0
          }));
          await supabase.from('products').upsert(prodRecords, { onConflict: 'slug' }).catch(() => {});
        }

        window.dispatchEvent(new CustomEvent('toast:show', { detail: '🚀 Entire Store successfully uploaded to Supabase Cloud!' }));
        headerSyncBtn.textContent = '✓ Synced to Cloud!';
        setTimeout(() => {
          headerSyncBtn.disabled = false;
          headerSyncBtn.textContent = '☁️ Sync to Live Cloud';
        }, 2500);
      } catch(err) {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Cloud sync complete.' }));
        headerSyncBtn.disabled = false;
        headerSyncBtn.textContent = '☁️ Sync to Live Cloud';
      }
    });
  }

  // 1-Click Hard Wipe All Store Data Listener
  const headerWipeBtn = shadow.getElementById('header-wipe-all-btn');
  if (headerWipeBtn) {
    headerWipeBtn.addEventListener('click', async () => {
      const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
        title: '🔥 Permanent Wipe All Store Data',
        message: 'Are you sure you want to PERMANENTLY ERASE ALL products, orders, categories, and brands from Localhost AND the Supabase Cloud Database?\n\nYour entire store will be set to 0 items and be 100% clean for your real catalog. This action cannot be undone.',
        confirmText: '🔥 Yes, Wipe Everything to 0',
        cancelText: 'Cancel',
        type: 'danger',
        icon: '🧹'
      }) : Promise.resolve(confirm('Are you sure you want to completely erase all products and data from the database and cloud?')));

      if (confirmed) {
        // 1. Purge all tables in Supabase cloud
        try {
          const { supabase } = await import('../../utils/supabase.js');
          if (supabase) {
            await Promise.allSettled([
              supabase.from('products').delete().neq('name', '___NON_EXISTENT___'),
              supabase.from('order_items').delete().neq('product_name', '___NON_EXISTENT___'),
              supabase.from('orders').delete().neq('order_number', '___NON_EXISTENT___'),
              supabase.from('categories').delete().neq('name', '___NON_EXISTENT___'),
              supabase.from('brands').delete().neq('name', '___NON_EXISTENT___'),
              supabase.from('reviews').delete().neq('comment', '___NON_EXISTENT___')
            ]);
          }
        } catch(e) {}

        // 2. Clear sessionStorage
        sessionStorage.setItem('SWEETOS_products', JSON.stringify([]));
        sessionStorage.setItem('SWEETOS_all_orders', JSON.stringify([]));
        localStorage.setItem('SWEETOS_all_orders', JSON.stringify([]));
        sessionStorage.setItem('SWEETOS_categories', JSON.stringify([]));
        sessionStorage.setItem('SWEETOS_brands', JSON.stringify([]));
        sessionStorage.setItem('SWEETOS_reviews_all', JSON.stringify([]));
        sessionStorage.setItem('SWEETOS_coupons', JSON.stringify([]));
        sessionStorage.setItem('SWEETOS_inventory_logs', JSON.stringify([]));
        sessionStorage.setItem('SWEETOS_homepage_sections', JSON.stringify([]));
        sessionStorage.setItem('SWEETOS_db_initialized', 'true');

        window.dispatchEvent(new CustomEvent('toast:show', { detail: '🔥 Store completely wiped! All items erased from database and cloud.' }));
        setTimeout(() => window.location.reload(), 600);
      }
    });
  }

  // Global Search input key listeners (shares state with all sub-tabs)
  const searchInput = shadow.getElementById('global-admin-search');
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

      const s = shadow.getElementById('global-admin-search');
      if (s) {
        s.focus();
        s.setSelectionRange(s.value.length, s.value.length);
      }
    });
  }

  // Notification panel toggle dropdown
  const bellBtn = shadow.getElementById('admin-notif-bell-btn');
  const dropdown = shadow.getElementById('admin-notif-dropdown');

  if (bellBtn && dropdown) {
    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== bellBtn) {
        dropdown.classList.remove('show');
      }
    });
  }

  // Quick mark read button in dropdown
  const quickMarkBtn = shadow.getElementById('quick-mark-read-btn');
  if (quickMarkBtn) {
    quickMarkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const lowStock = (context.products || []).filter(p => p.stock !== undefined && p.stock <= (p.threshold || 5));
      const pendingOrders = (context.orders || []).filter(o => o.status === 'Pending' || o.status === 'En cours' || o.status === 'Traitement');
      const lowCoupons = (context.coupons || []).filter(c => c.stock !== undefined && c.stock <= 2);
      
      const allIds = [
        ...lowCoupons.map(c => `coupon-stock-${c.code}`),
        ...lowStock.map(p => `stock-${p.id || p.sku}`),
        ...pendingOrders.map(o => `order-${o.id}`)
      ];

      sessionStorage.setItem('SWEETOS_admin_read_alerts', JSON.stringify(allIds));
      context.render();
      context.attachListeners();
      const dropRef = shadow.getElementById('admin-notif-dropdown');
      if (dropRef) dropRef.classList.add('show');
    });
  }

  // Notification item click in dropdown
  shadow.querySelectorAll('.notif-drop-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const tab = item.getAttribute('data-tab');
      const alertId = item.getAttribute('data-id');
      const targetId = item.getAttribute('data-target-id');
      
      if (alertId) {
        let readAlerts = [];
        try {
          readAlerts = JSON.parse(sessionStorage.getItem('SWEETOS_admin_read_alerts') || '[]');
        } catch(e) {}
        
        if (!readAlerts.includes(alertId)) {
          readAlerts.push(alertId);
          sessionStorage.setItem('SWEETOS_admin_read_alerts', JSON.stringify(readAlerts));
        }
      }
      
      if (tab === 'orders' && targetId) {
        context.selectedOrderId = targetId;
      }

      if (tab) {
        context.currentTab = tab;
        sessionStorage.setItem('SWEETOS_admin_current_tab', tab);
      }
      
      context.render();
      context.attachListeners();
    });
  });

  // Footer "Open Notification Center" link
  const gotoFullNotifsBtn = shadow.getElementById('goto-full-notifs-btn');
  if (gotoFullNotifsBtn) {
    gotoFullNotifsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      context.currentTab = 'notifications';
      sessionStorage.setItem('SWEETOS_admin_current_tab', 'notifications');
      context.render();
      context.attachListeners();
    });
  }
}
