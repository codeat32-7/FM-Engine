import { ServiceRequest, SRStatus } from '../types';

/** Mean hours from created_at to resolved_at for resolved/closed SRs. */
export function meanResolutionHours(srs: ServiceRequest[]): number | null {
  const done = srs.filter(
    sr => (sr.status === SRStatus.RESOLVED || sr.status === SRStatus.CLOSED) && sr.resolved_at
  );
  if (done.length === 0) return null;
  let totalMs = 0;
  let n = 0;
  for (const sr of done) {
    const start = new Date(sr.created_at).getTime();
    const end = new Date(sr.resolved_at!).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      totalMs += end - start;
      n++;
    }
  }
  if (n === 0) return null;
  return totalMs / n / 3600000;
}

export function formatMeanResolution(hours: number | null): string {
  if (hours == null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}
