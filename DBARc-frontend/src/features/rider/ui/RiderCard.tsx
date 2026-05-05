import * as React from 'react';
import { cn } from '@/shared/lib/utils';
import { MapPin, ChevronRight } from 'lucide-react';

interface RiderCardProps {
  id: string;
  recipient: string;
  address: string;
  amount?: string;
  isPaid?: boolean;
  onClick?: () => void;
}

export const RiderCard: React.FC<RiderCardProps> = ({
  id,
  recipient,
  address,
  amount,
  isPaid,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300',
        'bg-slate-rider/70 backdrop-blur-xl border border-white/10 text-white',
        'hover:bg-slate-rider/80 hover:border-primary-rider/30 active:scale-[0.98]'
      )}
    >
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold text-white/90">#{id} - {recipient}</h4>
        <div className="flex items-center gap-1 text-xs text-white/60">
          <MapPin className="h-3 w-3" />
          <span>{address}</span>
        </div>
        <div className="mt-2">
          {amount ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-rider/20 text-primary-rider">
              COD: {amount}
            </span>
          ) : isPaid ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
              PREPAID
            </span>
          ) : null}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-white/30 group-hover:text-primary-rider transition-colors" />
    </div>
  );
};
