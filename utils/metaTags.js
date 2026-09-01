// utils/metaTags.js - Dynamic Open Graph & Social Sharing Metadata Manager
import { formatPrice } from './storage.js';

export function updateProductMetaTags(product) {
  if (!product) return;

  const siteName = 'SWEETOS';
  const rawPrice = product.price ? formatPrice(product.price) : '';
  const title = `${product.name} - ${rawPrice} | ${siteName}`;
  const brand = product.brand || 'SWEETOS';
  const category = product.category || 'Gear';
  const stockInfo = (product.stock !== undefined && product.stock > 0) 
    ? `En Stock (${product.stock} unités)` 
    : 'Disponible sur commande';
  
  const description = `${product.name} par ${brand}. ${category} de haute précision. ${rawPrice}. ${stockInfo}. Commandez dès aujourd'hui sur ${siteName}!`;

  // Ensure absolute image URL for WhatsApp / Facebook / Telegram link previews
  let imageUrl = product.image || '';
  if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    imageUrl = new URL(imageUrl, window.location.origin).href;
  }
  if (!imageUrl) {
    imageUrl = new URL('./assets/sweetos_logo.svg', window.location.origin).href;
  }

  const currentUrl = window.location.href;

  // 1. Update Document Title
  document.title = title;

  // 2. Helper to set or create meta tag
  const setMeta = (selector, attribute, value) => {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      const attrName = selector.startsWith('meta[property') ? 'property' : 'name';
      const attrVal = selector.split('"')[1];
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute(attribute, value);
  };

  // 3. Open Graph Tags (WhatsApp, Facebook, LinkedIn, Telegram)
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:image"]', 'content', imageUrl);
  setMeta('meta[property="og:image:secure_url"]', 'content', imageUrl);
  setMeta('meta[property="og:url"]', 'content', currentUrl);
  setMeta('meta[property="og:type"]', 'content', 'product');
  setMeta('meta[property="og:site_name"]', 'content', siteName);

  // 4. Twitter Card Tags
  setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
  setMeta('meta[name="twitter:title"]', 'content', title);
  setMeta('meta[name="twitter:description"]', 'content', description);
  setMeta('meta[name="twitter:image"]', 'content', imageUrl);

  // 5. Product Specific Ecommerce Metadata Tags
  if (product.price) {
    setMeta('meta[property="product:price:amount"]', 'content', String(product.price));
    setMeta('meta[property="product:price:currency"]', 'content', 'XOF');
  }
}

export function resetDefaultMetaTags() {
  const defaultTitle = 'SWEETOS | High-Precision Tech & Workspace Accessories';
  const defaultDesc = 'Minimalist desk gear, mechanical keyboards, audio accessories, and workspace essentials curated for creators.';
  const defaultImage = new URL('./assets/sweetos_logo.svg', window.location.origin).href;

  document.title = defaultTitle;
  
  const setMeta = (selector, attribute, value) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attribute, value);
  };

  setMeta('meta[property="og:title"]', 'content', defaultTitle);
  setMeta('meta[property="og:description"]', 'content', defaultDesc);
  setMeta('meta[property="og:image"]', 'content', defaultImage);
  setMeta('meta[property="og:image:secure_url"]', 'content', defaultImage);
  setMeta('meta[property="og:url"]', 'content', window.location.origin);
  setMeta('meta[property="og:type"]', 'content', 'website');

  setMeta('meta[name="twitter:title"]', 'content', defaultTitle);
  setMeta('meta[name="twitter:description"]', 'content', defaultDesc);
  setMeta('meta[name="twitter:image"]', 'content', defaultImage);
}
