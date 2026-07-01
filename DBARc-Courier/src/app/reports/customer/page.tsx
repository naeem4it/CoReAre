'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';

export default function CustomerReportPage() {
  const [selectedRow, setSelectedRow] = React.useState<number | null>(null);

  const handleRowClick = (index: number) => {
    setSelectedRow(index === selectedRow ? null : index);
  };

  const getRowClassName = (index: number) => {
    const isSelected = selectedRow === index;
    return `hover:bg-background transition-colors h-[48px] cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`;
  };

  return (
    <PortalLayout>
      <div className="flex-1 w-full max-w-[1280px] mx-auto p-lg">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-xl">
          <div>
            <h1 className="font-display-lg text-display-lg text-on-surface">Detailed Customers Report</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Review comprehensive logistical data and customer performance metrics.</p>
          </div>
          <div className="flex items-center gap-sm">
            <button className="flex items-center gap-xs px-md py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-semibold hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[20px]">download</span> Export CSV
            </button>
            <button className="flex items-center gap-xs px-md py-2 bg-primary text-on-primary rounded-lg text-body-md font-semibold hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-[20px]">print</span> Print Report
            </button>
          </div>
        </div>

        {/* Report Criteria Section */}
        <section className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm mb-lg">
          <div className="flex items-center gap-xs mb-md border-b border-outline-variant pb-sm">
            <span className="material-symbols-outlined text-primary">filter_alt</span>
            <h3 className="font-headline-md text-headline-md">Report Criteria</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
            <div className="flex flex-col gap-base">
              <label className="font-label-md text-label-md text-outline">DATE FROM</label>
              <input className="w-full h-10 px-sm border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary" type="date" />
            </div>
            <div className="flex flex-col gap-base">
              <label className="font-label-md text-label-md text-outline">DATE TO</label>
              <input className="w-full h-10 px-sm border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary" type="date" />
            </div>
            <div className="flex flex-col gap-base">
              <label className="font-label-md text-label-md text-outline">SELECT CITY</label>
              <select className="w-full h-10 px-sm border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary">
                <option>All Cities</option>
                <option>Karachi</option>
                <option>Lahore</option>
                <option>Islamabad</option>
                <option>Faisalabad</option>
              </select>
            </div>
            <div className="flex flex-col gap-base">
              <label className="font-label-md text-label-md text-outline">STATUS TYPE</label>
              <select className="w-full h-10 px-sm border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary">
                <option>All Statuses</option>
                <option>Pending</option>
                <option>Delivered</option>
                <option>Returned</option>
                <option>In Transit</option>
              </select>
            </div>
          </div>
          <div className="mt-md flex justify-end">
            <button className="bg-secondary-container text-on-secondary-container px-xl py-2 rounded-lg font-bold hover:bg-secondary-fixed transition-colors active:scale-95">Generate Report</button>
          </div>
        </section>

        {/* Data Table Container */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-sm bg-surface-container-low flex justify-between items-center border-b border-outline-variant">
            <span className="font-label-md text-label-md text-on-surface-variant px-sm">SHOWING 5 OF 1,452 ENTRIES</span>
            <div className="flex gap-xs">
              <button className="p-1 hover:bg-surface-container-high rounded"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
              <button className="p-1 hover:bg-surface-container-high rounded font-bold text-primary">1</button>
              <button className="p-1 hover:bg-surface-container-high rounded">2</button>
              <button className="p-1 hover:bg-surface-container-high rounded">3</button>
              <button className="p-1 hover:bg-surface-container-high rounded"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">S.NO</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Booking #</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Invoice #</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Book Date</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Arr. Date</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Vendor</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Reference</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Product</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Cons. Name</th>
                  <th className="p-sm text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Cons. Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {/* High Density Row 1 */}
                <tr className={getRowClassName(0)} onClick={() => handleRowClick(0)}>
                  <td className="px-sm py-xs font-tabular-nums text-tabular-nums">01</td>
                  <td className="px-sm py-xs font-body-md text-body-md font-semibold text-primary">FC-78210</td>
                  <td className="px-sm py-xs font-body-md text-body-md">INV-9921</td>
                  <td className="px-sm py-xs font-tabular-nums text-tabular-nums">12 May 2026</td>
                  <td className="px-sm py-xs font-tabular-nums text-tabular-nums">14 May 2026</td>
                  <td className="px-sm py-xs font-body-md text-body-md">BlueEx</td>
                  <td className="px-sm py-xs font-body-md text-body-md">REF/2026/04</td>
                  <td className="px-sm py-xs"><span className="px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-bold rounded">PHARMACY</span></td>
                  <td className="px-sm py-xs font-body-md text-body-md">Ahmad Raza</td>
                  <td className="px-sm py-xs font-body-md text-body-md truncate max-w-[200px]">House 45, Street 12, Gulshan-e-Iqbal, Karachi</td>
                </tr>
                {/* High Density Row 2 */}
                <tr className={getRowClassName(1)} onClick={() => handleRowClick(1)}>
                  <td className="px-sm py-xs font-tabular-nums text-tabular-nums">02</td>
                  <td className="px-sm py-xs font-body-md text-body-md font-semibold text-primary">FC-78211</td>
                  <td className="px-sm py-xs font-body-md text-body-md">INV-9922</td>
                  <td className="px-sm py-xs font-tabular-nums text-tabular-nums">13 May 2026</td>
                  <td className="px-sm py-xs font-tabular-nums text-tabular-nums">15 May 2026</td>
                  <td className="px-sm py-xs font-body-md text-body-md">SwiftLine</td>
                  <td className="px-sm py-xs font-body-md text-body-md">REF/2026/05</td>
                  <td className="px-sm py-xs"><span className="px-2 py-0.5 bg-secondary-fixed text-on-secondary-fixed text-[11px] font-bold rounded">ELECTRONICS</span></td>
                  <td className="px-sm py-xs font-body-md text-body-md">Sarah Khan</td>
                  <td className="px-sm py-xs font-body-md text-body-md truncate max-w-[200px]">DHA Phase 5, Block C, Lahore</td>
                </tr>
                {/* High Density Row 3 */}
                <tr className={getRowClassName(2)} onClick={() => handleRowClick(2)}>
                  <td className="px-sm py-xs font-tabular-nums text-tabular-nums">03</td>
                  <td className="px-sm py-xs font-body-md text-body-md font-semibold text-primary">FC-78212</td>
                  <td className="px-sm py-xs font-body-md text-body-md">INV-9923</td>
                  <td className="px-sm py-xs font-tabular-nums text-tabular-nums">13 May 2026</td>
                  <td className="px-sm py-xs font-tabular-nums text-tabular-nums">Pending</td>
                  <td className="px-sm py-xs font-body-md text-body-md">M&amp;P</td>
                  <td className="px-sm py-xs font-body-md text-body-md">REF/2026/06</td>
                  <td className="px-sm py-xs"><span className="px-2 py-0.5 bg-surface-variant text-on-surface-variant text-[11px] font-bold rounded">DOCUMENTS</span></td>
                  <td className="px-sm py-xs font-body-md text-body-md">Imran Malik</td>
                  <td className="px-sm py-xs font-body-md text-body-md truncate max-w-[200px]">F-7 Markaz, Blue Area, Islamabad</td>
                </tr>
                {/* High Density Row 4 */}
                <tr className={getRowClassName(3)} onClick={() => handleRowClick(3)}>
                  <td className="px-sm py-xs font-tabular-nums text-tabular-nums">04</td>
                  <td className="px-sm py-xs font-body-md text-body-md font-semibold text-primary">FC-78213</td>
                  <td className="px-sm py-xs font-body-md text-body-md">INV-9924</td>
                  <td className="px-sm py-xs font-tabular-nums text-tabular-nums">14 May 2026</td>
                  <td className="px-sm py-xs font-tabular-nums text-tabular-nums">16 May 2026</td>
                  <td className="px-sm py-xs font-body-md text-body-md">Leopard</td>
                  <td className="px-sm py-xs font-body-md text-body-md">REF/2026/07</td>
                  <td className="px-sm py-xs"><span className="px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-bold rounded">APPAREL</span></td>
                  <td className="px-sm py-xs font-body-md text-body-md">Fatima Shah</td>
                  <td className="px-sm py-xs font-body-md text-body-md truncate max-w-[200px]">Samanabad, Canal Road, Faisalabad</td>
                </tr>
                {/* Row 5 */}
                <tr className={getRowClassName(4)} onClick={() => handleRowClick(4)}>
                  <td className="px-sm py-xs font-tabular-nums text-tabular-nums">05</td>
                  <td className="px-sm py-xs font-body-md text-body-md font-semibold text-primary">FC-78214</td>
                  <td className="px-sm py-xs font-body-md text-body-md">INV-9925</td>
                  <td className="px-sm py-xs font-tabular-nums text-tabular-nums">14 May 2026</td>
                  <td className="px-sm py-xs font-tabular-nums text-tabular-nums">16 May 2026</td>
                  <td className="px-sm py-xs font-body-md text-body-md">BlueEx</td>
                  <td className="px-sm py-xs font-body-md text-body-md">REF/2026/08</td>
                  <td className="px-sm py-xs"><span className="px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-bold rounded">PHARMACY</span></td>
                  <td className="px-sm py-xs font-body-md text-body-md">Usman Qadir</td>
                  <td className="px-sm py-xs font-body-md text-body-md truncate max-w-[200px]">Cantt View Residency, Rawalpindi</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Reference Image Section (Visual Anchor) */}
        <section className="mt-xl">
          <div className="flex items-center gap-xs mb-md">
            <span className="material-symbols-outlined text-outline">image</span>
            <h3 className="font-headline-md text-headline-md text-outline">Report Preview Reference</h3>
          </div>
          <div className="rounded-xl overflow-hidden border border-outline-variant shadow-md bg-surface-dim relative group">
            <img alt="Detailed Customer Report Reference" className="w-full opacity-80 group-hover:opacity-100 transition-opacity" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDA9VfCfGH-59EtPSQNu2uHagFswSkPnxRYMQ9fUBSM627YgPCRNyqyf7SheoKhhCjCevTvHggJLbn09GhZ-PIBXrFO-gA46XT-NVoFnk4MPmN9n8UH_HFvGnApPoRgtN9YqWf3gcUYWgXMPhehHZdB7hrVqCXRX_fvK2fkNorhH5OtK5xyNsI6cFptz0iDybbiOleXr5eVJiYRRrPtSPDocAIgyUszuXvo7QZ5uYOr91T2T1qcBN85SUdii1rM0RU5uNAFwZI6vqw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-md">
              <p className="text-white text-body-md font-semibold">Reference Interface Layout Archive</p>
            </div>
          </div>
        </section>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-lg right-lg w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-90 z-50">
        <span className="material-symbols-outlined text-[28px]">support_agent</span>
      </button>
    </PortalLayout>
  );
}
