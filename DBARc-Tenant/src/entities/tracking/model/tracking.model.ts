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

