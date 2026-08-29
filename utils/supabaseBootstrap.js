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
      context.orders = ords.value;
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
