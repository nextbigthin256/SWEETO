/**
 * ============================================================================
 * SWEETOS - SHARE MODAL WEB COMPONENT (<share-modal>)
 * ============================================================================
 * A modern, responsive share modal web component for WhatsApp Chat, WhatsApp Status,
 * link copy, and native mobile sharing.
 */

import { formatPrice } from '../utils/storage.js';
import { 
  getProductShareUrl, 
  shareToWhatsApp, 
  shareToWhatsAppStatus, 
  copyShareLink, 
  nativeShare 
} from '../utils/share.js';

export class ShareModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._product = null;
    this._isOpen = false;
  }

  static get observedAttributes() {
    return ['open'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      this._isOpen = newValue !== null && newValue !== 'false';
      this.render();
    }
  }

  get product() {
    return this._product;
  }

  set product(val) {
    this._product = val;
    this.render();
  }

  open(product = null) {
    if (product) this._product = product;
    this._isOpen = true;
    this.setAttribute('open', '');
    this.render();
  }

  close() {
    this._isOpen = false;
    this.removeAttribute('open');
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    if (!this._isOpen || !this._product) {
      this.shadowRoot.innerHTML = '';
      return;
    }

    const p = this._product;
    const priceFormatted = formatPrice(p.price);
    const origPrice = p.originalPrice || p.comparePrice;
    const shareUrl = getProductShareUrl(p);
    const hasDiscount = origPrice && Number(origPrice) > Number(p.price);
    const origFormatted = hasDiscount ? formatPrice(origPrice) : null;
    const isMobileNative = typeof navigator !== 'undefined' && !!navigator.share;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          --wa-green: #25D366;
          --wa-dark: #128C7E;
          --primary: #0052cc;
          --text-main: #0f172a;
          --text-muted: #64748b;
          --bg-card: #ffffff;
          z-index: 999999;
          position: fixed;
        }

        .share-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 16px;
          box-sizing: border-box;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px) scale(0.97); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }

        .share-card {
          background: #ffffff;
          width: 100%;
          max-width: 440px;
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          position: relative;
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid rgba(226, 232, 240, 0.8);
        }

        .share-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 22px;
          border-bottom: 1px solid #f1f5f9;
          background: #fafafa;
        }

        .share-header-title {
          font-size: 16px;
          font-weight: 850;
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }

        .close-btn {
          background: #e2e8f0;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #cbd5e1;
          color: #0f172a;
        }

        .product-preview-bar {
          display: flex;
          gap: 14px;
          padding: 18px 22px;
          background: #f8fafc;
          border-bottom: 1px solid #f1f5f9;
          align-items: center;
        }

        .product-thumb {
          width: 64px;
          height: 64px;
          border-radius: 14px;
          object-fit: contain;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 4px;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .product-info {
          flex: 1;
          min-width: 0;
        }

        .product-name {
          font-size: 14.5px;
          font-weight: 800;
          color: var(--text-main);
          margin: 0 0 4px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .product-price-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .current-price {
          font-weight: 900;
          color: var(--primary);
        }

        .orig-price {
          font-size: 12px;
          color: var(--text-muted);
          text-decoration: line-through;
        }

        .product-badge {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 2px;
        }

        .actions-list {
          padding: 16px 22px 22px 22px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1.5px solid #e2e8f0;
          background: #ffffff;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          box-sizing: border-box;
        }

        .action-btn:hover {
          transform: translateY(-1.5px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
          border-color: #cbd5e1;
        }

        .action-btn-wa {
          background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
          border: none;
          color: #ffffff;
        }

        .action-btn-status {
          background: #0f172a;
          border: none;
          color: #ffffff;
        }

        .icon-circle {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .action-title {
          font-size: 14px;
          font-weight: 800;
          display: block;
        }

        .action-sub {
          font-size: 11.5px;
          opacity: 0.85;
          display: block;
          margin-top: 2px;
        }

        .status-guidance-box {
          background: #eff6ff;
          border: 1px dashed #60a5fa;
          border-radius: 14px;
          padding: 12px;
          margin-top: 4px;
          font-size: 12px;
          color: #1e40af;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .download-image-btn {
          margin-top: 6px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .download-image-btn:hover {
          background: #f8fafc;
        }
      </style>

      <div class="share-backdrop" id="backdrop">
        <div class="share-card">
          <!-- Header -->
          <div class="share-header">
            <h3 class="share-header-title">
              <span>🛒</span> Partager ce produit
            </h3>
            <button class="close-btn" id="close-btn" title="Fermer">&times;</button>
          </div>

          <!-- Product Card Preview Bar -->
          <div class="product-preview-bar">
            <img class="product-thumb" src="${p.image || ''}" alt="${p.name || ''}" onerror="this.src='/assets/sweetos_share.jpg'">
            <div class="product-info">
              <h4 class="product-name">${p.name || 'Produit'}</h4>
              <div class="product-price-row">
                <span class="current-price">${priceFormatted}</span>
                ${hasDiscount ? `<span class="orig-price">${origFormatted}</span>` : ''}
              </div>
              <span class="product-badge">${p.brand ? p.brand : ''} ${p.category ? '• ' + p.category : ''}</span>
            </div>
          </div>

          <!-- Action Options List -->
          <div class="actions-list">
            
            <!-- 1. WhatsApp Chat -->
            <button class="action-btn action-btn-wa" id="btn-wa-chat">
              <div class="icon-circle" style="background: rgba(255,255,255,0.2);">💬</div>
              <div>
                <span class="action-title">Partager sur WhatsApp Chat</span>
                <span class="action-sub">Envoyer directement à un contact ou un groupe</span>
              </div>
            </button>

            <!-- 2. WhatsApp Status -->
            <button class="action-btn action-btn-status" id="btn-wa-status">
              <div class="icon-circle" style="background: rgba(37,211,102,0.2); color:#25D366;">🟢</div>
              <div>
                <span class="action-title">Partager en Statut WhatsApp</span>
                <span class="action-sub">Publier sur votre statut WhatsApp avec carte produit</span>
              </div>
            </button>

            <!-- Status Guidance Note & Download Image Backup -->
            <div class="status-guidance-box" id="status-note">
              <span style="font-size: 16px;">💡</span>
              <div>
                <strong>Astuce Statut WhatsApp :</strong> 
                Dans WhatsApp, touchez <em>"Mon statut"</em> pour publier. 
                <br>
                <button type="button" class="download-image-btn" id="btn-download-img">
                  <span>📥</span> Télécharger l'image pour le statut
                </button>
              </div>
            </div>

            <!-- 3. Copy Link -->
            <button class="action-btn" id="btn-copy-link">
              <div class="icon-circle" style="background: #f1f5f9; color: #0052cc;">🔗</div>
              <div>
                <span class="action-title" style="color:#0f172a;">Copier le lien direct</span>
                <span class="action-sub" style="color:#64748b;">Copier l'URL pour la partager partout</span>
              </div>
            </button>

            <!-- 4. Native Mobile Share / More -->
            ${isMobileNative ? `
              <button class="action-btn" id="btn-native-share">
                <div class="icon-circle" style="background: #f1f5f9; color: #0f172a;">📤</div>
                <div>
                  <span class="action-title" style="color:#0f172a;">Plus d'options de partage</span>
                  <span class="action-sub" style="color:#64748b;">Utiliser le menu de partage de votre téléphone</span>
                </div>
              </button>
            ` : ''}

          </div>
        </div>
      </div>
    `;

    this.attachListeners();
  }

  attachListeners() {
    const shadow = this.shadowRoot;
    const backdrop = shadow.getElementById('backdrop');
    const closeBtn = shadow.getElementById('close-btn');
    const btnWaChat = shadow.getElementById('btn-wa-chat');
    const btnWaStatus = shadow.getElementById('btn-wa-status');
    const btnCopyLink = shadow.getElementById('btn-copy-link');
    const btnNativeShare = shadow.getElementById('btn-native-share');
    const btnDownloadImg = shadow.getElementById('btn-download-img');

    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    if (btnWaChat) {
      btnWaChat.addEventListener('click', () => {
        try {
          shareToWhatsApp(this._product);
          this.dispatchEvent(new CustomEvent('share:success', { detail: { channel: 'whatsapp_chat', product: this._product } }));
          this.close();
        } catch(e) {
          this.dispatchEvent(new CustomEvent('share:error', { detail: e }));
        }
      });
    }

    if (btnWaStatus) {
      btnWaStatus.addEventListener('click', () => {
        try {
          shareToWhatsAppStatus(this._product);
          this.dispatchEvent(new CustomEvent('share:success', { detail: { channel: 'whatsapp_status', product: this._product } }));
        } catch(e) {
          this.dispatchEvent(new CustomEvent('share:error', { detail: e }));
        }
      });
    }

    if (btnCopyLink) {
      btnCopyLink.addEventListener('click', async () => {
        try {
          await copyShareLink(this._product);
          this.dispatchEvent(new CustomEvent('share:success', { detail: { channel: 'copy', product: this._product } }));
          this.close();
        } catch(e) {
          this.dispatchEvent(new CustomEvent('share:error', { detail: e }));
        }
      });
    }

    if (btnNativeShare) {
      btnNativeShare.addEventListener('click', async () => {
        try {
          await nativeShare(this._product);
          this.dispatchEvent(new CustomEvent('share:success', { detail: { channel: 'native', product: this._product } }));
          this.close();
        } catch(e) {
          this.dispatchEvent(new CustomEvent('share:error', { detail: e }));
        }
      });
    }

    if (btnDownloadImg && this._product?.image) {
      btnDownloadImg.addEventListener('click', (e) => {
        e.stopPropagation();
        const a = document.createElement('a');
        a.href = this._product.image;
        a.download = `${(this._product.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.dispatchEvent(new CustomEvent('toast:show', { detail: '📥 Téléchargement de l\'image produit...' }));
      });
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('share-modal')) {
  customElements.define('share-modal', ShareModal);
}
