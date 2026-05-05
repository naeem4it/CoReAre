import PortalLayout from '../PortalLayout';

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return <PortalLayout portalRole="TENANT_ADMIN">{children}</PortalLayout>;
}
