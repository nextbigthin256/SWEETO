// components/PWA/PWAInstaller.js - Universal Multi-Device PWA Installer
class PWAInstaller extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.deferredPrompt = null;
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  connectedCallback() {
    if (this.isStandalone) {
      return; // Already running as installed standalone PWA app!
    }

    this.render();
    this.setupListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          bottom: 75px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9998;
          width: calc(100% - 32px);
          max-width: 420px;
          pointer-events: none;
        }

        .pwa-banner {
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: white;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
          pointer-events: auto;
          animation: slideUpPWA 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUpPWA {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .pwa-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pwa-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, #0052cc 0%, #00b4d8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 82, 204, 0.3);
        }

        .pwa-text h4 {
          margin: 0;
          font-size: 13.5px;
          font-weight: 850;
          color: #ffffff;
          letter-spacing: -0.2px;
        }

        .pwa-text p {
          margin: 2px 0 0 0;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 550;
        }

        .pwa-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .pwa-install-btn {
          background: linear-gradient(135deg, #0052cc 0%, #00b4d8 100%);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(0, 82, 204, 0.25);
          white-space: nowrap;
        }

        .pwa-install-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 82, 204, 0.4);
        }

        .pwa-close-btn {
          background: rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          border: none;
          border-radius: 8px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .pwa-close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        /* iOS Instruction Modal */
        .ios-modal-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 10000;
          align-items: flex-end;
          justify-content: center;
          padding: 20px;
          pointer-events: auto;
        }

        .ios-modal-overlay.active {
          display: flex;
        }

        .ios-card {
          background: #ffffff;
          border-radius: 24px;
          padding: 24px;
          width: 100%;
          max-width: 400px;
          text-align: center;
          color: #0f172a;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
          animation: slideUpModal 0.3s ease;
        }

        @keyframes slideUpModal {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .ios-card h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 850;
          color: #0f172a;
        }

        .ios-card p {
          margin: 0 0 20px 0;
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
        }

        .ios-steps {
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-align: left;
          background: #f8fafc;
          padding: 16px;
          border-radius: 16px;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
        }

        .ios-step-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
        }

        .ios-step-num {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #0052cc;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .ios-close-btn {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          background: #f1f5f9;
          border: none;
          color: #334155;
          font-size: 13.5px;
          font-weight: 800;
          cursor: pointer;
        }
      </style>

      <div class="pwa-banner" id="pwaBanner" style="display: none;">
        <div class="pwa-info">
          <div class="pwa-icon">🛍️</div>
          <div class="pwa-text">
            <h4>Install SWEETOS App</h4>
            <p>Fast, offline-ready & native app experience</p>
          </div>
        </div>
        <div class="pwa-actions">
          <button class="pwa-install-btn" id="pwaInstallBtn">📲 Install</button>
          <button class="pwa-close-btn" id="pwaDismissBtn" title="Dismiss">✕</button>
        </div>
      </div>

      <!-- iOS Installation Guidance Modal -->
      <div class="ios-modal-overlay" id="iosModal">
        <div class="ios-card">
          <h3>📲 Install SWEETOS on iPhone</h3>
          <p>Add SWEETOS to your home screen for full screen app experience & background push alerts.</p>
          
          <div class="ios-steps">
            <div class="ios-step-item">
              <div class="ios-step-num">1</div>
              <span>Tap the <strong>Share</strong> button <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0052cc" stroke-width="2.5" style="vertical-align:middle;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg> at bottom of Safari.</span>
            </div>
            <div class="ios-step-item">
              <div class="ios-step-num">2</div>
              <span>Scroll down and tap <strong>Add to Home Screen ➕</strong>.</span>
            </div>
            <div class="ios-step-item">
              <div class="ios-step-num">3</div>
              <span>Tap <strong>Add</strong> in top right corner. Done! 🎉</span>
            </div>
          </div>

          <button class="ios-close-btn" id="iosCloseBtn">Got it!</button>
        </div>
      </div>
    `;
  }

  setupListeners() {
    const shadow = this.shadowRoot;
    const banner = shadow.getElementById('pwaBanner');
    const installBtn = shadow.getElementById('pwaInstallBtn');
    const dismissBtn = shadow.getElementById('pwaDismissBtn');
    const iosModal = shadow.getElementById('iosModal');
    const iosCloseBtn = shadow.getElementById('iosCloseBtn');

    // Check if dismissed in current session
    if (sessionStorage.getItem('SWEETOS_pwa_dismissed')) {
      return;
    }

    // Import engagement check
    import('../../utils/engagement.js').then(({ isUserEngaged }) => {
      const tryShowBanner = () => {
        if (sessionStorage.getItem('SWEETOS_pwa_dismissed')) return;
        if (!isUserEngaged()) return;
        if (this.deferredPrompt || (this.isIOS && !this.isStandalone)) {
          if (banner) banner.style.display = 'flex';
        }
      };

      // Android, Windows, Mac, ChromeOS install prompt handler
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredPrompt = e;
        tryShowBanner();
      });

      // Show banner on iOS Safari if engaged
      if (this.isIOS && !this.isStandalone) {
        tryShowBanner();
      }

      window.addEventListener('user:engaged', tryShowBanner);
      window.addEventListener('cart:add', tryShowBanner);
    }).catch(() => {});

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (this.deferredPrompt) {
          this.deferredPrompt.prompt();
          const { outcome } = await this.deferredPrompt.userChoice;
          console.log(`PWA install outcome: ${outcome}`);
          this.deferredPrompt = null;
          if (banner) banner.style.display = 'none';
        } else if (this.isIOS) {
          if (iosModal) iosModal.classList.add('active');
        } else {
          // Fallback guidance
          window.dispatchEvent(new CustomEvent('toast:show', { detail: '📲 To install, use your browser menu (⋮) and click "Install App" or "Add to Home Screen".' }));
        }
      });
    }

    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        if (banner) banner.style.display = 'none';
        sessionStorage.setItem('SWEETOS_pwa_dismissed', 'true');
      });
    }

    if (iosCloseBtn && iosModal) {
      iosCloseBtn.addEventListener('click', () => {
        iosModal.classList.remove('active');
        if (banner) banner.style.display = 'none';
        sessionStorage.setItem('SWEETOS_pwa_dismissed', 'true');
      });
    }

    // Hide banner once app is successfully installed
    window.addEventListener('appinstalled', () => {
      if (banner) banner.style.display = 'none';
      window.dispatchEvent(new CustomEvent('toast:show', { detail: '🎉 SWEETOS App installed successfully!' }));
    });
  }
}

customElements.define('pwa-installer', PWAInstaller);
export default PWAInstaller;
