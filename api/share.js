// api/share.js - Dynamic WhatsApp & Open Graph Link Previews for SWEETOS Store
import productsList from '../data/products.js';

export default function handler(req, res) {
  const { product: productIdQuery, id: idQuery, p: pQuery } = req.query || {};
  const productId = parseInt(productIdQuery || idQuery || pQuery || '2');

  const rawProduct = productsList.find(item => item.id === productId) || productsList[0];

  if (!rawProduct) {
    return res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head><title>Produit Non Trouvé | SWEETOS</title></head>
      <body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#f8fafc;color:#0f172a">
        <div style="text-align:center;background:white;padding:40px;border-radius:20px;">
          <h1>😕 Produit Non Trouvé</h1>
          <p>Le produit demandé n'existe pas ou a été retiré.</p>
          <a href="https://www.sweeto.store/">Retour à l'accueil →</a>
        </div>
      </body>
      </html>
    `);
  }

  // Format price & text details
  const priceFormatted = rawProduct.price ? `${rawProduct.price.toLocaleString('fr-FR')} FCFA` : '';
  const brand = rawProduct.brand || 'SWEETOS';
  const category = rawProduct.category || 'High-Tech';
  const stockInfo = (rawProduct.stock !== undefined && rawProduct.stock > 0) 
    ? `En Stock (${rawProduct.stock} unités)` 
    : 'En Stock';
  
  const productTitle = `${rawProduct.name} - ${priceFormatted} | SWEETOS`;
  const productDesc = `${rawProduct.name} par ${brand}. ${category} de haute précision. ${priceFormatted}. ${stockInfo}. Commandez directement sur SWEETOS.`;

  // Host & Protocol
  const host = req.headers.host || 'www.sweeto.store';
  const protocol = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const baseUrl = `${protocol}://${host}`;

  // Direct binary image URL for Open Graph crawlers (WhatsApp, Facebook, Twitter)
  const imageUrl = `${baseUrl}/api/product-image?id=${rawProduct.id}`;
  let imageType = 'image/jpeg';
  if (rawProduct.image && typeof rawProduct.image === 'string') {
    if (rawProduct.image.includes('image/png')) imageType = 'image/png';
    else if (rawProduct.image.includes('image/webp')) imageType = 'image/webp';
  }

  const targetUrl = `${baseUrl}/#/?product=${rawProduct.id}`;
  const shareUrl = `${baseUrl}/api/share?product=${rawProduct.id}`;

  // Detect social media web crawlers / bots
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const isBot = /bot|facebookexternalhit|whatsapp|twitterbot|telegrambot|slackbot|discordbot|linkedinbot|embedly|quora link preview|showyouhave|outbrain|pinterest/i.test(userAgent);

  // RETURN PRE-RENDERED HTML WITH DYNAMIC OG TAGS
  // Bots read THIS exact HTML - no JavaScript execution needed
  res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- DYNAMIC TITLE & DESCRIPTION -->
  <title>${productTitle}</title>
  <meta name="description" content="${productDesc}">
  
  <!-- OPEN GRAPH / WHATSAPP / FACEBOOK PREVIEW TAGS -->
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="SWEETOS">
  <meta property="og:title" content="${productTitle}">
  <meta property="og:description" content="${productDesc}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:type" content="${imageType}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${shareUrl}">
  <meta property="og:locale" content="fr_CI">
  ${rawProduct.price ? `<meta property="product:price:amount" content="${rawProduct.price}">
  <meta property="product:price:currency" content="XOF">` : ''}
  
  <!-- TWITTER CARD -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${productTitle}">
  <meta name="twitter:description" content="${productDesc}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <link rel="canonical" href="${targetUrl}">

  ${!isBot ? `
  <!-- INSTANT REDIRECT FOR HUMAN VISITORS ONLY -->
  <script>
    window.location.replace("${targetUrl}");
  </script>
  <meta http-equiv="refresh" content="0;url=${targetUrl}">
  ` : ''}
  
  <!-- Loading Styles -->
  <style>
    body{font-family:'Inter',-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f8fafc;color:#0f172a}
    .loader{text-align:center;padding:2rem;background:white;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.05)}
    .spinner{width:44px;height:44px;border:4px solid #e2e8f0;border-top-color:#0052cc;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 1rem}
    @keyframes spin{to{transform:rotate(360deg)}}
    a{color:#0052cc;font-weight:600;text-decoration:none}
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <h3 style="margin:0 0 8px 0;font-size:18px">SWEETOS Store</h3>
    <p style="margin:0 0 12px 0;color:#64748b;font-size:14px">Redirection vers ${rawProduct.name}...</p>
    <p style="margin:0;font-size:12px;color:#94a3b8">Si vous n'êtes pas redirigé, <a href="${targetUrl}">cliquez ici</a>.</p>
  </div>
</body>
</html>`);
}
