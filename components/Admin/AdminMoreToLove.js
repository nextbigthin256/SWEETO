/**
 * components/Admin/AdminMoreToLove.js
 * Studio Admin for the "More to Love" homepage recommendations section:
 * - ON / OFF Switch
 * - Custom Title & Subtitle
 * - Multi-Product Selector with Live Search, Filters & Quick Presets
 * - Re-ordering & Slot Management
 * - Live Preview
 */

import { formatPrice } from '../../utils/storage.js';
import { getMoreToLoveConfig, saveMoreToLoveConfig, DEFAULT_MORE_TO_LOVE_CONFIG } from '../../utils/moreToLove.js';

let activeCategoryFilter = 'All';
let searchQuery = '';

export function renderAdminMoreToLove(context) {
  const config = getMoreToLoveConfig();
  const allProducts = context.products || [];
  const selectedIds = config.productIds || [];
  const selectedIdSet = new Set(selectedIds);

  const productMap = new Map(allProducts.map(p => [p.id, p]));
  const selectedProducts = selectedIds.map(id => productMap.get(id)).filter(Boolean);

  // Extract unique categories for filter pills
  const categories = ['All', ...Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)))];

  // Filter available products
  const filteredProducts = allProducts.filter(p => {
    if (activeCategoryFilter !== 'All' && p.category !== activeCategoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchCat = (p.category || '').toLowerCase().includes(q);
      const matchBrand = (p.brand || '').toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchBrand) return false;
    }
    return true;
  });

  return `
    <div class="admin-tab-pane animate-in" style="display: flex; flex-direction: column; gap: 24px;">
      
      <!-- 1. Master Control Header Card -->
      <div class="admin-card" style="padding: 22px 26px; border-radius: 20px; background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98)); border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 18px; box-shadow: 0 4px 18px rgba(0,0,0,0.03);">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="width: 52px; height: 52px; border-radius: 16px; background: ${config.enabled ? 'linear-gradient(135deg, #ec4899, #db2777)' : 'linear-gradient(135deg, #94a3b8, #64748b)'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 4px 14px ${config.enabled ? 'rgba(236,72,153,0.35)' : 'rgba(148,163,184,0.35)'};">
            💖
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 900; color: var(--text-dark);">Section "More to Love"</h2>
              <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 850; background: ${config.enabled ? '#fdf2f8; color: #db2777; border: 1px solid #fbcfe8;' : '#f1f5f9; color: #64748b; border: 1px solid #e2e8f0;'}">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${config.enabled ? '#ec4899' : '#94a3b8'};"></span>
                ${config.enabled ? 'SECTION ACTIVÉE (ON)' : 'SECTION DÉSACTIVÉE (OFF)'}
              </span>
            </div>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-gray);">Choisissez exactement les produits et l'ordre d'affichage qui apparaîtront dans la section More to Love</p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <button id="more-love-toggle-btn" style="padding: 12px 22px; border-radius: 14px; font-size: 13.5px; font-weight: 850; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; border: none; background: ${config.enabled ? '#ef4444' : '#10b981'}; color: white; box-shadow: 0 4px 14px ${config.enabled ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'};">
            <span>${config.enabled ? '🔴 DÉSACTIVER (OFF)' : '🟢 ACTIVER (ON)'}</span>
          </button>
          <button id="more-love-save-top-btn" class="admin-btn admin-btn-primary" style="padding: 12px 24px; border-radius: 14px; font-size: 13.5px; font-weight: 850;">
            💾 Sauvegarder
          </button>
        </div>
      </div>

      <!-- 2. Section Details (Title & Subtitle) -->
      <div class="admin-card" style="padding: 22px 26px; border-radius: 20px; background: white; border: 1.5px solid var(--border);">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 850; color: var(--text-dark); display: flex; align-items: center; gap: 8px;">
          <span>✏️</span> Titres & Personnalisation de l'En-tête
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px;">
          <div class="form-group">
            <label style="font-size: 12.5px; font-weight: 750; color: var(--text-dark); margin-bottom: 6px; display: block;">Titre de la Section *</label>
            <input type="text" id="more-love-title-input" name="more_love_title_no_autofill" value="${config.title || 'More to Love'}" placeholder="Ex: More to Love" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none" style="width: 100%; padding: 12px 14px; border-radius: 12px; border: 1.5px solid var(--border); font-size: 14px; font-weight: 700;">
          </div>
          <div class="form-group">
            <label style="font-size: 12.5px; font-weight: 750; color: var(--text-dark); margin-bottom: 6px; display: block;">Sous-titre / Description</label>
            <input type="text" id="more-love-subtitle-input" name="more_love_subtitle_no_autofill" value="${config.subtitle || ''}" placeholder="Ex: Recommandations sélectionnées pour vous" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none" style="width: 100%; padding: 12px 14px; border-radius: 12px; border: 1.5px solid var(--border); font-size: 14px;">
          </div>
        </div>
      </div>

      <!-- 3. Selected Products Slots & Preview -->
      <div class="admin-card" style="padding: 22px 26px; border-radius: 20px; background: white; border: 1.5px solid var(--border);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 18px;">
          <div>
            <h3 style="margin: 0; font-size: 16.5px; font-weight: 850; color: var(--text-dark); display: flex; align-items: center; gap: 8px;">
              <span>🛍️</span> Produits Actuellement Affichés (${selectedProducts.length})
            </h3>
            <p style="margin: 3px 0 0 0; font-size: 12.5px; color: var(--text-gray);">Glissez ou utilisez les flèches pour changer l'ordre d'affichage dans le store</p>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button id="more-love-clear-all-btn" style="padding: 8px 14px; border-radius: 10px; font-size: 12px; font-weight: 800; color: #ef4444; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); cursor: pointer; transition: all 0.2s;">
              🗑️ Tout Retirer
            </button>
          </div>
        </div>

        ${selectedProducts.length === 0 ? `
          <div style="padding: 40px; text-align: center; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px;">
            <span style="font-size: 32px; display: block; margin-bottom: 8px;">🛒</span>
            <strong style="color: #475569; font-size: 14.5px;">Aucun produit sélectionné pour More to Love</strong>
            <p style="color: #94a3b8; font-size: 12.5px; margin: 4px 0 0 0;">Cochez des produits ci-dessous pour les ajouter à cette section !</p>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px;">
            ${selectedProducts.map((p, idx) => `
              <div class="selected-product-card" style="position: relative; background: #f8fafc; border: 1.5px solid var(--border); border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                <div style="position: absolute; top: 8px; left: 8px; background: #0052cc; color: white; font-size: 11px; font-weight: 900; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 2;">
                  ${idx + 1}
                </div>
                <button class="remove-selected-btn" data-product-id="${p.id}" style="position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border-radius: 50%; background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; font-size: 13px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 2;" title="Retirer">
                  ✕
                </button>
                <div style="width: 100%; height: 110px; border-radius: 10px; overflow: hidden; background: white; display: flex; align-items: center; justify-content: center;">
                  <img src="${p.image}" alt="${p.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-size: 10px; font-weight: 800; color: #0052cc; text-transform: uppercase;">${p.category || 'Tech'}</span>
                  <strong style="font-size: 12.5px; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.name}">${p.name}</strong>
                  <span style="font-size: 12px; font-weight: 850; color: #0f172a;">${formatPrice(p.price)}</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border); padding-top: 8px; margin-top: auto;">
                  <button class="move-slot-btn" data-product-id="${p.id}" data-direction="left" ${idx === 0 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''} style="background: white; border: 1px solid var(--border); border-radius: 6px; padding: 3px 8px; font-size: 11px; cursor: pointer; font-weight: 800;" title="Déplacer à gauche">
                    ←
                  </button>
                  <span style="font-size: 10.5px; font-weight: 750; color: var(--text-gray);">Slot ${idx + 1}</span>
                  <button class="move-slot-btn" data-product-id="${p.id}" data-direction="right" ${idx === selectedProducts.length - 1 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''} style="background: white; border: 1px solid var(--border); border-radius: 6px; padding: 3px 8px; font-size: 11px; cursor: pointer; font-weight: 800;" title="Déplacer à droite">
                    →
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- 4. Product Picker & Catalog Browser -->
      <div class="admin-card" style="padding: 22px 26px; border-radius: 20px; background: white; border: 1.5px solid var(--border);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0; font-size: 16.5px; font-weight: 850; color: var(--text-dark); display: flex; align-items: center; gap: 8px;">
              <span>🔍</span> Catalogue des Produits Disponibles
            </h3>
            <p style="margin: 3px 0 0 0; font-size: 12.5px; color: var(--text-gray);">Cliquez pour ajouter ou retirer des produits de la sélection More to Love</p>
          </div>

          <!-- Quick presets -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button id="more-love-auto-bestsellers-btn" style="padding: 8px 14px; border-radius: 10px; font-size: 12px; font-weight: 800; color: #16a34a; background: rgba(22,163,74,0.08); border: 1px solid rgba(22,163,74,0.2); cursor: pointer; transition: all 0.2s;">
              ⭐ Auto-Remplir Best Sellers
            </button>
            <button id="more-love-auto-new-btn" style="padding: 8px 14px; border-radius: 10px; font-size: 12px; font-weight: 800; color: #6366f1; background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2); cursor: pointer; transition: all 0.2s;">
              ✨ Auto-Remplir Nouveautés
            </button>
          </div>
        </div>

        <!-- Search & Filter Controls -->
        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
          <div style="flex: 1; min-width: 240px; position: relative;">
            <input type="search" role="searchbox" aria-label="Search" id="more-love-catalog-search" name="q_search_no_credentials" value="${searchQuery}" placeholder="Rechercher par nom, catégorie, marque..." autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" style="width: 100%; padding: 10px 14px; border-radius: 12px; border: 1.5px solid var(--border); font-size: 13.5px;">
          </div>
          <div style="display: flex; gap: 6px; overflow-x: auto; max-width: 100%; padding-bottom: 4px;">
            ${categories.map(cat => `
              <button class="more-love-cat-pill ${activeCategoryFilter === cat ? 'active' : ''}" data-cat="${cat}" style="padding: 7px 14px; border-radius: 20px; font-size: 12px; font-weight: 750; border: none; cursor: pointer; transition: all 0.15s; white-space: nowrap; background: ${activeCategoryFilter === cat ? '#0052cc' : '#f1f5f9'}; color: ${activeCategoryFilter === cat ? 'white' : '#475569'};">
                ${cat}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Available Products Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; max-height: 520px; overflow-y: auto; padding-right: 4px;" class="custom-scroll">
          ${filteredProducts.length === 0 ? `
            <div style="grid-column: 1 / -1; padding: 30px; text-align: center; color: var(--text-gray);">
              Aucun produit trouvé pour ce filtre de recherche.
            </div>
          ` : filteredProducts.map(p => {
            const isSelected = selectedIdSet.has(p.id);
            return `
              <div class="catalog-toggle-card ${isSelected ? 'selected' : ''}" data-product-id="${p.id}" style="border: 2px solid ${isSelected ? '#0052cc' : 'var(--border)'}; background: ${isSelected ? 'rgba(0,82,204,0.04)' : 'white'}; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 8px; cursor: pointer; transition: all 0.15s; position: relative;">
                <div style="position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; border-radius: 6px; border: 2px solid ${isSelected ? '#0052cc' : '#cbd5e1'}; background: ${isSelected ? '#0052cc' : 'white'}; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: 900;">
                  ${isSelected ? '✓' : ''}
                </div>
                <div style="width: 100%; height: 90px; border-radius: 8px; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center;">
                  <img src="${p.image}" alt="${p.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-size: 10px; font-weight: 750; color: #64748b;">${p.category || 'Tech'}</span>
                  <strong style="font-size: 12px; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</strong>
                  <span style="font-size: 11.5px; font-weight: 850; color: #0052cc;">${formatPrice(p.price)}</span>
                </div>
                <button class="toggle-select-btn" data-product-id="${p.id}" style="width: 100%; padding: 6px; border-radius: 8px; font-size: 11px; font-weight: 800; border: none; cursor: pointer; background: ${isSelected ? '#ef4444' : '#0052cc'}; color: white; margin-top: auto;">
                  ${isSelected ? 'Retirer' : '+ Ajouter'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Bottom Save Action Bar -->
      <div style="display: flex; justify-content: flex-end; gap: 12px; padding-bottom: 20px;">
        <button id="more-love-save-btn" class="admin-btn admin-btn-primary" style="padding: 14px 32px; border-radius: 14px; font-size: 14px; font-weight: 850;">
          💾 Enregistrer les Modifications de "More to Love"
        </button>
      </div>

    </div>
  `;
}

export function attachAdminMoreToLoveListeners(context, shadow) {
  const currentConfig = getMoreToLoveConfig();
  let tempProductIds = [...(currentConfig.productIds || [])];

  const persistChanges = () => {
    const title = (shadow.getElementById('more-love-title-input')?.value || 'More to Love').trim();
    const subtitle = (shadow.getElementById('more-love-subtitle-input')?.value || '').trim();
    
    currentConfig.title = title;
    currentConfig.subtitle = subtitle;
    currentConfig.productIds = tempProductIds;
    
    saveMoreToLoveConfig(currentConfig);
    window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Paramètres de la section "More to Love" enregistrés avec succès ! 💖' }));
    context.render();
    context.attachListeners();
  };

  // Toggle ON / OFF
  const toggleBtn = shadow.getElementById('more-love-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      currentConfig.enabled = !currentConfig.enabled;
      saveMoreToLoveConfig(currentConfig);
      window.dispatchEvent(new CustomEvent('toast:show', { 
        detail: `Section More to Love ${currentConfig.enabled ? 'ACTIVÉE (ON)' : 'DÉSACTIVÉE (OFF)'} !` 
      }));
      context.render();
      context.attachListeners();
    });
  }

  // Save Buttons
  shadow.getElementById('more-love-save-top-btn')?.addEventListener('click', persistChanges);
  shadow.getElementById('more-love-save-btn')?.addEventListener('click', persistChanges);

  // Clear all button
  const clearAllBtn = shadow.getElementById('more-love-clear-all-btn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      tempProductIds = [];
      currentConfig.productIds = [];
      saveMoreToLoveConfig(currentConfig);
      context.render();
      context.attachListeners();
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Tous les produits ont été retirés de More to Love.' }));
    });
  }

  // Auto-bestsellers preset
  const autoBestBtn = shadow.getElementById('more-love-auto-bestsellers-btn');
  if (autoBestBtn) {
    autoBestBtn.addEventListener('click', () => {
      const allProds = context.products || [];
      const best = [...allProds]
        .sort((a, b) => (b.reviewsCount || b.rating || 0) - (a.reviewsCount || a.rating || 0))
        .slice(0, 12)
        .map(p => p.id);
      
      currentConfig.productIds = best;
      saveMoreToLoveConfig(currentConfig);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: '12 Best-Sellers ajoutés à More to Love ! ⭐' }));
      context.render();
      context.attachListeners();
    });
  }

  // Auto-new arrivals preset
  const autoNewBtn = shadow.getElementById('more-love-auto-new-btn');
  if (autoNewBtn) {
    autoNewBtn.addEventListener('click', () => {
      const allProds = context.products || [];
      const newest = [...allProds].slice(-12).reverse().map(p => p.id);
      currentConfig.productIds = newest;
      saveMoreToLoveConfig(currentConfig);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: '12 Nouveautés ajoutées à More to Love ! ✨' }));
      context.render();
      context.attachListeners();
    });
  }

  // Remove individual selected product
  shadow.querySelectorAll('.remove-selected-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pId = parseInt(btn.getAttribute('data-product-id'));
      currentConfig.productIds = (currentConfig.productIds || []).filter(id => id !== pId);
      saveMoreToLoveConfig(currentConfig);
      context.render();
      context.attachListeners();
    });
  });

  // Move slot order left / right
  shadow.querySelectorAll('.move-slot-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pId = parseInt(btn.getAttribute('data-product-id'));
      const dir = btn.getAttribute('data-direction');
      const list = [...(currentConfig.productIds || [])];
      const idx = list.indexOf(pId);
      if (idx > -1) {
        if (dir === 'left' && idx > 0) {
          const temp = list[idx - 1];
          list[idx - 1] = list[idx];
          list[idx] = temp;
        } else if (dir === 'right' && idx < list.length - 1) {
          const temp = list[idx + 1];
          list[idx + 1] = list[idx];
          list[idx] = temp;
        }
        currentConfig.productIds = list;
        saveMoreToLoveConfig(currentConfig);
        context.render();
        context.attachListeners();
      }
    });
  });

  // Catalog item toggle
  shadow.querySelectorAll('.catalog-toggle-card, .toggle-select-btn').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const pId = parseInt(el.getAttribute('data-product-id'));
      if (!pId) return;
      let list = [...(currentConfig.productIds || [])];
      if (list.includes(pId)) {
        list = list.filter(id => id !== pId);
      } else {
        list.push(pId);
      }
      currentConfig.productIds = list;
      saveMoreToLoveConfig(currentConfig);
      context.render();
      context.attachListeners();
    });
  });

  // Category filter pills
  shadow.querySelectorAll('.more-love-cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      activeCategoryFilter = pill.getAttribute('data-cat') || 'All';
      context.render();
      context.attachListeners();
    });
  });

  // Live search input
  const searchInput = shadow.getElementById('more-love-catalog-search');
  if (searchInput) {
    if (context.isAutofilledCredential && context.isAutofilledCredential(searchInput.value)) {
      searchInput.value = '';
      searchQuery = '';
    }
    searchInput.addEventListener('focus', () => {
      if (context.isAutofilledCredential && context.isAutofilledCredential(searchInput.value)) {
        searchInput.value = '';
        searchQuery = '';
      }
    });

    searchInput.addEventListener('input', (e) => {
      let val = e.target.value;
      if (context.isAutofilledCredential && context.isAutofilledCredential(val)) {
        e.target.value = '';
        val = '';
      }
      searchQuery = val;
      context.render();
      context.attachListeners();
      const inputRef = context.shadowRoot.getElementById('more-love-catalog-search');
      if (inputRef) {
        inputRef.focus();
        inputRef.setSelectionRange(inputRef.value.length, inputRef.value.length);
      }
    });
  }
}
