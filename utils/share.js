// utils/share.js - Centralized Product Sharing Utility (Image & Link)
import { formatPrice } from './storage.js';

/**
 * Returns a clean, absolute HTTPS image URL for sharing and link preview.
 */
export function getAbsoluteImageUrl(imageSrc) {
  if (!imageSrc || typeof imageSrc !== 'string') {
    return new URL('./assets/sweetos_logo.svg', window.location.origin).href;
  }
  if (imageSrc.startsWith('data:image/')) {
    return imageSrc;
  }
  if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
    return imageSrc;
  }
  try {
    return new URL(imageSrc, window.location.origin).href;
  } catch (e) {
    const cleanPath = imageSrc.startsWith('/') ? imageSrc : '/' + imageSrc;
    return `${window.location.origin}${cleanPath}`;
  }
}

/**
 * Fetches and converts a product image URL or Base64 string into a File object
 * suitable for the Web Share API (navigator.share).
 */
export async function fetchProductImageFile(imageSrc, productId = 'prod') {
  try {
    if (!imageSrc) return null;

    let blob;
    let mimeType = 'image/jpeg';
    let extension = 'jpg';

    if (imageSrc.startsWith('data:image/')) {
      const parts = imageSrc.split(',');
      const match = parts[0].match(/:(.*?);/);
      if (match) mimeType = match[1];
      extension = mimeType.split('/')[1] || 'jpg';
      const binary = atob(parts[1]);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      blob = new Blob([array], { type: mimeType });
    } else {
      const absUrl = getAbsoluteImageUrl(imageSrc);
      const res = await fetch(absUrl, { mode: 'cors' });
      if (!res.ok) return null;
      blob = await res.blob();
      mimeType = blob.type || 'image/jpeg';
      if (mimeType.includes('png')) extension = 'png';
      else if (mimeType.includes('webp')) extension = 'webp';
      else if (mimeType.includes('svg')) extension = 'svg';
      else extension = 'jpg';
    }

    return new File([blob], `product-${productId}.${extension}`, { type: mimeType });
  } catch (err) {
    console.warn('[Share Utility] Could not prepare image file for native share:', err);
    return null;
  }
}

/**
 * Main Product Share Handler
 * Shares product with image file (via Web Share API) + direct link,
 * or falls back gracefully to WhatsApp with text, direct product link & image URL.
 */
export async function shareProduct(product) {
  if (!product) return;

  const storeName = sessionStorage.getItem('SWEETOS_store_name') || 'SWEETOS';
  const origin = window.location.origin;
  
  // Direct store link pointing to product modal
  const productUrl = `${origin}${window.location.pathname}#/?product=${product.id}`;
  
  // Dynamic Open Graph share preview URL (for rich unfurling in social apps)
  const ogShareUrl = `${origin}/api/share?product=${product.id}`;

  const priceText = formatPrice(product.price);
  const compareText = product.comparePrice && product.comparePrice > product.price 
    ? ` (Was ~${formatPrice(product.comparePrice)}~)` 
    : '';
  
  const absImageUrl = getAbsoluteImageUrl(product.image);

  const shareTitle = `${product.name} | ${storeName}`;
  
  // Construct clean text payload including product link with Open Graph preview
  const shareText = 
`🔥 *NEW ARRIVAL ON ${storeName.toUpperCase()}* 🔥

📦 *${product.name.toUpperCase()}*
🏷️ *Brand:* ${product.brand || 'SWEETOS'}
📂 *Category:* ${product.category || 'General'}
💰 *Price:* ${priceText}${compareText}

📝 *Details:*
"${(product.description || product.shortDesc || '').slice(0, 180)}"

👇 *Tap link below to view product & image:*
🔗 ${ogShareUrl}`;

  // WhatsApp fallback handler (used when navigator.share is unavailable or fails)
  const openWhatsAppFallback = () => {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
    window.dispatchEvent(new CustomEvent('toast:show', { 
      detail: '📱 Opening WhatsApp! Product image preview and link included.' 
    }));
  };

  // 1. Try Native Web Share API with attached image file
  if (navigator.share) {
    try {
      const imageFile = await fetchProductImageFile(product.image, product.id);

      if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: productUrl,
          files: [imageFile]
        });
        return;
      } else {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: productUrl
        });
        return;
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // User canceled the share dialog
      console.warn('[Share Utility] Web Share API failed, falling back to WhatsApp:', err);
      openWhatsAppFallback();
    }
  } else {
    openWhatsAppFallback();
  }
}
