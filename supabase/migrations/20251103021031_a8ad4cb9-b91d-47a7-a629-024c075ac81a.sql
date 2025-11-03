-- Create security definer function to check user role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = _role
  )
$$;

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can update profiles" ON public.profiles;

-- Recreate policies using the security definer function
CREATE POLICY "Managers can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id OR 
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'assistant_manager')
);

CREATE POLICY "Managers can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'assistant_manager')
);

-- Update all other policies to use the security definer function
-- Suppliers policies
DROP POLICY IF EXISTS "Staff can manage suppliers" ON public.suppliers;
CREATE POLICY "Staff can manage suppliers" 
ON public.suppliers 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'assistant_manager') OR 
  public.has_role(auth.uid(), 'warehouse_staff')
);

-- Branches policies
DROP POLICY IF EXISTS "Managers can manage branches" ON public.branches;
CREATE POLICY "Managers can manage branches" 
ON public.branches 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'assistant_manager')
);

-- Brands policies
DROP POLICY IF EXISTS "Managers can manage brands" ON public.brands;
CREATE POLICY "Managers can manage brands" 
ON public.brands 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'assistant_manager')
);

-- Categories policies
DROP POLICY IF EXISTS "Managers can manage categories" ON public.categories;
CREATE POLICY "Managers can manage categories" 
ON public.categories 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'assistant_manager')
);

-- Products policies
DROP POLICY IF EXISTS "Staff can manage products" ON public.products;
CREATE POLICY "Staff can manage products" 
ON public.products 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'assistant_manager') OR 
  public.has_role(auth.uid(), 'warehouse_staff')
);

-- Product images policies
DROP POLICY IF EXISTS "Staff can manage product images" ON public.product_images;
CREATE POLICY "Staff can manage product images" 
ON public.product_images 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'assistant_manager') OR 
  public.has_role(auth.uid(), 'warehouse_staff')
);

-- GRN policies
DROP POLICY IF EXISTS "Staff can manage GRN" ON public.grn_headers;
CREATE POLICY "Staff can manage GRN" 
ON public.grn_headers 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'assistant_manager') OR 
  public.has_role(auth.uid(), 'warehouse_staff')
);

DROP POLICY IF EXISTS "Staff can manage GRN items" ON public.grn_items;
CREATE POLICY "Staff can manage GRN items" 
ON public.grn_items 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'assistant_manager') OR 
  public.has_role(auth.uid(), 'warehouse_staff')
);

-- GI policies
DROP POLICY IF EXISTS "Staff can manage GI" ON public.gi_headers;
CREATE POLICY "Staff can manage GI" 
ON public.gi_headers 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'assistant_manager') OR 
  public.has_role(auth.uid(), 'warehouse_staff') OR 
  public.has_role(auth.uid(), 'branch_staff')
);

DROP POLICY IF EXISTS "Staff can manage GI items" ON public.gi_items;
CREATE POLICY "Staff can manage GI items" 
ON public.gi_items 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'assistant_manager') OR 
  public.has_role(auth.uid(), 'warehouse_staff') OR 
  public.has_role(auth.uid(), 'branch_staff')
);

-- Transfer policies
DROP POLICY IF EXISTS "Staff can manage transfers" ON public.transfer_headers;
CREATE POLICY "Staff can manage transfers" 
ON public.transfer_headers 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'assistant_manager') OR 
  public.has_role(auth.uid(), 'warehouse_staff')
);

DROP POLICY IF EXISTS "Staff can manage transfer items" ON public.transfer_items;
CREATE POLICY "Staff can manage transfer items" 
ON public.transfer_items 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'assistant_manager') OR 
  public.has_role(auth.uid(), 'warehouse_staff')
);

-- Movement logs policy
DROP POLICY IF EXISTS "Staff can log movements" ON public.movement_logs;
CREATE POLICY "Staff can log movements" 
ON public.movement_logs 
FOR INSERT 
WITH CHECK (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'assistant_manager') OR 
  public.has_role(auth.uid(), 'warehouse_staff') OR 
  public.has_role(auth.uid(), 'branch_staff')
);