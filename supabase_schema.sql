-- ====================================================================
-- SWEETOS E-COMMERCE - SUPABASE POSTGRESQL DATABASE SCHEMA (CLEAN RESET)
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop any previous conflicting tables cleanly
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.wishlists CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.coupons CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.brands CASCADE;
DROP TABLE IF EXISTS public.store_settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. Helper trigger function for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- TABLE: SITE_SETTINGS (CLOUD KEY-VALUE FALLBACK & ADMIN CONFIG)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- TABLE: STORE_SETTINGS
-- ====================================================================
CREATE TABLE public.store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name TEXT NOT NULL DEFAULT 'SWEETOS',
    currency TEXT NOT NULL DEFAULT 'FCFA',
    hero_title TEXT DEFAULT 'Find Your Style, Love Your Look ✨',
    hero_subtitle TEXT DEFAULT 'Discover the latest trends in minimalist tech layouts, high-end accessories, and premium workspace gear.',
    store_entrance_image TEXT,
    contact_email TEXT DEFAULT 'contact@sweetos.com',
    whatsapp_number TEXT DEFAULT '+237600000000',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- TABLE: CATEGORIES
-- ====================================================================
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT '📦',
    description TEXT,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    banner_image TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON public.categories(slug);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);

-- ====================================================================
-- TABLE: BRANDS
-- ====================================================================
CREATE TABLE public.brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    logo TEXT,
    banner_image TEXT,
    description TEXT,
    website TEXT,
    is_official BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_brands_slug ON public.brands(slug);

-- ====================================================================
-- TABLE: PRODUCTS
-- ====================================================================
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legacy_id BIGINT UNIQUE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    original_price NUMERIC(12, 2),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category_name TEXT,
    subcategory_name TEXT,
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    brand_name TEXT,
    image TEXT NOT NULL,
    gallery JSONB DEFAULT '[]'::jsonb,
    colors JSONB DEFAULT '[]'::jsonb,
    specs JSONB DEFAULT '{}'::jsonb,
    stock INT NOT NULL DEFAULT 10,
    in_stock BOOLEAN DEFAULT TRUE,
    is_bestseller BOOLEAN DEFAULT FALSE,
    is_hot_deal BOOLEAN DEFAULT FALSE,
    is_new BOOLEAN DEFAULT TRUE,
    rating NUMERIC(3, 2) DEFAULT 5.00,
    reviews_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_brand ON public.products(brand_id);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_price ON public.products(price);
CREATE INDEX idx_products_in_stock ON public.products(in_stock);

CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- ====================================================================
-- TABLE: PROFILES (CUSTOMERS & ADMINS)
-- ====================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'customer',
    total_spent NUMERIC(12, 2) DEFAULT 0.00,
    orders_count INT DEFAULT 0,
    loyalty_points INT DEFAULT 0,
    default_shipping_address JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- ====================================================================
-- TABLE: ORDERS
-- ====================================================================
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address JSONB NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    currency TEXT DEFAULT 'FCFA',
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    coupon_code TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT NOT NULL,
    payment_status TEXT DEFAULT 'unpaid',
    shipping_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_number ON public.orders(order_number);

CREATE TRIGGER set_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- ====================================================================
-- TABLE: ORDER_ITEMS
-- ====================================================================
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    selected_color TEXT,
    item_image TEXT,
    total_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);

-- ====================================================================
-- TABLE: COUPONS
-- ====================================================================
CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL DEFAULT 'percentage',
    discount_value NUMERIC(10, 2) NOT NULL,
    min_order_amount NUMERIC(12, 2) DEFAULT 0.00,
    max_discount NUMERIC(12, 2),
    usage_limit INT,
    times_used INT DEFAULT 0,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON public.coupons(code);

-- ====================================================================
-- TABLE: REVIEWS
-- ====================================================================
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_product ON public.reviews(product_id);

-- ====================================================================
-- TABLE: WISHLISTS
-- ====================================================================
CREATE TABLE public.wishlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

CREATE INDEX idx_wishlists_user ON public.wishlists(user_id);

-- ====================================================================
-- TABLE: NOTIFICATIONS
-- ====================================================================
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(is_read);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - FULL CRUD ACCESS
-- ====================================================================
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow full CRUD for storefront and admin management
DROP POLICY IF EXISTS "Full Site Settings Access" ON public.site_settings;
CREATE POLICY "Full Site Settings Access" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full Products Access" ON public.products;
CREATE POLICY "Full Products Access" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full Categories Access" ON public.categories;
CREATE POLICY "Full Categories Access" ON public.categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full Brands Access" ON public.brands;
CREATE POLICY "Full Brands Access" ON public.brands FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full Settings Access" ON public.store_settings;
CREATE POLICY "Full Settings Access" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full Orders Access" ON public.orders;
CREATE POLICY "Full Orders Access" ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full Order Items Access" ON public.order_items;
CREATE POLICY "Full Order Items Access" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full Reviews Access" ON public.reviews;
CREATE POLICY "Full Reviews Access" ON public.reviews FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full Coupons Access" ON public.coupons;
CREATE POLICY "Full Coupons Access" ON public.coupons FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full Wishlists Access" ON public.wishlists;
CREATE POLICY "Full Wishlists Access" ON public.wishlists FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full Notifications Access" ON public.notifications;
CREATE POLICY "Full Notifications Access" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full Profiles Access" ON public.profiles;
CREATE POLICY "Full Profiles Access" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- STORAGE BUCKETS SETUP FOR IMAGE UPLOADS
-- ====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public Uploads Access" ON storage.objects FOR ALL USING (bucket_id = 'uploads') WITH CHECK (bucket_id = 'uploads');

-- ====================================================================
-- ====================================================================
-- SEED DATA (INITIAL CATEGORIES, BRANDS & 13 PRODUCTS)
-- ====================================================================
INSERT INTO public.store_settings (store_name, currency, hero_title, hero_subtitle)
VALUES ('SWEETOS', 'FCFA', 'Find Your Style, Love Your Look ✨', 'Discover the latest trends in minimalist tech layouts, high-end accessories, and premium workspace gear.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (name, slug, icon, description) VALUES
('LAPTOPS', 'laptops', '💻', 'High-performance laptops & notebooks'),
('computer & it', 'computer-it', '🖥️', 'Computers, workstations & IT accessories'),
('HEADPHONE', 'headphone', '🎧', 'Studio headphones & wireless audio'),
('Accessories', 'accessories', '🔌', 'Workspace & tech accessories'),
('CHAGER', 'chager', '⚡', 'Chargers, power adapters & cables')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.brands (name, slug, description, is_official) VALUES
('hp', 'hp', 'Official HP Laptops & Workstations', true),
('BOSE', 'bose', 'Bose High-Fidelity Audio Gear', true),
('JBL', 'jbl', 'JBL Premium Audio Equipment', true),
('SWEETOS', 'sweetos', 'Official Sweetos Tech Accessories', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (legacy_id, name, slug, description, price, original_price, category_name, subcategory_name, brand_name, image, stock, in_stock, is_bestseller, is_hot_deal, is_new, rating, reviews_count) VALUES
(2, 'HP ELITEBOOK', 'hp-elitebook-2', 'High performance HP EliteBook laptop', 150000, 180000, 'LAPTOPS', '', 'hp', 'https://euuzsxjsmsktegilbqpv.supabase.co/storage/v1/object/public/uploads/prod_2.png', 46, true, false, false, true, 5.0, 0),
(1, 'hp elite book', 'hp-elite-book-1', 'Premium refurbished HP EliteBook notebook', 200000, NULL, 'computer & it', '', 'hp', 'https://euuzsxjsmsktegilbqpv.supabase.co/storage/v1/object/public/uploads/prod_1.png', 46, true, false, false, true, 5.0, 0),
(3, 'BOSE ULTRA', 'bose-ultra-3', 'Bose QuietComfort Ultra wireless headphones', 10000, NULL, 'HEADPHONE', '', 'BOSE', 'https://euuzsxjsmsktegilbqpv.supabase.co/storage/v1/object/public/uploads/upload_1788007023036_x1jwcn.jpg', 35, true, false, false, true, 5.0, 0),
(11, 'External case m.2', 'external-case-m-2-11', 'High-speed M.2 NVMe SSD External Enclosure', 15000, NULL, 'Accessories', '', 'SWEETOS', 'https://euuzsxjsmsktegilbqpv.supabase.co/storage/v1/object/public/uploads/upload_1788007137593_wxs0r4.jpg', 50, true, false, false, true, 5.0, 0),
(12, 'Wireless mouse', 'wireless-mouse-12', 'Ergonomic 2.4G wireless optical mouse', 8000, NULL, 'computer & it', '', 'hp', 'https://euuzsxjsmsktegilbqpv.supabase.co/storage/v1/object/public/uploads/upload_1788007204558_p98b2c.jpg', 40, true, false, false, true, 5.0, 0),
(4, 'HP BLEU MOUTH', 'hp-bleu-mouth-4', 'Official HP Blue Optical Mouse', 5000, NULL, 'CHAGER', '', 'hp', 'https://euuzsxjsmsktegilbqpv.supabase.co/storage/v1/object/public/uploads/upload_1788007270425_d05a9u.jpg', 30, true, false, false, true, 5.0, 0),
(5, '8GO RAM DDR4', '8go-ram-ddr4-5', '8GB DDR4 2666MHz SODIMM Memory Module', 25000, NULL, 'LAPTOPS', '', 'hp', 'https://euuzsxjsmsktegilbqpv.supabase.co/storage/v1/object/public/uploads/upload_1788007328901_35vhge.jpg', 25, true, false, false, true, 5.0, 0),
(8, 'mouse', 'mouse-8', 'Precision wired USB optical mouse', 4000, NULL, 'computer & it', '', 'hp', 'https://euuzsxjsmsktegilbqpv.supabase.co/storage/v1/object/public/uploads/upload_1788007399899_z6u55g.jpg', 60, true, false, false, true, 5.0, 0),
(7, 'HEADPHONE JBL', 'headphone-jbl-7', 'JBL PureBass wireless over-ear headphones', 18000, NULL, 'HEADPHONE', '', 'JBL', 'https://euuzsxjsmsktegilbqpv.supabase.co/storage/v1/object/public/uploads/upload_1788007466231_27n06s.jpg', 20, true, false, false, true, 5.0, 0),
(9, 'Hp Elitebook G4 830', 'hp-elitebook-g4-830-9', 'HP EliteBook 830 G4 Core i5 8GB RAM 256GB SSD', 175000, NULL, 'LAPTOPS', '', 'hp', 'https://euuzsxjsmsktegilbqpv.supabase.co/storage/v1/object/public/uploads/upload_1788007530111_p40hns.jpg', 15, true, false, false, true, 5.0, 0),
(10, 'External case', 'external-case-10', '2.5 inch SATA External Hard Drive Enclosure', 10000, NULL, 'Accessories', '', 'SWEETOS', 'https://euuzsxjsmsktegilbqpv.supabase.co/storage/v1/object/public/uploads/upload_1788007589145_m29vhx.jpg', 35, true, false, false, true, 5.0, 0),
(13, 'this', 'this-13', 'Universal USB-C Fast Charger Cable', 6000, NULL, 'computer & it', '', 'hp', 'https://euuzsxjsmsktegilbqpv.supabase.co/storage/v1/object/public/uploads/upload_1788007655001_s91kd8.jpg', 50, true, false, false, true, 5.0, 0),
(6, 'chager hp', 'chager-hp-6', 'Original HP Smart AC Power Adapter Charger', 12000, NULL, 'CHAGER', '', 'hp', 'https://euuzsxjsmsktegilbqpv.supabase.co/storage/v1/object/public/uploads/upload_1788007718999_x03c81.jpg', 40, true, false, false, true, 5.0, 0)
ON CONFLICT (slug) DO NOTHING;
