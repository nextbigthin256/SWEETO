import { subscribeToWebPush, getPushSubscription } from '../../utils/pushNotifications.js';
import { isUserEngaged } from '../../utils/engagement.js';

class PushPromptModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.timerId = null;
    this.initialPromptDone = false;
  }

  connectedCallback() {
    this.render();
    this.setupListeners();
    this.initAutoPushCycle();
  }

  disconnectedCallback() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          inset: 0;
          z-index: 99999;
          pointer-events: none;
        }

        .push-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          opacity: 0;
          visibility: hidden;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: auto;
        }

        .push-backdrop.active {
          opacity: 1;
          visibility: visible;
        }

        .push-modal-box {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: calc(100% - 32px);
          max-width: 410px;
          background: rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1.5px solid rgba(0, 180, 216, 0.3);
          border-radius: 24px;
          padding: 24px;
          color: white;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 82, 204, 0.2);
          pointer-events: auto;
          opacity: 0;
          visibility: hidden;
          transform: translateY(40px) scale(0.94);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 100000;
        }

        @media (max-width: 480px) {
          .push-modal-box {
            right: 16px;
            left: 16px;
            bottom: 80px;
            width: auto;
            max-width: none;
            padding: 20px;
          }
        }

        .push-modal-box.active {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }

        .bell-icon-wrapper {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          background: linear-gradient(135deg, #0052cc 0%, #00b4d8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          margin-bottom: 16px;
          box-shadow: 0 8px 24px rgba(0, 82, 204, 0.4);
          position: relative;
        }

        .bell-icon-wrapper::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 20px;
          border: 2px solid rgba(0, 180, 216, 0.4);
          animation: pulseGlow 2s infinite ease-in-out;
        }

        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.08); opacity: 0.2; }
        }

        .push-header h3 {
          margin: 0 0 6px 0;
          font-size: 17px;
          font-weight: 850;
          color: #ffffff;
          letter-spacing: -0.3px;
        }

        .push-header p {
          margin: 0 0 16px 0;
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
          font-weight: 500;
        }

        .benefits-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 12px 14px;
          margin-bottom: 20px;
        }

        .benefit-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          color: #e2e8f0;
        }

        .benefit-item span:first-child {
          color: #00b4d8;
          font-weight: 900;
        }

        .push-btn-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .accept-push-btn {
          flex: 1;
          background: linear-gradient(135deg, #0052cc 0%, #00b4d8 100%);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 13px 18px;
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(0, 82, 204, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .accept-push-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0, 82, 204, 0.5);
        }

        .decline-push-btn {
          background: rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 13px 16px;
          font-size: 12.5px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .decline-push-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: white;
        }
      </style>

      <div class="push-backdrop" id="pushBackdrop"></div>

      <div class="push-modal-box" id="pushModalBox">
        <div class="bell-icon-wrapper">🔔</div>
        
        <div class="push-header">
          <h3>Never Miss Order Updates & Flash Deals</h3>
          <p>Get instant background notifications for your order status, delivery alerts, and secret voucher drops.</p>
        </div>

        <div class="benefits-list">
          <div class="benefit-item">
            <span>✓</span> <span>Instant Order & Delivery Tracking</span>
          </div>
          <div class="benefit-item">
            <span>✓</span> <span>Exclusive 20% Off Secret Promo Vouchers</span>
          </div>
          <div class="benefit-item">
            <span>✓</span> <span>Works Offline & When Site is Closed</span>
          </div>
        </div>

        <div class="push-btn-group">
          <button class="accept-push-btn" id="acceptPushBtn">
            <span>🔔 Allow Notifications</span>
          </button>
          <button class="decline-push-btn" id="declinePushBtn">
            Not Now
          </button>
        </div>
      </div>
    `;
  }

  async initAutoPushCycle() {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const sub = await getPushSubscription();
      if (sub) return;
    }

    // Only prompt if user is ALREADY engaged (browsed >= 3 pages or added item to cart)
    if (isUserEngaged()) {
      this.triggerEngagedPrompt();
    }
  }

  async triggerEngagedPrompt() {
    if (this.initialPromptDone || sessionStorage.getItem('SWEETOS_push_dismissed')) return;
    if (Notification.permission === 'granted') {
      const sub = await getPushSubscription();
      if (sub) return;
    }
    
    this.initialPromptDone = true;
    setTimeout(() => {
      this.showModal();
    }, 1200);
  }

  scheduleModalPopout(delayMs = 60000) {
    if (this.timerId) clearTimeout(this.timerId);

    this.timerId = setTimeout(async () => {
      // Check if permission was granted in the meantime
      if (Notification.permission === 'granted') {
        const sub = await getPushSubscription();
        if (sub) return;
      }

      this.showModal();
    }, delayMs);
  }

  showModal() {
    const shadow = this.shadowRoot;
    const box = shadow.getElementById('pushModalBox');
    const backdrop = shadow.getElementById('pushBackdrop');
    if (box) box.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
  }

  hideModal() {
    const shadow = this.shadowRoot;
    const box = shadow.getElementById('pushModalBox');
    const backdrop = shadow.getElementById('pushBackdrop');
    if (box) box.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
  }

  setupListeners() {
    const shadow = this.shadowRoot;
    const acceptBtn = shadow.getElementById('acceptPushBtn');
    const declineBtn = shadow.getElementById('declinePushBtn');
    const backdrop = shadow.getElementById('pushBackdrop');

    // Listen for user engagement (cart addition or 3+ page views)
    this._engagedHandler = () => {
      this.triggerEngagedPrompt();
    };
    window.addEventListener('user:engaged', this._engagedHandler);
    window.addEventListener('cart:add', this._engagedHandler);

    if (acceptBtn) {
      acceptBtn.addEventListener('click', async () => {
        acceptBtn.disabled = true;
        acceptBtn.innerHTML = `<span>⏳ Enabling...</span>`;

        try {
          await subscribeToWebPush();
          this.hideModal();
          window.dispatchEvent(new CustomEvent('toast:show', { detail: '🎉 Push notifications enabled! You are now subscribed.' }));
        } catch(err) {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `⚠️ ${err.message || 'Permission denied'}` }));
          acceptBtn.disabled = false;
          acceptBtn.innerHTML = `<span>🔔 Allow Notifications</span>`;
          this.hideModal();
          // Schedule recurring popout 1 minute later
          this.scheduleModalPopout(60000);
        }
      });
    }

    if (declineBtn) {
      declineBtn.addEventListener('click', () => {
        this.hideModal();
        // User clicked "Not Now": popout again in exactly 1 minute (60,000ms)
        window.dispatchEvent(new CustomEvent('toast:show', { detail: '⏰ We will remind you again in 1 minute.' }));
        this.scheduleModalPopout(60000);
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        this.hideModal();
        this.scheduleModalPopout(60000);
      });
    }
  }
}

customElements.define('push-prompt-modal', PushPromptModal);
export default PushPromptModal;
