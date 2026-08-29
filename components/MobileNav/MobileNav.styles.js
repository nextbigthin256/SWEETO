// components/MobileNav/MobileNav.styles.js
// Constructable Stylesheet CSS string for MobileNav Web Component

export const mobileNavCSS = `
:host {
  display: none;
}

@media (max-width: 968px) {
  :host {
    display: block;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 990;
    height: calc(68px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid rgba(226, 232, 240, 0.85);
    box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.04);
  }

  .mobile-nav-bar {
    display: flex;
    justify-content: space-around;
    align-items: center;
    height: 100%;
    padding: 0 12px;
    position: relative;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    color: var(--text-light);
    gap: 4px;
    height: 100%;
    flex: 1;
    max-width: 80px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    padding: 8px 0;
    border-radius: 12px;
  }

  .nav-item .active-indicator {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 3px;
    background: var(--primary);
    border-radius: 0 0 2px 2px;
    display: none;
    box-shadow: 0 2px 6px rgba(0, 82, 204, 0.4);
  }

  .nav-item .icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    color: inherit;
    transition: transform 0.2s;
  }

  .nav-item .icon-box svg {
    width: 22px;
    height: 22px;
  }

  .nav-item .label {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 0.2px;
  }

  /* Badge styling inside Cart */
  .nav-item .badge {
    position: absolute;
    top: -5px;
    right: -8px;
    background: var(--red);
    color: white;
    font-size: 9px;
    font-weight: 800;
    min-width: 16px;
    height: 16px;
    border-radius: 50%;
    display: none;
    align-items: center;
    justify-content: center;
    border: 1.5px solid white;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  }

  /* Active State Styling matches image */
  .nav-item.active {
    color: var(--primary);
    background: rgba(0, 82, 204, 0.05);
  }

  .nav-item.active .active-indicator {
    display: block;
  }

  .nav-item.active .icon-box {
    transform: translateY(-1px);
  }
}
`;
