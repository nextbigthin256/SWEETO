// api/share.js - Vercel Serverless Function for Dynamic WhatsApp & Social Media Open Graph Link Previews
import products from '../data/products.js';

export default async function handler(req, res) {
  const { product: productIdQuery, p: pQuery, id: idQuery } = req.query || {};
  const productId = parseInt(productIdQuery || pQuery || idQuery || '1');

  // Find product in catalog
  const product = products.find(item => item.id === productId) || products[0];

  const siteName = 'SWEETOS';
  const rawHost = req.headers['x-forwarded-host'] || req.headers.host || 'www.sweeto.store';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${protocol}://${rawHost}`;

  const priceText = product.price ? `${product.price.toLocaleString('fr-FR')} FCFA` : '';
  const title = `${product.name} - ${priceText} | ${siteName}`;
  const brand = product.brand || 'SWEETOS';
  const category = product.category || 'High-Tech';
  const description = `${product.name} par ${brand}. ${category} de haute précision. Prix: ${priceText}. En Stock! Commandez dès aujourd'hui sur ${siteName}.`;

  // Absolute image URL for WhatsApp & Facebook crawlers
  let imageUrl = product.image || `${baseUrl}/assets/sweetos_logo.svg`;
  if (imageUrl.startsWith('.')) {
    imageUrl = `${baseUrl}${imageUrl.substring(1)}`;
  } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    imageUrl = `${baseUrl}/${imageUrl}`;
  }

  const targetPdpUrl = `${baseUrl}/?product=${product.id}`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}">

  <!-- Open Graph / WhatsApp / Facebook Link Preview Meta Tags -->
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="${siteName}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${targetPdpUrl}">
  
  <meta property="product:price:amount" content="${product.price || 0}">
  <meta property="product:price:currency" content="XOF">

  <!-- Twitter Large Image Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">

  <!-- Fast Client Redirection for Human Visitors -->
  <meta http-equiv="refresh" content="0;url=${targetPdpUrl}">
</head>
<body style="font-family: system-ui, sans-serif; text-align: center; padding: 40px; color: #0f172a;">
  <h2>${product.name}</h2>
  <p>Prix: <strong>${priceText}</strong></p>
  <p>Redirection vers la page du produit... <a href="${targetPdpUrl}">Cliquez ici</a></p>
  <script>window.location.href = "${targetPdpUrl}";</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
  return res.status(200).send(html);
}
