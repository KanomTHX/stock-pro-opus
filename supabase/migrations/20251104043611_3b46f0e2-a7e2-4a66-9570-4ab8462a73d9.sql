-- Drop existing policy and recreate with proper WITH CHECK expression
DROP POLICY IF EXISTS "Staff can manage suppliers" ON public.suppliers;

-- Recreate policy with proper INSERT permission
CREATE POLICY "Staff can manage suppliers"
ON public.suppliers
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'assistant_manager'::app_role) OR 
  has_role(auth.uid(), 'warehouse_staff'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'assistant_manager'::app_role) OR 
  has_role(auth.uid(), 'warehouse_staff'::app_role)
);