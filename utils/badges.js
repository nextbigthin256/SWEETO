import { getScratchcardsStorageKey, saveStorageItem, getStorageItem } from './storage.js';

export const CUSTOMER_LEVELS = {
  starter: { id: 'starter', levelNum: 0, label: 'Nouveau Client', icon: '🥉', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', minSpent: 0, rewardDiscount: 0 },
  bronze: { id: 'starter', levelNum: 0, label: 'Nouveau Client', icon: '🥉', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', minSpent: 0, rewardDiscount: 0 },
  level_1: { id: 'level_1', levelNum: 1, label: 'Niveau 1 (50k+ FCFA)', icon: '🥈', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', minSpent: 50000, rewardDiscount: 1 },
  silver: { id: 'level_1', levelNum: 1, label: 'Niveau 1 (50k+ FCFA)', icon: '🥈', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', minSpent: 50000, rewardDiscount: 1 },
  level_2: { id: 'level_2', levelNum: 2, label: 'Niveau 2 (100k+ FCFA)', icon: '🥇', color: '#d97706', bg: '#fffbeb', border: '#fcd34d', minSpent: 100000, rewardDiscount: 2 },
  gold: { id: 'level_2', levelNum: 2, label: 'Niveau 2 (100k+ FCFA)', icon: '🥇', color: '#d97706', bg: '#fffbeb', border: '#fcd34d', minSpent: 100000, rewardDiscount: 2 },
  level_3: { id: 'level_3', levelNum: 3, label: 'Niveau 3 (500k+ FCFA)', icon: '💎', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', minSpent: 500000, rewardDiscount: 3 },
  platinum: { id: 'level_3', levelNum: 3, label: 'Niveau 3 (500k+ FCFA)', icon: '💎', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', minSpent: 500000, rewardDiscount: 3 },
  level_4: { id: 'level_4', levelNum: 4, label: 'Niveau 4 (1M+ FCFA)', icon: '👑', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff', minSpent: 1000000, rewardDiscount: 4 },
  diamond: { id: 'level_4', levelNum: 4, label: 'Niveau 4 (1M+ FCFA)', icon: '👑', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff', minSpent: 1000000, rewardDiscount: 4 },
  level_5: { id: 'level_5', levelNum: 5, label: 'Niveau 5 (1.5M+ FCFA)', icon: '🌟', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', minSpent: 1500000, rewardDiscount: 5 },
  level_6: { id: 'level_6', levelNum: 6, label: 'Niveau 6 (2M+ FCFA)', icon: '🔥', color: '#ea580c', bg: '#fff7ed', border: '#ffedd5', minSpent: 2000000, rewardDiscount: 6 },
  level_7: { id: 'level_7', levelNum: 7, label: 'Niveau 7 (2.5M+ FCFA)', icon: '⚡', color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff', minSpent: 2500000, rewardDiscount: 7 },
  level_8: { id: 'level_8', levelNum: 8, label: 'Niveau 8 (3M+ FCFA)', icon: '🏆', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', minSpent: 3000000, rewardDiscount: 8 }
};

export const VERIFIED_BADGES = {
  none: { id: 'none', label: 'Aucun badge / None' },
  blue_verified: { id: 'blue_verified', label: '🔵 Bleu Vérifié (Instagram / Facebook)', name: 'Vérifié Officiel' },
  gold_verified: { id: 'gold_verified', label: '🟡 Or VIP Vérifié (Twitter / Royal)', name: 'VIP Gold' },
  tiktok_verified: { id: 'tiktok_verified', label: '🎵 TikTok Néon Vérifié', name: 'Créateur Vérifié' },
  purple_diamond: { id: 'purple_diamond', label: '💎 Diamant VIP', name: 'VIP Diamant' },
  green_trusted: { id: 'green_trusted', label: '🟢 Vert Acheteur Certifié', name: 'Acheteur Certifié' }
};

export function getCustomerLevel(totalSpent = 0, manualLevel = null) {
  if (manualLevel && CUSTOMER_LEVELS[manualLevel]) {
    return CUSTOMER_LEVELS[manualLevel];
  }
  const spent = parseFloat(totalSpent) || 0;
  
  if (spent < 50000) {
    return CUSTOMER_LEVELS.starter;
  }
  if (spent < 100000) {
    return CUSTOMER_LEVELS.level_1; // 50 000 -> Level 1 (1% OFF)
  }
  if (spent < 500000) {
    return CUSTOMER_LEVELS.level_2; // 100 000 -> Level 2 (2% OFF)
  }
  
  // From 500k onwards: Level 3 at 500k (3% OFF), and +1 level every +500k (+1% OFF per level)
  const extraLevels = Math.floor((spent - 500000) / 500000);
  const currentLevelNum = 3 + extraLevels;
  
  const key = `level_${currentLevelNum}`;
  if (CUSTOMER_LEVELS[key]) {
    return CUSTOMER_LEVELS[key];
  }
  
  const minSpent = 500000 + (extraLevels * 500000);
  const minSpentMillion = (minSpent / 1000000).toFixed(1).replace('.0', '') + 'M';
  return {
    id: key,
    levelNum: currentLevelNum,
    label: `Niveau ${currentLevelNum} (${minSpentMillion}+ FCFA)`,
    icon: currentLevelNum >= 10 ? '👑' : (currentLevelNum >= 7 ? '⚡' : '🌟'),
    color: '#7c3aed',
    bg: '#faf5ff',
    border: '#e9d5ff',
    minSpent: minSpent,
    rewardDiscount: currentLevelNum
  };
}

export function getCustomerBadge(totalSpent = 0, manualBadge = null) {
  if (manualBadge !== undefined && manualBadge !== null) {
    return manualBadge; // Explicitly assigned badge
  }
  return 'none'; // Badges are independent from level spend and reserved for custom badge plan / admin assignment
}

export function getCustomerLevelColor(levelKeyOrObject) {
  let level = typeof levelKeyOrObject === 'string' ? CUSTOMER_LEVELS[levelKeyOrObject] : levelKeyOrObject;
  if (!level) level = CUSTOMER_LEVELS.starter;
  return level.color || '#64748b';
}

export function getCustomerLevelGradient(levelKeyOrObject) {
  let level = typeof levelKeyOrObject === 'string' ? CUSTOMER_LEVELS[levelKeyOrObject] : levelKeyOrObject;
  if (!level || level.id === 'starter') {
    return 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)';
  }
  const color = level.color || '#0052cc';
  switch(level.id) {
    case 'level_1':
    case 'silver':
      return 'linear-gradient(135deg, #475569 0%, #64748b 100%)';
    case 'level_2':
    case 'gold':
      return 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)';
    case 'level_3':
    case 'platinum':
      return 'linear-gradient(135deg, #0284c7 0%, #00b4d8 100%)';
    case 'level_4':
    case 'diamond':
      return 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)';
    case 'level_5':
      return 'linear-gradient(135deg, #db2777 0%, #f43f5e 100%)';
    case 'level_6':
      return 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)';
    case 'level_7':
      return 'linear-gradient(135deg, #9333ea 0%, #c084fc 100%)';
    case 'level_8':
      return 'linear-gradient(135deg, #059669 0%, #10b981 100%)';
    default:
      return `linear-gradient(135deg, ${color} 0%, #3b82f6 100%)`;
  }
}

export function getCustomerAvatarStyle(profile, size = 88) {
  const safeProfile = (profile && typeof profile === 'object') ? profile : {};
  const totalSpent = (safeProfile.orders && Array.isArray(safeProfile.orders)) 
    ? safeProfile.orders.filter(o => o && o.status !== 'Cancelled').reduce((sum, o) => sum + (parseFloat(o.total || o.total_amount || o.price) || 0), 0) 
    : (parseFloat(safeProfile.totalSpent || safeProfile.total_spent) || 0);

  const level = getCustomerLevel(totalSpent, safeProfile.level);
  const color = level.color || '#64748b';
  const gradient = getCustomerLevelGradient(level);
  const numericSize = typeof size === 'number' ? size : (parseInt(size) || 88);
  const borderSize = numericSize > 60 ? '3.5px' : (numericSize > 30 ? '2px' : '1.5px');

  const avatarUrl = safeProfile.avatar || safeProfile.avatar_url;
  if (avatarUrl) {
    return {
      style: `background-image: url('${avatarUrl}'); background-size: cover; background-position: center; border: ${borderSize} solid ${color}; box-shadow: 0 4px 14px ${color}35;`,
      color: color,
      gradient: gradient,
      level: level
    };
  } else {
    return {
      style: `background: ${gradient}; color: white; border: ${borderSize} solid ${color}; box-shadow: 0 4px 14px ${color}35;`,
      color: color,
      gradient: gradient,
      level: level
    };
  }
}

/**
 * Renders a downward-facing "V" (chevron rank insignia) attached to the profile circle.
 * The "V" becomes progressively thicker and more prestigious as the customer's Level advances.
 */
export function renderLevelChevronV(levelObjOrKey, size = 22) {
  let level = typeof levelObjOrKey === 'string' ? CUSTOMER_LEVELS[levelObjOrKey] : levelObjOrKey;
  if (!level) return '';
  const levelNum = level.levelNum || 0;
  if (levelNum < 1) return ''; // No V for starter level 0

  const color = level.color || '#0052cc';
  
  // Dynamic thickness (stroke-width) scaling with level advancement
  // Level 1: 2.2px (thin)
  // Level 2: 3.2px (medium)
  // Level 3: 4.2px (thick)
  // Level 4: 5.2px (extra thick)
  // Level 5+: 6.5px (heavy solid rank crest)
  const strokeWidth = Math.min(6.5, 2.0 + (levelNum - 1) * 1.0);
  const width = size;
  const height = Math.round(size * 0.7);

  // For high levels (Level 3+), render double or triple chevron V stack
  if (levelNum >= 3) {
    const isTriple = levelNum >= 5;
    return `
      <div class="level-v-rank-container" title="${level.label}" style="position:absolute; bottom:-${Math.round(size * 0.35)}px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; z-index:3; pointer-events:none; filter:drop-shadow(0 2px 5px ${color}80);">
        <svg viewBox="0 0 24 16" width="${width}" height="${height}" fill="none" style="display:block; overflow:visible;">
          ${isTriple ? `
            <path d="M4 1L12 8L20 1" stroke="${color}" stroke-width="${strokeWidth * 0.75}" stroke-linecap="round" stroke-linejoin="round"/>
          ` : ''}
          <path d="M4 ${isTriple ? 5 : 2}L12 ${isTriple ? 12 : 9}L20 ${isTriple ? 5 : 2}" stroke="${color}" stroke-width="${strokeWidth * 0.85}" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 ${isTriple ? 9 : 7}L12 ${isTriple ? 16 : 14}L21 ${isTriple ? 9 : 7}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    `;
  }

  // Single Downward V for Level 1 & Level 2 with scaled thickness
  return `
    <div class="level-v-rank-container" title="${level.label}" style="position:absolute; bottom:-${Math.round(size * 0.3)}px; left:50%; transform:translateX(-50%); display:flex; align-items:center; justify-content:center; z-index:3; pointer-events:none; filter:drop-shadow(0 2px 4px ${color}70);">
      <svg viewBox="0 0 24 14" width="${width}" height="${height}" fill="none" style="display:block; overflow:visible;">
        <path d="M3 2L12 11L21 2" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  `;
}

export function renderVerificationBadge(badgeType, size = 16) {
  if (!badgeType || badgeType === 'none') return '';

  if (badgeType === 'blue_verified') {
    // Instagram / Facebook / Twitter Blue Checkmark Badge
    return `
      <span class="user-badge-icon blue-badge" title="Compte Vérifié / Official Verified Account" style="display:inline-flex; align-items:center; vertical-align:middle; line-height:1; flex-shrink:0;">
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" style="width:${size}px; height:${size}px; filter: drop-shadow(0 1px 2px rgba(0, 102, 255, 0.25));">
          <circle cx="12" cy="12" r="11" fill="#0066ff"/>
          <path d="M7 12.5L10.5 16L17 8.5" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </span>
    `;
  }

  if (badgeType === 'gold_verified') {
    // Twitter Org / Gold Star VIP Badge
    return `
      <span class="user-badge-icon gold-badge" title="Client VIP Or Vérifié / Gold VIP Account" style="display:inline-flex; align-items:center; vertical-align:middle; line-height:1; flex-shrink:0;">
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" style="width:${size}px; height:${size}px; filter: drop-shadow(0 1px 3px rgba(245, 158, 11, 0.35));">
          <defs>
            <linearGradient id="gold-grad-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="50%" stop-color="#f59e0b"/>
              <stop offset="100%" stop-color="#d97706"/>
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#gold-grad-${size})"/>
          <path d="M7.5 12.5L10.5 15.5L16.5 8.5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </span>
    `;
  }

  if (badgeType === 'tiktok_verified') {
    // TikTok Cyan-Pink Neon Gradient Badge
    return `
      <span class="user-badge-icon tiktok-badge" title="Créateur TikTok / Top Influencer" style="display:inline-flex; align-items:center; vertical-align:middle; line-height:1; flex-shrink:0;">
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" style="width:${size}px; height:${size}px; filter: drop-shadow(0 1px 3px rgba(255, 0, 80, 0.35));">
          <defs>
            <linearGradient id="tt-grad-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00f2fe"/>
              <stop offset="45%" stop-color="#4facfe"/>
              <stop offset="100%" stop-color="#ff0844"/>
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="11" fill="url(#tt-grad-${size})"/>
          <path d="M7 12.5L10.5 16L17 8.5" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </span>
    `;
  }

  if (badgeType === 'purple_diamond') {
    // Diamond Royal Crystal VIP Badge
    return `
      <span class="user-badge-icon diamond-badge" title="Membre VIP Diamant Elite" style="display:inline-flex; align-items:center; vertical-align:middle; line-height:1; flex-shrink:0;">
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" style="width:${size}px; height:${size}px; filter: drop-shadow(0 1px 3px rgba(124, 58, 237, 0.35));">
          <defs>
            <linearGradient id="purple-grad-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#c084fc"/>
              <stop offset="50%" stop-color="#8b5cf6"/>
              <stop offset="100%" stop-color="#6d28d9"/>
            </linearGradient>
          </defs>
          <polygon points="12,2 22,8.5 18,22 6,22 2,8.5" fill="url(#purple-grad-${size})"/>
          <path d="M7.5 12.5L10.5 15.5L16.5 8.5" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </span>
    `;
  }

  if (badgeType === 'green_trusted') {
    // Green Verified / Trusted Buyer Shield
    return `
      <span class="user-badge-icon green-badge" title="Acheteur Certifié SWEETOS" style="display:inline-flex; align-items:center; vertical-align:middle; line-height:1; flex-shrink:0;">
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" style="width:${size}px; height:${size}px; filter: drop-shadow(0 1px 3px rgba(16, 185, 129, 0.35));">
          <path d="M12 2L4 5V11.5C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11.5V5L12 2Z" fill="#10b981"/>
          <path d="M8 12L11 15L16 9" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </span>
    `;
  }

  return '';
}

export function renderLevelPill(levelKey, customLabel = null) {
  let lvl = CUSTOMER_LEVELS[levelKey];
  if (!lvl) {
    if (typeof levelKey === 'string' && levelKey.startsWith('level_')) {
      const num = parseInt(levelKey.replace('level_', ''));
      if (!isNaN(num)) {
        const minSpent = num <= 1 ? 50000 : (num === 2 ? 100000 : 500000 + (num - 3) * 500000);
        const minSpentMillion = (minSpent / 1000000).toFixed(1).replace('.0', '') + 'M';
        lvl = {
          id: levelKey,
          levelNum: num,
          label: `Niveau ${num} (${minSpentMillion}+ FCFA)`,
          icon: num >= 10 ? '👑' : (num >= 7 ? '⚡' : (num >= 5 ? '🌟' : (num >= 4 ? '👑' : (num === 3 ? '💎' : (num === 2 ? '🥇' : '🥈'))))),
          color: num >= 4 ? '#7c3aed' : (num === 3 ? '#0284c7' : (num === 2 ? '#d97706' : '#475569')),
          bg: num >= 4 ? '#faf5ff' : (num === 3 ? '#f0f9ff' : (num === 2 ? '#fffbeb' : '#f1f5f9')),
          border: num >= 4 ? '#e9d5ff' : (num === 3 ? '#bae6fd' : (num === 2 ? '#fcd34d' : '#cbd5e1'))
        };
      }
    }
  }
  if (!lvl) lvl = CUSTOMER_LEVELS.starter;

  return `
    <span class="customer-level-badge level-${lvl.id}" style="display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:20px; font-size:11.5px; font-weight:800; color:${lvl.color}; background:${lvl.bg}; border:1px solid ${lvl.border}; box-shadow:0 1px 4px rgba(0,0,0,0.03);">
      <span>${lvl.icon}</span>
      <span>${customLabel || lvl.label}</span>
    </span>
  `;
}

// =========================================================================
// BADGE REWARDS SYSTEM (5% OFF, 5 USES PER BADGE, NO EXPIRY DATE, +5 USES STACKING)
// =========================================================================

export function getBadgeRewardCoupon(email) {
  if (!email) return null;
  const safeEmail = email.toLowerCase();
  try {
    const rewards = JSON.parse(getStorageItem('SWEETOS_badge_rewards') || '{}');
    return rewards[safeEmail] || null;
  } catch(e) {
    return null;
  }
}

export function isBadgeRewardScratched(email) {
  const reward = getBadgeRewardCoupon(email);
  return Boolean(reward && reward.scratched === true);
}

export function scratchBadgeReward(email) {
  if (!email) return null;
  const safeEmail = email.toLowerCase();
  try {
    const rewards = JSON.parse(getStorageItem('SWEETOS_badge_rewards') || '{}');
    const userReward = rewards[safeEmail];
    if (userReward) {
      userReward.scratched = true;
      userReward.status = userReward.remainingUses > 0 ? 'active' : 'exhausted';
      rewards[safeEmail] = userReward;
      saveStorageItem('SWEETOS_badge_rewards', JSON.stringify(rewards));

      // Also mark in scratchcards
      const scratchKey = getScratchcardsStorageKey();
      let scratchcards = JSON.parse(getStorageItem(scratchKey) || '[]');
      let updatedCards = false;
      scratchcards.forEach(sc => {
        if (sc.email && sc.email.toLowerCase() === safeEmail && (sc.badgeReward || (sc.rewardCode === userReward.code))) {
          sc.scratched = true;
          sc.couponWon = {
            code: userReward.code,
            type: 'percentage',
            value: 5,
            limit: userReward.totalUses,
            remainingUses: userReward.remainingUses,
            totalUses: userReward.totalUses,
            badgeCoupon: true,
            expiry: 'Sans expiration',
            status: 'active',
            description: `5% de réduction (${userReward.remainingUses}/${userReward.totalUses} utilisations)`
          };
          updatedCards = true;
        }
      });
      if (updatedCards) {
        saveStorageItem(scratchKey, JSON.stringify(scratchcards));
      }

      // Sync into SWEETOS_coupons
      let adminCoupons = JSON.parse(getStorageItem('SWEETOS_coupons') || '[]');
      const existingIdx = adminCoupons.findIndex(c => c.code === userReward.code);
      const couponEntry = {
        code: userReward.code,
        type: 'percentage',
        value: 5,
        limit: userReward.totalUses,
        used: Math.max(0, userReward.totalUses - userReward.remainingUses),
        remainingUses: userReward.remainingUses,
        expiry: null,
        badgeCoupon: true,
        customerEmail: safeEmail,
        scratched: true,
        status: userReward.remainingUses > 0 ? 'active' : 'exhausted'
      };

      if (existingIdx > -1) {
        adminCoupons[existingIdx] = couponEntry;
      } else {
        adminCoupons.unshift(couponEntry);
      }
      saveStorageItem('SWEETOS_coupons', JSON.stringify(adminCoupons));

      import('./supabase.js').then(({ saveSiteSettingInSupabase }) => {
        saveSiteSettingInSupabase(`sweetos_badge_reward_${safeEmail.replace(/[^a-zA-Z0-9]/g, '_')}`, userReward);
      }).catch(() => {});

      window.dispatchEvent(new CustomEvent('badge_reward:updated', { detail: { email: safeEmail, reward: userReward } }));
      window.dispatchEvent(new CustomEvent('cart:updated'));
      return userReward;
    }
  } catch(e) {}
  return null;
}

export function grantBadgeReward(email, badgeInput) {
  if (!email || !badgeInput) return null;
  const safeEmail = email.toLowerCase();
  
  // Normalize input into array of badges
  const badgeList = Array.isArray(badgeInput) 
    ? badgeInput.filter(b => b && b !== 'none') 
    : (badgeInput !== 'none' ? [badgeInput] : []);

  if (badgeList.length === 0) return null;

  try {
    const rewards = JSON.parse(getStorageItem('SWEETOS_badge_rewards') || '{}');
    let userReward = rewards[safeEmail];

    if (!userReward) {
      const distinctBadges = Array.from(new Set(badgeList));
      const totalAllowedUses = Math.min(25, distinctBadges.length * 5); // 5 uses per badge (up to 25 uses for all 5 badges)
      userReward = {
        code: `BADGE5-${Math.floor(1000 + Math.random() * 9000)}`,
        type: 'percentage',
        value: 5,
        totalUses: totalAllowedUses,
        remainingUses: totalAllowedUses,
        unlockedBadges: distinctBadges,
        expiry: null, // Never expires
        badgeCoupon: true,
        scratched: false, // Requires scratching in mystery box before cart appearance
        status: 'unscratched'
      };
    } else {
      if (!userReward.unlockedBadges) userReward.unlockedBadges = [];
      let newBadgesAdded = 0;
      badgeList.forEach(b => {
        if (!userReward.unlockedBadges.includes(b)) {
          userReward.unlockedBadges.push(b);
          newBadgesAdded++;
        }
      });

      if (newBadgesAdded > 0) {
        const addedUses = newBadgesAdded * 5;
        userReward.totalUses = Math.min(25, (userReward.totalUses || 0) + addedUses);
        userReward.remainingUses = Math.min(userReward.totalUses, (userReward.remainingUses || 0) + addedUses);
        // If already scratched previously, keeps active; otherwise unscratched
        if (userReward.scratched !== true) {
          userReward.scratched = false;
          userReward.status = 'unscratched';
        } else {
          userReward.status = 'active';
        }
      }
    }

    rewards[safeEmail] = userReward;
    saveStorageItem('SWEETOS_badge_rewards', JSON.stringify(rewards));

    // Register Mystery Box scratch card in user scratchcards
    const scratchKey = getScratchcardsStorageKey();
    let scratchcards = [];
    try {
      scratchcards = JSON.parse(getStorageItem(scratchKey) || '[]');
    } catch(e) {}

    const existingCardIdx = scratchcards.findIndex(sc => 
      (sc.email && sc.email.toLowerCase() === safeEmail) && 
      (sc.badgeReward || (sc.rewardCode === userReward.code))
    );

    const isAlreadyScratched = userReward.scratched === true;
    const cardTitle = `🎁 Boîte Mystère — Récompense Badge (${userReward.unlockedBadges.length} Badge${userReward.unlockedBadges.length > 1 ? 's' : ''} Débloqué${userReward.unlockedBadges.length > 1 ? 's' : ''})`;
    const cardPayload = {
      id: `box-badge-${safeEmail.replace(/[^a-z0-9]/g, '_')}`,
      email: safeEmail,
      title: cardTitle,
      orderId: 'REWARD-BADGE',
      scratched: isAlreadyScratched,
      badgeReward: true,
      rewardCode: userReward.code,
      couponWon: isAlreadyScratched ? {
        code: userReward.code,
        type: 'percentage',
        value: 5,
        limit: userReward.totalUses,
        remainingUses: userReward.remainingUses,
        totalUses: userReward.totalUses,
        badgeCoupon: true,
        expiry: 'Sans expiration',
        status: 'active',
        description: `5% de réduction (${userReward.remainingUses}/${userReward.totalUses} utilisations)`
      } : null,
      totalCFA: 50000,
      createdAt: Date.now()
    };

    if (existingCardIdx > -1) {
      scratchcards[existingCardIdx] = cardPayload;
    } else {
      scratchcards.unshift(cardPayload);
    }
    saveStorageItem(scratchKey, JSON.stringify(scratchcards));

    // Also register / sync in SWEETOS_coupons (marked as unscratched if not yet scratched)
    let adminCoupons = JSON.parse(getStorageItem('SWEETOS_coupons') || '[]');
    const existingIdx = adminCoupons.findIndex(c => c.code === userReward.code);
    const couponEntry = {
      code: userReward.code,
      type: 'percentage',
      value: 5,
      limit: userReward.totalUses,
      used: Math.max(0, userReward.totalUses - userReward.remainingUses),
      remainingUses: userReward.remainingUses,
      expiry: null,
      badgeCoupon: true,
      customerEmail: safeEmail,
      scratched: isAlreadyScratched,
      status: isAlreadyScratched ? (userReward.remainingUses > 0 ? 'active' : 'exhausted') : 'unscratched'
    };

    if (existingIdx > -1) {
      adminCoupons[existingIdx] = couponEntry;
    } else {
      adminCoupons.unshift(couponEntry);
    }
    saveStorageItem('SWEETOS_coupons', JSON.stringify(adminCoupons));

    import('./supabase.js').then(({ saveSiteSettingInSupabase }) => {
      saveSiteSettingInSupabase(`sweetos_badge_reward_${safeEmail.replace(/[^a-zA-Z0-9]/g, '_')}`, userReward);
    }).catch(() => {});

    window.dispatchEvent(new CustomEvent('badge_reward:updated', { detail: { email: safeEmail, reward: userReward } }));
    
    // Send detailed achievement & advantage notification to customer
    notifyCustomerAchievement(safeEmail, {
      badges: userReward.unlockedBadges,
      rewardUses: userReward.remainingUses,
      totalUses: userReward.totalUses,
      title: `${userReward.unlockedBadges.length} Badge(s) & Récompense Débloqués !`
    });

    return userReward;
  } catch(e) {
    return null;
  }
}

export function notifyCustomerAchievement(email, data = {}) {
  if (!email) return;
  const safeEmail = email.toLowerCase();
  
  const badgesCount = Array.isArray(data.badges) ? data.badges.length : 1;
  const usesCount = data.rewardUses || (badgesCount * 5);
  const title = data.title || `🏆 Palier & Récompense Débloqués !`;
  const levelText = data.level ? `au statut <strong>${data.level}</strong> et débloqué` : `et débloqué`;

  const notifKey = `SWEETOS_notifications`;
  let notifs = [];
  try {
    notifs = JSON.parse(getStorageItem(notifKey) || '[]');
  } catch(e) {}

  const desc = `
    <div style="display: flex; flex-direction: column; gap: 8px; font-family: inherit;">
      <strong style="color: var(--primary); font-size: 13.5px; display: flex; align-items: center; gap: 6px;">
        🎉 Félicitations pour votre fidélité & engagement !
      </strong>
      <span style="font-size: 12.5px; color: var(--text-dark); line-height: 1.4;">
        Vous avez progressé ${levelText} <strong>${badgesCount} Badge(s) Officiels</strong> !
      </span>
      <div style="background: rgba(0, 82, 204, 0.05); border: 1.5px dashed var(--primary); padding: 10px 12px; border-radius: 10px; margin: 4px 0; font-size: 12px; color: #1e293b;">
        <strong style="display: block; margin-bottom: 5px; color: var(--primary); font-size: 12px;">🎁 Vos Avantages & Privilèges Débloqués :</strong>
        <div style="display: flex; flex-direction: column; gap: 3px;">
          <div>• 🎟️ <strong>Boîte Mystère reçue</strong> : Coupon de <strong>5% OFF</strong> utilisable <strong>${usesCount} fois</strong> sans date d'expiration !</div>
          <div>• 👑 <strong>Insigne de Prestige</strong> : Badge vérifié et couronne V affichés sur votre avatar.</div>
          <div>• ⚡ <strong>Statut VIP Privilège</strong> : Priorité sur les ventes privées et livraisons express.</div>
        </div>
      </div>
      <button class="view-mystery-email-btn" style="margin-top: 4px; background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 12px; cursor: pointer; align-self: flex-start; box-shadow: 0 3px 8px rgba(0,82,204,0.25);">
        🎁 Gratter ma Boîte Mystère →
      </button>
    </div>
  `;

  const newNotif = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    uniqueKey: `achievement-${safeEmail}-${Date.now()}`,
    type: 'promo',
    icon: '🏆',
    title: title,
    desc: desc,
    createdAt: Date.now(),
    unread: true
  };

  notifs.unshift(newNotif);
  sessionStorage.setItem(notifKey, JSON.stringify(notifs));

  // Save to customer specific notifications key
  try {
    const userSafe = safeEmail.replace(/[^a-z0-9]/g, '_');
    const userKey = `SWEETOS_user_notifications_${userSafe}`;
    let userNotifs = JSON.parse(sessionStorage.getItem(userKey) || '[]');
    userNotifs.unshift(newNotif);
    sessionStorage.setItem(userKey, JSON.stringify(userNotifs));
  } catch(e) {}

  window.dispatchEvent(new CustomEvent('notifications:updated'));
  window.dispatchEvent(new CustomEvent('notifications:badge-sync', { detail: notifs.filter(n => n.unread).length }));
}

export function consumeBadgeRewardUse(email, couponCode) {
  if (!email || !couponCode) return false;
  const safeEmail = email.toLowerCase();
  try {
    const rewards = JSON.parse(sessionStorage.getItem('SWEETOS_badge_rewards') || '{}');
    const userReward = rewards[safeEmail];

    if (userReward && userReward.code === couponCode) {
      if (userReward.remainingUses > 0) {
        userReward.remainingUses -= 1;
        if (userReward.remainingUses <= 0) {
          userReward.status = 'exhausted';
        }
        rewards[safeEmail] = userReward;
        sessionStorage.setItem('SWEETOS_badge_rewards', JSON.stringify(rewards));

        // Sync with SWEETOS_coupons
        let adminCoupons = JSON.parse(sessionStorage.getItem('SWEETOS_coupons') || '[]');
        const idx = adminCoupons.findIndex(c => c.code === couponCode);
        if (idx > -1) {
          adminCoupons[idx].remainingUses = userReward.remainingUses;
          adminCoupons[idx].used = (adminCoupons[idx].used || 0) + 1;
          if (userReward.remainingUses <= 0) {
            adminCoupons[idx].status = 'exhausted';
          }
          sessionStorage.setItem('SWEETOS_coupons', JSON.stringify(adminCoupons));
        }

        window.dispatchEvent(new CustomEvent('badge_reward:updated', { detail: { email: safeEmail, reward: userReward } }));
        return true;
      }
    }
  } catch(e) {}
  return false;
}

