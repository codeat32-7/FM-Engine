
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env?.SUPABASE_URL || 'https://oygdrtvzoabboxycfdil.supabase.co';
const supabaseAnonKey = process.env?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Z2RydHZ6b2FiYm94eWNmZGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NjI0MjEsImV4cCI6MjA4NjIzODQyMX0.KGEDbWnaSC7H4_9WtaA78B4YNwT3GqI9Cab9gU_HqZ8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 🛠 MASTER SCHEMA SETUP (Run this in Supabase SQL Editor):
 * 
 * -- 1. Organizations
 * CREATE TABLE IF NOT EXISTS organizations (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 2. Unified Profiles
 * CREATE TABLE IF NOT EXISTS profiles (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   org_id UUID REFERENCES organizations(id),
 *   phone TEXT UNIQUE NOT NULL,
 *   full_name TEXT,
 *   role TEXT NOT NULL CHECK (role IN ('admin', 'tenant')),
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 3. Sites & Blocks
 * CREATE TABLE IF NOT EXISTS sites (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   org_id UUID REFERENCES organizations(id),
 *   name TEXT NOT NULL,
 *   code TEXT,
 *   location TEXT,
 *   status TEXT DEFAULT 'ACTIVE',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE IF NOT EXISTS blocks (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   org_id UUID REFERENCES organizations(id),
 *   site_id UUID REFERENCES sites(id),
 *   name TEXT NOT NULL,
 *   type TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 4. Service Requests (Ticket System)
 * CREATE TABLE IF NOT EXISTS service_requests (
 *   id TEXT PRIMARY KEY,
 *   org_id UUID REFERENCES organizations(id),
 *   site_id UUID REFERENCES sites(id),
 *   asset_id UUID,
 *   block_id UUID,
 *   title TEXT NOT NULL,
 *   description TEXT,
 *   requester_phone TEXT,
 *   status TEXT DEFAULT 'New',
 *   source TEXT DEFAULT 'Web',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 5. Requesters (Approval Queue)
 * CREATE TABLE IF NOT EXISTS requesters (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   org_id UUID REFERENCES organizations(id),
 *   phone TEXT NOT NULL UNIQUE,
 *   status TEXT DEFAULT 'pending',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 */

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
  needsSetup?: boolean;
}

export const checkSchemaReady = async (): Promise<ConnectionStatus> => {
  try {
    // Basic connectivity and table existence check
    const { error: profErr } = await supabase.from('profiles').select('id').limit(1);
    if (profErr && (profErr.code === 'PGRST204' || profErr.message.includes('does not exist'))) {
      return { connected: false, needsSetup: true, error: "Missing 'profiles' table. Please check your Supabase schema." };
    }

    // Check for requester_phone column specifically as it's often missed
    const { error: srErr } = await supabase.from('service_requests').select('requester_phone').limit(1);
    if (srErr && (srErr.message.includes('column') || srErr.message.includes('does not exist'))) {
      return { connected: false, needsSetup: true, error: "Missing 'requester_phone' column in service_requests table." };
    }
    
    return { connected: true };
  } catch (e: any) {
    return { connected: false, error: e.message || 'Unknown error' };
  }
};
