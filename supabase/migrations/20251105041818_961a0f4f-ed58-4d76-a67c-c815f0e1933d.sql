-- Add attachment_url column to grn_headers table
ALTER TABLE public.grn_headers 
ADD COLUMN attachment_url text;

-- Create storage bucket for GRN attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('grn-attachments', 'grn-attachments', true);

-- RLS policies for grn-attachments bucket
CREATE POLICY "Anyone authenticated can view GRN attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'grn-attachments');

CREATE POLICY "Staff can upload GRN attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'grn-attachments' AND
  (has_role(auth.uid(), 'manager'::app_role) OR 
   has_role(auth.uid(), 'assistant_manager'::app_role) OR 
   has_role(auth.uid(), 'warehouse_staff'::app_role))
);

CREATE POLICY "Staff can update GRN attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'grn-attachments' AND
  (has_role(auth.uid(), 'manager'::app_role) OR 
   has_role(auth.uid(), 'assistant_manager'::app_role) OR 
   has_role(auth.uid(), 'warehouse_staff'::app_role))
);

CREATE POLICY "Staff can delete GRN attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'grn-attachments' AND
  (has_role(auth.uid(), 'manager'::app_role) OR 
   has_role(auth.uid(), 'assistant_manager'::app_role) OR 
   has_role(auth.uid(), 'warehouse_staff'::app_role))
);