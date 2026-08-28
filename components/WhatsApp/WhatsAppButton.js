/**
 * components/WhatsApp/WhatsAppButton.js
 * Global Draggable Floating WhatsApp Contact Widget
 * Connects customers on every page directly to the store admin's WhatsApp.
 * Fully movable anywhere on the screen (left, right, top, bottom) on both desktop & mobile!
 */

class WhatsAppButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isDragging = false;
    this.hasMoved = false;
    this.startX = 0;
    this.startY = 0;
    this.initialLeft = 0;
    this.initialTop = 0;
  }

  connectedCallback() {
    this.render();
    this.initPosition();
    this.attachDragListeners();
    this.attachClickListeners();

    // Re-clamp on window resize
    window.addEventListener('resize', () => this.clampToBounds());
  }

  getAdminPhone() {
    const raw = sessionStorage.getItem('SWEETOS_store_phone') || '+225 05 00 61 99 23';
    return raw.replace(/[^0-9]/g, '') || '2250500619923';
  }

  initPosition() {
    try {
      const saved = sessionStorage.getItem('SWEETOS_wa_btn_pos');
      if (saved) {
        const { left, top } = JSON.parse(saved);
        this.style.left = `${left}px`;
        this.style.top = `${top}px`;
        this.style.bottom = 'auto';
        this.style.right = 'auto';
        this.clampToBounds();
        return;
      }
    } catch(e) {}

    // Default position: bottom-left
    const defaultLeft = window.innerWidth <= 968 ? 18 : 26;
    const defaultTop = window.innerHeight - (window.innerWidth <= 968 ? 144 : 86);
    this.style.left = `${Math.max(10, defaultLeft)}px`;
    this.style.top = `${Math.max(10, defaultTop)}px`;
    this.style.bottom = 'auto';
    this.style.right = 'auto';
  }

  clampToBounds() {
    const rect = this.getBoundingClientRect();
    const btnW = rect.width || 60;
    const btnH = rect.height || 60;

    let curLeft = parseFloat(this.style.left) || 26;
    let curTop = parseFloat(this.style.top) || (window.innerHeight - 86);

    const maxLeft = Math.max(10, window.innerWidth - btnW - 10);
    const maxTop = Math.max(10, window.innerHeight - btnH - 10);

    const clampedLeft = Math.min(Math.max(10, curLeft), maxLeft);
    const clampedTop = Math.min(Math.max(10, curTop), maxTop);

    this.style.left = `${clampedLeft}px`;
    this.style.top = `${clampedTop}px`;
  }

  savePosition() {
    try {
      const left = parseFloat(this.style.left) || 26;
      const top = parseFloat(this.style.top) || 26;
      sessionStorage.setItem('SWEETOS_wa_btn_pos', JSON.stringify({ left, top }));
    } catch(e) {}
  }

  render() {
    const adminPhone = this.getAdminPhone();
    const defaultMsg = encodeURIComponent("Bonjour SWEETOS ! 👋 J'ai une question concernant votre boutique / mes commandes.");
    const waUrl = `https://wa.me/${adminPhone}?text=${defaultMsg}`;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          user-select: none;
          touch-action: none;
        }

        .wa-float-container {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Tooltip message bubble */
        .wa-tooltip {
          background: #0f172a;
          color: #ffffff;
          padding: 8px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 750;
          white-space: nowrap;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.12);
          opacity: 0;
          transform: translateX(-10px) scale(0.95);
          pointer-events: none;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .wa-float-container:hover .wa-tooltip {
          opacity: 1;
          transform: translateX(0) scale(1);
          pointer-events: auto;
        }

        /* Draggable Floating Action Button */
        .wa-btn {
          position: relative;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: linear-gradient(135deg, #25D366, #128C7E);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(37, 211, 102, 0.45);
          cursor: grab;
          text-decoration: none;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
          border: none;
          outline: none;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }

        .wa-btn:hover {
          transform: scale(1.08) translateY(-2px);
          box-shadow: 0 12px 30px rgba(37, 211, 102, 0.6);
        }

        .wa-btn.is-dragging {
          cursor: grabbing !important;
          transform: scale(1.12);
          box-shadow: 0 16px 36px rgba(37, 211, 102, 0.7);
        }

        /* Pulse wave animation */
        .wa-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid #25D366;
          animation: waPulse 2s infinite;
          pointer-events: none;
          opacity: 0;
        }

        .wa-btn.is-dragging .wa-pulse {
          animation: none;
          display: none;
        }

        @keyframes waPulse {
          0% {
            transform: scale(0.95);
            opacity: 0.8;
          }
          70% {
            transform: scale(1.35);
            opacity: 0;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        /* Online indicator green dot */
        .wa-online-dot {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 14px;
          height: 14px;
          background: #10b981;
          border: 2.5px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }

        /* SVG WhatsApp Icon */
        .wa-icon {
          width: 32px;
          height: 32px;
          fill: currentColor;
          pointer-events: none;
        }

        @media (max-width: 968px) {
          .wa-btn {
            width: 52px;
            height: 52px;
          }
          .wa-icon {
            width: 28px;
            height: 28px;
          }
          .wa-tooltip {
            display: none;
          }
        }
      </style>

      <div class="wa-float-container">
        <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="wa-btn" id="waLink" title="Glissez pour déplacer / Cliquez pour discuter">
          <div class="wa-pulse"></div>
          <svg class="wa-icon" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.97.53 1.954.82 2.795.82 3.182 0 5.768-2.587 5.768-5.766 0-3.18-2.586-5.767-5.767-5.767zm3.385 8.163c-.145.407-.84.774-1.157.823-.317.048-.732.072-2.383-.615-1.99-1.077-3.266-3.1-3.366-3.232-.099-.133-.801-1.066-.801-2.033 0-.967.509-1.442.69-1.637.181-.196.396-.245.528-.245.132 0 .264.002.378.008.12.006.28-.046.438.334.164.394.559 1.365.609 1.464.05.099.083.214.017.346-.067.132-.1.214-.199.329-.099.115-.208.257-.297.345-.099.098-.203.205-.087.404.116.198.514.847 1.102 1.37.759.674 1.398.883 1.597.982.198.099.314.083.43-.05.116-.132.496-.577.628-.775.132-.198.264-.165.446-.099.182.066 1.156.545 1.354.644.198.099.33.148.379.231.05.083.05.479-.095.886zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.438 5.178L2 22l4.98-1.306A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.188c-1.625 0-3.146-.497-4.417-1.35l-.316-.214-2.964.777.791-2.89-.206-.328A8.15 8.15 0 013.813 12c0-4.514 3.673-8.188 8.187-8.188 4.515 0 8.188 3.674 8.188 8.188 0 4.514-3.673 8.188-8.188 8.188z"/>
          </svg>
          <div class="wa-online-dot"></div>
        </a>
        <div class="wa-tooltip">
          <span>💬 Discutez avec nous sur WhatsApp</span>
        </div>
      </div>
    `;
  }

  attachDragListeners() {
    const waBtn = this.shadowRoot.getElementById('waLink');
    if (!waBtn) return;

    // Start drag handler (Mouse & Touch)
    const onStart = (clientX, clientY) => {
      this.isDragging = true;
      this.hasMoved = false;
      this.startX = clientX;
      this.startY = clientY;

      const rect = this.getBoundingClientRect();
      this.initialLeft = rect.left;
      this.initialTop = rect.top;
    };

    // Move drag handler
    const onMove = (clientX, clientY, e) => {
      if (!this.isDragging) return;

      const deltaX = clientX - this.startX;
      const deltaY = clientY - this.startY;

      if (Math.hypot(deltaX, deltaY) > 5) {
        this.hasMoved = true;
        waBtn.classList.add('is-dragging');
        if (e && e.cancelable) e.preventDefault();

        const newLeft = this.initialLeft + deltaX;
        const newTop = this.initialTop + deltaY;

        this.style.left = `${newLeft}px`;
        this.style.top = `${newTop}px`;
        this.clampToBounds();
      }
    };

    // End drag handler
    const onEnd = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      waBtn.classList.remove('is-dragging');

      if (this.hasMoved) {
        this.clampToBounds();
        this.savePosition();
      }
    };

    // --- Mouse Events ---
    waBtn.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Left click only
      onStart(e.clientX, e.clientY);

      const moveHandler = (moveEvent) => onMove(moveEvent.clientX, moveEvent.clientY, moveEvent);
      const upHandler = () => {
        onEnd();
        window.removeEventListener('mousemove', moveHandler);
        window.removeEventListener('mouseup', upHandler);
      };

      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('mouseup', upHandler);
    });

    // --- Touch Events ---
    waBtn.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      if (!touch) return;
      onStart(touch.clientX, touch.clientY);

      const touchMoveHandler = (moveEvent) => {
        const t = moveEvent.touches[0];
        if (t) onMove(t.clientX, t.clientY, moveEvent);
      };

      const touchEndHandler = () => {
        onEnd();
        window.removeEventListener('touchmove', touchMoveHandler);
        window.removeEventListener('touchend', touchEndHandler);
        window.removeEventListener('touchcancel', touchEndHandler);
      };

      window.addEventListener('touchmove', touchMoveHandler, { passive: false });
      window.addEventListener('touchend', touchEndHandler);
      window.addEventListener('touchcancel', touchEndHandler);
    }, { passive: true });
  }

  attachClickListeners() {
    const waLink = this.shadowRoot.getElementById('waLink');
    if (waLink) {
      waLink.addEventListener('click', (e) => {
        // If the user was dragging/moving the button, prevent opening WhatsApp link
        if (this.hasMoved) {
          e.preventDefault();
          e.stopPropagation();
          this.hasMoved = false;
          return;
        }

        // Fresh dynamic phone retrieval & message
        const adminPhone = this.getAdminPhone();
        const defaultMsg = encodeURIComponent("Bonjour SWEETOS ! 👋 J'ai une question concernant votre boutique / mes commandes.");
        waLink.href = `https://wa.me/${adminPhone}?text=${defaultMsg}`;
      });
    }
  }
}

customElements.define('whatsapp-button', WhatsAppButton);
export default WhatsAppButton;
