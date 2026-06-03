'use client';

import * as React from 'react';
import { apiClient } from '@/shared/api/api-client';

type FeedItem = {
  id: string | number;
  title: string;
  detail: string;
  time: string;
  icon: string;
  bgColor: string;
  textColor: string;
};

const DEFAULT_FEED: FeedItem[] = [
  {
    id: 1,
    title: 'Shipment #2394 Delivered',
    detail: 'KHI-82 to Blue Area, Islamabad',
    time: '2 mins ago',
    icon: 'local_shipping',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-600',
  },
  {
    id: 2,
    title: 'Weather Delay Warning',
    detail: 'Route Lahore-Faisalabad affected by heavy rain.',
    time: '15 mins ago',
    icon: 'warning',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-600',
  },
  {
    id: 3,
    title: 'Bulk Load Sheet Generated',
    detail: 'Warehouse A - Unit 4: 128 new items ready for dispatch.',
    time: '42 mins ago',
    icon: 'inventory_2',
    bgColor: 'bg-primary/10',
    textColor: 'text-primary',
  },
  {
    id: 4,
    title: 'New Fleet Partner',
    detail: 'Swift Movers Ltd added to vendor network.',
    time: '1 hour ago',
    icon: 'person_add',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-500',
  },
];

export const LiveOperationsFeed = () => {
  const [feedItems, setFeedItems] = React.useState<FeedItem[]>(DEFAULT_FEED);

  React.useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        const response = await apiClient.get('/parcels?sort[0]=createdAt:desc&pagination[limit]=4');
        const parcels = response.data?.data || [];
        
        if (parcels.length > 0) {
          const dynamicItems: FeedItem[] = parcels.map((p: any) => {
            const timeDiff = Date.now() - new Date(p.createdAt || p.updatedAt || Date.now()).getTime();
            const minutes = Math.max(1, Math.floor(timeDiff / 60000));
            const timeStr = minutes < 60 ? `${minutes} mins ago` : `${Math.floor(minutes / 60)} hours ago`;
            
            const isDelivered = p.status === 'delivered';
            const trackingNum = p.tracking_number;
            
            return {
              id: p.id,
              title: isDelivered ? `Shipment #${trackingNum} Delivered` : `Shipment #${trackingNum} Updated`,
              detail: `Recipient: ${p.recipient_name || 'N/A'}, status: ${p.status.replace('_', ' ')}`,
              time: timeStr,
              icon: isDelivered ? 'check_circle' : 'inventory_2',
              bgColor: isDelivered ? 'bg-emerald-100' : 'bg-primary/10',
              textColor: isDelivered ? 'text-emerald-600' : 'text-primary',
            };
          });

          // Pad with default items if less than 4 items fetched
          if (dynamicItems.length < 4) {
            setFeedItems([...dynamicItems, ...DEFAULT_FEED.slice(dynamicItems.length)]);
          } else {
            setFeedItems(dynamicItems);
          }
        }
      } catch (error) {
        // Fallback to defaults quietly
      }
    };

    fetchRecentActivities();
  }, []);

  return (
    <div className="bg-white rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] flex flex-col h-[500px]">
      <div className="p-md border-b border-outline-variant bg-white/50 backdrop-blur-sm sticky top-0">
        <h2 className="font-headline-md text-headline-md text-on-surface">Live Operations Feed</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-md custom-scrollbar flex flex-col gap-md">
        {feedItems.map((item, idx) => (
          <div className="flex gap-md group" key={item.id}>
            <div className="relative">
              <div className={`w-8 h-8 rounded-full ${item.bgColor} ${item.textColor} flex items-center justify-center shrink-0`}>
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              </div>
              {idx < feedItems.length - 1 && (
                <div className="absolute top-8 left-1/2 w-[1px] h-full bg-outline-variant"></div>
              )}
            </div>
            <div className="pb-md">
              <p className="font-body-md text-body-md font-semibold text-on-surface">{item.title}</p>
              <p className="text-on-surface-variant font-body-md text-body-md">{item.detail}</p>
              <p className="text-outline text-[12px] font-medium mt-1">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
