/** Consistent work order id across web, portal, and integrations. */
export function generateServiceRequestId(): string {
  return `SR-${Math.floor(100000 + Math.random() * 900000)}`;
}
