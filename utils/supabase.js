// Supabase Client & Backend Synchronization Engine
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import initialProducts from '../data/products.js';

export const SUPABASE_URL = 'https://euuzsxjsmsktegilbqpv.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1dXpzeGpzbXNrdGVnaWxicXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzIyMzcsImV4cCI6MjEwMzQwODIzN30.BJtkw4BBkAytc5vDSr8a0dOmUyGk_1xfpdHK3sEHwHs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 1. PRODUCTS SYNC & CRUD
// ==========================================

export async function fetchProductsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[Supabase] Could not fetch products, falling back to local:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      const formatted = data.map(p => ({
        id: p.legacy_id || p.id,
        uuid: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: parseFloat(p.price) || 0,
        originalPrice: p.original_price ? parseFloat(p.original_price) : null,
        category: p.category_name || '',
        subcategory: p.subcategory_name || '',
        brand: p.brand_name || '',
        image: p.image,
        gallery: p.gallery || [],
        colors: p.colors || [],
        specs: p.specs || {},
        stock: p.stock ?? 10,
        inStock: p.in_stock ?? true,
        isBestseller: p.is_bestseller ?? false,
        isHotDeal: p.is_hot_deal ?? false,
        isNew: p.is_new ?? false,
        rating: p.rating ? parseFloat(p.rating) : 5.0,
        reviews: p.reviews_count ?? 0
      }));

      localStorage.setItem('SWEETOS_products', JSON.stringify(formatted));
      return formatted;
    } else if (data && data.length === 0) {
      // Explicitly empty database (user wiped or permanently deleted products)
      localStorage.setItem('SWEETOS_products', JSON.stringify([]));
      return [];
    }
    return null;
  } catch (err) {
    console.error('[Supabase] fetchProducts error:', err);
    return null;
  }
}

export async function deleteProductPermanentlyFromSupabase(productOrId) {
  try {
    if (!supabase) return false;
    let query = supabase.from('products').delete();

    if (typeof productOrId === 'object' && productOrId !== null) {
      const conditions = [];
      if (productOrId.id) conditions.push(`legacy_id.eq.${productOrId.id}`);
      if (productOrId.name) conditions.push(`name.eq.${encodeURIComponent(productOrId.name)}`);
      if (productOrId.slug) conditions.push(`slug.eq.${encodeURIComponent(productOrId.slug)}`);

      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      } else {
        query = query.eq('legacy_id', productOrId.id);
      }
    } else if (typeof productOrId === 'number') {
      query = query.eq('legacy_id', productOrId);
    } else if (typeof productOrId === 'string') {
      query = query.or(`slug.eq.${productOrId},name.eq.${productOrId}`);
    }

    const { error } = await query;
    if (error) {
      console.warn('[Supabase] Permanent product delete warning:', error.message);
      return false;
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
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data && data.length > 0) {
      localStorage.setItem('SWEETOS_categories', JSON.stringify(data));
      return data;
    }
  } catch (e) {}
  return null;
}

// ==========================================
// 3. BRANDS SYNC & CRUD
// ==========================================

export async function fetchBrandsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data && data.length > 0) {
      localStorage.setItem('SWEETOS_brands', JSON.stringify(data));
      return data;
    }
  } catch (e) {}
  return null;
}

// ==========================================
// 4. ORDERS CREATION & SYNC
// ==========================================

export async function createOrderInSupabase(orderData) {
  try {
    const orderRecord = {
      order_number: orderData.orderNumber || 'SW-' + Math.floor(100000 + Math.random() * 900000),
      customer_name: orderData.customerName || orderData.customer?.name || 'Customer',
      customer_email: orderData.customerEmail || orderData.customer?.email || '',
      customer_phone: orderData.customerPhone || orderData.customer?.phone || '',
      customer_address: orderData.address || orderData.shippingAddress || {},
      total_amount: orderData.totalAmount || orderData.total || 0,
      currency: orderData.currency || 'FCFA',
      discount_amount: orderData.discount || 0,
      coupon_code: orderData.coupon || '',
      status: 'pending',
      payment_method: orderData.paymentMethod || 'cash_on_delivery',
      payment_status: orderData.paymentStatus || 'unpaid',
      shipping_notes: orderData.notes || ''
    };

    const { data: insertedOrder, error: orderErr } = await supabase
      .from('orders')
      .insert([orderRecord])
      .select();

    if (orderErr) throw orderErr;

    const orderId = insertedOrder?.[0]?.id;

    if (orderId && Array.isArray(orderData.items) && orderData.items.length > 0) {
      const itemRecords = orderData.items.map(item => ({
        order_id: orderId,
        product_name: item.name || item.title || 'Product',
        unit_price: item.price || 0,
        quantity: item.quantity || 1,
        selected_color: item.selectedColor || item.color || '',
        item_image: item.image || '',
        total_price: (item.price || 0) * (item.quantity || 1)
      }));

      await supabase.from('order_items').insert(itemRecords);
    }

    return insertedOrder?.[0];
  } catch (err) {
    console.error('[Supabase] createOrder error:', err);
    return null;
  }
}

export async function fetchOrdersFromSupabase(userEmail = null) {
  try {
    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (userEmail) {
      query = query.eq('customer_email', userEmail);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[Supabase] fetchOrders error:', err);
    return [];
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
  } catch(e) {}
  return null;
}

// ==========================================
// 6. GLOBAL INITIALIZATION & REALTIME
// ==========================================

export async function initSupabaseSync() {
  console.log('[Supabase] Connected to live cloud database:', SUPABASE_URL);
  
  // Start OAuth session listener
  initSupabaseAuthListener();

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

export function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch(e) {
    return null;
  }
}

export function handleGoogleGISCredential(credentialResponse) {
  if (!credentialResponse || !credentialResponse.credential) return;
  const payload = parseJwt(credentialResponse.credential);
  if (!payload) return;

  const email = (payload.email || '').toLowerCase();
  const firstName = payload.given_name || payload.name?.split(' ')[0] || 'Client';
  const lastName = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '';
  const avatarUrl = payload.picture || '';

  const safeKey = email.replace(/[^a-zA-Z0-9]/g, '_');
  const existingProfileStr = localStorage.getItem(`SWEETOS_user_profile_${safeKey}`) || localStorage.getItem('SWEETOS_user_profile');
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

  localStorage.setItem('SWEETOS_user_profile', JSON.stringify(profile));
  localStorage.setItem(`SWEETOS_user_profile_${safeKey}`, JSON.stringify(profile));
  localStorage.setItem('SWEETOS_logged_in_user', JSON.stringify({ email }));
  localStorage.setItem('SWEETOS_auth_token', credentialResponse.credential);

  // Sync to Supabase profiles table
  try {
    supabase.from('profiles').upsert({
      email,
      first_name: profile.firstName,
      last_name: profile.lastName,
      avatar_url: avatarUrl,
      role: 'customer'
    }, { onConflict: 'email' });
  } catch(e) {}

  window.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true, email, user: profile } }));
  window.dispatchEvent(new CustomEvent('auth:login', { detail: profile }));
  window.dispatchEvent(new CustomEvent('toast:show', { detail: `Bon retour, ${profile.firstName} ! Connecté via Google 🚀` }));
}

export function initGoogleOneTap() {
  if (typeof window === 'undefined') return;
  if (typeof window.google === 'undefined' || !window.google.accounts || !window.google.accounts.id) {
    setTimeout(initGoogleOneTap, 600);
    return;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleGISCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin'
    });

    window.google.accounts.id.prompt();
  } catch(e) {
    console.warn('[Google One Tap Init Notice]:', e);
  }
}

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

              const safeKey = email.replace(/[^a-zA-Z0-9]/g, '_');
              const existingProfileStr = localStorage.getItem(`SWEETOS_user_profile_${safeKey}`) || localStorage.getItem('SWEETOS_user_profile');
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

              localStorage.setItem('SWEETOS_user_profile', JSON.stringify(profile));
              localStorage.setItem(`SWEETOS_user_profile_${safeKey}`, JSON.stringify(profile));
              localStorage.setItem('SWEETOS_logged_in_user', JSON.stringify({ email }));
              localStorage.setItem('SWEETOS_auth_token', tokenResponse.access_token);

              // Sync user profile to Supabase profiles table
              try {
                await supabase.from('profiles').upsert({
                  email,
                  first_name: profile.firstName,
                  last_name: profile.lastName,
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

      client.requestAccessToken({ prompt: 'select_account' });
      return;
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
  // Also initialize Google One Tap on page load
  initGoogleOneTap();

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

        const safeKey = email.replace(/[^a-zA-Z0-9]/g, '_');
        const existingProfileStr = localStorage.getItem(`SWEETOS_user_profile_${safeKey}`) || localStorage.getItem('SWEETOS_user_profile');
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

        localStorage.setItem('SWEETOS_user_profile', JSON.stringify(profile));
        localStorage.setItem(`SWEETOS_user_profile_${safeKey}`, JSON.stringify(profile));
        localStorage.setItem('SWEETOS_logged_in_user', JSON.stringify({ email }));
        if (session.access_token) {
          localStorage.setItem('SWEETOS_auth_token', session.access_token);
        }

        // Sync user profile to Supabase profiles table
        try {
          await supabase.from('profiles').upsert({
            id: u.id,
            email,
            first_name: profile.firstName,
            last_name: profile.lastName,
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
