import PortalLayout from '../PortalLayout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <PortalLayout portalRole="SUPER_ADMIN">{children}</PortalLayout>;
}
