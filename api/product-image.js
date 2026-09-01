// api/product-image.js - Serves dynamic binary product images for Open Graph previews
import productsList from '../data/products.js';

export default function handler(req, res) {
  const { id: idQuery, product: prodQuery, p: pQuery } = req.query || {};
  const productId = parseInt(idQuery || prodQuery || pQuery || '2');

  const rawProduct = productsList.find(item => item.id === productId) || productsList[0];

  if (!rawProduct || !rawProduct.image) {
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(404).send('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="100%" height="100%" fill="#0052cc"/><text x="50%" y="50%" fill="#fff" font-size="48" font-family="sans-serif" text-anchor="middle">SWEETOS Store</text></svg>');
  }

  const imageSrc = rawProduct.image;

  // 1. If base64 data URI (data:image/jpeg;base64,... or data:image/png;base64,...)
  if (typeof imageSrc === 'string' && imageSrc.startsWith('data:image/')) {
    try {
      const parts = imageSrc.split(',');
      const meta = parts[0];
      const base64Data = parts[1];

      let mimeType = 'image/jpeg';
      if (meta.includes('image/png')) mimeType = 'image/png';
      else if (meta.includes('image/webp')) mimeType = 'image/webp';
      else if (meta.includes('image/svg+xml')) mimeType = 'image/svg+xml';

      const imgBuffer = Buffer.from(base64Data, 'base64');

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', imgBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
      return res.status(200).send(imgBuffer);
    } catch (e) {
      console.error('[product-image] Failed to decode base64 image:', e);
    }
  }

  // 2. If HTTP/HTTPS URL
  if (typeof imageSrc === 'string' && (imageSrc.startsWith('http://') || imageSrc.startsWith('https://'))) {
    return res.redirect(302, imageSrc);
  }

  // 3. Fallback placeholder
  const encodedName = encodeURIComponent(rawProduct.name || 'SWEETOS Product');
  return res.redirect(302, `https://placehold.co/1200x630/0052cc/FFFFFF.png?text=${encodedName}`);
}
