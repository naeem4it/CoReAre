'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';

export default function MonthlyInvoiceReportPage() {
  return (
    <PortalLayout>
      <div className="flex-1 overflow-y-auto p-lg space-y-lg">
        {/* Page Header & Filters */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
          <div>
            <h2 className="font-display-lg text-display-lg text-on-background">Monthly Invoice Report</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Review and manage logistical revenue for the current billing cycle.</p>
          </div>
          <div className="flex flex-wrap items-center gap-sm">
            <div className="flex flex-col gap-base">
              <label className="font-label-md text-label-md text-outline">Date Range</label>
              <div className="flex items-center gap-xs bg-surface-container-lowest border border-outline-variant rounded-lg px-sm py-xs">
                <span className="material-symbols-outlined text-[18px] text-outline">calendar_today</span>
                <span className="font-body-md text-body-md">Oct 01 - Oct 31, 2024</span>
                <span className="material-symbols-outlined text-[18px] text-outline">expand_more</span>
              </div>
            </div>
            <div className="flex flex-col gap-base">
              <label className="font-label-md text-label-md text-outline">Status Type</label>
              <div className="flex items-center gap-xs bg-surface-container-lowest border border-outline-variant rounded-lg px-sm py-xs">
                <span className="material-symbols-outlined text-[18px] text-outline">filter_list</span>
                <span className="font-body-md text-body-md">All Invoices</span>
                <span className="material-symbols-outlined text-[18px] text-outline">expand_more</span>
              </div>
            </div>
            <button className="h-[40px] px-md mt-auto bg-surface-container-high hover:bg-surface-container-highest rounded-lg font-label-md text-label-md flex items-center gap-xs transition-all">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export PDF
            </button>
          </div>
        </div>

        {/* Bento Grid Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
          {/* Total Revenue KPI */}
          <div className="col-span-1 md:col-span-2 bg-primary text-on-primary p-md rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            <div className="absolute top-0 right-0 p-lg opacity-10">
              <span className="material-symbols-outlined text-[120px]" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
            </div>
            <div className="relative z-10">
              <p className="font-label-md text-label-md uppercase tracking-widest opacity-80">Total Revenue</p>
              <h3 className="font-display-lg text-[48px] leading-tight font-black">$42,850.00</h3>
            </div>
            <div className="relative z-10 flex items-center gap-xs mt-md">
              <span className="bg-primary-container text-on-primary-container px-xs py-0.5 rounded text-[10px] font-bold">+12.5%</span>
              <span className="text-[12px] opacity-70">vs last month</span>
            </div>
          </div>
          {/* Active Shipments KPI */}
          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-sm flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-secondary-container text-on-secondary-container rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined">local_shipping</span>
              </div>
              <span className="text-error font-bold text-[12px]">87% Delivered</span>
            </div>
            <div>
              <p className="font-label-md text-label-md text-outline">Active Shipments</p>
              <h3 className="font-headline-lg text-headline-lg">1,240</h3>
            </div>
          </div>
          {/* Outstanding Dues KPI */}
          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-sm flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-tertiary-fixed text-on-tertiary-fixed rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined">pending_actions</span>
              </div>
              <span className="text-tertiary font-bold text-[12px]">12 Overdue</span>
            </div>
            <div>
              <p className="font-label-md text-label-md text-outline">Outstanding Dues</p>
              <h3 className="font-headline-lg text-headline-lg">$3,120.50</h3>
            </div>
          </div>
        </div>

        {/* Legacy Context Image Reference */}
        <div className="rounded-xl overflow-hidden border border-outline-variant shadow-sm bg-surface-container-low">
          <div className="px-md py-sm bg-surface-container border-b border-outline-variant flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline uppercase tracking-wider">Reference Archive (Legacy System)</span>
            <span className="bg-surface-variant px-xs py-0.5 rounded text-[10px]">Legacy View</span>
          </div>
          <div className="relative h-[200px] w-full overflow-hidden grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <img alt="Legacy system preview" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCPxYhh6pk0P2HlolUS0rPJ6XTU4qCntuTD3yhiBLyudJlQNPk5b226c7grR3tbxaz4vvjcXFINcQ2DhASWjbUe_oeeUs5oJF6PFpBKXkwZETpA_FoairSe1U6KRN01Yl4oEQmReTxFdBKz1DtH4eXKk7Hh7BU8aWIEh1__Bp2pRsLoUX9bkZVE_CZ1L9Ha3K_2huVIvyqIQ9GAl7YEdxvPVLMC8MYUfyFKKgh1B-bgtxEI78_deCqXQPxtU05bHc0XvBZcsWmA3-g" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
          </div>
        </div>

        {/* Invoice Ledger Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-md py-sm border-b border-outline-variant flex items-center justify-between">
            <h4 className="font-headline-md text-headline-md">Invoice Ledger</h4>
            <div className="flex items-center gap-xs">
              <button className="p-xs hover:bg-surface-container-low rounded-full transition-colors"><span className="material-symbols-outlined text-[20px]">refresh</span></button>
              <button className="p-xs hover:bg-surface-container-low rounded-full transition-colors"><span className="material-symbols-outlined text-[20px]">more_vert</span></button>
            </div>
          </div>
          <div className="invoice-ledger-container overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-md py-sm font-label-md text-label-md text-outline">CN NO #</th>
                  <th className="px-md py-sm font-label-md text-label-md text-outline">Booking Date</th>
                  <th className="px-md py-sm font-label-md text-label-md text-outline">Arrival Date</th>
                  <th className="px-md py-sm font-label-md text-label-md text-outline">Consignee</th>
                  <th className="px-md py-sm font-label-md text-label-md text-outline">Origin</th>
                  <th className="px-md py-sm font-label-md text-label-md text-outline">Destination</th>
                  <th className="px-md py-sm font-label-md text-label-md text-outline text-right">Weight</th>
                  <th className="px-md py-sm font-label-md text-label-md text-outline text-right">Cash Collect</th>
                  <th className="px-md py-sm font-label-md text-label-md text-outline text-right">Service Charges</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md">
                <tr className="border-b border-outline-variant hover:bg-surface-container-low transition-colors group">
                  <td className="px-md py-md font-tabular-nums text-tabular-nums text-primary font-semibold">CN-940212</td>
                  <td className="px-md py-md">12 Oct 2024</td>
                  <td className="px-md py-md">14 Oct 2024</td>
                  <td className="px-md py-md">TechNova Solutions</td>
                  <td className="px-md py-md">Karachi</td>
                  <td className="px-md py-md">Lahore</td>
                  <td className="px-md py-md text-right font-tabular-nums">12.5 kg</td>
                  <td className="px-md py-md text-right font-tabular-nums">$450.00</td>
                  <td className="px-md py-md text-right font-tabular-nums">$42.50</td>
                </tr>
                <tr className="border-b border-outline-variant hover:bg-surface-container-low transition-colors group">
                  <td className="px-md py-md font-tabular-nums text-tabular-nums text-primary font-semibold">CN-940215</td>
                  <td className="px-md py-md">13 Oct 2024</td>
                  <td className="px-md py-md">15 Oct 2024</td>
                  <td className="px-md py-md">Apex Retail Group</td>
                  <td className="px-md py-md">Islamabad</td>
                  <td className="px-md py-md">Faisalabad</td>
                  <td className="px-md py-md text-right font-tabular-nums">4.2 kg</td>
                  <td className="px-md py-md text-right font-tabular-nums">$120.00</td>
                  <td className="px-md py-md text-right font-tabular-nums">$18.00</td>
                </tr>
                <tr className="border-b border-outline-variant hover:bg-surface-container-low transition-colors group">
                  <td className="px-md py-md font-tabular-nums text-tabular-nums text-primary font-semibold">CN-940218</td>
                  <td className="px-md py-md">15 Oct 2024</td>
                  <td className="px-md py-md">17 Oct 2024</td>
                  <td className="px-md py-md">Global Logistics Inc.</td>
                  <td className="px-md py-md">Quetta</td>
                  <td className="px-md py-md">Karachi</td>
                  <td className="px-md py-md text-right font-tabular-nums">45.0 kg</td>
                  <td className="px-md py-md text-right font-tabular-nums">$1,850.00</td>
                  <td className="px-md py-md text-right font-tabular-nums">$125.00</td>
                </tr>
                <tr className="border-b border-outline-variant hover:bg-surface-container-low transition-colors group">
                  <td className="px-md py-md font-tabular-nums text-tabular-nums text-primary font-semibold">CN-940222</td>
                  <td className="px-md py-md">16 Oct 2024</td>
                  <td className="px-md py-md">Pending</td>
                  <td className="px-md py-md">Zenith Imports</td>
                  <td className="px-md py-md">Peshawar</td>
                  <td className="px-md py-md">Multan</td>
                  <td className="px-md py-md text-right font-tabular-nums">2.8 kg</td>
                  <td className="px-md py-md text-right font-tabular-nums">$85.00</td>
                  <td className="px-md py-md text-right font-tabular-nums">$12.00</td>
                </tr>
                <tr className="border-b border-outline-variant hover:bg-surface-container-low transition-colors group">
                  <td className="px-md py-md font-tabular-nums text-tabular-nums text-primary font-semibold">CN-940225</td>
                  <td className="px-md py-md">17 Oct 2024</td>
                  <td className="px-md py-md">19 Oct 2024</td>
                  <td className="px-md py-md">Rapid Parcel Services</td>
                  <td className="px-md py-md">Sialkot</td>
                  <td className="px-md py-md">Karachi</td>
                  <td className="px-md py-md text-right font-tabular-nums">18.2 kg</td>
                  <td className="px-md py-md text-right font-tabular-nums">$640.00</td>
                  <td className="px-md py-md text-right font-tabular-nums">$55.00</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-surface-container-low font-bold">
                  <td className="px-md py-sm text-right font-label-md text-label-md uppercase tracking-wider" colSpan={7}>Page Total</td>
                  <td className="px-md py-sm text-right font-tabular-nums text-primary">$3,245.00</td>
                  <td className="px-md py-sm text-right font-tabular-nums text-primary">$252.50</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {/* Pagination */}
          <div className="px-md py-sm border-t border-outline-variant flex items-center justify-between">
            <p className="font-label-md text-label-md text-outline">Showing 1 to 5 of 1,240 results</p>
            <div className="flex items-center gap-xs">
              <button className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant hover:bg-surface-container-low disabled:opacity-30" disabled>
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-on-primary font-tabular-nums text-tabular-nums">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant hover:bg-surface-container-low font-tabular-nums text-tabular-nums">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant hover:bg-surface-container-low font-tabular-nums text-tabular-nums">3</button>
              <button className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant hover:bg-surface-container-low">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Status Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
            <h5 className="font-headline-md text-headline-md mb-md">Revenue Breakdown by Destination</h5>
            <div className="space-y-sm">
              <div className="flex flex-col gap-base">
                <div className="flex justify-between font-label-md text-label-md">
                  <span>Karachi</span>
                  <span className="font-tabular-nums">$18,400.00</span>
                </div>
                <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '45%' }}></div>
                </div>
              </div>
              <div className="flex flex-col gap-base">
                <div className="flex justify-between font-label-md text-label-md">
                  <span>Lahore</span>
                  <span className="font-tabular-nums">$12,150.00</span>
                </div>
                <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden">
                  <div className="h-full bg-primary opacity-70" style={{ width: '32%' }}></div>
                </div>
              </div>
              <div className="flex flex-col gap-base">
                <div className="flex justify-between font-label-md text-label-md">
                  <span>Islamabad</span>
                  <span className="font-tabular-nums">$7,300.00</span>
                </div>
                <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden">
                  <div className="h-full bg-primary opacity-50" style={{ width: '18%' }}></div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col justify-center items-center text-center space-y-sm">
            <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">verified</span>
            </div>
            <h5 className="font-headline-md text-headline-md">Monthly Report Verified</h5>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-[300px]">All invoices for the October cycle have been reconciled with bank deposits.</p>
            <button className="text-primary font-bold hover:underline">View Reconciliation Details</button>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
