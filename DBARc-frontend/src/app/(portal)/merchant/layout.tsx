import PortalLayout from '../PortalLayout';

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return <PortalLayout portalRole="SHIPPER">{children}</PortalLayout>;
}
