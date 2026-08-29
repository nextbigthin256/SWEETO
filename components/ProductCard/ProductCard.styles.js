// components/ProductCard/ProductCard.styles.js
// Constructable Stylesheet CSS string for ProductCard Web Component

export const productCardCSS = `
.card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03);
  border: 1.5px solid #e2e8f0;
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 30px rgba(37, 99, 235, 0.12);
  border-color: #2563eb;
}

.image-wrapper {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 200px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  padding: 0;
  box-sizing: border-box;
  transition: transform 0.35s ease;
}

.card:hover .card-image {
  transform: scale(1.06);
}

.heart-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.8);
  width: 60px;
  height: 60px;
  background: #2563eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
  border: none;
  z-index: 5;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
}

.card:hover .heart-btn {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.heart-btn:hover {
  background: #1d4ed8;
  transform: translate(-50%, -50%) scale(1.08);
}

.heart-btn svg {
  width: 28px;
  height: 28px;
  fill: none;
  stroke: white;
  stroke-width: 2.5;
  transition: all 0.2s ease;
}

.heart-btn.active svg {
  fill: white;
}

.overlay-side-actions {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
  opacity: 0;
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
  width: 32px;
  height: 32px;
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
  top: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid #e2e8f0;
  padding: 3px 9px;
  border-radius: 8px;
  font-size: 11px;
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
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 3;
}

.status-badge {
  font-size: 10px;
  font-weight: 850;
  padding: 3px 8px;
  border-radius: 8px;
  color: white;
  line-height: 1;
}

.status-badge.hot-deal { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
.status-badge.bestseller { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
.status-badge.new { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }

.card-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.category-name {
  font-size: 12.5px;
  font-weight: 400;
  color: #2563eb;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.product-title {
  font-size: 16px;
  font-weight: 800;
  color: #111827;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  cursor: pointer;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s ease;
}

.product-title:hover {
  color: #2563eb;
}

.divider {
  height: 1px;
  background-color: #e5e7eb;
  margin-bottom: 12px;
  margin-top: 4px;
}

.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
}

.price-info {
  flex: 1;
}

.current-price {
  font-size: 18px;
  font-weight: 800;
  color: #2563eb;
  margin-bottom: 2px;
}

.old-price-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.old-price {
  font-size: 13px;
  color: #9ca3af;
  text-decoration: line-through;
}

.discount-badge {
  font-size: 11px;
  font-weight: 700;
  color: #ef4444;
  background-color: #fef2f2;
  padding: 2px 6px;
  border-radius: 4px;
}

.add-btn {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: #2563eb;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  transition: background 0.2s ease, transform 0.15s ease;
  flex-shrink: 0;
}

.add-btn:hover {
  background: #1d4ed8;
  transform: scale(1.04);
}

.add-btn:active {
  transform: scale(0.96);
}

.add-btn-text {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.1;
}

.add-btn-icon {
  font-size: 16px;
  font-weight: 800;
  line-height: 1;
}

@media (max-width: 768px) {
  .card {
    border-radius: 12px;
    border-width: 1px;
  }
  .image-wrapper {
    height: 135px !important;
  }
  .heart-btn {
    width: 42px !important;
    height: 42px !important;
  }
  .heart-btn svg {
    width: 20px !important;
    height: 20px !important;
  }
  .card-content {
    padding: 8px 10px 10px 10px !important;
  }
  .category-name {
    font-size: 10.5px !important;
    margin-bottom: 2px !important;
  }
  .product-title {
    font-size: 12.5px !important;
    line-height: 1.25 !important;
    margin-bottom: 4px !important;
    -webkit-line-clamp: 2 !important;
  }
  .divider {
    margin-top: 2px !important;
    margin-bottom: 6px !important;
  }
  .price-row {
    gap: 6px !important;
  }
  .current-price {
    font-size: 14px !important;
    margin-bottom: 1px !important;
  }
  .old-price {
    font-size: 10.5px !important;
  }
  .discount-badge {
    font-size: 9.5px !important;
    padding: 1px 4px !important;
  }
  .add-btn {
    width: 38px !important;
    height: 38px !important;
    border-radius: 9px !important;
  }
  .add-btn-text {
    font-size: 9.5px !important;
  }
  .add-btn-icon {
    font-size: 13px !important;
  }
  .status-badge {
    font-size: 8.5px !important;
    padding: 2px 6px !important;
    border-radius: 6px !important;
  }
}

@media (max-width: 480px) {
  .image-wrapper {
    height: 120px !important;
  }
  .card-content {
    padding: 6px 8px 8px 8px !important;
  }
  .product-title {
    font-size: 12px !important;
  }
  .current-price {
    font-size: 13px !important;
  }
  .add-btn {
    width: 34px !important;
    height: 34px !important;
    border-radius: 8px !important;
  }
  .add-btn-text {
    display: none !important;
  }
  .add-btn-icon {
    font-size: 16px !important;
  }
}
`;
