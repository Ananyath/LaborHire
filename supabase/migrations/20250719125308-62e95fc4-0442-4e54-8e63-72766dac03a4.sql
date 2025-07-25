-- Add missing fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN company_name TEXT,
ADD COLUMN bio TEXT,
ADD COLUMN is_verified BOOLEAN DEFAULT false,
ADD COLUMN identity_document_url TEXT,
ADD COLUMN certification_urls TEXT[]; -- Array for multiple certification files

-- Create storage bucket for identity documents
INSERT INTO storage.buckets (id, name, public) VALUES ('identity-documents', 'identity-documents', false);

-- Create storage bucket for certifications
INSERT INTO storage.buckets (id, name, public) VALUES ('certifications', 'certifications', false);

-- Create storage policies for identity documents
CREATE POLICY "Users can view their own identity documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'identity-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own identity documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'identity-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own identity documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'identity-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own identity documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'identity-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for certifications
CREATE POLICY "Users can view their own certifications" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'certifications' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own certifications" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'certifications' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own certifications" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'certifications' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own certifications" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'certifications' AND auth.uid()::text = (storage.foldername(name))[1]);