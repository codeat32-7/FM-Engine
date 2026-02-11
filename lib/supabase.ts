
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env?.SUPABASE_URL || 'https://oygdrtvzoabboxycfdil.supabase.co';
const supabaseAnonKey = process.env?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Z2RydHZ6b2FiYm94eWNmZGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NjI0MjEsImV4cCI6MjA4NjIzODQyMX0.KGEDbWnaSC7H4_9WtaA78B4YNwT3GqI9Cab9gU_HqZ8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 🛠 MASTER SCHEMA SETUP (Supabase SQL Editor):
 * 
 * -- 1. Unified Profiles (Identity & RBAC)
 * CREATE TABLE IF NOT EXISTS profiles (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   org_id UUID REFERENCES organizations(id),
 *   phone TEXT UNIQUE NOT NULL,
 *   full_name TEXT,
 *   role TEXT NOT NULL CHECK (role IN ('admin', 'tenant')),
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 2. Requesters (The Intake Queue)
 * CREATE TABLE IF NOT EXISTS requesters (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   org_id UUID REFERENCES organizations(id),
 *   phone TEXT NOT NULL UNIQUE,
 *   status TEXT DEFAULT 'pending',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 3. Service Requests Column
 * ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS requester_phone TEXT;
 */

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
  needsSetup?: boolean;
}

export const checkSchemaReady = async (): Promise<ConnectionStatus> => {
  try {
    const { error: profErr } = await supabase.from('profiles').select('id').limit(1);
    if (profErr && (profErr.code === 'PGRST205' || profErr.message.includes('does not exist'))) {
      return { connected: false, needsSetup: true, error: "Missing 'profiles' table." };
    }

    const { error: srErr } = await supabase.from('service_requests').select('requester_phone').limit(1);
    if (srErr && (srErr.message.includes('column') || srErr.message.includes('does not exist'))) {
      return { connected: false, needsSetup: true, error: "Missing 'requester_phone' column." };
    }
    
    return { connected: true };
  } catch (e: any) {
    return { connected: false, error: e.message || 'Unknown error' };
  }
};
