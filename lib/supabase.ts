
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env?.SUPABASE_URL || 'https://oygdrtvzoabboxycfdil.supabase.co';
const supabaseAnonKey = process.env?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Z2RydHZ6b2FiYm94eWNmZGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NjI0MjEsImV4cCI6MjA4NjIzODQyMX0.KGEDbWnaSC7H4_9WtaA78B4YNwT3GqI9Cab9gU_HqZ8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
  needsSetup?: boolean;
}

export const checkSchemaReady = async (): Promise<ConnectionStatus> => {
  try {
    // 1. Check for organizations (Fundamental table)
    const { error: orgErr } = await supabase.from('organizations').select('id').limit(1);
    if (orgErr && (orgErr.code === 'PGRST204' || orgErr.message.includes('does not exist'))) {
      return { connected: false, needsSetup: true, error: "Missing 'organizations' table." };
    }

    // 2. Check for profiles
    const { error: profErr } = await supabase.from('profiles').select('id').limit(1);
    if (profErr) {
       return { connected: false, needsSetup: true, error: "Profiles table not accessible." };
    }

    // 3. Check for service_requests (Check specifically for the column used by WhatsApp)
    const { error: srErr } = await supabase.from('service_requests').select('requester_phone').limit(1);
    if (srErr && (srErr.message.includes('column') || srErr.message.includes('does not exist'))) {
      return { connected: false, needsSetup: true, error: "Missing 'requester_phone' column in service_requests table." };
    }
    
    return { connected: true };
  } catch (e: any) {
    return { connected: false, error: e.message || 'Unknown error' };
  }
};
