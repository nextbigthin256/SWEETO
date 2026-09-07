// utils/metaTags.js - Dynamic Open Graph & Social Sharing Metadata Manager
import { updateProductShareMetaTags as shareUpdateMeta } from './share.js';

export function updateProductMetaTags(product) {
  if (!product) return;
  shareUpdateMeta(product);
}

export function resetDefaultMetaTags() {
  const defaultTitle = 'SWEETOS | Premium Tech Store';
  const defaultDesc = 'Découvrez les meilleurs produits tech sur SWEETOS';
  const defaultImage = `${window.location.origin}/assets/sweetos_logo.svg`;

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

export { shareUpdateMeta as updateProductShareMetaTags };

