
import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  // Use window.process for the shim in index.html, or fallback to hardcoded values
  const env = (window as any).process?.env || {};
  return {
    url: env.SUPABASE_URL || 'https://oygdrtvzoabboxycfdil.supabase.co',
    anonKey: env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Z2RydHZ6b2FiYm94eWNmZGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NjI0MjEsImV4cCI6MjA4NjIzODQyMX0.KGEDbWnaSC7H4_9WtaA78B4YNwT3GqI9Cab9gU_HqZ8'
  };
};

const { url, anonKey } = getSupabaseConfig();
export const supabase = createClient(url, anonKey);

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
  needsSetup?: boolean;
}

export const checkSchemaReady = async (): Promise<ConnectionStatus> => {
  try {
    // 1. Check for organizations (Fundamental table)
    const { error: orgErr } = await supabase.from('organizations').select('id').limit(1);
    
    if (orgErr) {
      // PGRST116 is not an error for existence check, but 42P01 (relation does not exist) is
      if (orgErr.message?.includes('does not exist') || orgErr.code === '42P01') {
        return { connected: false, needsSetup: true, error: "Missing 'organizations' table." };
      }
      // If it's another error (like connection), return it
      return { connected: false, error: orgErr.message };
    }

    // 2. Check for profiles
    const { error: profErr } = await supabase.from('profiles').select('id').limit(1);
    if (profErr && (profErr.message?.includes('does not exist') || profErr.code === '42P01')) {
       return { connected: false, needsSetup: true, error: "Profiles table not found." };
    }

    // 3. Check for service_requests
    const { error: srErr } = await supabase.from('service_requests').select('id').limit(1);
    if (srErr && (srErr.message?.includes('does not exist') || srErr.code === '42P01')) {
      return { connected: false, needsSetup: true, error: "Service Requests table not found." };
    }
    
    return { connected: true };
  } catch (e: any) {
    return { connected: false, error: e.message || 'Unknown error' };
  }
};
