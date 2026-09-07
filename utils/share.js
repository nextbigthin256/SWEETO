/**
 * Helper: Format Price
 */
export function formatPrice(price) {
  if (!price && price !== 0) return '0 FCFA';
  return `${Number(price).toLocaleString()} FCFA`;
}

/**
 * Helper: Update or create a meta tag in document.head
 */
export function updateMetaTag(property, content) {
  if (!content) return;
  
  const isTwitter = property.startsWith('twitter:');
  const selector = isTwitter ? `meta[name="${property}"]` : `meta[property="${property}"]`;
  let meta = document.querySelector(selector);
  if (!meta) {
    meta = document.createElement('meta');
    if (isTwitter) {
      meta.setAttribute('name', property);
    } else {
      meta.setAttribute('property', property);
    }
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

/**
 * Helper: Update canonical URL
 */
export function updateCanonicalUrl(url) {
  if (!url) return;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

/**
 * Update meta tags for product sharing (WhatsApp, Facebook, Twitter/X, etc.)
 * @param {Object} product - The product object
 */
export function updateProductShareMetaTags(product) {
  if (!product) return;

  // Get product image - use first image or fallback
  const productImage = product.image || 
                       (product.images && product.images.length > 0 ? product.images[0] : null) ||
                       `${window.location.origin}/assets/sweetos_share.jpg`;
  
  // Format price
  const formattedPrice = formatPrice(product.price);
  
  // Generate share title
  const shareTitle = `${product.name} - ${formattedPrice} | SWEETOS`;
  
  // Generate share description
  const shareDescription = product.shortDesc || 
                           product.description || 
                           `${product.name} disponible sur SWEETOS. Prix: ${formattedPrice}`;
  
  // Generate share URL (Point to server API endpoint for WhatsApp crawler preview)
  const productId = product.legacy_id ?? product.id ?? product.uuid;
  const shareUrl = `${window.location.origin}/api/share?product=${encodeURIComponent(productId)}`;
  const appUrl = `${window.location.origin}/#/?product=${encodeURIComponent(productId)}`;

  // Update Open Graph (Facebook, WhatsApp, LinkedIn)
  updateMetaTag('og:title', shareTitle);
  updateMetaTag('og:description', shareDescription);
  updateMetaTag('og:image', productImage);
  updateMetaTag('og:image:secure_url', productImage);
  updateMetaTag('og:url', shareUrl);
  updateMetaTag('og:type', 'website');
  if (product.price) {
    updateMetaTag('og:price:amount', product.price);
    updateMetaTag('og:price:currency', 'XOF');
  }

  // Update Twitter Card
  updateMetaTag('twitter:card', 'summary_large_image');
  updateMetaTag('twitter:title', shareTitle);
  updateMetaTag('twitter:description', shareDescription);
  updateMetaTag('twitter:image', productImage);

  // Update page title
  document.title = `${product.name} - SWEETOS`;

  // Update canonical URL
  updateCanonicalUrl(appUrl);

  console.log('✅ [Share] Meta tags updated for:', product.name);
}

/**
 * Social Sharing Handlers
 */
export function shareOnWhatsApp(text, url) {
  const fullText = (text ? text + '\n\n' : '') + url;
  window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, '_blank');
}

export function shareOnFacebook(url) {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=500');
}

export function shareOnTwitter(text, url) {
  const fullText = (text ? text + ' ' : '') + url;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`, '_blank', 'width=600,height=500');
}

export async function copyShareLink(url) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: '📋 Lien copié dans le presse-papier!' }));
      return true;
    }
  } catch (e) {
    // Fallback
  }
  const textArea = document.createElement('textarea');
  textArea.value = url;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  textArea.remove();
  window.dispatchEvent(new CustomEvent('toast:show', { detail: '📋 Lien copié dans le presse-papier!' }));
  return true;
}

/**
 * Generate share buttons HTML for product page or modal
 */
export function getProductShareButtons(product) {
  if (!product) return '';
  
  const productId = product.legacy_id ?? product.id ?? product.uuid;
  const shareUrl = `${window.location.origin}/api/share?product=${encodeURIComponent(productId)}`;
  const shareText = `🛒 ${product.name}\n💰 ${formatPrice(product.price)}\n\n${product.shortDesc || product.description || ''}\n\nAcheter sur SWEETOS!`;
  
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl);
  
  return `
    <div class="share-buttons-container" style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap; align-items:center;">
      <!-- WhatsApp -->
      <button class="social-share-btn share-wa-btn" data-url="${shareUrl}" data-text="${encodedText}"
              style="display:flex; align-items:center; gap:8px; background:#25D366; color:white; border:none; padding:9px 16px; border-radius:30px; font-weight:750; font-size:12.5px; cursor:pointer; transition: transform 0.2s;" title="Partager sur WhatsApp">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.022-.08-.124-.184-.282-.232-.078-.024-.464-.232-.536-.252-.072-.02-.124-.03-.178.05-.054.082-.21.26-.258.312-.048.052-.096.06-.178.02a1.866 1.866 0 0 1-.502-.308c-.287-.25-.482-.56-.538-.65-.056-.092-.006-.142.04-.188.04-.04.096-.11.144-.168.048-.058.064-.1.096-.168.032-.068.016-.128-.008-.178-.024-.05-.178-.436-.244-.594-.064-.158-.13-.136-.178-.138-.046-.002-.098-.002-.15-.002a.287.287 0 0 0-.208.098c-.072.078-.276.27-.276.658 0 .388.282.764.32.816.04.052.556.85 1.348 1.192.188.082.336.13.45.166.19.06.362.052.498.032.152-.022.464-.19.53-.374.066-.184.066-.342.046-.374-.022-.03-.078-.05-.156-.088zm-5.467 1.162a6.3 6.3 0 0 1-3.237-.893l-.233-.14-2.404.63 2.443-2.38-.152-.243a6.262 6.262 0 0 1-.958-3.326c0-3.468 2.82-6.29 6.29-6.29 3.47 0 6.29 2.822 6.29 6.29 0 3.47-2.82 6.29-6.29 6.29zm0-13.82c-4.148 0-7.527 3.38-7.527 7.527 0 1.326.347 2.62 1.006 3.766L4 19.5l4.636-1.216a7.487 7.487 0 0 0 3.37.804c4.148 0 7.527-3.378 7.527-7.527 0-4.15-3.38-7.527-7.527-7.527z"/></svg>
        WhatsApp
      </button>
      
      <!-- Facebook -->
      <button class="social-share-btn share-fb-btn" data-url="${encodedUrl}"
              style="display:flex; align-items:center; gap:8px; background:#1877F2; color:white; border:none; padding:9px 16px; border-radius:30px; font-weight:750; font-size:12.5px; cursor:pointer; transition: transform 0.2s;" title="Partager sur Facebook">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        Facebook
      </button>
      
      <!-- Twitter / X -->
      <button class="social-share-btn share-tw-btn" data-url="${encodedUrl}" data-text="${encodedText}"
              style="display:flex; align-items:center; gap:8px; background:#000000; color:white; border:none; padding:9px 16px; border-radius:30px; font-weight:750; font-size:12.5px; cursor:pointer; transition: transform 0.2s;" title="Partager sur X">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        Twitter/X
      </button>
      
      <!-- Copy Link -->
      <button class="social-share-btn share-copy-btn" data-url="${shareUrl}"
              style="display:flex; align-items:center; gap:8px; background:#64748b; color:white; border:none; padding:9px 16px; border-radius:30px; font-weight:750; font-size:12.5px; cursor:pointer; transition: transform 0.2s;" title="Copier le lien">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        Copier
      </button>
    </div>
  `;
}

/**
 * Primary Product Share Function
 */
export async function shareProduct(product) {
  if (!product) return false;

  // 1. Update Open Graph & Twitter meta tags for rich social card previews
  updateProductShareMetaTags(product);

  const productId = product.legacy_id ?? product.id ?? product.uuid;
  const shareUrl = `${window.location.origin}/api/share?product=${encodeURIComponent(productId)}`;
  const formattedPrice = formatPrice(product.price);
  const shareText = `🛒 ${product.name}\n💰 ${formattedPrice}\n\n${product.shortDesc || product.description || ''}\n\nAcheter sur SWEETOS!`;

  const shareData = {
    title: `${product.name} - ${formattedPrice} | SWEETOS`,
    text: shareText,
    url: shareUrl
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return true;
    }
  } catch (error) {
    if (error?.name === 'AbortError') return false;
    console.warn('[Share] Web Share API failed or cancelled:', error);
  }

  // Fallback to copying link
  await copyShareLink(shareUrl);
  return true;
}
