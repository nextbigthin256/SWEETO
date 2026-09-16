import { formatPrice } from '../../utils/storage.js';

export function renderAdminDashboard(context) {
  const rawOrders = context.orders || [];
  const rawProducts = context.products || [];
  const rawCustomers = context.customers || [];

  const validOrders = rawOrders.filter(o => o.status !== 'Cancelled' && o.status !== 'Refusé');
  const totalSales = validOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  const completedOrdersCount = rawOrders.length;
  const pendingOrdersCount = rawOrders.filter(o => o.status === 'En cours' || o.status === 'Pending' || o.status === 'Traitement').length;
  const totalRegisteredCustomers = rawCustomers.length;
  const catalogCount = rawProducts.length;
  const lowStockAlerts = rawProducts.filter(p => p.stock !== undefined && p.stock <= (p.threshold || 5));
  const recentOrders = rawOrders.slice(0, 5);

  return `
    <style>
      .dash-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
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
      .quick-actions-bar {
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 16px;
        padding: 14px 18px;
        margin-bottom: 24px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        justify-content: space-between;
      }
      .quick-action-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        border-radius: 10px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        font-size: 12.5px;
        font-weight: 750;
        color: #334155;
        cursor: pointer;
        transition: all 0.15s ease;
        text-decoration: none;
      }
      .quick-action-pill:hover {
        border-color: #0052cc;
        color: #0052cc;
        background: #f8fafc;
        transform: translateY(-1px);
      }
      .dash-panel-card {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 16px;
        padding: 22px 24px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      }
    </style>

    <!-- 1. Executive Performance KPIs -->
    <div class="dash-kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(0, 82, 204, 0.1); color: #0052cc;">💰</div>
        <div>
          <span class="kpi-title">Gross Revenue</span>
          <span class="kpi-val" style="color: #0052cc; font-size: 19px;">${formatPrice(totalSales)}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(34, 197, 94, 0.1); color: #16a34a;">📦</div>
        <div>
          <span class="kpi-title">Total Orders</span>
          <span class="kpi-val" style="color: #16a34a;">${completedOrdersCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(14, 165, 233, 0.1); color: #0284c7;">👥</div>
        <div>
          <span class="kpi-title">Clients</span>
          <span class="kpi-val" style="color: #0284c7;">${totalRegisteredCustomers}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(245, 158, 11, 0.12); color: #d97706;">⚡</div>
        <div>
          <span class="kpi-title">Catalog SKUs</span>
          <span class="kpi-val" style="color: #d97706;">${catalogCount}</span>
        </div>
      </div>
    </div>

    <!-- 2. Quick Management Shortcuts -->
    <div class="quick-actions-bar">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:12px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">⚡ Shortcuts:</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <button class="quick-action-pill jump-tab-btn" data-target="products">
          <span>+ Add Product</span>
        </button>
        <button class="quick-action-pill jump-tab-btn" data-target="orders">
          <span>📦 Orders ${pendingOrdersCount > 0 ? `<strong style="color:#e11d48;">(${pendingOrdersCount})</strong>` : ''}</span>
        </button>
        <button class="quick-action-pill jump-tab-btn" data-target="categories">
          <span>📁 Categories</span>
        </button>
        <button class="quick-action-pill jump-tab-btn" data-target="brands">
          <span>🏷️ Brands</span>
        </button>
        <button class="quick-action-pill jump-tab-btn" data-target="coupons">
          <span>🎟️ Coupons</span>
        </button>
        <button class="quick-action-pill jump-tab-btn" data-target="inventory">
          <span>🪵 Inventory</span>
        </button>
      </div>
    </div>

    <!-- 3. Middle Columns: Revenue Trend Graph + Low Stock Radar -->
    <div style="display:grid; grid-template-columns: 1.8fr 1.2fr; gap:20px; margin-bottom:24px;">
      
      <!-- 30-Day Revenue Graph -->
      <div class="dash-panel-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <div>
            <h3 style="margin:0; font-size:16px; font-weight:850; color:#0f172a;">Store Revenue Path</h3>
            <span style="font-size:12px; color:#64748b; font-weight:600;">Monthly sales overview in CFA</span>
          </div>
          <button class="jump-tab-btn admin-btn admin-btn-secondary" data-target="analytics" style="font-size:12px; padding:6px 12px; font-weight:750;">
            Full Analytics &rarr;
          </button>
        </div>

        <div style="height: 200px; position:relative;">
          <svg viewBox="0 0 500 200" style="width:100%; height:100%; display:block;">
            <defs>
              <linearGradient id="dash-curve-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0052cc" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#0052cc" stop-opacity="0.0"/>
              </linearGradient>
            </defs>

            <!-- Grid Lines -->
            <line x1="40" y1="30" x2="470" y2="30" stroke="rgba(226,232,240,0.8)" stroke-width="1.5" stroke-dasharray="4"/>
            <line x1="40" y1="80" x2="470" y2="80" stroke="rgba(226,232,240,0.8)" stroke-width="1.5" stroke-dasharray="4"/>
            <line x1="40" y1="130" x2="470" y2="130" stroke="rgba(226,232,240,0.8)" stroke-width="1.5" stroke-dasharray="4"/>
            <line x1="40" y1="170" x2="470" y2="170" stroke="rgba(203,213,225,0.9)" stroke-width="1.5"/>

            <!-- Area Path -->
            <path d="M 50,170 L 50,130 L 130,90 L 210,140 L 290,70 L 370,40 L 460,55 L 460,170 Z" fill="url(#dash-curve-grad)" stroke="none"/>
            <path d="M 50,130 L 130,90 L 210,140 L 290,70 L 370,40 L 460,55" fill="none" stroke="#0052cc" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
            
            <!-- Nodes -->
            <circle cx="50" cy="130" r="4" fill="white" stroke="#0052cc" stroke-width="3"/>
            <circle cx="130" cy="90" r="4" fill="white" stroke="#0052cc" stroke-width="3"/>
            <circle cx="210" cy="140" r="4" fill="white" stroke="#0052cc" stroke-width="3"/>
            <circle cx="290" cy="70" r="4" fill="white" stroke="#0052cc" stroke-width="3"/>
            <circle cx="370" cy="40" r="4" fill="white" stroke="#0052cc" stroke-width="3"/>
            <circle cx="460" cy="55" r="4" fill="white" stroke="#0052cc" stroke-width="3"/>

            <!-- Monthly labels -->
            <text x="50" y="190" fill="#64748b" font-size="10" font-weight="750" text-anchor="middle">Mar</text>
            <text x="130" y="190" fill="#64748b" font-size="10" font-weight="750" text-anchor="middle">Apr</text>
            <text x="210" y="190" fill="#64748b" font-size="10" font-weight="750" text-anchor="middle">May</text>
            <text x="290" y="190" fill="#64748b" font-size="10" font-weight="750" text-anchor="middle">Jun</text>
            <text x="370" y="190" fill="#64748b" font-size="10" font-weight="750" text-anchor="middle">Jul</text>
            <text x="460" y="190" fill="#64748b" font-size="10" font-weight="750" text-anchor="middle">Aug</text>
          </svg>
        </div>
      </div>

      <!-- Low Stock Radar -->
      <div class="dash-panel-card" style="display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <h3 style="margin:0; font-size:16px; font-weight:850; color:#0f172a;">⚠️ Low Stock Radar</h3>
            <button class="jump-tab-btn" data-target="inventory" style="background:none; border:none; color:#0052cc; font-size:12px; font-weight:750; cursor:pointer;">
              View Inventory &rarr;
            </button>
          </div>
          
          <div class="custom-scroll" style="display:flex; flex-direction:column; gap:10px; max-height:220px; overflow-y:auto;">
            ${lowStockAlerts.length === 0 ? `
              <div style="text-align:center; padding:24px 0; color:#16a34a; font-size:13px; font-weight:700;">
                ✓ All inventory items are well-stocked!
              </div>
            ` : lowStockAlerts.map(p => `
              <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;">
                <div style="display:flex; flex-direction:column;">
                  <strong style="font-size:13px; color:#0f172a;">${p.name}</strong>
                  <code style="font-size:11px; color:#64748b;">${p.sku || `SKU-${p.id}`}</code>
                </div>
                <span class="status-badge status-yellow" style="font-weight:850;">
                  ${p.stock} left
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

    </div>

    <!-- 4. Recent Orders Table -->
    <div class="dash-panel-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
          <h3 style="margin:0; font-size:16px; font-weight:850; color:#0f172a;">🛍️ Recent Orders Pipeline</h3>
          <span style="font-size:12px; color:#64748b; font-weight:600;">Latest purchases placed in store</span>
        </div>
        <button class="jump-tab-btn admin-btn admin-btn-secondary" data-target="orders" style="font-size:12px; padding:6px 14px; font-weight:750;">
          All Orders &rarr;
        </button>
      </div>
      
      <div class="table-wrapper">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0;">
              <th style="padding:10px 14px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Order ID</th>
              <th style="padding:10px 14px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Customer</th>
              <th style="padding:10px 14px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Amount</th>
              <th style="padding:10px 14px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Status</th>
              <th style="padding:10px 14px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase; text-align:right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${recentOrders.length === 0 ? `
              <tr>
                <td colspan="5" style="padding:24px; text-align:center; color:#94a3b8;">No orders recorded yet.</td>
              </tr>
            ` : recentOrders.map(o => `
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:12px 14px;">
                  <strong style="color:#0052cc; font-size:13.5px;">${o.id}</strong>
                </td>
                <td style="padding:12px 14px;">
                  <div style="display:flex; flex-direction:column;">
                    <strong style="color:#0f172a; font-size:13px;">${o.customerName || 'Customer'}</strong>
                    <small style="color:#64748b; font-size:11px;">${o.customerEmail || ''}</small>
                  </div>
                </td>
                <td style="padding:12px 14px; font-size:13.5px; font-weight:850; color:#0f172a;">
                  ${formatPrice(o.total)}
                </td>
                <td style="padding:12px 14px;">
                  <span class="status-badge ${o.status === 'Livré' || o.status === 'Delivered' || o.status === 'Done' ? 'status-green' : (o.status === 'Cancelled' ? 'status-red' : 'status-blue')}">
                    ${o.status}
                  </span>
                </td>
                <td style="padding:12px 14px; text-align:right;">
                  <button class="view-order-dash-btn admin-btn admin-btn-secondary" data-order-id="${o.id}" style="padding:5px 12px; font-size:11.5px; font-weight:750;">
                    View Order
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function attachAdminDashboardListeners(context, shadow) {
  // Jump Tab Shortcuts
  shadow.querySelectorAll('.jump-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      if (target) {
        context.currentTab = target;
        localStorage.setItem('SWEETOS_admin_current_tab', target);
        context.render();
        context.attachListeners();
      }
    });
  });

  // View order button
  shadow.querySelectorAll('.view-order-dash-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.getAttribute('data-order-id');
      context.selectedOrderId = orderId;
      context.currentTab = 'orders';
      localStorage.setItem('SWEETOS_admin_current_tab', 'orders');
      context.render();
      context.attachListeners();
    });
  });
}
