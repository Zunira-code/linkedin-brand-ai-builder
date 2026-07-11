
CREATE POLICY "users read own post videos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'post-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users upload own post videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users update own post videos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'post-videos' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'post-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users delete own post videos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'post-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
