
import { createClient } from '@supabase/supabase-js';

// Prioritize environment variables for production security
const supabaseUrl = process.env?.SUPABASE_URL || 'https://oygdrtvzoabboxycfdil.supabase.co';
const supabaseAnonKey = process.env?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Z2RydHZ6b2FiYm94eWNmZGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NjI0MjEsImV4cCI6MjA4NjIzODQyMX0.KGEDbWnaSC7H4_9WtaA78B4YNwT3GqI9Cab9gU_HqZ8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
  needsSetup?: boolean;
}

export const checkConnection = async (): Promise<ConnectionStatus> => {
  try {
    const { error } = await supabase.from('sites').select('id').limit(1);
    
    if (error) {
      const isMissingTable = error.code === '42P01' || error.message.includes('does not exist');
      return { 
        connected: isMissingTable, 
        error: error.message,
        needsSetup: isMissingTable 
      };
    }
    
    return { connected: true };
  } catch (e: any) {
    return { 
      connected: false, 
      error: e.message || 'Unknown connection error' 
    };
  }
};
