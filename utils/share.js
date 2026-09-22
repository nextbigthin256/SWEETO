/**
 * ============================================================================
 * SWEETOS - PRODUCT SHARING & WHATSAPP INTEGRATION UTILITIES
 * ============================================================================
 * Pure ES Modules - No build step required.
 * Handles WhatsApp Chat & Status sharing, Native Web Share API, Open Graph URL
 * generation, clipboard copy, and Supabase share tracking.
 */

import { supabase } from './supabase.js';
import { formatPrice as storageFormatPrice } from './storage.js';

/**
 * Re-export formatPrice from storage.js for complete application consistency
 */
export const formatPrice = storageFormatPrice;

/**
 * Generate absolute Share URL for a product.
 * Points to the Supabase Edge Function gateway URL (og-product) for rich Open Graph social previews,
 * which redirects human visitors to product.html.
 * @param {Object} product 
 * @returns {string}
 */
export function getProductShareUrl(product) {
  if (!product) return window.location.origin;
  const productId = product.legacy_id ?? product.id ?? product.uuid ?? product.slug;
  const baseUrl = window.location.origin;
  
  const params = new URLSearchParams();
  params.set('product', productId);
  if (product.name) params.set('title', product.name);
  if (product.price) params.set('price', String(product.price));
  if (product.image) params.set('image', product.image);
  if (product.brand) params.set('brand', product.brand);
  if (product.category) params.set('category', product.category);
  
  // Vercel Serverless Function Gateway URL for rich social crawler previews (WhatsApp, Facebook, Twitter)
  return `${baseUrl}/api/share?${params.toString()}`;
}

/**
 * Build rich, beautifully formatted WhatsApp markdown message template.
 * @param {Object} product 
 * @returns {string}
 */
export function buildWhatsAppMessage(product) {
  if (!product) return '';

  const name = (product.name || 'Product').trim().toUpperCase();
  const priceFormatted = formatPrice(product.price);
  
  // Strikethrough original price if discounted
  let priceLine = `💰 *${priceFormatted}*`;
  const origPrice = product.originalPrice || product.comparePrice;
  if (origPrice && Number(origPrice) > Number(product.price)) {
    priceLine += ` ~${formatPrice(origPrice)}~`;
  }

  const brand = product.brand ? product.brand.trim() : null;
  const category = product.category ? product.category.trim() : null;
  let tagLine = '';
  if (brand && category) {
    tagLine = `🏷️ ${brand} • ${category}`;
  } else if (brand || category) {
    tagLine = `🏷️ ${brand || category}`;
  }

  const rating = product.rating ? Number(product.rating).toFixed(1) : '5.0';
  const shareUrl = getProductShareUrl(product);

  const lines = [
    `🛒 *${name}*`,
    ``,
    priceLine,
    tagLine,
    `⭐ ${rating}/5`,
    ``,
    `👉 Commander ici: ${shareUrl}`,
    ``,
    `— Envoyé depuis *SWEETOS* 🛒`
  ].filter(line => line !== null);

  return lines.join('\n');
}

/**
 * Share Product directly to a WhatsApp Chat contact.
 * @param {Object} product 
 * @returns {boolean}
 */
export function shareToWhatsApp(product) {
  if (!product) return false;
  const message = buildWhatsAppMessage(product);
  const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
  trackShare(product, 'whatsapp_chat');
  return true;
}

/**
 * Share Product to WhatsApp Status with guidance modal / toast.
 * @param {Object} product 
 * @returns {boolean}
 */
export async function shareToWhatsAppStatus(product) {
  if (!product) return false;
  const message = buildWhatsAppMessage(product);
  const shareUrl = getProductShareUrl(product);

  // Attempt native Web Share API with image file so mobile OS offers WhatsApp Status directly
  try {
    if (navigator.share && product.image) {
      const res = await fetch(product.image);
      const blob = await res.blob();
      const file = new File([blob], 'sweetos-product.jpg', { type: blob.type || 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: product.name || 'Produit SWEETOS',
          text: message,
          url: shareUrl
        });
        trackShare(product, 'whatsapp_status');
        return true;
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('[Share] Native status share fallback:', err);
    }
  }

  // Desktop / Web Fallback: Open pre-filled chat composer + guidance toast
  const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
  trackShare(product, 'whatsapp_status');

  window.dispatchEvent(new CustomEvent('toast:show', {
    detail: '💡 Dans WhatsApp : appuyez longuement sur le message → Partager → Mon statut'
  }));

  return true;
}

/**
 * Copy product share link to clipboard.
 * @param {Object} product 
 * @returns {Promise<boolean>}
 */
export async function copyShareLink(product) {
  if (!product) return false;
  const shareUrl = getProductShareUrl(product);

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: '📋 Lien de produit copié !' }));
      trackShare(product, 'copy');
      return true;
    }
  } catch (e) {
    console.warn('[Share] Clipboard API failed, attempting fallback...', e);
  }

  // Fallback for legacy browsers
  try {
    const textArea = document.createElement('textarea');
    textArea.value = shareUrl;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
    window.dispatchEvent(new CustomEvent('toast:show', { detail: '📋 Lien de produit copié !' }));
    trackShare(product, 'copy');
    return true;
  } catch (err) {
    console.error('[Share] Copy failed:', err);
    window.dispatchEvent(new CustomEvent('toast:show', { detail: '❌ Impossible de copier le lien.' }));
    return false;
  }
}

/**
 * Native Web Share API (mobile devices)
 * @param {Object} product 
 * @returns {Promise<boolean>}
 */
export async function nativeShare(product) {
  if (!product) return false;
  const shareUrl = getProductShareUrl(product);
  const message = buildWhatsAppMessage(product);

  const shareData = {
    title: `${product.name} — SWEETOS`,
    text: message,
    url: shareUrl
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      trackShare(product, 'native');
      return true;
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('[Share] Native share error:', err);
    }
  }

  // Fallback to copy link
  return await copyShareLink(product);
}

/**
 * Track Product Share to Supabase `product_shares` table (non-blocking)
 * @param {Object} product 
 * @param {string} channel ('whatsapp_chat' | 'whatsapp_status' | 'copy' | 'native')
 */
export async function trackShare(product, channel = 'whatsapp_chat') {
  if (!product) return;
  
  const productId = String(product.legacy_id ?? product.id ?? product.uuid ?? product.slug ?? 'unknown');
  const productName = product.name || 'Product';
  
  let userEmail = null;
  try {
    const userJson = localStorage.getItem('SWEETOS_logged_in_user');
    if (userJson) {
      const u = JSON.parse(userJson);
      userEmail = u?.email || null;
    }
  } catch(e) {}

  const record = {
    product_id: productId,
    product_name: productName,
    channel: channel,
    user_email: userEmail,
    referrer: window.location.href,
    shared_at: new Date().toISOString()
  };

  // Dispatch global custom event for share tracking
  window.dispatchEvent(new CustomEvent('product:shared', { detail: record }));

  // Non-blocking database write to Supabase
  try {
    if (supabase) {
      const { error } = await supabase.from('product_shares').insert([record]);
      if (error) {
        console.warn('⚠️ [Share Tracking Note]:', error.message);
      } else {
        console.log('✅ [Share Tracking] Recorded:', channel, productName);
      }
    }
  } catch(e) {
    console.warn('[Share Tracking] Skipped DB log:', e);
  }
}

/**
 * Update document head Open Graph & Twitter meta tags dynamically (Client-side)
 * @param {Object} product 
 */
export function updateProductShareMetaTags(product) {
  if (!product || typeof document === 'undefined') return;

  const shareUrl = getProductShareUrl(product);
  const formattedPrice = formatPrice(product.price);
  const title = `${product.name} — ${formattedPrice} | SWEETOS`;
  const description = `${formattedPrice} • ${product.brand || 'SWEETOS'} ${product.category ? '— ' + product.category : ''}. ${product.description || ''}`.trim();
  const image = product.image || `${window.location.origin}/assets/sweetos_share.jpg`;

  const metaMap = [
    { selector: 'meta[property="og:title"]', property: 'og:title', content: title },
    { selector: 'meta[property="og:description"]', property: 'og:description', content: description },
    { selector: 'meta[property="og:image"]', property: 'og:image', content: image },
    { selector: 'meta[property="og:url"]', property: 'og:url', content: shareUrl },
    { selector: 'meta[property="og:type"]', property: 'og:type', content: 'product' },
    { selector: 'meta[property="product:price:amount"]', property: 'product:price:amount', content: product.price },
    { selector: 'meta[property="product:price:currency"]', property: 'product:price:currency', content: 'XOF' },
    { selector: 'meta[name="twitter:card"]', name: 'twitter:card', content: 'summary_large_image' },
    { selector: 'meta[name="twitter:title"]', name: 'twitter:title', content: title },
    { selector: 'meta[name="twitter:description"]', name: 'twitter:description', content: description },
    { selector: 'meta[name="twitter:image"]', name: 'twitter:image', content: image }
  ];

  metaMap.forEach(({ selector, property, name, content }) => {
    if (!content) return;
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      if (property) el.setAttribute('property', property);
      if (name) el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', String(content));
  });

  document.title = title;
}

/**
 * Open Share Modal for a product (Main entrypoint)
 * @param {Object} product 
 * @returns {Promise<boolean>}
 */
export async function shareProduct(product) {
  if (!product) return false;
  let modal = document.querySelector('share-modal');
  if (!modal) {
    modal = document.createElement('share-modal');
    document.body.appendChild(modal);
  }
  modal.open(product);
  return true;
}

/**
 * Share on WhatsApp (Alias for shareToWhatsApp)
 * @param {Object} product 
 */
export function shareOnWhatsApp(product) {
  return shareToWhatsApp(product);
}

/**
 * Share on Facebook
 * @param {Object} product 
 */
export function shareOnFacebook(product) {
  if (!product) return false;
  const shareUrl = getProductShareUrl(product);
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  window.open(fbUrl, '_blank', 'noopener,noreferrer');
  trackShare(product, 'facebook');
  return true;
}

/**
 * Share on Twitter / X
 * @param {Object} product 
 */
export function shareOnTwitter(product) {
  if (!product) return false;
  const shareUrl = getProductShareUrl(product);
  const text = `${product.name} — ${formatPrice(product.price)} | SWEETOS`;
  const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
  window.open(twUrl, '_blank', 'noopener,noreferrer');
  trackShare(product, 'twitter');
  return true;
}

/**
 * Generate Product Share Buttons configuration array
 * @param {Object} product 
 */
export function getProductShareButtons(product) {
  return [
    { label: 'WhatsApp Chat', icon: '💬', onClick: () => shareToWhatsApp(product) },
    { label: 'WhatsApp Status', icon: '🟢', onClick: () => shareToWhatsAppStatus(product) },
    { label: 'Copier le lien', icon: '🔗', onClick: () => copyShareLink(product) },
    { label: 'Facebook', icon: '📘', onClick: () => shareOnFacebook(product) },
    { label: 'Twitter', icon: '🐦', onClick: () => shareOnTwitter(product) }
  ];
}

