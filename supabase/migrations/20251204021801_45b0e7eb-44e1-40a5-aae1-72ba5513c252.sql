-- Create enum for stock count status
CREATE TYPE public.stock_count_status AS ENUM ('draft', 'completed', 'cancelled');

-- Create stock count headers table
CREATE TABLE public.stock_count_headers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES public.branches(id),
    count_no VARCHAR NOT NULL UNIQUE,
    counted_by UUID NOT NULL,
    counted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status stock_count_status DEFAULT 'draft',
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create stock count items table
CREATE TABLE public.stock_count_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    count_id UUID NOT NULL REFERENCES public.stock_count_headers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    system_qty INTEGER NOT NULL DEFAULT 0,
    counted_qty INTEGER NOT NULL DEFAULT 0,
    variance INTEGER GENERATED ALWAYS AS (counted_qty - system_qty) STORED,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_count_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_count_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_count_headers
CREATE POLICY "Anyone authenticated can view stock counts"
ON public.stock_count_headers
FOR SELECT
USING (true);

CREATE POLICY "Staff can manage stock counts"
ON public.stock_count_headers
FOR ALL
USING (
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'assistant_manager') OR 
    has_role(auth.uid(), 'warehouse_staff') OR
    has_role(auth.uid(), 'branch_staff')
);

-- RLS policies for stock_count_items
CREATE POLICY "Anyone authenticated can view stock count items"
ON public.stock_count_items
FOR SELECT
USING (true);

CREATE POLICY "Staff can manage stock count items"
ON public.stock_count_items
FOR ALL
USING (
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'assistant_manager') OR 
    has_role(auth.uid(), 'warehouse_staff') OR
    has_role(auth.uid(), 'branch_staff')
);

-- Add trigger for updated_at
CREATE TRIGGER update_stock_count_headers_updated_at
BEFORE UPDATE ON public.stock_count_headers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();