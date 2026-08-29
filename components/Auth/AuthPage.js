import { getProfileStorageKey, saveStorageItem, getStorageItem, loadUserDataFromSupabase } from '../../utils/storage.js';

export function getAuthPageHTML() {
  return `
    <!-- Tailwind & Font & Icons CDN -->
    <link href="https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/style.css">
    <link rel="stylesheet" href="./components/Auth/AuthPage.css">

    <div class="auth-wrapper rounded-3xl w-full">
      <!-- Background Ambient Glows -->
      <div class="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#0052cc]/10 rounded-full blur-[120px] animate-float pointer-events-none"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#00b4d8]/5 rounded-full blur-[120px] animate-float pointer-events-none" style="animation-delay: -3s;"></div>

      <!-- Main Container -->
      <div class="w-full max-w-6xl h-auto min-h-[75vh] glass-panel rounded-3xl overflow-hidden flex shadow-2xl relative z-10">
          
          <!-- Left Side: Visuals (Hidden on mobile) -->
          <div class="hidden lg:flex w-1/2 relative overflow-hidden bg-slate-900">
              <img id="side-image" src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop" alt="Luxury Tech & Lifestyle" class="absolute inset-0 w-full h-full object-cover opacity-50 hover:scale-105 transition-transform duration-[10s] ease-linear">
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50"></div>
              
              <div class="relative z-10 flex flex-col justify-between h-full p-12">
                  <div>
                      <h1 class="text-4xl font-bold tracking-tighter text-white mb-2">SWEETOS</h1>
                      <p class="text-slate-300 text-sm tracking-widest uppercase">E-Commerce & High-End Tech Côte d'Ivoire 🇨🇮</p>
                  </div>
                  
                  <div class="mb-12">
                      <h2 class="text-5xl font-light leading-tight mb-6">Sublimez votre <br><span class="font-semibold text-gradient">espace de travail.</span></h2>
                      <p class="text-slate-400 max-w-xs leading-relaxed">Rejoignez notre boutique exclusive en Côte d'Ivoire. Livraison rapide à Abidjan et dans toutes les villes de l'intérieur.</p>
                  </div>

                  <div class="flex gap-4 text-slate-500 text-sm">
                      <span>&copy; 2026 SWEETOS Côte d'Ivoire</span>
                      <span>•</span>
                      <span>Confidentialité</span>
                      <span>•</span>
                      <span>Conditions</span>
                  </div>
              </div>
          </div>

          <!-- Right Side: Forms -->
          <div class="w-full lg:w-1/2 p-8 md:p-10 lg:p-12 flex flex-col justify-center relative light-glass-column text-gray-800">
              
              <!-- Mobile Logo -->
              <div class="lg:hidden absolute top-8 left-8 text-2xl font-bold tracking-tighter text-gray-800">SWEETOS</div>

              <!-- Form Container -->
              <div class="w-full max-w-md mx-auto py-4">

                  <!-- LOGIN FORM -->
                  <form id="login-form" class="fade-in-up block">
                      <div class="flex flex-col items-center mb-6">
                        <div class="w-14 h-14 rounded-full bg-brand-light flex items-center justify-center text-brand mb-3">
                          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-800">Bon retour parmi nous</h3>
                        <p class="text-gray-500 text-sm mt-1">Connectez-vous à votre compte SWEETOS</p>
                      </div>

                      <!-- Google Button -->
                      <button type="button" id="google-login-btn" class="btn-google w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold mb-6">
                          <svg style="width: 20px; height: 20px; flex-shrink: 0;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Continuer avec Google
                      </button>

                      <div class="relative flex py-2 items-center mb-6">
                          <div class="flex-grow border-t border-gray-200"></div>
                          <span class="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-wider font-semibold">Ou par e-mail</span>
                          <div class="flex-grow border-t border-gray-200"></div>
                      </div>

                      <div class="space-y-4">
                          <div class="form-group">
                              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Adresse e-mail</label>
                              <div class="relative">
                                  <i class="ph ph-envelope-simple absolute left-4 top-3.5 text-gray-400"></i>
                                  <input type="email" id="signin-email" placeholder="vous@exemple.ci" required autocomplete="email" class="light-input-field w-full pl-11 pr-4 py-3 rounded-xl text-sm">
                              </div>
                          </div>
                          
                          <div class="form-group">
                              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe</label>
                              <div class="relative">
                                  <i class="ph ph-lock-key absolute left-4 top-3.5 text-gray-400"></i>
                                  <input type="password" id="signin-password" placeholder="Entrez votre mot de passe" required autocomplete="current-password" class="light-input-field w-full pl-11 pr-10 py-3 rounded-xl text-sm">
                                  <button type="button" id="toggle-signin-pass" class="absolute right-4 top-3.5 text-gray-400 hover:text-brand transition-colors focus:outline-none">
                                      <i class="ph ph-eye text-lg"></i>
                                  </button>
                              </div>
                          </div>
                      </div>

                      <div class="flex justify-between items-center mt-4 mb-6">
                          <label class="flex items-center space-x-2 cursor-pointer">
                              <input type="checkbox" class="custom-checkbox custom-checkbox-input">
                              <div class="w-4.5 h-4.5 border border-gray-300 rounded flex items-center justify-center transition-colors bg-white">
                                  <i class="ph ph-check text-[10px] text-white opacity-0 custom-check-icon"></i>
                              </div>
                              <span class="text-xs text-gray-600">Se souvenir de moi</span>
                          </label>
                          <a href="#" class="text-xs text-brand font-semibold hover:underline">Mot de passe oublié ?</a>
                      </div>

                      <button type="submit" class="w-full btn-brand font-semibold py-3.5 rounded-xl active:scale-[0.98]">
                          Se Connecter
                      </button>

                      <div class="mt-6 text-center text-sm text-gray-500">
                          Vous n'avez pas de compte ? <a href="#" id="to-signup-link" class="text-brand font-semibold hover:underline">Créer un compte</a>
                      </div>
                  </form>

                  <!-- REGISTER FORM (COMPULSORY ALL-IN-ONE FOR CÔTE D'IVOIRE) -->
                  <form id="register-form" class="hidden fade-in-up">
                      <div class="flex flex-col items-center mb-6">
                        <div class="w-14 h-14 rounded-full bg-brand-light flex items-center justify-center text-brand mb-3">
                          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <line x1="19" y1="8" x2="19" y2="14"></line>
                            <line x1="22" y1="11" x2="16" y2="11"></line>
                          </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-800">Créer un Compte Client</h3>
                        <p class="text-gray-500 text-sm mt-1">Toutes les informations ci-dessous sont obligatoires pour la livraison</p>
                      </div>

                      <!-- Google Button -->
                      <button type="button" id="google-register-btn" class="btn-google w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold mb-6">
                          <svg style="width: 20px; height: 20px; flex-shrink: 0;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Continuer avec Google
                      </button>

                      <div class="relative flex py-2 items-center mb-6">
                          <div class="flex-grow border-t border-gray-200"></div>
                          <span class="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-wider font-semibold">Ou formulaire d'inscription complet</span>
                          <div class="flex-grow border-t border-gray-200"></div>
                      </div>

                      <div class="space-y-4">
                          <!-- Full Name -->
                          <div class="form-group">
                              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Nom et Prénom complets *</label>
                              <input type="text" id="signup-fullname" placeholder="Ex: Marc Aurele" required autocomplete="name" class="light-input-field w-full px-4 py-3 rounded-xl text-sm">
                          </div>

                          <!-- Email Address -->
                          <div class="form-group">
                              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Adresse e-mail *</label>
                              <input type="email" id="signup-email" placeholder="vous@exemple.ci" required autocomplete="email" class="light-input-field w-full px-4 py-3 rounded-xl text-sm">
                          </div>

                          <!-- Password -->
                          <div class="form-group">
                              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe sécurisé *</label>
                              <div class="relative">
                                  <input type="password" id="signup-password" placeholder="Minimum 6 caractères" required autocomplete="new-password" class="light-input-field w-full pl-4 pr-10 py-3 rounded-xl text-sm">
                                  <button type="button" id="toggle-signup-pass" class="absolute right-3 top-3.5 text-gray-400 hover:text-brand transition-colors focus:outline-none">
                                      <i class="ph ph-eye text-lg"></i>
                                  </button>
                              </div>
                          </div>

                          <!-- Phone Number (Prefix Dropdown + Input) -->
                          <div class="form-group">
                              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Numéro WhatsApp / Téléphone de contact *</label>
                              <div class="flex gap-2">
                                  <select id="signup-phone-prefix" class="light-input-field px-3 py-3 rounded-xl text-sm bg-white" style="width: 110px;">
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
                                  <input type="tel" id="signup-phone" placeholder="05 00 61 99 23" required autocomplete="tel" class="flex-1 light-input-field px-4 py-3 rounded-xl text-sm">
                              </div>
                              <span class="block text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                                  <i class="ph ph-info text-xs"></i> Utilisé par nos livreurs pour vous joindre lors des expéditions
                              </span>
                          </div>

                          <!-- City / Region in Ivory Coast -->
                          <div class="form-group">
                              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Ville / Région (Côte d'Ivoire) *</label>
                              <select id="signup-city" required class="w-full px-4 py-3 rounded-xl light-input-field text-sm bg-white">
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
                              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Commune / Quartier *</label>
                              <input type="text" id="signup-commune" placeholder="Ex: Cocody Angré 8ème Tranche / Marcory Zone 4 / Plateau" required class="light-input-field w-full px-4 py-3 rounded-xl text-sm">
                          </div>

                          <!-- Street Address & Landmark -->
                          <div class="form-group">
                              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Rue & Repère précis de livraison *</label>
                              <input type="text" id="signup-address" placeholder="Ex: Près de la Pharmacie des Grâces, Immeuble Horizon" required autocomplete="street-address" class="light-input-field w-full px-4 py-3 rounded-xl text-sm">
                              <span class="block text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                                  <i class="ph ph-info text-xs"></i> Indiquez un repère clair pour faciliter la livraison rapide
                              </span>
                          </div>
                      </div>

                      <!-- Accept Terms Checkbox -->
                      <div class="mt-5 mb-5">
                          <label class="flex items-start space-x-3 cursor-pointer">
                              <input type="checkbox" required class="custom-checkbox custom-checkbox-input">
                              <div class="w-5 h-5 min-w-[20px] border border-gray-300 rounded flex items-center justify-center transition-colors mt-0.5 bg-white">
                                  <i class="ph ph-check text-xs text-white opacity-0 custom-check-icon"></i>
                              </div>
                              <span class="text-xs text-gray-600 leading-relaxed">
                                  J'accepte les conditions de vente et la politique de confidentialité de SWEETOS.
                              </span>
                          </label>
                      </div>

                      <button type="submit" class="w-full btn-brand font-semibold py-3.5 rounded-xl active:scale-[0.98]">
                          Créer mon Compte
                      </button>

                      <div class="mt-6 text-center text-sm text-gray-500">
                          Vous avez déjà un compte ? <a href="#" id="to-signin-link" class="text-brand font-semibold hover:underline">Se Connecter</a>
                      </div>
                  </form>

                  <!-- COMPLETE PROFILE FORM (TRIGGERED AFTER GOOGLE AUTH IF MISSING INFO) -->
                  <form id="complete-profile-form" class="hidden fade-in-up">
                      <div class="flex flex-col items-center mb-6">
                        <div class="w-14 h-14 rounded-full bg-brand-light flex items-center justify-center text-brand mb-3">
                          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-800">Finaliser votre Profil</h3>
                        <p class="text-gray-500 text-sm mt-1 text-center">Veuillez renseigner votre contact WhatsApp et votre lieu de livraison en Côte d'Ivoire pour commander</p>
                      </div>

                      <div class="space-y-4">
                          <!-- Email Address (Read-only) -->
                          <div class="form-group">
                              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Adresse e-mail Google (Vérifiée)</label>
                              <input type="email" id="complete-email" readonly class="light-input-field w-full px-4 py-3 rounded-xl text-sm bg-gray-100 cursor-not-allowed">
                          </div>

                          <!-- Full Name -->
                          <div class="form-group">
                              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Nom et Prénom complets *</label>
                              <input type="text" id="complete-fullname" placeholder="Ex: Marc Aurele" required autocomplete="name" class="light-input-field w-full px-4 py-3 rounded-xl text-sm">
                          </div>

                          <!-- Phone Number (Prefix Dropdown + Input) -->
                          <div class="form-group">
                              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Numéro WhatsApp / Téléphone de réception *</label>
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
                              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Ville / Région (Côte d'Ivoire) *</label>
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
                              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Commune / Quartier *</label>
                              <input type="text" id="complete-commune" placeholder="Ex: Cocody Angré 8ème Tranche / Marcory Zone 4 / Plateau" required class="light-input-field w-full px-4 py-3 rounded-xl text-sm">
                          </div>

                          <!-- Street Address & Landmark -->
                          <div class="form-group">
                              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Rue & Repère précis de livraison *</label>
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
  const formSignin = shadow.getElementById('login-form');
  const formSignup = shadow.getElementById('register-form');
  const completeForm = shadow.getElementById('complete-profile-form');

  const showSignin = () => {
    formSignin.classList.remove('hidden');
    formSignup.classList.add('hidden');
    if (completeForm) completeForm.classList.add('hidden');

    formSignin.classList.remove('fade-in-up');
    void formSignin.offsetWidth; 
    formSignin.classList.add('fade-in-up');
  };

  const showSignup = () => {
    formSignup.classList.remove('hidden');
    formSignin.classList.add('hidden');
    if (completeForm) completeForm.classList.add('hidden');

    formSignup.classList.remove('fade-in-up');
    void formSignup.offsetWidth; 
    formSignup.classList.add('fade-in-up');
  };

  // Switch form links
  const toSigninLink = shadow.getElementById('to-signin-link');
  const toSignupLink = shadow.getElementById('to-signup-link');
  if (toSigninLink) toSigninLink.addEventListener('click', (e) => { e.preventDefault(); showSignin(); });
  if (toSignupLink) toSignupLink.addEventListener('click', (e) => { e.preventDefault(); showSignup(); });

  // Password visibility toggle helpers
  const setupPassToggle = (btnId, inputId) => {
    const btn = shadow.getElementById(btnId);
    const input = shadow.getElementById(inputId);
    if (btn && input) {
      btn.addEventListener('click', () => {
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
          input.type = 'text';
          icon.classList.remove('ph-eye');
          icon.classList.add('ph-eye-slash');
        } else {
          input.type = 'password';
          icon.classList.remove('ph-eye-slash');
          icon.classList.add('ph-eye');
        }
      });
    }
  };

  setupPassToggle('toggle-signin-pass', 'signin-password');
  setupPassToggle('toggle-signup-pass', 'signup-password');

  // Checkbox styling visual updates
  const checkboxes = shadow.querySelectorAll('.custom-checkbox');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', function() {
      const icon = this.nextElementSibling.querySelector('.custom-check-icon');
      if (this.checked) {
        icon.style.opacity = '1';
      } else {
        icon.style.opacity = '0';
      }
    });
  });

  // Handle Google button clicks & Simulated OAuth Overlay
  const googleLoginBtn = shadow.getElementById('google-login-btn');
  const googleRegisterBtn = shadow.getElementById('google-register-btn');
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

  const handleGoogleClick = async () => {
    try {
      const { signInWithGoogle } = await import('../../utils/supabase.js');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Redirection vers Google Auth... 🔒' }));
      await signInWithGoogle();
    } catch(err) {
      console.warn('[Google OAuth Error - Fallback to Modal]:', err.message);
      openGoogleOverlay();
    }
  };

  if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleGoogleClick);
  if (googleRegisterBtn) googleRegisterBtn.addEventListener('click', handleGoogleClick);
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
        formSignin.classList.add('hidden');
        formSignup.classList.add('hidden');
        
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

  // Handle signin form submit
  if (formSignin) {
    formSignin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = shadow.getElementById('signin-email').value.trim().toLowerCase();
      const password = shadow.getElementById('signin-password').value;
      const btn = formSignin.querySelector('button[type="submit"]');
      const originalText = btn.innerText;

      // Validate credentials
      const creds = JSON.parse(getStorageItem('SWEETOS_customer_credentials') || '[]');
      let userMatch = creds.find(u => u.email.toLowerCase() === email);

      if (!userMatch) {
        // Fallback: allow Supabase password auth login if user exists in Supabase
        userMatch = { email, name: email.split('@')[0] };
      }

      btn.innerText = 'Connexion en cours...';
      btn.disabled = true;
      btn.classList.add('opacity-70');

      try {
        saveStorageItem('SWEETOS_logged_in_user', JSON.stringify({ email }));
        
        // Await full user data & orders sync from Supabase Cloud
        await loadUserDataFromSupabase(email);

        // Clear any previous session revocation signal upon authenticating
        import('../../utils/supabase.js').then(({ clearCustomerRevocationInSupabase, fetchProfileFromSupabase }) => {
          clearCustomerRevocationInSupabase(email);
          fetchProfileFromSupabase(email);
        }).catch(() => {});

        const profileKey = `SWEETOS_user_profile_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        let saved = getStorageItem(profileKey);
        if (!saved) {
          const parts = (userMatch.name || 'Client').split(' ');
          const first = parts[0] || 'Client';
          const last = parts.slice(1).join(' ') || 'SWEETOS';
          
          const defaultProfile = {
            firstName: first,
            lastName: last,
            email: email,
            phone: userMatch.phone || "+225 05 00 61 99 23",
            bio: "Client SWEETOS Côte d'Ivoire.",
            city: userMatch.city || "Abidjan",
            commune: userMatch.commune || "Cocody",
            address: userMatch.address || "Abidjan, Côte d'Ivoire",
            theme: "Ice Blue",
            twoFactor: false,
            marketingEmails: true,
            smsUpdates: false,
            addresses: [
              {
                id: Date.now(),
                label: 'Domicile / Livraison',
                street: userMatch.address || "Cocody Angré",
                commune: userMatch.commune || "Cocody",
                city: userMatch.city || "Abidjan",
                phone: userMatch.phone || "+225 05 00 61 99 23"
              }
            ],
            orders: []
          };
          saveStorageItem(profileKey, JSON.stringify(defaultProfile));
          saveStorageItem('SWEETOS_user_profile', JSON.stringify(defaultProfile));
        } else {
          saveStorageItem('SWEETOS_user_profile', saved);
        }

        window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true, email } }));
        window.dispatchEvent(new CustomEvent('profile:updated'));
        window.dispatchEvent(new CustomEvent('orders:updated'));
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Bon retour sur SWEETOS, ${userMatch.name || email} ! 🎉` }));
        
        onLoginSuccess();
      } finally {
        btn.innerText = originalText;
        btn.disabled = false;
        btn.classList.remove('opacity-70');
      }
    });
  }

  // Handle signup form submit
  if (formSignup) {
    formSignup.addEventListener('submit', (e) => {
      e.preventDefault();
      const fullName = shadow.getElementById('signup-fullname').value.trim();
      const parts = fullName.split(' ');
      const first = parts[0] || 'Client';
      const last = parts.slice(1).join(' ') || 'SWEETOS';

      const email = shadow.getElementById('signup-email').value.trim().toLowerCase();
      
      const phonePrefix = shadow.getElementById('signup-phone-prefix').value;
      const rawPhone = shadow.getElementById('signup-phone').value.trim();
      const phone = `${phonePrefix} ${rawPhone}`;

      const city = shadow.getElementById('signup-city').value;
      const commune = shadow.getElementById('signup-commune').value.trim();
      const address = shadow.getElementById('signup-address').value.trim();
      const password = shadow.getElementById('signup-password').value;

      const fullFormattedAddress = `${commune}, ${address}, ${city} • Côte d'Ivoire`;

      if (password.length < 6) {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: "Le mot de passe doit comporter au moins 6 caractères ! ⚠️" }));
        return;
      }

      // Check if email already exists
      const creds = JSON.parse(getStorageItem('SWEETOS_customer_credentials') || '[]');
      const emailExists = creds.some(u => u.email.toLowerCase() === email);
      if (emailExists) {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Cet e-mail est déjà enregistré ! Veuillez vous connecter. ⚠️' }));
        return;
      }

      const btn = formSignup.querySelector('button[type="submit"]');
      const originalText = btn.innerText;

      btn.innerText = 'Création du compte...';
      btn.disabled = true;
      btn.classList.add('opacity-70');

      setTimeout(() => {
        btn.innerText = originalText;
        btn.disabled = false;
        btn.classList.remove('opacity-70');

        const joinedDate = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

        // Save to Supabase Cloud Database (profiles table) & clear revocation
        import('../../utils/supabase.js').then(({ saveCustomerToSupabase, clearCustomerRevocationInSupabase, supabase }) => {
          clearCustomerRevocationInSupabase(email);
          saveCustomerToSupabase({
            name: fullName,
            email: email,
            phone: phone,
            city: city,
            address: fullFormattedAddress
          });
          if (supabase) {
            supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, phone } } }).catch(() => {});
          }
        }).catch(() => {});

        // Save to local session & credentials database
        creds.push({
          email: email,
          password: password,
          name: fullName,
          phone: phone,
          city: city,
          commune: commune,
          address: fullFormattedAddress,
          joinedDate: joinedDate
        });
        saveStorageItem('SWEETOS_customer_credentials', JSON.stringify(creds));

        const newProfile = {
          firstName: first,
          lastName: last,
          email: email,
          phone: phone,
          bio: "Client SWEETOS Côte d'Ivoire.",
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
        
        saveStorageItem('SWEETOS_logged_in_user', JSON.stringify({ email }));
        
        const safeKey = email.replace(/[^a-zA-Z0-9]/g, '_');
        saveStorageItem(`SWEETOS_user_profile_${safeKey}`, JSON.stringify(newProfile));
        saveStorageItem('SWEETOS_user_profile', JSON.stringify(newProfile));

        window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true, email } }));
        window.dispatchEvent(new CustomEvent('profile:updated'));
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Compte créé avec succès ! Bienvenue ${first} 🎈` }));

        onLoginSuccess();
      }, 1000);
    });
  }
}
