import { getCartStorageKey, getProfileStorageKey, getNotificationsStorageKey, formatPrice, getAllOrdersFromStorage, saveAllOrdersToStorage } from '../../utils/storage.js';
import { consumeBadgeRewardUse } from '../../utils/badges.js';
import { getTodaysDealsConfig, isTodaysDealsActive, claimTodaysDealsCoupon } from '../../utils/todaysDeals.js';

class CheckoutModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isOpen = false;
    this.step = 1; // 1: Delivery, 2: Payment, 3: Success
    this.latestOrderId = '';
    this.latestOrderTotal = 0;
    this.selectedPaymentMethod = 'cod';
    this.orderedItems = [];
    this.deliveryCity = 'Abidjan';
    this.deliveryTimeSlot = 'asap';
    this.formData = {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: 'Abidjan',
      zip: '',
      deliveryNotes: '',
      cardNum: '',
      cardExpiry: '',
      cardCvv: ''
    };
  }

  getShippingFee(subtotal) {
    if (subtotal === 0) return 0;
    const shippingRate = parseFloat(sessionStorage.getItem('SWEETOS_shipping_rate') || '2000');
    const freeThreshold = parseFloat(sessionStorage.getItem('SWEETOS_free_shipping_threshold') || '25000');
    return subtotal >= freeThreshold ? 0 : shippingRate;
  }

  getOrderTotal() {
    const cartSaved = sessionStorage.getItem(getCartStorageKey());
    let cartItems = [];
    if (cartSaved) {
      try {
        cartItems = JSON.parse(cartSaved);
      } catch (e) {}
    }
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingFee = this.getShippingFee(subtotal);
    
    let discount = 0;
    try {
      const savedCoupon = sessionStorage.getItem('SWEETOS_applied_coupon');
      if (savedCoupon) {
        const applied = JSON.parse(savedCoupon);
        if (!applied.minOrder || subtotal >= applied.minOrder) {
          discount = applied.type === 'percentage' ? subtotal * (applied.value / 100) : applied.value;
        }
      }
    } catch(e) {}

    return Math.max(0, subtotal + shippingFee - discount);
  }

  connectedCallback() {
    this.setupEventListeners();
    const isCheckoutOpen = sessionStorage.getItem('SWEETOS_checkout_open') === 'true';
    if (isCheckoutOpen) {
      this.isOpen = true;
      this.step = parseInt(sessionStorage.getItem('SWEETOS_checkout_step') || '1');
      this.selectedPaymentMethod = sessionStorage.getItem('SWEETOS_checkout_payment_method') || 'cod';
      this.latestOrderId = sessionStorage.getItem('SWEETOS_checkout_order_id') || '';
      this.latestOrderTotal = parseFloat(sessionStorage.getItem('SWEETOS_checkout_order_total') || '0');
      
      this.loadUserProfile();
      this.render();
      this.updateState();
      if (this.step === 3) {
        setTimeout(() => this.triggerConfetti(), 300);
      }
    }
  }

  loadUserProfile() {
    const profileKey = getProfileStorageKey();
    let profileSaved = sessionStorage.getItem(profileKey) || sessionStorage.getItem('SWEETOS_user_profile');
    if (profileSaved) {
      try {
        const prof = JSON.parse(profileSaved);
        this.formData.name = `${prof.firstName || ''} ${prof.lastName || ''}`.trim();
        this.formData.email = prof.email || '';
        this.formData.phone = prof.phone || '';
        if (prof.city) {
          this.deliveryCity = prof.city;
        }
        if (prof.addresses && prof.addresses.length > 0) {
          const addr = prof.addresses[0];
          if (typeof addr === 'string') {
            this.formData.address = addr;
          } else {
            this.formData.address = `${addr.commune ? `${addr.commune}, ` : ''}${addr.street || ''}`;
            if (addr.city) this.deliveryCity = addr.city;
            if (addr.phone && !this.formData.phone) this.formData.phone = addr.phone;
          }
        } else if (prof.address) {
          this.formData.address = prof.address;
        }
      } catch (e) {}
    }
  }

  open() {
    this.isOpen = true;
    this.step = 1;
    sessionStorage.setItem('SWEETOS_checkout_open', 'true');
    sessionStorage.setItem('SWEETOS_checkout_step', '1');
    
    this.loadUserProfile();
    this.render();
    this.updateState();
  }

  close() {
    this.isOpen = false;
    sessionStorage.removeItem('SWEETOS_checkout_open');
    sessionStorage.removeItem('SWEETOS_checkout_step');
    sessionStorage.removeItem('SWEETOS_checkout_payment_method');
    sessionStorage.removeItem('SWEETOS_checkout_order_id');
    sessionStorage.removeItem('SWEETOS_checkout_order_total');
    this.updateState();
  }

  triggerConfetti() {
    if (typeof window.confetti === 'function') {
      try {
        const duration = 2500;
        const end = Date.now() + duration;
        const colors = ['#0052cc', '#00b4d8', '#10b981', '#f59e0b', '#8b5cf6'];

        (function frame() {
          window.confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
          window.confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
          if (Date.now() < end) requestAnimationFrame(frame);
        }());
        
        setTimeout(() => {
          window.confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 }, colors });
        }, 300);
      } catch (e) {}
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="./components/Checkout/CheckoutModal.css">
      <div class="modal-overlay ${this.isOpen ? 'open' : ''}" id="overlay">
        <div class="modal-container">
          
          <!-- Header Bar -->
          ${this.step < 3 ? `
            <div class="checkout-header-bar">
              <div class="checkout-brand-badge">
                <div class="icon-box">🛍️</div>
                <div>
                  <h2>Finaliser la Commande / Secure Checkout</h2>
                  <span>Passerelle de commande certifiée 256-bit SSL</span>
                </div>
              </div>
              <button class="btn-retour-panier" id="close-btn-retour">
                <span>←</span>
                <span>Retour au Panier</span>
              </button>
            </div>

            <!-- Stepper Indicator -->
            <div class="checkout-stepper">
              <div class="step-item ${this.step === 1 ? 'active' : (this.step > 1 ? 'completed' : '')}">
                <div class="step-circle">${this.step > 1 ? '✓' : '1'}</div>
                <div class="step-label">
                  <span class="step-title">Livraison</span>
                  <span class="step-sub">Adresse & Contact</span>
                </div>
              </div>

              <div class="stepper-connector ${this.step >= 2 ? 'active' : ''}"></div>

              <div class="step-item ${this.step === 2 ? 'active' : (this.step > 2 ? 'completed' : '')}">
                <div class="step-circle">${this.step > 2 ? '✓' : '2'}</div>
                <div class="step-label">
                  <span class="step-title">Paiement</span>
                  <span class="step-sub">Wave, MoMo, Carte, Cash</span>
                </div>
              </div>

              <div class="stepper-connector ${this.step === 3 ? 'active' : ''}"></div>

              <div class="step-item ${this.step === 3 ? 'active' : ''}">
                <div class="step-circle">3</div>
                <div class="step-label">
                  <span class="step-title">Confirmation</span>
                  <span class="step-sub">Reçu & Suivi</span>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Main Layout Grid -->
          <div class="checkout-layout-grid ${this.step === 3 ? 'success-layout' : ''}">
            
            <!-- Left Column: Form / Steps -->
            <div class="checkout-main-column">
              ${this.step === 1 ? this.renderStep1Delivery() : ''}
              ${this.step === 2 ? this.renderStep2Payment() : ''}
              ${this.step === 3 ? this.renderStep3Success() : ''}
            </div>

            <!-- Right Column: Order Summary (Visible during steps 1 & 2) -->
            ${this.step < 3 ? `
              <div class="checkout-summary-column">
                ${this.renderOrderSummary()}
              </div>
            ` : ''}

          </div>

        </div>
      </div>
    `;

    this.attachDynamicListeners();
  }

  // ================= STEP 1: DELIVERY =================
  renderStep1Delivery() {
    return `
      <div class="checkout-card animate-in">
        <form id="step1-delivery-form">
          
          <!-- Contact Info Section -->
          <div class="section-block">
            <div class="section-title-row">
              <div class="section-icon">👤</div>
              <h3>1. Coordonnées & Contact Client</h3>
            </div>

            <div class="form-grid-2">
              <div class="form-group">
                <label for="input-name">Nom complet *</label>
                <input type="text" id="input-name" required value="${this.formData.name}" placeholder="Ex: Marc Aurele">
              </div>

              <div class="form-group">
                <label for="input-phone">Numéro WhatsApp / Téléphone *</label>
                <input type="tel" id="input-phone" required value="${this.formData.phone}" placeholder="Ex: +225 05 00 61 99 23">
                <span class="form-help-text">Utilisé pour la confirmation SMS et le livreur.</span>
              </div>
            </div>

            <div class="form-group">
              <label for="input-email">Adresse e-mail (pour le reçu de commande) *</label>
              <input type="email" id="input-email" required value="${this.formData.email}" placeholder="Ex: marc@aurele.ci">
            </div>
          </div>

          <!-- Delivery Address Section -->
          <div class="section-block">
            <div class="section-title-row">
              <div class="section-icon">📍</div>
              <h3>2. Lieu & Préférences de Livraison</h3>
            </div>

            <div class="form-grid-2">
              <div class="form-group">
                <label for="input-city">Ville / Région *</label>
                <select id="input-city">
                  <option value="Abidjan" ${this.deliveryCity === 'Abidjan' ? 'selected' : ''}>Abidjan (Cocody, Plateau, Marcory, etc.)</option>
                  <option value="Yamoussoukro" ${this.deliveryCity === 'Yamoussoukro' ? 'selected' : ''}>Yamoussoukro</option>
                  <option value="Bouaké" ${this.deliveryCity === 'Bouaké' ? 'selected' : ''}>Bouaké</option>
                  <option value="San-Pédro" ${this.deliveryCity === 'San-Pédro' ? 'selected' : ''}>San-Pédro</option>
                  <option value="Autre / Interieur" ${this.deliveryCity === 'Autre / Interieur' ? 'selected' : ''}>Autre Ville de l'Intérieur</option>
                </select>
              </div>

              <div class="form-group">
                <label for="input-slot">Délai souhaité</label>
                <select id="input-slot">
                  <option value="asap">⚡ Dès que possible (Livraison Express 24h)</option>
                  <option value="morning">🌅 Matin (09:00 - 12:00)</option>
                  <option value="afternoon">🌇 Après-midi (14:00 - 18:00)</option>
                  <option value="weekend">📅 Samedi / Week-end</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="input-address">Adresse exacte / Repère de livraison *</label>
              <input type="text" id="input-address" required value="${this.formData.address}" placeholder="Ex: Cocody Angré 8ème Tranche, près de la pharmacie des Grâces">
            </div>

            <div class="form-group">
              <label for="input-notes">Instructions particulières pour le livreur (Optionnel)</label>
              <textarea id="input-notes" rows="2" placeholder="Ex: Sonner au portail noir, appeler 10 mins avant votre arrivée...">${this.formData.deliveryNotes || ''}</textarea>
            </div>
          </div>

          <button type="submit" class="checkout-submit-btn" id="btn-continue-step-2">
            <span>Continuer vers le Paiement</span>
            <span>→</span>
          </button>
        </form>
      </div>
    `;
  }

  // ================= STEP 2: PAYMENT =================
  renderStep2Payment() {
    return `
      <div class="checkout-card animate-in">
        <form id="step2-payment-form">
          
          <!-- Payment Selection -->
          <div class="section-block">
            <div class="section-title-row">
              <div class="section-icon">💳</div>
              <div>
                <h3>Sélectionnez votre Mode de Paiement</h3>
                <span style="font-size:12px; color:#64748b;">Paiement sécurisé et garanti par SWEETOS</span>
              </div>
            </div>

            <div class="payment-methods-grid">
              ${sessionStorage.getItem('SWEETOS_payment_cod_enabled') !== 'false' ? `
                <div class="payment-method-card ${this.selectedPaymentMethod === 'cod' ? 'active' : ''}" data-value="cod">
                  <div class="method-logo-wrap">
                    <img src="./assets/payment_cod.png" alt="Livraison" class="method-logo-img cod-logo-img">
                  </div>
                  <span class="method-name">Livraison</span>
                  <span class="method-desc">Espèces au livreur</span>
                </div>
              ` : ''}

              ${sessionStorage.getItem('SWEETOS_payment_momo_enabled') !== 'false' ? `
                <div class="payment-method-card ${this.selectedPaymentMethod === 'wave' ? 'active' : ''}" data-value="wave">
                  <div class="method-logo-wrap">
                    <img src="./assets/payment_wave.jpg" alt="Wave" class="method-logo-img">
                  </div>
                  <span class="method-name">Wave</span>
                  <span class="method-desc">0% de frais</span>
                </div>

                <div class="payment-method-card ${this.selectedPaymentMethod === 'orange' ? 'active' : ''}" data-value="orange">
                  <div class="method-logo-wrap">
                    <img src="./assets/payment_orange.jpg" alt="Orange Money" class="method-logo-img">
                  </div>
                  <span class="method-name">Orange</span>
                  <span class="method-desc">Transfert direct</span>
                </div>

                <div class="payment-method-card ${this.selectedPaymentMethod === 'mtn' ? 'active' : ''}" data-value="mtn">
                  <div class="method-logo-wrap">
                    <img src="./assets/payment_mtn.jpg" alt="MTN MoMo" class="method-logo-img">
                  </div>
                  <span class="method-name">MTN</span>
                  <span class="method-desc">Push & Mobile</span>
                </div>
              ` : ''}

              ${sessionStorage.getItem('SWEETOS_payment_card_enabled') === 'true' ? `
                <div class="payment-method-card ${this.selectedPaymentMethod === 'card' ? 'active' : ''}" data-value="card">
                  <div class="method-logo-wrap card-logo-wrap">
                    <span class="method-icon">💳</span>
                  </div>
                  <span class="method-name">Carte Bancaire</span>
                  <span class="method-desc">Visa / Mastercard</span>
                </div>
              ` : ''}
            </div>

            <input type="hidden" id="payment-method-input" value="${this.selectedPaymentMethod}">

            <!-- Dynamic Payment Instructions Panel -->
            <div id="dynamic-payment-instructions"></div>
          </div>

          <!-- Review Summary Box -->
          <div class="section-block" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <strong style="font-size:13px; color:#0f172a;">📍 Récapitulatif de Livraison :</strong>
              <button type="button" id="btn-back-to-step1" style="background:none; border:none; color:#0052cc; font-size:12px; font-weight:750; cursor:pointer;">Modifier</button>
            </div>
            <p style="margin:0; font-size:12.5px; color:#475569; line-height:1.5;">
              <strong>${this.formData.name}</strong> • ${this.formData.phone}<br>
              ${this.formData.address}, ${this.deliveryCity}
            </p>
          </div>

          <!-- Terms Checkbox -->
          <div style="display:flex; align-items:flex-start; gap:10px; margin-top:20px;">
            <input type="checkbox" id="accept-terms-checkbox" required checked style="width:18px; height:18px; margin-top:2px; accent-color:#0052cc;">
            <label for="accept-terms-checkbox" style="font-size:12.5px; color:#475569; line-height:1.4;">
              J'accepte les conditions de vente et confirme l'exactitude de mes informations de livraison.
            </label>
          </div>

          <button type="submit" class="checkout-submit-btn" id="btn-submit-order">
            <span>Confirmer & Valider la Commande (${formatPrice(this.getOrderTotal())})</span>
            <span>✓</span>
          </button>
        </form>
      </div>
    `;
  }

  // ================= STEP 3: SUCCESS & RECEIPT =================
  renderStep3Success() {
    let paymentDesc = '';
    if (this.selectedPaymentMethod === 'wave') {
      paymentDesc = 'Veuillez effectuer le transfert Wave du montant total vers notre compte marchand après vérification.';
    } else if (this.selectedPaymentMethod === 'orange') {
      paymentDesc = 'Veuillez initier le transfert Orange Money pour débloquer l\'expédition prioritaire.';
    } else if (this.selectedPaymentMethod === 'mtn') {
      paymentDesc = 'Veuillez procéder au règlement MTN MoMo pour finaliser la livraison.';
    } else if (this.selectedPaymentMethod === 'cod') {
      paymentDesc = `Préparez la somme exacte de ${formatPrice(this.latestOrderTotal)} en espèces à remettre au livreur.`;
    } else {
      paymentDesc = 'Votre paiement par carte bancaire a été validé avec succès.';
    }

    const waOrderMsg = `Bonjour SWEETOS ! 👋 Je viens de passer la commande #${this.latestOrderId} d'un montant de ${formatPrice(this.latestOrderTotal)}. Pouvez-vous me confirmer la prise en charge et le délai de livraison ?`;
    const waLink = `https://wa.me/2250500619923?text=${encodeURIComponent(waOrderMsg)}`;

    return `
      <div class="checkout-card animate-in">
        <div class="success-screen">
          
          <div class="success-check-badge">✓</div>
          
          <h1>Félicitations, Commande Enregistrée ! 🎉</h1>
          <p style="font-size:14.5px; color:#64748b; margin:0 auto 16px auto; max-width:520px; line-height:1.6;">
            Merci <strong>${this.formData.name}</strong> ! Votre commande a été transmise avec succès à notre équipe logistique.
          </p>

          <div class="order-code-badge">
            <span>📦 Référence Commande :</span>
            <strong id="success-order-id">#${this.latestOrderId}</strong>
            <button id="copy-order-id-btn" style="background:white; border:1px solid #cbd5e1; border-radius:6px; padding:2px 8px; font-size:11px; cursor:pointer; font-weight:750;">
              📋 Copier
            </button>
          </div>

          <!-- Live Tracking Stepper -->
          <div class="order-timeline-stepper">
            <div class="timeline-step active">
              <div class="t-circle">1</div>
              <span class="t-title">Reçue ✓</span>
              <span class="t-sub">Enregistrée</span>
            </div>
            <div class="timeline-step active">
              <div class="t-circle">⏳</div>
              <span class="t-title">Vérification</span>
              <span class="t-sub">Validation admin</span>
            </div>
            <div class="timeline-step">
              <div class="t-circle">🚚</div>
              <span class="t-title">Expédition</span>
              <span class="t-sub">En cours de route</span>
            </div>
            <div class="timeline-step">
              <div class="t-circle">📦</div>
              <span class="t-title">Livraison</span>
              <span class="t-sub">Remise au client</span>
            </div>
          </div>

          <!-- Instructions Box -->
          <div style="background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:16px; padding:18px 20px; text-align:left; margin-bottom:20px;">
            <strong style="font-size:13.5px; color:#166534; display:block; margin-bottom:4px;">
              ℹ️ Modalité de Paiement (${this.selectedPaymentMethod.toUpperCase()}) :
            </strong>
            <p style="margin:0; font-size:13px; color:#166534; line-height:1.5;">
              ${paymentDesc}
            </p>
          </div>

          <!-- Email notification sent badge -->
          <div style="display:flex; align-items:center; justify-content:center; gap:8px; font-size:12.5px; color:#64748b; margin-bottom:24px;">
            <span>✉️</span>
            <span>Une confirmation détaillée a été envoyée à <strong>${this.formData.email}</strong></span>
          </div>

          <!-- Action buttons -->
          <div class="success-actions-row">
            <a href="${waLink}" target="_blank" style="background:#25d366; color:white; border:none; padding:13px 22px; border-radius:12px; font-size:13.5px; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 14px rgba(37,211,102,0.3);">
              <span>📲 Suivre sur WhatsApp</span>
            </a>

            <button id="success-view-orders-btn" style="background:#0052cc; color:white; border:none;">
              Voir mes Commandes
            </button>

            <button id="return-shop-btn" style="background:white; border:1.5px solid #e2e8f0; color:#475569;">
              Continuer les Achats
            </button>
          </div>

        </div>
      </div>
    `;
  }

  // ================= ORDER SUMMARY =================
  renderOrderSummary() {
    const cartSaved = sessionStorage.getItem(getCartStorageKey());
    let cartItems = [];
    if (cartSaved) {
      try {
        cartItems = JSON.parse(cartSaved);
      } catch (e) {}
    }

    if (this.step === 3 && this.orderedItems.length > 0) {
      cartItems = this.orderedItems;
    }

    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingFee = this.getShippingFee(subtotal);

    let discount = 0;
    let appliedCoupon = null;
    try {
      const savedCoupon = sessionStorage.getItem('SWEETOS_applied_coupon');
      if (savedCoupon) {
        appliedCoupon = JSON.parse(savedCoupon);
        if (!appliedCoupon.minOrder || subtotal >= appliedCoupon.minOrder) {
          discount = appliedCoupon.type === 'percentage' ? subtotal * (appliedCoupon.value / 100) : appliedCoupon.value;
        } else {
          appliedCoupon = null;
        }
      }
    } catch(e) {}

    const total = Math.max(0, subtotal + shippingFee - discount);
    const freeThreshold = parseFloat(sessionStorage.getItem('SWEETOS_free_shipping_threshold') || '25000');
    const freeProgress = Math.min(100, Math.round((subtotal / freeThreshold) * 100));

    return `
      <div class="summary-card">
        
        <div class="summary-header">
          <h3>
            <span>🛍️</span>
            <span>Votre Panier</span>
          </h3>
          <span class="summary-badge">${cartItems.length} article${cartItems.length > 1 ? 's' : ''}</span>
        </div>

        <!-- Free shipping progress bar -->
        ${subtotal < freeThreshold ? `
          <div style="margin-bottom:16px; background:#f8fafc; border:1px solid #e2e8f0; padding:10px 12px; border-radius:12px;">
            <div style="display:flex; justify-content:space-between; font-size:11.5px; font-weight:750; color:#475569; margin-bottom:6px;">
              <span>Livraison Gratuite dès ${formatPrice(freeThreshold)}</span>
              <span style="color:#0052cc;">Plus que ${formatPrice(freeThreshold - subtotal)}</span>
            </div>
            <div style="width:100%; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
              <div style="width:${freeProgress}%; height:100%; background:linear-gradient(90deg, #0052cc 0%, #00b4d8 100%);"></div>
            </div>
          </div>
        ` : `
          <div style="margin-bottom:16px; background:#f0fdf4; border:1px solid #bbf7d0; padding:8px 12px; border-radius:12px; font-size:12px; font-weight:800; color:#166534; display:flex; align-items:center; gap:6px;">
            <span>🎉</span>
            <span>Vous bénéficiez de la Livraison Gratuite !</span>
          </div>
        `}

        <!-- Items Preview -->
        <div class="summary-items-list custom-scroll">
          ${cartItems.length === 0 ? `
            <p style="text-align:center; color:#94a3b8; font-size:13px; padding:20px 0;">Votre panier est vide.</p>
          ` : cartItems.map(item => `
            <div class="summary-item-card">
              <img src="${item.image}" alt="${item.name}">
              <div class="summary-item-info">
                <h4>${item.name}</h4>
                <span class="item-meta">Qté : ${item.quantity} ${item.color ? `• ${item.color}` : ''}</span>
              </div>
              <div class="summary-item-price">${formatPrice(item.price * item.quantity)}</div>
            </div>
          `).join('')}
        </div>

        <!-- Promo Code Input -->
        <div class="checkout-coupon-box">
          <input type="text" id="checkout-coupon-input" placeholder="Code Promo (ex: SWEETWELCOME)" value="${appliedCoupon ? appliedCoupon.code : ''}">
          <button type="button" id="btn-apply-coupon">
            ${appliedCoupon ? 'Retirer' : 'Appliquer'}
          </button>
        </div>

        <!-- Pricing Breakdown -->
        <div class="pricing-breakdown">
          <div class="pricing-row">
            <span>Sous-total articles</span>
            <strong style="color:#0f172a;">${formatPrice(subtotal)}</strong>
          </div>

          ${discount > 0 ? `
            <div class="pricing-row" style="color:#10b981; font-weight:750;">
              <span>Réduction Code Promo (${appliedCoupon.code})</span>
              <strong>-${formatPrice(discount)}</strong>
            </div>
          ` : ''}

          <div class="pricing-row">
            <span>Frais de livraison</span>
            <strong style="color:${shippingFee === 0 ? '#10b981' : '#0f172a'};">
              ${shippingFee === 0 ? 'Gratuit' : formatPrice(shippingFee)}
            </strong>
          </div>

          <div class="pricing-row total-row">
            <span>Montant Total</span>
            <span class="total-amount">${formatPrice(total)}</span>
          </div>
        </div>

        <!-- Trust Badges -->
        <div class="trust-badges-row">
          <div class="trust-badge">
            <span>🔒</span>
            <span>SSL Sécurisé</span>
          </div>
          <div class="trust-badge">
            <span>🚚</span>
            <span>Livraison Rapide</span>
          </div>
        </div>

      </div>
    `;
  }

  attachDynamicListeners() {
    const shadow = this.shadowRoot;

    // Close buttons
    const closeBtn = shadow.getElementById('close-btn-retour');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    const overlay = shadow.getElementById('overlay');
    if (overlay && this.step < 3) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.close();
      });
    }

    // Step 1 Delivery Form Submission
    const step1Form = shadow.getElementById('step1-delivery-form');
    if (step1Form) {
      step1Form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.formData.name = shadow.getElementById('input-name').value.trim();
        this.formData.phone = shadow.getElementById('input-phone').value.trim();
        this.formData.email = shadow.getElementById('input-email').value.trim();
        this.formData.address = shadow.getElementById('input-address').value.trim();
        this.deliveryCity = shadow.getElementById('input-city').value;
        this.deliveryTimeSlot = shadow.getElementById('input-slot').value;
        this.formData.deliveryNotes = shadow.getElementById('input-notes').value.trim();

        this.step = 2;
        sessionStorage.setItem('SWEETOS_checkout_step', '2');
        this.render();
      });
    }

    // Step 2 Back to Step 1
    const backStep1Btn = shadow.getElementById('btn-back-to-step1');
    if (backStep1Btn) {
      backStep1Btn.addEventListener('click', () => {
        this.step = 1;
        sessionStorage.setItem('SWEETOS_checkout_step', '1');
        this.render();
      });
    }

    // Payment Method Selector
    const payCards = shadow.querySelectorAll('.payment-method-card');
    const payInput = shadow.getElementById('payment-method-input');
    const dynamicInstructions = shadow.getElementById('dynamic-payment-instructions');

    const updatePaymentPanel = (val) => {
      payCards.forEach(c => c.classList.remove('active'));
      const activeCard = shadow.querySelector(`.payment-method-card[data-value="${val}"]`);
      if (activeCard) activeCard.classList.add('active');
      if (payInput) payInput.value = val;
      this.selectedPaymentMethod = val;
      sessionStorage.setItem('SWEETOS_checkout_payment_method', val);

      if (!dynamicInstructions) return;

      if (val === 'wave') {
        dynamicInstructions.innerHTML = `
          <div class="payment-notice-panel wave-bg">
            <img src="./assets/payment_wave.jpg" alt="Wave" class="notice-logo-img">
            <div>
              <strong style="font-size:13.5px; color:#1e40af; display:block; margin-bottom:3px;">Transfert Wave Mobile Money</strong>
              <p style="margin:0; font-size:12px; color:#1e40af; line-height:1.4;">
                Effectuez un transfert de <strong>${formatPrice(this.getOrderTotal())}</strong> vers notre compte marchand Wave au <strong>+225 05 00 61 99 23</strong>.
              </p>
            </div>
          </div>
        `;
      } else if (val === 'orange') {
        dynamicInstructions.innerHTML = `
          <div class="payment-notice-panel orange-bg">
            <img src="./assets/payment_orange.jpg" alt="Orange Money" class="notice-logo-img">
            <div>
              <strong style="font-size:13.5px; color:#9a3412; display:block; margin-bottom:3px;">Transfert Orange Money</strong>
              <p style="margin:0; font-size:12px; color:#9a3412; line-height:1.4;">
                Composez le <strong>#144*...#</strong> et transférez <strong>${formatPrice(this.getOrderTotal())}</strong> vers notre numéro Orange Money.
              </p>
            </div>
          </div>
        `;
      } else if (val === 'mtn') {
        dynamicInstructions.innerHTML = `
          <div class="payment-notice-panel mtn-bg">
            <img src="./assets/payment_mtn.jpg" alt="MTN MoMo" class="notice-logo-img">
            <div>
              <strong style="font-size:13.5px; color:#854d0e; display:block; margin-bottom:3px;">Paiement MTN MoMo</strong>
              <p style="margin:0; font-size:12px; color:#854d0e; line-height:1.4;">
                Transférez <strong>${formatPrice(this.getOrderTotal())}</strong> via l'application MTN MoMo ou le menu USSD vers notre numéro marchand.
              </p>
            </div>
          </div>
        `;
      } else if (val === 'cod') {
        dynamicInstructions.innerHTML = `
          <div class="payment-notice-panel cod-bg">
            <img src="./assets/payment_cod.png" alt="Livraison" class="notice-logo-img cod-notice-img">
            <div>
              <strong style="font-size:13.5px; color:#166534; display:block; margin-bottom:3px;">Paiement en Espèces à la Livraison</strong>
              <p style="margin:0; font-size:12px; color:#166534; line-height:1.4;">
                Vous règlerez la somme de <strong>${formatPrice(this.getOrderTotal())}</strong> directement au coursier lors de la réception de votre colis.
              </p>
            </div>
          </div>
        `;
      } else if (val === 'card') {
        dynamicInstructions.innerHTML = `
          <div style="background:white; border:1.5px solid #e2e8f0; border-radius:14px; padding:18px; margin-top:14px;">
            <strong style="font-size:13px; color:#0f172a; display:block; margin-bottom:12px;">Informations de Carte Bancaire</strong>
            <div class="form-group" style="margin-bottom:12px;">
              <label style="font-size:11.5px;">Numéro de carte</label>
              <input type="text" id="card-num-input" placeholder="4242 •••• •••• ••••" maxlength="19">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="form-group">
                <label style="font-size:11.5px;">Date d'expiration</label>
                <input type="text" id="card-exp-input" placeholder="MM/AA" maxlength="5">
              </div>
              <div class="form-group">
                <label style="font-size:11.5px;">CVV / CVC</label>
                <input type="password" id="card-cvv-input" placeholder="123" maxlength="4">
              </div>
            </div>
          </div>
        `;
      }
    };

    payCards.forEach(c => {
      c.addEventListener('click', () => {
        updatePaymentPanel(c.getAttribute('data-value'));
      });
    });

    if (this.step === 2) {
      updatePaymentPanel(this.selectedPaymentMethod || 'cod');
    }

    // Step 2 Payment Submission & Order Creation
    const step2Form = shadow.getElementById('step2-payment-form');
    if (step2Form) {
      step2Form.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = shadow.getElementById('btn-submit-order');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<span>⏳ Traitement de votre commande...</span>`;
        }

        const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
        this.latestOrderId = orderId;

        const cartSaved = sessionStorage.getItem(getCartStorageKey());
        let cartItems = [];
        let orderTotal = 0;
        if (cartSaved) {
          try {
            cartItems = JSON.parse(cartSaved);
            const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const shippingFee = this.getShippingFee(subtotal);
            let discount = 0;
            const savedCoupon = sessionStorage.getItem('SWEETOS_applied_coupon');
            if (savedCoupon) {
              const applied = JSON.parse(savedCoupon);
              if (!applied.minOrder || subtotal >= applied.minOrder) {
                discount = applied.type === 'percentage' ? subtotal * (applied.value / 100) : applied.value;
              }
            }
            orderTotal = Math.max(0, subtotal + shippingFee - discount);
            this.latestOrderTotal = orderTotal;
          } catch(err) {}
        }

        const profileKey = getProfileStorageKey();
        let profile = null;
        try {
          profile = JSON.parse(sessionStorage.getItem(profileKey) || 'null');
        } catch(err) {}
        if (!profile) {
          profile = {
            firstName: this.formData.name.split(' ')[0] || 'Client',
            lastName: this.formData.name.split(' ').slice(1).join(' ') || 'SWEETOS',
            email: this.formData.email,
            phone: this.formData.phone,
            addresses: [this.formData.address],
            orders: []
          };
        }

        // Calculate Today's Deals spend metadata to attach to the order
        let dealsSpent = 0;
        let isDealsActive = false;
        let requiredDealSpend = 15000;
        let meetsDealRequirement = false;
        try {
          const dealsCfg = getTodaysDealsConfig();
          isDealsActive = isTodaysDealsActive(dealsCfg);
          const dealProductIds = new Set(dealsCfg.productIds || []);
          
          this.orderedItems.forEach(item => {
            if (dealProductIds.has(item.id || item.productId)) {
              dealsSpent += (parseFloat(item.price) || 0) * (item.quantity || 1);
            }
          });

          requiredDealSpend = dealsCfg.minSpendForReward || 15000;
          meetsDealRequirement = isDealsActive && dealsSpent >= requiredDealSpend;
        } catch(e) {}

        const newOrder = {
          id: orderId,
          date: new Date().toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' }),
          status: 'Pending',
          total: orderTotal,
          items: cartItems.map(i => `${i.name} (x${i.quantity})`).join(', '),
          products: cartItems,
          customerName: this.formData.name,
          customerEmail: this.formData.email,
          customerPhone: this.formData.phone,
          customerAddress: `${this.formData.address}, ${this.deliveryCity}`,
          paymentMethod: this.selectedPaymentMethod,
          deliverySlot: this.deliveryTimeSlot,
          dealsSpent: dealsSpent,
          dealsActive: isDealsActive,
          requiredDealSpend: requiredDealSpend,
          meetsDealRequirement: meetsDealRequirement
        };

        if (!profile.orders) profile.orders = [];
        profile.orders.unshift(newOrder);
        sessionStorage.setItem(profileKey, JSON.stringify(profile));
        sessionStorage.setItem('SWEETOS_user_profile', JSON.stringify(profile));

        // Save order to Supabase Cloud Database & local store
        import('../../utils/supabase.js').then(async ({ createOrderInSupabase, saveCustomerToSupabase }) => {
          await saveCustomerToSupabase(profile);
          await createOrderInSupabase(newOrder);
        }).catch(() => {});

        // Dispatch EmailJS Order Confirmation Email
        import('../../utils/emailNotifications.js').then(({ sendOrderConfirmationEmail }) => {
          sendOrderConfirmationEmail(newOrder.id || newOrder.order_number, this.formData.email);
        }).catch(() => {});

        let localOrders = getAllOrdersFromStorage();
        if (!localOrders.some(o => o.id === newOrder.id)) {
          localOrders.unshift(newOrder);
        }
        saveAllOrdersToStorage(localOrders);


        // Deduct coupon usage if applied
        try {
          const appliedCouponStr = sessionStorage.getItem('SWEETOS_applied_coupon');
          if (appliedCouponStr) {
            const appliedC = JSON.parse(appliedCouponStr);
            if (appliedC.code) {
              if (appliedC.badgeCoupon || (appliedC.code && appliedC.code.startsWith('BADGE5'))) {
                // Multi-use badge reward: consumes 1 use and updates remaining counter
                consumeBadgeRewardUse(this.formData.email, appliedC.code);
              } else {
                // Single-use coupon: mark used & exhausted immediately
                let adminCoupons = JSON.parse(sessionStorage.getItem('SWEETOS_coupons') || '[]');
                const idx = adminCoupons.findIndex(c => c.code === appliedC.code);
                if (idx > -1) {
                  adminCoupons[idx].used = (adminCoupons[idx].used || 0) + 1;
                  adminCoupons[idx].remainingUses = 0;
                  adminCoupons[idx].status = 'exhausted';
                  sessionStorage.setItem('SWEETOS_coupons', JSON.stringify(adminCoupons));
                }
              }
            }
          }
        } catch(e) {}

        // Clear Cart & Clean Coupon
        sessionStorage.removeItem('SWEETOS_applied_coupon');
        sessionStorage.removeItem(getCartStorageKey());
        window.dispatchEvent(new CustomEvent('cart:updated', { detail: [] }));
        window.dispatchEvent(new CustomEvent('orders:updated'));

        // Notification center alert
        const notifKey = getNotificationsStorageKey();
        let notifs = [];
        try {
          notifs = JSON.parse(sessionStorage.getItem(notifKey) || '[]');
        } catch(e) {}
        notifs.unshift({
          id: Date.now(),
          type: 'shipping',
          icon: '📦',
          title: `Commande #${orderId} validée`,
          desc: `Votre commande de ${formatPrice(orderTotal)} a été enregistrée avec succès.`,
          time: 'À l\'instant',
          unread: true
        });
        sessionStorage.setItem(notifKey, JSON.stringify(notifs));
        window.dispatchEvent(new CustomEvent('notifications:updated'));

        setTimeout(() => {
          this.step = 3;
          this.orderedItems = cartItems;
          sessionStorage.setItem('SWEETOS_checkout_step', '3');
          sessionStorage.setItem('SWEETOS_checkout_order_id', orderId);
          sessionStorage.setItem('SWEETOS_checkout_order_total', orderTotal.toString());
          this.render();
          this.triggerConfetti();
        }, 1200);
      });
    }

    // Coupon Code Application
    const couponInput = shadow.getElementById('checkout-coupon-input');
    const applyCouponBtn = shadow.getElementById('btn-apply-coupon');
    if (applyCouponBtn && couponInput) {
      applyCouponBtn.addEventListener('click', () => {
        const code = couponInput.value.trim().toUpperCase();
        const savedCoupon = sessionStorage.getItem('SWEETOS_applied_coupon');

        if (savedCoupon) {
          sessionStorage.removeItem('SWEETOS_applied_coupon');
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Code promo retiré.' }));
          this.render();
          return;
        }

        if (!code) {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Veuillez saisir un code promo.' }));
          return;
        }

        let coupons = [];
        try {
          coupons = JSON.parse(sessionStorage.getItem('SWEETOS_coupons') || '[]');
        } catch(e) {}

        const found = coupons.find(c => c.code.toUpperCase() === code && c.status === 'active');
        if (found) {
          sessionStorage.setItem('SWEETOS_applied_coupon', JSON.stringify(found));
          window.dispatchEvent(new CustomEvent('toast:show', { detail: `Code "${found.code}" appliqué avec succès ! 🎉` }));
          this.render();
        } else {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Code promo invalide ou expiré.' }));
        }
      });
    }

    // Step 3 Actions
    const copyIdBtn = shadow.getElementById('copy-order-id-btn');
    if (copyIdBtn) {
      copyIdBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(this.latestOrderId).then(() => {
          copyIdBtn.textContent = '✓ Copié !';
          setTimeout(() => copyIdBtn.textContent = '📋 Copier', 2000);
        });
      });
    }

    const returnShopBtn = shadow.getElementById('return-shop-btn');
    if (returnShopBtn) {
      returnShopBtn.addEventListener('click', () => this.close());
    }

    const viewOrdersBtn = shadow.getElementById('success-view-orders-btn');
    if (viewOrdersBtn) {
      viewOrdersBtn.addEventListener('click', () => {
        this.close();
        window.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page: 'orders' } }));
      });
    }
  }

  setupEventListeners() {
    window.addEventListener('checkout:start', () => this.open());
    window.addEventListener('navigation:changed', () => {
      if (this.isOpen) this.close();
    });
    window.addEventListener('sidebar:toggle', () => this.updateState());
  }

  updateState() {
    const overlay = this.shadowRoot.getElementById('overlay');
    if (overlay) {
      if (this.isOpen) {
        overlay.classList.add('open');
      } else {
        overlay.classList.remove('open');
      }

      const isCollapsed = document.body.classList.contains('sidebar-collapsed');
      if (isCollapsed) {
        overlay.classList.add('sidebar-collapsed');
      } else {
        overlay.classList.remove('sidebar-collapsed');
      }
    }
  }
}

customElements.define('checkout-modal', CheckoutModal);
export default CheckoutModal;
