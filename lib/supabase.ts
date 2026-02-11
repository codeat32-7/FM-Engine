
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env?.SUPABASE_URL || 'https://oygdrtvzoabboxycfdil.supabase.co';
const supabaseAnonKey = process.env?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Z2RydHZ6b2FiYm94eWNmZGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NjI0MjEsImV4cCI6MjA4NjIzODQyMX0.KGEDbWnaSC7H4_9WtaA78B4YNwT3GqI9Cab9gU_HqZ8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 🛠 MASTER SCHEMA SETUP (Supabase SQL Editor):
 * 
 * -- 1. Service Requests Column
 * ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS requester_phone TEXT;
 * 
 * -- 2. Requester Table (CRITICAL: phone must be UNIQUE)
 * CREATE TABLE IF NOT EXISTS requesters (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   org_id UUID REFERENCES organizations(id),
 *   phone TEXT NOT NULL UNIQUE,
 *   name TEXT,
 *   status TEXT DEFAULT 'pending',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 3. Database Publications for Realtime
 * -- Make sure 'service_requests' and 'requesters' are selected in:
 * -- Database > Publications > supabase_realtime
 */

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
  needsSetup?: boolean;
}

export const checkSchemaReady = async (): Promise<ConnectionStatus> => {
  try {
    const { error: orgErr } = await supabase.from('organizations').select('id').limit(1);
    if (orgErr && (orgErr.code === 'PGRST205' || orgErr.message.includes('does not exist'))) {
      return { connected: false, needsSetup: true, error: "Missing 'organizations' table." };
    }

    const { error: srErr } = await supabase.from('service_requests').select('requester_phone').limit(1);
    if (srErr && (srErr.message.includes('column') || srErr.message.includes('does not exist'))) {
      return { connected: false, needsSetup: true, error: "Missing 'requester_phone' column in service_requests table." };
    }

    const { error: reqErr } = await supabase.from('requesters').select('id').limit(1);
    if (reqErr && (reqErr.code === 'PGRST205' || reqErr.message.includes('does not exist'))) {
      return { connected: false, needsSetup: true, error: "Missing 'requesters' table." };
    }
    
    return { connected: true };
  } catch (e: any) {
    return { connected: false, error: e.message || 'Unknown connection error' };
  }
};
