'use client';

import * as React from 'react';

export const FleetDistributionMap = () => {
  return (
    <div className="lg:col-span-2 bg-white rounded-xl border border-outline-variant overflow-hidden shadow-[0px_1px_3px_rgba(0,0,0,0.05)] flex flex-col h-[500px]">
      <div className="p-md border-b border-outline-variant flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Fleet Geographic Distribution</h2>
          <p className="text-on-surface-variant font-body-md text-body-md">Live monitoring across 42 routes</p>
        </div>
        <button className="text-primary font-label-md text-label-md flex items-center gap-1 hover:underline cursor-pointer">
          Open Map <span className="material-symbols-outlined text-[16px]">open_in_new</span>
        </button>
      </div>
      <div className="flex-1 bg-surface-container-low relative">
        <img
          alt="Fleet status"
          className="w-full h-full object-cover grayscale-[0.2]"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFAeu2cWS7G_K0P_RS6myAyueOr2IZpR7W1KsMQtrziBRcMziYLcwGtLuX1JoCYhmoKmd6It_KjxrOXwEmtbZMS0Y33VAciUnLgyPSHzRnuc2FtftwaqzaQSupQi0EVuhpPPL0Grvkpj_ZPxGKwwzrX0m84v-nQ0Sbp-3ObWF1J0aUDtcAqP-lJpabWeirDha-zbSpvZZuJYZhz7FvNY8tKVE8p9bw8B8WQH8fkOPfNUaF6WhwlI7uPantqPFUC5Zj73A8peoVUtw"
        />
        {/* Simulated Overlay Markers */}
        <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-primary rounded-full ring-4 ring-primary/20 animate-pulse"></div>
        <div className="absolute top-1/2 left-2/3 w-4 h-4 bg-primary rounded-full ring-4 ring-primary/20 animate-pulse"></div>
        <div className="absolute bottom-1/3 left-1/2 w-4 h-4 bg-tertiary rounded-full ring-4 ring-tertiary/20"></div>
      </div>
    </div>
  );
};
