import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.VUE_APP_SUPABASE_URL,
  process.env.VUE_APP_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: 'implicit',
      detectSessionInUrl: true,
      persistSession: true,
    },
  }
);

export const BUCKET = 'company-assets';
