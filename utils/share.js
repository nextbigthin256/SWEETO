export async function shareProduct(product) {
  if (!product) return false;

  const productId = product.id ?? product.uuid;
  const productUrl = `${window.location.origin}${window.location.pathname}#/product/${encodeURIComponent(productId)}`;
  const shareData = {
    title: product.name || 'SWEETOS Product',
    text: product.name ? `Discover ${product.name} on SWEETOS` : 'Discover this product on SWEETOS',
    url: productUrl
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return true;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(productUrl);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Product link copied!' }));
      return true;
    }
  } catch (error) {
    if (error?.name === 'AbortError') return false;
    console.error('[Share] Failed to share product:', error);
  }

  return false;
}
