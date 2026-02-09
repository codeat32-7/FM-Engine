
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
  WEB = 'Web'
}

export interface Site {
  id: string;
  name: string;
  code: string;
  location: string;
  status: Status;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  site_id: string;
  code: string;
  status: Status;
}

export interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  site_id: string | null;
  asset_id: string | null;
  status: SRStatus;
  source: SRSource;
  created_at: string;
}

export interface ExtractedSR {
  title: string;
  siteNameHint: string;
  assetNameHint: string;
}
