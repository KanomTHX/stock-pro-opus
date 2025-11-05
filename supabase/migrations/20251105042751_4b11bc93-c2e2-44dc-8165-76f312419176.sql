-- Create stock_by_branch table for tracking inventory per branch
CREATE TABLE IF NOT EXISTS public.stock_by_branch (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, branch_id)
);

-- Enable RLS
ALTER TABLE public.stock_by_branch ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone authenticated can view stock"
ON public.stock_by_branch
FOR SELECT
USING (true);

CREATE POLICY "Staff can manage stock"
ON public.stock_by_branch
FOR ALL
USING (
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'assistant_manager'::app_role) OR
  has_role(auth.uid(), 'warehouse_staff'::app_role)
);

-- Add trigger for updated_at
CREATE TRIGGER update_stock_by_branch_updated_at
BEFORE UPDATE ON public.stock_by_branch
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();