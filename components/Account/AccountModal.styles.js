export const accountModalCSS = `.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(16, 42, 67, 0.25);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 1250;
  opacity: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s ease;
  padding: 24px;
}

.modal-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.modal-container {
  width: 100%;
  max-width: 800px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 24px;
  box-shadow: 0 30px 70px rgba(0, 82, 204, 0.15);
  overflow: hidden;
  position: relative;
  transform: translateY(30px) scale(0.98);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  padding: 40px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-overlay.open .modal-container {
  transform: translateY(0) scale(1);
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 82, 204, 0.05);
  border: none;
  color: #486581;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;
}

.close-btn:hover {
  background: rgba(255, 86, 48, 0.1);
  color: #ff5630;
}

/* Profile Two-Column Layout */
.profile-layout {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 40px;
  margin-top: 10px;
}

/* User Card Panel */
.user-card-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 1px solid rgba(0, 82, 204, 0.08);
  padding-right: 40px;
}

.avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(0, 82, 204, 0.05);
  border: 1px solid rgba(0, 82, 204, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(0, 82, 204, 0.05);
  margin-bottom: 20px;
}

.user-fullname {
  font-size: 1.4rem;
  color: #102a43;
  font-weight: 750;
  margin-bottom: 6px;
}

.user-membership {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #0052cc;
  background: rgba(0, 82, 204, 0.06);
  padding: 4px 12px;
  border-radius: 20px;
  margin-bottom: 30px;
  letter-spacing: 0.5px;
}

.user-meta-details {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 30px;
}

.meta-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-row .label {
  font-size: 0.75rem;
  color: #627d98;
  font-weight: 600;
  text-transform: uppercase;
}

.meta-row .value {
  font-size: 0.9rem;
  color: #102a43;
  font-weight: 600;
}

.logout-btn {
  width: 100%;
  background: rgba(255, 86, 48, 0.06);
  border: 1px solid rgba(255, 86, 48, 0.15);
  color: #ff5630;
  padding: 12px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  margin-top: auto;
  cursor: pointer;
}

.logout-btn:hover {
  background: #ff5630;
  color: white;
  border-color: #ff5630;
  box-shadow: 0 4px 15px rgba(255, 86, 48, 0.2);
}

/* Orders Panel */
.orders-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-title {
  font-size: 1.15rem;
  color: #102a43;
  font-weight: 750;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-item {
  background: white;
  border-radius: 16px;
  padding: 18px;
  border: 1px solid rgba(0, 82, 204, 0.04);
  box-shadow: 0 4px 15px rgba(0, 82, 204, 0.02);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-id {
  font-weight: 700;
  font-size: 0.95rem;
  color: #102a43;
}

.order-status {
  font-size: 0.72rem;
  font-weight: 750;
  padding: 3px 8px;
  border-radius: 8px;
  text-transform: uppercase;
  display: inline-block;
}

.order-status.pending {
  background: rgba(255, 171, 0, 0.08);
  color: #ffab00;
}

.order-status.processing {
  background: rgba(0, 82, 204, 0.08);
  color: #0052cc;
}

.order-status.shipping {
  background: rgba(94, 53, 177, 0.08);
  color: #5e35b1;
}

.order-status.delivered {
  background: rgba(54, 179, 126, 0.08);
  color: #36b37e;
}

.order-status.cancelled {
  background: rgba(255, 86, 48, 0.08);
  color: #ff5630;
}

.order-details-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.88rem;
}

.order-product {
  color: #486581;
  font-weight: 550;
}

.order-price {
  color: #102a43;
  font-weight: 750;
}

.order-date {
  font-size: 0.75rem;
  color: #627d98;
}

/* Responsive details */
@media (max-width: 768px) {
  .profile-layout {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  .user-card-panel {
    border-right: none;
    border-bottom: 1px solid rgba(0, 82, 204, 0.08);
    padding-right: 0;
    padding-bottom: 30px;
  }
}
`;
export default accountModalCSS;
