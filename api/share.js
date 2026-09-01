// api/share.js - Dynamic WhatsApp & Open Graph Link Previews for SWEETOS Store
import productsList from '../data/products.js';

export default function handler(req, res) {
  // ✅ Accept 'product' or 'id' or 'p' parameter from URL (?product=2, ?id=2)
  const { product: productIdQuery, id: idQuery, p: pQuery } = req.query || {};
  const productId = parseInt(productIdQuery || idQuery || pQuery || '2');

  // Find product from database or fallback to first product
  const rawProduct = productsList.find(item => item.id === productId) || productsList[0];

  if (!rawProduct) {
    return res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head><title>Produit Non Trouvé | SWEETOS</title></head>
      <body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#f8fafc;color:#0f172a">
        <div style="text-align:center;background:white;padding:40px;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.05)">
          <h1 style="font-size:24px;margin-bottom:12px">😕 Produit Non Trouvé</h1>
          <p style="color:#64748b;margin-bottom:20px">Le produit demandé n'existe pas ou a été retiré.</p>
          <a href="https://www.sweeto.store/" style="color:#0052cc;font-weight:bold;text-decoration:none">Retour à l'accueil →</a>
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
  
  const product = {
    name: rawProduct.name,
    price: priceFormatted,
    desc: `${rawProduct.name} par ${brand}. ${category} de haute précision. ${priceFormatted}. ${stockInfo}. Livraison disponible.`,
    image: rawProduct.image
  };

  // ===== IMAGE HANDLING (Must be valid absolute HTTPS JPG/PNG URL) =====
  let imageUrl = product.image;
  const baseUrl = 'https://www.sweeto.store';

  if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.startsWith('data:image/')) {
    const encodedName = encodeURIComponent(product.name || 'SWEETOS Product');
    imageUrl = `https://placehold.co/1200x630/0052cc/FFFFFF.png?text=${encodedName}`;
  } else if (imageUrl.startsWith('/')) {
    imageUrl = `${baseUrl}${imageUrl}`;
  } else if (imageUrl.startsWith('.')) {
    imageUrl = `${baseUrl}${imageUrl.substring(1)}`;
  } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    imageUrl = `${baseUrl}/images/products/${imageUrl}`;
  }

  if (imageUrl.startsWith('http://')) {
    imageUrl = imageUrl.replace('http://', 'https://');
  }

  const targetUrl = `https://www.sweeto.store/?product=${rawProduct.id}`;
  const shareUrl = `https://www.sweeto.store/api/share?product=${rawProduct.id}`;

  // RETURN PRE-RENDERED HTML WITH DYNAMIC OG TAGS
  // Bots read THIS exact HTML - no JavaScript execution needed
  res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- ✅ DYNAMIC TITLE FOR BOTS -->
  <title>${product.name} - ${product.price} | SWEETOS</title>
  <meta name="description" content="${product.desc}">
  
  <!-- ✅ OPEN GRAPH / WHATSAPP PREVIEW TAGS -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="SWEETOS">
  <meta property="og:title" content="${product.name} - ${product.price} | SWEETOS">
  <meta property="og:description" content="${product.desc}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${shareUrl}">
  <meta property="og:locale" content="fr_CI">
  
  <!-- ✅ TWITTER CARD -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${product.name} - ${product.price} | SWEETOS">
  <meta name="twitter:description" content="${product.desc}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- ✅ INSTANT REDIRECT FOR HUMANS -->
  <meta http-equiv="refresh" content="0;url=${targetUrl}">
  <link rel="canonical" href="${targetUrl}">
  
  <!-- Loading Styles (Only visible if redirect fails) -->
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
    <p style="margin:0 0 12px 0;color:#64748b;font-size:14px">Redirection vers ${product.name}...</p>
    <p style="margin:0;font-size:12px;color:#94a3b8">Si vous n'êtes pas redirigé, <a href="${targetUrl}">cliquez ici</a>.</p>
  </div>
</body>
</html>`);
}
