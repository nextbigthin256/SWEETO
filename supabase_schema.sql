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
CREATE POLICY "Full Site Settings Access" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full Products Access" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full Categories Access" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full Brands Access" ON public.brands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full Settings Access" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full Orders Access" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full Order Items Access" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full Reviews Access" ON public.reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full Coupons Access" ON public.coupons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full Wishlists Access" ON public.wishlists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full Notifications Access" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full Profiles Access" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- STORAGE BUCKETS SETUP FOR IMAGE UPLOADS
-- ====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public Uploads Access" ON storage.objects FOR ALL USING (bucket_id = 'uploads') WITH CHECK (bucket_id = 'uploads');

-- ====================================================================
-- SEED DATA (INITIAL CATEGORIES & BRANDS)
-- ====================================================================
INSERT INTO public.store_settings (store_name, currency, hero_title, hero_subtitle)
VALUES ('SWEETOS', 'FCFA', 'Find Your Style, Love Your Look ✨', 'Discover the latest trends in minimalist tech layouts, high-end accessories, and premium workspace gear.');

INSERT INTO public.categories (name, slug, icon, description) VALUES
('Keyboards', 'keyboards', '⌨️', 'Custom mechanical keyboards and keycaps'),
('Audio', 'audio', '🎧', 'High-fidelity headphones and studio DACs'),
('Desks', 'desks', '🪵', 'Solid hardwood monitor stands and organizers'),
('Lighting', 'lighting', '💡', 'Minimalist LED screen bars and ambiance lighting');

INSERT INTO public.brands (name, slug, description, is_official) VALUES
('SWEETOS', 'sweetos', 'Official Sweetos Luxury Workspace Hardware', true),
('Aero', 'aero', 'Precision Mechanical Keyboards & Accessories', true),
('Apex', 'apex', 'Studio Acoustics & Audio Engineering', true),
('Nebula', 'nebula', 'Artisan Hardwood Ergonomics', true);
