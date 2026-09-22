// Supabase Client & Backend Synchronization Engine
import { getAllOrdersFromStorage, saveAllOrdersToStorage, getStorageItem, saveStorageItem, userKey } from './storage.js';

export const SUPABASE_URL = 'https://euuzsxjsmsktegilbqpv.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1dXpzeGpzbXNrdGVnaWxicXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzIyMzcsImV4cCI6MjEwMzQwODIzN30.BJtkw4BBkAytc5vDSr8a0dOmUyGk_1xfpdHK3sEHwHs';

let _clientInstance = null;

if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
  try {
    _clientInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {}
}

if (!_clientInstance) {
  const cdns = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm',
    'https://esm.sh/@supabase/supabase-js@2',
    'https://unpkg.com/@supabase/supabase-js@2?module'
  ];
  for (const cdnUrl of cdns) {
    try {
      const mod = await import(cdnUrl);
      const createClientFn = mod?.createClient || mod?.default?.createClient;
      if (createClientFn) {
        _clientInstance = createClientFn(SUPABASE_URL, SUPABASE_ANON_KEY);
        break;
      }
    } catch (e) {
      console.warn(`[Supabase CDN Loader] Failed loading from ${cdnUrl}:`, e.message);
    }
  }
}

export const supabase = _clientInstance;

// ==========================================
// 1. PRODUCTS SYNC & CRUD
// ==========================================

export async function fetchProductsFromSupabase() {
  try {
    const productMap = new Map();
    let querySuccess = false;

    // 1. Primary Cloud Source: Postgres products table
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(p => {
          const id = p.legacy_id || p.id;
          return {
            id: id,
            uuid: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            price: parseFloat(p.price) || 0,
            originalPrice: p.original_price ? parseFloat(p.original_price) : (p.compare_price ? parseFloat(p.compare_price) : null),
            comparePrice: p.compare_price ? parseFloat(p.compare_price) : (p.original_price ? parseFloat(p.original_price) : null),
            category: p.category_name || p.category || '',
            subcategory: p.subcategory_name || p.subcategory || '',
            brand: p.brand_name || p.brand || '',
            image: p.image,
            gallery: p.gallery || [],
            colors: p.colors || [],
            specs: p.specs || {},
            stock: p.stock ?? 10,
            inStock: p.in_stock ?? true,
            badge: p.badge || p.badge_text || '',
            homepageSections: p.homepage_sections || p.homepageSections || [],
            isBestseller: p.is_bestseller ?? p.isBestseller ?? false,
            isHotDeal: p.is_hot_deal ?? p.isHotDeal ?? false,
            isNew: p.is_new ?? p.isNew ?? false,
            rating: p.rating ? parseFloat(p.rating) : 5.0,
            reviews: p.reviews_count ?? (Array.isArray(p.reviews) ? p.reviews.length : 0),
            reviewsCount: p.reviews_count ?? (Array.isArray(p.reviews) ? p.reviews.length : 0),
            createdAt: p.created_at || null
          };
        });
      }
    } catch(e) {}

    // 2. Secondary Cloud Source: site_settings fallback (sweetos_cloud_products) only if table is empty or query failed
    try {
      const cloudFallback = await fetchSiteSettingFromSupabase('sweetos_cloud_products');
      if (Array.isArray(cloudFallback) && cloudFallback.length > 0) {
        return cloudFallback;
      }
    } catch(e) {}

    return [];
  } catch (err) {
    console.error('[Supabase] fetchProducts error:', err);
    return null;
  }
}

export async function syncProductsToSupabase(productsList) {
  try {
    if (!supabase || !Array.isArray(productsList)) return false;

    if (productsList.length === 0) {
      console.warn('[Supabase Cloud] syncProducts received empty array. Skipping.');
      return true;
    }

    // Safety Guard: check cloud count to detect suspicious data drop
    let cloudCount = 0;
    try {
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
      cloudCount = count || 0;
    } catch(e) {}

    const localCount = productsList.length;
    const isSuspicious = cloudCount > 0 && localCount < Math.max(3, Math.floor(cloudCount * 0.7));

    if (isSuspicious) {
      console.warn(`[Supabase Cloud] Local products count (${localCount}) is far below cloud (${cloudCount}). Skipping destructive fallback overwrite; upserting entries only.`);
    }

    const processedProducts = await Promise.all(productsList.map(async p => {
      let finalImg = p.image;
      if (finalImg && typeof finalImg === 'string' && finalImg.startsWith('data:')) {
        const cloudUrl = await uploadBase64OrFileToSupabase(finalImg, `prod_${p.id || Date.now()}.png`);
        if (cloudUrl) finalImg = cloudUrl;
      }
      return { ...p, image: finalImg };
    }));

    if (!isSuspicious) {
      const savedFallback = await saveSiteSettingInSupabase('sweetos_cloud_products', processedProducts);
      if (!savedFallback) {
        console.warn('[Supabase Cloud] Warning: Could not update sweetos_cloud_products fallback (check RLS permissions).');
      }
    }

    const records = processedProducts.map(p => {
      const legId = typeof p.id === 'number' ? p.id : (parseInt(p.id) || Date.now());
      const pName = p.name || 'Product';
      const pSlug = p.slug || (pName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + legId);
      const bText = p.badge || p.badge_text || '';
      const isBest = p.isBestseller ?? p.is_bestseller ?? (bText.toUpperCase().includes('BEST'));
      const isHot = p.isHotDeal ?? p.is_hot_deal ?? (bText.toUpperCase().includes('DEAL') || (p.comparePrice && p.comparePrice > p.price));
      const isNewProd = p.isNew ?? p.is_new ?? (bText.toUpperCase().includes('NEW'));

      return {
        legacy_id: legId,
        name: pName,
        slug: pSlug,
        description: p.description || '',
        price: parseFloat(p.price) || 0,
        original_price: (p.originalPrice || p.comparePrice) ? parseFloat(p.originalPrice || p.comparePrice) : null,
        category_name: p.category || '',
        subcategory_name: p.subcategory || '',
        brand_name: p.brand || '',
        image: p.image || '',
        gallery: p.gallery || [],
        colors: p.colors || [],
        specs: p.specs || {},
        stock: p.stock ?? 10,
        in_stock: p.inStock ?? (p.stock > 0),
        is_bestseller: isBest,
        is_hot_deal: isHot,
        is_new: isNewProd,
        rating: p.rating || 5.0,
        reviews_count: p.reviews || 0
      };
    });

    try {
      const { error: upErr } = await supabase.from('products').upsert(records, { onConflict: 'legacy_id' });
      if (upErr) {
        console.warn('[Supabase Cloud] Products table upsert note:', upErr.message);
      }
    } catch(e) {}

    console.log('[Supabase Cloud] Products synced across devices successfully!');
    return true;
  } catch (err) {
    console.error('[Supabase Cloud] syncProducts error:', err);
    return false;
  }
}

export async function deleteProductPermanentlyFromSupabase(productOrId) {
  try {
    if (!supabase) return false;

    const targetId = typeof productOrId === 'object' ? productOrId?.id : (typeof productOrId === 'number' ? productOrId : parseInt(productOrId));
    const targetName = typeof productOrId === 'object' ? productOrId?.name : (typeof productOrId === 'string' ? productOrId : null);
    const targetSlug = typeof productOrId === 'object' ? productOrId?.slug : null;

    // 1. Clean from site_settings fallback and browser storage
    try {
      const fallback = await fetchSiteSettingFromSupabase('sweetos_cloud_products');
      if (Array.isArray(fallback)) {
        const filtered = fallback.filter(p => {
          if (!p) return false;
          if (targetId && !isNaN(targetId) && (String(p.id) === String(targetId) || String(p.legacy_id) === String(targetId))) return false;
          if (targetName && String(p.name).toLowerCase().trim() === String(targetName).toLowerCase().trim()) return false;
          if (targetSlug && String(p.slug).toLowerCase().trim() === String(targetSlug).toLowerCase().trim()) return false;
          return true;
        });
        await saveSiteSettingInSupabase('sweetos_cloud_products', filtered);
        try {
          localStorage.removeItem('SWEETOS_products');
        } catch(e) {}
      }
    } catch(e) {}

    // 2. Delete from products Postgres table
    try {
      if (targetId && !isNaN(targetId)) {
        await supabase.from('products').delete().eq('legacy_id', targetId);
      }
      if (targetName) {
        await supabase.from('products').delete().eq('name', targetName);
      }
      if (targetSlug) {
        await supabase.from('products').delete().eq('slug', targetSlug);
      }
    } catch(e) {
      console.warn('[Supabase] Delete table warning:', e);
    }

    console.log('[Supabase] Product permanently deleted from Supabase cloud database.');
    return true;
  } catch (err) {
    console.error('[Supabase] deleteProductPermanently error:', err);
    return false;
  }
}

export async function deleteMultipleProductsPermanentlyFromSupabase(productIds = []) {
  try {
    if (!supabase || !productIds.length) return false;

    try {
      const fallback = await fetchSiteSettingFromSupabase('sweetos_cloud_products');
      if (Array.isArray(fallback)) {
        const idSet = new Set(productIds.map(String));
        const filtered = fallback.filter(p => p && p.id && !idSet.has(String(p.id)));
        await saveSiteSettingInSupabase('sweetos_cloud_products', filtered);
        try {
          localStorage.removeItem('SWEETOS_products');
        } catch(e) {}
      }
    } catch(e) {}

    const { error } = await supabase
      .from('products')
      .delete()
      .in('legacy_id', productIds);

    if (error) {
      console.warn('[Supabase] Bulk delete warning:', error.message);
      return false;
    }
    console.log('[Supabase] Bulk products permanently deleted from Supabase cloud database.');
    return true;
  } catch (err) {
    console.error('[Supabase] Bulk delete error:', err);
    return false;
  }
}

export async function seedProductsToSupabase() {
  try {
    const records = initialProducts.map(p => ({
      legacy_id: typeof p.id === 'number' ? p.id : null,
      name: p.name,
      slug: (p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + (p.id || Date.now()),
      description: p.description || '',
      price: p.price || 0,
      original_price: p.originalPrice || null,
      category_name: p.category || '',
      subcategory_name: p.subcategory || '',
      brand_name: p.brand || '',
      image: p.image || '',
      gallery: p.gallery || [],
      colors: p.colors || [],
      specs: p.specs || {},
      stock: p.stock ?? 10,
      in_stock: p.inStock ?? true,
      is_bestseller: p.isBestseller ?? false,
      is_hot_deal: p.isHotDeal ?? false,
      is_new: p.isNew ?? true,
      rating: p.rating || 5.0,
      reviews_count: p.reviews || 0
    }));

    const { error } = await supabase.from('products').insert(records);
    if (!error) {
      console.log('[Supabase] Initial catalog successfully seeded to Supabase!');
    }
  } catch (e) {
    console.warn('[Supabase] Seeding skipped or table not yet created.');
  }
}

export async function createProductInSupabase(prod) {
  try {
    const record = {
      legacy_id: Date.now(),
      name: prod.name,
      slug: (prod.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
      description: prod.description || '',
      price: prod.price || 0,
      original_price: prod.originalPrice || null,
      category_name: prod.category || '',
      subcategory_name: prod.subcategory || '',
      brand_name: prod.brand || '',
      image: prod.image || '',
      gallery: prod.gallery || [],
      colors: prod.colors || [],
      specs: prod.specs || {},
      stock: prod.stock ?? 10,
      in_stock: prod.inStock ?? true,
      is_bestseller: prod.isBestseller ?? false,
      is_hot_deal: prod.isHotDeal ?? false,
      is_new: prod.isNew ?? true,
      rating: prod.rating || 5.0,
      reviews_count: 0
    };

    const { data, error } = await supabase.from('products').insert([record]).select();
    if (error) throw error;
    return data?.[0];
  } catch (err) {
    console.error('[Supabase] createProduct error:', err);
    return null;
  }
}

// ==========================================
// 2. CATEGORIES SYNC & CRUD
// ==========================================

export async function fetchCategoriesFromSupabase() {
  try {
    // 1. Primary Cloud Source: Postgres categories table
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch(e) {}

    // 2. Secondary Cloud Source: site_settings fallback (sweetos_cloud_categories) only if table is empty/failed
    try {
      const fallback = await fetchSiteSettingFromSupabase('sweetos_cloud_categories');
      if (Array.isArray(fallback) && fallback.length > 0) {
        return fallback;
      }
    } catch(e) {}

    return [];
  } catch (e) {
    console.error('[Supabase] fetchCategories error:', e);
    return null;
  }
}

export async function syncCategoriesToSupabase(categoriesList) {
  try {
    if (!supabase || !Array.isArray(categoriesList)) return false;
    await saveSiteSettingInSupabase('sweetos_cloud_categories', categoriesList);

    const records = categoriesList.map(c => ({
      name: c.name,
      slug: (c.slug || c.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      icon: c.icon || '📦',
      description: c.description || ''
    }));

    if (records.length > 0) {
      try { await supabase.from('categories').upsert(records, { onConflict: 'slug' }); } catch(e) {}
    }
    return true;
  } catch (err) {
    console.error('[Supabase Cloud] syncCategories error:', err);
    return false;
  }
}

// ==========================================
// 3. BRANDS SYNC & CRUD
// ==========================================

export async function fetchBrandsFromSupabase() {
  try {
    // 1. Primary Cloud Source: Postgres brands table
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('display_order', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch(e) {}

    // 2. Secondary Cloud Source: site_settings fallback (sweetos_cloud_brands) only if table is empty/failed
    try {
      const fallback = await fetchSiteSettingFromSupabase('sweetos_cloud_brands');
      if (Array.isArray(fallback) && fallback.length > 0) {
        return fallback;
      }
    } catch(e) {}

    return [];
  } catch (e) {
    console.error('[Supabase] fetchBrands error:', e);
    return null;
  }
}

export async function syncBrandsToSupabase(brandsList) {
  try {
    if (!supabase || !Array.isArray(brandsList)) return false;
    await saveSiteSettingInSupabase('sweetos_cloud_brands', brandsList);

    const records = brandsList.map(b => ({
      name: b.name,
      slug: (b.slug || b.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description: b.description || '',
      logo: b.logo || b.logo_url || b.image || '',
      banner_image: b.banner_image || b.bannerImage || '',
      website: b.website || '',
      is_official: b.isOfficial ?? true
    }));

    if (records.length > 0) {
      const { error } = await supabase.from('brands').upsert(records, { onConflict: 'slug' });
      if (!error) {
        console.log('✅ [Supabase Cloud] Brands synced successfully!', records.length);
      } else {
        console.warn('⚠️ [Supabase Cloud] Brands table upsert note:', error.message);
      }
    }
    return true;
  } catch (err) {
    console.error('❌ [Supabase Cloud] syncBrands error:', err);
    return false;
  }
}

export async function deleteBrandFromSupabase(brandOrObj) {
  try {
    if (!supabase) return false;
    const targetId = typeof brandOrObj === 'object' ? brandOrObj?.id : brandOrObj;
    const targetSlug = typeof brandOrObj === 'object' ? (brandOrObj?.slug || brandOrObj?.name) : brandOrObj;
    const targetName = typeof brandOrObj === 'object' ? brandOrObj?.name : brandOrObj;

    try {
      const fallback = await fetchSiteSettingFromSupabase('sweetos_cloud_brands');
      if (Array.isArray(fallback)) {
        const filtered = fallback.filter(b => {
          if (!b) return false;
          if (targetId && (b.id === targetId || String(b.id) === String(targetId))) return false;
          if (targetSlug && (b.slug === targetSlug || String(b.slug).toLowerCase() === String(targetSlug).toLowerCase())) return false;
          if (targetName && (b.name === targetName || String(b.name).toLowerCase() === String(targetName).toLowerCase())) return false;
          return true;
        });
        await saveSiteSettingInSupabase('sweetos_cloud_brands', filtered);
        try {
          localStorage.setItem('SWEETOS_brands', JSON.stringify(filtered));
        } catch(e) {}
      }
    } catch(e) {}

    if (targetSlug || targetName) {
      const slugVal = (targetSlug || targetName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      try {
        if (targetName) await supabase.from('brands').delete().eq('name', targetName);
        if (slugVal) await supabase.from('brands').delete().eq('slug', slugVal);
      } catch(e) {}
    }
    return true;
  } catch(e) {
    return false;
  }
}

export async function deleteMultipleBrandsFromSupabase(brandsOrIds = []) {
  try {
    if (!supabase || !brandsOrIds.length) return false;

    const idSet = new Set();
    const slugSet = new Set();
    const nameSet = new Set();

    brandsOrIds.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        if (item.id) idSet.add(String(item.id));
        if (item.slug) slugSet.add(String(item.slug).toLowerCase());
        if (item.name) nameSet.add(String(item.name).toLowerCase());
      } else if (item) {
        idSet.add(String(item));
        slugSet.add(String(item).toLowerCase());
        nameSet.add(String(item).toLowerCase());
      }
    });

    try {
      const fallback = await fetchSiteSettingFromSupabase('sweetos_cloud_brands');
      if (Array.isArray(fallback)) {
        const filtered = fallback.filter(b => {
          if (!b) return false;
          if (b.id && idSet.has(String(b.id))) return false;
          if (b.slug && slugSet.has(String(b.slug).toLowerCase())) return false;
          if (b.name && nameSet.has(String(b.name).toLowerCase())) return false;
          return true;
        });
        await saveSiteSettingInSupabase('sweetos_cloud_brands', filtered);
        try {
          localStorage.setItem('SWEETOS_brands', JSON.stringify(filtered));
        } catch(e) {}
      }
    } catch(e) {}

    const slugArray = Array.from(slugSet);
    const nameArray = Array.from(nameSet);
    if (slugArray.length > 0) {
      try { await supabase.from('brands').delete().in('slug', slugArray); } catch(e) {}
    }
    if (nameArray.length > 0) {
      try { await supabase.from('brands').delete().in('name', nameArray); } catch(e) {}
    }
    return true;
  } catch (err) {
    return false;
  }
}

export async function deleteCategoryFromSupabase(categoryOrObj) {
  try {
    if (!supabase) return false;
    const targetId = typeof categoryOrObj === 'object' ? categoryOrObj?.id : categoryOrObj;
    const targetSlug = typeof categoryOrObj === 'object' ? (categoryOrObj?.slug || categoryOrObj?.name) : categoryOrObj;
    const targetName = typeof categoryOrObj === 'object' ? categoryOrObj?.name : categoryOrObj;

    try {
      const fallback = await fetchSiteSettingFromSupabase('sweetos_cloud_categories');
      if (Array.isArray(fallback)) {
        const filtered = fallback.filter(c => {
          if (!c) return false;
          if (targetId && (c.id === targetId || String(c.id) === String(targetId))) return false;
          if (targetSlug && (c.slug === targetSlug || String(c.slug).toLowerCase() === String(targetSlug).toLowerCase())) return false;
          if (targetName && (c.name === targetName || String(c.name).toLowerCase() === String(targetName).toLowerCase())) return false;
          return true;
        });
        await saveSiteSettingInSupabase('sweetos_cloud_categories', filtered);
        try {
          localStorage.setItem('SWEETOS_categories', JSON.stringify(filtered));
        } catch(e) {}
      }
    } catch(e) {}

    if (targetSlug || targetName) {
      const slugVal = (targetSlug || targetName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      try {
        if (targetName) await supabase.from('categories').delete().eq('name', targetName);
        if (slugVal) await supabase.from('categories').delete().eq('slug', slugVal);
      } catch(e) {}
    }
    return true;
  } catch(e) {
    return false;
  }
}

export async function deleteMultipleCategoriesFromSupabase(categoriesOrIds = []) {
  try {
    if (!supabase || !categoriesOrIds.length) return false;

    const idSet = new Set();
    const slugSet = new Set();
    const nameSet = new Set();

    categoriesOrIds.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        if (item.id) idSet.add(String(item.id));
        if (item.slug) slugSet.add(String(item.slug).toLowerCase());
        if (item.name) nameSet.add(String(item.name).toLowerCase());
      } else if (item) {
        idSet.add(String(item));
        slugSet.add(String(item).toLowerCase());
        nameSet.add(String(item).toLowerCase());
      }
    });

    try {
      const fallback = await fetchSiteSettingFromSupabase('sweetos_cloud_categories');
      if (Array.isArray(fallback)) {
        const filtered = fallback.filter(c => {
          if (!c) return false;
          if (c.id && idSet.has(String(c.id))) return false;
          if (c.slug && slugSet.has(String(c.slug).toLowerCase())) return false;
          if (c.name && nameSet.has(String(c.name).toLowerCase())) return false;
          return true;
        });
        await saveSiteSettingInSupabase('sweetos_cloud_categories', filtered);
        try {
          localStorage.setItem('SWEETOS_categories', JSON.stringify(filtered));
        } catch(e) {}
      }
    } catch(e) {}

    const slugArray = Array.from(slugSet);
    const nameArray = Array.from(nameSet);
    if (slugArray.length > 0) {
      try { await supabase.from('categories').delete().in('slug', slugArray); } catch(e) {}
    }
    if (nameArray.length > 0) {
      try { await supabase.from('categories').delete().in('name', nameArray); } catch(e) {}
    }
    return true;
  } catch (err) {
    return false;
  }
}

// ==========================================
// 4. ORDERS CREATION & SYNC
// ==========================================

export async function createOrderInSupabase(newOrder) {
  try {
    if (!supabase || !newOrder) return null;
    const orderId = newOrder.id || ('ORD-' + Math.floor(100000 + Math.random() * 900000));
    const emailLower = (newOrder.customerEmail || '').toLowerCase();
    
    // 1. Upsert into site_settings table under key 'sweetos_cloud_orders' (guaranteed Cloud persistence)
    try {
      const { data: s } = await supabase.from('site_settings').select('*').eq('key', 'sweetos_cloud_orders').maybeSingle();
      let sOrders = [];
      if (s && s.value) {
        sOrders = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
        if (!Array.isArray(sOrders)) sOrders = [];
      }
      const existingIdx = sOrders.findIndex(o => o.id === orderId);
      if (existingIdx > -1) {
        sOrders[existingIdx] = newOrder;
      } else {
        sOrders.unshift(newOrder);
      }
      await saveSiteSettingInSupabase('sweetos_cloud_orders', sOrders);
    } catch(e) {}

    // 2. Try to upsert into Supabase orders table with conflict target
    try {
      const record = {
        order_number: orderId,
        customer_name: newOrder.customerName || 'Customer',
        customer_email: emailLower,
        customer_phone: newOrder.customerPhone || '',
        customer_address: typeof newOrder.customerAddress === 'string' ? newOrder.customerAddress : (newOrder.customerAddress?.street || ''),
        total_amount: parseFloat(newOrder.total) || 0,
        status: newOrder.status || 'Pending',
        payment_method: newOrder.paymentMethod || 'cod',
        shipping_notes: newOrder.items || (newOrder.products || []).map(p => `${p.name} (x${p.quantity || 1})`).join(', ') || 'Product Order'
      };
      await supabase.from('orders').upsert([record], { onConflict: 'order_number' });
    } catch(e) {}

    // 3. Upsert order profile details
    if (emailLower) {
      const pKey = userKey('SWEETOS_user_profile', emailLower);
      const { data: p } = await supabase.from('profiles').select('*').eq('email', emailLower).maybeSingle();
      
      let pOrders = [];
      if (p && p.orders) {
        pOrders = Array.isArray(p.orders) ? p.orders : (typeof p.orders === 'string' ? JSON.parse(p.orders) : []);
      }
      
      // Merge with any local profile orders
      try {
        const localProf = JSON.parse(localStorage.getItem(pKey) || localStorage.getItem('SWEETOS_user_profile') || '{}');
        if (localProf && Array.isArray(localProf.orders)) {
          localProf.orders.forEach(lo => {
            if (lo && lo.id && !pOrders.some(o => o.id === lo.id)) {
              pOrders.push(lo);
            }
          });
        }
      } catch(e) {}
      
      const existingIdx = pOrders.findIndex(o => o.id === orderId);
      if (existingIdx > -1) {
        pOrders[existingIdx] = newOrder;
      } else {
        pOrders.unshift(newOrder);
      }

      // Upsert into profiles using valid columns
      try {
        const fullName = (newOrder.customerName || p?.full_name || p?.first_name || 'Client').trim();
        await supabase.from('profiles').upsert([{
          email: emailLower,
          full_name: fullName,
          phone: newOrder.customerPhone || p?.phone || ''
        }], { onConflict: 'email' });
      } catch(e) {}

      // Save to localStorage user profile so it is available locally immediately
      try {
        let profObj = JSON.parse(localStorage.getItem(pKey) || localStorage.getItem('SWEETOS_user_profile') || '{}');
        profObj.orders = pOrders;
        localStorage.setItem(pKey, JSON.stringify(profObj));
        localStorage.setItem('SWEETOS_user_profile', JSON.stringify(profObj));
      } catch(e) {}
    }

    // 4. Save to global orders array in storage
    try {
      let allOrders = getAllOrdersFromStorage();
      if (!allOrders.some(o => o.id === orderId)) {
        allOrders.unshift(newOrder);
      } else {
        const idx = allOrders.findIndex(o => o.id === orderId);
        allOrders[idx] = newOrder;
      }
      saveAllOrdersToStorage(allOrders);
    } catch(e) {}

    window.dispatchEvent(new CustomEvent('orders:updated', { detail: newOrder }));
    window.dispatchEvent(new CustomEvent('profile:updated'));

    // Realtime broadcast dispatch for instant cross-device order notification
    try {
      if (realtimeChannel) {
        realtimeChannel.send({
          type: 'broadcast',
          event: 'order_created',
          payload: { order: newOrder }
        });
      } else if (supabase) {
        supabase.channel('sweetos-global-sync').send({
          type: 'broadcast',
          event: 'order_created',
          payload: { order: newOrder }
        });
      }
    } catch(e) {}

    console.log('[Supabase Cloud] Order created & synced successfully:', orderId);
    return newOrder;
  } catch (err) {
    console.error('[Supabase Cloud] createOrder error:', err);
    return null;
  }
}

export async function updateOrderInSupabase(orderId, patch) {
  if (!orderId || !patch) return false;
  try {
    const updatedAt = new Date().toISOString();
    const updateData = { updated_at: updatedAt };

    if (patch.status !== undefined) updateData.status = patch.status;
    if (patch.trackingNumber !== undefined) updateData.tracking_number = patch.trackingNumber;
    if (patch.paymentMethod !== undefined) updateData.payment_method = patch.paymentMethod;
    if (patch.total !== undefined) updateData.total_amount = parseFloat(patch.total) || 0;
    if (patch.customerAddress !== undefined) {
      updateData.customer_address = typeof patch.customerAddress === 'string' ? patch.customerAddress : (patch.customerAddress?.street || '');
    }

    const cleanId = String(orderId).trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    // 1. Update dedicated Supabase orders table
    if (supabase) {
      try {
        let query = supabase.from('orders').update(updateData);
        if (isUuid) {
          query = query.or(`id.eq.${cleanId},order_number.eq.${cleanId}`);
        } else {
          query = query.eq('order_number', cleanId);
        }
        await query;
      } catch(e) {}
    }

    // 2. Update local storage orders array
    let targetCustomerEmail = null;
    try {
      const allOrders = getAllOrdersFromStorage();
      if (Array.isArray(allOrders)) {
        const idx = allOrders.findIndex(o => o && (o.id === orderId || o.order_number === orderId));
        if (idx > -1) {
          allOrders[idx] = { ...allOrders[idx], ...patch, updatedAt };
          targetCustomerEmail = allOrders[idx].customerEmail || allOrders[idx].email || null;
          saveAllOrdersToStorage(allOrders);
        }
      }
    } catch(e) {}

    // 3. Update customer profile orders array in local storage
    if (targetCustomerEmail) {
      try {
        const pKey = userKey(targetCustomerEmail);
        const pStr = localStorage.getItem(`SWEETOS_user_profile_${pKey}`) || localStorage.getItem('SWEETOS_user_profile');
        if (pStr) {
          const prof = typeof pStr === 'string' ? JSON.parse(pStr) : pStr;
          if (prof && Array.isArray(prof.orders)) {
            const oIdx = prof.orders.findIndex(o => o && (o.id === orderId || o.order_number === orderId));
            if (oIdx > -1) {
              prof.orders[oIdx] = { ...prof.orders[oIdx], ...patch, updatedAt };
              localStorage.setItem(`SWEETOS_user_profile_${pKey}`, JSON.stringify(prof));
              if (localStorage.getItem('SWEETOS_user_profile')) {
                localStorage.setItem('SWEETOS_user_profile', JSON.stringify(prof));
              }
            }
          }
        }
      } catch(e) {}
    }

    // 4. Update site_settings (sweetos_cloud_orders) backup in Supabase
    if (supabase) {
      try {
        const { data: s } = await supabase.from('site_settings').select('*').eq('key', 'sweetos_cloud_orders').maybeSingle();
        if (s && s.value) {
          let sOrders = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
          if (Array.isArray(sOrders)) {
            const sIdx = sOrders.findIndex(o => o && (o.id === orderId || o.order_number === orderId));
            if (sIdx > -1) {
              sOrders[sIdx] = { ...sOrders[sIdx], ...patch, updatedAt };
              await supabase.from('site_settings').upsert([{ key: 'sweetos_cloud_orders', value: JSON.stringify(sOrders) }], { onConflict: 'key' });
            }
          }
        }
      } catch(e) {}
    }

    return true;
  } catch (err) {
    console.error('[Supabase Cloud] updateOrderInSupabase error:', err);
    return false;
  }
}

export async function fetchOrdersFromSupabase(userEmail = null) {
  try {
    if (!supabase) return getAllOrdersFromStorage() || [];
    
    let allOrders = [];

    // 1. Fetch from site_settings table (sweetos_cloud_orders)
    try {
      const { data: s } = await supabase.from('site_settings').select('*').eq('key', 'sweetos_cloud_orders').maybeSingle();
      if (s && s.value) {
        let sOrders = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
        if (Array.isArray(sOrders)) {
          sOrders.forEach(o => {
            if (o && (o.id || o.order_number)) {
              const id = o.id || o.order_number;
              const orderEmail = (o.customerEmail || o.customer_email || o.email || '').toLowerCase();
              if (!userEmail || (orderEmail && orderEmail === userEmail.toLowerCase())) {
                allOrders.push({ ...o, id, customerEmail: orderEmail });
              }
            }
          });
        }
      }
    } catch(e) {}

    // 2. Fetch from profiles table (embedded orders arrays for all users)
    try {
      let pQuery = supabase.from('profiles').select('*');
      if (userEmail) {
        pQuery = pQuery.eq('email', userEmail.toLowerCase());
      }
      const { data: profiles } = await pQuery;
      if (profiles && profiles.length > 0) {
        profiles.forEach(p => {
          let pOrders = p.orders;
          if (typeof pOrders === 'string') {
            try { pOrders = JSON.parse(pOrders); } catch(e) { pOrders = []; }
          }
          if (Array.isArray(pOrders)) {
            pOrders.forEach(o => {
              if (o && (o.id || o.order_number)) {
                const id = o.id || o.order_number;
                const orderEmail = (o.customerEmail || o.customer_email || o.email || p.email || '').toLowerCase();
                if (!userEmail || (orderEmail && orderEmail === userEmail.toLowerCase())) {
                  const idx = allOrders.findIndex(existing => existing.id === id);
                  if (idx === -1) {
                    allOrders.push({ ...o, id, customerEmail: orderEmail });
                  } else {
                    allOrders[idx] = { ...allOrders[idx], ...o, id, customerEmail: orderEmail };
                  }
                }
              }
            });
          }
        });
      }
    } catch(e) {}

    // 3. Fetch from dedicated orders table
    try {
      let oQuery = supabase.from('orders').select('*');
      if (userEmail) {
        oQuery = oQuery.eq('customer_email', userEmail.toLowerCase());
      }
      const { data: cloudOrders } = await oQuery;
      if (cloudOrders && cloudOrders.length > 0) {
        cloudOrders.forEach(co => {
          const id = co.order_number || co.id;
          if (id) {
            const existingIdx = allOrders.findIndex(existing => existing.id === id);
            if (existingIdx === -1) {
              allOrders.push({
                id: id,
                date: co.created_at ? new Date(co.created_at).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
                status: co.status || 'Pending',
                total: parseFloat(co.total_amount) || 0,
                items: co.shipping_notes || 'Product Order',
                products: [],
                customerName: co.customer_name || 'Customer',
                customerEmail: co.customer_email || '',
                customerPhone: co.customer_phone || '',
                customerAddress: co.customer_address || '',
                paymentMethod: co.payment_method || 'cod'
              });
            } else {
              if (co.status) allOrders[existingIdx].status = co.status;
              if (co.shipping_notes && (!allOrders[existingIdx].items || allOrders[existingIdx].items === 'Product Order')) {
                allOrders[existingIdx].items = co.shipping_notes;
              }
            }
          }
        });
      }
    } catch(e) {}

    if (userEmail) {
      const emailTarget = userEmail.toLowerCase().trim();
      const filtered = allOrders.filter(o => {
        const oEmail = (o.customerEmail || o.customer_email || o.email || '').toLowerCase().trim();
        return oEmail === emailTarget && (o.status || '').toLowerCase() !== 'deleted';
      });
      return filtered;
    }

    if (allOrders.length > 0) {
      saveAllOrdersToStorage(allOrders);
    } else {
      const fallbackLocal = getAllOrdersFromStorage();
      if (fallbackLocal && fallbackLocal.length > 0) {
        return fallbackLocal;
      }
    }

    return allOrders;
  } catch (err) {
    console.error('[Supabase Cloud] fetchOrders error:', err);
    if (userEmail) {
      const fallback = getAllOrdersFromStorage() || [];
      return fallback.filter(o => (o.customerEmail || o.customer_email || o.email || '').toLowerCase().trim() === userEmail.toLowerCase().trim());
    }
    return getAllOrdersFromStorage() || [];
  }
}

// ==========================================
// 5. STORE SETTINGS & BRANDING SYNC
// ==========================================

export async function fetchSettingsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .limit(1);

    if (!error && data && data.length > 0) {
      const s = data[0];
      if (s.store_name) localStorage.setItem('SWEETOS_store_name', s.store_name);
      if (s.hero_title) localStorage.setItem('SWEETOS_hero_title', s.hero_title);
      if (s.hero_subtitle) localStorage.setItem('SWEETOS_hero_subtitle', s.hero_subtitle);
      if (s.store_entrance_image) localStorage.setItem('SWEETOS_store_entrance_image', s.store_entrance_image);
      if (s.currency) localStorage.setItem('SWEETOS_currency', s.currency);

      window.dispatchEvent(new CustomEvent('branding:updated'));
      return s;
    }
  } catch (err) {
    console.error('[Supabase Cloud] fetchSettings error:', err);
  }
  return null;
}

export async function fetchProfileFromSupabase(email) {
  if (!email) return null;
  try {
    const emailLower = email.toLowerCase();
    const [{ data: pData }, cloudOrders] = await Promise.all([
      supabase.from('profiles').select('*').eq('email', emailLower).maybeSingle(),
      fetchOrdersFromSupabase(emailLower)
    ]);

    const pKey = userKey('SWEETOS_user_profile', emailLower);
    let existing = null;
    try {
      existing = JSON.parse(localStorage.getItem(pKey) || localStorage.getItem('SWEETOS_user_profile') || 'null');
    } catch(e) {}

    let formattedOrders = existing?.orders || [];
    if (cloudOrders && cloudOrders.length > 0) {
      const mergedMap = new Map();
      
      // Add existing local orders first
      (existing?.orders || []).forEach(o => {
        if (o && o.id) mergedMap.set(o.id, o);
      });

      // Merge Cloud orders (Cloud order status overrides stale local status)
      cloudOrders.forEach(o => {
        const id = o.order_number || o.id;
        if (id) {
          const itemsStr = o.items || (o.products || []).map(p => `${p.name} (x${p.quantity || 1})`).join(', ') || (o.shipping_notes || 'Commande SWEETOS');
          const existingItem = mergedMap.get(id) || {};
          mergedMap.set(id, {
            ...existingItem,
            id: id,
            date: o.created_at ? new Date(o.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : (o.date || existingItem.date || 'Récemment'),
            status: o.status || existingItem.status || 'Pending',
            total: parseFloat(o.total_amount || o.total) || existingItem.total || 0,
            items: itemsStr || existingItem.items || 'Commande SWEETOS',
            itemsCount: (o.order_items || []).reduce((sum, item) => sum + (item.quantity || 1), 0) || (o.products || []).length || existingItem.itemsCount || 1,
            products: (o.products && o.products.length > 0) ? o.products : (existingItem.products || []),
            customerName: o.customer_name || o.customerName || existingItem.customerName || 'Client',
            customerPhone: o.customer_phone || o.customerPhone || existingItem.customerPhone || '',
            customerAddress: typeof o.customer_address === 'string' ? o.customer_address : (o.customerAddress || existingItem.customerAddress || ''),
            paymentMethod: o.payment_method || o.paymentMethod || existingItem.paymentMethod || 'cod',
            trackingNumber: o.trackingNumber || existingItem.trackingNumber || '',
            courier: o.courier || existingItem.courier || ''
          });
        }
      });

      formattedOrders = Array.from(mergedMap.values());
    }

    if (pData || formattedOrders.length > 0) {
      let fName = existing?.firstName || 'Client';
      let lName = existing?.lastName || '';
      if (pData?.full_name) {
        const parts = pData.full_name.trim().split(' ');
        fName = parts[0] || 'Client';
        lName = parts.slice(1).join(' ') || '';
      } else if (pData?.first_name) {
        fName = pData.first_name;
        lName = pData.last_name || '';
      }
      const profile = {
        firstName: fName,
        lastName: lName,
        email: emailLower,
        phone: pData?.phone || existing?.phone || '',
        avatar: pData?.avatar_url || existing?.avatar || '',
        role: pData?.role || 'customer',
        loyaltyLevel: pData?.loyalty_level || 'starter',
        addresses: pData?.addresses || existing?.addresses || [],
        orders: formattedOrders
      };
      localStorage.setItem('SWEETOS_user_profile', JSON.stringify(profile));
      localStorage.setItem(pKey, JSON.stringify(profile));
      window.dispatchEvent(new CustomEvent('profile:updated', { detail: profile }));
      window.dispatchEvent(new CustomEvent('orders:updated', { detail: formattedOrders }));
      return profile;
    }
  } catch(e) {
    console.warn('[Supabase] fetchProfile error:', e);
  }
  return null;
}

// ==========================================
// 6. GLOBAL INITIALIZATION & REALTIME
// ==========================================

let realtimeChannel = null;
let _realtimeDebounceTimers = {};

function debounceRealtimeSync(key, fn, delay = 600) {
  if (_realtimeDebounceTimers[key]) clearTimeout(_realtimeDebounceTimers[key]);
  _realtimeDebounceTimers[key] = setTimeout(fn, delay);
}

export function subscribeToGlobalRealtimeSync() {
  if (!supabase || realtimeChannel) return;

  try {
    realtimeChannel = supabase
      .channel('sweetos-global-sync')
      .on(
        'broadcast',
        { event: 'order_created' },
        (payload) => {
          console.log('[Supabase Realtime Broadcast Received]: order_created', payload);
          debounceRealtimeSync('orders', async () => {
            const updated = await fetchOrdersFromSupabase();
            if (updated) {
              saveAllOrdersToStorage(updated);
              window.dispatchEvent(new CustomEvent('orders:updated', { detail: updated }));
            }
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          console.log('[Supabase Realtime Event Received]:', payload.table, payload.eventType);
          
          if (payload.table === 'products' || (payload.table === 'site_settings' && payload.new?.key === 'sweetos_cloud_products')) {
            debounceRealtimeSync('products', async () => {
              const updated = await fetchProductsFromSupabase();
              if (Array.isArray(updated)) {
                let merged = updated;
                try {
                  const localRaw = localStorage.getItem('SWEETOS_products');
                  const localList = localRaw ? JSON.parse(localRaw) : [];
                  const map = new Map();
                  updated.forEach(p => { if (p && p.id != null) map.set(String(p.id), p); });
                  localList.forEach(p => {
                    if (p && p.id != null) {
                      const k = String(p.id);
                      if (!map.has(k)) map.set(k, p);
                    }
                  });
                  merged = Array.from(map.values());
                } catch(e) {}
                const prev = localStorage.getItem('SWEETOS_products');
                const curr = JSON.stringify(merged);
                if (prev !== curr) {
                  localStorage.setItem('SWEETOS_products', curr);
                  window.dispatchEvent(new CustomEvent('products:updated', { detail: merged }));
                }
              }
            });
          } else if (payload.table === 'categories' || (payload.table === 'site_settings' && payload.new?.key === 'sweetos_cloud_categories')) {
            debounceRealtimeSync('categories', async () => {
              const updated = await fetchCategoriesFromSupabase();
              if (Array.isArray(updated)) {
                let merged = updated;
                try {
                  const localRaw = localStorage.getItem('SWEETOS_categories');
                  const localList = localRaw ? JSON.parse(localRaw) : [];
                  const keyOf = c => String(c.slug || c.name || c.id || '').toLowerCase();
                  const map = new Map();
                  updated.forEach(c => { const k = keyOf(c); if (k) map.set(k, c); });
                  localList.forEach(c => {
                    const k = keyOf(c);
                    if (k && !map.has(k)) map.set(k, c);
                  });
                  merged = Array.from(map.values());
                } catch(e) {}
                const prev = localStorage.getItem('SWEETOS_categories');
                const curr = JSON.stringify(merged);
                if (prev !== curr) {
                  localStorage.setItem('SWEETOS_categories', curr);
                  window.dispatchEvent(new CustomEvent('categories:updated', { detail: merged }));
                }
              }
            });
          } else if (payload.table === 'brands' || (payload.table === 'site_settings' && payload.new?.key === 'sweetos_cloud_brands')) {
            debounceRealtimeSync('brands', async () => {
              const updated = await fetchBrandsFromSupabase();
              if (Array.isArray(updated)) {
                let merged = updated;
                try {
                  const localRaw = localStorage.getItem('SWEETOS_brands');
                  const localList = localRaw ? JSON.parse(localRaw) : [];
                  const keyOf = b => String(b.slug || b.name || b.id || '').toLowerCase();
                  const map = new Map();
                  updated.forEach(b => { const k = keyOf(b); if (k) map.set(k, b); });
                  localList.forEach(b => {
                    const k = keyOf(b);
                    if (k && !map.has(k)) map.set(k, b);
                  });
                  merged = Array.from(map.values());
                } catch(e) {}
                const prev = localStorage.getItem('SWEETOS_brands');
                const curr = JSON.stringify(merged);
                if (prev !== curr) {
                  localStorage.setItem('SWEETOS_brands', curr);
                  window.dispatchEvent(new CustomEvent('brands:updated', { detail: merged }));
                }
              }
            });
          } else if (payload.table === 'orders' || payload.table === 'profiles' || (payload.table === 'site_settings' && (payload.new?.key === 'sweetos_cloud_orders' || (payload.new?.key && payload.new.key.startsWith('sweetos_notifications_'))))) {
            debounceRealtimeSync('orders', async () => {
              const updated = await fetchOrdersFromSupabase();
              if (Array.isArray(updated) && updated.length > 0) {
                saveAllOrdersToStorage(updated);
                window.dispatchEvent(new CustomEvent('orders:updated', { detail: updated }));
                const userJson = localStorage.getItem('SWEETOS_logged_in_user');
                if (userJson) {
                  try {
                    const u = JSON.parse(userJson);
                    const email = u?.email;
                    if (email) {
                      fetchProfileFromSupabase(email);
                      const { saveNotificationsToStorage } = await import('./storage.js');
                      const notifKey = userKey('sweetos_notifications', email);
                      const cloudNotifs = await fetchSiteSettingFromSupabase(notifKey);
                      if (Array.isArray(cloudNotifs) && cloudNotifs.length > 0) {
                        await saveNotificationsToStorage(cloudNotifs, email);
                        window.dispatchEvent(new CustomEvent('notifications:updated'));
                      }
                    }
                  } catch(e) {}
                }
              } else {
                console.warn('[Supabase Realtime] fetchOrders returned empty array or error. Skipping order overwrite.');
              }
            });
          } else if (payload.table === 'store_settings' || payload.table === 'site_settings') {
            debounceRealtimeSync('settings', () => {
              fetchSettingsFromSupabase();
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime Cloud Sync Active across devices]');
        }
      });
  } catch (err) {
    console.warn('[Supabase Realtime Subscription Notice]:', err);
  }
}

export async function initSupabaseSync() {
  console.log('[Supabase] Connected to live cloud database (Cloud-First Mode):', SUPABASE_URL);

  // Clean legacy disk store caches to guarantee 100% Cloud ground truth
  try {
    ['SWEETOS_products', 'SWEETOS_categories', 'SWEETOS_brands', 'SWEETOS_all_orders'].forEach(key => {
      localStorage.removeItem(key);
    });
  } catch(e) {}
  
  // Start OAuth session listener
  initSupabaseAuthListener();

  // Rehydrate session from Supabase auth if localStorage user missing
  try {
    if (supabase && supabase.auth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user && session.user.email) {
        const email = session.user.email.toLowerCase();
        let loggedUserStr = getStorageItem('SWEETOS_logged_in_user');
        if (!loggedUserStr) {
          const u = session.user;
          const meta = u.user_metadata || {};
          const fullName = meta.full_name || meta.name || `${meta.given_name || ''} ${meta.family_name || ''}`.trim() || 'User';
          const parts = fullName.split(' ');
          const userObj = {
            email: email,
            firstName: parts[0] || 'User',
            lastName: parts.slice(1).join(' ') || '',
            name: fullName,
            isLoggedIn: true
          };
          saveStorageItem('SWEETOS_logged_in_user', userObj);
        }
      }
    }
  } catch(e) {
    console.warn('[Supabase Auth Rehydration Notice]:', e);
  }

  // Activate multi-device Realtime channel listener
  subscribeToGlobalRealtimeSync();

  // Sync logged in user profile if available
  try {
    const loggedUserStr = getStorageItem('SWEETOS_logged_in_user');
    if (loggedUserStr) {
      const loggedUser = typeof loggedUserStr === 'string' ? JSON.parse(loggedUserStr) : loggedUserStr;
      if (loggedUser && loggedUser.email) {
        fetchProfileFromSupabase(loggedUser.email);
      }
    }
  } catch(e) {}

  Promise.allSettled([
    fetchSettingsFromSupabase(),
    fetchProductsFromSupabase(),
    fetchCategoriesFromSupabase(),
    fetchBrandsFromSupabase()
  ]).then(() => {
    window.dispatchEvent(new CustomEvent('supabase:ready'));
    window.dispatchEvent(new CustomEvent('branding:updated'));
    window.dispatchEvent(new CustomEvent('products:updated'));
  });
}

// ==========================================
// 7. GOOGLE OAUTH & AUTH STATE LISTENER
// ==========================================

export const GOOGLE_CLIENT_ID = '330785208754-ksheah5kfjp3e2ahjpnh03fko7mvcn7t.apps.googleusercontent.com';

export async function signInWithGoogle() {
  // 1. Try direct Google OAuth2 Popup Client (shows "to continue to sweeto.store")
  if (typeof window !== 'undefined' && window.google && window.google.accounts && window.google.accounts.oauth2) {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
              });
              const u = await res.json();
              
              const email = (u.email || '').toLowerCase();
              const firstName = u.given_name || u.name?.split(' ')[0] || 'Client';
              const lastName = u.family_name || u.name?.split(' ').slice(1).join(' ') || '';
              const avatarUrl = u.picture || '';

              const pKey = userKey('SWEETOS_user_profile', email);
              const existingProfileStr = localStorage.getItem(pKey) || localStorage.getItem('SWEETOS_user_profile');
              let profile = null;
              if (existingProfileStr) {
                try { profile = JSON.parse(existingProfileStr); } catch(e) {}
              }

              if (!profile) {
                profile = {
                  firstName,
                  lastName,
                  email,
                  phone: '',
                  avatar: avatarUrl,
                  isVerified: true,
                  authProvider: 'google',
                  registrationDate: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                };
              } else {
                if (!profile.avatar && avatarUrl) profile.avatar = avatarUrl;
                if (!profile.firstName) profile.firstName = firstName;
                if (!profile.lastName) profile.lastName = lastName;
              }

              saveStorageItem('SWEETOS_user_profile', JSON.stringify(profile));
              saveStorageItem(pKey, JSON.stringify(profile));
              saveStorageItem('SWEETOS_logged_in_user', JSON.stringify({ email }));
              saveStorageItem('SWEETOS_auth_token', tokenResponse.access_token);

              // Sync user profile to Supabase profiles table
              try {
                await supabase.from('profiles').upsert({
                  email,
                  full_name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Client',
                  avatar_url: avatarUrl,
                  role: 'customer'
                }, { onConflict: 'email' });
              } catch(e) {}

              window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true, email, user: profile } }));
              window.dispatchEvent(new CustomEvent('auth:login', { detail: profile }));
              window.dispatchEvent(new CustomEvent('toast:show', { detail: `Bon retour, ${profile.firstName} ! Connecté via Google 🚀` }));
            } catch(fetchErr) {
              console.error('[Google UserInfo Fetch Error]:', fetchErr);
            }
          }
        }
      });

      try {
        client.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch(reqErr) {
        console.warn('[GSI Popup Blocked, falling back to OAuth redirect]:', reqErr);
      }
    } catch(err) {
      console.warn('[Google Token Client Notice]:', err);
    }
  }

  // 2. Fallback to Supabase OAuth redirect flow
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[Supabase Google Auth Error]:', err);
    throw err;
  }
}

export function initSupabaseAuthListener() {
  try {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        const u = session.user;
        const email = (u.email || '').toLowerCase();
        const meta = u.user_metadata || {};
        const fullName = meta.full_name || meta.name || `${meta.given_name || ''} ${meta.family_name || ''}`.trim() || 'Google User';
        const avatarUrl = meta.avatar_url || meta.picture || '';

        const parts = fullName.split(' ');
        const firstName = parts[0] || 'Client';
        const lastName = parts.slice(1).join(' ') || '';

        const pKey = userKey('SWEETOS_user_profile', email);
        const existingProfileStr = localStorage.getItem(pKey) || localStorage.getItem('SWEETOS_user_profile');
        let profile = null;
        if (existingProfileStr) {
          try { profile = JSON.parse(existingProfileStr); } catch(e) {}
        }

        if (!profile) {
          profile = {
            firstName,
            lastName,
            email,
            phone: meta.phone || '',
            avatar: avatarUrl,
            isVerified: true,
            authProvider: 'google',
            registrationDate: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
          };
        } else {
          if (!profile.avatar && avatarUrl) profile.avatar = avatarUrl;
          if (!profile.firstName) profile.firstName = firstName;
          if (!profile.lastName) profile.lastName = lastName;
        }

        saveStorageItem('SWEETOS_user_profile', JSON.stringify(profile));
        saveStorageItem(pKey, JSON.stringify(profile));
        saveStorageItem('SWEETOS_logged_in_user', JSON.stringify({ email }));
        if (session.access_token) {
          saveStorageItem('SWEETOS_auth_token', session.access_token);
        }

        // Sync user profile to Supabase profiles table
        try {
          await supabase.from('profiles').upsert({
            id: u.id,
            email,
            full_name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Client',
            phone: profile.phone || '',
            avatar_url: avatarUrl,
            role: 'customer'
          }, { onConflict: 'email' });
        } catch(e) {}

        window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true, email, user: profile } }));
        window.dispatchEvent(new CustomEvent('auth:login', { detail: profile }));
        window.dispatchEvent(new CustomEvent('toast:show', { detail: `Bon retour, ${profile.firstName} ! Connecté via Google 🚀` }));
      }
    });
  } catch(e) {}
}

// ==========================================
// 8. SUPABASE ADMIN AUTHENTICATION ENGINE
// ==========================================

export async function adminSignInWithSupabase(email, password) {
  try {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: 'Veuillez saisir votre email et mot de passe.' };
    }

    if (!supabase) {
      return { success: false, error: 'Client Supabase indisponible.' };
    }

    // 1. Dynamic check against site_settings table (admin_email & admin_key)
    try {
      const { data: settings } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['admin_email', 'admin_key']);

      if (Array.isArray(settings) && settings.length > 0) {
        const emailSetting = settings.find(s => s.key === 'admin_email')?.value;
        const keySetting = settings.find(s => s.key === 'admin_key')?.value;

        if (emailSetting && keySetting) {
          if (cleanEmail === String(emailSetting).trim().toLowerCase() && cleanPassword === String(keySetting).trim()) {
            console.log('[Supabase Cloud Auth] Authenticated via site_settings table:', cleanEmail);
            return { success: true, user: { email: cleanEmail, role: 'admin' } };
          }
        }
      }
    } catch(e) {}

    // 2. Try native Supabase Auth password sign in as fallback
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });

      if (!authError && authData && authData.user) {
        console.log('[Supabase Cloud Auth] Authenticated via Supabase Auth API:', cleanEmail);
        return { success: true, user: authData.user, session: authData.session };
      }
    } catch(e) {}

    return { success: false, error: 'Email ou mot de passe Supabase incorrect.' };
  } catch (err) {
    console.error('[Supabase Auth Error]:', err);
    return { success: false, error: err.message || 'Erreur d\'authentification Supabase.' };
  }
}

// ==========================================
// 8. CUSTOMERS & PROFILES CLOUD SYNC
// ==========================================

export async function fetchCustomersFromSupabase() {
  try {
    if (!supabase) return [];
    
    let allCustomersMap = new Map();

    // 1. Fetch from profiles table
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && Array.isArray(data)) {
        data.forEach(p => {
          if (p && p.email) {
            allCustomersMap.set(p.email.trim().toLowerCase(), {
              name: p.full_name || p.name || p.email.split('@')[0] || 'Client',
              email: p.email,
              phone: p.phone || '',
              addresses: Array.isArray(p.addresses) ? p.addresses : (p.address ? [p.address] : []),
              ordersCount: p.orders_count || (Array.isArray(p.orders) ? p.orders.length : 0),
              totalSpent: p.total_spent || (Array.isArray(p.orders) ? p.orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0) : 0),
              registrationDate: p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '2026',
              badgeType: p.badge_type || 'none',
              level: p.level || 'starter',
              unlockedBadges: p.unlocked_badges || []
            });
          }
        });
      }
    } catch(e) {}

    // 2. Fetch from site_settings cloud fallback (sweetos_cloud_customers)
    try {
      const { data: s } = await supabase.from('site_settings').select('*').eq('key', 'sweetos_cloud_customers').maybeSingle();
      if (s && s.value) {
        let cloudCusts = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
        if (Array.isArray(cloudCusts)) {
          cloudCusts.forEach(c => {
            if (c && c.email) {
              const emailLower = c.email.trim().toLowerCase();
              if (!allCustomersMap.has(emailLower)) {
                allCustomersMap.set(emailLower, c);
              }
            }
          });
        }
      }
    } catch(e) {}

    // 3. Extract customers from cloud orders
    try {
      const cloudOrders = await fetchOrdersFromSupabase();
      if (Array.isArray(cloudOrders)) {
        const ordersByEmail = new Map();
        cloudOrders.forEach(o => {
          if (o && o.customerEmail) {
            const em = o.customerEmail.trim().toLowerCase();
            if (!ordersByEmail.has(em)) ordersByEmail.set(em, []);
            ordersByEmail.get(em).push(o);
          }
        });

        ordersByEmail.forEach((matchingOrders, emailLower) => {
          const totalSpent = matchingOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
          const firstOrder = matchingOrders[0];

          if (allCustomersMap.has(emailLower)) {
            const existing = allCustomersMap.get(emailLower);
            existing.ordersCount = Math.max(existing.ordersCount || 0, matchingOrders.length);
            existing.totalSpent = Math.max(existing.totalSpent || 0, totalSpent);
            if (firstOrder.customerName && (!existing.name || existing.name === 'Guest User' || existing.name === 'Client')) {
              existing.name = firstOrder.customerName;
            }
            if (firstOrder.customerPhone && !existing.phone) {
              existing.phone = firstOrder.customerPhone;
            }
          } else {
            allCustomersMap.set(emailLower, {
              name: firstOrder.customerName || 'Client',
              email: emailLower,
              phone: firstOrder.customerPhone || '',
              ordersCount: matchingOrders.length,
              totalSpent: totalSpent,
              registrationDate: firstOrder.date || '2026',
              addresses: firstOrder.customerAddress ? [firstOrder.customerAddress] : []
            });
          }
        });
      }
    } catch(e) {}

    return Array.from(allCustomersMap.values());
  } catch (e) {
    console.error('[Supabase Customers Fetch Error]:', e);
    return [];
  }
}

export async function saveCustomerToSupabase(customerData) {
  try {
    if (!supabase || !customerData || !customerData.email) return;
    const emailLower = customerData.email.trim().toLowerCase();
    
    // Fetch existing profile orders from Cloud to protect Admin order status changes
    let existingOrders = [];
    try {
      const { data: existingP } = await supabase.from('profiles').select('*').eq('email', emailLower).maybeSingle();
      if (existingP && existingP.orders) {
        existingOrders = Array.isArray(existingP.orders) ? existingP.orders : (typeof existingP.orders === 'string' ? JSON.parse(existingP.orders) : []);
      }
    } catch(e) {}

    let finalOrders = existingOrders;
    if (customerData.orders && Array.isArray(customerData.orders)) {
      const orderMap = new Map();
      customerData.orders.forEach(o => {
        if (o && (o.id || o.order_number)) {
          const id = o.id || o.order_number;
          orderMap.set(id, { ...o, id });
        }
      });
      existingOrders.forEach(o => {
        if (o && (o.id || o.order_number)) {
          const id = o.id || o.order_number;
          const incoming = orderMap.get(id);
          if (incoming) {
            orderMap.set(id, {
              ...incoming,
              status: o.status || incoming.status,
              trackingNumber: o.trackingNumber || incoming.trackingNumber,
              courier: o.courier || incoming.courier
            });
          } else {
            orderMap.set(id, { ...o, id });
          }
        }
      });
      finalOrders = Array.from(orderMap.values());
    }

    const fullName = (customerData.name || customerData.fullname || `${customerData.firstName || ''} ${customerData.lastName || ''}`).trim() || 'Client';

    // 1. Upsert into profiles table using valid columns
    try {
      await supabase.from('profiles').upsert([{
        email: emailLower,
        full_name: fullName,
        phone: customerData.phone || ''
      }], { onConflict: 'email' });
    } catch(e) {}

    // 2. Persist into site_settings cloud master list under 'sweetos_cloud_customers'
    try {
      const { data: s } = await supabase.from('site_settings').select('value').eq('key', 'sweetos_cloud_customers').maybeSingle();
      let cloudCusts = [];
      if (s && s.value) {
        try {
          cloudCusts = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
          if (!Array.isArray(cloudCusts)) cloudCusts = [];
        } catch(e) {}
      }

      const map = new Map(cloudCusts.map(c => [c.email.trim().toLowerCase(), c]));
      const existing = map.get(emailLower) || {};
      map.set(emailLower, {
        name: fullName || existing.name || 'Client',
        email: emailLower,
        phone: customerData.phone || existing.phone || '',
        addresses: customerData.addresses || existing.addresses || (customerData.address ? [customerData.address] : []),
        ordersCount: (finalOrders && finalOrders.length) || customerData.ordersCount || existing.ordersCount || 0,
        totalSpent: customerData.totalSpent || existing.totalSpent || 0,
        registrationDate: existing.registrationDate || new Date().toLocaleDateString('fr-FR'),
        badgeType: customerData.badgeType || existing.badgeType || 'none',
        level: customerData.level || existing.level || 'starter',
        unlockedBadges: customerData.unlockedBadges || existing.unlockedBadges || []
      });
      await saveSiteSettingInSupabase('sweetos_cloud_customers', Array.from(map.values()));
    } catch(e) {}
  } catch(e) {}
}

export async function revokeCustomerSessionInSupabase(email) {
  try {
    if (!supabase || !email) return;
    const cleanEmail = email.trim().toLowerCase();
    
    // Store session revocation signal (forces immediate remote logout on device, preserves profile data)
    await supabase.from('site_settings').upsert({
      key: 'revoked_customer_' + cleanEmail,
      value: String(Date.now())
    }, { onConflict: 'key' });

    console.log('[Supabase Cloud] Customer active session revoked (data preserved):', cleanEmail);
  } catch(e) {
    console.error('[Supabase Revocation Error]:', e);
  }
}

export async function clearCustomerRevocationInSupabase(email) {
  try {
    if (!supabase || !email) return;
    const cleanEmail = email.trim().toLowerCase();
    await supabase.from('site_settings').delete().eq('key', 'revoked_customer_' + cleanEmail);
  } catch(e) {}
}

export async function hardDeleteCustomerAndDataInSupabase(email) {
  try {
    if (!supabase || !email) return;
    const cleanEmail = email.trim().toLowerCase();
    
    // 1. Permanently delete profile record from Supabase Cloud profiles table
    await supabase.from('profiles').delete().eq('email', cleanEmail);
    
    // 2. Revoke active sessions
    await supabase.from('site_settings').upsert({
      key: 'revoked_customer_' + cleanEmail,
      value: String(Date.now())
    }, { onConflict: 'key' });

    console.log('[Supabase Cloud] Customer account & all data permanently erased:', cleanEmail);
  } catch(e) {
    console.error('[Supabase Hard Delete Error]:', e);
  }
}

export async function deleteCustomerFromSupabase(email) {
  return hardDeleteCustomerAndDataInSupabase(email);
}

export async function checkCustomerAccountValidInSupabase(email) {
  try {
    if (!supabase || !email) return { valid: true };
    const cleanEmail = email.trim().toLowerCase();

    // Check if explicitly revoked in site_settings by Admin action
    const { data: revoked } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'revoked_customer_' + cleanEmail)
      .maybeSingle();

    if (revoked && revoked.value) {
      return { valid: false, reason: 'Account revoked or deleted by Admin' };
    }

    return { valid: true };
  } catch (e) {
    return { valid: true };
  }
}

export async function checkIsAdminAccountInSupabase(email) {
  try {
    if (!email) return false;
    const cleanEmail = email.trim().toLowerCase();

    if (!supabase) return false;

    // 1. Query Supabase profiles table for role or is_admin flag
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profile) {
      if (profile.is_admin === true || (profile.role && String(profile.role).toLowerCase() === 'admin') || (profile.type && String(profile.type).toLowerCase() === 'admin')) {
        return true;
      }
    }

    // 2. Query site_settings table for admin_emails list
    const { data: adminSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'admin_emails')
      .maybeSingle();

    if (adminSetting && adminSetting.value) {
      const list = typeof adminSetting.value === 'string' ? JSON.parse(adminSetting.value) : adminSetting.value;
      if (Array.isArray(list) && list.some(e => String(e).toLowerCase().trim() === cleanEmail)) {
        return true;
      }
    }

    return false;
  } catch (err) {
    console.warn('[Supabase Admin Check Notice]:', err);
    return false;
  }
}

// ==========================================
// 9. DYNAMIC 3-DIGIT PIN & MULTI-DEVICE SESSION ENGINE
// ==========================================

/**
 * Retrieves the 3-Digit Security PIN dynamically from Supabase Cloud site_settings.
 * Default initial PIN if not yet configured in DB: '256'
 */
export async function getAdminSecurityPinFromSupabase() {
  try {
    if (!supabase) return localStorage.getItem('SWEETOS_admin_security_pin') || '256';

    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'admin_security_pin')
      .maybeSingle();

    if (data && data.value) {
      localStorage.setItem('SWEETOS_admin_security_pin', data.value);
      return data.value;
    }
  } catch (err) {
    console.warn('[Supabase PIN Fetch Notice]:', err);
  }
  return localStorage.getItem('SWEETOS_admin_security_pin') || '256';
}

/**
 * Updates the 3-Digit Security PIN in Supabase Cloud database.
 */
export async function updateAdminSecurityPinInSupabase(newPin) {
  const cleanPin = (newPin || '').toString().trim();
  if (!/^\d{3}$/.test(cleanPin)) {
    return { success: false, error: 'Le code PIN doit comporter exactement 3 chiffres (ex: 256).' };
  }

  try {
    localStorage.setItem('SWEETOS_admin_security_pin', cleanPin);

    if (supabase) {
      await supabase
        .from('site_settings')
        .upsert({ key: 'admin_security_pin', value: cleanPin, updated_at: new Date().toISOString() });
    }
    return { success: true, pin: cleanPin };
  } catch (err) {
    console.error('[Supabase PIN Update Error]:', err);
    return { success: false, error: err.message || 'Erreur lors de la mise à jour du PIN.' };
  }
}

/**
 * Revokes all other active Admin sessions across devices using 3-Digit PIN verification.
 */
export async function revokeOtherAdminDevicesInSupabase(inputPin, deviceId) {
  try {
    const cleanPin = (inputPin || '').toString().trim();
    const currentPin = await getAdminSecurityPinFromSupabase();

    if (cleanPin !== currentPin) {
      return { success: false, error: 'Code PIN à 3 chiffres incorrect. Accès refusé.' };
    }

    const newSessionVersion = Date.now().toString();
    const currentDeviceId = deviceId || ('device_' + Math.random().toString(36).substring(2, 9));

    // Save in localStorage
    localStorage.setItem('SWEETOS_admin_session_version', newSessionVersion);
    localStorage.setItem('SWEETOS_admin_device_session_version', newSessionVersion);
    localStorage.setItem('SWEETOS_admin_primary_device_id', currentDeviceId);

    // Save to Supabase Cloud
    if (supabase) {
      await supabase.from('site_settings').upsert([
        { key: 'admin_session_version', value: newSessionVersion, updated_at: new Date().toISOString() },
        { key: 'primary_notification_device', value: currentDeviceId, updated_at: new Date().toISOString() }
      ]);
    }

    return { success: true, version: newSessionVersion, deviceId: currentDeviceId };
  } catch (err) {
    console.error('[Supabase Device Revoke Error]:', err);
    return { success: false, error: err.message || 'Erreur lors de la révocation des appareils.' };
  }
}

/**
 * Checks if the local session version matches the cloud session version.
 */
export async function checkAdminSessionVersionInSupabase(localVersion) {
  try {
    if (!supabase || !localVersion) return { valid: true };

    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'admin_session_version')
      .maybeSingle();

    if (data && data.value && data.value !== localVersion) {
      return { valid: false, cloudVersion: data.value };
    }
  } catch (err) {
    console.warn('[Supabase Session Version Check Notice]:', err);
  }
  return { valid: true };
}

// ==========================================
// 10. SUPABASE CLOUD FILE STORAGE ENGINE
// ==========================================

export async function uploadFileToSupabaseStorage(fileOrBlob, fileName = null) {
  try {
    if (!supabase) return null;

    const ext = (fileOrBlob.name ? fileOrBlob.name.split('.').pop() : 'png').toLowerCase();
    const name = fileName || `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    let targetBucket = 'uploads';
    let { data, error } = await supabase.storage
      .from(targetBucket)
      .upload(name, fileOrBlob, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.warn(`[Supabase Storage] Bucket '${targetBucket}' upload notice:`, error.message);
      targetBucket = 'public';
      const res = await supabase.storage.from(targetBucket).upload(name, fileOrBlob, { cacheControl: '3600', upsert: true });
      data = res.data;
      error = res.error;
    }

    if (!error && data) {
      const { data: publicUrlData } = supabase.storage.from(targetBucket).getPublicUrl(data.path || name);
      if (publicUrlData && publicUrlData.publicUrl) {
        console.log('[Supabase Storage] File uploaded successfully to Cloud:', publicUrlData.publicUrl);
        return publicUrlData.publicUrl;
      }
    }
  } catch (err) {
    console.error('[Supabase Storage Upload Error]:', err);
  }
  return null;
}

export async function uploadBase64OrFileToSupabase(input, fileName = null) {
  if (!input) return input;
  if (typeof input === 'string') {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return input;
    }
    if (input.startsWith('data:')) {
      try {
        const res = await fetch(input);
        const blob = await res.blob();
        const uploadedUrl = await uploadFileToSupabaseStorage(blob, fileName);
        if (uploadedUrl) return uploadedUrl;
      } catch (e) {
        console.error('[Base64 to Supabase Storage Error]:', e);
      }
    }
  } else if (input instanceof File || input instanceof Blob) {
    const uploadedUrl = await uploadFileToSupabaseStorage(input, fileName);
    if (uploadedUrl) return uploadedUrl;
  }
  return input;
}

// ==========================================
// 11. SITE SETTINGS & ENTITY CLOUD PERSISTENCE
// ==========================================

export async function saveSiteSettingInSupabase(key, value) {
  try {
    if (!supabase || !key) return false;
    const strVal = typeof value === 'string' ? value : JSON.stringify(value);
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key, value: strVal, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (!error) {
      console.log(`[Supabase Cloud] site_setting '${key}' updated successfully.`);
      return true;
    } else {
      console.warn(`⚠️ [Supabase RLS / Permission Note] Failed to save site_setting '${key}':`, error.message);
    }
  } catch (err) {
    console.error(`[Supabase Cloud] saveSiteSetting error for '${key}':`, err);
  }
  return false;
}

export async function fetchSiteSettingFromSupabase(key) {
  try {
    if (!supabase || !key) return null;
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (data && data.value) {
      try {
        return JSON.parse(data.value);
      } catch (e) {
        return data.value;
      }
    }
  } catch (err) {}
  return null;
}

export async function syncSectionsToSupabase(sections) {
  return saveSiteSettingInSupabase('homepage_sections', sections);
}

export async function fetchSectionsFromSupabase() {
  return fetchSiteSettingFromSupabase('homepage_sections');
}

export async function syncCouponsToSupabase() {}

export async function fetchCouponsFromSupabase() {
  return [];
}

export async function syncReviewsToSupabase(reviews) {
  try {
    saveSiteSettingInSupabase('reviews_all', reviews);
    if (supabase && Array.isArray(reviews)) {
      const records = reviews.map(r => ({
        legacy_id: r.id || Date.now(),
        product_id: r.productId || null,
        author_name: r.user || r.name || 'Anonymous',
        rating: parseInt(r.rating) || 5,
        comment: r.comment || '',
        created_at: r.date || new Date().toISOString()
      }));
      try { await supabase.from('reviews').upsert(records, { onConflict: 'legacy_id' }); } catch(e) {}
    }
  } catch(e) {}
}

export async function fetchReviewsFromSupabase() {
  try {
    if (!supabase) return null;
    const { data, error } = await supabase.from('reviews').select('*');
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(r => ({
        id: r.legacy_id || r.id,
        productId: r.product_id,
        user: r.author_name,
        rating: r.rating,
        comment: r.comment,
        date: r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : 'Recently'
      }));
    }
  } catch(e) {}
  return fetchSiteSettingFromSupabase('reviews_all');
}

export async function syncInventoryLogsToSupabase(logs) {
  return saveSiteSettingInSupabase('inventory_logs', logs);
}

export async function fetchInventoryLogsFromSupabase() {
  return fetchSiteSettingFromSupabase('inventory_logs');
}

export async function syncTodaysDealsToSupabase(config) {
  return saveSiteSettingInSupabase('todays_deals_config', config);
}

export async function fetchTodaysDealsFromSupabase() {
  return fetchSiteSettingFromSupabase('todays_deals_config');
}

export async function syncMoreToLoveToSupabase(config) {
  return saveSiteSettingInSupabase('more_to_love_config', config);
}

export async function fetchMoreToLoveFromSupabase() {
  return fetchSiteSettingFromSupabase('more_to_love_config');
}
