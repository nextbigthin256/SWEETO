// supabase/functions/og-product/index.ts
// Supabase Edge Function: Generates static Open Graph (OG) HTML for WhatsApp & Social Crawlers
// Deno / TypeScript Edge Runtime

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const APP_URL = Deno.env.get("APP_URL") || "https://sweetos.store"; // Change to your primary domain

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatPrice(price: number | string): string {
  if (price === null || price === undefined || isNaN(Number(price))) return "0 FCFA";
  return `${Number(price).toLocaleString("fr-FR")} FCFA`;
}

serve(async (req: Request) => {
  const url = new URL(req.url);
  
  // Extract product ID from query parameter ?id=... or URL path /og-product/:id
  let productId = url.searchParams.get("id") || url.searchParams.get("product");
  if (!productId) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length > 1 && parts[0] === "og-product") {
      productId = parts[1];
    }
  }

  if (!productId) {
    return new Response("Product ID missing", { status: 400 });
  }

  let product: any = null;

  // 1. Fetch product from Supabase 'products' Postgres table
  try {
    const isNum = !isNaN(Number(productId));
    let query = supabase.from("products").select("*");
    if (isNum) {
      query = query.or(`legacy_id.eq.${productId},id.eq.${productId}`);
    } else {
      query = query.or(`slug.eq.${productId},id.eq.${productId}`);
    }
    const { data } = await query.maybeSingle();
    if (data) {
      product = {
        id: data.legacy_id || data.id,
        name: data.name,
        price: data.price,
        originalPrice: data.original_price,
        image: data.image,
        brand: data.brand_name || data.brand,
        category: data.category_name || data.category,
        description: data.description || ""
      };
    }
  } catch (_e) {
    // Continue to fallback
  }

  // 2. Fallback to site_settings 'sweetos_cloud_products'
  if (!product) {
    try {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "sweetos_cloud_products")
        .maybeSingle();

      if (data && Array.isArray(data.value)) {
        const found = data.value.find(
          (p: any) =>
            String(p.id) === String(productId) ||
            String(p.legacy_id) === String(productId) ||
            String(p.slug) === String(productId)
        );
        if (found) {
          product = found;
        }
      }
    } catch (_e) {
      // Ignore fallback error
    }
  }

  const defaultStoreBanner = "https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=1200&q=80";

  // Default fallback product structure if not found in database
  if (!product) {
    product = {
      id: productId,
      name: "SWEETOS Product",
      price: 0,
      image: defaultStoreBanner,
      brand: "SWEETOS",
      category: "Boutique",
      description: "Découvrez nos derniers produits sur SWEETOS."
    };
  }

  const userAgent = req.headers.get("user-agent") || "";
  const isCrawler = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Googlebot|bingbot/i.test(userAgent);

  const realProductPageUrl = `${APP_URL}/#/?product=${encodeURIComponent(productId)}`;
  const shareUrl = `${url.origin}${url.pathname}${url.search}`;
  const priceFormatted = formatPrice(product.price);
  
  let ogDescription = `${priceFormatted} — ${product.brand || 'SWEETOS'}`;
  if (product.category) ogDescription += ` | ${product.category}`;
  if (product.description) ogDescription += `. ${product.description.slice(0, 150)}`;

  // Ensure Image is absolute HTTPS URL
  let imageUrl = product.image || defaultStoreBanner;
  if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
    imageUrl = `${APP_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
  }

  // If Crawler Bot: Return static HTML with rich Open Graph & Twitter meta tags
  if (isCrawler) {
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${product.name} — ${priceFormatted} | SWEETOS</title>

  <!-- Open Graph / WhatsApp Preview Tags -->
  <meta property="og:title" content="${product.name} — ${priceFormatted} | SWEETOS">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${shareUrl}">
  <meta property="og:type" content="product">
  <meta property="product:price:amount" content="${product.price}">
  <meta property="product:price:currency" content="XOF">
  <meta property="og:site_name" content="SWEETOS">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${product.name} — ${priceFormatted}">
  <meta name="twitter:description" content="${ogDescription}">
  <meta name="twitter:image" content="${imageUrl}">
</head>
<body>
  <h1>${product.name}</h1>
  <p>${priceFormatted}</p>
  <img src="${imageUrl}" alt="${product.name}">
</body>
</html>`;

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=3600"
      }
    });
  }

  // For Human Users: Redirect 302 to the real product page
  return Response.redirect(realProductPageUrl, 302);
});
