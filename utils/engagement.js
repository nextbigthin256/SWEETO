// utils/engagement.js - Track user engagement to delay intrusive prompts
import { getStorageItem } from './storage.js';

export function isUserEngaged() {
  // 1. Engaged if user added at least 1 item to cart
  try {
    const cartStr = getStorageItem('SWEETOS_cart');
    if (cartStr) {
      const cart = JSON.parse(cartStr);
      if (Array.isArray(cart) && cart.length > 0) return true;
    }
  } catch(e) {}

  // 2. Engaged if user browsed at least 3 pages/products
  const views = parseInt(sessionStorage.getItem('SWEETOS_page_views') || '0');
  return views >= 3;
}

export function incrementPageView() {
  let views = parseInt(sessionStorage.getItem('SWEETOS_page_views') || '0');
  views++;
  sessionStorage.setItem('SWEETOS_page_views', String(views));
  if (views >= 3 || isUserEngaged()) {
    window.dispatchEvent(new CustomEvent('user:engaged'));
  }
}
