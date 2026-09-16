export const checkoutModalCSS = `/* ==========================================================================
   SWEETOS MODERN ADVANCED CHECKOUT STYLES
   ========================================================================== */

:host {
  display: block;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0f172a;
}

.modal-overlay {
  position: fixed;
  top: 60px;
  left: var(--sidebar-width, 260px);
  width: calc(100vw - var(--sidebar-width, 260px));
  height: calc(100vh - 60px);
  background: radial-gradient(circle at 10% 20%, rgba(0, 82, 204, 0.03) 0%, rgba(248, 250, 252, 0.95) 90%), #f8fafc;
  z-index: 95;
  opacity: 0;
  pointer-events: none;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), left 0.35s ease, width 0.35s ease;
  padding: 32px 24px 60px 24px;
  overflow-y: auto;
  box-sizing: border-box;
}

.modal-overlay.sidebar-collapsed {
  left: var(--sidebar-collapsed-width, 78px);
  width: calc(100vw - var(--sidebar-collapsed-width, 78px));
}

@media (max-width: 968px) {
  .modal-overlay,
  .modal-overlay.sidebar-collapsed {
    left: 0;
    width: 100vw;
    top: 56px;
    height: calc(100vh - 56px);
    padding: 16px 12px 48px 12px;
  }
}

.modal-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.modal-container {
  width: 100%;
  max-width: 1160px;
  position: relative;
  transform: translateY(16px);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  margin: 0 auto;
}

.modal-overlay.open .modal-container {
  transform: translateY(0);
}

/* Header bar */
.checkout-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 18px;
  padding: 14px 20px;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
}

.checkout-brand-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}

.checkout-brand-badge .icon-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0052cc 0%, #00b4d8 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 4px 12px rgba(0, 82, 204, 0.25);
}

.checkout-brand-badge h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 850;
  color: #0f172a;
  letter-spacing: -0.3px;
}

.checkout-brand-badge span {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.btn-retour-panier {
  background: white;
  border: 1.5px solid #e2e8f0;
  color: #475569;
  font-size: 13px;
  font-weight: 750;
  padding: 8px 16px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.btn-retour-panier:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #0f172a;
  transform: translateX(-2px);
}

/* Stepper Bar */
.checkout-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 18px;
  padding: 14px 28px;
  margin-bottom: 24px;
  backdrop-filter: blur(12px);
  position: relative;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 2;
}

.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f1f5f9;
  border: 2px solid #e2e8f0;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 850;
  transition: all 0.25s ease;
}

.step-item.active .step-circle {
  background: #0052cc;
  border-color: #0052cc;
  color: white;
  box-shadow: 0 4px 14px rgba(0, 82, 204, 0.35);
}

.step-item.completed .step-circle {
  background: #10b981;
  border-color: #10b981;
  color: white;
}

.step-label {
  display: flex;
  flex-direction: column;
}

.step-label .step-title {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}

.step-label .step-sub {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.stepper-connector {
  flex: 1;
  height: 2px;
  background: #e2e8f0;
  margin: 0 16px;
  position: relative;
}

.stepper-connector.active {
  background: #0052cc;
}

/* Grid layout */
.checkout-layout-grid {
  display: grid;
  grid-template-columns: 1.45fr 1fr;
  gap: 28px;
  align-items: start;
}

.checkout-layout-grid.success-layout {
  grid-template-columns: 1fr;
  max-width: 680px;
  margin: 0 auto;
}

@media (max-width: 900px) {
  .checkout-layout-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

/* Main Form Card */
.checkout-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
  backdrop-filter: blur(12px);
}

@media (max-width: 600px) {
  .checkout-card {
    padding: 20px 16px;
  }
}

.section-block {
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1.5px solid #f1f5f9;
}

.section-block:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.section-title-row .section-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(0, 82, 204, 0.08);
  color: #0052cc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.section-title-row h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 850;
  color: #0f172a;
}

/* Form Fields */
.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

@media (max-width: 600px) {
  .form-grid-2 {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  font-size: 12.5px;
  font-weight: 750;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  font-size: 13.5px;
  font-family: inherit;
  color: #0f172a;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #0052cc;
  box-shadow: 0 0 0 3.5px rgba(0, 82, 204, 0.12);
  background: white;
}

.form-help-text {
  font-size: 11.5px;
  color: #64748b;
  font-weight: 550;
}

/* Payment Methods Grid */
.payment-methods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.payment-method-card {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.payment-method-card:hover {
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.04);
}

.payment-method-card.active {
  border-color: #0052cc;
  background: #f0f7ff;
  box-shadow: 0 6px 20px rgba(0, 82, 204, 0.12);
}

.payment-method-card .method-logo-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.25s ease;
}

.payment-method-card:hover .method-logo-wrap {
  transform: scale(1.06);
}

.payment-method-card .method-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.payment-method-card .method-logo-img.cod-logo-img {
  object-fit: contain;
  padding: 6px;
}

.payment-method-card .card-logo-wrap {
  background: #f1f5f9;
}

.payment-method-card .method-icon {
  font-size: 26px;
}

.payment-method-card .method-name {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}

.payment-method-card .method-desc {
  font-size: 10.5px;
  color: #64748b;
  font-weight: 600;
}

.payment-method-card.active .method-name {
  color: #0052cc;
}

/* Payment Notice / Dynamic Panels */
.payment-notice-panel {
  margin-top: 16px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1.5px solid #e2e8f0;
  display: flex;
  gap: 14px;
  align-items: center;
  animation: fadeIn 0.25s ease;
}

.notice-logo-img {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.notice-logo-img.cod-notice-img {
  object-fit: contain;
  background: white;
  padding: 4px;
}

.payment-notice-panel.wave-bg {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.payment-notice-panel.orange-bg {
  background: #fff7ed;
  border-color: #fed7aa;
}

.payment-notice-panel.mtn-bg {
  background: #fefce8;
  border-color: #fef08a;
}

.payment-notice-panel.cod-bg {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

/* Submit Button */
.checkout-submit-btn {
  width: 100%;
  background: linear-gradient(135deg, #0052cc 0%, #0040a3 100%);
  color: white;
  border: none;
  padding: 16px 24px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 850;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 8px 24px rgba(0, 82, 204, 0.28);
  transition: all 0.25s ease;
  margin-top: 20px;
}

.checkout-submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(0, 82, 204, 0.38);
}

.checkout-submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* Order Summary Column */
.summary-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 24px;
  padding: 28px 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 90px;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 14px;
  border-bottom: 1.5px solid #f1f5f9;
}

.summary-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 850;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-badge {
  font-size: 11.5px;
  font-weight: 800;
  color: #0052cc;
  background: rgba(0, 82, 204, 0.08);
  padding: 4px 10px;
  border-radius: 20px;
}

/* Items List */
.summary-items-list {
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
  padding-right: 4px;
}

.summary-item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
}

.summary-item-card img {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  object-fit: cover;
  background: white;
  border: 1px solid #e2e8f0;
}

.summary-item-info {
  flex: 1;
  min-width: 0;
}

.summary-item-info h4 {
  margin: 0 0 3px 0;
  font-size: 13px;
  font-weight: 750;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary-item-info .item-meta {
  font-size: 11.5px;
  color: #64748b;
  font-weight: 600;
}

.summary-item-price {
  font-size: 13.5px;
  font-weight: 850;
  color: #0f172a;
}

/* Coupon input box */
.checkout-coupon-box {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.checkout-coupon-box input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  font-size: 12.5px;
  outline: none;
  font-weight: 700;
  text-transform: uppercase;
}

.checkout-coupon-box button {
  background: #0f172a;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.checkout-coupon-box button:hover {
  background: #0052cc;
}

/* Breakdown pricing */
.pricing-breakdown {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 14px;
  border-top: 1.5px solid #f1f5f9;
  margin-bottom: 20px;
}

.pricing-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
}

.pricing-row.total-row {
  font-size: 16px;
  font-weight: 850;
  color: #0f172a;
  padding-top: 10px;
  border-top: 1.5px dashed #cbd5e1;
}

.pricing-row.total-row .total-amount {
  font-size: 20px;
  color: #0052cc;
  font-weight: 900;
}

/* Trust badges */
.trust-badges-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
}

.trust-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  padding: 10px;
  border-radius: 10px;
  font-size: 11px;
  color: #475569;
  font-weight: 700;
}

/* Success Screen */
.success-screen {
  text-align: center;
  padding: 32px 16px;
}

.success-check-badge {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  margin: 0 auto 20px auto;
  box-shadow: 0 10px 30px rgba(16, 185, 129, 0.35);
  animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.success-screen h1 {
  font-size: 26px;
  font-weight: 900;
  color: #0f172a;
  margin: 0 0 8px 0;
}

.success-screen .order-code-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f1f5f9;
  border: 1.5px dashed #cbd5e1;
  padding: 8px 18px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 850;
  color: #0052cc;
  margin: 14px 0 24px 0;
}

.order-timeline-stepper {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin: 28px 0;
  text-align: center;
}

@media (max-width: 600px) {
  .order-timeline-stepper {
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
}

.timeline-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.timeline-step .t-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f1f5f9;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
}

.timeline-step.active .t-circle {
  background: #10b981;
  color: white;
}

.timeline-step .t-title {
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
}

.timeline-step .t-sub {
  font-size: 10.5px;
  color: #64748b;
}

.success-actions-row {
  display: flex;
  gap: 14px;
  justify-content: center;
  margin-top: 28px;
  flex-wrap: wrap;
}

.success-actions-row button {
  padding: 13px 24px;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes bounceIn {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); opacity: 1; }
}

.animate-in {
  animation: fadeIn 0.3s ease;
}

.custom-scroll::-webkit-scrollbar {
  width: 5px;
}

.custom-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
`;
export default checkoutModalCSS;
