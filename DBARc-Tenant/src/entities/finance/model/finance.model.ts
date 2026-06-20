export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  category: 'COD_COLLECTION' | 'DELIVERY_FEE' | 'COMMISSION' | 'WITHDRAWAL' | 'GST';
}

export interface WalletStats {
  availableBalance: number;
  pendingCod: number;
  totalDeliveryCharges: number;
}

export interface SettlementShipper {
  id: string;
  name: string;
  pendingCod: number;
}

export const mockTransactions: Transaction[] = [
  { id: 'TXN-101', date: '2024-04-27', description: 'COD Collection - CR-782101', type: 'CREDIT', amount: 2500, status: 'COMPLETED', category: 'COD_COLLECTION' },
  { id: 'TXN-102', date: '2024-04-27', description: 'Delivery Fee - CR-782101', type: 'DEBIT', amount: 250, status: 'COMPLETED', category: 'DELIVERY_FEE' },
  { id: 'TXN-103', date: '2024-04-27', description: 'Platform Commission (5%)', type: 'DEBIT', amount: 125, status: 'COMPLETED', category: 'COMMISSION' },
  { id: 'TXN-104', date: '2024-04-26', description: 'Withdrawal Request', type: 'DEBIT', amount: 5000, status: 'PENDING', category: 'WITHDRAWAL' },
  { id: 'TXN-105', date: '2024-04-25', description: 'COD Collection - CR-782105', type: 'CREDIT', amount: 500, status: 'COMPLETED', category: 'COD_COLLECTION' },
];

export const mockSettlementShippers: SettlementShipper[] = [
  { id: 'SH-001', name: 'Blue Wave Fashion', pendingCod: 45000 },
  { id: 'SH-002', name: 'Tech Gadgets Store', pendingCod: 12000 },
  { id: 'SH-003', name: 'Organic Foods Co.', pendingCod: 8500 },
];
