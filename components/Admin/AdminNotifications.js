// Dedicated Admin Notification Management Page

let notifTypeFilter = 'All'; // 'All' | 'unread' | 'order' | 'stock' | 'coupon' | 'system'

export function renderAdminNotifications(context) {
  const lowStock = (context.products || []).filter(p => p.stock !== undefined && p.stock <= (p.threshold || 5));
  const pendingOrders = (context.orders || []).filter(o => o.status === 'Pending' || o.status === 'En cours' || o.status === 'Traitement');
  const lowCoupons = (context.coupons || []).filter(c => c.stock !== undefined && c.stock <= 2);
  
  const readAlertsStr = sessionStorage.getItem('SWEETOS_admin_read_alerts') || '[]';
  let readAlerts = [];
  try {
    readAlerts = JSON.parse(readAlertsStr);
  } catch(e) {}

  // Auto-mark default system notice as read when visiting alerts page
  if (!readAlerts.includes('sys-backup-ok')) {
    readAlerts.push('sys-backup-ok');
    sessionStorage.setItem('SWEETOS_admin_read_alerts', JSON.stringify(readAlerts));
  }

  const allAlerts = [];
  
  // 1. Coupon alerts
  lowCoupons.forEach(c => {
    const alertId = `coupon-stock-${c.code}`;
    const isRead = readAlerts.includes(alertId);
    allAlerts.push({
      id: alertId,
      type: 'coupon',
      title: c.stock === 0 ? 'Promo Code Exhausted' : 'Low Promo Code Stock',
      message: c.stock === 0
        ? `Promo code "${c.code}" (${c.value}% Off) has been completely claimed by customers.`
        : `Promo code "${c.code}" (${c.value}% Off) has only ${c.stock} remaining uses left in pool.`,
      targetTab: 'coupons',
      actionLabel: 'Manage Coupon',
      time: 'Just now',
      timestamp: Date.now() - 3600000,
      unread: !isRead,
      severity: c.stock === 0 ? 'high' : 'medium'
    });
  });

  // 2. Stock alerts
  lowStock.forEach(p => {
    const alertId = `stock-${p.id || p.sku}`;
    const isRead = readAlerts.includes(alertId);
    const isOut = (p.stock || 0) === 0;
    allAlerts.push({
      id: alertId,
      type: 'stock',
      title: isOut ? 'Out of Stock Warning' : 'Low Inventory Alert',
      message: isOut
        ? `Product "${p.name}" (SKU: ${p.sku || p.id}) is out of stock! Restock immediately to prevent lost sales.`
        : `Product "${p.name}" is down to ${p.stock} units (Threshold is ${p.threshold || 5}).`,
      targetTab: 'inventory',
      targetId: p.id,
      actionLabel: 'Restock Product',
      time: 'Today',
      timestamp: Date.now() - 7200000,
      unread: !isRead,
      severity: isOut ? 'high' : 'medium'
    });
  });

  // 3. Order alerts
  pendingOrders.forEach(o => {
    const alertId = `order-${o.id}`;
    const isRead = readAlerts.includes(alertId);
    allAlerts.push({
      id: alertId,
      type: 'order',
      title: 'New Customer Purchase',
      message: `Order #${o.id} awaiting fulfillment for ${o.customerName || 'Customer'} (${o.itemsCount || 1} items).`,
      targetTab: 'orders',
      targetId: o.id,
      actionLabel: 'View Order Details',
      time: o.date || 'Today',
      timestamp: Date.now() - 1800000,
      unread: !isRead,
      severity: 'medium'
    });
  });

  // 4. System notices
  const systemNotices = [
    {
      id: 'sys-backup-ok',
      type: 'system',
      title: 'Database Auto-Synchronized',
      message: 'Local database snapshot verified. Products, orders, categories and settings are in sync.',
      targetTab: 'settings',
      actionLabel: 'Check Settings',
      time: 'Today',
      timestamp: Date.now() - 86400000,
      unread: !readAlerts.includes('sys-backup-ok'),
      severity: 'low'
    }
  ];
  allAlerts.push(...systemNotices);

  // Filter alerts
  let filtered = allAlerts.filter(a => {
    if (notifTypeFilter === 'unread' && !a.unread) return false;
    if (notifTypeFilter === 'order' && a.type !== 'order') return false;
    if (notifTypeFilter === 'stock' && a.type !== 'stock') return false;
    if (notifTypeFilter === 'coupon' && a.type !== 'coupon') return false;
    if (notifTypeFilter === 'system' && a.type !== 'system') return false;
    return true;
  });

  // KPIs
  const totalCount = allAlerts.length;
  const unreadCount = allAlerts.filter(a => a.unread).length;
  const orderAlertsCount = allAlerts.filter(a => a.type === 'order').length;
  const stockAlertsCount = allAlerts.filter(a => a.type === 'stock').length;

  const getTypeBadge = (type) => {
    switch(type) {
      case 'order': return { icon: '📦', label: 'Order Pipeline', bg: '#e0f2fe', color: '#0369a1' };
      case 'stock': return { icon: '⚠️', label: 'Inventory Warning', bg: '#fef3c7', color: '#92400e' };
      case 'coupon': return { icon: '🎟️', label: 'Marketing Promo', bg: '#ede9fe', color: '#6d28d9' };
      case 'system': default: return { icon: '⚙️', label: 'System Notice', bg: '#f1f5f9', color: '#475569' };
    }
  };

  return `
    <style>
      .notif-kpi-grid {
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
      .notif-toolbar {
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 16px;
        padding: 14px 18px;
        margin-bottom: 20px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
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
      .notif-card-item {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 16px;
        padding: 18px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
      }
      .notif-card-item:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
      }
      .notif-card-item.unread {
        border-left: 4px solid #0052cc;
        background: #ffffff;
      }
      .unread-pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #0052cc;
        display: inline-block;
        box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.2);
      }
    </style>

    <!-- 1. Notification KPIs -->
    <div class="notif-kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(0, 82, 204, 0.1); color: #0052cc;">🔔</div>
        <div>
          <span class="kpi-title">Total Alerts</span>
          <span class="kpi-val">${totalCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">🔴</div>
        <div>
          <span class="kpi-title">Unread Notifications</span>
          <span class="kpi-val" style="color: #ef4444;">${unreadCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(14, 165, 233, 0.1); color: #0284c7;">📦</div>
        <div>
          <span class="kpi-title">Order Alerts</span>
          <span class="kpi-val" style="color: #0284c7;">${orderAlertsCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(245, 158, 11, 0.12); color: #d97706;">⚠️</div>
        <div>
          <span class="kpi-title">Stock Warnings</span>
          <span class="kpi-val" style="color: #d97706;">${stockAlertsCount}</span>
        </div>
    <!-- Web Push Broadcast Card for Admin -->
    <div class="glass-panel" style="padding: 20px; border-radius: 16px; margin-bottom: 20px; background: linear-gradient(135deg, rgba(0,82,204,0.05) 0%, rgba(0,180,216,0.05) 100%); border: 1.5px solid rgba(0,82,204,0.15);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-size:24px;">📢</div>
          <div>
            <h3 style="margin:0; font-size:15px; font-weight:850; color:#0f172a;">Broadcast Customer Web Push Notification</h3>
            <p style="margin:2px 0 0 0; font-size:12px; color:#64748b;">Sends background push notifications to ALL subscribed customer devices (works even when site is closed!).</p>
          </div>
        </div>
        <button id="adminSendPushBroadcastBtn" class="admin-btn admin-btn-primary" style="padding:8px 16px; font-size:12.5px; font-weight:800; display:flex; align-items:center; gap:6px; cursor:pointer;">
          <span>🚀 Send Push Broadcast</span>
        </button>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 2fr; gap:12px;">
        <input type="text" id="adminPushTitle" placeholder="Notification Title (e.g. 🔥 FLASH SALE - 20% OFF!)" value="🔥 FLASH SALE - 20% OFF ALL ITEMS!" style="padding:10px 14px; border-radius:10px; border:1px solid #cbd5e1; font-size:13px; font-weight:600;">
        <input type="text" id="adminPushBody" placeholder="Message Body (e.g. Use code FLASH20 at checkout today only.)" value="Use code FLASH20 at checkout today to claim your discount!" style="padding:10px 14px; border-radius:10px; border:1px solid #cbd5e1; font-size:13px; font-weight:600;">
      </div>
    </div>

    <!-- 2. Status Pill Filters -->
    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px;">
      <button class="status-pill-btn ${notifTypeFilter === 'All' ? 'active' : ''}" data-type="All">
        <span>All Alerts</span>
        <span class="badge-count">${totalCount}</span>
      </button>
      <button class="status-pill-btn ${notifTypeFilter === 'unread' ? 'active' : ''}" data-type="unread">
        <span>🔴 Unread Only</span>
        <span class="badge-count">${unreadCount}</span>
      </button>
      <button class="status-pill-btn ${notifTypeFilter === 'order' ? 'active' : ''}" data-type="order">
        <span>📦 Orders</span>
        <span class="badge-count">${orderAlertsCount}</span>
      </button>
      <button class="status-pill-btn ${notifTypeFilter === 'stock' ? 'active' : ''}" data-type="stock">
        <span>⚠️ Inventory</span>
        <span class="badge-count">${stockAlertsCount}</span>
      </button>
      <button class="status-pill-btn ${notifTypeFilter === 'coupon' ? 'active' : ''}" data-type="coupon">
        <span>🎟️ Coupons</span>
        <span class="badge-count">${allAlerts.filter(a => a.type === 'coupon').length}</span>
      </button>
    </div>

    <!-- 3. Toolbar -->
    <div class="notif-toolbar">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:13px; font-weight:750; color:#0f172a;">⚡ Notification Actions:</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <button class="admin-btn admin-btn-secondary" id="mark-all-read-btn" style="font-size:12px; padding:6px 14px; font-weight:750;">
          ✓ Mark All as Read
        </button>
        <button class="admin-btn admin-btn-secondary" id="goto-notif-rules-btn" style="font-size:12px; padding:6px 14px; font-weight:750;">
          ⚙️ Notification Rules
        </button>
      </div>
    </div>

    <!-- 4. Notifications Feed List -->
    <div style="display:flex; flex-direction:column; gap:12px;">
      ${filtered.length === 0 ? `
        <div class="glass-panel" style="padding:48px 20px; text-align:center; color:#94a3b8; border-radius:16px; background:rgba(255,255,255,0.85);">
          <div style="font-size:36px; margin-bottom:8px;">🎉</div>
          <strong style="font-size:15px; color:#475569; display:block;">No notifications in this filter</strong>
          <span style="font-size:13px;">Everything is running smoothly!</span>
        </div>
      ` : filtered.map(a => {
        const badge = getTypeBadge(a.type);

        return `
          <div class="notif-card-item ${a.unread ? 'unread' : ''}">
            <div style="display:flex; align-items:flex-start; gap:14px; flex:1;">
              <div class="kpi-icon-box" style="width:42px; height:42px; font-size:18px; background:${badge.bg}; color:${badge.color};">
                ${badge.icon}
              </div>
              
              <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <span style="font-size:11px; font-weight:800; background:${badge.bg}; color:${badge.color}; padding:2px 8px; border-radius:6px; text-transform:uppercase;">
                    ${badge.label}
                  </span>
                  <strong style="font-size:14px; color:#0f172a;">${a.title}</strong>
                  ${a.unread ? `<span class="unread-pulse-dot" title="Unread Alert"></span>` : ''}
                  <small style="color:#94a3b8; font-size:11.5px; margin-left:auto; font-weight:600;">${a.time}</small>
                </div>
                
                <p style="margin:0; font-size:13px; color:#334155; line-height:1.4;">${a.message}</p>
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
              <button class="notif-action-jump-btn admin-btn admin-btn-primary" data-tab="${a.targetTab}" data-id="${a.id}" data-target-id="${a.targetId || ''}" style="padding:6px 14px; font-size:12px; font-weight:800;">
                ${a.actionLabel} &rarr;
              </button>
              <button class="toggle-read-btn" data-id="${a.id}" style="background:transparent; border:none; color:#64748b; font-size:12px; font-weight:700; cursor:pointer; padding:6px 8px;" title="${a.unread ? 'Mark as Read' : 'Mark as Unread'}">
                ${a.unread ? 'Mark Read' : 'Unread'}
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function attachAdminNotificationsListeners(context, shadow) {
  // Status Pill Filters
  shadow.querySelectorAll('.status-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      notifTypeFilter = btn.getAttribute('data-type');
      context.render();
      context.attachListeners();
    });
  });

  // Mark all as read
  const markAllBtn = shadow.getElementById('mark-all-read-btn');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', () => {
      const lowStock = (context.products || []).filter(p => p.stock !== undefined && p.stock <= (p.threshold || 5));
      const pendingOrders = (context.orders || []).filter(o => o.status === 'Pending' || o.status === 'En cours' || o.status === 'Traitement');
      const lowCoupons = (context.coupons || []).filter(c => c.stock !== undefined && c.stock <= 2);
      
      const allIds = [
        'sys-backup-ok',
        ...lowCoupons.map(c => `coupon-stock-${c.code}`),
        ...lowStock.map(p => `stock-${p.id || p.sku}`),
        ...pendingOrders.map(o => `order-${o.id}`)
      ];

      sessionStorage.setItem('SWEETOS_admin_read_alerts', JSON.stringify(allIds));
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'All notifications marked as read!' }));
      context.render();
      context.attachListeners();
    });
  }

  // Toggle single alert read/unread
  shadow.querySelectorAll('.toggle-read-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      let readAlerts = [];
      try {
        readAlerts = JSON.parse(sessionStorage.getItem('SWEETOS_admin_read_alerts') || '[]');
      } catch(e) {}

      if (readAlerts.includes(id)) {
        readAlerts = readAlerts.filter(item => item !== id);
      } else {
        readAlerts.push(id);
      }

      sessionStorage.setItem('SWEETOS_admin_read_alerts', JSON.stringify(readAlerts));
      context.render();
      context.attachListeners();
    });
  });

  // Jump Action Button
  shadow.querySelectorAll('.notif-action-jump-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      const alertId = btn.getAttribute('data-id');
      const targetId = btn.getAttribute('data-target-id');

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
        context.render();
        context.attachListeners();
      }
    });
  });

  // Notification Rules button (redirect to Settings > Notification Rules)
  const rulesBtn = shadow.getElementById('goto-notif-rules-btn');
  if (rulesBtn) {
    rulesBtn.addEventListener('click', () => {
      context.currentTab = 'settings';
      context.settingsSubTab = 'notifications';
      sessionStorage.setItem('SWEETOS_admin_current_tab', 'settings');
      context.render();
      context.attachListeners();
    });
  }

  // Web Push Broadcast Action
  const broadcastBtn = shadow.getElementById('adminSendPushBroadcastBtn');
  if (broadcastBtn) {
    broadcastBtn.addEventListener('click', async () => {
      const titleInput = shadow.getElementById('adminPushTitle');
      const bodyInput = shadow.getElementById('adminPushBody');
      const title = (titleInput?.value || '').trim();
      const body = (bodyInput?.value || '').trim();

      if (!title || !body) {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: '⚠️ Please enter a title and message body.' }));
        return;
      }

      broadcastBtn.disabled = true;
      broadcastBtn.innerHTML = `<span>⏳ Sending Push...</span>`;

      try {
        const { showLocalNotification } = await import('../../utils/pushNotifications.js');
        await showLocalNotification(title, {
          body,
          tag: 'admin-broadcast',
          data: { url: '/#/' }
        });

        // Add to notification feed
        const notifFeed = JSON.parse(sessionStorage.getItem('SWEETOS_notifications') || '[]');
        notifFeed.unshift({
          id: `broadcast-${Date.now()}`,
          title: `📢 ${title}`,
          desc: body,
          category: 'promos',
          unread: true,
          createdAt: Date.now()
        });
        sessionStorage.setItem('SWEETOS_notifications', JSON.stringify(notifFeed));
        window.dispatchEvent(new CustomEvent('notifications:updated'));

        window.dispatchEvent(new CustomEvent('toast:show', { detail: '🚀 Web Push Broadcast sent to all customer devices!' }));
      } catch(err) {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `⚠️ Push broadcast error: ${err.message}` }));
      } finally {
        broadcastBtn.disabled = false;
        broadcastBtn.innerHTML = `<span>🚀 Send Push Broadcast</span>`;
      }
    });
  }
}
