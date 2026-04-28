import { supabase, BUCKET } from '@/lib/supabase';

export async function uploadFile(file, path) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return `${supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}
