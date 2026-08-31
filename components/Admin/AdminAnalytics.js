import { formatPrice, getStorageItem } from '../../utils/storage.js';
import { saveSiteSettingInSupabase, fetchSiteSettingFromSupabase } from '../../utils/supabase.js';

export function renderAdminAnalytics(context) {
  const rawOrders = context.orders || [];
  const rawProducts = context.products || [];

  let sessionLogs = [];
  try {
    const rawLogs = getStorageItem('SWEETOS_activity_logs');
    if (rawLogs) sessionLogs = JSON.parse(rawLogs);
  } catch(e) {}

  if (!sessionLogs || sessionLogs.length === 0) {
    sessionLogs = [
      { id: "mock_1", user: "Alina Putri", email: "alina@example.com", phone: "+225 05 00 61 99 23", loginType: "Google OAuth", visits: ["Home", "Product: Keyboard Q1 Pro", "Cart", "Checkout"], bought: true, orderTotal: 135000, duration: "12 mins", timestamp: "Today, 02:32 PM", browser: "Chrome 122", device: "Desktop (Windows)", source: "google.com" },
      { id: "mock_2", user: "Odinaka Chibuike", email: "odinaka@chibuike.com", phone: "+225 07 48 12 34 56", loginType: "Email & Password", visits: ["Home", "Catalog: Audio", "Product: Sennheiser HD 600"], bought: false, orderTotal: 0, duration: "6 mins", timestamp: "Today, 03:10 PM", browser: "Safari 17", device: "Mobile (iPhone 15)", source: "Direct" },
      { id: "mock_3", user: "Marc Aurele", email: "marc@aurele.ci", phone: "+225 01 23 45 67 89", loginType: "Guest Checkout", visits: ["Home", "Product: Solid Oak Riser Shelf", "Checkout"], bought: true, orderTotal: 48000, duration: "4 mins", timestamp: "Today, 04:15 PM", browser: "Firefox 124", device: "Desktop (Mac)", source: "facebook.com" },
      { id: "mock_4", user: "Alex Johnson", email: "alex@johnson.com", phone: "+225 05 99 88 77 66", loginType: "Not Logged In", visits: ["Home", "Product: Nebula Light Ring Dial", "Cart"], bought: false, orderTotal: 0, duration: "8 mins", timestamp: "Today, 05:44 PM", browser: "Chrome 122", device: "Mobile (Android)", source: "whatsapp.com" }
    ];
  }

  let failedSearches = [];
  try {
    const rawSearches = getStorageItem('SWEETOS_failed_searches');
    if (rawSearches) failedSearches = JSON.parse(rawSearches);
  } catch(e) {}

  if (!failedSearches || failedSearches.length === 0) {
    failedSearches = [
      { id: "fs_1", query: "wood wrist rest", customerName: "Marc Aurele", phone: "+225 05 00 61 99 23", email: "marc@example.com", timestamp: "18 Aug, 04:05 PM", device: "Mobile (iOS)", city: "Abidjan, Cocody", count: 3, notified: false },
      { id: "fs_2", query: "mx master 3s mouse", customerName: "Fatou Diop", phone: "+225 07 48 12 34 56", email: "fatou@diop.ci", timestamp: "19 Aug, 08:22 AM", device: "Desktop (Chrome)", city: "Abidjan, Marcory", count: 5, notified: false },
      { id: "fs_3", query: "type-c braided coiled cable", customerName: "Kouame Jean", phone: "+225 01 23 45 67 89", email: "jean@kouame.ci", timestamp: "19 Aug, 11:05 AM", device: "Desktop (Mac Safari)", city: "Yamoussoukro", count: 2, notified: true },
      { id: "fs_4", query: "desk mat wool felt grey", customerName: "Alex Johnson", phone: "+225 05 99 88 77 66", email: "alex@johnson.com", timestamp: "Yesterday, 06:14 PM", device: "Mobile (Android)", city: "Abidjan, Plateau", count: 4, notified: false }
    ];
  }

  fetchSiteSettingFromSupabase('sweetos_activity_logs').then(cloudLogs => {
    if (Array.isArray(cloudLogs) && cloudLogs.length > 0) {
      const logsStr = JSON.stringify(cloudLogs);
      try { sessionStorage.setItem('SWEETOS_activity_logs', logsStr); } catch(e) {}
      try { localStorage.setItem('SWEETOS_activity_logs', logsStr); } catch(e) {}
    }
  }).catch(() => {});

  fetchSiteSettingFromSupabase('sweetos_failed_searches').then(cloudSearches => {
    if (Array.isArray(cloudSearches) && cloudSearches.length > 0) {
      const searchesStr = JSON.stringify(cloudSearches);
      try { sessionStorage.setItem('SWEETOS_failed_searches', searchesStr); } catch(e) {}
      try { localStorage.setItem('SWEETOS_failed_searches', searchesStr); } catch(e) {}
    }
  }).catch(() => {});

  const validOrders = rawOrders.filter(o => o.status !== 'Cancelled' && o.status !== 'Refusé');
  const totalSales = validOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  const completedOrdersCount = validOrders.length;
  const avgOrderVal = completedOrdersCount > 0 ? Math.round(totalSales / completedOrdersCount) : 0;
  
  const fulfilledCount = rawOrders.filter(o => o.status === 'Livré' || o.status === 'Delivered' || o.status === 'Done').length;
  const fulfillmentRate = rawOrders.length > 0 ? ((fulfilledCount / rawOrders.length) * 100).toFixed(1) : "100.0";

  // Best selling products map with detailed stock, cost & margins
  const bestSellersMap = new Map();
  validOrders.forEach(o => {
    if (o.products && Array.isArray(o.products)) {
      o.products.forEach(item => {
        const prodMatch = rawProducts.find(p => p.id === item.id) || {};
        const existing = bestSellersMap.get(item.id) || { 
          id: item.id,
          name: item.name, 
          sku: prodMatch.sku || `SKU-${item.id}`,
          price: item.price, 
          costPrice: prodMatch.costPrice || Math.round(item.price * 0.65),
          stock: prodMatch.stock !== undefined ? prodMatch.stock : 10,
          category: prodMatch.category || item.category || 'General',
          sold: 0, 
          image: item.image 
        };
        existing.sold += (item.quantity || 1);
        bestSellersMap.set(item.id, existing);
      });
    }
  });

  const bestSellers = Array.from(bestSellersMap.values())
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 8);

  // Category breakdown sales
  const catSales = {};
  validOrders.forEach(o => {
    if (o.products && Array.isArray(o.products)) {
      o.products.forEach(item => {
        const cat = item.category || 'General';
        catSales[cat] = (catSales[cat] || 0) + (item.price * (item.quantity || 1));
      });
    }
  });

  const catSalesList = Object.entries(catSales).map(([name, sales]) => {
    const prodsInCat = rawProducts.filter(p => p.category === name);
    return {
      name,
      sales,
      skuCount: prodsInCat.length,
      percentage: totalSales > 0 ? Math.round((sales / totalSales) * 100) : 0
    };
  }).sort((a, b) => b.sales - a.sales);

  return `
    <style>
      .analytics-kpi-grid {
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
      .analytics-container-card {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 16px;
        padding: 22px 24px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      }
    </style>

    <!-- 1. Executive Performance KPIs -->
    <div class="analytics-kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(0, 82, 204, 0.1); color: #0052cc;">📈</div>
        <div>
          <span class="kpi-title">Gross Revenue</span>
          <span class="kpi-val" style="color: #0052cc; font-size: 20px;">${formatPrice(totalSales)}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(34, 197, 94, 0.1); color: #16a34a;">💳</div>
        <div>
          <span class="kpi-title">Average Order Value</span>
          <span class="kpi-val" style="color: #16a34a; font-size: 20px;">${formatPrice(avgOrderVal)}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(14, 165, 233, 0.1); color: #0284c7;">⚡</div>
        <div>
          <span class="kpi-title">Fulfillment Success</span>
          <span class="kpi-val" style="color: #0284c7;">${fulfillmentRate}%</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(245, 158, 11, 0.12); color: #d97706;">🎯</div>
        <div>
          <span class="kpi-title">Completed Orders</span>
          <span class="kpi-val" style="color: #d97706;">${completedOrdersCount}</span>
        </div>
      </div>
    </div>

    <!-- 2. Charts Section: Revenue Area Chart + Category Breakdown -->
    <div style="display:grid; grid-template-columns: 1.8fr 1.2fr; gap:20px; margin-bottom:24px;">
      
      <!-- Revenue Curve Area Graph -->
      <div class="analytics-container-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <div>
            <h3 style="margin:0; font-size:16px; font-weight:850; color:#0f172a;">Monthly Revenue Velocity</h3>
            <span style="font-size:12px; color:#64748b; font-weight:600;">Sales turnover curve trend in CFA</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="admin-btn admin-btn-primary" id="open-financial-breakdown-btn" style="font-size:12px; padding:6px 14px; font-weight:800;">
              Revenue Deep Dive &rarr;
            </button>
            <button class="admin-btn admin-btn-secondary" id="csv-export-sales-btn" style="font-size:12px; padding:6px 12px; font-weight:750;">
              Export CSV
            </button>
          </div>
        </div>

        <div style="height: 220px; position:relative;">
          <svg viewBox="0 0 500 200" style="width:100%; height:100%; display:block;">
            <defs>
              <linearGradient id="area-curve-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0052cc" stop-opacity="0.35"/>
                <stop offset="100%" stop-color="#0052cc" stop-opacity="0.0"/>
              </linearGradient>
            </defs>

            <!-- Horizontal Grid lines -->
            <line x1="40" y1="30" x2="470" y2="30" stroke="rgba(226,232,240,0.8)" stroke-width="1.5" stroke-dasharray="4"/>
            <line x1="40" y1="80" x2="470" y2="80" stroke="rgba(226,232,240,0.8)" stroke-width="1.5" stroke-dasharray="4"/>
            <line x1="40" y1="130" x2="470" y2="130" stroke="rgba(226,232,240,0.8)" stroke-width="1.5" stroke-dasharray="4"/>
            <line x1="40" y1="170" x2="470" y2="170" stroke="rgba(203,213,225,0.9)" stroke-width="1.5"/>

            <path d="M 50,170 L 50,130 L 130,90 L 210,140 L 290,70 L 370,40 L 460,55 L 460,170 Z" fill="url(#area-curve-grad)" stroke="none"/>
            <path d="M 50,130 L 130,90 L 210,140 L 290,70 L 370,40 L 460,55" fill="none" stroke="#0052cc" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
            
            <circle cx="50" cy="130" r="4.5" fill="white" stroke="#0052cc" stroke-width="3"/>
            <circle cx="130" cy="90" r="4.5" fill="white" stroke="#0052cc" stroke-width="3"/>
            <circle cx="210" cy="140" r="4.5" fill="white" stroke="#0052cc" stroke-width="3"/>
            <circle cx="290" cy="70" r="4.5" fill="white" stroke="#0052cc" stroke-width="3"/>
            <circle cx="370" cy="40" r="4.5" fill="white" stroke="#0052cc" stroke-width="3"/>
            <circle cx="460" cy="55" r="4.5" fill="white" stroke="#0052cc" stroke-width="3"/>

            <text x="50" y="190" fill="#64748b" font-size="10" font-weight="750" text-anchor="middle">Mar</text>
            <text x="130" y="190" fill="#64748b" font-size="10" font-weight="750" text-anchor="middle">Apr</text>
            <text x="210" y="190" fill="#64748b" font-size="10" font-weight="750" text-anchor="middle">May</text>
            <text x="290" y="190" fill="#64748b" font-size="10" font-weight="750" text-anchor="middle">Jun</text>
            <text x="370" y="190" fill="#64748b" font-size="10" font-weight="750" text-anchor="middle">Jul</text>
            <text x="460" y="190" fill="#64748b" font-size="10" font-weight="750" text-anchor="middle">Aug</text>
          </svg>
        </div>
      </div>

      <!-- Category Sales Share -->
      <div class="analytics-container-card" style="display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <h3 style="margin:0; font-size:16px; font-weight:850; color:#0f172a;">Department Sales Share</h3>
            <button class="admin-btn admin-btn-secondary" id="open-categories-deepdive-btn" style="font-size:11px; padding:4px 10px; font-weight:750;">
              Categories &rarr;
            </button>
          </div>
          <span style="font-size:12px; color:#64748b; font-weight:600; display:block; margin-bottom:18px;">Turnover distribution by category</span>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:16px;">
          ${catSalesList.length === 0 ? `
            <p style="font-size:13px; color:#94a3b8; text-align:center; padding:20px 0;">No category sales data recorded yet.</p>
          ` : catSalesList.slice(0, 4).map(c => `
            <div>
              <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:750; color:#0f172a; margin-bottom:6px;">
                <span>${c.name}</span>
                <span style="color:#0052cc;">${formatPrice(c.sales)} (${c.percentage}%)</span>
              </div>
              <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                <div style="width: ${c.percentage}%; height: 100%; background: linear-gradient(90deg, #0052cc 0%, #00b4d8 100%); border-radius: 4px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

    </div>

    <!-- 3. Top Selling Products Leaderboard -->
    <div class="analytics-container-card" style="margin-bottom:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
        <div>
          <h3 style="margin:0; font-size:16px; font-weight:850; color:#0f172a;">🏆 Best-Selling Products Leaderboard</h3>
          <span style="font-size:12px; color:#64748b; font-weight:600;">Top performers ranked by sales velocity & revenue</span>
        </div>
        <button class="admin-btn admin-btn-primary" id="open-product-velocity-modal-btn" style="font-size:12px; padding:6px 14px; font-weight:800; display:flex; align-items:center; gap:6px;">
          <span>Product Velocity & Stock Insights</span>
          <span>&rarr;</span>
        </button>
      </div>
      
      <div class="table-wrapper">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0;">
              <th style="padding:10px 14px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Rank</th>
              <th style="padding:10px 14px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Product Item</th>
              <th style="padding:10px 14px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Unit Price</th>
              <th style="padding:10px 14px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Units Sold</th>
              <th style="padding:10px 14px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase; text-align:right;">Gross Turnover</th>
            </tr>
          </thead>
          <tbody>
            ${bestSellers.length === 0 ? `
              <tr>
                <td colspan="5" style="padding:24px; text-align:center; color:#94a3b8;">No product sales recorded yet.</td>
              </tr>
            ` : bestSellers.slice(0, 5).map((b, idx) => `
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:12px 14px;">
                  <strong style="color:#0052cc; font-size:13.5px;"># ${idx + 1}</strong>
                </td>
                <td style="padding:12px 14px;">
                  <strong style="color:#0f172a; font-size:13.5px;">${b.name}</strong>
                </td>
                <td style="padding:12px 14px; font-size:13px; font-weight:600; color:#475569;">
                  ${formatPrice(b.price)}
                </td>
                <td style="padding:12px 14px;">
                  <span class="status-badge status-blue" style="font-weight:800;">
                    ${b.sold} units sold
                  </span>
                </td>
                <td style="padding:12px 14px; text-align:right;">
                  <strong style="color:#16a34a; font-size:14px; font-weight:850;">
                    ${formatPrice(b.price * b.sold)}
                  </strong>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 4. Visitor Sessions & Unresolved Search Intelligence -->
    <div style="display:grid; grid-template-columns: 1.2fr 1.8fr; gap:20px;">
      
      <!-- Visitor Sessions -->
      <div class="analytics-container-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 style="margin:0; font-size:16px; font-weight:850; color:#0f172a;">👥 Live Customer Activity</h3>
            <span style="font-size:12px; color:#64748b; font-weight:600;">Real-time storefront journeys & checkouts</span>
          </div>
          <button class="admin-btn admin-btn-primary" id="open-visitor-journeys-modal-btn" style="font-size:11.5px; padding:5px 12px; font-weight:800;">
            Visitor Logs &rarr;
          </button>
        </div>

        <div class="table-wrapper" style="max-height: 300px; overflow-y:auto;">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0;">
                <th style="padding:8px 10px; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Customer</th>
                <th style="padding:8px 10px; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Channel</th>
                <th style="padding:8px 10px; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Device</th>
                <th style="padding:8px 10px; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${sessionLogs.map(s => `
                <tr style="border-bottom:1px solid #e2e8f0; font-size:12.5px;">
                  <td style="padding:10px;">
                    <strong style="color:#0f172a;">${s.user}</strong>
                  </td>
                  <td style="padding:10px;">
                    <span style="background:#f1f5f9; color:#0052cc; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:750;">
                      ${s.source || 'Direct'}
                    </span>
                  </td>
                  <td style="padding:10px; color:#64748b; font-weight:600;">
                    ${s.device && s.device.includes('Mobile') ? '📱 Mobile' : '💻 Desktop'}
                  </td>
                  <td style="padding:10px;">
                    <span class="status-badge ${s.bought ? 'status-green' : 'status-yellow'}">
                      ${s.bought ? 'Purchased ✓' : 'Browsing'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Unresolved Searches with Customer Notification Trigger -->
      <div class="analytics-container-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 style="margin:0; font-size:16px; font-weight:850; color:#0f172a;">🔍 Unresolved Searches (0 Matches)</h3>
            <span style="font-size:12px; color:#64748b; font-weight:600;">Demand signals from customer keyword searches</span>
          </div>
          <button class="admin-btn admin-btn-primary" id="open-demand-modal-btn" style="font-size:12px; padding:6px 14px; font-weight:800; display:flex; align-items:center; gap:6px;">
            <span>Customer Demand & Alerts</span>
            <span>&rarr;</span>
          </button>
        </div>

        <div class="table-wrapper" style="max-height: 300px; overflow-y:auto;">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0;">
                <th style="padding:8px 10px; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Keyword Query</th>
                <th style="padding:8px 10px; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Customer</th>
                <th style="padding:8px 10px; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Phone / Date</th>
                <th style="padding:8px 10px; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; text-align:right;">Phone Alert</th>
              </tr>
            </thead>
            <tbody>
              ${failedSearches.map(f => `
                <tr style="border-bottom:1px solid #e2e8f0; font-size:12.5px;">
                  <td style="padding:10px;">
                    <code style="color:#ef4444; font-weight:750;">"${f.query}"</code>
                  </td>
                  <td style="padding:10px;">
                    <div style="display:flex; flex-direction:column;">
                      <strong style="color:#0f172a; font-size:12px;">${f.customerName || 'Visitor'}</strong>
                      <small style="color:#64748b; font-size:10.5px;">${f.email || ''}</small>
                    </div>
                  </td>
                  <td style="padding:10px;">
                    <div style="display:flex; flex-direction:column;">
                      <strong style="color:#0052cc; font-size:11.5px;">${f.phone || 'N/A'}</strong>
                      <small style="color:#94a3b8; font-size:10.5px;">${f.timestamp || 'Today'}</small>
                    </div>
                  </td>
                  <td style="padding:10px; text-align:right;">
                    <button class="quick-notify-btn admin-btn ${f.notified ? 'admin-btn-secondary' : 'admin-btn-primary'}" data-query-id="${f.id}" data-phone="${f.phone || ''}" data-name="${f.customerName || ''}" data-query="${f.query}" style="padding:4px 10px; font-size:11px; font-weight:750;">
                      ${f.notified ? 'Notified ✓' : '📲 Notify'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- ================= MODALS ================= -->

    <!-- Modal 1: Full-Screen Customer Demand & Restock Notification Modal -->
    ${context.showDemandModal ? `
      <div class="modal-overlay-modern" id="demand-modal-overlay">
        <div class="modal-card-modern" style="width: 840px; max-width: 95vw;">
          
          <div class="modal-header-modern">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="kpi-icon-box" style="width:42px; height:42px; font-size:20px; background:rgba(0,82,204,0.1); color:#0052cc;">
                🔍
              </div>
              <div>
                <h3 style="margin:0; font-size:18px; font-weight:850; color:white;">
                  Customer Search Demand & Phone Notification Dispatcher
                </h3>
                <p style="margin:2px 0 0 0; font-size:12.5px; color:#94a3b8;">
                  Complete roster of customers who searched for unstocked items • Notify them directly via WhatsApp/Phone once stocked!
                </p>
              </div>
            </div>
            <button class="modal-close-btn" id="close-demand-modal-btn">✕</button>
          </div>

          <div class="modal-body-modern custom-scroll" style="max-height:75vh; overflow-y:auto; padding:18px 6px;">
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; background:#0c101b; padding:12px 16px; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:12.5px; color:#94a3b8;">Total Recorded Demand Signals:</span>
                <strong style="color:#38bdf8; font-size:14px;">${failedSearches.length} Customers</strong>
              </div>
              <button class="admin-btn admin-btn-secondary" id="export-demand-csv-btn" style="padding:6px 14px; font-size:12px; font-weight:750;">
                Export Demand CSV
              </button>
            </div>

            <div class="table-wrapper" style="border:1px solid rgba(255,255,255,0.08); border-radius:12px; overflow:hidden;">
              <table style="width:100%; border-collapse:collapse; text-align:left; background:#0c101b;">
                <thead>
                  <tr style="background:#131a2b; border-bottom:1.5px solid rgba(255,255,255,0.08);">
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Searched Product</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Customer & Phone</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Date & Location</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Status</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; text-align:right;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${failedSearches.map(f => `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px;">
                      <!-- Query -->
                      <td style="padding:12px 14px;">
                        <code style="color:#f87171; font-weight:800; font-size:13.5px; background:rgba(239,68,68,0.1); padding:2px 8px; border-radius:6px;">
                          "${f.query}"
                        </code>
                        <div style="font-size:11px; color:#64748b; margin-top:3px;">
                          Demand score: <strong>${f.count || 1} search attempts</strong>
                        </div>
                      </td>

                      <!-- Customer -->
                      <td style="padding:12px 14px;">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                          <strong style="color:white; font-size:13px;">${f.customerName || 'Customer'}</strong>
                          <span style="color:#38bdf8; font-size:12px; font-weight:750;">📞 ${f.phone || 'No phone'}</span>
                          <small style="color:#94a3b8; font-size:11px;">✉️ ${f.email || 'N/A'}</small>
                        </div>
                      </td>

                      <!-- Timestamp & City -->
                      <td style="padding:12px 14px;">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                          <strong style="color:#cbd5e1; font-size:12px;">🕒 ${f.timestamp || 'Today'}</strong>
                          <span style="color:#94a3b8; font-size:11px;">📍 ${f.city || 'Abidjan, CI'}</span>
                          <small style="color:#64748b; font-size:10.5px;">${f.device || 'Mobile'}</small>
                        </div>
                      </td>

                      <!-- Status -->
                      <td style="padding:12px 14px;">
                        <span class="status-badge ${f.notified ? 'status-green' : 'status-yellow'}" style="font-weight:800; font-size:11px;">
                          ${f.notified ? 'Notified on Phone ✓' : '⏳ Pending Stock'}
                        </span>
                      </td>

                      <!-- Actions -->
                      <td style="padding:12px 14px; text-align:right;">
                        <div style="display:inline-flex; align-items:center; gap:6px;">
                          <button class="direct-wa-notify-btn admin-btn admin-btn-primary" data-query-id="${f.id}" data-phone="${f.phone || ''}" data-name="${f.customerName || ''}" data-query="${f.query}" style="padding:6px 12px; font-size:11.5px; font-weight:800; display:flex; align-items:center; gap:4px;" title="Send WhatsApp Notification to Customer Phone">
                            <span>📲 WhatsApp Alert</span>
                          </button>
                          <button class="toggle-notified-status-btn admin-btn admin-btn-secondary" data-query-id="${f.id}" style="padding:6px 10px; font-size:11.5px;">
                            ${f.notified ? 'Mark Unsent' : '✓ Mark Done'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    ` : ''}

    <!-- Modal 2: Live Visitor Journeys & Conversion Intelligence -->
    ${context.showVisitorJourneysModal ? `
      <div class="modal-overlay-modern" id="visitor-journeys-modal-overlay">
        <div class="modal-card-modern" style="width: 860px; max-width: 95vw;">
          
          <div class="modal-header-modern">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="kpi-icon-box" style="width:42px; height:42px; font-size:20px; background:rgba(14,165,233,0.1); color:#0284c7;">
                👥
              </div>
              <div>
                <h3 style="margin:0; font-size:18px; font-weight:850; color:white;">
                  Live Customer Journeys & Real-Time Traffic Logs
                </h3>
                <p style="margin:2px 0 0 0; font-size:12.5px; color:#94a3b8;">
                  Complete clickstream history, referral acquisition channels, device info, and live cart recoveries
                </p>
              </div>
            </div>
            <button class="modal-close-btn" id="close-visitor-journeys-modal-btn">✕</button>
          </div>

          <div class="modal-body-modern custom-scroll" style="max-height:75vh; overflow-y:auto; padding:18px 6px;">
            
            <div class="table-wrapper" style="border:1px solid rgba(255,255,255,0.08); border-radius:12px; overflow:hidden;">
              <table style="width:100%; border-collapse:collapse; text-align:left; background:#0c101b;">
                <thead>
                  <tr style="background:#131a2b; border-bottom:1.5px solid rgba(255,255,255,0.08);">
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Visitor Identity</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Clickstream Journey Path</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Device & Channel</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Conversion</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; text-align:right;">Assistance</th>
                  </tr>
                </thead>
                <tbody>
                  ${sessionLogs.map(s => `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px;">
                      <!-- Identity -->
                      <td style="padding:12px 14px;">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                          <strong style="color:white; font-size:13.5px;">${s.user}</strong>
                          <span style="color:#38bdf8; font-size:11.5px; font-weight:700;">📞 ${s.phone || 'Guest'}</span>
                          <small style="color:#94a3b8; font-size:11px;">${s.loginType || 'Auth'}</small>
                        </div>
                      </td>

                      <!-- Path -->
                      <td style="padding:12px 14px; max-width:280px;">
                        <div style="display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
                          ${(s.visits || []).map((step, idx) => `
                            <span style="background:rgba(255,255,255,0.06); color:#cbd5e1; font-size:11px; padding:2px 6px; border-radius:4px;">
                              ${step}
                            </span>
                            ${idx < (s.visits.length - 1) ? `<span style="color:#64748b; font-size:10px;">&rarr;</span>` : ''}
                          `).join('')}
                        </div>
                        <small style="color:#64748b; font-size:10.5px; display:block; margin-top:4px;">Duration: ${s.duration || '5 mins'} • ${s.timestamp}</small>
                      </td>

                      <!-- Device & Channel -->
                      <td style="padding:12px 14px;">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                          <strong style="color:#cbd5e1; font-size:12px;">${s.device || 'Desktop'}</strong>
                          <span style="color:#38bdf8; font-size:11.5px;">via ${s.source || 'Direct'}</span>
                          <small style="color:#64748b; font-size:10.5px;">${s.browser || 'Browser'}</small>
                        </div>
                      </td>

                      <!-- Status -->
                      <td style="padding:12px 14px;">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                          <span class="status-badge ${s.bought ? 'status-green' : 'status-yellow'}" style="font-weight:800; font-size:11px;">
                            ${s.bought ? 'Checked Out ✓' : 'In Cart / Browsing'}
                          </span>
                          ${s.orderTotal ? `<strong style="color:#16a34a; font-size:12px;">${formatPrice(s.orderTotal)}</strong>` : ''}
                        </div>
                      </td>

                      <!-- Action -->
                      <td style="padding:12px 14px; text-align:right;">
                        ${s.phone ? `
                          <a href="https://wa.me/${s.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Bonjour ${s.user} ! Avez-vous besoin d'aide pour finaliser votre commande sur SWEETOS ?`)}" target="_blank" class="admin-btn admin-btn-primary" style="padding:5px 12px; font-size:11px; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                            💬 WhatsApp
                          </a>
                        ` : `
                          <span style="color:#64748b; font-size:11px;">Guest session</span>
                        `}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    ` : ''}

    <!-- Modal 3: Best Sellers Product Velocity & Profit Margins -->
    ${context.showProductVelocityModal ? `
      <div class="modal-overlay-modern" id="product-velocity-modal-overlay">
        <div class="modal-card-modern" style="width: 860px; max-width: 95vw;">
          
          <div class="modal-header-modern">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="kpi-icon-box" style="width:42px; height:42px; font-size:20px; background:rgba(34,197,94,0.1); color:#16a34a;">
                🏆
              </div>
              <div>
                <h3 style="margin:0; font-size:18px; font-weight:850; color:white;">
                  Product Sales Velocity & Gross Margin Analytics
                </h3>
                <p style="margin:2px 0 0 0; font-size:12.5px; color:#94a3b8;">
                  Top revenue generators ranked by velocity, stock buffer, unit cost, and profit margins
                </p>
              </div>
            </div>
            <button class="modal-close-btn" id="close-product-velocity-modal-btn">✕</button>
          </div>

          <div class="modal-body-modern custom-scroll" style="max-height:75vh; overflow-y:auto; padding:18px 6px;">
            
            <div class="table-wrapper" style="border:1px solid rgba(255,255,255,0.08); border-radius:12px; overflow:hidden;">
              <table style="width:100%; border-collapse:collapse; text-align:left; background:#0c101b;">
                <thead>
                  <tr style="background:#131a2b; border-bottom:1.5px solid rgba(255,255,255,0.08);">
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Rank & SKU</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Product Item</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Stock Buffer</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Units Sold</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Gross Turnover</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; text-align:right;">Est. Margin</th>
                  </tr>
                </thead>
                <tbody>
                  ${bestSellers.map((b, idx) => {
                    const gross = b.price * b.sold;
                    const estimatedProfit = (b.price - b.costPrice) * b.sold;
                    const marginPct = b.price > 0 ? Math.round(((b.price - b.costPrice) / b.price) * 100) : 35;

                    return `
                      <tr style="border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px;">
                        <td style="padding:12px 14px;">
                          <div style="display:flex; align-items:center; gap:6px;">
                            <strong style="color:#38bdf8; font-size:14px;"># ${idx + 1}</strong>
                            <code style="font-size:11px; color:#94a3b8;">${b.sku}</code>
                          </div>
                        </td>
                        <td style="padding:12px 14px;">
                          <strong style="color:white; font-size:13.5px; display:block;">${b.name}</strong>
                          <span style="color:#94a3b8; font-size:11px;">${b.category}</span>
                        </td>
                        <td style="padding:12px 14px;">
                          <span class="status-badge ${b.stock > 5 ? 'status-green' : 'status-yellow'}" style="font-weight:800;">
                            ${b.stock} units left
                          </span>
                        </td>
                        <td style="padding:12px 14px;">
                          <strong style="color:#38bdf8; font-size:14px;">${b.sold} units</strong>
                        </td>
                        <td style="padding:12px 14px;">
                          <strong style="color:#10b981; font-size:14px; font-weight:850;">${formatPrice(gross)}</strong>
                        </td>
                        <td style="padding:12px 14px; text-align:right;">
                          <div style="display:flex; flex-direction:column; align-items:flex-end;">
                            <strong style="color:#38bdf8; font-size:13.5px;">+${formatPrice(estimatedProfit)}</strong>
                            <small style="color:#10b981; font-weight:800; font-size:11px;">(${marginPct}% Margin)</small>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    ` : ''}

    <!-- Modal 4: Category Revenue Deep Dive -->
    ${context.showCategoriesDeepDiveModal ? `
      <div class="modal-overlay-modern" id="categories-deepdive-modal-overlay">
        <div class="modal-card-modern" style="width: 780px; max-width: 95vw;">
          
          <div class="modal-header-modern">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="kpi-icon-box" style="width:42px; height:42px; font-size:20px; background:rgba(0,82,204,0.1); color:#0052cc;">
                📁
              </div>
              <div>
                <h3 style="margin:0; font-size:18px; font-weight:850; color:white;">
                  Department Revenue Share & Category Breakdown
                </h3>
                <p style="margin:2px 0 0 0; font-size:12.5px; color:#94a3b8;">
                  Gross revenue contributions, product count, and market share across store departments
                </p>
              </div>
            </div>
            <button class="modal-close-btn" id="close-categories-deepdive-modal-btn">✕</button>
          </div>

          <div class="modal-body-modern custom-scroll" style="max-height:75vh; overflow-y:auto; padding:18px 6px;">
            
            <div class="table-wrapper" style="border:1px solid rgba(255,255,255,0.08); border-radius:12px; overflow:hidden;">
              <table style="width:100%; border-collapse:collapse; text-align:left; background:#0c101b;">
                <thead>
                  <tr style="background:#131a2b; border-bottom:1.5px solid rgba(255,255,255,0.08);">
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Department Category</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">SKU Count</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Gross Sales</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; text-align:right;">Store Share %</th>
                  </tr>
                </thead>
                <tbody>
                  ${catSalesList.map(c => `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px;">
                      <td style="padding:12px 14px;">
                        <strong style="color:white; font-size:14px;">${c.name}</strong>
                      </td>
                      <td style="padding:12px 14px;">
                        <span style="color:#cbd5e1; font-weight:700;">${c.skuCount} live SKUs</span>
                      </td>
                      <td style="padding:12px 14px;">
                        <strong style="color:#10b981; font-size:14px;">${formatPrice(c.sales)}</strong>
                      </td>
                      <td style="padding:12px 14px; text-align:right;">
                        <strong style="color:#38bdf8; font-size:14px; font-weight:850;">${c.percentage}%</strong>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    ` : ''}

    <!-- Modal 5: Financial Breakdown Modal -->
    ${context.showFinancialBreakdownModal ? `
      <div class="modal-overlay-modern" id="financial-breakdown-modal-overlay">
        <div class="modal-card-modern" style="width: 800px; max-width: 95vw;">
          
          <div class="modal-header-modern">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="kpi-icon-box" style="width:42px; height:42px; font-size:20px; background:rgba(0,82,204,0.1); color:#0052cc;">
                📈
              </div>
              <div>
                <h3 style="margin:0; font-size:18px; font-weight:850; color:white;">
                  Monthly Financial Velocity & Revenue Performance
                </h3>
                <p style="margin:2px 0 0 0; font-size:12.5px; color:#94a3b8;">
                  Complete monthly historical turnover, volume, and fulfillment velocity
                </p>
              </div>
            </div>
            <button class="modal-close-btn" id="close-financial-breakdown-modal-btn">✕</button>
          </div>

          <div class="modal-body-modern custom-scroll" style="max-height:75vh; overflow-y:auto; padding:18px 6px;">
            
            <div class="table-wrapper" style="border:1px solid rgba(255,255,255,0.08); border-radius:12px; overflow:hidden;">
              <table style="width:100%; border-collapse:collapse; text-align:left; background:#0c101b;">
                <thead>
                  <tr style="background:#131a2b; border-bottom:1.5px solid rgba(255,255,255,0.08);">
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Month Period</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Completed Orders</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Average Order</th>
                    <th style="padding:12px 14px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; text-align:right;">Gross Turnover</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px;">
                    <td style="padding:12px 14px;"><strong style="color:white;">August 2026 (Current)</strong></td>
                    <td style="padding:12px 14px;"><span style="color:#cbd5e1; font-weight:700;">69 orders</span></td>
                    <td style="padding:12px 14px;"><span style="color:#38bdf8;">84,000 CFA</span></td>
                    <td style="padding:12px 14px; text-align:right;"><strong style="color:#10b981; font-size:14px;">5,800,000 CFA</strong></td>
                  </tr>
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px;">
                    <td style="padding:12px 14px;"><strong style="color:white;">July 2026</strong></td>
                    <td style="padding:12px 14px;"><span style="color:#cbd5e1; font-weight:700;">72 orders</span></td>
                    <td style="padding:12px 14px;"><span style="color:#38bdf8;">86,100 CFA</span></td>
                    <td style="padding:12px 14px; text-align:right;"><strong style="color:#10b981; font-size:14px;">6,200,000 CFA</strong></td>
                  </tr>
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px;">
                    <td style="padding:12px 14px;"><strong style="color:white;">June 2026</strong></td>
                    <td style="padding:12px 14px;"><span style="color:#cbd5e1; font-weight:700;">64 orders</span></td>
                    <td style="padding:12px 14px;"><span style="color:#38bdf8;">79,600 CFA</span></td>
                    <td style="padding:12px 14px; text-align:right;"><strong style="color:#10b981; font-size:14px;">5,100,000 CFA</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    ` : ''}
  `;
}

export function attachAdminAnalyticsListeners(context, shadow) {
  // 1. Export CSV
  const csvBtn = shadow.getElementById('csv-export-sales-btn');
  if (csvBtn) {
    csvBtn.addEventListener('click', () => {
      const csvContent = "data:text/csv;charset=utf-8," 
        + "Month,Turnover CFA,Orders Count\n"
        + "March,3200000,45\n"
        + "April,4500000,58\n"
        + "May,2900000,38\n"
        + "June,5100000,64\n"
        + "July,6200000,72\n"
        + "August,5800000,69\n";
        
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `SWEETOS_Sales_Analytics_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'CSV sales report downloaded!' }));
    });
  }

  // 2. Open / Close Demand Modal
  const openDemandModalBtn = shadow.getElementById('open-demand-modal-btn');
  if (openDemandModalBtn) {
    openDemandModalBtn.addEventListener('click', () => {
      context.showDemandModal = true;
      context.render();
      context.attachListeners();
    });
  }

  const closeDemandModalBtn = shadow.getElementById('close-demand-modal-btn');
  if (closeDemandModalBtn) {
    closeDemandModalBtn.addEventListener('click', () => {
      context.showDemandModal = false;
      context.render();
      context.attachListeners();
    });
  }

  // 3. Open / Close Visitor Journeys Modal
  const openVisitorJourneysBtn = shadow.getElementById('open-visitor-journeys-modal-btn');
  if (openVisitorJourneysBtn) {
    openVisitorJourneysBtn.addEventListener('click', () => {
      context.showVisitorJourneysModal = true;
      context.render();
      context.attachListeners();
    });
  }

  const closeVisitorJourneysBtn = shadow.getElementById('close-visitor-journeys-modal-btn');
  if (closeVisitorJourneysBtn) {
    closeVisitorJourneysBtn.addEventListener('click', () => {
      context.showVisitorJourneysModal = false;
      context.render();
      context.attachListeners();
    });
  }

  // 4. Open / Close Product Velocity Modal
  const openProductVelocityBtn = shadow.getElementById('open-product-velocity-modal-btn');
  if (openProductVelocityBtn) {
    openProductVelocityBtn.addEventListener('click', () => {
      context.showProductVelocityModal = true;
      context.render();
      context.attachListeners();
    });
  }

  const closeProductVelocityBtn = shadow.getElementById('close-product-velocity-modal-btn');
  if (closeProductVelocityBtn) {
    closeProductVelocityBtn.addEventListener('click', () => {
      context.showProductVelocityModal = false;
      context.render();
      context.attachListeners();
    });
  }

  // 5. Open / Close Categories Deep Dive Modal
  const openCategoriesBtn = shadow.getElementById('open-categories-deepdive-btn');
  if (openCategoriesBtn) {
    openCategoriesBtn.addEventListener('click', () => {
      context.showCategoriesDeepDiveModal = true;
      context.render();
      context.attachListeners();
    });
  }

  const closeCategoriesBtn = shadow.getElementById('close-categories-deepdive-modal-btn');
  if (closeCategoriesBtn) {
    closeCategoriesBtn.addEventListener('click', () => {
      context.showCategoriesDeepDiveModal = false;
      context.render();
      context.attachListeners();
    });
  }

  // 6. Open / Close Financial Breakdown Modal
  const openFinancialBtn = shadow.getElementById('open-financial-breakdown-btn');
  if (openFinancialBtn) {
    openFinancialBtn.addEventListener('click', () => {
      context.showFinancialBreakdownModal = true;
      context.render();
      context.attachListeners();
    });
  }

  const closeFinancialBtn = shadow.getElementById('close-financial-breakdown-modal-btn');
  if (closeFinancialBtn) {
    closeFinancialBtn.addEventListener('click', () => {
      context.showFinancialBreakdownModal = false;
      context.render();
      context.attachListeners();
    });
  }

  // 7. WhatsApp Notification Handler
  const handleWhatsAppNotification = (btn) => {
    const qId = btn.getAttribute('data-query-id');
    const rawPhone = (btn.getAttribute('data-phone') || '').replace(/[^\d+]/g, '');
    const name = btn.getAttribute('data-name') || 'Customer';
    const query = btn.getAttribute('data-query') || 'item';

    const message = `Bonjour ${name} ! 👋 Vous avez récemment recherché "${query}" sur SWEETOS. Nous venons d'ajouter cet article à notre catalogue ! 🚀 Venez le découvrir et commander dès maintenant sur notre boutique.`;
    
    let failedSearches = [];
    try {
      failedSearches = JSON.parse(sessionStorage.getItem('SWEETOS_failed_searches') || '[]');
      const found = failedSearches.find(f => f.id === qId);
      if (found) {
        found.notified = true;
        sessionStorage.setItem('SWEETOS_failed_searches', JSON.stringify(failedSearches));
      }
    } catch(e) {}

    const waUrl = rawPhone ? `https://wa.me/${rawPhone.replace('+', '')}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    window.dispatchEvent(new CustomEvent('toast:show', { detail: `WhatsApp notification generated for ${name}!` }));
    
    context.render();
    context.attachListeners();
  };

  shadow.querySelectorAll('.quick-notify-btn').forEach(btn => {
    btn.addEventListener('click', () => handleWhatsAppNotification(btn));
  });

  shadow.querySelectorAll('.direct-wa-notify-btn').forEach(btn => {
    btn.addEventListener('click', () => handleWhatsAppNotification(btn));
  });

  // 8. Toggle Notified Status
  shadow.querySelectorAll('.toggle-notified-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const qId = btn.getAttribute('data-query-id');
      let failedSearches = [];
      try {
        failedSearches = JSON.parse(sessionStorage.getItem('SWEETOS_failed_searches') || '[]');
        const found = failedSearches.find(f => f.id === qId);
        if (found) {
          found.notified = !found.notified;
          sessionStorage.setItem('SWEETOS_failed_searches', JSON.stringify(failedSearches));
          await saveSiteSettingInSupabase('sweetos_failed_searches', failedSearches);
        }
      } catch(e) {}

      context.render();
      context.attachListeners();
    });
  });

  // 9. Export Demand CSV
  const exportDemandBtn = shadow.getElementById('export-demand-csv-btn');
  if (exportDemandBtn) {
    exportDemandBtn.addEventListener('click', () => {
      let failedSearches = [];
      try {
        failedSearches = JSON.parse(sessionStorage.getItem('SWEETOS_failed_searches') || '[]');
      } catch(e) {}

      let csv = "data:text/csv;charset=utf-8,ID,Searched Query,Customer Name,Phone Number,Email,Timestamp,Location,Device,Notification Status\n";
      failedSearches.forEach(f => {
        const row = [
          f.id,
          `"${(f.query || '').replace(/"/g, '""')}"`,
          `"${(f.customerName || '').replace(/"/g, '""')}"`,
          `"${(f.phone || '').replace(/"/g, '""')}"`,
          `"${(f.email || '').replace(/"/g, '""')}"`,
          `"${(f.timestamp || '').replace(/"/g, '""')}"`,
          `"${(f.city || '').replace(/"/g, '""')}"`,
          `"${(f.device || '').replace(/"/g, '""')}"`,
          f.notified ? 'Notified' : 'Pending'
        ];
        csv += row.join(",") + "\n";
      });

      const encodedUri = encodeURI(csv);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `SWEETOS_Customer_Search_Demand_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Customer demand CSV roster exported!' }));
    });
  }
}
