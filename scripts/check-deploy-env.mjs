import { loadEnv } from 'vite';

const config = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter(name => !config[name]?.trim());
if (missing.length) throw new Error(`Deployment blocked: missing ${missing.join(', ')}. Configure the public Supabase settings before building.`);
const url = new URL(config.VITE_SUPABASE_URL);
if (url.protocol !== 'https:') throw new Error('Deployment blocked: VITE_SUPABASE_URL must use HTTPS.');
console.log('Public Supabase deployment configuration verified.');
