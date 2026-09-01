// api/share.js - Serverless Function for WhatsApp/Social OG Cards & Full Styled Product View
import products from '../data/products.js';

function getImageUrl(product, baseUrl) {
  if (!product) return `${baseUrl}/assets/sweetos_logo.svg`;

  const img = product.image;

  // 1. WhatsApp & Facebook crawlers CANNOT parse Base64 Data URIs (data:image/...)
  // Fallback to high-res dynamic placeholder with product title
  if (!img || typeof img !== 'string' || img.startsWith('data:image/')) {
    const encodedName = encodeURIComponent(product.name || 'SWEETOS Product');
    return `https://placehold.co/1200x630/0052cc/FFFFFF.png?text=${encodedName}`;
  }

  // 2. Already absolute HTTP/HTTPS URL
  if (img.startsWith('http://') || img.startsWith('https://')) {
    return img;
  }

  // 3. Absolute path on root domain (e.g. /images/products/hp.jpg)
  if (img.startsWith('/')) {
    return `${baseUrl}${img}`;
  }

  // 4. Relative path starting with ./
  if (img.startsWith('.')) {
    return `${baseUrl}${img.substring(1)}`;
  }

  return `${baseUrl}/${img}`;
}

export default async function handler(req, res) {
  const { product: productIdQuery, p: pQuery, id: idQuery } = req.query || {};
  const productId = parseInt(productIdQuery || pQuery || idQuery || '1');

  // Fetch matching product or fallback to first product
  const product = products.find(item => item.id === productId) || products[0];

  const siteName = 'SWEETOS';
  const rawHost = req.headers['x-forwarded-host'] || req.headers.host || 'www.sweeto.store';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${protocol}://${rawHost}`;

  const priceFormatted = product.price ? `${product.price.toLocaleString('fr-FR')} FCFA` : '';
  const title = `${product.name} - ${priceFormatted} | ${siteName}`;
  const brand = product.brand || 'SWEETOS';
  const category = product.category || 'High-Tech';
  const stockText = (product.stock !== undefined && product.stock > 0) 
    ? `En Stock (${product.stock} unités disponibles)` 
    : 'En Stock - Stock Limité';

  const description = `${product.name} par ${brand}. ${category} de haute précision. ${priceFormatted}. ${stockText}. Commandez directement sur ${siteName}!`;

  // Get robust absolute image URL for WhatsApp, Facebook & Twitter link preview crawlers
  const imageUrl = getImageUrl(product, baseUrl);

  const directPdpUrl = `${baseUrl}/?product=${product.id}`;
  const sharePageUrl = `${baseUrl}/api/share?product=${product.id}`;

  const userAgent = req.headers['user-agent'] || '';
  const isBot = /facebookexternalhit|WhatsApp|Twitterbot|Pinterest|LinkedInBot|TelegramBot|Slackbot|vkShare|Outbrain|W3C_Validator/i.test(userAgent);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">

  <!-- Open Graph / WhatsApp / Facebook Link Preview Meta Tags -->
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="${siteName}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${sharePageUrl}">
  
  <meta property="product:price:amount" content="${product.price || 0}">
  <meta property="product:price:currency" content="XOF">

  <!-- Twitter Large Image Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@600;700;800&display=swap" rel="stylesheet">

  <style>
    :root {
      --primary: #0052cc;
      --primary-dark: #0747a6;
      --text-dark: #0f172a;
      --text-muted: #64748b;
      --bg: #f8fafc;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      color: var(--text-dark);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .store-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
      text-decoration: none;
    }
    .store-logo {
      width: 36px;
      height: 36px;
      background: var(--primary);
      color: white;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Poppins', sans-serif;
      font-weight: 800;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(0,82,204,0.25);
    }
    .store-name {
      font-family: 'Poppins', sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: var(--text-dark);
      letter-spacing: -0.5px;
    }
    .product-card {
      background: #ffffff;
      border: 1px solid rgba(226, 232, 240, 0.8);
      border-radius: 24px;
      max-width: 480px;
      width: 100%;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
      transition: transform 0.3s ease;
    }
    .product-image-container {
      width: 100%;
      height: 320px;
      background: #f8fafc;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .product-image-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }
    .badge-stock {
      position: absolute;
      top: 16px;
      left: 16px;
      background: rgba(34, 197, 94, 0.95);
      color: white;
      font-size: 11px;
      font-weight: 800;
      padding: 6px 12px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .product-body {
      padding: 28px;
    }
    .meta-row {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    }
    .pill {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--primary);
      background: rgba(0, 82, 204, 0.08);
      padding: 4px 10px;
      border-radius: 8px;
      text-transform: uppercase;
    }
    .product-title {
      font-size: 22px;
      font-weight: 850;
      color: var(--text-dark);
      margin-bottom: 8px;
      line-height: 1.3;
    }
    .product-price {
      font-size: 26px;
      font-weight: 900;
      color: var(--primary);
      margin-bottom: 14px;
    }
    .product-desc {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .cta-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      background: linear-gradient(135deg, #0052cc 0%, #0066ff 100%);
      color: white;
      text-decoration: none;
      font-weight: 800;
      font-size: 15px;
      padding: 16px 24px;
      border-radius: 16px;
      box-shadow: 0 8px 20px rgba(0, 82, 204, 0.3);
      transition: all 0.2s ease;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(0, 82, 204, 0.4);
    }
    .footer-note {
      margin-top: 20px;
      font-size: 12.5px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>

  <a href="${directPdpUrl}" class="store-header">
    <div class="store-logo">SW</div>
    <span class="store-name">SWEETOS</span>
  </a>

  <div class="product-card">
    <div class="product-image-container">
      <img src="${imageUrl}" alt="${product.name}">
      <span class="badge-stock">⚡ ${stockText}</span>
    </div>

    <div class="product-body">
      <div class="meta-row">
        <span class="pill">${brand}</span>
        <span class="pill">${category}</span>
      </div>

      <h1 class="product-title">${product.name}</h1>
      <div class="product-price">${priceFormatted}</div>

      <p class="product-desc">${description}</p>

      <a href="${directPdpUrl}" class="cta-button">
        <span>⚡ Commandez sur SWEETOS</span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
      </a>
    </div>
  </div>

  <p class="footer-note">Livraison rapide • Paiement sécurisé • SWEETOS © 2026</p>

  ${!isBot ? `
  <script>
    // Automatic redirection for real human browsers to the interactive SPA
    setTimeout(function() {
      if (window.location.search.includes('no_redirect')) return;
      window.location.href = "${directPdpUrl}";
    }, 2500);
  </script>
  ` : ''}
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
  return res.status(200).send(html);
}
