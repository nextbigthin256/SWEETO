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

      sessionStorage.setItem('SWEETOS_products', JSON.stringify(formatted));
      return formatted;
    } else if (data && data.length === 0) {
      // Explicitly empty database (user wiped or permanently deleted products)
      sessionStorage.setItem('SWEETOS_products', JSON.stringify([]));
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
      sessionStorage.setItem('SWEETOS_categories', JSON.stringify(data));
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
      sessionStorage.setItem('SWEETOS_brands', JSON.stringify(data));
      return data;
    }
  } catch (e) {}
  return null;
}

// ==========================================
// 4. ORDERS CREATION & SYNC
// ==========================================

export async function createOrderInSupabase(newOrder) {
  try {
    if (!supabase || !newOrder) return null;
    const orderId = newOrder.id || ('ORD-' + Math.floor(100000 + Math.random() * 900000));
    
    // 1. Try to upsert into Supabase orders table
    try {
      const record = {
        order_number: orderId,
        customer_name: newOrder.customerName || 'Customer',
        customer_email: (newOrder.customerEmail || '').toLowerCase(),
        customer_phone: newOrder.customerPhone || '',
        customer_address: newOrder.customerAddress || '',
        total_amount: parseFloat(newOrder.total) || 0,
        status: newOrder.status || 'Pending',
        payment_method: newOrder.paymentMethod || 'cod',
        shipping_notes: newOrder.items || ''
      };
      await supabase.from('orders').upsert([record], { onConflict: 'order_number' });
    } catch(e) {}

    // 2. Upsert order into Supabase profiles table (embedded orders array)
    if (newOrder.customerEmail) {
      const emailLower = newOrder.customerEmail.toLowerCase();
      const { data: p } = await supabase.from('profiles').select('*').eq('email', emailLower).maybeSingle();
      
      let pOrders = [];
      if (p && p.orders) {
        pOrders = Array.isArray(p.orders) ? p.orders : (typeof p.orders === 'string' ? JSON.parse(p.orders) : []);
      }
      
      const existingIdx = pOrders.findIndex(o => o.id === orderId);
      if (existingIdx > -1) {
        pOrders[existingIdx] = newOrder;
      } else {
        pOrders.unshift(newOrder);
      }

      const totalSpent = pOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
      
      await supabase.from('profiles').upsert([{
        email: emailLower,
        full_name: newOrder.customerName || p?.full_name || '',
        phone: newOrder.customerPhone || p?.phone || '',
        orders_count: pOrders.length,
        total_spent: totalSpent,
        orders: pOrders
      }], { onConflict: 'email' });
    }

    console.log('[Supabase Cloud] Order created & synced successfully:', orderId);
    return newOrder;
  } catch (err) {
    console.error('[Supabase Cloud] createOrder error:', err);
    return null;
  }
}

export async function fetchOrdersFromSupabase(userEmail = null) {
  try {
    if (!supabase) return [];
    
    let allOrders = [];

    // 1. Fetch from profiles table (embedded orders arrays for all users)
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
            if (o && o.id && !allOrders.some(existing => existing.id === o.id)) {
              allOrders.push(o);
            }
          });
        }
      });
    }

    // 2. Fetch from dedicated orders table
    let oQuery = supabase.from('orders').select('*');
    if (userEmail) {
      oQuery = oQuery.eq('customer_email', userEmail.toLowerCase());
    }
    const { data: cloudOrders } = await oQuery;
    if (cloudOrders && cloudOrders.length > 0) {
      cloudOrders.forEach(co => {
        const id = co.order_number || co.id;
        if (id && !allOrders.some(existing => existing.id === id)) {
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
        }
      });
    }

    return allOrders;
  } catch (err) {
    console.error('[Supabase Cloud] fetchOrders error:', err);
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
      if (s.store_name) sessionStorage.setItem('SWEETOS_store_name', s.store_name);
      if (s.hero_title) sessionStorage.setItem('SWEETOS_hero_title', s.hero_title);
      if (s.hero_subtitle) sessionStorage.setItem('SWEETOS_hero_subtitle', s.hero_subtitle);
      if (s.store_entrance_image) sessionStorage.setItem('SWEETOS_store_entrance_image', s.store_entrance_image);
      if (s.currency) sessionStorage.setItem('SWEETOS_currency', s.currency);

      window.dispatchEvent(new CustomEvent('branding:updated'));
      return s;
    }
  } catch(e) {}
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

    const safeKey = emailLower.replace(/[^a-zA-Z0-9]/g, '_');
    let existing = null;
    try {
      existing = JSON.parse(sessionStorage.getItem(`SWEETOS_user_profile_${safeKey}`) || sessionStorage.getItem('SWEETOS_user_profile') || 'null');
    } catch(e) {}

    let formattedOrders = existing?.orders || [];
    if (cloudOrders && cloudOrders.length > 0) {
      const mergedMap = new Map();
      
      // Add existing local orders first
      (existing?.orders || []).forEach(o => {
        if (o && o.id) mergedMap.set(o.id, o);
      });

      // Merge Cloud orders
      cloudOrders.forEach(o => {
        const id = o.order_number || o.id;
        if (id) {
          const itemsStr = o.items || (o.products || []).map(p => `${p.name} (x${p.quantity || 1})`).join(', ') || (o.shipping_notes || 'Commande SWEETOS');
          mergedMap.set(id, {
            id: id,
            date: o.created_at ? new Date(o.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : (o.date || 'Récemment'),
            status: o.status === 'pending' ? 'Processing' : (o.status === 'completed' ? 'Delivered' : (o.status === 'shipped' ? 'Shipped' : (o.status || 'Pending'))),
            total: parseFloat(o.total_amount || o.total) || 0,
            items: itemsStr,
            itemsCount: (o.order_items || []).reduce((sum, item) => sum + (item.quantity || 1), 0) || (o.products || []).length || 1,
            products: o.products || (o.order_items || []).map(item => ({
              name: item.product_name,
              price: parseFloat(item.unit_price) || 0,
              quantity: item.quantity || 1,
              selectedColor: item.selected_color || '',
              image: item.item_image || ''
            })),
            customerName: o.customer_name || o.customerName || 'Client',
            customerPhone: o.customer_phone || o.customerPhone || '',
            customerAddress: typeof o.customer_address === 'string' ? o.customer_address : (o.customerAddress || o.customer_address?.street || ''),
            paymentMethod: o.payment_method || o.paymentMethod || 'cod'
          });
        }
      });

      formattedOrders = Array.from(mergedMap.values());
    }

    if (pData || formattedOrders.length > 0) {
      const profile = {
        firstName: pData?.first_name || existing?.firstName || 'Client',
        lastName: pData?.last_name || existing?.lastName || '',
        email: emailLower,
        phone: pData?.phone || existing?.phone || '',
        avatar: pData?.avatar_url || existing?.avatar || '',
        role: pData?.role || 'customer',
        loyaltyLevel: pData?.loyalty_level || 'starter',
        addresses: pData?.addresses || existing?.addresses || [],
        orders: formattedOrders
      };
      sessionStorage.setItem('SWEETOS_user_profile', JSON.stringify(profile));
      sessionStorage.setItem(`SWEETOS_user_profile_${safeKey}`, JSON.stringify(profile));
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

export async function initSupabaseSync() {
  console.log('[Supabase] Connected to live cloud database:', SUPABASE_URL);
  
  // Start OAuth session listener
  initSupabaseAuthListener();

  // Sync logged in user profile if available
  try {
    const loggedUserStr = sessionStorage.getItem('SWEETOS_logged_in_user');
    if (loggedUserStr) {
      const loggedUser = JSON.parse(loggedUserStr);
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

              const safeKey = email.replace(/[^a-zA-Z0-9]/g, '_');
              const existingProfileStr = sessionStorage.getItem(`SWEETOS_user_profile_${safeKey}`) || sessionStorage.getItem('SWEETOS_user_profile');
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

              sessionStorage.setItem('SWEETOS_user_profile', JSON.stringify(profile));
              sessionStorage.setItem(`SWEETOS_user_profile_${safeKey}`, JSON.stringify(profile));
              sessionStorage.setItem('SWEETOS_logged_in_user', JSON.stringify({ email }));
              sessionStorage.setItem('SWEETOS_auth_token', tokenResponse.access_token);

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
        const existingProfileStr = sessionStorage.getItem(`SWEETOS_user_profile_${safeKey}`) || sessionStorage.getItem('SWEETOS_user_profile');
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

        sessionStorage.setItem('SWEETOS_user_profile', JSON.stringify(profile));
        sessionStorage.setItem(`SWEETOS_user_profile_${safeKey}`, JSON.stringify(profile));
        sessionStorage.setItem('SWEETOS_logged_in_user', JSON.stringify({ email }));
        if (session.access_token) {
          sessionStorage.setItem('SWEETOS_auth_token', session.access_token);
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

    // 1. Try native Supabase Auth password sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword
    });

    if (!authError && authData && authData.user) {
      console.log('[Supabase Cloud Auth] Authenticated via Supabase Auth API:', cleanEmail);
      return { success: true, user: authData.user, session: authData.session };
    }

    // 2. Dynamic check against site_settings table (admin_email & admin_key)
    const { data: settings } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['admin_email', 'admin_key']);

    if (Array.isArray(settings) && settings.length > 0) {
      const emailSetting = settings.find(s => s.key === 'admin_email')?.value;
      const keySetting = settings.find(s => s.key === 'admin_key')?.value;

      if (emailSetting && keySetting) {
        if (cleanEmail === emailSetting.trim().toLowerCase() && cleanPassword === keySetting.trim()) {
          console.log('[Supabase Cloud Auth] Authenticated via site_settings table:', cleanEmail);
          return { success: true, user: { email: cleanEmail, role: 'admin' } };
        }
      }
    }

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
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (!error && Array.isArray(data)) {
      const formatted = data.map(p => ({
        name: p.full_name || p.name || p.email?.split('@')[0] || 'Client',
        email: p.email,
        phone: p.phone || '',
        addresses: p.address ? [p.address] : [],
        ordersCount: p.orders_count || 0,
        totalSpent: p.total_spent || 0,
        registrationDate: p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '2026',
        badgeType: p.badge_type || 'none',
        level: p.level || 'starter',
        unlockedBadges: p.unlocked_badges || []
      }));
      return formatted;
    }
  } catch (e) {
    console.error('[Supabase Customers Fetch Error]:', e);
  }
  return null;
}

export async function saveCustomerToSupabase(customerData) {
  try {
    if (!supabase || !customerData.email) return;
    const record = {
      email: customerData.email,
      full_name: customerData.name || customerData.fullname || '',
      phone: customerData.phone || '',
      badge_type: customerData.badgeType || 'none',
      level: customerData.level || 'starter',
      unlocked_badges: customerData.unlockedBadges || []
    };
    await supabase.from('profiles').upsert([record], { onConflict: 'email' });
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

// ==========================================
// 9. DYNAMIC 3-DIGIT PIN & MULTI-DEVICE SESSION ENGINE
// ==========================================

/**
 * Retrieves the 3-Digit Security PIN dynamically from Supabase Cloud site_settings.
 * Default initial PIN if not yet configured in DB: '256'
 */
export async function getAdminSecurityPinFromSupabase() {
  try {
    if (!supabase) return sessionStorage.getItem('SWEETOS_admin_security_pin') || '256';

    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'admin_security_pin')
      .maybeSingle();

    if (data && data.value) {
      sessionStorage.setItem('SWEETOS_admin_security_pin', data.value);
      return data.value;
    }
  } catch (err) {
    console.warn('[Supabase PIN Fetch Notice]:', err);
  }
  return sessionStorage.getItem('SWEETOS_admin_security_pin') || '256';
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
    sessionStorage.setItem('SWEETOS_admin_security_pin', cleanPin);

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

    // Save in sessionStorage
    sessionStorage.setItem('SWEETOS_admin_session_version', newSessionVersion);
    sessionStorage.setItem('SWEETOS_admin_device_session_version', newSessionVersion);
    sessionStorage.setItem('SWEETOS_admin_primary_device_id', currentDeviceId);

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
        const arr = input.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
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

export async function syncCouponsToSupabase(coupons) {
  try {
    saveSiteSettingInSupabase('coupons', coupons);
    if (supabase && Array.isArray(coupons)) {
      const records = coupons.map(c => ({
        code: c.code,
        discount_type: c.type || 'percentage',
        discount_value: parseFloat(c.value) || 0,
        min_order_amount: parseFloat(c.minOrder) || 0,
        usage_limit: c.limit ? parseInt(c.limit) : 50,
        used_count: c.used ? parseInt(c.used) : 0,
        expires_at: c.expiry || null,
        status: c.status || 'active'
      }));
      await supabase.from('coupons').upsert(records, { onConflict: 'code' }).catch(() => {});
    }
  } catch(e) {}
}

export async function fetchCouponsFromSupabase() {
  try {
    if (!supabase) return null;
    const { data, error } = await supabase.from('coupons').select('*');
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(c => ({
        code: c.code,
        type: c.discount_type || 'percentage',
        value: parseFloat(c.discount_value) || 0,
        minOrder: parseFloat(c.min_order_amount) || 0,
        limit: c.usage_limit || 50,
        used: c.used_count || 0,
        expiry: c.expires_at || '2026-12-31',
        status: c.status || 'active'
      }));
    }
  } catch(e) {}
  return fetchSiteSettingFromSupabase('coupons');
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
      await supabase.from('reviews').upsert(records, { onConflict: 'legacy_id' }).catch(() => {});
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
