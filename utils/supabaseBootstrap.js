import { 
  fetchProductsFromSupabase, 
  fetchCategoriesFromSupabase, 
  fetchBrandsFromSupabase, 
  fetchOrdersFromSupabase, 
  fetchCustomersFromSupabase,
  fetchSectionsFromSupabase
} from './supabase.js';
import { getDeletedItemSet } from './storage.js';

/**
 * Merge cloud list with local storage list.
 * LOCAL WINS on conflict — protects unsynced admin additions.
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
  console.log('🚀 [Supabase Cloud] Bootstrapping complete store database from Cloud...');

  try {
    const [prods, cats, brands, ords, custs, secs] = await Promise.allSettled([
      fetchProductsFromSupabase(),
      fetchCategoriesFromSupabase(),
      fetchBrandsFromSupabase(),
      fetchOrdersFromSupabase(),
      fetchCustomersFromSupabase(),
      fetchSectionsFromSupabase()
    ]);

    const deletedProds  = getDeletedItemSet('products');
    const deletedCats   = getDeletedItemSet('categories');
    const deletedBrands = getDeletedItemSet('brands');

    const delProdsLower  = new Set(Array.from(deletedProds).map(s  => String(s).toLowerCase().trim()));
    const delCatsLower   = new Set(Array.from(deletedCats).map(s   => String(s).toLowerCase().trim()));
    const delBrandsLower = new Set(Array.from(deletedBrands).map(s => String(s).toLowerCase().trim()));

    let loadedAny = false;

    // ---------- PRODUCTS ----------
    const cloudProds = (prods.status === 'fulfilled' && Array.isArray(prods.value)) ? prods.value : [];
    {
      const mergedProds = mergeWithLocal(
        cloudProds,
        'SWEETOS_products',
        p => (p && p.id !== undefined && p.id !== null) ? String(p.id) : null,
        delProdsLower
      );

      // Safety net: include context.products items not already merged
      if (Array.isArray(context.products)) {
        const seen = new Set(mergedProds.map(p => String(p.id)));
        context.products.forEach(p => {
          if (p && p.id != null && !seen.has(String(p.id))) mergedProds.push(p);
        });
      }

      if (mergedProds.length > 0 || cloudProds.length > 0) {
        context.products = mergedProds;
        try { localStorage.setItem('SWEETOS_products', JSON.stringify(mergedProds)); } catch(e) {}
        console.log('✅ [Supabase Cloud] Products loaded/merged:', mergedProds.length);
        loadedAny = true;
      }
    }

    // ---------- CATEGORIES ----------
    const cloudCats = (cats.status === 'fulfilled' && Array.isArray(cats.value)) ? cats.value : [];
    {
      const keyOfCat = c => {
        if (!c) return null;
        const k = c.slug || c.name || c.id;
        return k ? String(k).toLowerCase().trim() : null;
      };
      const mergedCats = mergeWithLocal(cloudCats, 'SWEETOS_categories', keyOfCat, delCatsLower);

      if (Array.isArray(context.categories)) {
        const seen = new Set(mergedCats.map(c => keyOfCat(c)));
        context.categories.forEach(c => {
          const k = keyOfCat(c);
          if (k && !seen.has(k)) mergedCats.push(c);
        });
      }

      if (mergedCats.length > 0 || cloudCats.length > 0) {
        context.categories = mergedCats;
        try { localStorage.setItem('SWEETOS_categories', JSON.stringify(mergedCats)); } catch(e) {}
        console.log('✅ [Supabase Cloud] Categories loaded/merged:', mergedCats.length);
        loadedAny = true;
      }
    }

    // ---------- BRANDS ----------
    const cloudBrands = (brands.status === 'fulfilled' && Array.isArray(brands.value)) ? brands.value : [];
    {
      const keyOfBrand = b => {
        if (!b) return null;
        const k = b.slug || b.name || b.id;
        return k ? String(k).toLowerCase().trim() : null;
      };
      const mergedBrands = mergeWithLocal(cloudBrands, 'SWEETOS_brands', keyOfBrand, delBrandsLower);

      if (Array.isArray(context.brands)) {
        const seen = new Set(mergedBrands.map(b => keyOfBrand(b)));
        context.brands.forEach(b => {
          const k = keyOfBrand(b);
          if (k && !seen.has(k)) mergedBrands.push(b);
        });
      }

      if (mergedBrands.length > 0 || cloudBrands.length > 0) {
        context.brands = mergedBrands;
        try { localStorage.setItem('SWEETOS_brands', JSON.stringify(mergedBrands)); } catch(e) {}
        console.log('✅ [Supabase Cloud] Brands loaded/merged:', mergedBrands.length);
        loadedAny = true;
      }
    }

    // ---------- ORDERS ----------
    if (ords.status === 'fulfilled' && Array.isArray(ords.value) && ords.value.length > 0) {
      const localOrds = context.orders || [];
      const ordersMap = new Map();
      localOrds.forEach(o => { if (o && (o.id || o.order_number)) ordersMap.set(o.id || o.order_number, o); });
      ords.value.forEach(co => {
        if (co && (co.id || co.order_number)) {
          const key = co.id || co.order_number;
          if (!ordersMap.has(key)) {
            ordersMap.set(key, co);
          } else {
            const lo = ordersMap.get(key);
            const loTime = new Date(lo.updatedAt || lo.createdAt || lo.date || 0).getTime();
            const coTime = new Date(co.updatedAt || co.createdAt || co.date || 0).getTime();
            if (coTime >= loTime || !lo.updatedAt) {
              ordersMap.set(key, { ...lo, ...co });
            }
          }
        }
      });
      context.orders = Array.from(ordersMap.values());
      context.orders.sort((a, b) => {
        const tA = new Date(a.updatedAt || a.createdAt || a.date || 0).getTime();
        const tB = new Date(b.updatedAt || b.createdAt || b.date || 0).getTime();
        return tB - tA;
      });
      console.log('✅ [Supabase Cloud] Orders loaded:', context.orders.length);
      loadedAny = true;
    }

    // ---------- CUSTOMERS ----------
    if (custs.status === 'fulfilled' && Array.isArray(custs.value) && custs.value.length > 0) {
      context.customers = custs.value;
      console.log('✅ [Supabase Cloud] Customers loaded:', context.customers.length);
      loadedAny = true;
    }

    // ---------- SECTIONS ----------
    if (secs.status === 'fulfilled' && Array.isArray(secs.value) && secs.value.length > 0) {
      context.homepageSections = secs.value;
      console.log('✅ [Supabase Cloud] Homepage Sections loaded:', context.homepageSections.length);
      loadedAny = true;
    }

    if (loadedAny) {
      console.log('🎉 [Supabase Cloud] Successfully bootstrapped store data!');
      return true;
    }
  } catch (err) {
    console.error('❌ [Supabase Cloud] Bootstrap error:', err);
  }

  return false;
}
