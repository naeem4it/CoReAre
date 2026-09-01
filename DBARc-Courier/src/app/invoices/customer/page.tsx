'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';

export default function CustomerInvoicePage() {
  const [selectedRow, setSelectedRow] = React.useState<number | null>(null);

  const handleRowClick = (index: number) => {
    setSelectedRow(index === selectedRow ? null : index);
  };

  const getRowClassName = (index: number, baseClass: string) => {
    const isSelected = selectedRow === index;
    return `${baseClass} transition-colors group cursor-pointer ${isSelected ? 'bg-primary-container/5 ring-1 ring-primary/20' : 'hover:bg-surface-container-low'}`;
  };

  return (
    <PortalLayout>
      <div className="flex-1 p-lg">
        <div className="max-w-[1280px] mx-auto">
          {/* Breadcrumbs & Header Actions */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
            <div>
              <nav className="flex items-center gap-2 text-outline font-label-md text-label-md mb-xs">
                <a className="hover:text-primary" href="#">Customers</a>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-on-surface-variant">Invoices</span>
              </nav>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">Customer Invoices</h1>
              <p className="font-body-md text-body-md text-outline">Manage billing cycles and payment history for corporate partners.</p>
            </div>
            <div className="flex items-center gap-sm">
              <button className="flex items-center gap-xs px-md py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                Filter
              </button>
              <button className="flex items-center gap-xs px-md py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export
              </button>
              <button className="flex items-center gap-xs px-md py-2 bg-primary text-white rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors">
                <span className="material-symbols-outlined text-[18px]">receipt</span>
                Generate Invoice
              </button>
            </div>
          </div>
          
          {/* KPI Cards (Bento Style) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-xl">
            <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl hover:shadow-sm transition-shadow">
              <div className="flex justify-between items-start mb-xs">
                <span className="font-label-md text-label-md text-outline uppercase">Total Invoiced</span>
                <div className="bg-primary/10 p-2 rounded-lg">
                  <span className="material-symbols-outlined text-primary text-[20px]">monetization_on</span>
                </div>
              </div>
              <p className="font-display-lg text-display-lg text-on-surface">$124.5k</p>
              <div className="flex items-center gap-xs mt-xs text-primary font-label-md text-label-md">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                <span>+12.4% vs last month</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl hover:shadow-sm transition-shadow">
              <div className="flex justify-between items-start mb-xs">
                <span className="font-label-md text-label-md text-outline uppercase">Pending</span>
                <div className="bg-tertiary/10 p-2 rounded-lg">
                  <span className="material-symbols-outlined text-tertiary text-[20px]">pending_actions</span>
                </div>
              </div>
              <p className="font-display-lg text-display-lg text-on-surface">$18.2k</p>
              <div className="flex items-center gap-xs mt-xs text-outline font-label-md text-label-md">
                <span>7 invoices awaiting payment</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl hover:shadow-sm transition-shadow">
              <div className="flex justify-between items-start mb-xs">
                <span className="font-label-md text-label-md text-outline uppercase">Overdue</span>
                <div className="bg-error/10 p-2 rounded-lg">
                  <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                </div>
              </div>
              <p className="font-display-lg text-display-lg text-on-surface">$4.1k</p>
              <div className="flex items-center gap-xs mt-xs text-error font-label-md text-label-md">
                <span className="material-symbols-outlined text-[14px]">error</span>
                <span>Action required on 2 items</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl hover:shadow-sm transition-shadow">
              <div className="flex justify-between items-start mb-xs">
                <span className="font-label-md text-label-md text-outline uppercase">Paid Rate</span>
                <div className="bg-secondary/10 p-2 rounded-lg">
                  <span className="material-symbols-outlined text-secondary text-[20px]">verified</span>
                </div>
              </div>
              <p className="font-display-lg text-display-lg text-on-surface">94.2%</p>
              <div className="flex items-center gap-xs mt-xs text-primary font-label-md text-label-md">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                <span>+2.1% improvement</span>
              </div>
            </div>
          </div>
          
          {/* Velocity Corporate Table Container */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="px-md py-4 font-label-md text-label-md text-outline uppercase tracking-wider">
                      <div className="flex items-center gap-xs">
                        Invoice #
                        <span className="material-symbols-outlined text-[16px]">expand_more</span>
                      </div>
                    </th>
                    <th className="px-md py-4 font-label-md text-label-md text-outline uppercase tracking-wider">Date</th>
                    <th className="px-md py-4 font-label-md text-label-md text-outline uppercase tracking-wider">Period</th>
                    <th className="px-md py-4 font-label-md text-label-md text-outline uppercase tracking-wider">Charges</th>
                    <th className="px-md py-4 font-label-md text-label-md text-outline uppercase tracking-wider">Status</th>
                    <th className="px-md py-4 font-label-md text-label-md text-outline uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {/* Row 1 */}
                  <tr className={getRowClassName(0, '')} onClick={() => handleRowClick(0)}>
                    <td className="px-md py-4">
                      <span className="font-tabular-nums text-tabular-nums text-primary font-semibold">INV-2024-0012</span>
                    </td>
                    <td className="px-md py-4 font-body-md text-body-md text-on-surface">Oct 12, 2024</td>
                    <td className="px-md py-4 font-body-md text-body-md text-on-surface-variant">Sep 01 - Sep 30</td>
                    <td className="px-md py-4 font-tabular-nums text-tabular-nums font-bold text-on-surface">$2,450.00</td>
                    <td className="px-md py-4">
                      <span className="px-2 py-1 bg-primary-container text-white text-[10px] font-bold rounded-lg uppercase tracking-widest">PAID</span>
                    </td>
                    <td className="px-md py-4 text-right">
                      <button className="material-symbols-outlined text-outline hover:text-primary p-1 rounded transition-all">visibility</button>
                      <button className="material-symbols-outlined text-outline hover:text-primary p-1 rounded transition-all">more_vert</button>
                    </td>
                  </tr>
                  {/* Row 2 */}
                  <tr className={getRowClassName(1, '')} onClick={() => handleRowClick(1)}>
                    <td className="px-md py-4">
                      <span className="font-tabular-nums text-tabular-nums text-primary font-semibold">INV-2024-0011</span>
                    </td>
                    <td className="px-md py-4 font-body-md text-body-md text-on-surface">Oct 10, 2024</td>
                    <td className="px-md py-4 font-body-md text-body-md text-on-surface-variant">Sep 01 - Sep 30</td>
                    <td className="px-md py-4 font-tabular-nums text-tabular-nums font-bold text-on-surface">$1,120.50</td>
                    <td className="px-md py-4">
                      <span className="px-2 py-1 bg-primary-container text-white text-[10px] font-bold rounded-lg uppercase tracking-widest">PAID</span>
                    </td>
                    <td className="px-md py-4 text-right">
                      <button className="material-symbols-outlined text-outline hover:text-primary p-1 rounded transition-all">visibility</button>
                      <button className="material-symbols-outlined text-outline hover:text-primary p-1 rounded transition-all">more_vert</button>
                    </td>
                  </tr>
                  {/* Row 3 */}
                  <tr className={getRowClassName(2, '')} onClick={() => handleRowClick(2)}>
                    <td className="px-md py-4">
                      <span className="font-tabular-nums text-tabular-nums text-primary font-semibold">INV-2024-0010</span>
                    </td>
                    <td className="px-md py-4 font-body-md text-body-md text-on-surface">Oct 05, 2024</td>
                    <td className="px-md py-4 font-body-md text-body-md text-on-surface-variant">Aug 01 - Aug 31</td>
                    <td className="px-md py-4 font-tabular-nums text-tabular-nums font-bold text-on-surface">$5,680.00</td>
                    <td className="px-md py-4">
                      <span className="px-2 py-1 bg-tertiary-container text-white text-[10px] font-bold rounded-lg uppercase tracking-widest">PENDING</span>
                    </td>
                    <td className="px-md py-4 text-right">
                      <button className="material-symbols-outlined text-outline hover:text-primary p-1 rounded transition-all">visibility</button>
                      <button className="material-symbols-outlined text-outline hover:text-primary p-1 rounded transition-all">more_vert</button>
                    </td>
                  </tr>
                  {/* Row 4 */}
                  <tr className={getRowClassName(3, 'bg-error/5')} onClick={() => handleRowClick(3)}>
                    <td className="px-md py-4">
                      <span className="font-tabular-nums text-tabular-nums text-primary font-semibold">INV-2024-0009</span>
                    </td>
                    <td className="px-md py-4 font-body-md text-body-md text-on-surface">Sep 28, 2024</td>
                    <td className="px-md py-4 font-body-md text-body-md text-on-surface-variant">Aug 01 - Aug 31</td>
                    <td className="px-md py-4 font-tabular-nums text-tabular-nums font-bold text-on-surface">$890.00</td>
                    <td className="px-md py-4">
                      <span className="px-2 py-1 bg-error text-white text-[10px] font-bold rounded-lg uppercase tracking-widest">OVERDUE</span>
                    </td>
                    <td className="px-md py-4 text-right">
                      <button className="material-symbols-outlined text-outline hover:text-primary p-1 rounded transition-all">visibility</button>
                      <button className="material-symbols-outlined text-outline hover:text-primary p-1 rounded transition-all">more_vert</button>
                    </td>
                  </tr>
                  {/* Row 5 */}
                  <tr className={getRowClassName(4, '')} onClick={() => handleRowClick(4)}>
                    <td className="px-md py-4">
                      <span className="font-tabular-nums text-tabular-nums text-primary font-semibold">INV-2024-0008</span>
                    </td>
                    <td className="px-md py-4 font-body-md text-body-md text-on-surface">Sep 15, 2024</td>
                    <td className="px-md py-4 font-body-md text-body-md text-on-surface-variant">Jul 01 - Jul 31</td>
                    <td className="px-md py-4 font-tabular-nums text-tabular-nums font-bold text-on-surface">$12,400.00</td>
                    <td className="px-md py-4">
                      <span className="px-2 py-1 bg-primary-container text-white text-[10px] font-bold rounded-lg uppercase tracking-widest">PAID</span>
                    </td>
                    <td className="px-md py-4 text-right">
                      <button className="material-symbols-outlined text-outline hover:text-primary p-1 rounded transition-all">visibility</button>
                      <button className="material-symbols-outlined text-outline hover:text-primary p-1 rounded transition-all">more_vert</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Pagination (Velocity Corporate Style) */}
            <div className="px-md py-md border-t border-outline-variant flex items-center justify-between bg-surface-container-lowest">
              <p className="font-body-md text-body-md text-outline">Showing <span className="font-bold text-on-surface">1-5</span> of <span className="font-bold text-on-surface">128</span> invoices</p>
              <div className="flex items-center gap-xs">
                <button className="p-2 border border-outline-variant rounded-lg text-outline hover:bg-surface-container-low transition-all disabled:opacity-50" disabled>
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button className="px-4 py-2 bg-primary text-white rounded-lg font-label-md text-label-md transition-all">1</button>
                <button className="px-4 py-2 border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-all">2</button>
                <button className="px-4 py-2 border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-all">3</button>
                <span className="px-2 text-outline">...</span>
                <button className="px-4 py-2 border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-all">24</button>
                <button className="p-2 border border-outline-variant rounded-lg text-outline hover:bg-surface-container-low transition-all">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Reference Preview Card (Mocking the legacy screen for redesign context) */}
          <div className="mt-xl">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-md">Quick Summary Context</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
              <div className="lg:col-span-2 relative h-[300px] rounded-xl overflow-hidden border border-outline-variant shadow-lg group">
                <img alt="Legacy UI Reference" className="w-full h-full object-cover filter contrast-125 opacity-40 transition-opacity duration-700 group-hover:opacity-60" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRFVbKYY_rSSge4waXB8Yofx7CjcsuR6_CYzYOqzMqIzq6fbIUkiH37Ntxn7y5f5K1u4YxZstTZa4O-W5gHdTAsehrXnSGr2lK2o8n8dRKikblNCvTfRNWTBzidNAOxpS46sXcLchEvrdq0jx2w9ipdQJ0WC6LYJZK5x57mRLA8kpuU9759O3sgoe-eVnUOlcE0FvLFMW_AST5R2ZVYWn53R-ig8ghGqHYyAi-0XPxHhWdwuKOUQiAM9gv9CEq_yEu9He2ZE0Y8zk" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-lg">
                  <span className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-full w-fit mb-xs">SOURCE DESIGN REFERENCE</span>
                  <h3 className="text-white font-headline-md text-headline-md">Historical Data Snapshot</h3>
                  <p className="text-white/70 font-body-md text-body-md">Redesigned from legacy to follow Velocity Corporate aesthetic guidelines.</p>
                </div>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 bg-primary-container/10 rounded-full flex items-center justify-center mb-md">
                  <span className="material-symbols-outlined text-primary text-[32px]">analytics</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Data Fidelity</h3>
                <p className="font-body-md text-body-md text-outline mt-xs mb-md">Enhanced table logic with high-density data fields and status indicators.</p>
                <button className="w-full py-2 bg-surface-container-high text-on-surface-variant font-label-md text-label-md rounded-lg hover:bg-surface-container-highest transition-all">View Audit Trail</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
