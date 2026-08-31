export function renderAdminSidebar(context) {
  const pendingOrdersCount = context.orders.filter(o => o.status === 'Pending' || o.status === 'En cours').length;
  const lowStockCount = context.products.filter(p => p.stock !== undefined && p.stock <= (p.threshold || 5)).length;
  const totalAlertsCount = pendingOrdersCount + lowStockCount;
  const isCollapsed = context.sidebarCollapsed;

  return `
    <aside class="admin-sidebar ${isCollapsed ? 'collapsed' : ''}">
      <!-- Toggle Expand/Collapse Button -->
      <button class="sidebar-toggle-btn" id="sidebar-toggle-btn" title="${isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 12px; height: 12px; display: block;">
          ${isCollapsed ? `
            <polyline points="9 18 15 12 9 6"></polyline>
          ` : `
            <polyline points="15 18 9 12 15 6"></polyline>
          `}
        </svg>
      </button>

      <div class="admin-brand">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--primary)" stroke-width="2.5" style="width: 22px; height: 22px; flex-shrink: 0; display: inline-block;">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
        <div class="admin-brand-text" style="display:flex; flex-direction:column;">
          <h2 style="font-size:15px; font-weight:800; color:white; line-height:1.2; margin:0;">AdminPanel</h2>
          <small style="font-size:11px; color:#64748b; font-weight:600;">Ecommerce</small>
        </div>
      </div>
      
      <nav class="admin-sidebar-nav custom-scroll">
        <a href="#" class="admin-nav-item ${context.currentTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard" title="Dashboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
          <span>Dashboard</span>
        </a>
        <a href="#" class="admin-nav-item ${context.currentTab === 'products' ? 'active' : ''}" data-tab="products" title="Products">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          <span>Products</span>
        </a>
        <a href="#" class="admin-nav-item ${context.currentTab === 'categories' ? 'active' : ''}" data-tab="categories" title="Categories">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
          <span>Categories</span>
        </a>
        <a href="#" class="admin-nav-item ${context.currentTab === 'brands' ? 'active' : ''}" data-tab="brands" title="Brands">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
          <span>Brands</span>
        </a>
        <a href="#" class="admin-nav-item ${context.currentTab === 'orders' ? 'active' : ''}" data-tab="orders" title="Orders" style="position: relative;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          <span>Orders</span>
          ${pendingOrdersCount > 0 ? `<span class="badge badge-warning sidebar-nav-badge" style="margin-left:auto;">${pendingOrdersCount}</span>` : ''}
        </a>
        <a href="#" class="admin-nav-item ${context.currentTab === 'customers' ? 'active' : ''}" data-tab="customers" title="Customers">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <span>Customers</span>
        </a>
        <a href="#" class="admin-nav-item ${context.currentTab === 'loyalty' ? 'active' : ''}" data-tab="loyalty" title="Loyalty & Badges">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"></circle><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"></path></svg>
          <span>Loyalty & Badges</span>
        </a>
        <a href="#" class="admin-nav-item ${context.currentTab === 'reviews' ? 'active' : ''}" data-tab="reviews" title="Reviews">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          <span>Reviews</span>
        </a>
        <a href="#" class="admin-nav-item ${context.currentTab === 'inventory' ? 'active' : ''}" data-tab="inventory" title="Inventory" style="position: relative;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
          <span>Inventory</span>
          ${lowStockCount > 0 ? `<span class="badge badge-danger sidebar-nav-badge" style="margin-left:auto; font-size: 10px;">Alert</span>` : ''}
        </a>
        <a href="#" class="admin-nav-item ${context.currentTab === 'sections' ? 'active' : ''}" data-tab="sections" title="Sections">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <span>Sections</span>
        </a>
        <a href="#" class="admin-nav-item ${context.currentTab === 'deals' ? 'active' : ''}" data-tab="deals" title="Today's Deals">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          <span>Offres du Jour</span>
        </a>
        <a href="#" class="admin-nav-item ${context.currentTab === 'more-to-love' ? 'active' : ''}" data-tab="more-to-love" title="More to Love">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          <span>More to Love</span>
        </a>
        <a href="#" class="admin-nav-item ${context.currentTab === 'coupons' ? 'active' : ''}" data-tab="coupons" title="Marketing">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <span>Marketing</span>
        </a>
        <a href="#" class="admin-nav-item ${context.currentTab === 'analytics' ? 'active' : ''}" data-tab="analytics" title="Analytics">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          <span>Analytics</span>
        </a>
        <a href="#" class="admin-nav-item ${context.currentTab === 'notifications' ? 'active' : ''}" data-tab="notifications" title="Notifications" style="position: relative;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <span>Alerts</span>
          ${totalAlertsCount > 0 ? `<span class="badge badge-danger sidebar-nav-badge" style="margin-left:auto; font-size:10px;">${totalAlertsCount}</span>` : ''}
        </a>
        <a href="#" class="admin-nav-item ${context.currentTab === 'settings' ? 'active' : ''}" data-tab="settings" title="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          <span>Settings</span>
        </a>
      </nav>

      <div class="admin-sidebar-footer">
        <div class="admin-profile-badge" title="Admin - sweeto@mlaoda.com">
          <div class="avatar">S</div>
          <div class="info">
            <h3>Admin</h3>
            <small>sweeto@mlaoda.com</small>
          </div>
        </div>
        <button class="logout-btn" id="admin-logout-btn" title="Sign Out">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; flex-shrink: 0; display: inline-block;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        </button>
      </div>
    </aside>
  `;
}

export function attachAdminSidebarListeners(context, shadow) {
  // Close mobile sidebar drawer helper
  const closeMobileSidebar = () => {
    const sidebar = shadow.querySelector('.admin-sidebar');
    const backdrop = shadow.querySelector('.admin-sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
  };

  // Backdrop tap to dismiss mobile sidebar
  const backdrop = shadow.querySelector('.admin-sidebar-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => closeMobileSidebar());
  }

  // Sidebar tab navigation
  shadow.querySelectorAll('.admin-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      closeMobileSidebar();
      const tab = item.getAttribute('data-tab');
      context.currentTab = tab;
      sessionStorage.setItem('SWEETOS_admin_current_tab', tab);
      
      // Reset filter pagination
      context.currentPageIndex = 1;
      context.selectedOrderId = null;
      context.selectedCustomerEmail = null;

      context.render();
      context.attachListeners();
    });
  });

  // Sidebar expand/collapse toggle
  const toggleBtn = shadow.getElementById('sidebar-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      context.sidebarCollapsed = !context.sidebarCollapsed;
      sessionStorage.setItem('SWEETOS_admin_sidebar_collapsed', context.sidebarCollapsed.toString());
      context.render();
      context.attachListeners();
    });
  }

  // Logout button
  const logoutBtn = shadow.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      context.isAuthenticated = false;
      sessionStorage.removeItem('SWEETOS_admin_authenticated');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Logged out successfully.' }));
      context.render();
      context.attachListeners();
    });
  }
}
