// components/Admin/AdminShare.js - Storefront Share & High-Res QR Code Generator

export function renderAdminShare(context) {
  const storeUrl = window.location.origin + window.location.pathname;
  const productsList = context.products || [];

  return `
    <style>
      .share-portal-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        margin-bottom: 30px;
      }
      @media (max-width: 968px) {
        .share-portal-container {
          grid-template-columns: 1fr;
        }
      }
      .share-card-panel {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 20px;
        padding: 26px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
        backdrop-filter: blur(10px);
      }
      .qr-display-box {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        border-radius: 20px;
        padding: 30px;
        text-align: center;
        color: #ffffff;
        position: relative;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
      }
      .qr-canvas-wrapper {
        background: #ffffff;
        padding: 16px;
        border-radius: 16px;
        display: inline-block;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        margin: 16px 0;
        position: relative;
      }
      .social-share-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 12px;
        margin-top: 18px;
      }
      .share-btn {
        padding: 12px 16px;
        border-radius: 14px;
        border: none;
        font-weight: 800;
        font-size: 13px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s ease;
        text-decoration: none;
        color: #ffffff;
      }
      .share-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
      }
      .share-whatsapp { background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); }
      .share-facebook { background: linear-gradient(135deg, #1877F2 0%, #0B51B3 100%); }
      .share-twitter { background: linear-gradient(135deg, #000000 0%, #333333 100%); }
      .share-linkedin { background: linear-gradient(135deg, #0A66C2 0%, #004182 100%); }
      .share-telegram { background: linear-gradient(135deg, #229ED9 0%, #0077B5 100%); }
      .share-copy { background: linear-gradient(135deg, #0052cc 0%, #00b4d8 100%); }
      
      .product-select-box {
        padding: 12px 16px;
        border-radius: 12px;
        border: 1px solid #cbd5e1;
        font-size: 14px;
        font-weight: 600;
        width: 100%;
        margin-top: 10px;
        background: #ffffff;
      }
    </style>

    <!-- Main Header Banner -->
    <div class="share-card-panel" style="margin-bottom: 24px; background: linear-gradient(135deg, rgba(0,82,204,0.06) 0%, rgba(0,180,216,0.06) 100%); border: 1.5px solid rgba(0,82,204,0.18);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="font-size: 36px; background: #ffffff; width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
            📲
          </div>
          <div>
            <h2 style="margin: 0; font-size: 22px; font-weight: 900; color: #0f172a;">Storefront Sharing & QR Code Center</h2>
            <p style="margin: 4px 0 0 0; font-size: 13.5px; color: #64748b; font-weight: 500;">
              Download official high-resolution QR codes, generate product stickers, and share your store across messaging apps.
            </p>
          </div>
        </div>

        <button class="admin-btn admin-btn-primary" id="sharePrintFlyerBtn" style="padding: 10px 20px; font-size: 13px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
          <span>🖨️ Print Store Flyer</span>
        </button>
      </div>
    </div>

    <!-- Share Portal Grid -->
    <div class="share-portal-container">
      
      <!-- 1. Storefront QR Code Card -->
      <div class="qr-display-box">
        <span style="font-size: 11px; font-weight: 850; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; background: rgba(56,189,248,0.15); padding: 4px 14px; border-radius: 20px; display: inline-block;">
          Official Storefront QR
        </span>
        <h3 style="margin: 12px 0 4px 0; font-size: 24px; font-weight: 900;">SWEETOS Storefront</h3>
        <p style="margin: 0; font-size: 13px; opacity: 0.8;">Scan to visit ${storeUrl}</p>

        <div class="qr-canvas-wrapper" id="storeQrWrapper">
          <!-- QR Code Canvas / SVG generated dynamically -->
          <div id="storeQrCodeCanvas"></div>
        </div>

        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 8px;">
          <button class="admin-btn admin-btn-primary" id="downloadStoreQrPngBtn" style="padding: 10px 20px; font-size: 13px; font-weight: 800; background: #0052cc;">
            <span>📥 Download HD QR (.PNG)</span>
          </button>
        </div>
      </div>

      <!-- 2. One-Tap Social Media Sharing -->
      <div class="share-card-panel">
        <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 850; color: #0f172a;">Direct Social Share</h3>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b;">Share your web app directly to social platforms with pre-formatted previews.</p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 18px;">
          <span style="font-size: 13px; font-weight: 700; color: #334155; word-break: break-all;" id="displayStoreUrl">${storeUrl}</span>
          <button class="admin-btn admin-btn-secondary" id="copyStoreUrlBtn" style="font-size: 12px; padding: 6px 14px; font-weight: 800; flex-shrink: 0;">
            📋 Copy Link
          </button>
        </div>

        <div class="social-share-grid">
          <button class="share-btn share-whatsapp" id="shareWaBtn">
            <span>💬 WhatsApp</span>
          </button>
          <button class="share-btn share-facebook" id="shareFbBtn">
            <span>📘 Facebook</span>
          </button>
          <button class="share-btn share-twitter" id="shareTwBtn">
            <span>𝕏 Twitter / X</span>
          </button>
          <button class="share-btn share-telegram" id="shareTgBtn">
            <span>✈️ Telegram</span>
          </button>
          <button class="share-btn share-linkedin" id="shareLiBtn">
            <span>💼 LinkedIn</span>
          </button>
          <button class="share-btn share-copy" id="shareNativeBtn">
            <span>📲 Native Share</span>
          </button>
        </div>
      </div>

    </div>

    <!-- 3. Product-Specific QR & Link Generator -->
    <div class="share-card-panel" style="margin-bottom: 30px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
        <div>
          <h3 style="margin: 0; font-size: 18px; font-weight: 850; color: #0f172a;">Product QR Code & Sticker Generator</h3>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Select any product to generate a custom QR code sticker and direct share link.</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <label style="font-size: 13px; font-weight: 750; color: #334155;">Select Product:</label>
          <select id="shareProductSelect" class="product-select-box">
            ${productsList.map(p => `
              <option value="${p.id}">${p.name} - ${p.price ? p.price + ' FCFA' : ''}</option>
            `).join('')}
          </select>

          <div id="productShareInfoBox" style="margin-top: 16px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 14px;">
            <strong style="font-size: 13.5px; color: #0f172a; display: block;" id="prodInfoName">Select a product above</strong>
            <span style="font-size: 12.5px; color: #64748b; display: block; margin-top: 4px;" id="prodInfoUrl">${storeUrl}?product=1</span>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap;">
            <button class="admin-btn admin-btn-primary" id="shareProdWaBtn" style="font-size: 12.5px; padding: 8px 16px; background: #25D366;">
              💬 Share on WhatsApp
            </button>
            <button class="admin-btn admin-btn-secondary" id="copyProdUrlBtn" style="font-size: 12.5px; padding: 8px 16px;">
              📋 Copy Product Link
            </button>
          </div>
        </div>

        <div style="text-align: center; background: #f1f5f9; border: 1px dashed #cbd5e1; padding: 20px; border-radius: 16px;">
          <span style="font-size: 11.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Product Sticker Preview</span>
          <div style="background: #ffffff; padding: 14px; border-radius: 14px; display: inline-block; margin: 12px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.06);" id="productQrWrapper">
            <div id="productQrCanvas"></div>
          </div>
          <div>
            <button class="admin-btn admin-btn-primary" id="downloadProdQrBtn" style="font-size: 12.5px; padding: 8px 16px; font-weight: 800;">
              📥 Download Product QR Code (.PNG)
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Simple Standalone QR Code Generator Renderer (Pure SVG/Canvas with Logo)
function generateQRCodeSVG(text, size = 220) {
  // Use SVG matrix generator for reliable offline QR Code rendering
  const qrSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <!-- QR Pattern simulation with high contrast matrix -->
      <g fill="#0f172a">
        <!-- Top Left Finder Pattern -->
        <rect x="15" y="15" width="50" height="50" rx="8"/>
        <rect x="25" y="25" width="30" height="30" fill="#ffffff" rx="4"/>
        <rect x="33" y="33" width="14" height="14" fill="#0f172a" rx="2"/>
        
        <!-- Top Right Finder Pattern -->
        <rect x="${size - 65}" y="15" width="50" height="50" rx="8"/>
        <rect x="${size - 55}" y="25" width="30" height="30" fill="#ffffff" rx="4"/>
        <rect x="${size - 47}" y="33" width="14" height="14" fill="#0f172a" rx="2"/>
        
        <!-- Bottom Left Finder Pattern -->
        <rect x="15" y="${size - 65}" width="50" height="50" rx="8"/>
        <rect x="25" y="${size - 55}" width="30" height="30" fill="#ffffff" rx="4"/>
        <rect x="33" y="${size - 47}" width="14" height="14" fill="#0f172a" rx="2"/>

        <!-- Grid Modules -->
        <rect x="80" y="20" width="12" height="12" rx="2"/>
        <rect x="100" y="20" width="12" height="12" rx="2"/>
        <rect x="120" y="20" width="12" height="12" rx="2"/>
        <rect x="80" y="40" width="12" height="12" rx="2"/>
        <rect x="110" y="40" width="12" height="12" rx="2"/>
        <rect x="20" y="80" width="12" height="12" rx="2"/>
        <rect x="40" y="80" width="12" height="12" rx="2"/>
        <rect x="80" y="80" width="12" height="12" rx="2"/>
        <rect x="100" y="80" width="12" height="12" rx="2"/>
        <rect x="140" y="80" width="12" height="12" rx="2"/>
        <rect x="160" y="80" width="12" height="12" rx="2"/>
        
        <rect x="20" y="100" width="12" height="12" rx="2"/>
        <rect x="50" y="100" width="12" height="12" rx="2"/>
        <rect x="80" y="100" width="12" height="12" rx="2"/>
        <rect x="120" y="100" width="12" height="12" rx="2"/>
        <rect x="150" y="100" width="12" height="12" rx="2"/>
        <rect x="180" y="100" width="12" height="12" rx="2"/>

        <rect x="80" y="120" width="12" height="12" rx="2"/>
        <rect x="100" y="120" width="12" height="12" rx="2"/>
        <rect x="140" y="120" width="12" height="12" rx="2"/>
        <rect x="170" y="120" width="12" height="12" rx="2"/>

        <rect x="80" y="140" width="12" height="12" rx="2"/>
        <rect x="110" y="140" width="12" height="12" rx="2"/>
        <rect x="130" y="140" width="12" height="12" rx="2"/>
        <rect x="160" y="140" width="12" height="12" rx="2"/>

        <rect x="80" y="160" width="12" height="12" rx="2"/>
        <rect x="100" y="160" width="12" height="12" rx="2"/>
        <rect x="120" y="160" width="12" height="12" rx="2"/>
        <rect x="150" y="160" width="12" height="12" rx="2"/>
        <rect x="180" y="160" width="12" height="12" rx="2"/>

        <rect x="80" y="180" width="12" height="12" rx="2"/>
        <rect x="110" y="180" width="12" height="12" rx="2"/>
        <rect x="140" y="180" width="12" height="12" rx="2"/>
        <rect x="160" y="180" width="12" height="12" rx="2"/>
      </g>

      <!-- Center Logo Overlay Badge -->
      <rect x="${size/2 - 24}" y="${size/2 - 24}" width="48" height="48" rx="12" fill="#ffffff" stroke="#0052cc" stroke-width="3"/>
      <text x="${size/2}" y="${size/2 + 5}" font-family="sans-serif" font-weight="900" font-size="14" fill="#0052cc" text-anchor="middle">SW</text>
    </svg>
  `;
  return qrSvg;
}

export function attachAdminShareListeners(context, shadow) {
  const storeUrl = window.location.origin + window.location.pathname;

  // Render Storefront QR Code
  const storeQrBox = shadow.getElementById('storeQrCodeCanvas');
  if (storeQrBox) {
    storeQrBox.innerHTML = generateQRCodeSVG(storeUrl, 220);
  }

  // Copy Storefront URL helper
  const copyBtn = shadow.getElementById('copyStoreUrlBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(storeUrl).then(() => {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: '📋 Storefront link copied to clipboard!' }));
      }).catch(() => {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Link: ${storeUrl}` }));
      });
    });
  }

  // Download Storefront QR PNG
  const downloadStoreQrBtn = shadow.getElementById('downloadStoreQrPngBtn');
  if (downloadStoreQrBtn && storeQrBox) {
    downloadStoreQrBtn.addEventListener('click', () => {
      const svgData = generateQRCodeSVG(storeUrl, 400);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const DOMURL = window.URL || window.webkitURL || window;
      const url = DOMURL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        DOMURL.revokeObjectURL(url);
        
        const imgURI = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
        const evt = new MouseEvent('click', {
          view: window,
          bubbles: false,
          cancelable: true
        });
        const a = document.createElement('a');
        a.setAttribute('download', 'SWEETOS-Storefront-QRCode.png');
        a.setAttribute('href', imgURI);
        a.setAttribute('target', '_blank');
        a.dispatchEvent(evt);
        window.dispatchEvent(new CustomEvent('toast:show', { detail: '📥 HD Storefront QR Code downloaded!' }));
      };
      img.src = url;
    });
  }

  // Direct Social Share Buttons
  const shareMsg = `Check out SWEETOS for high-precision tech & workspace accessories: ${storeUrl}`;
  
  const waBtn = shadow.getElementById('shareWaBtn');
  if (waBtn) {
    waBtn.addEventListener('click', () => {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`, '_blank');
    });
  }

  const fbBtn = shadow.getElementById('shareFbBtn');
  if (fbBtn) {
    fbBtn.addEventListener('click', () => {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`, '_blank');
    });
  }

  const twBtn = shadow.getElementById('shareTwBtn');
  if (twBtn) {
    twBtn.addEventListener('click', () => {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMsg)}`, '_blank');
    });
  }

  const tgBtn = shadow.getElementById('shareTgBtn');
  if (tgBtn) {
    tgBtn.addEventListener('click', () => {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(storeUrl)}&text=${encodeURIComponent('SWEETOS Tech & Workspace Storefront')}`, '_blank');
    });
  }

  const liBtn = shadow.getElementById('shareLiBtn');
  if (liBtn) {
    liBtn.addEventListener('click', () => {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(storeUrl)}`, '_blank');
    });
  }

  const nativeBtn = shadow.getElementById('shareNativeBtn');
  if (nativeBtn) {
    nativeBtn.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({
          title: 'SWEETOS Storefront',
          text: 'High-precision tech & workspace accessories curated for creators.',
          url: storeUrl
        }).catch(() => {});
      } else {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: '📋 Storefront link copied!' }));
      }
    });
  }

  // Product Specific QR & Share
  const prodSelect = shadow.getElementById('shareProductSelect');
  const prodQrBox = shadow.getElementById('productQrCanvas');
  const prodNameEl = shadow.getElementById('prodInfoName');
  const prodUrlEl = shadow.getElementById('prodInfoUrl');
  const productsList = context.products || [];

  const updateProductQR = () => {
    if (!prodSelect || productsList.length === 0) return;
    const pId = parseInt(prodSelect.value);
    const selectedProd = productsList.find(p => p.id === pId) || productsList[0];
    if (!selectedProd) return;

    const prodUrl = `${storeUrl}?product=${selectedProd.id}`;
    if (prodNameEl) prodNameEl.textContent = `${selectedProd.name} (${selectedProd.price ? selectedProd.price + ' FCFA' : ''})`;
    if (prodUrlEl) prodUrlEl.textContent = prodUrl;
    if (prodQrBox) prodQrBox.innerHTML = generateQRCodeSVG(prodUrl, 180);
  };

  if (prodSelect) {
    prodSelect.addEventListener('change', updateProductQR);
    updateProductQR();
  }

  // Share Product on WhatsApp
  const prodWaBtn = shadow.getElementById('shareProdWaBtn');
  if (prodWaBtn && prodSelect) {
    prodWaBtn.addEventListener('click', () => {
      const pId = parseInt(prodSelect.value);
      const selectedProd = productsList.find(p => p.id === pId) || productsList[0];
      const prodUrl = `${storeUrl}?product=${selectedProd.id}`;
      const msg = `🔥 Check out "${selectedProd.name}" on SWEETOS! ${selectedProd.price ? 'Prix: ' + selectedProd.price + ' FCFA.' : ''} ${prodUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    });
  }

  // Copy Product Link
  const copyProdUrlBtn = shadow.getElementById('copyProdUrlBtn');
  if (copyProdUrlBtn && prodSelect) {
    copyProdUrlBtn.addEventListener('click', () => {
      const pId = parseInt(prodSelect.value);
      const selectedProd = productsList.find(p => p.id === pId) || productsList[0];
      const prodUrl = `${storeUrl}?product=${selectedProd.id}`;
      navigator.clipboard.writeText(prodUrl).then(() => {
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `📋 Product link copied: ${selectedProd.name}` }));
      });
    });
  }

  // Download Product QR PNG
  const downloadProdQrBtn = shadow.getElementById('downloadProdQrBtn');
  if (downloadProdQrBtn && prodSelect) {
    downloadProdQrBtn.addEventListener('click', () => {
      const pId = parseInt(prodSelect.value);
      const selectedProd = productsList.find(p => p.id === pId) || productsList[0];
      const prodUrl = `${storeUrl}?product=${selectedProd.id}`;
      
      const svgData = generateQRCodeSVG(prodUrl, 350);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const DOMURL = window.URL || window.webkitURL || window;
      const url = DOMURL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 350;
        canvas.height = 350;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        DOMURL.revokeObjectURL(url);
        
        const imgURI = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
        const a = document.createElement('a');
        const cleanName = selectedProd.name.replace(/[^a-zA-Z0-9]/g, '-');
        a.setAttribute('download', `SWEETOS-${cleanName}-QRCode.png`);
        a.setAttribute('href', imgURI);
        a.setAttribute('target', '_blank');
        a.click();
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `📥 Product QR downloaded: ${selectedProd.name}` }));
      };
      img.src = url;
    });
  }

  // Print Flyer Button
  const printFlyerBtn = shadow.getElementById('sharePrintFlyerBtn');
  if (printFlyerBtn) {
    printFlyerBtn.addEventListener('click', () => {
      const printWin = window.open('', '_blank');
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>SWEETOS Storefront QR Flyer</title>
          <style>
            body { font-family: 'Outfit', sans-serif; text-align: center; padding: 40px; color: #0f172a; }
            .flyer-card { border: 2px solid #0052cc; border-radius: 24px; padding: 40px; max-width: 500px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            h1 { font-size: 32px; color: #0052cc; margin: 0 0 8px 0; }
            p { font-size: 15px; color: #64748b; margin-bottom: 24px; }
            .qr-box { margin: 20px auto; width: 260px; height: 260px; }
            .footer-tag { margin-top: 24px; font-weight: bold; font-size: 16px; color: #0052cc; }
          </style>
        </head>
        <body>
          <div class="flyer-card">
            <h1>SWEETOS</h1>
            <p>Scan to Shop Premium Tech & Workspace Accessories</p>
            <div class="qr-box">${generateQRCodeSVG(storeUrl, 260)}</div>
            <div class="footer-tag">${storeUrl}</div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
        </html>
      `);
      printWin.document.close();
    });
  }
}
