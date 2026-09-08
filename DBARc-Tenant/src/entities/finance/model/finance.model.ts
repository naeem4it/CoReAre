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

