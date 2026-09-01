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
        const productsList = JSON.parse(body);
        const filePath = path.join(__dirname, 'data', 'products.js');
        const fileContent = `const products = ${JSON.stringify(productsList, null, 2)};\n\nexport default products;\n`;
        
        fs.writeFile(filePath, fileContent, 'utf8', (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to write products to disk' }));
          } else {
            broadcastAlert('products', 'Product catalog updated.');
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

  // 2. API: GET /api/products (Load products directly from disk)
  if (req.method === 'GET' && req.url === '/api/products') {
    const filePath = path.join(__dirname, 'data', 'products.js');
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read products file' }));
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
        res.end(JSON.stringify({ error: 'Invalid products structure on server' }));
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

  // 2h. API: GET /api/share or /share (Dynamic Open Graph Preview)
  if (req.method === 'GET' && (reqUrl.pathname === '/api/share' || reqUrl.pathname === '/share')) {
    try {
      const productId = parseInt(reqUrl.searchParams.get('product') || reqUrl.searchParams.get('id') || reqUrl.searchParams.get('p') || '1');
      const productsPath = path.join(__dirname, 'data', 'products.js');
      fs.readFile(productsPath, 'utf8', (err, content) => {
        let rawProduct = null;
        if (!err && content) {
          const startIdx = content.indexOf('[');
          const endIdx = content.lastIndexOf(']');
          if (startIdx !== -1 && endIdx !== -1) {
            try {
              const list = JSON.parse(content.substring(startIdx, endIdx + 1));
              rawProduct = list.find(p => p.id === productId) || list[0];
            } catch (e) {}
          }
        }

        if (!rawProduct) {
          rawProduct = { id: productId, name: 'SWEETOS Product', price: 0, image: '/assets/sweetos_logo.svg' };
        }

        const host = req.headers.host || 'localhost:8080';
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const baseUrl = `${protocol}://${host}`;

        let imageUrl = rawProduct.image || '';
        if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.startsWith('data:image/')) {
          const encodedName = encodeURIComponent(rawProduct.name || 'SWEETOS Product');
          imageUrl = `https://placehold.co/1200x630/0052cc/FFFFFF.png?text=${encodedName}`;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = `${baseUrl}${imageUrl}`;
        } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
          imageUrl = `${baseUrl}/${imageUrl}`;
        }

        const priceText = rawProduct.price ? `${rawProduct.price.toLocaleString('fr-FR')} FCFA` : '';
        const targetUrl = `${baseUrl}/#/?product=${rawProduct.id}`;
        const shareUrl = `${baseUrl}/api/share?product=${rawProduct.id}`;
        const desc = `${rawProduct.name}. ${priceText}. High-tech & workspace gear available on SWEETOS.`;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${rawProduct.name} - ${priceText} | SWEETOS</title>
  <meta name="description" content="${desc}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="SWEETOS">
  <meta property="og:title" content="${rawProduct.name} - ${priceText} | SWEETOS">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:url" content="${shareUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${rawProduct.name} - ${priceText} | SWEETOS">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta http-equiv="refresh" content="0;url=${targetUrl}">
</head>
<body>
  <p>Redirection vers <a href="${targetUrl}">${rawProduct.name}</a>...</p>
</body>
</html>`);
      });
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server Error');
    }
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
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
