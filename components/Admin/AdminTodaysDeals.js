/**
 * components/Admin/AdminTodaysDeals.js
 * Admin Studio for Today's Deals (Offres du Jour):
 * - On/Off Switch
 * - Duration Picker (10h to 10 days) + Countdown Engine
 * - 3x4 Product Selector (up to 12 items)
 * - Limited Coupon Bounty Config (5 or 10 coupons of 5% OFF)
 * - Live Banner Preview
 */

import { formatPrice } from '../../utils/storage.js';
import { 
  getTodaysDealsConfig, 
  saveTodaysDealsConfig, 
  resetTodaysDealsTimer, 
  getTimeRemaining, 
  isTodaysDealsActive,
  getTodaysDealsTheme,
  DEAL_BANNER_THEMES
} from '../../utils/todaysDeals.js';

export function renderAdminTodaysDeals(context) {
  const config = getTodaysDealsConfig();
  const allProducts = context.products || [];
  const selectedProductIds = new Set(config.productIds || []);
  const timeInfo = getTimeRemaining(config.endsAt);
  const isActive = isTodaysDealsActive(config);
  const currentTheme = getTodaysDealsTheme(config);

  const selectedProducts = allProducts.filter(p => selectedProductIds.has(p.id));
  const previewProducts = selectedProducts.length > 0 ? selectedProducts : allProducts.slice(0, 6);
  const pool = config.couponPool || { enabled: true, totalCoupons: 5, remainingCoupons: 5, claimedBy: [] };

  return `
    <div class="admin-tab-pane animate-in" style="display: flex; flex-direction: column; gap: 24px;">
      
      <!-- 1. Master ON / OFF Control Header Bar -->
      <div class="admin-card" style="padding: 20px 24px; border-radius: 20px; background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98)); border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; box-shadow: 0 4px 18px rgba(0,0,0,0.03);">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 50px; height: 50px; border-radius: 16px; background: ${config.enabled ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 4px 14px ${config.enabled ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'};">
            ${config.enabled ? '⚡' : '⏸️'}
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 900; color: var(--text-dark);">Offres Flash du Jour</h2>
              <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 850; background: ${config.enabled ? '#ecfdf5; color: #047857; border: 1px solid #a7f3d0;' : '#fef2f2; color: #b91c1c; border: 1px solid #fecaca;'}">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${config.enabled ? '#10b981' : '#ef4444'};"></span>
                ${config.enabled ? 'SECTION ACTIVÉE (ON)' : 'SECTION DÉSACTIVÉE (OFF)'}
              </span>
            </div>
            <p style="margin: 3px 0 0 0; font-size: 13px; color: var(--text-gray);">Activez ou désactivez l'affichage de la section des offres du jour sur la boutique</p>
          </div>
        </div>

        <!-- Big Clear ON / OFF Action Button -->
        <button id="deals-power-toggle-btn" style="padding: 12px 24px; border-radius: 14px; font-size: 14px; font-weight: 900; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s; border: none; background: ${config.enabled ? '#ef4444' : '#10b981'}; color: white; box-shadow: 0 4px 14px ${config.enabled ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'};">
          <span>${config.enabled ? '🔴 ÉTEINDRE (DÉSACTIVER OFF)' : '🟢 ALLUMER (ACTIVER ON)'}</span>
        </button>
      </div>

      <!-- Top Metrics Bar -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        
        <!-- Status Card -->
        <div class="admin-card" style="padding: 18px; border-radius: 16px; display: flex; align-items: center; gap: 14px;">
          <div style="width: 46px; height: 46px; border-radius: 14px; background: ${isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'}; color: ${isActive ? '#10b981' : '#ef4444'}; display: flex; align-items: center; justify-content: center; font-size: 22px;">
            ${isActive ? '⚡' : '⏸️'}
          </div>
          <div>
            <div style="font-size: 18px; font-weight: 900; color: ${isActive ? '#10b981' : '#ef4444'};">
              ${isActive ? 'Actif & En Ligne' : (config.enabled ? 'Expiré (Temps écoulé)' : 'Désactivé')}
            </div>
            <div style="font-size: 11.5px; color: var(--text-gray); font-weight: 700;">Statut de la Section</div>
          </div>
        </div>

        <!-- Timer Card -->
        <div class="admin-card" style="padding: 18px; border-radius: 16px; display: flex; align-items: center; gap: 14px;">
          <div style="width: 46px; height: 46px; border-radius: 14px; background: rgba(0, 82, 204, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 22px;">
            ⏳
          </div>
          <div>
            <div id="admin-deals-live-timer" style="font-size: 18px; font-weight: 900; color: var(--primary); font-family: monospace;">
              ${isActive ? `${timeInfo.days > 0 ? `${timeInfo.days}j ` : ''}${String(timeInfo.hours).padStart(2, '0')}h ${String(timeInfo.minutes).padStart(2, '0')}m ${String(timeInfo.seconds).padStart(2, '0')}s` : '00:00:00'}
            </div>
            <div style="font-size: 11.5px; color: var(--text-gray); font-weight: 700;">Temps Restant Avant Expiration</div>
          </div>
        </div>

        <!-- Products Count Card -->
        <div class="admin-card" style="padding: 18px; border-radius: 16px; display: flex; align-items: center; gap: 14px;">
          <div style="width: 46px; height: 46px; border-radius: 14px; background: rgba(245, 158, 11, 0.1); color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 22px;">
            📦
          </div>
          <div>
            <div style="font-size: 20px; font-weight: 900; color: var(--text-dark);">
              ${selectedProducts.length} / 12
            </div>
            <div style="font-size: 11.5px; color: var(--text-gray); font-weight: 700;">Articles (2 lignes × 6)</div>
          </div>
        </div>

        <!-- Coupon Bounty Card -->
        <div class="admin-card" style="padding: 18px; border-radius: 16px; display: flex; align-items: center; gap: 14px;">
          <div style="width: 46px; height: 46px; border-radius: 14px; background: rgba(124, 58, 237, 0.1); color: #7c3aed; display: flex; align-items: center; justify-content: center; font-size: 22px;">
            🎟️
          </div>
          <div>
            <div style="font-size: 20px; font-weight: 900; color: #7c3aed;">
              ${pool.remainingCoupons} / ${pool.totalCoupons}
            </div>
            <div style="font-size: 11.5px; color: var(--text-gray); font-weight: 700;">Coupons 5% OFF Restants</div>
          </div>
        </div>

      </div>

      <!-- Live Storefront Banner Preview (Dynamic Marquee + Theme Styled) -->
      <div class="admin-card" style="padding: 24px; border-radius: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0; font-size: 15px; font-weight: 850; color: var(--text-dark); text-transform: uppercase; letter-spacing: 0.5px;">Aperçu du Design & Bannière (Thème: ${currentTheme.name})</h3>
            <small style="color: var(--text-gray); font-size: 12px;">Visualisation dynamique avec diaporama d'arrière-plan et défilement marquee</small>
          </div>
          <span style="font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 8px; background: ${isActive ? '#ecfdf5; color: #047857;' : '#fef2f2; color: #b91c1c;'}">
            ${isActive ? 'Bannière En Ligne' : 'Bannière Masquée'}
          </span>
        </div>

        <!-- Theme Preview Box -->
        <div style="background: ${currentTheme.bg}; border-radius: 24px; position: relative; overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.3); border: 1.5px solid rgba(255,255,255,0.15);">
          
          <!-- Background Product Preview Image -->
          ${previewProducts[0] ? `
            <img src="${previewProducts[0].image}" style="position: absolute; right: 0; top: 0; width: 55%; height: 100%; object-fit: cover; opacity: 0.35; filter: saturate(1.3); pointer-events: none;" alt="Preview">
          ` : ''}

          <!-- Gradient Overlay -->
          <div style="position: absolute; inset: 0; background: ${currentTheme.overlayGradient}; pointer-events: none;"></div>
          <div style="position: absolute; right: -40px; top: -40px; width: 260px; height: 260px; background: ${currentTheme.accentColor}; opacity: 0.25; filter: blur(80px); pointer-events: none; border-radius: 50%;"></div>
          
          <!-- Top Hero Content -->
          <div style="position: relative; z-index: 2; padding: 32px 36px 20px 36px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 24px;">
            <div style="max-width: 580px;">
              <div style="display: inline-flex; align-items: center; gap: 8px; background: ${currentTheme.badgeBg}; border: 1px solid ${currentTheme.badgeBorder}; color: ${currentTheme.badgeText}; padding: 5px 14px; border-radius: 30px; font-size: 11.5px; font-weight: 850; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 12px; backdrop-filter: blur(8px);">
                <span>${currentTheme.badgeIcon}</span>
                <span>${currentTheme.tag}</span>
                <span style="opacity: 0.5;">•</span>
                <span style="color: ${currentTheme.accentColor};">TODAY'S SPECIAL</span>
              </div>
              <h2 style="font-size: 28px; font-weight: 900; margin: 0 0 8px 0; color: white; letter-spacing: -0.5px;">${config.title || "Offres Flash du Jour"}</h2>
              <p style="font-size: 13.5px; color: rgba(255,255,255,0.85); margin: 0 0 14px 0; line-height: 1.5;">${config.subtitle || "Sélection exclusive limitée avec compte à rebours — Jusqu'à 50% de réduction !"}</p>
              
              <!-- First Come Bounty Badge -->
              <div style="display: inline-flex; align-items: center; gap: 10px; background: rgba(251, 191, 36, 0.14); border: 1.5px dashed rgba(251, 191, 36, 0.6); padding: 8px 16px; border-radius: 12px; font-size: 12px; color: #fef08a; font-weight: 800; backdrop-filter: blur(8px);">
                <span style="font-size: 16px;">🎁</span>
                <span>${pool.totalCoupons} Coupons 5% OFF offerts aux ${pool.totalCoupons} premiers acheteurs !</span>
                <span style="background: ${currentTheme.accentColor}; color: #0f172a; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 900;">${pool.remainingCoupons} RESTANTS</span>
              </div>
            </div>

            <!-- Countdown Timer Glass Box -->
            <div style="background: rgba(15, 23, 42, 0.65); border: 1.5px solid rgba(255,255,255,0.18); border-radius: 18px; padding: 18px 22px; text-align: center; backdrop-filter: blur(14px); box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
              <div style="font-size: 10px; text-transform: uppercase; font-weight: 850; letter-spacing: 0.8px; color: rgba(255,255,255,0.7); margin-bottom: 10px;">FIN DE L'OFFRE DANS</div>
              <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                <div style="background: rgba(255,255,255,0.1); padding: 8px 10px; border-radius: 10px; min-width: 48px;">
                  <div style="font-size: 20px; font-weight: 900; font-family: monospace; color: white;">${timeInfo.days < 10 ? '0' + timeInfo.days : timeInfo.days}</div>
                  <div style="font-size: 9px; color: rgba(255,255,255,0.6); font-weight: 750;">JOURS</div>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 8px 10px; border-radius: 10px; min-width: 48px;">
                  <div style="font-size: 20px; font-weight: 900; font-family: monospace; color: white;">${timeInfo.hours < 10 ? '0' + timeInfo.hours : timeInfo.hours}</div>
                  <div style="font-size: 9px; color: rgba(255,255,255,0.6); font-weight: 750;">HEURES</div>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 8px 10px; border-radius: 10px; min-width: 48px;">
                  <div style="font-size: 20px; font-weight: 900; font-family: monospace; color: white;">${timeInfo.minutes < 10 ? '0' + timeInfo.minutes : timeInfo.minutes}</div>
                  <div style="font-size: 9px; color: rgba(255,255,255,0.6); font-weight: 750;">MINS</div>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 8px 10px; border-radius: 10px; min-width: 48px;">
                  <div style="font-size: 20px; font-weight: 900; font-family: monospace; color: ${currentTheme.timerAccent};">${timeInfo.seconds < 10 ? '0' + timeInfo.seconds : timeInfo.seconds}</div>
                  <div style="font-size: 9px; color: rgba(255,255,255,0.6); font-weight: 750;">SECS</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Marquee Preview Strip -->
          <div style="background: rgba(15, 23, 42, 0.6); border-top: 1px solid rgba(255,255,255,0.1); padding: 12px 20px; display: flex; gap: 12px; overflow-x: auto;">
            ${previewProducts.slice(0, 6).map(p => `
              <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 6px 12px; display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
                <img src="${p.image}" style="width: 36px; height: 36px; border-radius: 8px; object-fit: cover;">
                <div>
                  <div style="font-size: 11.5px; font-weight: 800; color: white; white-space: nowrap;">${p.name}</div>
                  <div style="font-size: 10.5px; font-weight: 850; color: ${currentTheme.accentColor};">${formatPrice(p.price)}</div>
                </div>
              </div>
            `).join('')}
          </div>

        </div>
      </div>

      <!-- Main Controls Grid: 2 Columns -->
      <div style="display: grid; grid-template-columns: 440px 1fr; gap: 24px; align-items: start;">
        
        <!-- Left Column: Settings, Banner Theme & Coupon Bounty Configuration -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <!-- Card 1: Banner Theme & Style Customizer (NEW!) -->
          <div class="admin-card" style="padding: 24px; border-radius: 20px; display: flex; flex-direction: column; gap: 18px;">
            <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 1.5px solid var(--border);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 22px;">🎨</span>
                <div>
                  <h3 style="margin: 0; font-size: 15px; font-weight: 850; color: var(--text-dark); text-transform: uppercase; letter-spacing: 0.5px;">Thème & Design de la Bannière</h3>
                  <small style="color: var(--text-gray); font-size: 11.5px;">Personnalisez les couleurs et le style visuel</small>
                </div>
              </div>
            </div>

            <!-- Theme Presets Grid -->
            <div>
              <label style="font-size: 12px; font-weight: 800; color: var(--text-dark); display: block; margin-bottom: 8px;">Palette de Couleurs & Ambiance :</label>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${Object.values(DEAL_BANNER_THEMES).map(th => `
                  <button type="button" class="deals-theme-preset-btn ${config.bannerTheme === th.id ? 'active' : ''}" data-theme="${th.id}" style="padding: 10px 14px; border-radius: 12px; font-size: 12.5px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border: 2px solid ${config.bannerTheme === th.id ? 'var(--primary)' : 'var(--border)'}; background: ${config.bannerTheme === th.id ? 'rgba(0,82,204,0.06)' : 'white'}; color: var(--text-dark); transition: all 0.2s;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span style="width: 24px; height: 24px; border-radius: 8px; background: ${th.bgGradient}; border: 1px solid rgba(0,0,0,0.1); display: inline-block;"></span>
                      <span>${th.name}</span>
                    </div>
                    ${config.bannerTheme === th.id ? '<span style="color: var(--primary); font-size: 14px;">✓ Actif</span>' : ''}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Title & Subtitle Customizer -->
            <div style="display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--border); padding-top: 14px;">
              <div>
                <label style="font-size: 11.5px; font-weight: 750; color: var(--text-dark); display: block; margin-bottom: 4px;">Titre de la Bannière :</label>
                <input type="text" id="deals-title-input" name="deals_title_no_autofill" value="${config.title || 'Offres Flash du Jour'}" class="admin-input" style="width: 100%; font-weight: 800;" placeholder="Ex: Smartphones & Tablettes" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
              </div>
              <div>
                <label style="font-size: 11.5px; font-weight: 750; color: var(--text-dark); display: block; margin-bottom: 4px;">Sous-titre / Message d'accroche :</label>
                <input type="text" id="deals-subtitle-input" name="deals_subtitle_no_autofill" value="${config.subtitle || "Sélection exclusive limitée avec compte à rebours — Jusqu'à 50% de réduction !"}" class="admin-input" style="width: 100%;" placeholder="Ex: Dépêchez-vous ! Réductions jusqu'à 50% sur la collection exclusive." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
              </div>
            </div>
          </div>

          <!-- Card 2: Section Activation & Timer Settings -->
          <div class="admin-card" style="padding: 24px; border-radius: 20px; display: flex; flex-direction: column; gap: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 1.5px solid var(--border);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 22px;">⏱️</span>
                <div>
                  <h3 style="margin: 0; font-size: 15px; font-weight: 850; color: var(--text-dark); text-transform: uppercase; letter-spacing: 0.5px;">Activation & Expiration</h3>
                  <small style="color: var(--text-gray); font-size: 11.5px;">Gestion du compte à rebours</small>
                </div>
              </div>
              
              <!-- Master Toggle Switch & Status Indicator -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 12px; font-weight: 850; color: ${config.enabled ? '#047857' : '#94a3b8'};">
                  ${config.enabled ? '🟢 ON' : '⚪ OFF'}
                </span>
                <label style="position: relative; display: inline-block; width: 56px; height: 30px; margin: 0; cursor: pointer;">
                  <input type="checkbox" id="deals-master-toggle" ${config.enabled ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                  <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${config.enabled ? '#10b981' : '#cbd5e1'}; transition: .3s; border-radius: 30px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                    <span style="position: absolute; height: 22px; width: 22px; left: ${config.enabled ? '29px' : '5px'}; bottom: 4px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.25);"></span>
                  </span>
                </label>
              </div>
            </div>

            <!-- Duration Presets -->
            <div>
              <label style="font-size: 12px; font-weight: 800; color: var(--text-dark); display: block; margin-bottom: 8px;">Définir la Durée d'Expiration / Timer Duration:</label>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                <button type="button" class="deals-duration-btn ${config.durationHours === 10 ? 'active' : ''}" data-hours="10" style="padding: 10px 8px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; border: 1.5px solid ${config.durationHours === 10 ? 'var(--primary)' : 'var(--border)'}; background: ${config.durationHours === 10 ? 'rgba(0,82,204,0.08)' : 'white'}; color: ${config.durationHours === 10 ? 'var(--primary)' : 'var(--text-dark)'};">
                  ⚡ 10 Heures
                </button>
                <button type="button" class="deals-duration-btn ${config.durationHours === 24 ? 'active' : ''}" data-hours="24" style="padding: 10px 8px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; border: 1.5px solid ${config.durationHours === 24 ? 'var(--primary)' : 'var(--border)'}; background: ${config.durationHours === 24 ? 'rgba(0,82,204,0.08)' : 'white'}; color: ${config.durationHours === 24 ? 'var(--primary)' : 'var(--text-dark)'};">
                  📅 24 Heures (1J)
                </button>
                <button type="button" class="deals-duration-btn ${config.durationHours === 48 ? 'active' : ''}" data-hours="48" style="padding: 10px 8px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; border: 1.5px solid ${config.durationHours === 48 ? 'var(--primary)' : 'var(--border)'}; background: ${config.durationHours === 48 ? 'rgba(0,82,204,0.08)' : 'white'}; color: ${config.durationHours === 48 ? 'var(--primary)' : 'var(--text-dark)'};">
                  2 Jours
                </button>
                <button type="button" class="deals-duration-btn ${config.durationHours === 72 ? 'active' : ''}" data-hours="72" style="padding: 10px 8px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; border: 1.5px solid ${config.durationHours === 72 ? 'var(--primary)' : 'var(--border)'}; background: ${config.durationHours === 72 ? 'rgba(0,82,204,0.08)' : 'white'}; color: ${config.durationHours === 72 ? 'var(--primary)' : 'var(--text-dark)'};">
                  3 Jours
                </button>
                <button type="button" class="deals-duration-btn ${config.durationHours === 120 ? 'active' : ''}" data-hours="120" style="padding: 10px 8px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; border: 1.5px solid ${config.durationHours === 120 ? 'var(--primary)' : 'var(--border)'}; background: ${config.durationHours === 120 ? 'rgba(0,82,204,0.08)' : 'white'}; color: ${config.durationHours === 120 ? 'var(--primary)' : 'var(--text-dark)'};">
                  5 Jours
                </button>
                <button type="button" class="deals-duration-btn ${config.durationHours === 240 ? 'active' : ''}" data-hours="240" style="padding: 10px 8px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; border: 1.5px solid ${config.durationHours === 240 ? 'var(--primary)' : 'var(--border)'}; background: ${config.durationHours === 240 ? 'rgba(0,82,204,0.08)' : 'white'}; color: ${config.durationHours === 240 ? 'var(--primary)' : 'var(--text-dark)'};">
                  10 Jours
                </button>
              </div>
            </div>

            <!-- Custom Hours Input & Restart Button -->
            <div style="display: flex; gap: 10px; align-items: flex-end;">
              <div style="flex: 1;">
                <label style="font-size: 11px; font-weight: 750; color: var(--text-gray); display: block; margin-bottom: 4px;">Ou Heures Personnalisées:</label>
                <input type="number" id="deals-custom-hours" name="deals_custom_hours_no_autofill" value="${config.durationHours}" min="1" max="720" class="admin-input" style="width: 100%; font-weight: 750;" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
              </div>
              <button type="button" id="deals-reset-timer-btn" class="btn-primary" style="height: 42px; padding: 0 16px; font-size: 12px; font-weight: 800; border-radius: 10px; white-space: nowrap;">
                🔄 Relancer le Compte à Rebours
              </button>
            </div>
          </div>

          <!-- Card 2: Limited First-Come Coupon Bounty Config -->
          <div class="admin-card" style="padding: 24px; border-radius: 20px; display: flex; flex-direction: column; gap: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 1.5px solid var(--border);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 22px;">🎁</span>
                <div>
                  <h3 style="margin: 0; font-size: 15px; font-weight: 850; color: var(--text-dark); text-transform: uppercase; letter-spacing: 0.5px;">Bounty Coupons Premiers Acheteurs</h3>
                  <small style="color: var(--text-gray); font-size: 11.5px;">5% OFF offert aux 5 ou 10 premiers acheteurs</small>
                </div>
              </div>
            </div>

            <!-- Pool Size Picker: 5 or 10 -->
            <div>
              <label style="font-size: 12px; font-weight: 800; color: var(--text-dark); display: block; margin-bottom: 8px;">Nombre de Coupons Gratuits à Distribuer :</label>
              <div style="display: flex; gap: 12px;">
                <button type="button" class="deals-pool-btn ${pool.totalCoupons === 5 ? 'active' : ''}" data-count="5" style="flex: 1; padding: 12px; border-radius: 12px; font-size: 13px; font-weight: 850; cursor: pointer; border: 1.5px solid ${pool.totalCoupons === 5 ? '#7c3aed' : 'var(--border)'}; background: ${pool.totalCoupons === 5 ? 'rgba(124,58,237,0.08)' : 'white'}; color: ${pool.totalCoupons === 5 ? '#7c3aed' : 'var(--text-dark)'};">
                  🎟️ 5 Premiers Acheteurs (5 Coupons)
                </button>
                <button type="button" class="deals-pool-btn ${pool.totalCoupons === 10 ? 'active' : ''}" data-count="10" style="flex: 1; padding: 12px; border-radius: 12px; font-size: 13px; font-weight: 850; cursor: pointer; border: 1.5px solid ${pool.totalCoupons === 10 ? '#7c3aed' : 'var(--border)'}; background: ${pool.totalCoupons === 10 ? 'rgba(124,58,237,0.08)' : 'white'}; color: ${pool.totalCoupons === 10 ? '#7c3aed' : 'var(--text-dark)'};">
                  🎟️ 10 Premiers Acheteurs (10 Coupons)
                </button>
              </div>
            </div>

            <!-- Minimum Purchase Amount to Earn Deal Reward -->
            <div>
              <label style="font-size: 12px; font-weight: 800; color: var(--text-dark); display: block; margin-bottom: 6px;">
                💰 Montant Minimum d'Achat Requis pour Débloquer le Coupon (FCFA) :
              </label>
              <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                <button type="button" class="deals-min-spend-preset-btn ${(config.minSpendForReward || 15000) === 15000 ? 'active' : ''}" data-amount="15000" style="padding: 6px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 800; border: 1.5px solid ${(config.minSpendForReward || 15000) === 15000 ? 'var(--primary)' : 'var(--border)'}; background: ${(config.minSpendForReward || 15000) === 15000 ? 'rgba(0,82,204,0.08)' : 'white'}; color: ${(config.minSpendForReward || 15000) === 15000 ? 'var(--primary)' : 'var(--text-dark)'}; cursor: pointer;">
                  15 000 FCFA
                </button>
                <button type="button" class="deals-min-spend-preset-btn ${(config.minSpendForReward || 15000) === 25000 ? 'active' : ''}" data-amount="25000" style="padding: 6px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 800; border: 1.5px solid ${(config.minSpendForReward || 15000) === 25000 ? 'var(--primary)' : 'var(--border)'}; background: ${(config.minSpendForReward || 15000) === 25000 ? 'rgba(0,82,204,0.08)' : 'white'}; color: ${(config.minSpendForReward || 15000) === 25000 ? 'var(--primary)' : 'var(--text-dark)'}; cursor: pointer;">
                  25 000 FCFA
                </button>
                <button type="button" class="deals-min-spend-preset-btn ${(config.minSpendForReward || 15000) === 50000 ? 'active' : ''}" data-amount="50000" style="padding: 6px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 800; border: 1.5px solid ${(config.minSpendForReward || 15000) === 50000 ? 'var(--primary)' : 'var(--border)'}; background: ${(config.minSpendForReward || 15000) === 50000 ? 'rgba(0,82,204,0.08)' : 'white'}; color: ${(config.minSpendForReward || 15000) === 50000 ? 'var(--primary)' : 'var(--text-dark)'}; cursor: pointer;">
                  50 000 FCFA
                </button>
                <button type="button" class="deals-min-spend-preset-btn ${(config.minSpendForReward || 15000) === 100000 ? 'active' : ''}" data-amount="100000" style="padding: 6px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 800; border: 1.5px solid ${(config.minSpendForReward || 15000) === 100000 ? 'var(--primary)' : 'var(--border)'}; background: ${(config.minSpendForReward || 15000) === 100000 ? 'rgba(0,82,204,0.08)' : 'white'}; color: ${(config.minSpendForReward || 15000) === 100000 ? 'var(--primary)' : 'var(--text-dark)'}; cursor: pointer;">
                  100 000 FCFA
                </button>
              </div>
              <div style="position: relative;">
                <input type="number" id="deals-min-spend-input" name="deals_min_spend_no_autofill" value="${config.minSpendForReward || 15000}" min="0" step="1000" placeholder="15000" class="admin-input" style="width: 100%; font-weight: 850; font-size: 14px; padding: 10px 14px; border-radius: 10px; border: 1.5px solid var(--border);" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
              </div>
              <small style="color: var(--text-gray); font-size: 11px; display: block; margin-top: 4px;">
                Le client reçoit une Boîte Mystère à chaque commande. Si son achat d'articles de l'offre du jour atteint au moins ce montant, la boîte révélera son coupon de réduction de 5% OFF. Sinon, elle donnera "Oups ! Bonne chance pour la prochaine fois !".
              </small>
            </div>

            <!-- Discount percentage display (Fixed at 5% OFF) -->
            <div style="background: rgba(0, 102, 255, 0.05); border: 1.5px dashed #0066ff; border-radius: 12px; padding: 12px 16px; font-size: 12px; color: #0052cc; font-weight: 750;">
              ✨ <strong>Réduction accordée : 5% OFF</strong> sur le prochain achat (Code unique <code>DEAL5-XXXX</code> généré automatiquement pour chaque gagnant).
            </div>

            <!-- Claimers Log -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: 800; color: var(--text-dark);">Acheteurs ayant réclamé le coupon (${pool.claimedBy ? pool.claimedBy.length : 0}/${pool.totalCoupons}) :</span>
                ${pool.claimedBy && pool.claimedBy.length > 0 ? `
                  <button type="button" id="deals-clear-claims-btn" style="background: none; border: none; font-size: 11px; font-weight: 750; color: var(--red); cursor: pointer;">Réinitialiser la liste</button>
                ` : ''}
              </div>

              <div style="background: #f8fafc; border: 1.5px solid var(--border); border-radius: 12px; padding: 12px; max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
                ${(!pool.claimedBy || pool.claimedBy.length === 0) ? `
                  <div style="text-align: center; color: var(--text-gray); font-size: 11.5px; padding: 10px 0;">
                    Aucun coupon réclamé pour le moment. Les ${pool.totalCoupons} coupons sont disponibles !
                  </div>
                ` : pool.claimedBy.map((claim, idx) => `
                  <div style="display: flex; align-items: center; justify-content: space-between; background: white; padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); font-size: 11.5px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-weight: 850; color: #7c3aed;">#${idx + 1}</span>
                      <span style="font-weight: 700; color: var(--text-dark);">${claim.email}</span>
                    </div>
                    <code style="font-weight: 800; color: var(--primary); font-size: 11px;">${claim.code}</code>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Save Deals Settings Button -->
            <button type="button" id="deals-save-settings-btn" class="btn-primary" style="height: 44px; font-size: 13.5px; font-weight: 850; border-radius: 12px;">
              💾 Enregistrer les Paramètres & Bannière
            </button>
          </div>

        </div>

        <!-- Right Column: 3x4 Product Selection Grid (Up to 12 items) -->
        <div class="admin-card" style="padding: 24px; border-radius: 20px; display: flex; flex-direction: column; gap: 20px;">
          
          <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 1.5px solid var(--border); flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 22px;">🛍️</span>
              <div>
                <h3 style="margin: 0; font-size: 15px; font-weight: 850; color: var(--text-dark); text-transform: uppercase; letter-spacing: 0.5px;">Sélection des Produits (2 Lignes × 6 = 12 Max)</h3>
                <small style="color: var(--text-gray); font-size: 11.5px;">Sélectionnez exactement les articles à présenter dans les 2 lignes (6 produits par ligne)</small>
              </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="deals-selected-counter" style="font-size: 12px; font-weight: 850; padding: 4px 12px; border-radius: 20px; background: rgba(0,82,204,0.1); color: var(--primary);">
                ${selectedProductIds.size} / 12 sélectionnés
              </span>
              <button type="button" id="deals-select-top12-btn" class="btn-secondary" style="height: 32px; padding: 0 12px; font-size: 11.5px; font-weight: 750; border-radius: 8px;">
                Auto-remplir Top 12
              </button>
            </div>
          </div>

          <!-- Search Filter for Products -->
          <div>
            <input type="search" role="searchbox" aria-label="Search" id="deals-product-search-input" name="q_search_no_credentials" placeholder="🔍 Rechercher un produit à ajouter aux offres..." class="admin-input" style="width: 100%; font-size: 12.5px; font-weight: 600;" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false">
          </div>

          <!-- Products Checkbox Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; max-height: 520px; overflow-y: auto; padding-right: 4px;">
            ${allProducts.map(p => {
              const isSelected = selectedProductIds.has(p.id);
              return `
                <div class="deals-product-card" data-product-id="${p.id}" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px; border: 1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}; background: ${isSelected ? 'rgba(0,82,204,0.04)' : 'white'}; cursor: pointer; transition: all 0.2s;">
                  <input type="checkbox" class="deals-prod-cb" data-product-id="${p.id}" ${isSelected ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer;">
                  <img src="${p.image}" alt="${p.name}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border);">
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 12px; font-weight: 800; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
                    <div style="font-size: 11px; font-weight: 750; color: var(--primary); margin-top: 2px;">${formatPrice(p.price)}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- 2x6 Layout Visual Slot Map -->
          <div style="background: #f8fafc; border: 1.5px solid var(--border); border-radius: 16px; padding: 16px;">
            <div style="font-size: 11px; font-weight: 800; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
              Disposition Storefront (2 lignes de 6 produits) :
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${[0, 1].map(rowIdx => `
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 10px; font-weight: 800; color: var(--text-gray); width: 50px;">LIGNE ${rowIdx + 1}</span>
                  <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; flex: 1;">
                    ${[0, 1, 2, 3, 4, 5].map(colIdx => {
                      const itemIdx = rowIdx * 6 + colIdx;
                      const prod = selectedProducts[itemIdx];
                      return `
                        <div style="height: 38px; border-radius: 8px; border: 1.5px dashed ${prod ? 'var(--primary)' : '#cbd5e1'}; background: ${prod ? 'white' : 'transparent'}; display: flex; align-items: center; gap: 4px; padding: 0 6px; font-size: 10px; font-weight: 750; color: ${prod ? 'var(--text-dark)' : '#94a3b8'}; overflow: hidden;">
                          ${prod ? `
                            <img src="${prod.image}" style="width: 22px; height: 22px; border-radius: 4px; object-fit: cover;">
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 10px;">${prod.name.split(' ')[0]}</span>
                          ` : `Slot #${itemIdx + 1}`}
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

      </div>

    </div>
  `;
}

export function attachAdminTodaysDealsListeners(context, shadow) {
  let config = getTodaysDealsConfig();
  let selectedIds = new Set(config.productIds || []);

  // 1. Duration Preset Buttons
  shadow.querySelectorAll('.deals-duration-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const hours = parseInt(btn.getAttribute('data-hours'));
      shadow.querySelectorAll('.deals-duration-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const customInput = shadow.getElementById('deals-custom-hours');
      if (customInput) customInput.value = hours;
      
      config.durationHours = hours;
    });
  });

  // 2. Pool Count Buttons (5 or 10)
  shadow.querySelectorAll('.deals-pool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const count = parseInt(btn.getAttribute('data-count'));
      shadow.querySelectorAll('.deals-pool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      if (!config.couponPool) config.couponPool = {};
      config.couponPool.totalCoupons = count;
      config.couponPool.remainingCoupons = Math.max(0, count - (config.couponPool.claimedBy ? config.couponPool.claimedBy.length : 0));
    });
  });

  // 3. Reset / Restart Timer Button
  const resetBtn = shadow.getElementById('deals-reset-timer-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const customHours = parseInt(shadow.getElementById('deals-custom-hours')?.value || config.durationHours || 24);
      config = resetTodaysDealsTimer(customHours);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `⚡ Compte à rebours relancé avec succès pour ${customHours} heures !` }));
      context.render();
      context.attachListeners();
    });
  }

  // 3b. Big Power Toggle Button On/Off
  const powerBtn = shadow.getElementById('deals-power-toggle-btn');
  if (powerBtn) {
    powerBtn.addEventListener('click', () => {
      config.enabled = !config.enabled;
      saveTodaysDealsConfig(config);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Section Offres du Jour ${config.enabled ? '🟢 ACTIVÉE (ON)' : '🔴 DÉSACTIVÉE (OFF)'} !` }));
      context.render();
      context.attachListeners();
    });
  }

  // 4. Master Toggle On/Off Switch
  const masterToggle = shadow.getElementById('deals-master-toggle');
  if (masterToggle) {
    masterToggle.addEventListener('change', (e) => {
      config.enabled = e.target.checked;
      saveTodaysDealsConfig(config);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Section Offres du Jour ${config.enabled ? '🟢 ACTIVÉE (ON)' : '🔴 DÉSACTIVÉE (OFF)'} !` }));
      context.render();
      context.attachListeners();
    });
  }

  // 5. Product Checkboxes & Card Clicks
  shadow.querySelectorAll('.deals-prod-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const prodId = parseInt(cb.getAttribute('data-product-id'));
      if (e.target.checked) {
        if (selectedIds.size >= 12) {
          e.target.checked = false;
          window.dispatchEvent(new CustomEvent('toast:show', { detail: '⚠️ Maximum de 12 produits atteint (3 lignes de 4 produits) !' }));
          return;
        }
        selectedIds.add(prodId);
      } else {
        selectedIds.delete(prodId);
      }
      config.productIds = Array.from(selectedIds);
      saveTodaysDealsConfig(config);
      context.render();
      context.attachListeners();
    });
  });

  // Auto-fill Top 12
  const top12Btn = shadow.getElementById('deals-select-top12-btn');
  if (top12Btn) {
    top12Btn.addEventListener('click', () => {
      const allProds = context.products || [];
      const top12Ids = allProds.slice(0, 12).map(p => p.id);
      config.productIds = top12Ids;
      saveTodaysDealsConfig(config);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: '✨ 12 produits ajoutés automatiquement !' }));
      context.render();
      context.attachListeners();
    });
  }

  // 6. Search Filter
  const searchInput = shadow.getElementById('deals-product-search-input');
  if (searchInput) {
    if (context.isAutofilledCredential && context.isAutofilledCredential(searchInput.value)) {
      searchInput.value = '';
    }
    searchInput.addEventListener('input', (e) => {
      let term = e.target.value.toLowerCase().trim();
      if (context.isAutofilledCredential && context.isAutofilledCredential(term)) {
        e.target.value = '';
        term = '';
      }
      shadow.querySelectorAll('.deals-product-card').forEach(card => {
        const prodName = card.querySelector('div')?.textContent?.toLowerCase() || '';
        if (prodName.includes(term)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  // 7. Clear Claims
  const clearClaimsBtn = shadow.getElementById('deals-clear-claims-btn');
  if (clearClaimsBtn) {
    clearClaimsBtn.addEventListener('click', () => {
      if (config.couponPool) {
        config.couponPool.claimedBy = [];
        config.couponPool.remainingCoupons = config.couponPool.totalCoupons || 5;
        saveTodaysDealsConfig(config);
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Liste des gagnants réinitialisée !' }));
        context.render();
        context.attachListeners();
      }
    });
  }

  // 7b. Min Spend Preset Buttons
  shadow.querySelectorAll('.deals-min-spend-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const amt = parseInt(btn.getAttribute('data-amount') || '15000');
      config.minSpendForReward = amt;
      const inputEl = shadow.getElementById('deals-min-spend-input');
      if (inputEl) inputEl.value = amt;
      saveTodaysDealsConfig(config);
      context.render();
      context.attachListeners();
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Montant minimum d'achat fixé à ${amt.toLocaleString()} FCFA ! 💰` }));
    });
  });

  // 7c. Banner Theme Preset Buttons
  shadow.querySelectorAll('.deals-theme-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const themeId = btn.getAttribute('data-theme');
      config.bannerTheme = themeId;
      saveTodaysDealsConfig(config);
      context.render();
      context.attachListeners();
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `🎨 Thème de bannière changé : ${DEAL_BANNER_THEMES[themeId]?.name || themeId} !` }));
    });
  });

  // 8. Save Settings Button
  const saveSettingsBtn = shadow.getElementById('deals-save-settings-btn');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const customHours = parseInt(shadow.getElementById('deals-custom-hours')?.value || config.durationHours || 24);
      const minSpend = parseInt(shadow.getElementById('deals-min-spend-input')?.value || config.minSpendForReward || 15000);
      const title = shadow.getElementById('deals-title-input')?.value.trim() || config.title;
      const subtitle = shadow.getElementById('deals-subtitle-input')?.value.trim() || config.subtitle;
      
      config.durationHours = customHours;
      config.minSpendForReward = minSpend;
      config.title = title;
      config.subtitle = subtitle;
      config.productIds = Array.from(selectedIds);
      saveTodaysDealsConfig(config);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: '💾 Configuration & Design des Offres du Jour enregistrés avec succès !' }));
      context.render();
      context.attachListeners();
    });
  }
}
