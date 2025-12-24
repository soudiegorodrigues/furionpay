-- Create storage bucket for order bump images
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-bumps', 'order-bumps', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload order bump images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'order-bumps' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own images
CREATE POLICY "Users can update their order bump images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'order-bumps' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their order bump images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'order-bumps' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Public can view all order bump images
CREATE POLICY "Public can view order bump images"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-bumps');