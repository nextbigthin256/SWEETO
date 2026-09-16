import { getProfileStorageKey, saveStorageItem, getStorageItem, loadUserDataFromSupabase } from '../../utils/storage.js';
import { signInWithGoogle } from '../../utils/supabase.js';

export function getAuthPageHTML() {
  return `
    <!-- Tailwind & Font & Icons CDN -->
    <link href="https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/regular/style.css">
    <link rel="stylesheet" href="./components/Auth/AuthPage.css">

    <div class="auth-wrapper rounded-3xl w-full">
      <!-- Background Ambient Glows -->
      <div class="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#0052cc]/10 rounded-full blur-[120px] animate-float pointer-events-none"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#00b4d8]/5 rounded-full blur-[120px] animate-float pointer-events-none" style="animation-delay: -3s;"></div>

      <!-- Main Container -->
      <div class="w-full max-w-5xl h-auto min-h-[70vh] glass-panel rounded-3xl overflow-hidden flex shadow-2xl relative z-10">
          
          <!-- Left Side: Visual Hero (Hidden on mobile) -->
          <div class="hidden lg:flex w-1/2 relative overflow-hidden bg-slate-900">
              <img id="side-image" src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop" alt="Luxury Tech & Lifestyle" class="absolute inset-0 w-full h-full object-cover opacity-50 hover:scale-105 transition-transform duration-[10s] ease-linear">
              <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-950/80"></div>
              
              <div class="relative z-10 flex flex-col justify-between h-full p-12">
                  <div>
                      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-sky-300 mb-4">
                          <span>🇨🇮 SWEETOS Côte d'Ivoire</span>
                      </div>
                      <h1 class="text-4xl font-bold tracking-tighter text-white">SWEETOS</h1>
                      <p class="text-slate-300 text-xs tracking-widest uppercase mt-1 font-medium">Boutique High-End Tech & Setup Exclusive</p>
                  </div>
                  
                  <div class="my-auto py-8">
                      <h2 class="text-4xl font-light leading-tight text-white mb-4">
                          Connexion Simple,<br>
                          <span class="font-bold text-gradient">Expérience Unique.</span>
                      </h2>
                      <p class="text-slate-300 text-sm leading-relaxed max-w-xs mb-6">
                          Connectez-vous avec votre compte Google pour suivre vos commandes et bénéficier de la livraison express partout en Côte d'Ivoire.
                      </p>

                      <!-- Feature Points -->
                      <div class="space-y-3 text-xs text-slate-300">
                          <div class="flex items-center gap-2.5">
                              <div class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">✓</div>
                              <span>Connexion ultra-rapide sans mot de passe</span>
                          </div>
                          <div class="flex items-center gap-2.5">
                              <div class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">✓</div>
                              <span>Authentification Google 100% Sécurisée</span>
                          </div>
                          <div class="flex items-center gap-2.5">
                              <div class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">✓</div>
                              <span>Suivi en direct de vos expéditions à Abidjan</span>
                          </div>
                      </div>
                  </div>

                  <div class="flex gap-4 text-slate-400 text-xs">
                      <span>&copy; 2026 SWEETOS</span>
                      <span>•</span>
                      <span>Confidentialité</span>
                      <span>•</span>
                      <span>Conditions</span>
                  </div>
              </div>
          </div>

          <!-- Right Side: Single Google Auth Card -->
          <div class="w-full lg:w-1/2 p-8 md:p-12 flex flex-col justify-center relative light-glass-column text-gray-800">
              
              <!-- Mobile Header -->
              <div class="lg:hidden text-center mb-6">
                  <span class="text-xs font-semibold text-brand tracking-widest uppercase">SWEETOS 🇨🇮</span>
                  <h2 class="text-2xl font-bold text-gray-900 mt-1">Espace Client</h2>
              </div>

              <!-- Main Card Container -->
              <div class="w-full max-w-md mx-auto py-4">

                  <!-- GOOGLE AUTH CONTAINER -->
                  <div id="google-auth-container" class="fade-in-up block text-center">
                      
                      <!-- Brand Icon Badge -->
                      <div class="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#0052cc] to-[#00b4d8] p-0.5 shadow-xl shadow-blue-500/20 mx-auto mb-6">
                          <div class="w-full h-full bg-white rounded-[22px] flex items-center justify-center">
                              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#0052cc" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                  <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                          </div>
                      </div>

                      <h3 class="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">Bienvenue sur SWEETOS</h3>
                      <p class="text-gray-500 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
                          Connectez-vous en un clic avec votre compte Google pour accéder à votre espace client.
                      </p>

                      <!-- Large Primary Google Button -->
                      <button type="button" id="google-login-btn" class="btn-google w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl text-base font-semibold shadow-lg shadow-gray-200/80 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
                          <svg style="width: 24px; height: 24px; flex-shrink: 0;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          <span>Continuer avec Google</span>
                      </button>

                      <!-- Trust & Security Badges -->
                      <div class="mt-8 pt-6 border-t border-gray-200/80 flex flex-col items-center gap-2 text-xs text-gray-400">
                          <div class="flex items-center gap-2 font-medium text-gray-500">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                              <span>Connexion 100% Sécurisée Google SSL</span>
                          </div>
                          <p class="text-[11px] text-gray-400">Aucun mot de passe requis • Vos données sont protégées</p>
                      </div>

                  </div>

                  <!-- COMPLETE PROFILE FORM (TRIGGERED AFTER GOOGLE AUTH IF MISSING DELIVERY INFO) -->
                  <form id="complete-profile-form" class="hidden fade-in-up">
                      <div class="flex flex-col items-center mb-6 text-center">
                        <div class="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center text-brand mb-3">
                          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                        </div>
                        <h3 class="text-2xl font-extrabold text-gray-900">Finaliser votre Profil</h3>
                        <p class="text-gray-500 text-sm mt-1">Renseignez votre contact WhatsApp et votre adresse de livraison en Côte d'Ivoire</p>
                      </div>

                      <div class="space-y-4">
                          <!-- Email Address (Read-only) -->
                          <div class="form-group">
                              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Adresse e-mail Google (Vérifiée)</label>
                              <input type="email" id="complete-email" readonly class="light-input-field w-full px-4 py-3 rounded-xl text-sm bg-gray-100/80 cursor-not-allowed text-gray-600 font-medium">
                          </div>

                          <!-- Full Name -->
                          <div class="form-group">
                              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nom et Prénom complets *</label>
                              <input type="text" id="complete-fullname" placeholder="Ex: Marc Aurele" required autocomplete="name" class="light-input-field w-full px-4 py-3 rounded-xl text-sm">
                          </div>

                          <!-- Phone Number (Prefix Dropdown + Input) -->
                          <div class="form-group">
                              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Numéro WhatsApp / Téléphone de réception *</label>
                              <div class="flex gap-2">
                                  <select id="complete-phone-prefix" class="light-input-field px-3 py-3 rounded-xl text-sm bg-white" style="width: 110px;">
                                      <option value="+225" selected>CI +225</option>
                                      <option value="+221">SN +221</option>
                                      <option value="+237">CM +237</option>
                                      <option value="+233">GH +233</option>
                                      <option value="+234">NG +234</option>
                                      <option value="+226">BF +226</option>
                                      <option value="+228">TG +228</option>
                                      <option value="+229">BJ +229</option>
                                      <option value="+33">FR +33</option>
                                  </select>
                                  <input type="tel" id="complete-phone" placeholder="05 00 61 99 23" required class="flex-1 light-input-field px-4 py-3 rounded-xl text-sm">
                              </div>
                              <span class="block text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                                  <i class="ph ph-info text-xs"></i> Requis pour que le livreur puisse vous joindre
                              </span>
                          </div>

                          <!-- City Selector -->
                          <div class="form-group">
                              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Ville / Région (Côte d'Ivoire) *</label>
                              <select id="complete-city" required class="w-full px-4 py-3 rounded-xl light-input-field text-sm bg-white">
                                  <option value="Abidjan" selected>Abidjan (District Autonome)</option>
                                  <option value="Yamoussoukro">Yamoussoukro</option>
                                  <option value="Bouaké">Bouaké</option>
                                  <option value="San-Pédro">San-Pédro</option>
                                  <option value="Korhogo">Korhogo</option>
                                  <option value="Daloa">Daloa</option>
                                  <option value="Grand-Bassam">Grand-Bassam</option>
                                  <option value="Bingerville">Bingerville</option>
                                  <option value="Autre Ville">Autre Ville de l'Intérieur</option>
                              </select>
                          </div>

                          <!-- Commune / Quartier -->
                          <div class="form-group">
                              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Commune / Quartier *</label>
                              <input type="text" id="complete-commune" placeholder="Ex: Cocody Angré 8ème Tranche / Marcory Zone 4 / Plateau" required class="light-input-field w-full px-4 py-3 rounded-xl text-sm">
                          </div>

                          <!-- Street Address & Landmark -->
                          <div class="form-group">
                              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Rue & Repère précis de livraison *</label>
                              <input type="text" id="complete-address" placeholder="Ex: Près de la Pharmacie des Grâces, Immeuble Horizon" required class="light-input-field w-full px-4 py-3 rounded-xl text-sm">
                          </div>
                      </div>

                      <button type="submit" class="w-full btn-brand font-semibold py-3.5 rounded-xl mt-6 active:scale-[0.98]">
                          Enregistrer et Commencer mes Achats
                      </button>
                  </form>

              </div>
          </div>
      </div>
      
      <!-- GOOGLE OAUTH SIMULATED OVERLAY -->
      <div id="google-oauth-overlay" class="modal-backdrop" style="display: none; z-index: 10000; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); align-items: center; justify-content: center; width: 100%; height: 100%;">
        <div style="background: #ffffff; width: 440px; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.18); border: 1px solid #e2e8f0; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; animation: fadeInModal 0.3s ease;">
          
          <!-- Google Header -->
          <div style="padding: 36px 36px 16px 36px; text-align: center; border-bottom: 1px solid #f1f5f9;">
            <svg style="width: 32px; height: 32px; margin: 0 auto 16px auto;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <h2 style="font-size: 20px; font-weight: 500; color: #202124; margin: 0 0 6px 0; font-family: 'Outfit', sans-serif;">Se connecter avec Google</h2>
            <p style="font-size: 14px; color: #5f6368; margin: 0; font-family: 'Outfit', sans-serif;">pour continuer sur <strong style="color:#0052cc;">SWEETOS</strong></p>
          </div>

          <!-- Google Sign-in Form -->
          <div style="padding: 24px 36px 36px 36px;">
            <form id="google-oauth-form" style="display: flex; flex-direction: column; gap: 16px;">
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <label style="font-size: 13px; font-weight: 600; color: #374151;">Adresse e-mail Google</label>
                <input type="email" id="google-email" required placeholder="nom@gmail.com" style="width: 100%; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 8px; font-size: 14px; outline: none; background: white;">
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <label style="font-size: 13px; font-weight: 600; color: #374151;">Nom et Prénom</label>
                <input type="text" id="google-fullname" required placeholder="Ex: Marc Aurele" style="width: 100%; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 8px; font-size: 14px; outline: none; background: white;">
              </div>
              
              <button type="submit" style="width: 100%; background: #4285F4; color: white; border: none; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;">
                Continuer sur SWEETOS
              </button>
            </form>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
              <button type="button" id="cancel-google-oauth-btn" style="background: none; border: none; color: #1a73e8; font-size: 13px; font-weight: 500; cursor: pointer; padding: 6px 12px; border-radius: 4px; transition: background 0.2s;">Annuler</button>
              <span style="font-size: 11.5px; color: #5f6368; font-family: 'Outfit', sans-serif;">Connexion Sécurisée 🛡️</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  `;
}

export function attachAuthListeners(shadow, onLoginSuccess) {
  const googleAuthContainer = shadow.getElementById('google-auth-container');
  const completeForm = shadow.getElementById('complete-profile-form');

  // Handle Google button clicks & Simulated OAuth Overlay
  const googleLoginBtn = shadow.getElementById('google-login-btn');
  const googleOverlay = shadow.getElementById('google-oauth-overlay');
  const cancelGoogleBtn = shadow.getElementById('cancel-google-oauth-btn');

  const openGoogleOverlay = () => {
    if (googleOverlay) {
      googleOverlay.style.display = 'flex';
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Ouverture du portail de connexion sécurisé Google... 🔒' }));
    }
  };

  const closeGoogleOverlay = () => {
    if (googleOverlay) googleOverlay.style.display = 'none';
  };

  const handleGoogleClick = (e) => {
    if (e) e.preventDefault();
    try {
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Connexion Google en cours... 🔒' }));
      signInWithGoogle().catch(err => {
        console.warn('[Google OAuth Error - Fallback to Modal]:', err);
        openGoogleOverlay();
      });
    } catch(err) {
      console.warn('[Google OAuth Error - Fallback to Modal]:', err.message);
      openGoogleOverlay();
    }
  };

  if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleGoogleClick);
  if (cancelGoogleBtn) cancelGoogleBtn.addEventListener('click', closeGoogleOverlay);

  const googleForm = shadow.getElementById('google-oauth-form');
  if (googleForm) {
    googleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = shadow.getElementById('google-email').value.trim().toLowerCase();
      const fullName = shadow.getElementById('google-fullname').value.trim();
      const parts = fullName.split(' ');
      const firstname = parts[0] || 'Client';
      const lastname = parts.slice(1).join(' ') || 'Google';

      closeGoogleOverlay();
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Authentification Google : ${email}... 🌐` }));

      saveStorageItem('SWEETOS_logged_in_user', JSON.stringify({ email }));
      await loadUserDataFromSupabase(email);

      const safeKey = email.replace(/[^a-zA-Z0-9]/g, '_');
      const savedProfileStr = getStorageItem(`SWEETOS_user_profile_${safeKey}`) || getStorageItem('SWEETOS_user_profile');
      let savedProfile = null;
      if (savedProfileStr) {
        try {
          savedProfile = JSON.parse(savedProfileStr);
        } catch (err) {}
      }

      // Check if user already has complete profile (phone, commune, address, and city)
      const hasCompleteProfile = savedProfile && 
                                 savedProfile.phone && 
                                 savedProfile.phone.length >= 8 &&
                                 savedProfile.address && 
                                 savedProfile.address.length >= 5 &&
                                 savedProfile.phone !== "+225 600 000 000" && 
                                 savedProfile.address !== "Ivory Coast";

      if (hasCompleteProfile) {
        // Complete profile exists, log in immediately
        saveStorageItem('SWEETOS_user_profile', JSON.stringify(savedProfile));

        window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true, email } }));
        window.dispatchEvent(new CustomEvent('orders:updated'));
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Bon retour, ${savedProfile.firstName} ! Connecté via Google.` }));
        
        onLoginSuccess();
      } else {
        // Profile is incomplete -> Pop up Complete Profile Form!
        if (googleAuthContainer) googleAuthContainer.classList.add('hidden');
        
        if (completeForm) {
          completeForm.classList.remove('hidden');
          completeForm.classList.remove('fade-in-up');
          void completeForm.offsetWidth;
          completeForm.classList.add('fade-in-up');

          shadow.getElementById('complete-email').value = email;
          shadow.getElementById('complete-fullname').value = fullName;
          
          const phoneInput = shadow.getElementById('complete-phone');
          if (phoneInput) phoneInput.focus();
          
          window.dispatchEvent(new CustomEvent('toast:show', { detail: '⚠️ Veuillez compléter vos informations de livraison en Côte d\'Ivoire.' }));
        }
      }
    });
  }

  // Handle complete profile form submit (for Google OAuth users)
  if (completeForm) {
    completeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = shadow.getElementById('complete-email').value.trim().toLowerCase();
      const fullName = shadow.getElementById('complete-fullname').value.trim();
      const parts = fullName.split(' ');
      const first = parts[0] || 'Client';
      const last = parts.slice(1).join(' ') || 'SWEETOS';

      const phonePrefix = shadow.getElementById('complete-phone-prefix').value;
      const rawPhone = shadow.getElementById('complete-phone').value.trim();
      const phone = `${phonePrefix} ${rawPhone}`;

      const city = shadow.getElementById('complete-city').value;
      const commune = shadow.getElementById('complete-commune').value.trim();
      const address = shadow.getElementById('complete-address').value.trim();

      const fullFormattedAddress = `${commune}, ${address}, ${city} • Côte d'Ivoire`;

      const btn = completeForm.querySelector('button[type="submit"]');
      const originalText = btn.innerText;

      btn.innerText = 'Enregistrement du profil...';
      btn.disabled = true;
      btn.classList.add('opacity-70');

      setTimeout(() => {
        btn.innerText = originalText;
        btn.disabled = false;
        btn.classList.remove('opacity-70');

        // Log in user state
        saveStorageItem('SWEETOS_logged_in_user', JSON.stringify({ email }));

        // Save credentials to database (so Admin can manage and see them)
        let creds = [];
        try {
          creds = JSON.parse(getStorageItem('SWEETOS_customer_credentials') || '[]');
        } catch (err) {}

        const existingCredIdx = creds.findIndex(c => c.email.toLowerCase() === email);
        const joinedDate = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const userCred = {
          email: email,
          password: "google_oauth_verified",
          name: fullName,
          phone: phone,
          city: city,
          commune: commune,
          address: fullFormattedAddress,
          joinedDate: joinedDate
        };

        if (existingCredIdx === -1) {
          creds.push(userCred);
        } else {
          creds[existingCredIdx] = userCred;
        }
        saveStorageItem('SWEETOS_customer_credentials', JSON.stringify(creds));

        // Create complete user profile
        const newProfile = {
          firstName: first,
          lastName: last,
          email: email,
          phone: phone,
          bio: "Client SWEETOS Côte d'Ivoire. Compte Google vérifié.",
          city: city,
          commune: commune,
          address: fullFormattedAddress,
          theme: "Ice Blue",
          twoFactor: false,
          marketingEmails: true,
          smsUpdates: true,
          addresses: [
            {
              id: Date.now(),
              label: 'Domicile / Livraison',
              street: address,
              commune: commune,
              city: city,
              phone: phone
            }
          ],
          orders: []
        };
        
        const safeKey = email.replace(/[^a-zA-Z0-9]/g, '_');
        saveStorageItem(`SWEETOS_user_profile_${safeKey}`, JSON.stringify(newProfile));
        saveStorageItem('SWEETOS_user_profile', JSON.stringify(newProfile));

        // Save to Supabase Cloud Database (profiles table)
        import('../../utils/supabase.js').then(({ saveCustomerToSupabase }) => {
          saveCustomerToSupabase({
            name: fullName,
            email: email,
            phone: phone,
            city: city,
            address: fullFormattedAddress
          });
        }).catch(() => {});

        // Dispatch events
        window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true, email } }));
        window.dispatchEvent(new CustomEvent('profile:updated'));
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Bienvenue, ${first} ! Profil complété avec succès. ✨` }));

        onLoginSuccess();
      }, 1000);
    });
  }

  // Initialize customer credentials database if not present
  const initializeCredentials = () => {
    const savedCreds = getStorageItem('SWEETOS_customer_credentials');
    if (!savedCreds) {
      saveStorageItem('SWEETOS_customer_credentials', JSON.stringify([]));
    }
  };

  initializeCredentials();
}
