import { 
  fetchProductsFromSupabase, 
  fetchCategoriesFromSupabase, 
  fetchBrandsFromSupabase, 
  fetchOrdersFromSupabase, 
  fetchCustomersFromSupabase,
  fetchSectionsFromSupabase
} from './supabase.js';
import { getDeletedItemSet, saveStorageItem } from './storage.js';

/**
 * Merge cloud list with local storage list.
 * CLOUD WINS on conflict (Cloud ground truth). Unsynced local additions fill gaps.
 */
function mergeWithLocal(cloudList, localRawKey, keyOf, deletedSet) {
  let localList = [];
  try {
    const raw = localStorage.getItem(localRawKey);
    if (raw) localList = JSON.parse(raw) || [];
  } catch(e) {}
  if (!Array.isArray(localList)) localList = [];

  const map = new Map();

  // 1. Cloud items first — Cloud ground truth wins on conflict for existing items
  (cloudList || []).forEach(item => {
    const k = keyOf(item);
    if (!k) return;
    const nameLower = item && item.name ? String(item.name).toLowerCase().trim() : null;
    if (deletedSet && (deletedSet.has(k) || (nameLower && deletedSet.has(nameLower)))) return;
    map.set(k, item);
  });

  // 2. Local unsynced items only fill gaps if not present in Cloud
  localList.forEach(item => {
    const k = keyOf(item);
    if (!k) return;
    const nameLower = item && item.name ? String(item.name).toLowerCase().trim() : null;
    if (deletedSet && (deletedSet.has(k) || (nameLower && deletedSet.has(nameLower)))) return;
    if (!map.has(k)) {
      map.set(k, item);
    }
  });

  return Array.from(map.values());
}

export async function bootstrapFromSupabase(context) {
  console.log('🚀 [Supabase Cloud] Bootstrapping complete store database directly from Cloud ground truth...');

  try {
    const [prods, cats, brands, ords, custs, secs] = await Promise.allSettled([
      fetchProductsFromSupabase(),
      fetchCategoriesFromSupabase(),
      fetchBrandsFromSupabase(),
      fetchOrdersFromSupabase(),
      fetchCustomersFromSupabase(),
      fetchSectionsFromSupabase()
    ]);

    let loadedAny = false;

    // ---------- PRODUCTS ----------
    if (prods.status === 'fulfilled' && Array.isArray(prods.value) && prods.value.length > 0) {
      context.products = prods.value;
      console.log('✅ [Supabase Cloud] Products loaded directly from Cloud:', prods.value.length);
      loadedAny = true;
    }

    // ---------- CATEGORIES ----------
    if (cats.status === 'fulfilled' && Array.isArray(cats.value) && cats.value.length > 0) {
      context.categories = cats.value;
      console.log('✅ [Supabase Cloud] Categories loaded directly from Cloud:', cats.value.length);
      loadedAny = true;
    }

    // ---------- BRANDS ----------
    if (brands.status === 'fulfilled' && Array.isArray(brands.value) && brands.value.length > 0) {
      context.brands = brands.value;
      console.log('✅ [Supabase Cloud] Brands loaded directly from Cloud:', brands.value.length);
      loadedAny = true;
    }

    // ---------- ORDERS ----------
    if (ords.status === 'fulfilled' && Array.isArray(ords.value) && ords.value.length > 0) {
      context.orders = ords.value;
      console.log('✅ [Supabase Cloud] Orders loaded directly from Cloud:', ords.value.length);
      loadedAny = true;
    }

    // ---------- CUSTOMERS ----------
    if (custs.status === 'fulfilled' && Array.isArray(custs.value) && custs.value.length > 0) {
      context.customers = custs.value;
      console.log('✅ [Supabase Cloud] Customers loaded directly from Cloud:', custs.value.length);
      loadedAny = true;
    }

    // ---------- SECTIONS ----------
    if (secs.status === 'fulfilled' && Array.isArray(secs.value) && secs.value.length > 0) {
      context.homepageSections = secs.value;
      console.log('✅ [Supabase Cloud] Homepage Sections loaded directly from Cloud:', secs.value.length);
      loadedAny = true;
    }

    if (loadedAny) {
      console.log('🎉 [Supabase Cloud] Successfully bootstrapped store data directly from Cloud!');
      return true;
    }
  } catch (err) {
    console.error('❌ [Supabase Cloud] Bootstrap error:', err);
  }

  return false;
}
