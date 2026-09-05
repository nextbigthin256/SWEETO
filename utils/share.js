// utils/share.js - Native Product Sharing Utility with Image & Direct Link
import { formatPrice } from './storage.js';

/**
 * Converts a image URL or Base64 string into a File object for Web Share API
 */
export async function imageToFile(imgSrc, fileName = 'product.png') {
  try {
    if (!imgSrc) return null;
    let blob;
    if (imgSrc.startsWith('data:')) {
      const arr = imgSrc.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      blob = new Blob([u8arr], { type: mime });
    } else {
      const response = await fetch(imgSrc, { mode: 'cors' });
      blob = await response.blob();
    }
    return new File([blob], fileName, { type: blob.type || 'image/png' });
  } catch (e) {
    console.warn('[Share] Unable to convert image to file:', e);
    return null;
  }
}

/**
 * Generates a clean direct link for sharing a product
 */
export function getProductShareUrl(product) {
  if (!product) return window.location.href;
  const baseUrl = window.location.origin + window.location.pathname;
  const pId = product.id || product.legacy_id;
  return `${baseUrl}?product=${pId}#product-${pId}`;
}

/**
 * Shares a product with Image, Title, Price, and Direct Link
 */
export async function shareProduct(product, platform = 'native') {
  if (!product) return false;

  const pName = product.name || 'Product';
  const pPrice = product.price ? `${formatPrice(product.price)}` : '';
  const pDesc = product.description ? product.description.slice(0, 100) + '...' : '';
  const shareUrl = getProductShareUrl(product);
  const imgUrl = product.image || '';

  const shareText = `🛍️ *${pName}*\n${pPrice ? `💰 Price: *${pPrice}*\n` : ''}${pDesc ? `${pDesc}\n` : ''}\n👉 Order here: ${shareUrl}`;

  // 1. Try Native Web Share API with Image File (Mobile Chrome, Safari, Edge, Android/iOS)
  if (platform === 'native' && navigator.share) {
    try {
      const file = await imageToFile(imgUrl, `${pName.replace(/[^a-z0-9]/gi, '_')}.png`);
      const shareData = {
        title: pName,
        text: shareText,
        url: shareUrl
      };

      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        shareData.files = [file];
      }

      await navigator.share(shareData);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Product shared successfully! ✨' }));
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false; // User cancelled share dialog
      console.warn('[Share] Native share failed, falling back to direct link:', err);
    }
  }

  // 2. Platform specific fallback (WhatsApp, Telegram, Facebook, Twitter)
  if (platform === 'whatsapp' || platform === 'native') {
    const waText = encodeURIComponent(`${shareText}\n\n🖼️ Product Image: ${imgUrl}`);
    const waUrl = `https://api.whatsapp.com/send?text=${waText}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Opening WhatsApp to share product... 📲' }));
    return true;
  }

  if (platform === 'facebook') {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer');
    return true;
  }

  if (platform === 'twitter') {
    const twText = encodeURIComponent(`Check out ${pName} on SWEETOS!`);
    const twUrl = `https://twitter.com/intent/tweet?text=${twText}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twUrl, '_blank', 'noopener,noreferrer');
    return true;
  }

  // 3. Fallback: Copy link to clipboard
  try {
    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Product link & details copied to clipboard! 📋' }));
    return true;
  } catch (e) {
    window.dispatchEvent(new CustomEvent('toast:show', { detail: `Product Link: ${shareUrl}` }));
    return false;
  }
}
