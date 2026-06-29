import PortalLayout from '@/components/PortalLayout';

export default function ShipmentsListPage() {
  return (
    <PortalLayout>
    <div className="p-lg max-w-[1400px] mx-auto w-full space-y-lg">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
        <div>
          <div className="flex items-center gap-xs text-secondary mb-xs">
            <span className="font-label-md text-label-md">Main Fleet</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="font-label-md text-label-md text-primary font-bold">Shipment Management</span>
          </div>
          <h2 className="font-display-lg text-display-lg text-on-surface">Shipment Management</h2>
          <p className="font-body-md text-body-md text-secondary mt-xs">Real-time oversight of all active and historical logistical movements.</p>
        </div>
        <div className="flex items-center gap-sm">
          <button className="flex items-center gap-xs px-md py-sm bg-surface-container-highest text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-dim transition-colors active:scale-95">
            <span className="material-symbols-outlined">print</span>
            Batch Print
          </button>
          <button className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:brightness-110 shadow-sm transition-all active:scale-95">
            <span className="material-symbols-outlined">ios_share</span>
            Export Data
          </button>
        </div>
      </div>
      {/* Dashboard Overview Cards (Bento Style Lite) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
        <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex items-center justify-between shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
          <div>
            <p className="font-label-md text-label-md text-secondary uppercase tracking-wider">In Transit</p>
            <p className="font-display-lg text-display-lg mt-xs">1,284</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">local_shipping</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex items-center justify-between shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
          <div>
            <p className="font-label-md text-label-md text-secondary uppercase tracking-wider">Processing</p>
            <p className="font-display-lg text-display-lg mt-xs">432</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
            <span className="material-symbols-outlined">sync</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex items-center justify-between shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
          <div>
            <p className="font-label-md text-label-md text-secondary uppercase tracking-wider">Delivered</p>
            <p className="font-display-lg text-display-lg mt-xs">18.2k</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700">
            <span className="material-symbols-outlined">task_alt</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex items-center justify-between shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
          <div>
            <p className="font-label-md text-label-md text-secondary uppercase tracking-wider">Issues</p>
            <p className="font-display-lg text-display-lg mt-xs text-error">12</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center text-on-error-container">
            <span className="material-symbols-outlined">warning</span>
          </div>
        </div>
      </div>
      {/* Table Section */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
        <div className="p-md border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-md bg-surface-container-lowest">
          <div className="flex items-center gap-md">
            <div className="flex border border-outline-variant rounded-lg overflow-hidden">
              <button className="px-md py-xs bg-surface-container-high font-label-md text-label-md font-bold">Active</button>
              <button className="px-md py-xs hover:bg-surface-container-low font-label-md text-label-md text-secondary transition-colors">Pending</button>
              <button className="px-md py-xs hover:bg-surface-container-low font-label-md text-label-md text-secondary transition-colors">Archived</button>
            </div>
            <div className="relative">
              <select className="appearance-none bg-surface-container-low border border-outline-variant rounded-lg pl-sm pr-xl py-xs font-label-md text-label-md focus:ring-primary-container outline-none">
                <option>Sort by: Newest</option>
                <option>Sort by: Oldest</option>
                <option>Status</option>
              </select>
              <span className="material-symbols-outlined absolute right-xs top-1/2 -translate-y-1/2 pointer-events-none text-outline text-[16px]">expand_more</span>
            </div>
          </div>
          <div className="text-secondary font-body-md text-body-md">
            Showing <span className="text-on-surface font-bold">1 - 50</span> of 2,492 shipments
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low font-label-md text-label-md text-secondary uppercase tracking-tighter">
              <tr>
                <th className="px-md py-sm font-semibold w-12">
                  <input className="rounded-sm border-outline text-primary focus:ring-primary-container" type="checkbox" />
                </th>
                <th className="px-md py-sm font-semibold">Booking #</th>
                <th className="px-md py-sm font-semibold">Name</th>
                <th className="px-md py-sm font-semibold">Consignee Address</th>
                <th className="px-md py-sm font-semibold">Status</th>
                <th className="px-md py-sm font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-tabular-nums text-tabular-nums divide-y divide-outline-variant">
              {/* Row 1 */}
              <tr className="hover:bg-surface-container-low transition-colors group">
                <td className="px-md py-md">
                  <input className="rounded-sm border-outline text-primary focus:ring-primary-container" type="checkbox" />
                </td>
                <td className="px-md py-md">
                  <span className="font-bold text-primary hover:underline cursor-pointer">FL-9283-XK</span>
                </td>
                <td className="px-md py-md">
                  <div className="flex items-center gap-sm">
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold">JD</div>
                    <span>Jameson Distilleries</span>
                  </div>
                </td>
                <td className="px-md py-md text-secondary max-w-xs truncate">
                  482 Industrial Way, Port of Seattle, WA 98134
                </td>
                <td className="px-md py-md">
                  <span className="inline-flex items-center gap-xs px-sm py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-700 animate-pulse"></span>
                    In Transit
                  </span>
                </td>
                <td className="px-md py-md text-right">
                  <div className="flex items-center justify-end gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="material-symbols-outlined p-1 hover:bg-primary-container hover:text-white rounded transition-colors text-outline">visibility</button>
                    <button className="material-symbols-outlined p-1 hover:bg-primary-container hover:text-white rounded transition-colors text-outline">edit</button>
                    <button className="material-symbols-outlined p-1 hover:bg-error-container hover:text-error rounded transition-colors text-outline">more_vert</button>
                  </div>
                </td>
              </tr>
              {/* Row 2 */}
              <tr className="hover:bg-surface-container-low transition-colors group">
                <td className="px-md py-md">
                  <input className="rounded-sm border-outline text-primary focus:ring-primary-container" type="checkbox" />
                </td>
                <td className="px-md py-md">
                  <span className="font-bold text-primary hover:underline cursor-pointer">FL-1104-ZA</span>
                </td>
                <td className="px-md py-md">
                  <div className="flex items-center gap-sm">
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold">TC</div>
                    <span>TechCorp Logistics</span>
                  </div>
                </td>
                <td className="px-md py-md text-secondary max-w-xs truncate">
                  92 Innovation Blvd, Palo Alto, CA 94304
                </td>
                <td className="px-md py-md">
                  <span className="inline-flex items-center gap-xs px-sm py-1 rounded-full bg-green-100 text-green-700 font-bold text-[10px] uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-700"></span>
                    Delivered
                  </span>
                </td>
                <td className="px-md py-md text-right">
                  <div className="flex items-center justify-end gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="material-symbols-outlined p-1 hover:bg-primary-container hover:text-white rounded transition-colors text-outline">visibility</button>
                    <button className="material-symbols-outlined p-1 hover:bg-primary-container hover:text-white rounded transition-colors text-outline">edit</button>
                    <button className="material-symbols-outlined p-1 hover:bg-error-container hover:text-error rounded transition-colors text-outline">more_vert</button>
                  </div>
                </td>
              </tr>
              {/* Row 3 */}
              <tr className="hover:bg-surface-container-low transition-colors group">
                <td className="px-md py-md">
                  <input className="rounded-sm border-outline text-primary focus:ring-primary-container" type="checkbox" />
                </td>
                <td className="px-md py-md">
                  <span className="font-bold text-primary hover:underline cursor-pointer">FL-8742-MM</span>
                </td>
                <td className="px-md py-md">
                  <div className="flex items-center gap-sm">
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold">GS</div>
                    <span>Global Solar Inc.</span>
                  </div>
                </td>
                <td className="px-md py-md text-secondary max-w-xs truncate">
                  11 Energy Park, Phoenix, AZ 85001
                </td>
                <td className="px-md py-md">
                  <span className="inline-flex items-center gap-xs px-sm py-1 rounded-full bg-orange-100 text-orange-700 font-bold text-[10px] uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-700"></span>
                    On Hold
                  </span>
                </td>
                <td className="px-md py-md text-right">
                  <div className="flex items-center justify-end gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="material-symbols-outlined p-1 hover:bg-primary-container hover:text-white rounded transition-colors text-outline">visibility</button>
                    <button className="material-symbols-outlined p-1 hover:bg-primary-container hover:text-white rounded transition-colors text-outline">edit</button>
                    <button className="material-symbols-outlined p-1 hover:bg-error-container hover:text-error rounded transition-colors text-outline">more_vert</button>
                  </div>
                </td>
              </tr>
              {/* Reference Image Row */}
              <tr className="bg-surface-container-low/50">
                <td className="px-md py-xl text-center" colSpan={6}>
                  <div className="flex flex-col items-center gap-md">
                    <div className="relative max-w-2xl w-full border border-outline-variant rounded-xl overflow-hidden shadow-lg group cursor-zoom-in">
                      <img alt="Shipment Detail Preview" className="w-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCydUSNto0FHrsPPOmg5z8V-7wOi32WpN7qIZAMH-y5j13znCkNjAsmr_nKBFqZwvdYanXi6krbBlM2KHWCAofQDEGIMexTvRSMlbB2NXDer8vh0LfNmxdwMkAjxfASGj5szPqce8xqHhES00sYNs1kjKZKxcAr7wiN-klFmFh_683tIw2DB6msurNUm7yx012eSZkSToYBi21oC7bxW3Tvd_XgHDyd0D0ZNLksdTxPiSu5BTEXiikm6Kt1EoE4UuifpBLu1-TZtXQ" />
                      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white/90 px-md py-sm rounded-full font-bold text-primary shadow-xl">Quick Preview Active</span>
                      </div>
                    </div>
                    <p className="font-label-md text-label-md text-secondary italic">Reference View: Operational Terminal Dashboard 14-05-2026</p>
                  </div>
                </td>
              </tr>
              {/* Row 4 */}
              <tr className="hover:bg-surface-container-low transition-colors group">
                <td className="px-md py-md">
                  <input className="rounded-sm border-outline text-primary focus:ring-primary-container" type="checkbox" />
                </td>
                <td className="px-md py-md">
                  <span className="font-bold text-primary hover:underline cursor-pointer">FL-0043-LQ</span>
                </td>
                <td className="px-md py-md">
                  <div className="flex items-center gap-sm">
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold">HM</div>
                    <span>Horizon Medical</span>
                  </div>
                </td>
                <td className="px-md py-md text-secondary max-w-xs truncate">
                  747 Clinic Plaza, Chicago, IL 60611
                </td>
                <td className="px-md py-md">
                  <span className="inline-flex items-center gap-xs px-sm py-1 rounded-full bg-error-container text-on-error-container font-bold text-[10px] uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                    Delayed
                  </span>
                </td>
                <td className="px-md py-md text-right">
                  <div className="flex items-center justify-end gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="material-symbols-outlined p-1 hover:bg-primary-container hover:text-white rounded transition-colors text-outline">visibility</button>
                    <button className="material-symbols-outlined p-1 hover:bg-primary-container hover:text-white rounded transition-colors text-outline">edit</button>
                    <button className="material-symbols-outlined p-1 hover:bg-error-container hover:text-error rounded transition-colors text-outline">more_vert</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-md flex items-center justify-between bg-surface-container-low border-t border-outline-variant">
          <button className="flex items-center gap-xs px-md py-xs hover:bg-surface-container-highest rounded transition-colors text-secondary font-label-md text-label-md">
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            Previous
          </button>
          <div className="flex items-center gap-xs">
            <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-on-primary font-bold text-[12px]">1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-highest transition-colors font-bold text-[12px]">2</button>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-highest transition-colors font-bold text-[12px]">3</button>
            <span className="px-xs text-secondary">...</span>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-highest transition-colors font-bold text-[12px]">48</button>
          </div>
          <button className="flex items-center gap-xs px-md py-xs hover:bg-surface-container-highest rounded transition-colors text-secondary font-label-md text-label-md">
            Next
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
      {/* Operational Insights (Asymmetric Layout) */}
      <div className="flex flex-col xl:flex-row gap-lg">
        <div className="flex-grow bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-md text-headline-md mb-md">Delivery Performance Trends</h3>
          <div className="h-48 flex items-end justify-between gap-sm px-md">
            <div className="w-full bg-primary/20 rounded-t h-3/4 hover:bg-primary transition-colors cursor-help group relative">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-sm py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Mon: 84%</div>
            </div>
            <div className="w-full bg-primary/20 rounded-t h-4/5 hover:bg-primary transition-colors cursor-help group relative">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-sm py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Tue: 91%</div>
            </div>
            <div className="w-full bg-primary/20 rounded-t h-2/3 hover:bg-primary transition-colors cursor-help group relative">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-sm py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Wed: 78%</div>
            </div>
            <div className="w-full bg-primary/20 rounded-t h-5/6 hover:bg-primary transition-colors cursor-help group relative">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-sm py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Thu: 94%</div>
            </div>
            <div className="w-full bg-primary/20 rounded-t h-full hover:bg-primary transition-colors cursor-help group relative">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-sm py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Fri: 98%</div>
            </div>
          </div>
          <div className="flex justify-between mt-sm font-label-md text-label-md text-secondary">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
          </div>
        </div>
        <div className="xl:w-80 bg-primary-container text-on-primary-container rounded-xl p-md flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center gap-sm mb-sm">
              <span className="material-symbols-outlined">auto_awesome</span>
              <span className="font-label-md text-label-md uppercase font-bold">AI Logistics Tip</span>
            </div>
            <p className="font-body-md text-body-md opacity-90">Based on historical traffic and weather patterns, shifting departures for Chicago by <span className="font-bold underline">45 minutes</span> could improve delivery reliability by 12% today.</p>
          </div>
          <button className="mt-md w-full bg-white/20 hover:bg-white/30 py-sm rounded-lg font-bold text-tabular-nums text-tabular-nums transition-colors">Apply Route Optimization</button>
        </div>
      </div>
    </div>
    </PortalLayout>
  );
}
