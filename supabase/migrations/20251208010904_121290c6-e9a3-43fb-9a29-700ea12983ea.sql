-- Create storage bucket for user banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own banners (folder = user_id)
CREATE POLICY "Users can upload their own banners"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'banners' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own banners
CREATE POLICY "Users can update their own banners"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'banners' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own banners
CREATE POLICY "Users can delete their own banners"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'banners' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Anyone can view banners (public bucket)
CREATE POLICY "Anyone can view banners"
ON storage.objects
FOR SELECT
USING (bucket_id = 'banners');