-- Create enums
DO $$ BEGIN
  CREATE TYPE item_condition AS ENUM ('new', 'used', 'refurbished', 'damaged');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE item_status AS ENUM ('available', 'reserved', 'sold', 'defective');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE grn_status AS ENUM ('draft', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE gi_purpose AS ENUM ('sale', 'sample', 'service', 'adjustment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE gi_status AS ENUM ('pending', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transfer_status AS ENUM ('pending', 'in_transit', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE movement_action AS ENUM ('receive', 'issue', 'transfer_out', 'transfer_in', 'adjustment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- GRN Headers table
CREATE TABLE IF NOT EXISTS public.grn_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_no VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  received_by UUID NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now(),
  invoice_no VARCHAR(100),
  invoice_date DATE,
  status grn_status DEFAULT 'completed',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- GRN Items table
CREATE TABLE IF NOT EXISTS public.grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES public.grn_headers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_cost DECIMAL(12,2) DEFAULT 0,
  vat_rate DECIMAL(5,2) DEFAULT 0,
  sn_list TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- GI Headers table
CREATE TABLE IF NOT EXISTS public.gi_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gi_no VARCHAR(50) UNIQUE NOT NULL,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  issued_by UUID NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  purpose gi_purpose NOT NULL,
  status gi_status DEFAULT 'completed',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- GI Items table
CREATE TABLE IF NOT EXISTS public.gi_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gi_id UUID NOT NULL REFERENCES public.gi_headers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  sn_list TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Transfer Headers table
CREATE TABLE IF NOT EXISTS public.transfer_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_no VARCHAR(50) UNIQUE NOT NULL,
  from_branch_id UUID NOT NULL REFERENCES public.branches(id),
  to_branch_id UUID NOT NULL REFERENCES public.branches(id),
  initiated_by UUID NOT NULL,
  initiated_at TIMESTAMPTZ DEFAULT now(),
  received_by UUID,
  received_at TIMESTAMPTZ,
  status transfer_status DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (from_branch_id != to_branch_id)
);

-- Transfer Items table
CREATE TABLE IF NOT EXISTS public.transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES public.transfer_headers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  sn_list TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Movement Logs table
CREATE TABLE IF NOT EXISTS public.movement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action movement_action NOT NULL,
  ref_table VARCHAR(50),
  ref_id UUID,
  product_id UUID NOT NULL REFERENCES public.products(id),
  from_branch_id UUID REFERENCES public.branches(id),
  to_branch_id UUID REFERENCES public.branches(id),
  qty INTEGER NOT NULL,
  actor_id UUID NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gi_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gi_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movement_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Anyone authenticated can view, staff can manage)
CREATE POLICY "Anyone authenticated can view suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Staff can manage suppliers" ON public.suppliers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'assistant_manager', 'warehouse_staff'))
);

CREATE POLICY "Anyone authenticated can view GRN" ON public.grn_headers FOR SELECT USING (true);
CREATE POLICY "Staff can manage GRN" ON public.grn_headers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'assistant_manager', 'warehouse_staff'))
);

CREATE POLICY "Anyone authenticated can view GRN items" ON public.grn_items FOR SELECT USING (true);
CREATE POLICY "Staff can manage GRN items" ON public.grn_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'assistant_manager', 'warehouse_staff'))
);

CREATE POLICY "Anyone authenticated can view GI" ON public.gi_headers FOR SELECT USING (true);
CREATE POLICY "Staff can manage GI" ON public.gi_headers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'assistant_manager', 'warehouse_staff', 'branch_staff'))
);

CREATE POLICY "Anyone authenticated can view GI items" ON public.gi_items FOR SELECT USING (true);
CREATE POLICY "Staff can manage GI items" ON public.gi_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'assistant_manager', 'warehouse_staff', 'branch_staff'))
);

CREATE POLICY "Anyone authenticated can view transfers" ON public.transfer_headers FOR SELECT USING (true);
CREATE POLICY "Staff can manage transfers" ON public.transfer_headers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'assistant_manager', 'warehouse_staff'))
);

CREATE POLICY "Anyone authenticated can view transfer items" ON public.transfer_items FOR SELECT USING (true);
CREATE POLICY "Staff can manage transfer items" ON public.transfer_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'assistant_manager', 'warehouse_staff'))
);

CREATE POLICY "Anyone authenticated can view movements" ON public.movement_logs FOR SELECT USING (true);
CREATE POLICY "Staff can log movements" ON public.movement_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'assistant_manager', 'warehouse_staff', 'branch_staff'))
);

-- Triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grn_headers_updated_at BEFORE UPDATE ON public.grn_headers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gi_headers_updated_at BEFORE UPDATE ON public.gi_headers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transfer_headers_updated_at BEFORE UPDATE ON public.transfer_headers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();