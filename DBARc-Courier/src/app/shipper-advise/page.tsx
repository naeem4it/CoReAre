'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';

export default function ShipperAdvisePage() {
  return (
    <PortalLayout>
      {/* Content Canvas */}
      <div className="p-lg max-w-[1280px] mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl">
          <div>
            <div className="flex items-center gap-xs text-primary mb-1">
              <span className="material-symbols-outlined text-sm">assignment_return</span>
              <span className="font-label-md text-label-md uppercase tracking-widest">Delivery Management</span>
            </div>
            <h2 className="font-display-lg text-display-lg text-on-background">Shipper Advise</h2>
            <p className="text-on-surface-variant font-body-md text-body-md mt-1">Manage and resolve failed delivery attempts across your shipment network.</p>
          </div>
          {/* Filters Section */}
          <div className="flex items-center gap-sm bg-white p-2 rounded-xl border border-outline-variant shadow-sm">
            <div className="flex flex-col px-3 border-r border-outline-variant">
              <label className="font-label-md text-[10px] text-outline uppercase">From Date</label>
              <input className="border-none p-0 focus:ring-0 text-tabular-nums text-sm font-medium" type="date" defaultValue="2024-05-01" />
            </div>
            <div className="flex flex-col px-3 border-r border-outline-variant">
              <label className="font-label-md text-[10px] text-outline uppercase">To Date</label>
              <input className="border-none p-0 focus:ring-0 text-tabular-nums text-sm font-medium" type="date" defaultValue="2024-05-14" />
            </div>
            <button className="bg-primary-container text-on-primary-container p-2 rounded-lg hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md mb-xl">
          <div className="bg-white p-md rounded-xl border border-outline-variant shadow-sm flex items-center gap-md">
            <div className="w-12 h-12 rounded-full bg-error-container/20 flex items-center justify-center text-error">
              <span className="material-symbols-outlined">error_outline</span>
            </div>
            <div>
              <p className="font-label-md text-label-md text-outline">Total Failed</p>
              <h3 className="font-headline-lg text-headline-lg text-on-background">124</h3>
            </div>
          </div>
          <div className="bg-white p-md rounded-xl border border-outline-variant shadow-sm flex items-center gap-md">
            <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
            <div>
              <p className="font-label-md text-label-md text-outline">Pending Advice</p>
              <h3 className="font-headline-lg text-headline-lg text-on-background">48</h3>
            </div>
          </div>
          <div className="bg-white p-md rounded-xl border border-outline-variant shadow-sm flex items-center gap-md">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700">
              <span className="material-symbols-outlined">task_alt</span>
            </div>
            <div>
              <p className="font-label-md text-label-md text-outline">Resolved Today</p>
              <h3 className="font-headline-lg text-headline-lg text-on-background">12</h3>
            </div>
          </div>
          <div className="bg-white p-md rounded-xl border border-outline-variant shadow-sm flex items-center gap-md">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline">
              <span className="material-symbols-outlined">timer</span>
            </div>
            <div>
              <p className="font-label-md text-label-md text-outline">Avg. Response</p>
              <h3 className="font-headline-lg text-headline-lg text-on-background">4.2h</h3>
            </div>
          </div>
        </div>

        {/* Main Data Table Container */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="p-md border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
            <h4 className="font-headline-md text-headline-md text-on-surface">Recent Failed Attempts</h4>
            <div className="flex items-center gap-sm">
              <button className="flex items-center gap-xs px-3 py-1.5 border border-outline-variant rounded-lg text-label-md font-label-md hover:bg-white transition-colors">
                <span className="material-symbols-outlined text-sm">download</span> Export CSV
              </button>
              <div className="h-6 w-[1px] bg-outline-variant"></div>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center text-outline hover:text-primary"><span className="material-symbols-outlined">chevron_left</span></button>
                <span className="text-label-md font-label-md">Page 1 of 12</span>
                <button className="w-8 h-8 flex items-center justify-center text-outline hover:text-primary"><span className="material-symbols-outlined">chevron_right</span></button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 font-label-md text-label-md text-outline border-b border-outline-variant">
                  <th className="px-md py-3 font-semibold">SHIPMENT #</th>
                  <th className="px-md py-3 font-semibold">SHIPMENT DATE</th>
                  <th className="px-md py-3 font-semibold">STATUS</th>
                  <th className="px-md py-3 font-semibold">STATUS DATE</th>
                  <th className="px-md py-3 font-semibold">REASON</th>
                  <th className="px-md py-3 font-semibold">DESTINATION</th>
                  <th className="px-md py-3 font-semibold">SHIPPER ADVICE</th>
                  <th className="px-md py-3 font-semibold text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md text-on-surface">
                {/* Row 1 */}
                <tr className="border-b border-outline-variant hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-md py-4 font-tabular-nums font-bold text-primary">#FL-98231</td>
                  <td className="px-md py-4 text-outline">12 May 2024</td>
                  <td className="px-md py-4">
                    <span className="px-2 py-1 rounded bg-error/10 text-error font-semibold text-[11px] uppercase tracking-wider">Attempt 1</span>
                  </td>
                  <td className="px-md py-4 text-outline">14 May 2024</td>
                  <td className="px-md py-4 font-medium">Consignee Not Available</td>
                  <td className="px-md py-4">Dubai, UAE</td>
                  <td className="px-md py-4">
                    <div className="flex items-center gap-xs text-outline italic">
                      <span className="material-symbols-outlined text-sm">history_edu</span>
                      Awaiting advice...
                    </div>
                  </td>
                  <td className="px-md py-4 text-right">
                    <button className="px-4 py-1.5 bg-primary text-white rounded-lg text-label-md font-bold hover:bg-primary-container transition-colors">Provide Advice</button>
                  </td>
                </tr>
                {/* Row 2 */}
                <tr className="border-b border-outline-variant hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-md py-4 font-tabular-nums font-bold text-primary">#FL-98105</td>
                  <td className="px-md py-4 text-outline">11 May 2024</td>
                  <td className="px-md py-4">
                    <span className="px-2 py-1 rounded bg-secondary-container text-on-secondary-container font-semibold text-[11px] uppercase tracking-wider">Attempt 2</span>
                  </td>
                  <td className="px-md py-4 text-outline">13 May 2024</td>
                  <td className="px-md py-4 font-medium">Incorrect Address</td>
                  <td className="px-md py-4">London, UK</td>
                  <td className="px-md py-4">
                    <div className="max-w-[180px] truncate text-xs text-on-surface-variant bg-surface-container p-2 rounded">
                      Reroute to Warehouse B...
                    </div>
                  </td>
                  <td className="px-md py-4 text-right">
                    <button className="px-4 py-1.5 border border-outline text-on-surface rounded-lg text-label-md font-bold hover:bg-surface-container-low transition-colors">View Details</button>
                  </td>
                </tr>
                {/* Row 3 */}
                <tr className="border-b border-outline-variant hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-md py-4 font-tabular-nums font-bold text-primary">#FL-97992</td>
                  <td className="px-md py-4 text-outline">10 May 2024</td>
                  <td className="px-md py-4">
                    <span className="px-2 py-1 rounded bg-error/10 text-error font-semibold text-[11px] uppercase tracking-wider">Attempt 1</span>
                  </td>
                  <td className="px-md py-4 text-outline">13 May 2024</td>
                  <td className="px-md py-4 font-medium">Refused by Consignee</td>
                  <td className="px-md py-4">New York, US</td>
                  <td className="px-md py-4">
                    <div className="flex items-center gap-xs text-outline italic">
                      <span className="material-symbols-outlined text-sm">history_edu</span>
                      Awaiting advice...
                    </div>
                  </td>
                  <td className="px-md py-4 text-right">
                    <button className="px-4 py-1.5 bg-primary text-white rounded-lg text-label-md font-bold hover:bg-primary-container transition-colors">Provide Advice</button>
                  </td>
                </tr>
                {/* Row 4 */}
                <tr className="border-b border-outline-variant hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-md py-4 font-tabular-nums font-bold text-primary">#FL-97881</td>
                  <td className="px-md py-4 text-outline">09 May 2024</td>
                  <td className="px-md py-4">
                    <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 font-semibold text-[11px] uppercase tracking-wider">Attempt 3</span>
                  </td>
                  <td className="px-md py-4 text-outline">12 May 2024</td>
                  <td className="px-md py-4 font-medium">Payment Issue (COD)</td>
                  <td className="px-md py-4">Karachi, PK</td>
                  <td className="px-md py-4">
                    <div className="flex items-center gap-xs text-green-600 font-medium text-xs">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Contacted &amp; Resolved
                    </div>
                  </td>
                  <td className="px-md py-4 text-right">
                    <button className="px-4 py-1.5 border border-outline text-on-surface rounded-lg text-label-md font-bold hover:bg-surface-container-low transition-colors">View Logs</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Contextual Insight/Guidance Section */}
        <div className="mt-xl grid grid-cols-1 lg:grid-cols-3 gap-lg">
          <div className="lg:col-span-2 relative h-[320px] rounded-2xl overflow-hidden shadow-lg group">
            <img alt="System view" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBRJqhJDOh1YkLzrRsEBgAJ5PyhtS334hky5khHHaLAcbpDOvroTMGE0JzI6-QBDkbMdn3okBYLRErtGZ6289UVSUlToJZylgM9ZJDbs8WURJbU7L9hqtBxrw1_oa5ncbWpcLJ0FEsj2-Kp7c8YjCJlCQl-ZZXNcG2gAgRbuswGWrvRft29KJf00kbgNjcslMNoDRvsmkrhC8b8fvkJYwCQ1wlA54T-YNjCyf2tFW3EHUpyEtg7T3ytoSHYPA5cTv_9pUsP1dtr60A" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-xl">
              <span className="text-primary-fixed bg-primary/20 px-3 py-1 rounded-full text-label-md font-bold w-fit mb-2">Platform Context</span>
              <h4 className="text-white font-headline-lg text-headline-lg mb-2">Velocity Corporate Integration</h4>
              <p className="text-slate-300 font-body-md text-body-md max-w-xl">
                Our Shipper Advise module is directly synced with real-time driver telemetry. Failed attempts trigger instant notifications to the corporate dashboard, reducing RTO (Return to Origin) rates by up to 22%.
              </p>
            </div>
          </div>
          <div className="bg-primary p-xl rounded-2xl text-on-primary flex flex-col justify-between">
            <div>
              <span className="material-symbols-outlined text-4xl mb-md">lightbulb</span>
              <h4 className="font-headline-md text-headline-md mb-sm">Resolution Tip</h4>
              <p className="font-body-md text-body-md opacity-90 leading-relaxed">
                Most "Consignee Not Available" statuses are resolved by authorizing a secondary delivery window between 5 PM and 8 PM. Use the 'Provide Advice' button to set a preferred re-delivery slot.
              </p>
            </div>
            <button className="mt-lg w-full py-3 bg-white text-primary rounded-xl font-bold hover:bg-surface-container-low transition-colors">
              Read Optimization Guide
            </button>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
