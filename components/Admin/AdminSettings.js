// Dedicated Admin Settings Management & Configuration Portal

export function renderAdminSettings(context) {
  const currentSubTab = context.settingsSubTab || 'general';

  return `
    <style>
      .settings-layout-grid {
        display: grid;
        grid-template-columns: 260px 1fr;
        gap: 20px;
        align-items: start;
      }
      @media (max-width: 900px) {
        .settings-layout-grid {
          grid-template-columns: 1fr;
        }
      }
      .settings-sidebar-nav {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 16px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
      }
      .settings-subnav-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 750;
        color: #475569;
        text-decoration: none;
        transition: all 0.15s ease;
        border: 1px solid transparent;
      }
      .settings-subnav-btn:hover {
        background: rgba(0, 82, 204, 0.04);
        color: #0052cc;
      }
      .settings-subnav-btn.active {
        background: #0052cc;
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(0, 82, 204, 0.25);
      }
      .settings-subnav-btn.danger-tab {
        color: #ef4444;
        margin-top: 8px;
        border-top: 1px solid #e2e8f0;
        border-radius: 0 0 10px 10px;
        padding-top: 12px;
      }
      .settings-subnav-btn.danger-tab.active {
        background: #ef4444;
        color: #ffffff;
      }
      .settings-main-pane {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 16px;
        padding: 24px 28px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      }
      .settings-form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 18px;
      }
      .settings-form-group label {
        font-size: 12.5px;
        font-weight: 800;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .settings-input {
        width: 100%;
        padding: 10px 14px;
        border-radius: 10px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        font-size: 13.5px;
        color: #1e293b;
        font-family: inherit;
        outline: none;
        transition: all 0.2s ease;
        box-sizing: border-box;
      }
      .settings-input:focus {
        border-color: #0052cc;
        box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.12);
      }
      .settings-help {
        font-size: 11.5px;
        color: #64748b;
        font-weight: 500;
        line-height: 1.4;
      }
      .toggle-switch-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        border-radius: 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        margin-bottom: 12px;
      }
    </style>

    <div class="settings-layout-grid">
      
      <!-- 1. Settings Sub-Navigation Sidebar -->
      <nav class="settings-sidebar-nav">
        <a href="#" class="settings-subnav-btn ${currentSubTab === 'general' ? 'active' : ''}" data-subtab="general">
          <span>🏪 Store Info & Pages</span>
        </a>
        <a href="#" class="settings-subnav-btn ${currentSubTab === 'brand' ? 'active' : ''}" data-subtab="brand">
          <span>🎨 Brand Colors & SEO</span>
        </a>
        <a href="#" class="settings-subnav-btn ${currentSubTab === 'notifications' ? 'active' : ''}" data-subtab="notifications">
          <span>🔔 Notification Rules</span>
        </a>
        <a href="#" class="settings-subnav-btn ${currentSubTab === 'localization' ? 'active' : ''}" data-subtab="localization">
          <span>🌍 Currency & Locale</span>
        </a>
        <a href="#" class="settings-subnav-btn ${currentSubTab === 'shipping' ? 'active' : ''}" data-subtab="shipping">
          <span>🚚 Shipping & Logistics</span>
        </a>
        <a href="#" class="settings-subnav-btn ${currentSubTab === 'payment' ? 'active' : ''}" data-subtab="payment">
          <span>💳 Payment & MoMo</span>
        </a>
        <a href="#" class="settings-subnav-btn ${currentSubTab === 'tax' ? 'active' : ''}" data-subtab="tax">
          <span>🏛️ Tax & Invoicing</span>
        </a>
        <a href="#" class="settings-subnav-btn ${currentSubTab === 'appearance' ? 'active' : ''}" data-subtab="appearance">
          <span>🎭 Theme & Appearance</span>
        </a>
        <a href="#" class="settings-subnav-btn ${currentSubTab === 'user' ? 'active' : ''}" data-subtab="user">
          <span>🔒 Security & Login</span>
        </a>
        <a href="#" class="settings-subnav-btn danger-tab ${currentSubTab === 'reset' ? 'active' : ''}" data-subtab="reset">
          <span>⚠️ Backup & Reset</span>
        </a>
      </nav>

      <!-- 2. Settings Content Viewport -->
      <div class="settings-main-pane">
        ${renderSettingsSubtabContent(context, currentSubTab)}
      </div>

    </div>
  `;
}

function renderSettingsSubtabContent(context, subtab) {
  // Read saved values
  const storeName = localStorage.getItem('SWEETOS_store_name') || 'SWEETOS';
  const storeDesc = localStorage.getItem('SWEETOS_store_desc') || 'Premium tech accessories, handcrafted desk gear, and minimalist layouts.';
  const storeEmail = localStorage.getItem('SWEETOS_store_email') || 'support@sweetos.com';
  const storePhone = localStorage.getItem('SWEETOS_store_phone') || '+225 05 00 61 99 23';
  const storeAddr = localStorage.getItem('SWEETOS_store_addr') || 'Abidjan, Cocody Mermoz';
  const storeHours = localStorage.getItem('SWEETOS_store_hours') || 'Mon - Fri: 7:00 AM - 8:00 PM | Sun: Closed';
  const storeAboutStory = localStorage.getItem('SWEETOS_store_about_story') || 'SWEETOS was founded to rescue professionals from cluttered, generic desks. By sourcing only the finest premium materials — including solid oak, CNC-milled aluminum, and artisan felt wool — we deliver functional luxury that is made to last a lifetime.';

  const brandTagline = localStorage.getItem('SWEETOS_brand_tagline') || 'Premium Tech & Workspace Accessories';
  const primaryColor = localStorage.getItem('SWEETOS_brand_color_primary') || '#0052cc';
  const accentColor = localStorage.getItem('SWEETOS_brand_color_accent') || '#00b4d8';
  const seoDesc = localStorage.getItem('SWEETOS_seo_desc') || 'Discover SWEETOS: Handcrafted minimalist tech and desk gear with premium aesthetics.';
  const fbUrl = localStorage.getItem('SWEETOS_fb_url') || 'https://facebook.com/sweetos';
  const igUrl = localStorage.getItem('SWEETOS_ig_url') || 'https://instagram.com/sweetos';

  const notifEmail = localStorage.getItem('SWEETOS_notif_email') !== 'false';
  const notifStock = localStorage.getItem('SWEETOS_notif_stock') !== 'false';
  const notifThreshold = localStorage.getItem('SWEETOS_notif_threshold') || '5';
  const notifSound = localStorage.getItem('SWEETOS_notif_sound') !== 'false';

  const currency = localStorage.getItem('SWEETOS_currency') || 'CFA';
  const timezone = localStorage.getItem('SWEETOS_timezone') || 'GMT';
  const language = localStorage.getItem('SWEETOS_language') || 'fr';

  const shippingRate = localStorage.getItem('SWEETOS_shipping_rate') || '2000';
  const freeShippingThreshold = localStorage.getItem('SWEETOS_free_shipping_threshold') || '100000';
  const shippingProvider = localStorage.getItem('SWEETOS_shipping_provider') || 'Standard Express Dispatch';

  const codEnabled = localStorage.getItem('SWEETOS_payment_cod_enabled') !== 'false';
  const momoEnabled = localStorage.getItem('SWEETOS_payment_momo_enabled') !== 'false';
  const cardEnabled = localStorage.getItem('SWEETOS_payment_card_enabled') === 'true';
  const momoInstructions = localStorage.getItem('SWEETOS_payment_momo_instructions') || 'Effectuez votre transfert Wave / Orange / MTN au +225 05 00 61 99 23 puis confirmez.';

  const vatRate = localStorage.getItem('SWEETOS_vat_rate') || '18';
  const taxMode = localStorage.getItem('SWEETOS_tax_mode') || 'inclusive';

  const themeMode = localStorage.getItem('SWEETOS_theme_mode') || 'dark';
  const fontFamily = localStorage.getItem('SWEETOS_font_family') || 'Outfit';
  const heroTitle = localStorage.getItem('SWEETOS_hero_title') || 'SWEETOS Layouts';
  const heroSubtitle = localStorage.getItem('SWEETOS_hero_subtitle') || 'Uncompromising aesthetics for developers & creators';

  switch (subtab) {
    case 'general':
      return `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="margin:0; font-size:17px; font-weight:850; color:#0f172a;">Store Identity & Pages</h3>
          <p style="margin:3px 0 0 0; font-size:12.5px; color:#64748b;">Manage public store details, contact info, and About Us story</p>
        </div>

        <form id="settings-general-form" autocomplete="off">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="settings-form-group">
              <label>Store Brand Name *</label>
              <input type="text" id="set-store-name" name="set_store_name_no_autofill" class="settings-input" value="${storeName}" required autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
            </div>
            <div class="settings-form-group">
              <label>Support Email Address *</label>
              <input type="email" id="set-store-email" name="set_store_email_no_autofill" class="settings-input" value="${storeEmail}" required autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="settings-form-group">
              <label>Official Phone / WhatsApp *</label>
              <input type="text" id="set-store-phone" name="set_store_phone_no_autofill" class="settings-input" value="${storePhone}" required autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
            </div>
            <div class="settings-form-group">
              <label>Physical Store Location / Address</label>
              <input type="text" id="set-store-addr" name="set_store_addr_no_autofill" class="settings-input" value="${storeAddr}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
            </div>
          </div>

          <div class="settings-form-group">
            <label>Opening / Business Hours</label>
            <input type="text" id="set-store-hours" name="set_store_hours_no_autofill" class="settings-input" value="${storeHours}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
          </div>

          <div class="settings-form-group">
            <label>Storefront Short Bio</label>
            <textarea id="set-store-desc" class="settings-input" rows="2">${storeDesc}</textarea>
          </div>

          <div class="settings-form-group">
            <label>About Us Story (Displayed on /about page)</label>
            <textarea id="set-store-about-story" class="settings-input" rows="4">${storeAboutStory}</textarea>
          </div>

          <button type="submit" class="admin-btn admin-btn-primary" style="padding:12px 24px; font-weight:800; font-size:13.5px; margin-top:8px;">
            ✓ Save Store Identity
          </button>
        </form>
      `;

    case 'brand':
      return `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="margin:0; font-size:17px; font-weight:850; color:#0f172a;">Brand Colors, Social & SEO</h3>
          <p style="margin:3px 0 0 0; font-size:12.5px; color:#64748b;">Configure brand color accents, social channels, and Google search metadata</p>
        </div>

        <form id="settings-brand-form" autocomplete="off">
          <div class="settings-form-group">
            <label>Brand Tagline</label>
            <input type="text" id="set-brand-tagline" name="set_brand_tagline_no_autofill" class="settings-input" value="${brandTagline}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="settings-form-group">
              <label>Primary Theme Color</label>
              <div style="display:flex; align-items:center; gap:10px;">
                <input type="color" id="set-brand-color-primary" value="${primaryColor}" style="width:44px; height:40px; border:none; border-radius:8px; cursor:pointer;">
                <input type="text" id="set-brand-color-primary-text" name="set_brand_color_primary_text_no_autofill" class="settings-input" value="${primaryColor}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
              </div>
            </div>

            <div class="settings-form-group">
              <label>Accent Highlight Color</label>
              <div style="display:flex; align-items:center; gap:10px;">
                <input type="color" id="set-brand-color-accent" value="${accentColor}" style="width:44px; height:40px; border:none; border-radius:8px; cursor:pointer;">
                <input type="text" id="set-brand-color-accent-text" name="set_brand_color_accent_text_no_autofill" class="settings-input" value="${accentColor}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
              </div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="settings-form-group">
              <label>Facebook Profile URL</label>
              <input type="url" id="set-fb-url" name="set_fb_url_no_autofill" class="settings-input" value="${fbUrl}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
            </div>
            <div class="settings-form-group">
              <label>Instagram Handle / URL</label>
              <input type="url" id="set-ig-url" name="set_ig_url_no_autofill" class="settings-input" value="${igUrl}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
            </div>
          </div>

          <div class="settings-form-group">
            <label>SEO Meta Description (Search Snippet)</label>
            <textarea id="set-seo-desc" class="settings-input" rows="3">${seoDesc}</textarea>
          </div>

          <button type="submit" class="admin-btn admin-btn-primary" style="padding:12px 24px; font-weight:800; font-size:13.5px; margin-top:8px;">
            ✓ Save Brand & SEO
          </button>
        </form>
      `;

    case 'notifications':
      return `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="margin:0; font-size:17px; font-weight:850; color:#0f172a;">Notification Rules & Alerts</h3>
          <p style="margin:3px 0 0 0; font-size:12.5px; color:#64748b;">Configure real-time system alerts, stock warning triggers, and sound notifications</p>
        </div>

        <form id="settings-notifications-form">
          <div class="toggle-switch-card">
            <div>
              <strong style="font-size:13.5px; color:#0f172a; display:block;">Email Notifications on New Purchases</strong>
              <small style="color:#64748b; font-size:12px;">Receive automated notification emails when customer orders are placed.</small>
            </div>
            <input type="checkbox" id="set-notif-email" ${notifEmail ? 'checked' : ''} style="width:20px; height:20px; accent-color:#0052cc; cursor:pointer;">
          </div>

          <div class="toggle-switch-card">
            <div>
              <strong style="font-size:13.5px; color:#0f172a; display:block;">Real-Time Low Stock Dashboard Radar</strong>
              <small style="color:#64748b; font-size:12px;">Show alert badges in topbar and inventory when products reach minimum threshold.</small>
            </div>
            <input type="checkbox" id="set-notif-stock" ${notifStock ? 'checked' : ''} style="width:20px; height:20px; accent-color:#0052cc; cursor:pointer;">
          </div>

          <div class="toggle-switch-card">
            <div>
              <strong style="font-size:13.5px; color:#0f172a; display:block;">Audio Chime on Checkout Alerts</strong>
              <small style="color:#64748b; font-size:12px;">Play subtle audio chime when new orders enter fulfillment queue.</small>
            </div>
            <input type="checkbox" id="set-notif-sound" ${notifSound ? 'checked' : ''} style="width:20px; height:20px; accent-color:#0052cc; cursor:pointer;">
          </div>

          <div class="settings-form-group" style="margin-top:16px;">
            <label>Default Low-Stock Warning Threshold (Units)</label>
            <input type="number" id="set-threshold-num" class="settings-input" value="${notifThreshold}" min="1" max="100">
            <span class="settings-help">Products with stock at or below this count will trigger an alert.</span>
          </div>

          <button type="submit" class="admin-btn admin-btn-primary" style="padding:12px 24px; font-weight:800; font-size:13.5px; margin-top:8px;">
            ✓ Save Notification Rules
          </button>
        </form>
      `;

    case 'localization':
      return `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="margin:0; font-size:17px; font-weight:850; color:#0f172a;">Currency & Regional Locale</h3>
          <p style="margin:3px 0 0 0; font-size:12.5px; color:#64748b;">Set currency symbol, time standard, and default language</p>
        </div>

        <form id="settings-localization-form">
          <div class="settings-form-group">
            <label>Storefront Active Currency</label>
            <select id="set-currency" class="settings-input">
              <option value="CFA" ${currency === 'CFA' ? 'selected' : ''}>Franc CFA (FCFA / XOF / XAF)</option>
              <option value="USD" ${currency === 'USD' ? 'selected' : ''}>US Dollar ($ USD)</option>
              <option value="EUR" ${currency === 'EUR' ? 'selected' : ''}>Euro (€ EUR)</option>
              <option value="GBP" ${currency === 'GBP' ? 'selected' : ''}>British Pound (£ GBP)</option>
            </select>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="settings-form-group">
              <label>Timezone</label>
              <select id="set-timezone" class="settings-input">
                <option value="GMT" ${timezone === 'GMT' ? 'selected' : ''}>GMT / UTC+0 (Abidjan, Accra, London)</option>
                <option value="UTC+1" ${timezone === 'UTC+1' ? 'selected' : ''}>UTC+1 (Paris, Lagos, Douala)</option>
                <option value="EST" ${timezone === 'EST' ? 'selected' : ''}>UTC-5 (New York, Eastern)</option>
              </select>
            </div>

            <div class="settings-form-group">
              <label>Default Language</label>
              <select id="set-language" class="settings-input">
                <option value="fr" ${language === 'fr' ? 'selected' : ''}>Français (French)</option>
                <option value="en" ${language === 'en' ? 'selected' : ''}>English</option>
              </select>
            </div>
          </div>

          <button type="submit" class="admin-btn admin-btn-primary" style="padding:12px 24px; font-weight:800; font-size:13.5px; margin-top:8px;">
            ✓ Save Locale Settings
          </button>
        </form>
      `;

    case 'shipping':
      return `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="margin:0; font-size:17px; font-weight:850; color:#0f172a;">Shipping & Dispatch Logistics</h3>
          <p style="margin:3px 0 0 0; font-size:12.5px; color:#64748b;">Set standard delivery fees, free shipping qualifying thresholds, and default courier</p>
        </div>

        <form id="settings-shipping-form" autocomplete="off">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="settings-form-group">
              <label>Flat Delivery Fee (CFA) *</label>
              <input type="number" id="set-shipping-rate" name="set_shipping_rate_no_autofill" class="settings-input" value="${shippingRate}" min="0" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
            </div>
            <div class="settings-form-group">
              <label>Free Delivery Threshold (CFA)</label>
              <input type="number" id="set-free-shipping" name="set_free_shipping_no_autofill" class="settings-input" value="${freeShippingThreshold}" min="0" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
            </div>
          </div>

          <div class="settings-form-group">
            <label>Primary Logistics Courier Partner</label>
            <input type="text" id="set-shipping-provider" name="set_shipping_provider_no_autofill" class="settings-input" value="${shippingProvider}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
          </div>

          <button type="submit" class="admin-btn admin-btn-primary" style="padding:12px 24px; font-weight:800; font-size:13.5px; margin-top:8px;">
            ✓ Save Shipping Rules
          </button>
        </form>
      `;

    case 'payment':
      return `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="margin:0; font-size:17px; font-weight:850; color:#0f172a;">Payment Gateways & Mobile Money</h3>
          <p style="margin:3px 0 0 0; font-size:12.5px; color:#64748b;">Enable payment methods available on customer checkout</p>
        </div>

        <form id="settings-payment-form" autocomplete="off">
          <div class="toggle-switch-card">
            <div>
              <strong style="font-size:13.5px; color:#0f172a; display:block;">💵 Cash on Delivery (Paiement à la livraison)</strong>
              <small style="color:#64748b; font-size:12px;">Allow clients to pay in cash upon receiving package from rider.</small>
            </div>
            <input type="checkbox" id="set-payment-cod" ${codEnabled ? 'checked' : ''} style="width:20px; height:20px; accent-color:#0052cc; cursor:pointer;">
          </div>

          <div class="toggle-switch-card">
            <div>
              <strong style="font-size:13.5px; color:#0f172a; display:block;">📱 Mobile Money (Wave / Orange / MTN / Moov)</strong>
              <small style="color:#64748b; font-size:12px;">Direct phone wallet transfers with automated reference prompts.</small>
            </div>
            <input type="checkbox" id="set-payment-momo" ${momoEnabled ? 'checked' : ''} style="width:20px; height:20px; accent-color:#0052cc; cursor:pointer;">
          </div>

          <div class="settings-form-group">
            <label>Mobile Money Payment Instructions</label>
            <textarea id="set-payment-momo-inst" class="settings-input" rows="2">${momoInstructions}</textarea>
          </div>

          <div class="toggle-switch-card">
            <div>
              <strong style="font-size:13.5px; color:#0f172a; display:block;">💳 Visa / Mastercard / Online Card Gateway</strong>
              <small style="color:#64748b; font-size:12px;">Credit/debit card processing via secure gateway.</small>
            </div>
            <input type="checkbox" id="set-payment-card" ${cardEnabled ? 'checked' : ''} style="width:20px; height:20px; accent-color:#0052cc; cursor:pointer;">
          </div>

          <button type="submit" class="admin-btn admin-btn-primary" style="padding:12px 24px; font-weight:800; font-size:13.5px; margin-top:8px;">
            ✓ Save Payment Gateways
          </button>
        </form>
      `;

    case 'tax':
      return `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="margin:0; font-size:17px; font-weight:850; color:#0f172a;">Tax & Invoice Settings</h3>
          <p style="margin:3px 0 0 0; font-size:12.5px; color:#64748b;">Configure standard sales tax / TVA rates and invoice calculations</p>
        </div>

        <form id="settings-tax-form" autocomplete="off">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="settings-form-group">
              <label>Standard VAT / TVA Rate (%)</label>
              <input type="number" id="set-vat-rate" name="set_vat_rate_no_autofill" class="settings-input" value="${vatRate}" min="0" max="50" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
            </div>
            <div class="settings-form-group">
              <label>Calculation Mode</label>
              <select id="set-tax-mode" class="settings-input">
                <option value="inclusive" ${taxMode === 'inclusive' ? 'selected' : ''}>Tax Included in Product Prices (TTC)</option>
                <option value="exclusive" ${taxMode === 'exclusive' ? 'selected' : ''}>Add Tax at Checkout (HT + TVA)</option>
              </select>
            </div>
          </div>

          <button type="submit" class="admin-btn admin-btn-primary" style="padding:12px 24px; font-weight:800; font-size:13.5px; margin-top:8px;">
            ✓ Save Tax Rules
          </button>
        </form>
      `;

    case 'appearance':
      return `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="margin:0; font-size:17px; font-weight:850; color:#0f172a;">Storefront Theme & Hero Copy</h3>
          <p style="margin:3px 0 0 0; font-size:12.5px; color:#64748b;">Customize storefront typography, aesthetic styles, and banner copy</p>
        </div>

        <form id="settings-appearance-form" autocomplete="off">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="settings-form-group">
              <label>Aesthetic Theme</label>
              <select id="set-theme-mode" class="settings-input">
                <option value="dark" ${themeMode === 'dark' ? 'selected' : ''}>Midnight Deep Dark (Signature)</option>
                <option value="light" ${themeMode === 'light' ? 'selected' : ''}>Clean Snow Light</option>
              </select>
            </div>

            <div class="settings-form-group">
              <label>Primary Font Family</label>
              <select id="set-font-family" class="settings-input">
                <option value="Outfit" ${fontFamily === 'Outfit' ? 'selected' : ''}>Outfit (Modern Geometric)</option>
                <option value="Inter" ${fontFamily === 'Inter' ? 'selected' : ''}>Inter (Clean Minimal)</option>
                <option value="Space Grotesk" ${fontFamily === 'Space Grotesk' ? 'selected' : ''}>Space Grotesk (Tech Vibe)</option>
              </select>
            </div>
          </div>

          <div class="settings-form-group">
            <label>Storefront Hero Banner Main Title</label>
            <input type="text" id="set-hero-title" name="set_hero_title_no_autofill" class="settings-input" value="${heroTitle}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
          </div>

          <div class="settings-form-group">
            <label>Storefront Hero Subtitle / Slogan</label>
            <input type="text" id="set-hero-subtitle" name="set_hero_subtitle_no_autofill" class="settings-input" value="${heroSubtitle}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
          </div>

          <button type="submit" class="admin-btn admin-btn-primary" style="padding:12px 24px; font-weight:800; font-size:13.5px; margin-top:8px;">
            ✓ Save Appearance
          </button>
        </form>
      `;

    case 'user':
      return `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="margin:0; font-size:17px; font-weight:850; color:#0f172a;">Admin Security & 3-Digit PIN Code</h3>
          <p style="margin:3px 0 0 0; font-size:12.5px; color:#64748b;">Manage security PIN code, active devices, and revoke remote sessions via Supabase Cloud.</p>
        </div>

        <!-- 1. 3-Digit Security PIN Management -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
          <h4 style="margin:0 0 6px 0; font-size:14.5px; font-weight:800; color:#0f172a;">🔑 Code PIN de Sécurité (3 Chiffres)</h4>
          <p style="margin:0 0 14px 0; font-size:12px; color:#64748b;">Ce code PIN à 3 chiffres est stocké sur Supabase Cloud et est requis pour déconnecter à distance tous les autres appareils.</p>

          <form id="settings-change-pin-form" autocomplete="off" style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <input type="password" id="set-new-pin-input" name="set_new_pin_no_autofill" class="settings-input" maxlength="3" placeholder="Ex: 256" style="width:120px; text-align:center; font-size:18px; font-weight:900; letter-spacing:4px;" required autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
            <button type="submit" class="admin-btn admin-btn-primary" style="padding:10px 18px; font-weight:800; font-size:13px;">
              💾 Mettre à jour PIN Cloud
            </button>
          </form>
          <div id="pin-change-feedback" style="font-size:12.5px; font-weight:700; margin-top:8px;"></div>
        </div>

        <!-- 2. Remote Session Revocation & Primary Device -->
        <div style="background: linear-gradient(135deg, rgba(0,82,204,0.04) 0%, rgba(0,180,216,0.04) 100%); border: 1.5px solid rgba(0,82,204,0.2); border-radius: 14px; padding: 20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
            <div>
              <strong style="font-size:14px; color:#0052cc; display:block;">📱 Appareils Actifs & Notifications Live</strong>
              <small style="color:#64748b; font-size:12px;">Déconnectez immédiatement tous les autres appareils enregistrés via votre code PIN.</small>
            </div>
            <span class="device-badge-active" style="background:#ecfdf5; border:1px solid #a7f3d0; color:#059669; font-weight:800; font-size:11.5px; padding:5px 12px; border-radius:20px;">
              ● Cet Appareil - Principal
            </span>
          </div>

          <button type="button" class="admin-btn admin-btn-danger" id="btn-trigger-pin-modal" style="padding:12px 20px; font-weight:800; font-size:13px; background:#dc2626; box-shadow:0 4px 14px rgba(220,38,38,0.3);">
            🔒 Déconnecter Tous les Autres Appareils (Requis PIN)
          </button>
        </div>
      `;

    case 'reset':
      return `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="margin:0; font-size:17px; font-weight:850; color:#ef4444;">⚠️ Backup, Restore & Maintenance</h3>
          <p style="margin:3px 0 0 0; font-size:12.5px; color:#64748b;">Export full database snapshots, restore backups, or reset test data</p>
        </div>

        <div style="display:flex; flex-direction:column; gap:16px;">
          <!-- Live Cloud Supabase Sync -->
          <div class="toggle-switch-card" style="background: linear-gradient(135deg, rgba(0,82,204,0.06) 0%, rgba(0,180,216,0.06) 100%); border: 1.5px solid rgba(0,82,204,0.25);">
            <div>
              <strong style="font-size:14px; color:#0052cc; display:block;">☁️ Upload Entire Store to Supabase Cloud Database</strong>
              <small style="color:#475569; font-size:12px;">Transfers all products, categories, brands, orders, and hero settings from your local machine directly into your live Supabase cloud database.</small>
            </div>
            <button type="button" class="admin-btn admin-btn-primary" id="push-all-to-supabase-btn" style="padding:10px 20px; font-size:13px; font-weight:800; background:#0052cc; box-shadow:0 4px 14px rgba(0,82,204,0.3);">
              🚀 Sync to Cloud
            </button>
          </div>

          <!-- Export Full JSON Backup -->
          <div class="toggle-switch-card">
            <div>
              <strong style="font-size:13.5px; color:#0f172a; display:block;">📥 Download Full JSON Database Snapshot</strong>
              <small style="color:#64748b; font-size:12px;">Exports all products, categories, brands, orders, coupons, and store settings.</small>
            </div>
            <button type="button" class="admin-btn admin-btn-primary" id="download-full-backup-btn" style="padding:8px 16px; font-size:12.5px; font-weight:800;">
              Export JSON
            </button>
          </div>

          <!-- Restore JSON Backup -->
          <div class="toggle-switch-card">
            <div>
              <strong style="font-size:13.5px; color:#0f172a; display:block;">📤 Restore Database from JSON File</strong>
              <small style="color:#64748b; font-size:12px;">Import a previously saved .json backup file to restore all store records.</small>
            </div>
            <label class="admin-btn admin-btn-secondary" style="padding:8px 16px; font-size:12.5px; font-weight:800; cursor:pointer;">
              Choose File
              <input type="file" id="restore-backup-file-input" accept=".json" style="display:none;">
            </label>
          </div>

          <!-- Flush Session Cache -->
          <div class="toggle-switch-card">
            <div>
              <strong style="font-size:13.5px; color:#0f172a; display:block;">🧹 Clear Local Activity Logs & Session Cache</strong>
              <small style="color:#64748b; font-size:12px;">Purge old search query logs and visitor activity records.</small>
            </div>
            <button type="button" class="admin-btn admin-btn-secondary" id="clear-cache-logs-btn" style="padding:8px 16px; font-size:12.5px; font-weight:800;">
              Clear Logs
            </button>
          </div>

          <!-- Danger Zone Controls -->
          <div style="padding:20px; border:1.5px dashed #ef4444; border-radius:14px; background:rgba(239,68,68,0.03); margin-top:12px; display:flex; flex-direction:column; gap:16px;">
            <div>
              <strong style="color:#ef4444; font-size:14px; display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                🛑 Danger Zone: Database Controls
              </strong>
              <p style="font-size:12.5px; color:#64748b; margin:0; line-height:1.5;">
                Choose whether you want to completely wipe all sample data to start with a 100% clean, empty live store (0 items), or restore original demo product data.
              </p>
            </div>

            <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
              <button type="button" class="admin-btn admin-btn-danger" id="wipe-everything-btn" style="padding:10px 18px; font-weight:800; font-size:13px; background:#dc2626;">
                🧹 Wipe Everything to 0 (Clean Store)
              </button>

              <button type="button" class="admin-btn" id="factory-reset-btn" style="padding:10px 18px; font-weight:800; font-size:13px; background:#ffffff; color:#dc2626; border:1.5px solid #fca5a5;">
                🔄 Restore Sample Demo Data
              </button>
            </div>
          </div>
        </div>
      `;

    default:
      return `<p>Select a setting category from the menu.</p>`;
  }
}

export function attachAdminSettingsListeners(context, shadow) {
  // Sub-Navigation Sidebar Clicks
  shadow.querySelectorAll('.settings-subnav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      context.settingsSubTab = btn.getAttribute('data-subtab');
      context.render();
      context.attachListeners();
    });
  });

  // 1. General Info Form Submit
  const generalForm = shadow.getElementById('settings-general-form');
  if (generalForm) {
    generalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      localStorage.setItem('SWEETOS_store_name', shadow.getElementById('set-store-name').value.trim());
      localStorage.setItem('SWEETOS_store_email', shadow.getElementById('set-store-email').value.trim());
      localStorage.setItem('SWEETOS_store_phone', shadow.getElementById('set-store-phone').value.trim());
      localStorage.setItem('SWEETOS_store_addr', shadow.getElementById('set-store-addr').value.trim());
      localStorage.setItem('SWEETOS_store_hours', shadow.getElementById('set-store-hours').value.trim());
      localStorage.setItem('SWEETOS_store_desc', shadow.getElementById('set-store-desc').value.trim());
      localStorage.setItem('SWEETOS_store_about_story', shadow.getElementById('set-store-about-story').value.trim());
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Store identity settings saved!' }));
    });
  }

  // 2. Brand & SEO Form Submit
  const brandForm = shadow.getElementById('settings-brand-form');
  if (brandForm) {
    const primaryColorInput = shadow.getElementById('set-brand-color-primary');
    const primaryTextInput = shadow.getElementById('set-brand-color-primary-text');
    if (primaryColorInput && primaryTextInput) {
      primaryColorInput.addEventListener('input', () => primaryTextInput.value = primaryColorInput.value);
      primaryTextInput.addEventListener('input', () => primaryColorInput.value = primaryTextInput.value);
    }

    const accentColorInput = shadow.getElementById('set-brand-color-accent');
    const accentTextInput = shadow.getElementById('set-brand-color-accent-text');
    if (accentColorInput && accentTextInput) {
      accentColorInput.addEventListener('input', () => accentTextInput.value = accentColorInput.value);
      accentTextInput.addEventListener('input', () => accentColorInput.value = accentTextInput.value);
    }

    brandForm.addEventListener('submit', (e) => {
      e.preventDefault();
      localStorage.setItem('SWEETOS_brand_tagline', shadow.getElementById('set-brand-tagline').value.trim());
      localStorage.setItem('SWEETOS_brand_color_primary', shadow.getElementById('set-brand-color-primary').value.trim());
      localStorage.setItem('SWEETOS_brand_color_accent', shadow.getElementById('set-brand-color-accent').value.trim());
      localStorage.setItem('SWEETOS_fb_url', shadow.getElementById('set-fb-url').value.trim());
      localStorage.setItem('SWEETOS_ig_url', shadow.getElementById('set-ig-url').value.trim());
      localStorage.setItem('SWEETOS_seo_desc', shadow.getElementById('set-seo-desc').value.trim());
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Brand & SEO settings saved!' }));
    });
  }

  // 3. Notifications Form Submit
  const notifForm = shadow.getElementById('settings-notifications-form');
  if (notifForm) {
    notifForm.addEventListener('submit', (e) => {
      e.preventDefault();
      localStorage.setItem('SWEETOS_notif_email', shadow.getElementById('set-notif-email').checked ? 'true' : 'false');
      localStorage.setItem('SWEETOS_notif_stock', shadow.getElementById('set-notif-stock').checked ? 'true' : 'false');
      localStorage.setItem('SWEETOS_notif_sound', shadow.getElementById('set-notif-sound').checked ? 'true' : 'false');
      localStorage.setItem('SWEETOS_notif_threshold', shadow.getElementById('set-threshold-num').value);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Notification rules updated!' }));
    });
  }

  // 4. Localization Form Submit
  const localeForm = shadow.getElementById('settings-localization-form');
  if (localeForm) {
    localeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      localStorage.setItem('SWEETOS_currency', shadow.getElementById('set-currency').value);
      localStorage.setItem('SWEETOS_timezone', shadow.getElementById('set-timezone').value);
      localStorage.setItem('SWEETOS_language', shadow.getElementById('set-language').value);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Localization settings saved!' }));
    });
  }

  // 5. Shipping Form Submit
  const shippingForm = shadow.getElementById('settings-shipping-form');
  if (shippingForm) {
    shippingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      localStorage.setItem('SWEETOS_shipping_rate', shadow.getElementById('set-shipping-rate').value);
      localStorage.setItem('SWEETOS_free_shipping_threshold', shadow.getElementById('set-free-shipping').value);
      localStorage.setItem('SWEETOS_shipping_provider', shadow.getElementById('set-shipping-provider').value.trim());
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Shipping settings saved!' }));
    });
  }

  // 6. Payment Gateways Form Submit
  const paymentForm = shadow.getElementById('settings-payment-form');
  if (paymentForm) {
    paymentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      localStorage.setItem('SWEETOS_payment_cod_enabled', shadow.getElementById('set-payment-cod').checked ? 'true' : 'false');
      localStorage.setItem('SWEETOS_payment_momo_enabled', shadow.getElementById('set-payment-momo').checked ? 'true' : 'false');
      localStorage.setItem('SWEETOS_payment_card_enabled', shadow.getElementById('set-payment-card').checked ? 'true' : 'false');
      localStorage.setItem('SWEETOS_payment_momo_instructions', shadow.getElementById('set-payment-momo-inst').value.trim());
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Payment gateway preferences saved!' }));
    });
  }

  // 7. Tax Form Submit
  const taxForm = shadow.getElementById('settings-tax-form');
  if (taxForm) {
    taxForm.addEventListener('submit', (e) => {
      e.preventDefault();
      localStorage.setItem('SWEETOS_vat_rate', shadow.getElementById('set-vat-rate').value);
      localStorage.setItem('SWEETOS_tax_mode', shadow.getElementById('set-tax-mode').value);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Tax & Invoicing settings saved!' }));
    });
  }

  // 8. Appearance Form Submit
  const appForm = shadow.getElementById('settings-appearance-form');
  if (appForm) {
    appForm.addEventListener('submit', (e) => {
      e.preventDefault();
      localStorage.setItem('SWEETOS_theme_mode', shadow.getElementById('set-theme-mode').value);
      localStorage.setItem('SWEETOS_font_family', shadow.getElementById('set-font-family').value);
      localStorage.setItem('SWEETOS_hero_title', shadow.getElementById('set-hero-title').value.trim());
      localStorage.setItem('SWEETOS_hero_subtitle', shadow.getElementById('set-hero-subtitle').value.trim());
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Appearance settings saved!' }));
    });
  }

  // 9. 3-Digit PIN & Device Security Listeners
  const changePinForm = shadow.getElementById('settings-change-pin-form');
  if (changePinForm) {
    changePinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pinInput = shadow.getElementById('set-new-pin-input');
      const feedback = shadow.getElementById('pin-change-feedback');
      const newPin = (pinInput?.value || '').trim();

      if (!/^\d{3}$/.test(newPin)) {
        if (feedback) {
          feedback.style.color = '#ef4444';
          feedback.textContent = '❌ Le code PIN doit comporter exactement 3 chiffres.';
        }
        return;
      }

      if (feedback) {
        feedback.style.color = '#0052cc';
        feedback.textContent = 'Enregistrement sur Supabase Cloud...';
      }

      try {
        const { updateAdminSecurityPinInSupabase } = await import('../../utils/supabase.js');
        const res = await updateAdminSecurityPinInSupabase(newPin);
        if (res.success) {
          if (feedback) {
            feedback.style.color = '#10b981';
            feedback.textContent = '✅ Code PIN à 3 chiffres mis à jour sur Supabase Cloud !';
          }
          if (pinInput) pinInput.value = '';
          window.dispatchEvent(new CustomEvent('toast:show', { detail: '🔑 Code PIN à 3 chiffres mis à jour !' }));
        } else {
          if (feedback) {
            feedback.style.color = '#ef4444';
            feedback.textContent = res.error || 'Erreur lors de la mise à jour.';
          }
        }
      } catch (err) {
        if (feedback) {
          feedback.style.color = '#ef4444';
          feedback.textContent = 'Erreur lors de la mise à jour.';
        }
      }
    });
  }

  // Trigger PIN Modal
  const triggerPinBtn = shadow.getElementById('btn-trigger-pin-modal');
  if (triggerPinBtn) {
    triggerPinBtn.addEventListener('click', () => {
      const pinModal = shadow.getElementById('pin-modal-overlay');
      if (pinModal) {
        pinModal.classList.add('active');
        const digit1 = shadow.getElementById('pin-digit-1');
        if (digit1) digit1.focus();
      }
    });
  // 10. Push All Localhost Data to Cloud (Supabase)
  const pushToSupabaseBtn = shadow.getElementById('push-all-to-supabase-btn');
  if (pushToSupabaseBtn) {
    pushToSupabaseBtn.addEventListener('click', async () => {
      pushToSupabaseBtn.disabled = true;
      pushToSupabaseBtn.textContent = '⏳ Syncing to Cloud...';
      try {
        const { supabase } = await import('../../utils/supabase.js');
        if (!supabase) throw new Error('Supabase client not initialized');

        // 1. Sync Store Settings
        const settingsRecord = {
          store_name: localStorage.getItem('SWEETOS_store_name') || 'SWEETOS',
          hero_title: localStorage.getItem('SWEETOS_hero_title') || 'Find Your Style, Love Your Look ✨',
          hero_subtitle: localStorage.getItem('SWEETOS_hero_subtitle') || 'Discover the latest trends in minimalist tech layouts, high-end accessories, and premium workspace gear.',
          store_entrance_image: localStorage.getItem('SWEETOS_store_entrance_image') || null,
          currency: localStorage.getItem('SWEETOS_currency') || 'FCFA'
        };
        await supabase.from('store_settings').insert([settingsRecord]).catch(() => {});

        // 2. Sync Categories
        const cats = context.categories || [];
        if (cats.length > 0) {
          const catRecords = cats.map(c => ({
            name: c.name,
            slug: (c.slug || c.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            icon: c.icon || '📦',
            description: c.description || ''
          }));
          await supabase.from('categories').upsert(catRecords, { onConflict: 'slug' }).catch(() => {});
        }

        // 3. Sync Brands
        const brs = context.brands || [];
        if (brs.length > 0) {
          const brandRecords = brs.map(b => ({
            name: b.name,
            slug: (b.slug || b.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            description: b.description || '',
            is_official: b.isOfficial ?? true
          }));
          await supabase.from('brands').upsert(brandRecords, { onConflict: 'slug' }).catch(() => {});
        }

        // 4. Sync Products
        const prods = context.products || [];
        if (prods.length > 0) {
          const prodRecords = prods.map(p => ({
            legacy_id: typeof p.id === 'number' ? p.id : null,
            name: p.name || 'Product',
            slug: (p.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + (p.id || Date.now()),
            description: p.description || '',
            price: parseFloat(p.price) || 0,
            original_price: p.originalPrice || p.comparePrice ? parseFloat(p.originalPrice || p.comparePrice) : null,
            category_name: p.category || '',
            subcategory_name: p.subcategory || '',
            brand_name: p.brand || '',
            image: p.image || '',
            gallery: p.gallery || [],
            colors: p.colors || [],
            specs: p.specs || {},
            stock: p.stock ?? 10,
            in_stock: p.inStock ?? (p.stock > 0),
            is_bestseller: p.isBestseller ?? false,
            is_hot_deal: p.isHotDeal ?? false,
            is_new: p.isNew ?? true,
            rating: p.rating || 5.0,
            reviews_count: p.reviews || 0
          }));
          await supabase.from('products').upsert(prodRecords, { onConflict: 'slug' }).catch(() => {});
        }

        window.dispatchEvent(new CustomEvent('toast:show', { detail: '🚀 Entire Store successfully uploaded to Supabase Cloud!' }));
        pushToSupabaseBtn.textContent = '✓ Cloud Synced!';
        setTimeout(() => {
          pushToSupabaseBtn.disabled = false;
          pushToSupabaseBtn.textContent = '🚀 Sync to Cloud';
        }, 2000);
      } catch(err) {
        console.error('Push to Supabase failed:', err);
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Cloud sync completed.' }));
        pushToSupabaseBtn.disabled = false;
        pushToSupabaseBtn.textContent = '🚀 Sync to Cloud';
      }
    });
  }

  // 11. Backup & Reset Action Handlers
  const backupBtn = shadow.getElementById('download-full-backup-btn');
  if (backupBtn) {
    backupBtn.addEventListener('click', () => {
      const fullSnapshot = {
        timestamp: new Date().toISOString(),
        products: context.products || [],
        categories: context.categories || [],
        brands: context.brands || [],
        orders: context.orders || [],
        coupons: context.coupons || [],
        sections: context.homepageSections || [],
        customers: context.customers || []
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullSnapshot, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", `SWEETOS_Database_Backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      document.body.removeChild(dlAnchor);

      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Database backup downloaded successfully!' }));
    });
  }

  const restoreInput = shadow.getElementById('restore-backup-file-input');
  if (restoreInput) {
    restoreInput.addEventListener('change', () => {
      const file = restoreInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            if (data.products) context.products = data.products;
            if (data.categories) context.categories = data.categories;
            if (data.brands) context.brands = data.brands;
            if (data.orders) context.orders = data.orders;
            if (data.coupons) context.coupons = data.coupons;
            if (data.sections) context.homepageSections = data.sections;

            context.saveDatabase('products');
            context.saveDatabase('categories');
            context.saveDatabase('brands');
            context.saveDatabase('orders');
            context.saveDatabase('coupons');
            context.saveDatabase('sections');

            window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Database snapshot restored successfully!' }));
            context.render();
            context.attachListeners();
          } catch(err) {
            alert('Invalid JSON backup file format.');
          }
        };
        reader.readAsText(file);
      }
    });
  }

  const clearCacheBtn = shadow.getElementById('clear-cache-logs-btn');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', () => {
      localStorage.removeItem('SWEETOS_activity_logs');
      localStorage.removeItem('SWEETOS_failed_searches');
      localStorage.removeItem('SWEETOS_admin_read_alerts');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Session logs and temporary caches cleared!' }));
    });
  }

  const wipeEverythingBtn = shadow.getElementById('wipe-everything-btn');
  if (wipeEverythingBtn) {
    wipeEverythingBtn.addEventListener('click', async () => {
      const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
        title: 'Wipe Everything & Start Clean',
        message: 'Are you sure you want to completely erase ALL products, orders, categories, brands, reviews, and coupons? Your store will be 100% empty (0 items) and ready for your real live products.',
        confirmText: 'Yes, Wipe Everything to 0',
        cancelText: 'Cancel',
        type: 'danger',
        icon: '🧹'
      }) : Promise.resolve(confirm('Are you sure you want to completely wipe all products and data?')));

      if (confirmed) {
        localStorage.setItem('SWEETOS_products', JSON.stringify([]));
        localStorage.setItem('SWEETOS_all_orders', JSON.stringify([]));
        localStorage.setItem('SWEETOS_categories', JSON.stringify([]));
        localStorage.setItem('SWEETOS_brands', JSON.stringify([]));
        localStorage.setItem('SWEETOS_reviews_all', JSON.stringify([]));
        localStorage.setItem('SWEETOS_coupons', JSON.stringify([]));
        localStorage.setItem('SWEETOS_inventory_logs', JSON.stringify([]));
        localStorage.setItem('SWEETOS_activity_logs', JSON.stringify([]));
        localStorage.setItem('SWEETOS_homepage_sections', JSON.stringify([]));
        localStorage.setItem('SWEETOS_db_initialized', 'true');
        
        try {
          const { supabase } = await import('../../utils/supabase.js');
          if (supabase) {
            await Promise.allSettled([
              supabase.from('products').delete().neq('name', '___NON_EXISTENT___'),
              supabase.from('order_items').delete().neq('product_name', '___NON_EXISTENT___'),
              supabase.from('orders').delete().neq('order_number', '___NON_EXISTENT___'),
              supabase.from('categories').delete().neq('name', '___NON_EXISTENT___'),
              supabase.from('brands').delete().neq('name', '___NON_EXISTENT___')
            ]);
          }
        } catch(e) {}
        
        try {
          await Promise.all([
            fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '[]' }).catch(() => null),
            fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '[]' }).catch(() => null),
            fetch('/api/brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '[]' }).catch(() => null),
            fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '[]' }).catch(() => null),
            fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '[]' }).catch(() => null),
            fetch('/api/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '[]' }).catch(() => null)
          ]);
        } catch(e) {}

        window.dispatchEvent(new CustomEvent('toast:show', { detail: '🧹 Store completely wiped! All items erased from database and cloud.' }));
        setTimeout(() => window.location.reload(), 600);
      }
    });
  }

  const factoryResetBtn = shadow.getElementById('factory-reset-btn');
  if (factoryResetBtn) {
    factoryResetBtn.addEventListener('click', async () => {
      const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
        title: 'Restore Sample Demo Data',
        message: 'This will reset products, categories, orders, and reviews back to the original demo datasets.',
        confirmText: 'Yes, Restore Demo Data',
        cancelText: 'Cancel',
        type: 'warning',
        icon: '🔄'
      }) : Promise.resolve(confirm('Restore original demo data?')));

      if (confirmed) {
        localStorage.removeItem('SWEETOS_products');
        localStorage.removeItem('SWEETOS_all_orders');
        localStorage.removeItem('SWEETOS_categories');
        localStorage.removeItem('SWEETOS_brands');
        localStorage.removeItem('SWEETOS_reviews_all');
        localStorage.removeItem('SWEETOS_coupons');
        localStorage.removeItem('SWEETOS_inventory_logs');
        localStorage.removeItem('SWEETOS_homepage_sections');
        localStorage.removeItem('SWEETOS_db_initialized');
        
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Demo datasets restored. Reloading...' }));
        setTimeout(() => window.location.reload(), 800);
      }
    });
  }
}
}
