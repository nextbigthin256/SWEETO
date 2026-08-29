// components/Notifications/NotificationDrawer.styles.js
// Constructable Stylesheet CSS string for NotificationDrawer Web Component

export const notificationDrawerCSS = `
.notifications-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
}

.notifications-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.notifications-header h3 {
  font-size: 17px;
  font-weight: 750;
  color: var(--text-dark);
  margin: 0;
}

.unread-count {
  color: #2563eb;
}

.notif-close {
  width: 32px;
  height: 32px;
  border: 1.5px solid var(--border);
  background: white;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: var(--text-gray);
  transition: all 0.2s ease;
}

.notif-close:hover {
  background: #fdf0f0;
  border-color: #ff5630;
  color: #ff5630;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 0;
  color: var(--text-light);
}

.empty-bell {
  font-size: 44px;
  margin-bottom: 14px;
  animation: floatHeart 3s ease-in-out infinite;
  user-select: none;
}

@keyframes floatHeart {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.empty-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-gray);
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 12px;
  line-height: 1.5;
}

/* List items */
.notifications-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 20px;
  padding-right: 4px;
}

/* Custom Scrollbar for Notifications List */
.notifications-list::-webkit-scrollbar {
  width: 4px;
}

.notifications-list::-webkit-scrollbar-thumb {
  background: rgba(0, 82, 204, 0.1);
  border-radius: 4px;
}

.notif-item {
  position: relative;
  padding: 14px;
  border-radius: 12px;
  background: white;
  border: 1.5px solid var(--border);
  display: flex;
  gap: 12px;
  align-items: flex-start;
  cursor: pointer;
  transition: all 0.2s ease;
}

.notif-item.unread-flag {
  border-color: rgba(37, 99, 235, 0.15);
  background: rgba(239, 246, 255, 0.15);
}

.notif-item.unread-flag::before {
  content: "";
  position: absolute;
  left: -1px;
  top: 12px;
  bottom: 12px;
  width: 3px;
  background: #2563eb;
  border-radius: 3px;
}

.notif-item:hover {
  transform: translateX(2px);
  box-shadow: 0 4px 10px rgba(0, 82, 204, 0.02);
}

.notif-icon-circle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}

.notif-icon-circle.promo {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.notif-icon-circle.shipping {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.notif-icon-circle.system {
  background: #fef2f2;
  border: 1px solid #fee2e2;
}

.notif-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notif-title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.notif-title-row h4 {
  font-size: 13px;
  font-weight: 750;
  color: var(--text-dark);
  margin: 0;
}

.notif-time {
  font-size: 10px;
  color: var(--text-light);
  font-weight: 550;
}

.notif-desc {
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--text-gray);
  margin: 0;
}

.notif-delete-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--text-light);
  cursor: pointer;
  transition: color 0.15s;
  line-height: 1;
  align-self: flex-start;
  padding: 0 2px;
}

.notif-delete-btn:hover {
  color: var(--red);
}

/* Footer Actions */
.notifications-footer {
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.clear-all-btn {
  width: 100%;
  height: 42px;
  background: white;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 750;
  color: var(--text-gray);
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-all-btn:hover {
  background: #fee2e2;
  color: var(--red);
  border-color: #fca5a5;
}

:host {
  display: block;
  height: 100%;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.drawer-swipe-handle {
  display: none;
}

@media (max-width: 968px) {
  .drawer-swipe-handle {
    display: block;
    width: 44px;
    height: 5px;
    background: #cbd5e1;
    border-radius: 9999px;
    margin: 0 auto 12px auto;
    flex-shrink: 0;
  }
}

@media (max-width: 600px) {
  .notifications-wrapper {
    padding: 16px 14px;
  }
  .notifications-header h3 {
    font-size: 15px;
  }
  .notif-item {
    padding: 12px 10px;
    gap: 10px;
  }
  .notif-icon-circle {
    width: 30px;
    height: 30px;
    font-size: 13px;
  }
  .notif-title-row h4 {
    font-size: 12.5px;
  }
  .notif-desc {
    font-size: 11px;
  }
}
`;
