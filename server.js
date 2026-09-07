const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

let clients = [];

function broadcastAlert(type, message) {
  const data = JSON.stringify({ type, message });
  clients.forEach(c => {
    try {
      c.response.write(`data: ${data}\n\n`);
    } catch (e) {
      // Remove stale client
      clients = clients.filter(client => client.id !== c.id);
    }
  });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const SUPABASE_URL = 'https://euuzsxjsmsktegilbqpv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1dXpzeGpzbXNrdGVnaWxicXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzIyMzcsImV4cCI6MjEwMzQwODIzN30.BJtkw4BBkAytc5vDSr8a0dOmUyGk_1xfpdHK3sEHwHs';

let productsCache = null;
let lastProductsFetch = 0;

function fetchSupabaseProducts() {
  return new Promise((resolve) => {
    if (productsCache && (Date.now() - lastProductsFetch < 60000)) {
      return resolve(productsCache);
    }
    
    const reqUrl = `${SUPABASE_URL}/rest/v1/products?select=*`;
    const options = {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    };
    
    const https = require('https');
    https.get(reqUrl, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const list = JSON.parse(data);
            if (Array.isArray(list) && list.length > 0) {
              productsCache = list;
              lastProductsFetch = Date.now();
              return resolve(productsCache);
            }
          }
        } catch(e) {}
        resolve(productsCache || []);
      });
    }).on('error', (err) => {
      console.error('[Server] Failed to fetch Supabase products:', err);
      resolve(productsCache || []);
    });
  });
}

async function findProductById(rawId) {
  const products = await fetchSupabaseProducts();
  if (!products || products.length === 0) return null;
  
  const searchStr = String(rawId || '').trim().toLowerCase();
  if (!searchStr) return products[0];

  let found = products.find(p => 
    String(p.legacy_id) === searchStr || 
    String(p.id) === searchStr ||
    (p.slug && String(p.slug).toLowerCase() === searchStr)
  );

  if (!found && !isNaN(parseInt(searchStr))) {
    const numId = parseInt(searchStr);
    found = products.find(p => p.legacy_id === numId || p.id === numId);
  }

  return found || products[0];
}

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // WhatsApp Webhook GET Verification (Meta Dashboard)
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && (reqUrl.pathname === '/webhook/whatsapp' || reqUrl.pathname === '/api/webhook/whatsapp' || reqUrl.pathname === '/webhook/whatsapp.php')) {
    const VERIFY_TOKEN = 'sweeto@256';
    const mode = reqUrl.searchParams.get('hub.mode') || reqUrl.searchParams.get('hub_mode');
    const token = reqUrl.searchParams.get('hub.verify_token') || reqUrl.searchParams.get('hub_verify_token');
    const challenge = reqUrl.searchParams.get('hub.challenge') || reqUrl.searchParams.get('hub_challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ [WhatsApp Webhook] Meta subscription verified successfully!');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(String(challenge || ''));
      return;
    }
    
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // WhatsApp Webhook POST (Incoming Event Notifications)
  if (req.method === 'POST' && (reqUrl.pathname === '/webhook/whatsapp' || reqUrl.pathname === '/api/webhook/whatsapp' || reqUrl.pathname === '/webhook/whatsapp.php')) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      console.log('📩 [WhatsApp Webhook Payload Received]:', body);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('EVENT_RECEIVED');
    });
    return;
  }

  // 1. API: POST /api/products (Save products permanently to disk)
  if (req.method === 'POST' && req.url === '/api/products') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        broadcastAlert('products', 'Product catalog updated.');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // 2. API: GET /api/products (Load products directly from disk or return empty list)
  if (req.method === 'GET' && req.url === '/api/products') {
    const filePath = path.join(__dirname, 'data', 'products.js');
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }
      
      const startIdx = content.indexOf('[');
      const endIdx = content.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = content.substring(startIdx, endIdx + 1);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(jsonStr);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      }
    });
    return;
  }

  // 1b. API: POST /api/categories
  if (req.method === 'POST' && req.url === '/api/categories') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const list = JSON.parse(body);
        const filePath = path.join(__dirname, 'data', 'categories.js');
        const fileContent = `const categories = ${JSON.stringify(list, null, 2)};\n\nexport default categories;\n`;
        fs.writeFile(filePath, fileContent, 'utf8', (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to write categories to disk' }));
          } else {
            broadcastAlert('categories', 'Categories list updated.');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          }
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // 2b. API: GET /api/categories
  if (req.method === 'GET' && req.url === '/api/categories') {
    const filePath = path.join(__dirname, 'data', 'categories.js');
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read categories file' }));
        return;
      }
      const startIdx = content.indexOf('[');
      const endIdx = content.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = content.substring(startIdx, endIdx + 1);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(jsonStr);
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid categories structure on server' }));
      }
    });
    return;
  }

  // 1c. API: POST /api/brands
  if (req.method === 'POST' && req.url === '/api/brands') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const list = JSON.parse(body);
        const filePath = path.join(__dirname, 'data', 'brands.js');
        const fileContent = `const brands = ${JSON.stringify(list, null, 2)};\n\nexport default brands;\n`;
        fs.writeFile(filePath, fileContent, 'utf8', (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to write brands to disk' }));
          } else {
            broadcastAlert('brands', 'Brands list updated.');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          }
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // 2c. API: GET /api/brands
  if (req.method === 'GET' && req.url === '/api/brands') {
    const filePath = path.join(__dirname, 'data', 'brands.js');
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read brands file' }));
        return;
      }
      const startIdx = content.indexOf('[');
      const endIdx = content.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = content.substring(startIdx, endIdx + 1);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(jsonStr);
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid brands structure on server' }));
      }
    });
    return;
  }

  // 1d. API: POST /api/reviews
  if (req.method === 'POST' && req.url === '/api/reviews') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const list = JSON.parse(body);
        const filePath = path.join(__dirname, 'data', 'reviews.js');
        const fileContent = `const reviews = ${JSON.stringify(list, null, 2)};\n\nexport default reviews;\n`;
        fs.writeFile(filePath, fileContent, 'utf8', (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to write reviews to disk' }));
          } else {
            broadcastAlert('reviews', 'Product reviews updated.');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          }
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // 2d. API: GET /api/reviews
  if (req.method === 'GET' && req.url === '/api/reviews') {
    const filePath = path.join(__dirname, 'data', 'reviews.js');
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read reviews file' }));
        return;
      }
      const startIdx = content.indexOf('[');
      const endIdx = content.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = content.substring(startIdx, endIdx + 1);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(jsonStr);
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid reviews structure on server' }));
      }
    });
    return;
  }

  // 1e. SSE connection stream
  if (req.method === 'GET' && req.url === '/api/live-alerts') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    // Register client
    const clientId = Date.now();
    clients.push({ id: clientId, response: res });
    
    req.on('close', () => {
      clients = clients.filter(c => c.id !== clientId);
    });
    return;
  }

  // 1f. API: POST /api/orders
  if (req.method === 'POST' && req.url === '/api/orders') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const list = JSON.parse(body);
        const filePath = path.join(__dirname, 'data', 'orders.js');
        const fileContent = `const orders = ${JSON.stringify(list, null, 2)};\n\nexport default orders;\n`;
        fs.writeFile(filePath, fileContent, 'utf8', (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to write orders to disk' }));
          } else {
            broadcastAlert('orders', 'New order received!');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          }
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // 2f. API: GET /api/orders
  if (req.method === 'GET' && req.url === '/api/orders') {
    const filePath = path.join(__dirname, 'data', 'orders.js');
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read orders file' }));
        return;
      }
      const startIdx = content.indexOf('[');
      const endIdx = content.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = content.substring(startIdx, endIdx + 1);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(jsonStr);
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid orders structure on server' }));
      }
    });
    return;
  }

  // 1g. API: POST /api/broadcast-alert
  if (req.method === 'POST' && req.url === '/api/broadcast-alert') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { type, message } = payload;
        broadcastAlert(type || 'orders', message || 'Database updated');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // 1h. API: POST /api/coupons
  if (req.method === 'POST' && req.url === '/api/coupons') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const list = JSON.parse(body);
        const filePath = path.join(__dirname, 'data', 'coupons.js');
        const fileContent = `const coupons = ${JSON.stringify(list, null, 2)};\n\nexport default coupons;\n`;
        fs.writeFile(filePath, fileContent, 'utf8', (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to write coupons to disk' }));
          } else {
            broadcastAlert('coupons', 'Coupons database updated.');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          }
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // 2g. API: GET /api/coupons
  if (req.method === 'GET' && req.url === '/api/coupons') {
    const filePath = path.join(__dirname, 'data', 'coupons.js');
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read coupons file' }));
        return;
      }
      const startIdx = content.indexOf('[');
      const endIdx = content.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = content.substring(startIdx, endIdx + 1);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(jsonStr);
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid coupons structure on server' }));
      }
    });
    return;
  }

  // 2h. API: GET /api/product-image or /product-image (Binary image endpoint)
  if (req.method === 'GET' && (reqUrl.pathname === '/api/product-image' || reqUrl.pathname === '/product-image')) {
    (async () => {
      try {
        const paramId = reqUrl.searchParams.get('id') || reqUrl.searchParams.get('product') || reqUrl.searchParams.get('p') || '1';
        const rawProduct = await findProductById(paramId);

        if (rawProduct && rawProduct.image && typeof rawProduct.image === 'string') {
          const imgStr = rawProduct.image.trim();
          if (imgStr.startsWith('http://') || imgStr.startsWith('https://')) {
            res.writeHead(302, { 'Location': imgStr });
            res.end();
            return;
          }
          if (imgStr.startsWith('data:image/')) {
            const parts = imgStr.split(',');
            const meta = parts[0];
            const base64Data = parts[1];
            let mimeType = 'image/jpeg';
            if (meta.includes('image/png')) mimeType = 'image/png';
            else if (meta.includes('image/webp')) mimeType = 'image/webp';

            const imgBuffer = Buffer.from(base64Data, 'base64');
            res.writeHead(200, {
              'Content-Type': mimeType,
              'Content-Length': imgBuffer.length,
              'Cache-Control': 'public, max-age=86400'
            });
            res.end(imgBuffer);
            return;
          }
        }

        const fallbackPath = path.join(__dirname, 'assets', 'sweetos_share.jpg');
        fs.readFile(fallbackPath, (err, data) => {
          if (!err && data) {
            res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' });
            res.end(data);
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Image Not Found');
          }
        });
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      }
    })();
    return;
  }

  // 2i. API: GET /api/share or /share (Dynamic Open Graph Preview)
  if (req.method === 'GET' && (reqUrl.pathname === '/api/share' || reqUrl.pathname === '/share')) {
    (async () => {
      try {
        const paramId = reqUrl.searchParams.get('product') || reqUrl.searchParams.get('id') || reqUrl.searchParams.get('p') || '1';
        const rawProduct = await findProductById(paramId);

        const host = req.headers.host || 'www.sweeto.store';
        let protocol = req.headers['x-forwarded-proto'] || 'https';
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
          protocol = 'http';
        } else {
          protocol = 'https';
        }
        const baseUrl = `${protocol}://${host}`;

        let imageUrl = `${baseUrl}/assets/sweetos_share.jpg`;
        let imageType = 'image/jpeg';

        if (rawProduct && rawProduct.image && typeof rawProduct.image === 'string') {
          const imgStr = rawProduct.image.trim();
          if (imgStr.startsWith('http://') || imgStr.startsWith('https://')) {
            imageUrl = imgStr.replace(/^http:\/\//i, 'https://');
            if (imageUrl.includes('.png')) imageType = 'image/png';
            else if (imageUrl.includes('.webp')) imageType = 'image/webp';
            else imageType = 'image/jpeg';
          } else if (imgStr.startsWith('data:image/')) {
            const targetId = rawProduct.legacy_id || rawProduct.id;
            imageUrl = `${baseUrl}/api/product-image?id=${targetId}`;
            if (imgStr.includes('image/png')) imageType = 'image/png';
            else if (imgStr.includes('image/webp')) imageType = 'image/webp';
            else imageType = 'image/jpeg';
          } else if (imgStr.startsWith('/')) {
            imageUrl = `${baseUrl}${imgStr}`;
          }
        }

        const prodName = rawProduct ? (rawProduct.name || 'Produit SWEETOS') : 'SWEETOS Product';
        const prodPrice = rawProduct && rawProduct.price ? `${Number(rawProduct.price).toLocaleString()} FCFA` : '';
        const titleText = prodPrice ? `${prodName} - ${prodPrice} | SWEETOS` : `${prodName} | SWEETOS`;
        const descText = rawProduct && rawProduct.description ? 
          (rawProduct.description.length > 160 ? rawProduct.description.substring(0, 157) + '...' : rawProduct.description) :
          `${prodName} disponible sur SWEETOS. Matériel high-tech & accessoires.`;

        const targetId = rawProduct ? (rawProduct.legacy_id || rawProduct.id) : paramId;
        const targetUrl = `${baseUrl}/#/?product=${targetId}`;
        const shareUrl = `${baseUrl}/api/share?product=${targetId}`;

        res.writeHead(200, { 
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });

        res.end(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleText}</title>
  <meta name="description" content="${descText}">
  
  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="SWEETOS">
  <meta property="og:title" content="${titleText}">
  <meta property="og:description" content="${descText}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:type" content="${imageType}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${shareUrl}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${titleText}">
  <meta name="twitter:description" content="${descText}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <script>
    if (!/bot|facebookexternalhit|whatsapp|twitterbot|telegrambot|slackbot|discordbot|linkedinbot|embedly/i.test(navigator.userAgent)) {
      window.location.replace("${targetUrl}");
    }
  </script>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box;">
  <div style="text-align: center; max-width: 480px; width: 100%; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
    <div style="font-size: 36px; margin-bottom: 12px;">🛍️</div>
    <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #f8fafc;">${prodName}</h2>
    <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #38bdf8;">${prodPrice}</p>
    <p style="font-size: 14px; opacity: 0.7; margin-bottom: 24px;">Redirection vers l'application SWEETOS...</p>
    <a href="${targetUrl}" style="display: inline-block; background: #0052cc; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 30px; font-weight: 700; font-size: 14px;">Ouvrir dans SWEETOS</a>
  </div>
</body>
</html>`);
      } catch (e) {
        console.error('[Server] Share endpoint error:', e);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      }
    })();
    return;
  }

  // 3. Static File Server with SPA Fallback
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  
  // Automatically strip timestamp suffixes (e.g. _1786...) to prevent 404s
  if (filePath.includes('assets') && filePath.includes('_')) {
    const ext = path.extname(filePath);
    const baseWithoutExt = filePath.substring(0, filePath.lastIndexOf('_'));
    const fallbackPath = baseWithoutExt + ext;
    if (fs.existsSync(fallbackPath)) {
      filePath = fallbackPath;
    }
  }

  let ext = path.extname(filePath);

  // If request has no extension (routing path e.g. /terms or /auth), fallback to index.html
  if (!ext) {
    filePath = path.join(__dirname, 'index.html');
    ext = '.html';
  }

  fs.exists(filePath, (exists) => {
    if (!exists) {
      // If it's a specific static file request with extension, 404 it. Otherwise redirect to index.html
      if (path.extname(req.url)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
      filePath = path.join(__dirname, 'index.html');
      ext = '.html';
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      } else {
        const headers = {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream'
        };
        if (ext === '.html' || ext === '.js' || ext === '.css') {
          headers['Cache-Control'] = 'no-cache, must-revalidate';
        }
        res.writeHead(200, headers);
        res.end(data);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
