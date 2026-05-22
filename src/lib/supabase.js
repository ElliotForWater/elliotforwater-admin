import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseKey, getOAuthUrl } from '@/services/environment';

export const supabase = createClient(getSupabaseUrl(), getSupabaseKey(), {
  auth: {
    flowType: 'implicit',
    detectSessionInUrl: true,
    persistSession: true,
    redirectTo: getOAuthUrl(),
  },
});

export const BUCKET = 'company-assets';
