import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (
    file: File,
    bucket: string,
    folder?: string
  ): Promise<{ url: string | null; error: any }> => {
    try {
      setUploading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { url: null, error: new Error('No user found') };
      }

      // Create file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${folder ? folder + '/' : ''}${Math.random()}.${fileExt}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        return { url: null, error };
      }

      // Get public URL for public buckets, signed URL for private buckets
      let publicUrl: string;
      
      if (bucket === 'profile-photos') {
        // Public bucket
        const { data: { publicUrl: url } } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);
        publicUrl = url;
      } else {
        // Private bucket - return the path, we'll get signed URLs when needed
        publicUrl = data.path;
      }

      return { url: publicUrl, error: null };
    } catch (error) {
      return { url: null, error };
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (bucket: string, path: string) => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete file.',
          variant: 'destructive',
        });
        return { error };
      }

      return { error: null };
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete file.',
        variant: 'destructive',
      });
      return { error };
    }
  };

  const getSignedUrl = async (bucket: string, path: string, expiresIn = 3600) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        return { url: null, error };
      }

      return { url: data.signedUrl, error: null };
    } catch (error) {
      return { url: null, error };
    }
  };

  return {
    uploadFile,
    deleteFile,
    getSignedUrl,
    uploading
  };
};