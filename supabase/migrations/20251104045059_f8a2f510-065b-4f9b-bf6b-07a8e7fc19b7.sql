-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- RLS policies for product-images bucket
CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Staff can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  (
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'assistant_manager'::app_role) OR
    has_role(auth.uid(), 'warehouse_staff'::app_role)
  )
);

CREATE POLICY "Staff can update product images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'product-images' AND
  (
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'assistant_manager'::app_role) OR
    has_role(auth.uid(), 'warehouse_staff'::app_role)
  )
);

CREATE POLICY "Staff can delete product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-images' AND
  (
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'assistant_manager'::app_role) OR
    has_role(auth.uid(), 'warehouse_staff'::app_role)
  )
);