import { 
  fetchProductsFromSupabase, 
  fetchCategoriesFromSupabase, 
  fetchBrandsFromSupabase, 
  fetchOrdersFromSupabase, 
  fetchCustomersFromSupabase,
  fetchCouponsFromSupabase,
  fetchSectionsFromSupabase
} from './supabase.js';

export async function bootstrapFromSupabase(context) {
  console.log('🚀 [Supabase Cloud] Bootstrapping complete store database from Cloud...');

  try {
    const [prods, cats, brands, ords, custs, cpps, secs] = await Promise.allSettled([
      fetchProductsFromSupabase(),
      fetchCategoriesFromSupabase(),
      fetchBrandsFromSupabase(),
      fetchOrdersFromSupabase(),
      fetchCustomersFromSupabase(),
      fetchCouponsFromSupabase(),
      fetchSectionsFromSupabase()
    ]);

    let loadedAny = false;

    if (prods.status === 'fulfilled' && Array.isArray(prods.value) && prods.value.length > 0) {
      context.products = prods.value;
      console.log('✅ [Supabase Cloud] Products loaded:', context.products.length);
      loadedAny = true;
    }

    if (cats.status === 'fulfilled' && Array.isArray(cats.value) && cats.value.length > 0) {
      context.categories = cats.value;
      console.log('✅ [Supabase Cloud] Categories loaded:', context.categories.length);
      loadedAny = true;
    }

    if (brands.status === 'fulfilled' && Array.isArray(brands.value) && brands.value.length > 0) {
      context.brands = brands.value;
      console.log('✅ [Supabase Cloud] Brands loaded:', context.brands.length);
      loadedAny = true;
    }

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

    if (custs.status === 'fulfilled' && Array.isArray(custs.value) && custs.value.length > 0) {
      context.customers = custs.value;
      console.log('✅ [Supabase Cloud] Customers loaded:', context.customers.length);
      loadedAny = true;
    }

    if (cpps.status === 'fulfilled' && Array.isArray(cpps.value) && cpps.value.length > 0) {
      context.coupons = cpps.value;
      console.log('✅ [Supabase Cloud] Coupons loaded:', context.coupons.length);
      loadedAny = true;
    }

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
