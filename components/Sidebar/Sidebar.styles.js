// components/Sidebar/Sidebar.styles.js
// Constructable Stylesheet CSS string for Sidebar Web Component

export const sidebarCSS = `
* {
  box-sizing: border-box;
}

.sidebar-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  padding: 56px 12px 16px;
  background: var(--white);
  border-right: 1px solid var(--border);
  position: relative;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-gray);
  text-decoration: none;
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  border: 1px solid transparent;
}

/* Left Indicator Stripe */
.sidebar-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 25%;
  height: 50%;
  width: 3.5px;
  background: var(--primary); /* Primary blue */
  border-radius: 0 4px 4px 0;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.sidebar-item:hover::before,
.sidebar-item.active::before {
  transform: scaleX(1);
}

.sidebar-item:hover {
  background: rgba(255, 255, 255, 0.6);
  border-color: rgba(255, 255, 255, 0.5);
  color: var(--text-dark);
  padding-left: 17px;
  box-shadow: 0 4px 12px rgba(0, 82, 204, 0.02);
}

.sidebar-item.active {
  background: rgba(0, 82, 204, 0.08); /* Primary blue tint */
  border-color: rgba(0, 82, 204, 0.12);
  color: var(--primary);
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(0, 82, 204, 0.04);
}

.sidebar-item svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  transition: transform 0.2s ease, color 0.2s ease;
}

.sidebar-item:hover svg {
  color: var(--primary);
  transform: scale(1.1);
}

.sidebar-item.active svg {
  color: var(--primary);
}

.sidebar-item .hot-badge,
.sidebar-badge {
  margin-left: auto;
  font-size: 11px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  letter-spacing: 0.2px;
  transition: all 0.2s ease;
  line-height: 1;
}

.sidebar-badge.orders-badge {
  background: #eff6ff;
  color: #0052cc;
  border: 1px solid #bfdbfe;
}

.sidebar-badge.orders-badge.in-transit {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
  animation: pulse-green 2s infinite;
}

.sidebar-badge.wishlist-badge {
  background: #fff1f2;
  color: #e11d48;
  border: 1px solid #fecdd3;
}

.sidebar-badge.coupon-badge {
  background: #faf5ff;
  color: #7e22ce;
  border: 1px solid #e9d5ff;
}

.sidebar-badge.hot-badge,
.sidebar-item .hot-badge {
  background: linear-gradient(135deg, #ff4d4f, #f5222d);
  color: white;
  box-shadow: 0 2px 6px rgba(245, 34, 45, 0.3);
}

.sidebar-badge.new-badge {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.sidebar-badge.top-badge {
  background: #fefce8;
  color: #b45309;
  border: 1px solid #fef08a;
}

@keyframes pulse-green {
  0% {
    box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(5, 150, 105, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(5, 150, 105, 0);
  }
}

.sidebar-divider {
  height: 1px;
  background: var(--border);
  margin: 12px 0;
}

/* Sidebar Promo card */
.sidebar-promo {
  margin-top: auto;
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
  border-radius: 14px;
  padding: 16px;
  color: white;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.sidebar-promo:hover {
  transform: translateY(-2px);
}

.sidebar-promo-label {
  font-size: 11px;
  opacity: 0.8;
  margin-bottom: 4px;
  text-transform: uppercase;
  font-weight: 700;
}

.sidebar-promo h3 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 2px;
}

.sidebar-promo p {
  font-size: 12px;
  opacity: 0.85;
  margin-bottom: 10px;
}

.sidebar-promo-btn {
  background: white;
  color: var(--primary);
  border: none;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.sidebar-promo img {
  width: 100%;
  margin-top: 10px;
  border-radius: 8px;
  height: 80px;
  object-fit: cover;
}

/* Sidebar footer help center links */
.sidebar-footer {
  padding: 12px 0 0;
  border-top: 1px solid var(--border);
  margin-top: 12px;
}

.sidebar-footer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 13px;
  color: var(--text-gray);
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.sidebar-footer-item:hover {
  background: #f0f4f8;
}

.sidebar-footer-item svg {
  width: 18px;
  height: 18px;
  color: var(--text-gray);
}

/* ================= COLLAPSIBLE TOGGLER & COLLAPSED OVERRIDES ================= */
.sidebar-collapse-toggle {
  position: absolute;
  top: 12px;
  left: 10px;
  right: 10px;
  height: 36px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1.5px solid rgba(0, 82, 204, 0.14);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  z-index: 100;
  box-shadow: 0 2px 6px rgba(0, 82, 204, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text-dark, #0A2540);
  user-select: none;
  outline: none;
}

.sidebar-collapse-toggle .toggle-text {
  color: var(--text-gray, #64748b);
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: color 0.2s ease;
  white-space: nowrap;
}

.sidebar-collapse-toggle .toggle-icon {
  width: 14px;
  height: 14px;
  stroke: var(--primary, #0052cc);
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.2s ease;
  display: block;
  flex-shrink: 0;
}

.sidebar-collapse-toggle:hover {
  border-color: var(--primary, #0052cc);
  background: #ffffff;
  box-shadow: 0 4px 14px rgba(0, 82, 204, 0.16);
  transform: translateY(-1px);
}

.sidebar-collapse-toggle:hover .toggle-text {
  color: var(--primary, #0052cc);
}

.sidebar-collapse-toggle:active {
  transform: translateY(0);
}

/* Collapsed State Overrides */
.sidebar-wrapper.collapsed {
  padding: 56px 8px 16px;
  overflow: hidden;
}

.sidebar-wrapper.collapsed .sidebar-collapse-toggle {
  left: 10px;
  right: 10px;
  justify-content: center;
  padding: 0;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-color: rgba(0, 82, 204, 0.28);
  box-shadow: 0 2px 10px rgba(0, 82, 204, 0.16);
}

.sidebar-wrapper.collapsed .sidebar-collapse-toggle .toggle-text {
  display: none;
}

.sidebar-wrapper.collapsed .sidebar-collapse-toggle .toggle-icon {
  transform: rotate(180deg);
}

.sidebar-wrapper.collapsed .sidebar-collapse-toggle:hover {
  background: #ffffff;
  transform: scale(1.06);
  box-shadow: 0 4px 16px rgba(0, 82, 204, 0.25);
}

.sidebar-wrapper.collapsed .sidebar-item {
  padding: 12px 0 !important;
  justify-content: center;
  gap: 0;
}

.sidebar-wrapper.collapsed .sidebar-item span,
.sidebar-wrapper.collapsed .sidebar-item .hot-badge,
.sidebar-wrapper.collapsed .sidebar-promo,
.sidebar-wrapper.collapsed .sidebar-footer-item span,
.sidebar-wrapper.collapsed .sidebar-footer-item div,
.sidebar-wrapper.collapsed .sidebar-footer-item svg:last-child {
  display: none !important;
}

.sidebar-wrapper.collapsed .sidebar-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.sidebar-wrapper.collapsed .sidebar-footer-item {
  padding: 8px 0;
  justify-content: center;
  width: 100%;
}
`;
