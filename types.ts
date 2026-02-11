
export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export enum SRStatus {
  NEW = 'New',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved',
  CLOSED = 'Closed'
}

export enum SRSource {
  WHATSAPP = 'WhatsApp',
  WEB = 'Web',
  VOICE = 'Voice'
}

export enum BlockType {
  BUILDING = 'Building',
  FLOOR = 'Floor',
  APARTMENT = 'Apartment',
  SPACE = 'Space'
}

export interface Organization {
  id: string;
  name: string;
}

export interface UserProfile {
  id: string;
  org_id: string | null;
  phone: string;
  full_name: string;
  onboarded: boolean;
  role: 'admin' | 'tenant';
}

export interface Site {
  id: string;
  org_id: string;
  name: string;
  code: string;
  location: string;
  status: Status;
}

export interface Block {
  id: string;
  org_id: string;
  site_id: string;
  parent_block_id?: string;
  name: string;
  type: BlockType;
}

export interface Tenant {
  id: string;
  org_id: string;
  site_id: string;
  block_id?: string;
  name: string;
  phone: string;
  status: Status;
  profile_id?: string;
}

export interface Requester {
  id: string;
  org_id: string;
  phone: string;
  name?: string;
  status: 'pending' | 'approved';
  created_at: string;
}

export interface Asset {
  id: string;
  org_id: string;
  site_id: string;
  block_id?: string;
  name: string;
  type: string;
  code: string;
  status: Status;
}

export interface ServiceRequest {
  id: string;
  org_id: string;
  title: string;
  description: string;
  site_id: string | null;
  block_id: string | null;
  asset_id: string | null;
  requester_phone?: string;
  status: SRStatus;
  source: SRSource;
  resolution_notes?: string;
  created_at: string;
}

export interface TabConfig {
  id: string;
  label: string;
  iconName: 'LayoutDashboard' | 'Wrench' | 'MapPin' | 'Package' | 'Users' | 'UserCheck';
  isVisible: boolean;
}

// Interface for AI-extracted Service Request data
export interface ExtractedSR {
  title: string;
  siteNameHint: string;
  assetNameHint: string;
}
