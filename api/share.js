// File: api/share.js
// Vercel Serverless Function: Open Graph (OG) Product Share Gateway for WhatsApp, Facebook, iMessage & Twitter
import initialProducts from '../data/products.js';

const SUPABASE_URL = 'https://euuzsxjsmsktegilbqpv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1dXpzeGpzbXNrdGVnaWxicXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzIyMzcsImV4cCI6MjEwMzQwODIzN30.BJtkw4BBkAytc5vDSr8a0dOmUyGk_1xfpdHK3sEHwHs';
const APP_URL = 'https://www.sweeto.store';

function formatPrice(price) {
  if (price === null || price === undefined || isNaN(Number(price))) return '';
  return `${Number(price).toLocaleString('fr-FR')} FCFA`;
}

export default async function handler(req, res) {
  try {
    const productId = req.query.product || req.query.id;

    if (!productId) {
      return res.redirect(302, APP_URL);
    }

    let product = null;

    // 1. Query Supabase REST API for product by legacy_id or id or slug
    try {
      const isNum = !isNaN(Number(productId));
      const filter = isNum ? `or=(legacy_id.eq.${productId},id.eq.${productId})` : `or=(slug.eq.${productId},id.eq.${productId})`;
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/products?${filter}&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          product = {
            id: item.legacy_id || item.id,
            name: item.name,
            price: item.price,
            originalPrice: item.original_price,
            image: item.image,
            brand: item.brand_name || item.brand,
            category: item.category_name || item.category,
            description: item.description || ''
          };
        }
      }
    } catch (e) {}

    // 2. Query site_settings fallback if product not found in products table
    if (!product) {
      try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?key=eq.sweetos_cloud_products&select=value`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data) && data[0]?.value && Array.isArray(data[0].value)) {
            const found = data[0].value.find(p => String(p.id) === String(productId) || String(p.legacy_id) === String(productId) || String(p.slug) === String(productId));
            if (found) product = found;
          }
        }
      } catch (e) {}
    }

    // 3. Fallback to local catalog (data/products.js)
    if (!product && Array.isArray(initialProducts)) {
      const localMatch = initialProducts.find(p => 
        String(p.id) === String(productId) || 
        String(p.legacy_id) === String(productId) || 
        String(p.uuid) === String(productId) || 
        String(p.slug) === String(productId)
      );
      if (localMatch) {
        product = {
          id: localMatch.legacy_id || localMatch.id,
          name: localMatch.name,
          price: localMatch.price,
          originalPrice: localMatch.originalPrice,
          image: localMatch.image,
          brand: localMatch.brand,
          category: localMatch.category,
          description: localMatch.description || ''
        };
      }
    }

    // 4. Fallback to URL query parameters (for newly added admin products)
    if (!product && (req.query.title || req.query.name || req.query.image)) {
      product = {
        id: productId,
        name: req.query.title || req.query.name || 'Produit SWEETOS',
        price: req.query.price ? Number(req.query.price) : null,
        image: req.query.image || '',
        brand: req.query.brand || 'SWEETOS',
        category: req.query.category || '',
        description: req.query.desc || ''
      };
    }

    const defaultStoreLogo = `${APP_URL}/assets/sweetos_share.jpg`;

    // 5. Minimal safe default (NO FAKE MOCK IMAGES OR ZERO PRICES)
    if (!product) {
      product = {
        id: productId,
        name: 'SWEETOS Store',
        price: null,
        image: defaultStoreLogo,
        brand: 'SWEETOS',
        category: '',
        description: 'Découvrez nos produits sur SWEETOS Store.'
      };
    }

    const userAgent = req.headers['user-agent'] || '';
    const isCrawler = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Googlebot|bingbot/i.test(userAgent);

    const realProductPageUrl = `${APP_URL}/#/?product=${encodeURIComponent(productId)}`;

    // For Human Users: Redirect 302 to real product modal in SPA
    if (!isCrawler) {
      return res.redirect(302, realProductPageUrl);
    }

    // For Crawler Bots (WhatsApp, Facebook, Twitter): Return static Open Graph HTML
    const priceFormatted = formatPrice(product.price);
    const titleText = priceFormatted ? `${product.name} — ${priceFormatted} | SWEETOS` : `${product.name} | SWEETOS`;

    let ogDescription = priceFormatted ? `${priceFormatted}` : '';
    if (product.brand) ogDescription += ogDescription ? ` • ${product.brand}` : product.brand;
    if (product.category) ogDescription += ` — ${product.category}`;
    if (product.description) ogDescription += ogDescription ? `. ${product.description.slice(0, 150)}` : product.description.slice(0, 150);

    let imageUrl = product.image || defaultStoreLogo;
    if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      imageUrl = `${APP_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }

    const shareUrl = `${APP_URL}/api/share?product=${encodeURIComponent(productId)}`;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${titleText}</title>

  <!-- Open Graph / WhatsApp Preview Tags -->
  <meta property="og:title" content="${titleText}">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${shareUrl}">
  <meta property="og:type" content="product">
  ${product.price ? `<meta property="product:price:amount" content="${product.price}">
  <meta property="product:price:currency" content="XOF">` : ''}
  <meta property="og:site_name" content="SWEETOS">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${titleText}">
  <meta name="twitter:description" content="${ogDescription}">
  <meta name="twitter:image" content="${imageUrl}">
</head>
<body>
  <h1>${product.name}</h1>
  ${priceFormatted ? `<p>${priceFormatted}</p>` : ''}
  <img src="${imageUrl}" alt="${product.name}">
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(html);
  } catch (err) {
    console.error('[API Share Error]:', err);
    return res.redirect(302, APP_URL);
  }
}

