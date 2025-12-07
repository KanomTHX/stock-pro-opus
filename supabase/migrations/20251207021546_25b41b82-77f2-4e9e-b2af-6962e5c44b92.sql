
-- Create credit grade enum
CREATE TYPE public.credit_grade AS ENUM ('A', 'B', 'C', 'F');

-- Create contract status enum
CREATE TYPE public.contract_status AS ENUM ('active', 'completed', 'defaulted', 'cancelled');

-- Create employees table for sales/collection staff
CREATE TABLE public.employees (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    role VARCHAR NOT NULL,
    sales_commission_pct NUMERIC(5,2) DEFAULT 0,
    collection_commission_pct NUMERIC(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create customers table with credit data
CREATE TABLE public.customers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name VARCHAR NOT NULL,
    id_card VARCHAR(13) NOT NULL UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    gps_lat NUMERIC(10,7),
    gps_lng NUMERIC(10,7),
    photo_url TEXT,
    occupation VARCHAR,
    salary NUMERIC(12,2) DEFAULT 0,
    credit_limit NUMERIC(12,2) DEFAULT 0,
    credit_grade credit_grade DEFAULT 'B',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create guarantors table
CREATE TABLE public.guarantors (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    full_name VARCHAR NOT NULL,
    id_card VARCHAR(13) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    relationship VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create contracts table
CREATE TABLE public.contracts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_no VARCHAR NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    product_id UUID NOT NULL REFERENCES public.products(id),
    serial_number_id UUID NOT NULL REFERENCES public.serial_numbers(id),
    salesperson_id UUID REFERENCES public.employees(id),
    down_payment NUMERIC(12,2) DEFAULT 0,
    principal_amount NUMERIC(12,2) NOT NULL,
    interest_rate NUMERIC(5,2) DEFAULT 0,
    total_interest NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL,
    installment_months INTEGER NOT NULL,
    monthly_payment NUMERIC(12,2) NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status contract_status DEFAULT 'active',
    admin_override_reason TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    payment_no INTEGER NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    collector_id UUID REFERENCES public.employees(id),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create commissions table to track earned commissions
CREATE TABLE public.commissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    contract_id UUID REFERENCES public.contracts(id),
    payment_id UUID REFERENCES public.payments(id),
    commission_type VARCHAR NOT NULL, -- 'sales' or 'collection'
    amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarantors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees
CREATE POLICY "Anyone authenticated can view employees" ON public.employees
FOR SELECT USING (true);

CREATE POLICY "Managers can manage employees" ON public.employees
FOR ALL USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'assistant_manager'));

-- RLS Policies for customers
CREATE POLICY "Anyone authenticated can view customers" ON public.customers
FOR SELECT USING (true);

CREATE POLICY "Staff can manage customers" ON public.customers
FOR ALL USING (
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'assistant_manager') OR 
    has_role(auth.uid(), 'branch_staff')
);

-- RLS Policies for guarantors
CREATE POLICY "Anyone authenticated can view guarantors" ON public.guarantors
FOR SELECT USING (true);

CREATE POLICY "Staff can manage guarantors" ON public.guarantors
FOR ALL USING (
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'assistant_manager') OR 
    has_role(auth.uid(), 'branch_staff')
);

-- RLS Policies for contracts
CREATE POLICY "Anyone authenticated can view contracts" ON public.contracts
FOR SELECT USING (true);

CREATE POLICY "Staff can manage contracts" ON public.contracts
FOR ALL USING (
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'assistant_manager') OR 
    has_role(auth.uid(), 'branch_staff')
);

-- RLS Policies for payments
CREATE POLICY "Anyone authenticated can view payments" ON public.payments
FOR SELECT USING (true);

CREATE POLICY "Staff can manage payments" ON public.payments
FOR ALL USING (
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'assistant_manager') OR 
    has_role(auth.uid(), 'branch_staff')
);

-- RLS Policies for commissions
CREATE POLICY "Anyone authenticated can view commissions" ON public.commissions
FOR SELECT USING (true);

CREATE POLICY "System can manage commissions" ON public.commissions
FOR ALL USING (
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'assistant_manager')
);

-- Create triggers for updated_at
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate customer's current active debt
CREATE OR REPLACE FUNCTION public.get_customer_active_debt(customer_uuid UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        SUM(c.total_amount - COALESCE(
            (SELECT SUM(p.amount) FROM public.payments p WHERE p.contract_id = c.id),
            0
        )),
        0
    )
    FROM public.contracts c
    WHERE c.customer_id = customer_uuid
    AND c.status = 'active'
$$;

-- Function to get remaining credit
CREATE OR REPLACE FUNCTION public.get_customer_remaining_credit(customer_uuid UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        COALESCE(cu.credit_limit, 0) - public.get_customer_active_debt(customer_uuid)
    FROM public.customers cu
    WHERE cu.id = customer_uuid
$$;
