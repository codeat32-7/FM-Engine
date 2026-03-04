
import { supabase } from './lib/supabase';

async function checkEnv() {
  console.log('Checking environment variables...');
  const env = (window as any).process?.env || {};
  console.log('SUPABASE_URL:', env.SUPABASE_URL ? 'Present' : 'Missing');
  console.log('SUPABASE_ANON_KEY:', env.SUPABASE_ANON_KEY ? 'Present' : 'Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing');
}

checkEnv();
