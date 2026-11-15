const fs = require('fs');
const path = require('path');

const envDir = path.join(__dirname, '..', 'src', 'environments');
const prodPath = path.join(envDir, 'environment.ts');
const devPath = path.join(envDir, 'environment.development.ts');

if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

// Read from Vercel / process.env environment variables with safe defaults
const supabaseUrl = process.env.SUPABASE_URL || 'https://evnxareaiqnofkphcaxl.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_igPJyYV873htNo_uQxKWpw_wdbgeVJ6';
const isDemoMode = process.env.ENABLE_LOCAL_DEMO === 'true';

const prodContent = `export const environment = {
  production: true,
  supabase: {
    url: '${supabaseUrl}',
    anonKey: '${supabaseAnonKey}'
  },
  enableLocalDemoMode: ${isDemoMode}
};\n`;

const devContent = `export const environment = {
  production: false,
  supabase: {
    url: '${supabaseUrl}',
    anonKey: '${supabaseAnonKey}'
  },
  enableLocalDemoMode: ${isDemoMode}
};\n`;

fs.writeFileSync(prodPath, prodContent, 'utf8');
fs.writeFileSync(devPath, devContent, 'utf8');
console.log('Successfully configured environment files for build.');
