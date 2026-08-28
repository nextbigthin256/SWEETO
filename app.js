// SPA pathname to hash router redirect fallback
if (window.location.pathname !== '/' && window.location.pathname !== '/index.html' && window.location.pathname !== '/admin.html') {
  const path = window.location.pathname.substring(1);
  if (!path.includes('.') && !path.startsWith('assets/') && !path.startsWith('components/')) {
    window.location.replace('/#/' + path);
  }
}

// Store Purification Sanitizer: Clear old mock sessions and legacy fake user accounts
(function purifyStoreSessions() {
  try {
    if (!localStorage.getItem('SWEETOS_v4_purified')) {
      const loggedUser = localStorage.getItem('SWEETOS_logged_in_user');
      if (loggedUser) {
        try {
          const parsed = JSON.parse(loggedUser);
          if (!parsed.email || parsed.email.includes('customer@sweetos.com') || parsed.email.includes('developer.') || parsed.email.includes('guest@') || parsed.email.includes('john@doe.com')) {
            localStorage.removeItem('SWEETOS_logged_in_user');
            localStorage.removeItem('SWEETOS_user_profile');
          }
        } catch(e) {
          localStorage.removeItem('SWEETOS_logged_in_user');
          localStorage.removeItem('SWEETOS_user_profile');
        }
      }
      localStorage.removeItem('SWEETOS_user_profile_guest');
      localStorage.removeItem('SWEETOS_user_profile');
      localStorage.setItem('SWEETOS_v4_purified', 'true');
    }
  } catch(e) {}
})();

import { getCartStorageKey } from './utils/storage.js';
import { initSupabaseSync } from './utils/supabase.js';
import './utils/modal.js';
import products from './data/products.js';

// Import all Web Components to auto-register them
import './components/Sidebar/Sidebar.js';
import './components/Header/Header.js';
import './components/Hero/Hero.js';
import './components/Search/SearchBar.js';
import './components/ProductCard/ProductCard.js';
import './components/ProductList/ProductList.js';
import './components/Cart/CartDrawer.js';
import './components/Notifications/NotificationDrawer.js';
import './components/ProductDetails/ProductDetailsModal.js';
import './components/Checkout/CheckoutModal.js';
import './components/MobileNav/MobileNav.js';
import './components/WhatsApp/WhatsAppButton.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Supabase Live Backend Sync
  initSupabaseSync();

  // Live Background Customer Revocation Guard (Every 6 seconds)
  setInterval(async () => {
    const loggedUserStr = localStorage.getItem('SWEETOS_logged_in_user');
    if (loggedUserStr) {
      try {
        const loggedUser = JSON.parse(loggedUserStr);
        if (loggedUser && loggedUser.email) {
          const { checkCustomerAccountValidInSupabase } = await import('./utils/supabase.js');
          const res = await checkCustomerAccountValidInSupabase(loggedUser.email);
          if (res && res.valid === false) {
            localStorage.removeItem('SWEETOS_logged_in_user');
            localStorage.removeItem('SWEETOS_user_profile');
            window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: false } }));
            window.dispatchEvent(new CustomEvent('toast:show', { detail: '⚠️ Votre compte a été supprimé par l\'administrateur. Déconnexion...' }));
            window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'home' } }));
          }
        }
      } catch(e) {}
    }
  }, 6000);

  // Apply dynamic store configurations (theme, brand colors, font family)
  const applyBrandingSettings = () => {
    const primaryColor = localStorage.getItem('SWEETOS_brand_color_primary') || '#0052cc';
    const accentColor = localStorage.getItem('SWEETOS_brand_color_accent') || '#00b4d8';
    const font = localStorage.getItem('SWEETOS_font_family') || 'Outfit';
    const theme = localStorage.getItem('SWEETOS_theme_mode') || 'dark';

    // Inject Google Font link tag dynamically if it isn't already loaded
    if (font && !document.getElementById(`font-link-${font}`)) {
      const link = document.createElement('link');
      link.id = `font-link-${font}`;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
      document.head.appendChild(link);
    }

    let styleEl = document.getElementById('sweetos-dynamic-branding');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'sweetos-dynamic-branding';
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      :root {
        --primary: ${primaryColor} !important;
        --primary-light: ${accentColor} !important;
        --primary-dark: ${primaryColor} !important;
        --primary-accent: ${accentColor} !important;
        --accent: ${accentColor} !important;
        --font-family: '${font}', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }
      body {
        font-family: var(--font-family) !important;
      }
    `;

    // Apply dark/light class on body
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    }
  };

  applyBrandingSettings();

  // Listen to branding settings update triggers
  window.addEventListener('branding:updated', () => {
    applyBrandingSettings();
  });

  // Listen to cross-tab storage changes to sync branding/theme reactively
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('SWEETOS_')) {
      if (
        e.key.includes('brand_color') || 
        e.key === 'SWEETOS_font_family' || 
        e.key === 'SWEETOS_theme_mode'
      ) {
        applyBrandingSettings();
      }
      
      if (
        e.key === 'SWEETOS_hero_title' || 
        e.key === 'SWEETOS_hero_subtitle' || 
        e.key === 'SWEETOS_store_entrance_image'
      ) {
        window.dispatchEvent(new CustomEvent('branding:updated'));
      }
    }
  });

  // Select DOM Elements
  const cartEl = document.getElementById('global-cart-drawer');
  const notifEl = document.getElementById('global-notification-drawer');
  const mainContent = document.getElementById('mainContent');
  const floatBtn = document.getElementById('cartFloatBtn');
  const overlay = document.getElementById('cartOverlay');
  const toastEl = document.getElementById('toast');

  let toastTimeout = null;

  // 1. Toast Notification Utility
  const showToast = (message) => {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2500);
  };

  // Listen to global toast requests
  window.addEventListener('toast:show', (e) => {
    showToast(e.detail);
  });

  // 2. Cart & Notification Panel Drawer Toggle Handlers
  const openCart = () => {
    cartEl.classList.remove('closed');
    notifEl.classList.add('closed'); // Close notifications when cart opens
    mainContent.classList.remove('cart-closed');
    floatBtn.classList.remove('visible');
    overlay.classList.remove('show');
  };

  const closeCart = () => {
    cartEl.classList.add('closed');
    if (notifEl.classList.contains('closed')) {
      mainContent.classList.add('cart-closed');
    }
    floatBtn.classList.add('visible');
    
    // Only show backdrop overlay on small screens
    if (window.innerWidth <= 968) {
      overlay.classList.remove('show');
    }
  };

  const toggleCart = () => {
    if (cartEl.classList.contains('closed')) {
      openCart();
      if (window.innerWidth <= 968) {
        overlay.classList.add('show');
      }
    } else {
      closeCart();
    }
  };

  const openNotifications = () => {
    notifEl.classList.remove('closed');
    cartEl.classList.add('closed'); // Close cart when notifications open
    mainContent.classList.remove('cart-closed');
    floatBtn.classList.add('visible'); // Cart float is visible since cart is closed
    
    if (window.innerWidth <= 968) {
      overlay.classList.add('show');
    }
  };

  const closeNotifications = () => {
    notifEl.classList.add('closed');
    if (cartEl.classList.contains('closed')) {
      mainContent.classList.add('cart-closed');
    }
    
    if (window.innerWidth <= 968) {
      overlay.classList.remove('show');
    }
  };

  const toggleNotifications = () => {
    if (notifEl.classList.contains('closed')) {
      openNotifications();
    } else {
      closeNotifications();
    }
  };

  // --- Draggable Floating Cart Tab (Vertical constrained drag) ---
  let isDragging = false;
  let startY = 0;
  let initialTop = 0;
  let didDrag = false;
  const dragThreshold = 5; // pixels to distinguish drag vs click

  const onDragStart = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    
    isDragging = true;
    didDrag = false;
    startY = e.clientY || e.touches?.[0]?.clientY || 0;
    
    const rect = floatBtn.getBoundingClientRect();
    initialTop = rect.top + rect.height / 2; // Center Y of button
    
    floatBtn.classList.add('dragging');
    floatBtn.style.transition = 'none'; // Disable hover transition during drag
    
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
  };

  const onDragMove = (e) => {
    if (!isDragging) return;
    
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    const deltaY = clientY - startY;
    
    if (Math.abs(deltaY) > dragThreshold) {
      didDrag = true;
      e.preventDefault(); // Stop text selections while dragging
    }
    
    let newTop = initialTop + deltaY;
    
    const height = floatBtn.offsetHeight;
    const minTop = height / 2 + 10;
    const maxTop = window.innerHeight - (height / 2 + 10);
    newTop = Math.max(minTop, Math.min(newTop, maxTop));
    
    floatBtn.style.top = `${newTop}px`;
  };

  const onDragEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    floatBtn.classList.remove('dragging');
    floatBtn.style.transition = ''; // Restore default transition styles
    
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('touchend', onDragEnd);
  };

  floatBtn.addEventListener('mousedown', onDragStart);
  floatBtn.addEventListener('touchstart', onDragStart, { passive: true });

  // Click listener intercepts clicks to prevent opening when dragging ends
  floatBtn.addEventListener('click', (e) => {
    if (didDrag) {
      e.preventDefault();
      e.stopPropagation();
      didDrag = false; // reset
      return;
    }
    toggleCart();
  });

  const sidebarEl = document.getElementById('main-sidebar');

  const openSidebarMobile = () => {
    sidebarEl.classList.add('open');
    overlay.classList.add('show');
    document.body.classList.add('sidebar-open');
    cartEl.classList.add('closed');
    notifEl.classList.add('closed');
  };

  const closeSidebarMobile = () => {
    sidebarEl.classList.remove('open');
    if (cartEl.classList.contains('closed') && notifEl.classList.contains('closed')) {
      overlay.classList.remove('show');
    }
    document.body.classList.remove('sidebar-open');
  };

  const toggleSidebarMobile = () => {
    if (sidebarEl.classList.contains('open')) {
      closeSidebarMobile();
    } else {
      openSidebarMobile();
    }
  };

  overlay.addEventListener('click', () => {
    closeCart();
    closeNotifications();
    closeSidebarMobile();
  });

  // Handle sidebar collapse events
  window.addEventListener('sidebar:toggle', (e) => {
    const isCollapsed = e.detail?.collapsed;
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  });

  // Custom event listener for components to trigger cart drawers
  window.addEventListener('cart:toggle', (e) => {
    const forceOpen = e.detail?.open;
    if (forceOpen === true) {
      openCart();
      closeSidebarMobile();
    } else if (forceOpen === false) {
      closeCart();
    } else {
      toggleCart();
    }
  });

  // Close sidebar drawer on any navigation changes
  window.addEventListener('navigation:changed', () => {
    closeSidebarMobile();
  });

  // Custom event listener to trigger mobile sidebar drawer
  window.addEventListener('sidebar:mobile-toggle', () => {
    toggleSidebarMobile();
  });

  // Custom event listener to trigger notification drawers
  window.addEventListener('notifications:toggle', (e) => {
    const forceOpen = e.detail?.open;
    if (forceOpen === true) {
      openNotifications();
    } else if (forceOpen === false) {
      closeNotifications();
    } else {
      toggleNotifications();
    }
  });

  // Listen for Cart updates to keep float badge in sync
  window.addEventListener('cart:updated', (e) => {
    const cart = e.detail;
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    
    const floatBadge = document.getElementById('floatBadge');
    if (floatBadge) {
      floatBadge.textContent = count;
    }
  });

  // Close Drawers on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!cartEl.classList.contains('closed')) closeCart();
      if (!notifEl.classList.contains('closed')) closeNotifications();
    }
  });

  // 3. Modal Linkage Triggers
  // Checkout modal view triggers
  window.addEventListener('checkout:start', () => {
    closeCart();
    closeNotifications();

    // Check if user is logged in
    const loggedInUserStr = localStorage.getItem('SWEETOS_logged_in_user');
    if (!loggedInUserStr) {
      window.dispatchEvent(new CustomEvent('toast:show', { detail: '🔒 Veuillez vous connecter pour finaliser votre commande / Please log in to complete your order!' }));
      window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'auth' } }));
      return;
    }

    const checkoutModal = document.getElementById('global-checkout-modal');
    if (checkoutModal) {
      checkoutModal.open();
    }
  });

  // Account settings fallback redirect
  window.addEventListener('account:toggle', () => {
    window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'profile' } }));
  });

  // Initial cart load synchronization
  const initialSaved = localStorage.getItem(getCartStorageKey());
  if (initialSaved) {
    try {
      const parsed = JSON.parse(initialSaved);
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: parsed }));
    } catch (e) {}
  } else {
    setTimeout(() => {
      const saved = localStorage.getItem(getCartStorageKey());
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          window.dispatchEvent(new CustomEvent('cart:updated', { detail: parsed }));
        } catch (e) {}
      }
    }, 150);
  }

  // Listen for user login/logout to update the cart badge count dynamically
  window.addEventListener('auth:changed', () => {
    const saved = localStorage.getItem(getCartStorageKey());
    let parsed = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {}
    }
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: parsed }));
  });

  // Adjust content alignments dynamically on resize
  window.addEventListener('resize', () => {
    if (window.innerWidth > 968) {
      overlay.classList.remove('show');
      if (!cartEl.classList.contains('closed')) {
        mainContent.classList.remove('cart-closed');
      }
    } else {
      if (!cartEl.classList.contains('closed') || !notifEl.classList.contains('closed')) {
        overlay.classList.add('show');
      }
    }
  });

  // Keep drawers CLOSED on initial page load as requested
  closeCart();
  closeNotifications();

  // Floating Back to Top Scroll Button Injection & Logic
  const backToTopBtn = document.createElement('button');
  backToTopBtn.className = 'back-to-top-btn';
  backToTopBtn.id = 'backToTopBtn';
  backToTopBtn.setAttribute('aria-label', 'Back to Top');
  backToTopBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  `;
  document.body.appendChild(backToTopBtn);

  const handleScroll = () => {
    const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
    if (scrollTop > 300) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('scroll', handleScroll, { passive: true });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 5. Dropdown push notification toast on order confirmation
  window.addEventListener('toast:order-placed', (e) => {
    const { orderId, name, total } = e.detail;

    // Create container if it doesn't exist
    let container = document.getElementById('order-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'order-toast-container';
      container.className = 'order-toast-container';
      document.body.appendChild(container);
    }

    // Create toast card
    const toastCard = document.createElement('div');
    toastCard.className = 'order-toast-card';
    toastCard.innerHTML = `
      <div class="order-toast-left-bar"></div>
      <div class="order-toast-icon-wrapper">
        <div class="order-toast-bag-circle">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0052cc" stroke-width="2.5">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        </div>
      </div>
      <div class="order-toast-content">
        <div class="order-toast-header">
          <span class="order-toast-check">📦</span>
          <strong>Order ${orderId} Placed</strong>
        </div>
        <p class="order-toast-body">Thank you ${name}! Your order ${orderId} totaling $${total.toFixed(2)} is confirmed.</p>
        <span class="order-toast-time">Just now</span>
      </div>
      <button class="order-toast-close-btn">&times;</button>
    `;

    container.appendChild(toastCard);

    const closeToast = () => {
      if (toastCard.parentNode) {
        toastCard.classList.add('slide-out');
        setTimeout(() => {
          toastCard.remove();
          if (container.children.length === 0) {
            container.remove();
          }
        }, 400);
      }
    };

    // Close button trigger
    toastCard.querySelector('.order-toast-close-btn').addEventListener('click', closeToast);

    // Auto close after 4 seconds
    setTimeout(closeToast, 4000);
  });

  // Swipe to close gestures for drawers on mobile
  const bindSwipeToClose = (element, closeCallback, direction = 'right') => {
    let startX = 0;
    let startY = 0;

    element.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;

      const diffX = endX - startX;
      const diffY = endY - startY;

      // Swipe right to close (for drawers on the right like cart / notifications)
      if (direction === 'right' && diffX > 80 && Math.abs(diffY) < 100) {
        closeCallback();
      }
      // Swipe left to close (for sidebar drawer on the left)
      if (direction === 'left' && diffX < -80 && Math.abs(diffY) < 100) {
        closeCallback();
      }
      // Swipe down to close (works universally!)
      if (diffY > 80 && Math.abs(diffX) < 100) {
        closeCallback();
      }
    }, { passive: true });
  };

  // --- 🌌 CUSTOM SCREEN MODAL SYSTEM 🌌 ---
  const showCustomScreenModal = (options) => {
    if (document.getElementById('custom-screen-modal')) {
      document.getElementById('custom-screen-modal').remove();
    }

    const modal = document.createElement('div');
    modal.id = 'custom-screen-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(9, 13, 22, 0.4)';
    modal.style.backdropFilter = 'blur(16px)';
    modal.style.webkitBackdropFilter = 'blur(16px)';
    modal.style.zIndex = '100000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '20px';
    modal.style.boxSizing = 'border-box';

    modal.innerHTML = `
      <div style="background: rgba(255, 255, 255, 0.85); border: 1.5px solid rgba(255, 255, 255, 0.5); border-radius: 24px; width: 100%; max-width: 440px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); text-align: center; box-sizing: border-box; display: flex; flex-direction: column; gap: 20px; font-family: 'Outfit', sans-serif;">
        <div style="font-size: 40px;">${options.icon || '🌌'}</div>
        <h3 style="font-size: 20px; font-weight: 850; color: #090d16; margin: 0;">${options.title}</h3>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0;">${options.message}</p>
        <div style="display: flex; gap: 12px; margin-top: 8px; justify-content: center; width: 100%;">
          ${options.cancelLabel ? `
            <button id="screen-modal-cancel" style="flex: 1; background: #e5e7eb; border: 1.5px solid #d1d5db; color: #374151; padding: 12px 20px; border-radius: 12px; font-size: 13.5px; font-weight: 800; cursor: pointer; transition: all 0.2s;">
              ${options.cancelLabel}
            </button>
          ` : ''}
          <button id="screen-modal-ok" style="flex: 1; background: var(--primary); color: white; border: none; padding: 12px 20px; border-radius: 12px; font-size: 13.5px; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px var(--primary-light);">
            ${options.okLabel || 'OK'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
      modal.style.opacity = '0';
      modal.style.transition = 'opacity 0.2s';
      setTimeout(() => modal.remove(), 200);
    };

    if (options.cancelLabel) {
      modal.querySelector('#screen-modal-cancel').addEventListener('click', () => {
        close();
        if (options.onCancel) options.onCancel();
      });
    }

    modal.querySelector('#screen-modal-ok').addEventListener('click', () => {
      close();
      if (options.onOk) options.onOk();
    });
  };

  // 1. Guest User Welcome Dialog
  const loggedInUserStr = localStorage.getItem('SWEETOS_logged_in_user');
  const guestDismissed = sessionStorage.getItem('SWEETOS_guest_welcome_dismissed');
  if (!loggedInUserStr && !guestDismissed) {
    sessionStorage.setItem('SWEETOS_guest_welcome_dismissed', 'true');
    setTimeout(() => {
      showCustomScreenModal({
        icon: '🌌',
        title: 'Welcome to SWEETOS',
        message: 'Welcome to SWEETOS! Login or register to enjoy it fully.',
        okLabel: 'Login / Register',
        cancelLabel: 'Later',
        onOk: () => {
          window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'auth' } }));
        }
      });
    }, 1000);
  }

  // 2. Coupon / Mystery Box Reminder on load
  if (loggedInUserStr) {
    const couponReminderDismissed = sessionStorage.getItem('SWEETOS_coupon_reminder_dismissed');
    if (!couponReminderDismissed) {
      sessionStorage.setItem('SWEETOS_coupon_reminder_dismissed', 'true');
      
      let scratchcards = [];
      try {
        scratchcards = JSON.parse(localStorage.getItem('SWEETOS_user_scratchcards') || '[]');
      } catch(e) {}
      
      let coupons = [];
      try {
        coupons = JSON.parse(localStorage.getItem('SWEETOS_coupons') || '[]');
      } catch(e) {}
      
      const hasUnscratched = scratchcards.some(card => !card.scratched);
      const activeWonCoupons = coupons.filter(c => 
        (c.code.startsWith('LOYAL') || c.code.startsWith('SAVE')) && 
        c.status === 'active'
      );
      
      if (hasUnscratched || activeWonCoupons.length > 0) {
        let discountPercent = 5;
        if (activeWonCoupons.length > 0) {
          discountPercent = Math.max(...activeWonCoupons.map(c => c.value));
        } else {
          const maxAmount = scratchcards.filter(c => !c.scratched).reduce((max, c) => Math.max(max, c.amount), 0);
          if (maxAmount >= 50000) {
            discountPercent = 10;
          }
        }
        
        setTimeout(() => {
          showCustomScreenModal({
            icon: '🎁',
            title: 'Exclusive Rewards Awaiting!',
            message: `Shop now to get ${discountPercent}% off depending on the coupon you have!`,
            okLabel: 'Shop Now',
            cancelLabel: 'Cancel',
            onOk: () => {
              window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'catalog' } }));
            }
          });
        }, 1500);
      }
    }
  }

  // 3. Cart Threshold Upsell Dialog on adding product
  window.addEventListener('cart:add', (e) => {
    const productAdded = e.detail;
    let currentCart = [];
    try {
      currentCart = JSON.parse(localStorage.getItem(getCartStorageKey()) || '[]');
    } catch(err) {}
    
    const existing = currentCart.find(item => item.id === productAdded.id);
    const addedQty = existing ? existing.quantity + 1 : 1;
    
    let subtotal = 0;
    currentCart.forEach(item => {
      if (item.id === productAdded.id) {
        subtotal += parseFloat(item.price) * addedQty;
      } else {
        subtotal += parseFloat(item.price) * item.quantity;
      }
    });
    if (!existing) {
      subtotal += parseFloat(productAdded.price);
    }
    
    if (subtotal < 30000) {
      const todayStr = new Date().toDateString();
      const lastShown = localStorage.getItem('SWEETOS_cart_upsell_last_shown');
      if (lastShown === todayStr) {
        return; // Do not show again today
      }

      const needed = 30000 - subtotal;
      setTimeout(() => {
        // Mark as shown today immediately when triggered
        localStorage.setItem('SWEETOS_cart_upsell_last_shown', todayStr);
        showCustomScreenModal({
          icon: '🛒',
          title: 'Offre Spéciale / Special Offer',
          message: `Ajoutez encore ${needed.toLocaleString()} CFA pour atteindre 30 000 CFA et débloquer une boîte mystère à la livraison ! Ne ratez pas cette opportunité.`,
          okLabel: 'Continuer mes achats / Shop More',
          cancelLabel: 'Fermer / Close'
        });
      }, 500);
    }
  });

  bindSwipeToClose(cartEl, closeCart, 'right');
  bindSwipeToClose(notifEl, closeNotifications, 'right');
  bindSwipeToClose(sidebarEl, closeSidebarMobile, 'left');
});
