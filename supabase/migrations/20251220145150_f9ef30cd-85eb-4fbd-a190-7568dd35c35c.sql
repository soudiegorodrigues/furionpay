-- Create storage bucket for chat avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-avatars', 'chat-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for authenticated users to upload
CREATE POLICY "Authenticated users can upload chat avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-avatars');

-- Policy for authenticated users to update their uploads
CREATE POLICY "Authenticated users can update chat avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-avatars');

-- Policy for authenticated users to delete
CREATE POLICY "Authenticated users can delete chat avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-avatars');

-- Policy for public read access
CREATE POLICY "Public read access for chat avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-avatars');