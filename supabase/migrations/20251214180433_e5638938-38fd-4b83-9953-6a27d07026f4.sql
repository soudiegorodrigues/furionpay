-- Create bucket for notification sounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('notification-sounds', 'notification-sounds', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own sounds
CREATE POLICY "Users can upload their own notification sounds"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'notification-sounds' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own sounds
CREATE POLICY "Users can update their own notification sounds"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'notification-sounds' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own sounds
CREATE POLICY "Users can delete their own notification sounds"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'notification-sounds' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to notification sounds
CREATE POLICY "Notification sounds are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'notification-sounds');