/**
 * utils/todaysDeals.js
 * Comprehensive logic for Today's Deals (Offres du Jour):
 * - Dynamic Expiration Timer (10h to 10 days)
 * - 2x6 Product Layout (12 items total, 2 lines of 6 products)
 * - Limited First-Come Coupon Bounty (5 or 10 coupons of 5% OFF)
 * - Auto-hide on expiration & Admin On/Off switch
 */

import { getNotificationsStorageKey, getScratchcardsStorageKey, isLocalDevHost, saveStorageItem, getStorageItem } from './storage.js';
import { saveSiteSettingInSupabase, fetchSiteSettingFromSupabase } from './supabase.js';

const STORAGE_KEY = 'SWEETOS_todays_deals';

export const DEAL_BANNER_THEMES = {
  indigo: {
    id: 'indigo',
    name: 'Indigo & Sapphire (Cyber Tech)',
    tag: 'LIMITED TIME OFFER',
    badgeIcon: '🔥',
    bg: '#0f172a',
    bgGradient: 'linear-gradient(135deg, #0b1120 0%, #1e1b4b 50%, #312e81 100%)',
    overlayGradient: 'linear-gradient(to right, #0f172a 0%, rgba(15,23,42,0.85) 45%, rgba(15,23,42,0.4) 75%, transparent 100%)',
    accentColor: '#818cf8',
    accentLight: '#c7d2fe',
    badgeBg: 'rgba(99, 102, 241, 0.15)',
    badgeBorder: 'rgba(99, 102, 241, 0.35)',
    badgeText: '#a5b4fc',
    btnBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    btnHover: '#4f46e5',
    btnShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
    highlightColor: '#818cf8',
    timerAccent: '#818cf8'
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon (Violet & Rose)',
    tag: 'FLASH DEAL EXCLUSIF',
    badgeIcon: '⚡',
    bg: '#180324',
    bgGradient: 'linear-gradient(135deg, #180324 0%, #4a044e 50%, #831843 100%)',
    overlayGradient: 'linear-gradient(to right, #180324 0%, rgba(24,3,36,0.85) 45%, rgba(24,3,36,0.4) 75%, transparent 100%)',
    accentColor: '#f472b6',
    accentLight: '#fbcfe8',
    badgeBg: 'rgba(236, 72, 153, 0.15)',
    badgeBorder: 'rgba(236, 72, 153, 0.35)',
    badgeText: '#f472b6',
    btnBg: 'linear-gradient(135deg, #ec4899, #be185d)',
    btnHover: '#db2777',
    btnShadow: '0 8px 24px rgba(236, 72, 153, 0.4)',
    highlightColor: '#f472b6',
    timerAccent: '#f472b6'
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Amber (Orange & Or)',
    tag: 'OFFRE LIMITÉE CHAUDE',
    badgeIcon: '🔥',
    bg: '#1c0a00',
    bgGradient: 'linear-gradient(135deg, #1c0a00 0%, #7c2d12 50%, #9a3412 100%)',
    overlayGradient: 'linear-gradient(to right, #1c0a00 0%, rgba(28,10,0,0.85) 45%, rgba(28,10,0,0.4) 75%, transparent 100%)',
    accentColor: '#fb923c',
    accentLight: '#ffedd5',
    badgeBg: 'rgba(249, 115, 22, 0.15)',
    badgeBorder: 'rgba(249, 115, 22, 0.35)',
    badgeText: '#fb923c',
    btnBg: 'linear-gradient(135deg, #ea580c, #c2410c)',
    btnHover: '#c2410c',
    btnShadow: '0 8px 24px rgba(234, 88, 12, 0.4)',
    highlightColor: '#fbbf24',
    timerAccent: '#fbbf24'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Forest (Vert & Menthe)',
    tag: 'ÉDITION SPÉCIALE',
    badgeIcon: '✨',
    bg: '#021a12',
    bgGradient: 'linear-gradient(135deg, #021a12 0%, #064e3b 50%, #065f46 100%)',
    overlayGradient: 'linear-gradient(to right, #021a12 0%, rgba(2,26,18,0.85) 45%, rgba(2,26,18,0.4) 75%, transparent 100%)',
    accentColor: '#34d399',
    accentLight: '#d1fae5',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeBorder: 'rgba(16, 185, 129, 0.35)',
    badgeText: '#34d399',
    btnBg: 'linear-gradient(135deg, #10b981, #059669)',
    btnHover: '#059669',
    btnShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
    highlightColor: '#34d399',
    timerAccent: '#34d399'
  },
  titanium: {
    id: 'titanium',
    name: 'Titanium Noir & Argent (Minimaliste)',
    tag: 'PREMIUM SELECTION',
    badgeIcon: '💎',
    bg: '#090d16',
    bgGradient: 'linear-gradient(135deg, #000000 0%, #111827 50%, #1f2937 100%)',
    overlayGradient: 'linear-gradient(to right, #090d16 0%, rgba(9,13,22,0.85) 45%, rgba(9,13,22,0.4) 75%, transparent 100%)',
    accentColor: '#38bdf8',
    accentLight: '#e0f2fe',
    badgeBg: 'rgba(255, 255, 255, 0.12)',
    badgeBorder: 'rgba(255, 255, 255, 0.25)',
    badgeText: '#ffffff',
    btnBg: 'linear-gradient(135deg, #0284c7, #0369a1)',
    btnHover: '#0369a1',
    btnShadow: '0 8px 24px rgba(2, 132, 199, 0.4)',
    highlightColor: '#38bdf8',
    timerAccent: '#38bdf8'
  }
};

export function getTodaysDealsTheme(config) {
  const themeId = config?.bannerTheme || 'indigo';
  return DEAL_BANNER_THEMES[themeId] || DEAL_BANNER_THEMES.indigo;
}

export function getDefaultTodaysDealsConfig() {
  const now = Date.now();
  const defaultDurationHours = 24;
  return {
    enabled: true,
    bannerTheme: 'indigo', // 'indigo' | 'cyberpunk' | 'sunset' | 'emerald' | 'titanium'
    title: "Offres Flash du Jour",
    subtitle: "Sélection exclusive limitée avec compte à rebours — Jusqu'à 50% de réduction !",
    durationHours: defaultDurationHours,
    startedAt: now,
    endsAt: now + defaultDurationHours * 60 * 60 * 1000,
    minSpendForReward: 15000, // Minimum spend in FCFA required to earn winning deal coupon
    productIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    couponPool: {
      enabled: true,
      discountPercent: 5,
      totalCoupons: 5, // 5 or 10
      remainingCoupons: 5,
      claimedBy: [] // Array of { email, code, date }
    }
  };
}

export function getTodaysDealsConfig() {
  try {
    fetchSiteSettingFromSupabase('todays_deals_config').then(cloudConf => {
      if (cloudConf) {
        saveStorageItem(STORAGE_KEY, JSON.stringify(cloudConf));
      }
    }).catch(() => {});

    const raw = getStorageItem(STORAGE_KEY);
    if (!raw) {
      const def = getDefaultTodaysDealsConfig();
      saveStorageItem(STORAGE_KEY, JSON.stringify(def));
      return def;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.bannerTheme || !DEAL_BANNER_THEMES[parsed.bannerTheme]) {
      parsed.bannerTheme = 'indigo';
    }
    if (parsed.minSpendForReward === undefined || parsed.minSpendForReward === null) {
      parsed.minSpendForReward = 15000;
    }
    // Ensure all required properties exist
    if (!parsed.couponPool) {
      parsed.couponPool = {
        enabled: true,
        discountPercent: 5,
        totalCoupons: 5,
        remainingCoupons: 5,
        claimedBy: []
      };
    }
    return parsed;
  } catch (e) {
    console.error('Error loading Today Deals config:', e);
    return getDefaultTodaysDealsConfig();
  }
}

export function notifyCustomersDealsActive(config) {
  try {
    const notifKey = 'SWEETOS_notifications';
    let notifs = [];
    try {
      notifs = JSON.parse(getStorageItem(notifKey) || '[]');
    } catch(e) {}

    const totalCoupons = config.couponPool?.totalCoupons || 5;
    const newNotif = {
      id: Date.now(),
      type: 'deal',
      icon: '⚡',
      title: `⚡ ${config.title || "Offres Flash du Jour"} est disponible !`,
      desc: `${config.subtitle || "Sélection exclusive limitée avec compte à rebours."} ${totalCoupons} coupons 5% OFF offerts aux premiers acheteurs !`,
      time: "À l'instant",
      unread: true,
      link: '#/'
    };

    // Avoid duplicate notifications within last 2 minutes
    const isDuplicate = notifs.some(n => n.type === 'deal' && (Date.now() - n.id) < 2 * 60 * 1000);
    if (!isDuplicate) {
      notifs.unshift(newNotif);
      saveStorageItem(notifKey, JSON.stringify(notifs));
      window.dispatchEvent(new CustomEvent('notifications:updated'));
    }
  } catch(e) {
    console.error('Error notifying customers about deals:', e);
  }
}

export function saveTodaysDealsConfig(config) {
  try {
    const prevCfg = getTodaysDealsConfig();
    const wasOff = !prevCfg.enabled || (prevCfg.endsAt && Date.now() >= prevCfg.endsAt);
    
    saveStorageItem(STORAGE_KEY, JSON.stringify(config));
    saveSiteSettingInSupabase('todays_deals_config', config);
    window.dispatchEvent(new CustomEvent('todays_deals:updated', { detail: config }));
    
    // If deals turned ON or timer restarted while enabled, notify customers!
    if (config.enabled && (wasOff || config.notifyCustomers)) {
      notifyCustomersDealsActive(config);
    }

    // Server sync
    if (isLocalDevHost()) {
      fetch('/api/todays_deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      }).catch(() => {});
    }
  } catch (e) {
    console.error('Error saving Today Deals config:', e);
  }
}

export function isTodaysDealsActive(config = null) {
  const cfg = config || getTodaysDealsConfig();
  if (!cfg.enabled) return false;
  if (!cfg.productIds || cfg.productIds.length === 0) return false;
  const now = Date.now();
  if (cfg.endsAt && now >= cfg.endsAt) return false;
  return true;
}

export function resetTodaysDealsTimer(durationHours = 24) {
  const cfg = getTodaysDealsConfig();
  const now = Date.now();
  cfg.durationHours = durationHours;
  cfg.startedAt = now;
  cfg.endsAt = now + durationHours * 60 * 60 * 1000;
  cfg.enabled = true;
  saveTodaysDealsConfig(cfg);
  return cfg;
}

export function getTimeRemaining(endsAt) {
  const total = Math.max(0, endsAt - Date.now());
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return {
    total,
    days,
    hours,
    minutes,
    seconds,
    isExpired: total <= 0
  };
}

/**
 * Claim a 5% OFF Deal Coupon for a buyer of items in Today's Deals.
 * Returns { success: true, coupon, message } or { success: false, message }
 */
export function claimTodaysDealsCoupon(customerEmail) {
  if (!customerEmail) return { success: false, message: 'Email manquant' };
  const cfg = getTodaysDealsConfig();
  
  if (!isTodaysDealsActive(cfg)) {
    return { success: false, message: 'Offre expirée ou inactive.' };
  }

  const pool = cfg.couponPool;
  if (!pool || !pool.enabled) {
    return { success: false, message: 'Oops! Good luck on your next purchase! / Oups ! Bonne chance pour votre prochain achat ! 🍀' };
  }

  const lowerEmail = customerEmail.toLowerCase().trim();

  // Check if customer already claimed a coupon from this current batch
  const alreadyClaimed = pool.claimedBy.find(c => c.email && c.email.toLowerCase() === lowerEmail);
  if (alreadyClaimed) {
    return {
      success: true,
      coupon: alreadyClaimed.coupon,
      message: `Vous avez déjà reçu votre coupon ${pool.discountPercent}% OFF (${alreadyClaimed.code}) pour cette offre !`
    };
  }

  // Check remaining coupons in the pool
  if (pool.remainingCoupons <= 0) {
    return {
      success: false,
      message: 'Oops! Good luck on your next purchase! / Oups ! Bonne chance pour votre prochain achat ! Les coupons offerts de cette section sont déjà tous réclamés. 🍀'
    };
  }

  // Create unique coupon code
  const code = `DEAL5-${Math.floor(1000 + Math.random() * 9000)}`;
  const expiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 14 days

  const newCoupon = {
    code: code,
    type: 'percentage',
    value: pool.discountPercent || 5,
    minOrder: 0,
    limit: 1,
    used: 0,
    expiry: expiryDate,
    status: 'active',
    description: `Coupon spécial Offre du Jour ${pool.discountPercent}% OFF (Offert aux premiers acheteurs)`
  };

  // Add to global coupons database
  let couponsList = [];
  try {
    couponsList = JSON.parse(sessionStorage.getItem('SWEETOS_coupons') || '[]');
  } catch (e) {}
  couponsList.unshift(newCoupon);
  sessionStorage.setItem('SWEETOS_coupons', JSON.stringify(couponsList));

  // Deduct 1 from pool
  pool.remainingCoupons = Math.max(0, pool.remainingCoupons - 1);
  const claimRecord = {
    email: lowerEmail,
    code: code,
    coupon: newCoupon,
    date: new Date().toISOString()
  };
  pool.claimedBy.unshift(claimRecord);

  saveTodaysDealsConfig(cfg);

  return {
    success: true,
    coupon: newCoupon,
    claimNumber: pool.totalCoupons - pool.remainingCoupons,
    message: `🎉 Félicitations ! Vous faites partie des premiers acheteurs et recevez un coupon de ${pool.discountPercent}% OFF (Code: ${code}) valable 14 jours ! 🎟️✨`
  };
}

/**
 * Award Mystery Box upon order DELIVERY / COMPLETE
 * Checks if Today's Deals spend requirement was met or if milestone reached
 */
export function awardMysteryBoxForDeliveredOrder(order) {
  if (!order || !order.id) return;
  const userEmail = (order.customerEmail || order.email || '').toLowerCase().trim();
  const orderId = order.id;
  const boxId = `box-order-${orderId}`;

  const scratchKey = getScratchcardsStorageKey();
  let scratchcards = [];
  try {
    scratchcards = JSON.parse(sessionStorage.getItem(scratchKey) || '[]');
  } catch (e) {}

  // Prevent duplicate mystery boxes for the same order
  if (scratchcards.some(sc => sc.id === boxId || sc.orderId === orderId)) {
    return;
  }

  const totalCFA = parseFloat(order.total) || 0;
  const dealsSpent = order.dealsSpent !== undefined ? parseFloat(order.dealsSpent) || 0 : 0;
  const dealsActive = order.dealsActive !== undefined ? Boolean(order.dealsActive) : false;
  const requiredDealSpend = order.requiredDealSpend || 15000;
  const meetsDealRequirement = Boolean(order.meetsDealRequirement || (dealsActive && dealsSpent >= requiredDealSpend));

  scratchcards.unshift({
    id: boxId,
    email: userEmail,
    orderId: orderId,
    amount: totalCFA,
    dealsSpent: dealsSpent,
    dealsActive: dealsActive,
    requiredDealSpend: requiredDealSpend,
    meetsRequirement: meetsDealRequirement,
    scratched: false,
    couponWon: null,
    createdAt: Date.now(),
    expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000
  });

  sessionStorage.setItem(scratchKey, JSON.stringify(scratchcards));

  // Push customer delivered notification with mystery box alert to user-scoped notification store
  const notifKey = getNotificationsStorageKey();
  let notifs = [];
  try {
    notifs = JSON.parse(sessionStorage.getItem(notifKey) || '[]');
  } catch (e) {}

  notifs.unshift({
    id: Date.now(),
    type: 'reward',
    icon: '🎁',
    title: `🎁 Commande #${orderId} Livrée — Boîte Mystère Débloquée !`,
    desc: `Votre commande #${orderId} est livrée ! Une Boîte Mystère vous attend dans votre page Coupons. Grattez-la pour découvrir votre récompense ! 🍀✨`,
    time: 'À l’instant',
    timestamp: Date.now(),
    unread: true
  });

  sessionStorage.setItem(notifKey, JSON.stringify(notifs));

  // Also push to user-specific notification store if available
  if (userEmail) {
    const userSafeKey = `SWEETOS_notifications_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    let userNotifs = [];
    try {
      userNotifs = JSON.parse(sessionStorage.getItem(userSafeKey) || '[]');
    } catch (e) {}
    userNotifs.unshift({
      id: Date.now(),
      type: 'reward',
      icon: '🎁',
      title: `🎁 Commande #${orderId} Livrée — Boîte Mystère Débloquée !`,
      desc: `Votre commande #${orderId} est livrée ! Une Boîte Mystère vous attend dans votre page Coupons. Grattez-la pour découvrir votre récompense ! 🍀✨`,
      time: 'À l’instant',
      timestamp: Date.now(),
      unread: true
    });
    sessionStorage.setItem(userSafeKey, JSON.stringify(userNotifs));
  }

  window.dispatchEvent(new CustomEvent('notifications:updated'));
  window.dispatchEvent(new CustomEvent('toast:show', {
    detail: `🎁 Commande #${orderId} livrée ! Votre Boîte Mystère est prête à être grattée dans vos coupons ! 🍀`
  }));
}

