
-- Add profile fields.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Allow authenticated users to update only their own editable fields.
-- RLS must still enforce ownership.
GRANT UPDATE (first_name, email, phone_number, avatar_url)
ON TABLE public.profiles
TO authenticated;

-- Create a public bucket for profile pictures.
-- Public URLs allow avatars to display without exposing private account data.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- A user can read their own storage objects through the authenticated API.
CREATE POLICY "Users can read their own profile avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
);

-- A user can upload only into their own UID folder.
CREATE POLICY "Users can upload their own profile avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
);

-- A user can replace only their own avatar.
CREATE POLICY "Users can update their own profile avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
)
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
);

-- A user can delete only their own avatar.
CREATE POLICY "Users can delete their own profile avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
);
