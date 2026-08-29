// utils/cssLoader.js
// Ultra-fast CSS loading using Constructable Stylesheets (CSSStyleSheet & adoptedStyleSheets)

const styleCache = new Map();

/**
 * Creates or retrieves a cached CSSStyleSheet for the given CSS text.
 * @param {string} cssText 
 * @returns {CSSStyleSheet}
 */
export function createStylesheet(cssText) {
  if (styleCache.has(cssText)) {
    return styleCache.get(cssText);
  }
  
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    styleCache.set(cssText, sheet);
    return sheet;
  } catch (e) {
    return null;
  }
}

/**
 * Applies CSS to a ShadowRoot using Constructable Stylesheets.
 * @param {ShadowRoot} shadowRoot 
 * @param {string} cssText 
 */
export function applyStyles(shadowRoot, cssText) {
  const sheet = createStylesheet(cssText);
  if (!sheet) {
    applyStylesFallback(shadowRoot, cssText);
    return;
  }
  
  if (!shadowRoot.adoptedStyleSheets.includes(sheet)) {
    shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, sheet];
  }
}

/**
 * Fallback for legacy browsers without adoptedStyleSheets support.
 * @param {ShadowRoot} shadowRoot 
 * @param {string} cssText 
 */
export function applyStylesFallback(shadowRoot, cssText) {
  const styleId = 'component-style-' + (cssText.length + cssText.slice(0, 20).replace(/[^a-zA-Z0-9]/g, ''));
  
  if (!shadowRoot.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = cssText;
    shadowRoot.appendChild(style);
  }
}

/**
 * Main entry point to load styles into a Web Component ShadowRoot instantly.
 * @param {ShadowRoot} shadowRoot 
 * @param {string} cssText 
 */
export function loadStyles(shadowRoot, cssText) {
  if ('adoptedStyleSheets' in Document.prototype || 'adoptedStyleSheets' in ShadowRoot.prototype) {
    applyStyles(shadowRoot, cssText);
  } else {
    applyStylesFallback(shadowRoot, cssText);
  }
}
