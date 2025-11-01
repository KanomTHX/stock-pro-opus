-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE app_role AS ENUM ('manager', 'assistant_manager', 'branch_staff', 'warehouse_staff', 'auditor');

-- Branches table
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brands table
CREATE TABLE public.brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES public.categories(id),
    brand_id UUID REFERENCES public.brands(id),
    dimensions VARCHAR(100),
    color VARCHAR(50),
    material VARCHAR(100),
    unit VARCHAR(20) DEFAULT 'ชิ้น',
    track_by_sn BOOLEAN DEFAULT false,
    min_stock INT DEFAULT 0,
    default_image_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product images table
CREATE TABLE public.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    variant_id UUID,
    url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    alt_text TEXT,
    width INT,
    height INT,
    position INT DEFAULT 0,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    name VARCHAR(255),
    role app_role DEFAULT 'branch_staff',
    branch_id UUID REFERENCES public.branches(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        'branch_staff'
    );
    RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for branches
CREATE POLICY "Anyone can view active branches"
    ON public.branches FOR SELECT
    USING (is_active = true);

CREATE POLICY "Managers can manage branches"
    ON public.branches FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('manager', 'assistant_manager')
        )
    );

-- RLS Policies for categories (read-only for all authenticated)
CREATE POLICY "Anyone authenticated can view categories"
    ON public.categories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Managers can manage categories"
    ON public.categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('manager', 'assistant_manager')
        )
    );

-- RLS Policies for brands
CREATE POLICY "Anyone authenticated can view brands"
    ON public.brands FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Managers can manage brands"
    ON public.brands FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('manager', 'assistant_manager')
        )
    );

-- RLS Policies for products
CREATE POLICY "Anyone authenticated can view products"
    ON public.products FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff can manage products"
    ON public.products FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('manager', 'assistant_manager', 'warehouse_staff')
        )
    );

-- RLS Policies for product images
CREATE POLICY "Anyone authenticated can view product images"
    ON public.product_images FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff can manage product images"
    ON public.product_images FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('manager', 'assistant_manager', 'warehouse_staff')
        )
    );

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Managers can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('manager', 'assistant_manager')
        )
    );

CREATE POLICY "Managers can update profiles"
    ON public.profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('manager', 'assistant_manager')
        )
    );

-- Insert sample data
INSERT INTO public.categories (name, description) VALUES
    ('โซฟาและเก้าอี้', 'เฟอร์นิเจอร์สำหรับนั่ง'),
    ('โต๊ะ', 'โต๊ะทำงาน โต๊ะกลาง โต๊ะอาหาร'),
    ('เตียง', 'เตียงนอนและที่นอน'),
    ('ตู้และชั้นวาง', 'ตู้เสื้อผ้า ชั้นวางของ'),
    ('ของตะแกรง', 'ของตกแต่งบ้าน');

INSERT INTO public.brands (name, description) VALUES
    ('HomePlus', 'แบรนด์เฟอร์นิเจอร์คุณภาพ'),
    ('ModernLiving', 'เฟอร์นิเจอร์โมเดิร์น'),
    ('ClassicWood', 'เฟอร์นิเจอร์ไม้คลาสสิค'),
    ('UrbanStyle', 'สไตล์เมืองใหม่');

INSERT INTO public.branches (code, name, address, phone) VALUES
    ('BKK01', 'สาขากรุงเทพ 1', '123 ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110', '02-123-4567'),
    ('BKK02', 'สาขากรุงเทพ 2', '456 ถนนพระราม 4 แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110', '02-234-5678'),
    ('CNX01', 'สาขาเชียงใหม่', '789 ถนนห้วยแก้ว ตำบลสุเทพ อำเภอเมือง เชียงใหม่ 50200', '053-123-456');