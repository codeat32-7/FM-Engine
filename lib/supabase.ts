
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env?.SUPABASE_URL || 'https://oygdrtvzoabboxycfdil.supabase.co';
const supabaseAnonKey = process.env?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Z2RydHZ6b2FiYm94eWNmZGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NjI0MjEsImV4cCI6MjA4NjIzODQyMX0.KGEDbWnaSC7H4_9WtaA78B4YNwT3GqI9Cab9gU_HqZ8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * SQL FOR SUPABASE SQL EDITOR:
 * 
 * CREATE TABLE requesters (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   org_id UUID REFERENCES organizations(id),
 *   phone TEXT NOT NULL,
 *   name TEXT,
 *   status TEXT DEFAULT 'pending',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * ALTER TABLE requesters REPLICA IDENTITY FULL;
 */

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
  needsSetup?: boolean;
}

export const checkSchemaReady = async (): Promise<ConnectionStatus> => {
  try {
    // Check if essential tables exist
    const { error: orgErr } = await supabase.from('organizations').select('id').limit(1);
    if (orgErr && (orgErr.code === 'PGRST205' || orgErr.message.includes('does not exist'))) {
      return { connected: false, needsSetup: true, error: "Missing 'organizations' table." };
    }

    const { error: reqErr } = await supabase.from('requesters').select('id').limit(1);
    if (reqErr && (reqErr.code === 'PGRST205' || reqErr.message.includes('does not exist'))) {
      return { connected: false, needsSetup: true, error: "Missing 'requesters' table. Please run the SQL migration." };
    }
    
    return { connected: true };
  } catch (e: any) {
    return { connected: false, error: e.message || 'Unknown connection error' };
  }
};
