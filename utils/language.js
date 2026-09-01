// utils/language.js - Device Language Detection & Preference Persistence

export function getInitialLanguage() {
  // 1. Respect manual user choice if previously selected
  const saved = localStorage.getItem('SWEETOS_user_lang_preference') || sessionStorage.getItem('SWEETOS_lang');
  if (saved) return saved.toLowerCase();

  // 2. Auto-detect browser/device language (e.g. fr-FR, fr-CI, fr-CA -> 'fr')
  const deviceLang = (navigator.language || (navigator.languages && navigator.languages[0]) || 'fr').toLowerCase();
  
  if (deviceLang.startsWith('fr')) {
    return 'fr';
  }
  return 'en';
}

export function setUserLanguage(lang) {
  const safeLang = (lang || 'fr').toLowerCase();
  localStorage.setItem('SWEETOS_user_lang_preference', safeLang);
  sessionStorage.setItem('SWEETOS_lang', safeLang);
  window.dispatchEvent(new CustomEvent('language:changed', { detail: safeLang }));
  return safeLang;
}

export function getText(key, lang = getInitialLanguage()) {
  const isFrench = lang === 'fr';

  const translations = {
    // Badges & Actions
    add: isFrench ? 'Ajouter' : 'Add',
    addToCart: isFrench ? 'Ajouter au panier 🛒' : 'Add to cart 🛒',
    outOfStock: isFrench ? 'Rupture de Stock' : 'Out of Stock',
    out: isFrench ? 'Rupture' : 'Out',
    flashDeal: isFrench ? '⚡ OFFRE FLASH' : '⚡ FLASH DEAL',
    topSeller: isFrench ? '⭐ TOP VENTE' : '⭐ BEST SELLER',
    newArrival: isFrench ? '✨ NOUVEAU' : '✨ NEW',
    inStock: isFrench ? '✅ En Stock' : '✅ In Stock',
    dispatch24h: isFrench ? '⚡ Expédition 24h' : '⚡ 24h Dispatch',
    authenticGuarantee: isFrench ? '🛡️ Garantie Authentique' : '🛡️ Authentic Guarantee',
    
    // Headings
    forYou: isFrench ? 'Pour vous · Infiniment.' : 'For You · Infinitely.',
    forYouSubtitle: isFrench ? 'Feed infini de produits et accessoires recommandés pour votre setup' : 'Infinite feed of recommended products and desk accessories',
    youMayAlsoLike: isFrench ? 'Vous aimerez aussi.' : 'You may also like.',
    viewAll: isFrench ? 'Tout le catalogue →' : 'View All →',
    hoverToZoom: isFrench ? 'Survoler pour zoomer' : 'Hover to zoom',
    youSave: isFrench ? 'Vous économisez' : 'You save',
    myCart: isFrench ? 'Votre Panier' : 'Your Cart',
    checkout: isFrench ? 'Commander / Caisse' : 'Checkout',
    continueShopping: isFrench ? 'Continuer les achats' : 'Continue shopping',
    clearCart: isFrench ? 'Vider' : 'Clear'
  };

  return translations[key] || '';
}
