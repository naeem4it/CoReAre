'use client';

import * as React from 'react';
import { apiClient } from '@/shared/api/api-client';
import { Parcel } from '@/types/generated/parcel.types';
import { StrapiCollectionResponse } from '@/types/strapi.types';

type FeedItem = {
  id: string | number;
  title: string;
  detail: string;
  time: string;
  icon: string;
  bgColor: string;
  textColor: string;
};

export const LiveOperationsFeed = () => {
  const [feedItems, setFeedItems] = React.useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get<StrapiCollectionResponse<Parcel>>('/parcels?sort[0]=updatedAt:desc&pagination[limit]=8');
        const parcels = response.data?.data || [];
        
        if (parcels.length > 0) {
          const dynamicItems: FeedItem[] = parcels.map((p: Parcel) => {
            const dateVal = p.updatedAt || p.createdAt || new Date();
            const timeDiff = Date.now() - new Date(dateVal).getTime();
            const minutes = Math.max(1, Math.floor(timeDiff / 60000));
            const timeStr = minutes < 60 ? `${minutes} mins ago` : `${Math.floor(minutes / 60)} hours ago`;
            
            const isDelivered = p.status === 'Delivered';
            const isFailed = ['Ready To Return', 'Returned', 'Failed Attempt'].includes(p.status || '');
            const trackingNum = p.tracking_number || String(p.id);
            const statusStr = p.status ? p.status.replace('_', ' ') : 'Created';
            
            return {
              id: p.id,
              title: isDelivered 
                ? `Shipment #${trackingNum} Delivered` 
                : isFailed 
                ? `Shipment #${trackingNum} ${statusStr}` 
                : `Shipment #${trackingNum} Active`,
              detail: `Recipient: ${p.recipient_name || 'N/A'} • Status: ${statusStr}`,
              time: timeStr,
              icon: isDelivered ? 'check_circle' : isFailed ? 'warning' : 'local_shipping',
              bgColor: isDelivered ? 'bg-emerald-100' : isFailed ? 'bg-error-container/40' : 'bg-primary/10',
              textColor: isDelivered ? 'text-emerald-600' : isFailed ? 'text-error' : 'text-primary',
            };
          });

          setFeedItems(dynamicItems);
        } else {
          setFeedItems([]);
        }
      } catch (error) {
        console.warn('Could not load live operations feed:', error);
        setFeedItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentActivities();
  }, []);

  return (
    <div className="bg-white rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] flex flex-col h-[500px]">
      <div className="p-md border-b border-outline-variant bg-white/50 backdrop-blur-sm sticky top-0 flex items-center justify-between">
        <h2 className="font-headline-md text-headline-md text-on-surface">Live Operations Feed</h2>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
      </div>
      <div className="flex-1 overflow-y-auto p-md custom-scrollbar flex flex-col gap-md">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-outline">
            Loading real-time feed...
          </div>
        ) : feedItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-sm text-outline p-6 text-center">
            <span className="material-symbols-outlined text-4xl text-outline mb-2">inbox</span>
            <p>No recent operations logged.</p>
            <p className="text-xs text-secondary mt-1">Book or update shipments to see live operational events here.</p>
          </div>
        ) : (
          feedItems.map((item, idx) => (
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
          ))
        )}
      </div>
    </div>
  );
};
