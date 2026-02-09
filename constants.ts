
import { Site, Asset, Status, SRStatus, SRSource, ServiceRequest } from './types';

export const INITIAL_SITES: Site[] = [
  { id: '1', name: 'Olympia Cyberspace', code: 'SITE-598', location: 'Guindy', status: Status.ACTIVE },
  { id: '2', name: 'South Warehouse', code: 'SITE-102', location: 'Perungudi', status: Status.ACTIVE },
];

export const INITIAL_ASSETS: Asset[] = [
  { id: '1', name: 'HVAC', type: 'Electrical', site_id: '1', code: 'AST-4785', status: Status.ACTIVE },
  { id: '2', name: 'Lift System B', type: 'Mechanical', site_id: '1', code: 'AST-4786', status: Status.ACTIVE },
];

export const INITIAL_SRS: ServiceRequest[] = [
  {
    id: 'SR-1',
    title: 'HVAC is broken',
    description: 'No Cooling reported by the floor manager.',
    site_id: '1',
    asset_id: '1',
    status: SRStatus.NEW,
    source: SRSource.WEB,
    created_at: '2024-02-09T20:48:00Z',
  }
];
