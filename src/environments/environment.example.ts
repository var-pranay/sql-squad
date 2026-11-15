// Example environment configuration for SQL Squad
// Copy this file to environment.ts and fill in your Supabase credentials

export const environment = {
  production: false,
  supabase: {
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    anonKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY'
  },
  enableLocalDemoMode: false
};
