import { CUSTOMER_LEVELS, VERIFIED_BADGES, renderVerificationBadge, renderLevelPill, getCustomerLevel, getCustomerBadge, grantBadgeReward, getBadgeRewardCoupon, getCustomerAvatarStyle, renderLevelChevronV } from '../../utils/badges.js';
import { formatPrice, isLocalDevHost } from '../../utils/storage.js';

let searchQuery = '';
let filterTier = 'all';
let filterBadge = 'all';
let selectedCustomerEmail = null;

export function renderAdminLoyalty(context) {
  const customers = context.customers || [];
  const orders = context.orders || [];

  // Calculate statistics across all customers
  let stats = {
    total: customers.length,
    starter: 0,
    level_1: 0,
    level_2: 0,
    level_3: 0,
    level_4: 0,
    level_5: 0,
    verified: 0
  };

  customers.forEach(c => {
    const custOrders = orders.filter(o => o.customerEmail && o.customerEmail.toLowerCase() === (c.email || '').toLowerCase());
    const totalSpent = custOrders.length > 0 
      ? custOrders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
      : (c.totalSpent || 0);

    const levelObj = getCustomerLevel(totalSpent, c.level);
    const levelKey = levelObj.id;
    if (stats[levelKey] !== undefined) {
      stats[levelKey]++;
    }

    const badge = c.badgeType || 'none';
    if (badge !== 'none') {
      stats.verified++;
    }
  });

  // Filter customers list
  const filteredCustomers = customers.filter(c => {
    const name = (c.name || '').toLowerCase();
    const email = (c.email || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q || name.includes(q) || email.includes(q);

    const custOrders = orders.filter(o => o.customerEmail && o.customerEmail.toLowerCase() === (c.email || '').toLowerCase());
    const totalSpent = custOrders.length > 0 
      ? custOrders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
      : (c.totalSpent || 0);

    const levelObj = getCustomerLevel(totalSpent, c.level);
    const badge = c.badgeType || 'none';
    const matchTier = filterTier === 'all' || levelObj.id === filterTier;
    const matchBadge = filterBadge === 'all' || (filterBadge === 'verified' ? (badge !== 'none') : (badge === filterBadge));

    return matchQuery && matchTier && matchBadge;
  });

  // If no customer selected, select the first filtered or active customer
  let activeCustomer = null;
  if (selectedCustomerEmail) {
    activeCustomer = customers.find(c => c.email && c.email.toLowerCase() === selectedCustomerEmail.toLowerCase());
  }
  if (!activeCustomer && filteredCustomers.length > 0) {
    activeCustomer = filteredCustomers[0];
    selectedCustomerEmail = activeCustomer.email;
  }

  const activeCustOrders = activeCustomer 
    ? orders.filter(o => o.customerEmail && o.customerEmail.toLowerCase() === (activeCustomer.email || '').toLowerCase())
    : [];
  const activeTotalSpent = activeCustOrders.length > 0
    ? activeCustOrders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
    : (activeCustomer?.totalSpent || 0);

  const activeLevelObj = activeCustomer ? getCustomerLevel(activeTotalSpent, activeCustomer.level) : CUSTOMER_LEVELS.starter;
  const currentBadgeKey = activeCustomer ? (activeCustomer.badgeType || 'none') : 'none';
  const activeBadgeReward = activeCustomer ? getBadgeRewardCoupon(activeCustomer.email) : null;

  return `
    <div class="admin-tab-pane animate-in" style="display: flex; flex-direction: column; gap: 24px;">
      
      <!-- Top Stats Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
        <div class="admin-card" style="padding: 18px; border-radius: 16px; display: flex; align-items: center; gap: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(0, 82, 204, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 20px;">
            👥
          </div>
          <div>
            <div style="font-size: 22px; font-weight: 900; color: var(--text-dark);">${stats.total}</div>
            <div style="font-size: 11.5px; color: var(--text-gray); font-weight: 700;">Clients Enregistrés</div>
          </div>
        </div>

        <div class="admin-card" style="padding: 18px; border-radius: 16px; display: flex; align-items: center; gap: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(0, 102, 255, 0.1); color: #0066ff; display: flex; align-items: center; justify-content: center; font-size: 20px;">
            🛡️
          </div>
          <div>
            <div style="font-size: 22px; font-weight: 900; color: #0066ff;">${stats.verified}</div>
            <div style="font-size: 11.5px; color: var(--text-gray); font-weight: 700;">Badges Vérifiés Accordés</div>
          </div>
        </div>

        <div class="admin-card" style="padding: 18px; border-radius: 16px; display: flex; align-items: center; gap: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(217, 119, 6, 0.1); color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 20px;">
            🥇
          </div>
          <div>
            <div style="font-size: 22px; font-weight: 900; color: #d97706;">${stats.level_2}</div>
            <div style="font-size: 11.5px; color: var(--text-gray); font-weight: 700;">Membres Niveau 2 (2% OFF)</div>
          </div>
        </div>

        <div class="admin-card" style="padding: 18px; border-radius: 16px; display: flex; align-items: center; gap: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(124, 58, 237, 0.1); color: #7c3aed; display: flex; align-items: center; justify-content: center; font-size: 20px;">
            💎
          </div>
          <div>
            <div style="font-size: 22px; font-weight: 900; color: #7c3aed;">${stats.level_3 + stats.level_4 + stats.level_5}</div>
            <div style="font-size: 11.5px; color: var(--text-gray); font-weight: 700;">VIP Niveau 3+ (3%+ OFF)</div>
          </div>
        </div>
      </div>

      <!-- Main Studio Layout: 2 Columns -->
      <div style="display: grid; grid-template-columns: 360px 1fr; gap: 24px; align-items: start;">
        
        <!-- Left Column: Loyalty & Verification Badges Assignment Studio -->
        <div class="admin-card" style="padding: 24px; border-radius: 20px; position: sticky; top: 20px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1.5px solid var(--border);">
            <span style="font-size: 22px;">🎖️</span>
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 850; color: var(--text-dark); text-transform: uppercase; letter-spacing: 0.5px;">Loyalty Level & Verification Badges</h3>
              <small style="color: var(--text-gray); font-size: 11.5px;">Attribution de rangs & badges sociaux</small>
            </div>
          </div>

          ${activeCustomer ? `
            <!-- Live Preview Card -->
            <div style="background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95)); border: 1.5px solid var(--border); border-radius: 16px; padding: 18px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
              <div style="font-size: 10.5px; font-weight: 800; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Aperçu en Direct / Live Customer Preview</div>
              
              <div style="display: flex; align-items: center; gap: 14px;">
                <div style="position: relative; width: 56px; height: 56px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;">
                  <div style="width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 850; ${getCustomerAvatarStyle(activeCustomer, 56).style}">
                    ${activeCustomer.avatar ? '' : (activeCustomer.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  ${renderLevelChevronV(activeCustomer, 20)}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span id="loyalty-preview-name" style="font-size: 15px; font-weight: 850; color: var(--text-dark);">${activeCustomer.name || 'Client'}</span>
                    <span id="loyalty-preview-badge">${renderVerificationBadge(currentBadgeKey, 18)}</span>
                  </div>
                  <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                    <span id="loyalty-preview-level">${renderLevelPill(activeCustomer.level || activeLevelObj.id)}</span>
                  </div>
                  <div style="font-size: 11px; color: var(--text-gray); margin-top: 4px;">
                    ${formatPrice(activeTotalSpent)} dépensés • ${activeCustOrders.length} commande(s)
                  </div>
                </div>
              </div>

              ${activeBadgeReward && activeBadgeReward.remainingUses > 0 ? `
                <div style="margin-top: 14px; padding: 10px 12px; background: rgba(0, 102, 255, 0.07); border: 1px dashed #0066ff; border-radius: 12px; font-size: 11.5px; color: #0052cc; font-weight: 750;">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                    <span>🎟️ Coupon Badge 5% OFF</span>
                    <code style="font-size: 12px; font-weight: 850; background: white; padding: 1px 6px; border-radius: 6px;">${activeBadgeReward.code}</code>
                  </div>
                  <div style="font-size: 10.5px; color: #475569;">
                    ✨ <strong>${activeBadgeReward.remainingUses}/${activeBadgeReward.totalUses}</strong> utilisations restantes • <strong>Sans date d'expiration</strong>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Editor Form -->
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div class="form-group" style="margin: 0;">
                <label style="font-size: 12px; font-weight: 750; color: var(--text-dark); display: block; margin-bottom: 6px;">Client Sélectionné / Target Customer:</label>
                <select id="loyalty-customer-select" class="admin-input" style="width: 100%; font-weight: 750; background: white;">
                  ${customers.map(c => `
                    <option value="${c.email}" ${c.email.toLowerCase() === activeCustomer.email.toLowerCase() ? 'selected' : ''}>
                      ${c.name || 'Client'} (${c.email})
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="form-group" style="margin: 0;">
                <label style="font-size: 12px; font-weight: 750; color: var(--text-dark); display: block; margin-bottom: 6px;">Niveau / Customer Tier & Level:</label>
                <select id="loyalty-tier-select" class="admin-input" style="width: 100%; font-weight: 750; background: white;">
                  <option value="starter" ${(activeCustomer.level || activeLevelObj.id) === 'starter' || (activeCustomer.level || activeLevelObj.id) === 'bronze' ? 'selected' : ''}>🥉 Nouveau Client (0 - 49 999 FCFA)</option>
                  <option value="level_1" ${(activeCustomer.level || activeLevelObj.id) === 'level_1' || (activeCustomer.level || activeLevelObj.id) === 'silver' ? 'selected' : ''}>🥈 Niveau 1 (50 000+ FCFA) • 1% Coupon</option>
                  <option value="level_2" ${(activeCustomer.level || activeLevelObj.id) === 'level_2' || (activeCustomer.level || activeLevelObj.id) === 'gold' ? 'selected' : ''}>🥇 Niveau 2 (100 000+ FCFA) • 2% Coupon</option>
                  <option value="level_3" ${(activeCustomer.level || activeLevelObj.id) === 'level_3' || (activeCustomer.level || activeLevelObj.id) === 'platinum' ? 'selected' : ''}>💎 Niveau 3 (500 000+ FCFA) • 3% Coupon</option>
                  <option value="level_4" ${(activeCustomer.level || activeLevelObj.id) === 'level_4' || (activeCustomer.level || activeLevelObj.id) === 'diamond' ? 'selected' : ''}>👑 Niveau 4 (1 000 000+ FCFA) • 4% Coupon</option>
                  <option value="level_5" ${(activeCustomer.level || activeLevelObj.id) === 'level_5' ? 'selected' : ''}>🌟 Niveau 5 (1 500 000+ FCFA) • 5% Coupon</option>
                  <option value="level_6" ${(activeCustomer.level || activeLevelObj.id) === 'level_6' ? 'selected' : ''}>🔥 Niveau 6 (2 000 000+ FCFA) • 6% Coupon</option>
                  <option value="level_7" ${(activeCustomer.level || activeLevelObj.id) === 'level_7' ? 'selected' : ''}>⚡ Niveau 7 (2 500 000+ FCFA) • 7% Coupon</option>
                  <option value="level_8" ${(activeCustomer.level || activeLevelObj.id) === 'level_8' ? 'selected' : ''}>🏆 Niveau 8 (3 000 000+ FCFA) • 8% Coupon</option>
                </select>
              </div>

              <div class="form-group" style="margin: 0;">
                <label style="font-size: 12px; font-weight: 750; color: var(--text-dark); display: block; margin-bottom: 6px;">Badge Principal Affiché / Primary Display Badge:</label>
                <select id="loyalty-badge-select" class="admin-input" style="width: 100%; font-weight: 750; background: white;">
                  <option value="none" ${currentBadgeKey === 'none' ? 'selected' : ''}>Aucun Badge / None</option>
                  <option value="blue_verified" ${currentBadgeKey === 'blue_verified' ? 'selected' : ''}>🔵 Bleu Vérifié (Instagram / Facebook / X)</option>
                  <option value="gold_verified" ${currentBadgeKey === 'gold_verified' ? 'selected' : ''}>🟡 Or VIP Vérifié (Twitter Org / Royal Gold)</option>
                  <option value="tiktok_verified" ${currentBadgeKey === 'tiktok_verified' ? 'selected' : ''}>🎵 TikTok Néon Gradient (Creator Style)</option>
                  <option value="purple_diamond" ${currentBadgeKey === 'purple_diamond' ? 'selected' : ''}>💎 Diamant VIP (Purple Crystal Style)</option>
                  <option value="green_trusted" ${currentBadgeKey === 'green_trusted' ? 'selected' : ''}>🟢 Vert Acheteur Certifié (Trusted Buyer)</option>
                </select>
              </div>

              <!-- Multi-Badge Unlock Checkboxes (5 Badges = up to 25 Uses) -->
              <div style="background: rgba(248, 250, 252, 0.9); border: 1.5px solid var(--border); border-radius: 14px; padding: 12px 14px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 11.5px; font-weight: 850; color: var(--text-dark); text-transform: uppercase;">🎖️ Badges Débloqués (+5 uses/badge) :</span>
                  <span id="loyalty-uses-counter" style="font-size: 11px; font-weight: 850; color: #0052cc; background: rgba(0, 82, 204, 0.1); padding: 2px 8px; border-radius: 8px;">
                    ${activeBadgeReward ? `${activeBadgeReward.remainingUses}/${activeBadgeReward.totalUses} uses` : '0/25 uses'}
                  </span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px;">
                  ${[
                    { id: 'blue_verified', label: '🔵 Bleu Vérifié (Instagram / FB)' },
                    { id: 'gold_verified', label: '🟡 Or VIP (Twitter Org / Royal)' },
                    { id: 'tiktok_verified', label: '🎵 TikTok Néon Vérifié' },
                    { id: 'purple_diamond', label: '💎 Diamant VIP Elite' },
                    { id: 'green_trusted', label: '🟢 Vert Acheteur Certifié' }
                  ].map(b => {
                    const isUnlocked = activeBadgeReward?.unlockedBadges?.includes(b.id) || currentBadgeKey === b.id;
                    return `
                      <label style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 650; color: var(--text-dark); cursor: pointer; padding: 3px 0;">
                        <span style="display: flex; align-items: center; gap: 6px;">
                          <input type="checkbox" class="loyalty-badge-check" value="${b.id}" ${isUnlocked ? 'checked' : ''} style="accent-color: #0052cc; cursor: pointer;">
                          ${b.label}
                        </span>
                        <span style="font-size: 10.5px; color: #059669; font-weight: 750;">+5 utilisations</span>
                      </label>
                    `;
                  }).join('')}
                </div>

                <button type="button" id="loyalty-unlock-all-badges-btn" style="width: 100%; margin-top: 10px; padding: 8px; background: linear-gradient(135deg, rgba(0, 102, 255, 0.08), rgba(0, 180, 216, 0.08)); border: 1.5px dashed #0066ff; border-radius: 10px; color: #0052cc; font-size: 11.5px; font-weight: 850; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
                  ✨ Débloquer les 5 Badges (25 Utilisations 5% OFF)
                </button>
              </div>

              <button id="loyalty-save-btn" class="admin-btn admin-btn-primary" data-customer-email="${activeCustomer.email}" style="width: 100%; padding: 12px; border-radius: 12px; font-weight: 850; font-size: 13.5px; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 4px;">
                💾 Enregistrer le Niveau & Badges
              </button>
            </div>
          ` : `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-gray);">
              <span style="font-size: 32px; display: block; margin-bottom: 8px;">👥</span>
              <p style="margin: 0; font-size: 13.5px; font-weight: 700;">Sélectionnez un client dans la liste pour gérer son niveau et son badge.</p>
            </div>
          `}
        </div>

        <!-- Right Column: Live Loyalty Directory Table -->
        <div class="admin-card" style="padding: 24px; border-radius: 20px; display: flex; flex-direction: column; gap: 18px;">
          
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
            <div>
              <h3 style="margin: 0; font-size: 18px; font-weight: 850; color: var(--text-dark);">Répertoire des Clients & Niveaux</h3>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-gray);">Visualisez et filtrez les badges et rangs de fidélité accordés</p>
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <input type="search" role="searchbox" aria-label="Search" id="loyalty-search-input" name="q_search_no_credentials" class="admin-input" placeholder="Rechercher par nom ou email..." value="${searchQuery}" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" style="width: 240px; font-size: 12.5px;">
              
              <select id="loyalty-filter-tier" class="admin-input" style="font-size: 12px; font-weight: 700;">
                <option value="all" ${filterTier === 'all' ? 'selected' : ''}>Tous les Niveaux</option>
                <option value="starter" ${filterTier === 'starter' ? 'selected' : ''}>🥉 Nouveau Client</option>
                <option value="level_1" ${filterTier === 'level_1' ? 'selected' : ''}>🥈 Niveau 1 (50k+)</option>
                <option value="level_2" ${filterTier === 'level_2' ? 'selected' : ''}>🥇 Niveau 2 (100k+)</option>
                <option value="level_3" ${filterTier === 'level_3' ? 'selected' : ''}>💎 Niveau 3 (500k+)</option>
                <option value="level_4" ${filterTier === 'level_4' ? 'selected' : ''}>👑 Niveau 4 (1M+)</option>
                <option value="level_5" ${filterTier === 'level_5' ? 'selected' : ''}>🌟 Niveau 5 (1.5M+)</option>
              </select>

              <select id="loyalty-filter-badge" class="admin-input" style="font-size: 12px; font-weight: 700;">
                <option value="all" ${filterBadge === 'all' ? 'selected' : ''}>Tous les Badges</option>
                <option value="verified" ${filterBadge === 'verified' ? 'selected' : ''}>✓ Avec Badge Vérifié</option>
                <option value="blue_verified" ${filterBadge === 'blue_verified' ? 'selected' : ''}>🔵 Bleu</option>
                <option value="gold_verified" ${filterBadge === 'gold_verified' ? 'selected' : ''}>🟡 Or VIP</option>
                <option value="tiktok_verified" ${filterBadge === 'tiktok_verified' ? 'selected' : ''}>🎵 TikTok</option>
                <option value="purple_diamond" ${filterBadge === 'purple_diamond' ? 'selected' : ''}>💎 Diamant</option>
                <option value="green_trusted" ${filterBadge === 'green_trusted' ? 'selected' : ''}>🟢 Vert</option>
              </select>
            </div>
          </div>

          <!-- Table -->
          <div style="overflow-x: auto; border: 1.5px solid var(--border); border-radius: 14px;">
            <table class="admin-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
              <thead>
                <tr style="background: rgba(248, 250, 252, 0.8); border-bottom: 1.5px solid var(--border);">
                  <th style="padding: 12px 14px; font-weight: 800; color: var(--text-dark);">Client</th>
                  <th style="padding: 12px 14px; font-weight: 800; color: var(--text-dark);">Badge Vérifié</th>
                  <th style="padding: 12px 14px; font-weight: 800; color: var(--text-dark);">Niveau Actuel</th>
                  <th style="padding: 12px 14px; font-weight: 800; color: var(--text-dark);">Commandes</th>
                  <th style="padding: 12px 14px; font-weight: 800; color: var(--text-dark);">Total Dépensé</th>
                  <th style="padding: 12px 14px; font-weight: 800; color: var(--text-dark); text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${filteredCustomers.length === 0 ? `
                  <tr>
                    <td colspan="6" style="padding: 36px; text-align: center; color: var(--text-gray);">
                      Aucun client ne correspond aux critères de recherche.
                    </td>
                  </tr>
                ` : filteredCustomers.map(c => {
                  const custOrders = orders.filter(o => o.customerEmail && o.customerEmail.toLowerCase() === (c.email || '').toLowerCase());
                  const totalSpent = custOrders.length > 0 
                    ? custOrders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
                    : (c.totalSpent || 0);

                  const levelObj = getCustomerLevel(totalSpent, c.level);
                  const isSelected = activeCustomer && activeCustomer.email.toLowerCase() === (c.email || '').toLowerCase();

                  return `
                    <tr style="border-bottom: 1px solid var(--border); background: ${isSelected ? 'rgba(0, 82, 204, 0.04)' : 'transparent'}; transition: background 0.2s;">
                      <td style="padding: 12px 14px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                          <div style="width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; ${c.avatar ? `background-image: url('${c.avatar}'); background-size: cover; background-position: center; border: 1.5px solid #0052cc;` : 'background: linear-gradient(135deg, #0052cc 0%, #00b4d8 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 850;'}">
                            ${c.avatar ? '' : (c.name || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style="font-weight: 800; color: var(--text-dark);">${c.name || 'Client'}</div>
                            <div style="font-size: 11.5px; color: var(--text-gray);">${c.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style="padding: 12px 14px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          ${renderVerificationBadge(c.badgeType || 'none', 18)}
                          <span style="font-size: 12px; font-weight: 700; color: var(--text-dark);">
                            ${(VERIFIED_BADGES[c.badgeType || 'none']?.name) || 'Aucun'}
                          </span>
                        </div>
                      </td>

                      <td style="padding: 12px 14px;">
                        ${renderLevelPill(c.level || levelObj.id)}
                      </td>

                      <td style="padding: 12px 14px; font-weight: 750; color: var(--text-dark);">
                        ${custOrders.length > 0 ? custOrders.length : (c.ordersCount || 0)}
                      </td>

                      <td style="padding: 12px 14px; font-weight: 800; color: var(--primary);">
                        ${formatPrice(totalSpent)}
                      </td>

                      <td style="padding: 12px 14px; text-align: right;">
                        <button class="select-loyalty-customer-btn admin-btn ${isSelected ? 'admin-btn-primary' : 'admin-btn-secondary'}" data-email="${c.email}" style="padding: 6px 12px; font-size: 11.5px; font-weight: 750;">
                          ${isSelected ? '✓ Sélectionné' : '⚡ Modifier'}
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  `;
}

export function attachAdminLoyaltyListeners(context, shadow) {
  // 1. Search Input
  const searchInput = shadow.getElementById('loyalty-search-input');
  if (searchInput) {
    if (context.isAutofilledCredential && context.isAutofilledCredential(searchInput.value)) {
      searchInput.value = '';
      searchQuery = '';
    }
    searchInput.addEventListener('focus', () => {
      if (context.isAutofilledCredential && context.isAutofilledCredential(searchInput.value)) {
        searchInput.value = '';
        searchQuery = '';
      }
    });

    searchInput.addEventListener('input', (e) => {
      let val = e.target.value;
      if (context.isAutofilledCredential && context.isAutofilledCredential(val)) {
        e.target.value = '';
        val = '';
      }
      searchQuery = val;
      context.render();
      context.attachListeners();
      const ref = shadow.getElementById('loyalty-search-input');
      if (ref) {
        ref.focus();
        ref.setSelectionRange(ref.value.length, ref.value.length);
      }
    });
  }

  // 2. Filter Tier
  const filterTierSelect = shadow.getElementById('loyalty-filter-tier');
  if (filterTierSelect) {
    filterTierSelect.addEventListener('change', (e) => {
      filterTier = e.target.value;
      context.render();
      context.attachListeners();
    });
  }

  // 3. Filter Badge
  const filterBadgeSelect = shadow.getElementById('loyalty-filter-badge');
  if (filterBadgeSelect) {
    filterBadgeSelect.addEventListener('change', (e) => {
      filterBadge = e.target.value;
      context.render();
      context.attachListeners();
    });
  }

  // 4. Customer Dropdown Selector
  const custSelect = shadow.getElementById('loyalty-customer-select');
  if (custSelect) {
    custSelect.addEventListener('change', (e) => {
      selectedCustomerEmail = e.target.value;
      context.render();
      context.attachListeners();
    });
  }

  // 5. Select Customer from Table Button
  shadow.querySelectorAll('.select-loyalty-customer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCustomerEmail = btn.getAttribute('data-email');
      context.render();
      context.attachListeners();
    });
  });

  // 6. Live Preview Dropdown Changes
  const tierSelect = shadow.getElementById('loyalty-tier-select');
  if (tierSelect) {
    tierSelect.addEventListener('change', (e) => {
      const previewLevel = shadow.getElementById('loyalty-preview-level');
      if (previewLevel) {
        previewLevel.innerHTML = renderLevelPill(e.target.value);
      }
    });
  }

  const badgeSelect = shadow.getElementById('loyalty-badge-select');
  if (badgeSelect) {
    badgeSelect.addEventListener('change', (e) => {
      const previewBadge = shadow.getElementById('loyalty-preview-badge');
      if (previewBadge) {
        previewBadge.innerHTML = renderVerificationBadge(e.target.value, 18);
      }
    });
  }

  // 6b. Unlock All 5 Badges Button
  const unlockAllBtn = shadow.getElementById('loyalty-unlock-all-badges-btn');
  if (unlockAllBtn) {
    unlockAllBtn.addEventListener('click', () => {
      const checkboxes = shadow.querySelectorAll('.loyalty-badge-check');
      checkboxes.forEach(cb => cb.checked = true);
      const counter = shadow.getElementById('loyalty-uses-counter');
      if (counter) counter.textContent = '25/25 uses';
      window.dispatchEvent(new CustomEvent('toast:show', { detail: '✨ Les 5 Badges ont été cochés (25 utilisations 5% OFF) ! Cliquez sur Enregistrer.' }));
    });
  }

  // 7. Save Level & Badges Button
  const saveBtn = shadow.getElementById('loyalty-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const custEmail = saveBtn.getAttribute('data-customer-email');
      const selectedLevel = shadow.getElementById('loyalty-tier-select')?.value || 'bronze';
      const selectedBadge = shadow.getElementById('loyalty-badge-select')?.value || 'none';

      // Gather all checked badges (up to 5 badges = 25 uses)
      const checkedBadges = Array.from(shadow.querySelectorAll('.loyalty-badge-check:checked')).map(cb => cb.value);
      if (selectedBadge !== 'none' && !checkedBadges.includes(selectedBadge)) {
        checkedBadges.push(selectedBadge);
      }

      if (!custEmail) return;

      // Update in context.customers
      let customers = context.customers || [];
      const target = customers.find(c => c.email && c.email.toLowerCase() === custEmail.toLowerCase());
      if (target) {
        target.level = selectedLevel;
        target.badgeType = selectedBadge;
        target.unlockedBadges = checkedBadges;
      } else {
        customers.push({
          email: custEmail,
          level: selectedLevel,
          badgeType: selectedBadge,
          unlockedBadges: checkedBadges
        });
      }

      sessionStorage.setItem('SWEETOS_customers', JSON.stringify(customers));

      // Sync customer user profile in sessionStorage
      try {
        const safeKey = custEmail.replace(/[^a-zA-Z0-9]/g, '_');
        const specificProfileKey = `SWEETOS_user_profile_${safeKey}`;
        let prof = JSON.parse(sessionStorage.getItem(specificProfileKey) || sessionStorage.getItem('SWEETOS_user_profile') || '{}');
        prof.level = selectedLevel;
        prof.badgeType = selectedBadge;
        prof.unlockedBadges = checkedBadges;
        sessionStorage.setItem(specificProfileKey, JSON.stringify(prof));
        sessionStorage.setItem('SWEETOS_user_profile', JSON.stringify(prof));
      } catch(e) {}

      // Grant/update badge reward coupons (5 uses per badge = up to 25 uses for all 5 badges)
      let rewardNotice = '';
      if (checkedBadges.length > 0) {
        const rewardObj = grantBadgeReward(custEmail, checkedBadges);
        if (rewardObj) {
          rewardNotice = ` • 🎟️ ${checkedBadges.length} Badge(s) débloqué(s) (${rewardObj.remainingUses}/${rewardObj.totalUses} utilisations 5% OFF, sans expiration)`;
        }
      }

      // Broadcast changes across the storefront and admin
      window.dispatchEvent(new CustomEvent('profile:updated'));
      window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true } }));
      window.dispatchEvent(new CustomEvent('toast:show', { detail: `Niveau & ${checkedBadges.length} Badge(s) sauvegardés !${rewardNotice} 🎖️✨` }));

      // Re-render loyalty tab to show updated badge reward details immediately
      if (context.renderTabContent) {
        const viewport = shadow.querySelector('.admin-viewport') || context.shadowRoot?.querySelector('.admin-viewport');
        if (viewport) {
          viewport.innerHTML = context.renderTabContent();
          context.attachListeners();
        }
      }

      // Server sync
      if (isLocalDevHost()) {
        fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customers)
        }).catch(err => console.error('Failed to sync updated customer loyalty:', err));
      }

      context.render();
      context.attachListeners();
    });
  }
}
