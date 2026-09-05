// components/ProductCard/ProductCard.styles.js
// Constructable Stylesheet CSS string for ProductCard Web Component

export const productCardCSS = `
.card {
  background: white;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}

@media (min-width: 600px) {
  .card {
    border-radius: 16px;
  }
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  border-color: #2563eb;
}

.image-wrapper {
  position: relative;
  overflow: hidden;
  width: 100%;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-image {
  width: 100%;
  height: 130px;
  object-fit: cover;
  display: block;
  padding: 0;
  box-sizing: border-box;
  transition: transform 0.35s ease;
}

@media (min-width: 600px) {
  .card-image {
    height: 180px;
  }
}

.card:hover .card-image {
  transform: scale(1.04);
}

.discount-badge {
  display: none !important;
}

.heart-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.8);
  width: 44px;
  height: 44px;
  background: #2563eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.3s ease;
  cursor: pointer;
  border: none;
  z-index: 5;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

@media (min-width: 600px) {
  .heart-btn {
    width: 56px;
    height: 56px;
  }
}

.card:hover .heart-btn {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.heart-btn.active {
  opacity: 1 !important;
  transform: translate(-50%, -50%) scale(1) !important;
}

.heart-btn svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: white;
  stroke-width: 2.5;
  transition: all 0.2s ease;
}

@media (min-width: 600px) {
  .heart-btn svg {
    width: 28px;
    height: 28px;
  }
}

.heart-btn.active svg {
  fill: white;
}

.overlay-side-actions {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  gap: 6px;
  opacity: 1;
  transition: opacity 0.25s ease;
  z-index: 4;
}

.card:hover .overlay-side-actions {
  opacity: 1;
}

.action-btn-mini {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(6px);
  border: 1px solid #e2e8f0;
  color: #2563eb;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn-mini:hover {
  background: #2563eb;
  color: white;
  transform: scale(1.1);
}

.category-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid #e2e8f0;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 750;
  color: #2563eb;
  z-index: 3;
}

.category-badge.out-of-stock {
  background: #fff1f2;
  color: #e11d48;
  border-color: #fecdd3;
}

.status-badge-container {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 3;
}

.status-badge {
  font-size: 9.5px;
  font-weight: 850;
  padding: 3px 7px;
  border-radius: 8px;
  color: white;
  line-height: 1;
}

.status-badge.hot-deal { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
.status-badge.bestseller { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
.status-badge.new { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }

.card-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

@media (min-width: 600px) {
  .card-content {
    padding: 16px;
  }
}

.category-name {
  font-size: 11px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 600px) {
  .category-name {
    font-size: 13px;
  }
}

.product-title {
  font-size: 10px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 8px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 26px;
  cursor: pointer;
  transition: color 0.2s ease;
}

@media (min-width: 600px) {
  .product-title {
    font-size: 12px;
    min-height: 32px;
  }
}

.product-title:hover {
  color: #2563eb;
}

.divider {
  display: none;
}

.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
}

.price-info {
  flex: 1;
  min-width: 0;
}

.current-price {
  font-size: 13px;
  font-weight: 800;
  color: #ef4444;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 600px) {
  .current-price {
    font-size: 16px;
  }
}

.old-price-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.old-price {
  font-size: 10px;
  color: #d1d5db;
  text-decoration: line-through;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 600px) {
  .old-price {
    font-size: 13px;
  }
}

.add-btn {
  width: 36px;
  height: 36px;
  background: #2563eb;
  border: none;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  color: white;
}

@media (min-width: 600px) {
  .add-btn {
    width: 44px;
    height: 44px;
    border-radius: 12px;
  }
}

.add-btn:hover {
  background: #1d4ed8;
  transform: scale(1.08);
}

.add-btn:active {
  transform: scale(0.96);
}

.add-btn-text {
  display: none;
}

.add-btn-icon {
  font-size: 20px;
  font-weight: bold;
  line-height: 1;
}
`;
