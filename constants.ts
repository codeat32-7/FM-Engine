
import { Site, Asset, Status, SRStatus, SRSource, ServiceRequest } from './types';

// Use a dummy organization ID for initial system data
const SYSTEM_ORG_ID = 'system-org';

export const INITIAL_SITES: Site[] = [
  // Fixed: Replaced user_id with org_id to match Site interface
  { id: '1', org_id: SYSTEM_ORG_ID, name: 'Olympia Cyberspace', code: 'SITE-598', location: 'Guindy', status: Status.ACTIVE },
  { id: '2', org_id: SYSTEM_ORG_ID, name: 'South Warehouse', code: 'SITE-102', location: 'Perungudi', status: Status.ACTIVE },
];

export const INITIAL_ASSETS: Asset[] = [
  // Fixed: Replaced user_id with org_id to match Asset interface
  { id: '1', org_id: SYSTEM_ORG_ID, name: 'HVAC', type: 'Electrical', site_id: '1', code: 'AST-4785', status: Status.ACTIVE },
  { id: '2', org_id: SYSTEM_ORG_ID, name: 'Lift System B', type: 'Mechanical', site_id: '1', code: 'AST-4786', status: Status.ACTIVE },
];

export const INITIAL_SRS: ServiceRequest[] = [
  {
    id: 'SR-1',
    // Fixed: Replaced user_id with org_id to match ServiceRequest interface
    org_id: SYSTEM_ORG_ID,
    title: 'HVAC is broken',
    description: 'No Cooling reported by the floor manager.',
    site_id: '1',
    block_id: null,
    asset_id: '1',
    status: SRStatus.NEW,
    source: SRSource.WEB,
    created_at: '2024-02-09T20:48:00Z',
  }
];