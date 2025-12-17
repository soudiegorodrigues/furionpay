
-- Function to get all storage files for backup
CREATE OR REPLACE FUNCTION public.get_storage_files_for_backup()
RETURNS TABLE (
  bucket_id text,
  file_name text,
  file_path text,
  size_bytes bigint,
  mimetype text,
  created_at timestamptz,
  public_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $$
DECLARE
  v_supabase_url text := 'https://qtlhwjotfkyyqzgxlmkg.supabase.co';
BEGIN
  -- Only admins can get storage files
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can access storage backup';
  END IF;

  RETURN QUERY
  SELECT 
    o.bucket_id::text,
    o.name::text as file_name,
    (o.bucket_id || '/' || o.name)::text as file_path,
    COALESCE((o.metadata->>'size')::bigint, 0) as size_bytes,
    COALESCE(o.metadata->>'mimetype', 'application/octet-stream')::text as mimetype,
    o.created_at,
    (v_supabase_url || '/storage/v1/object/public/' || o.bucket_id || '/' || o.name)::text as public_url
  FROM storage.objects o
  WHERE o.bucket_id IN ('banners', 'notification-sounds', 'product-images', 'rewards', 'user-documents')
  ORDER BY o.bucket_id, o.name;
END;
$$;

-- Function to get storage stats for backup UI
CREATE OR REPLACE FUNCTION public.get_storage_stats_for_backup()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $$
DECLARE
  v_result json;
BEGIN
  -- Only admins can get storage stats
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can access storage stats';
  END IF;

  SELECT json_build_object(
    'total_files', COUNT(*),
    'total_size_bytes', COALESCE(SUM((metadata->>'size')::bigint), 0),
    'buckets', (
      SELECT COALESCE(json_agg(json_build_object(
        'bucket_id', bucket_id,
        'file_count', file_count,
        'size_bytes', size_bytes
      )), '[]'::json)
      FROM (
        SELECT 
          bucket_id,
          COUNT(*) as file_count,
          COALESCE(SUM((metadata->>'size')::bigint), 0) as size_bytes
        FROM storage.objects
        WHERE bucket_id IN ('banners', 'notification-sounds', 'product-images', 'rewards', 'user-documents')
        GROUP BY bucket_id
        ORDER BY bucket_id
      ) bucket_stats
    )
  ) INTO v_result
  FROM storage.objects
  WHERE bucket_id IN ('banners', 'notification-sounds', 'product-images', 'rewards', 'user-documents');

  RETURN v_result;
END;
$$;
