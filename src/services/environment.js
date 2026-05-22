export const isDev = () => process.env.VUE_APP_ENV === 'development';
export const isProd = () => process.env.VUE_APP_ENV === 'production';

export const getOAuthUrl = () => process.env.VUE_APP_OAUTH_REDIRECT_URL;
export const getSupabaseUrl = () => process.env.VUE_APP_SUPABASE_URL;
export const getSupabaseKey = () => process.env.VUE_APP_SUPABASE_ANON_KEY;
