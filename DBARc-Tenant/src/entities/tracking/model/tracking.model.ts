export interface TrackingStep {
  status: string;
  location: string;
  date: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface TrackingInfo {
  trackingId: string;
  status: 'Created' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Failed';
  timeline: TrackingStep[];
  rider?: {
    name: string;
    phone: string;
    photo: string;
  };
}

export const mockTrackingData: Record<string, TrackingInfo> = {
  'CR-782101': {
    trackingId: 'CR-782101',
    status: 'Delivered',
    timeline: [
      { status: 'Order Created', location: 'Warehouse - Karachi', date: '2024-04-25 10:00 AM', isCompleted: true, isCurrent: false },
      { status: 'In Transit', location: 'Dispatch Center - Lahore', date: '2024-04-26 09:00 AM', isCompleted: true, isCurrent: false },
      { status: 'Out for Delivery', location: 'Lahore South', date: '2024-04-27 11:00 AM', isCompleted: true, isCurrent: false },
      { status: 'Delivered', location: 'Customer Doorstep', date: '2024-04-27 02:30 PM', isCompleted: true, isCurrent: true },
    ],
  },
  'CR-782102': {
    trackingId: 'CR-782102',
    status: 'Out for Delivery',
    timeline: [
      { status: 'Order Created', location: 'Warehouse - Karachi', date: '2024-04-26 11:00 AM', isCompleted: true, isCurrent: false },
      { status: 'In Transit', location: 'Dispatch Center - Islamabad', date: '2024-04-27 08:00 AM', isCompleted: true, isCurrent: false },
      { status: 'Out for Delivery', location: 'Islamabad Blue Area', date: '2024-04-27 12:00 PM', isCompleted: false, isCurrent: true },
      { status: 'Delivered', location: 'Pending', date: '-', isCompleted: false, isCurrent: false },
    ],
    rider: {
      name: 'Ahmed Khan',
      phone: '+92 300 XXXX123',
      photo: 'A',
    },
  },
};
