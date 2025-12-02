-- Create serial_numbers table to track individual SNs
CREATE TABLE IF NOT EXISTS public.serial_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sn VARCHAR NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  status VARCHAR NOT NULL DEFAULT 'available',
  received_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  issued_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(sn, product_id)
);

-- Create index for faster queries
CREATE INDEX idx_serial_numbers_product_branch ON public.serial_numbers(product_id, branch_id);
CREATE INDEX idx_serial_numbers_status ON public.serial_numbers(status);
CREATE INDEX idx_serial_numbers_sn ON public.serial_numbers(sn);

-- Enable RLS
ALTER TABLE public.serial_numbers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone authenticated can view serial numbers"
  ON public.serial_numbers
  FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage serial numbers"
  ON public.serial_numbers
  FOR ALL
  USING (
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'assistant_manager'::app_role) OR 
    has_role(auth.uid(), 'warehouse_staff'::app_role) OR 
    has_role(auth.uid(), 'branch_staff'::app_role)
  );

-- Create trigger for updated_at
CREATE TRIGGER update_serial_numbers_updated_at
  BEFORE UPDATE ON public.serial_numbers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comment
COMMENT ON TABLE public.serial_numbers IS 'Tracks individual serial numbers for products across branches';
COMMENT ON COLUMN public.serial_numbers.status IS 'Status: available, issued, transferred, defective';