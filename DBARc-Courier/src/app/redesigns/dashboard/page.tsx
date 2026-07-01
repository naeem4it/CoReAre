import PortalLayout from '@/components/PortalLayout';

export default function DashboardRedesignPage() {
  return (
    <PortalLayout>
      <div className="flex-1 p-lg overflow-y-auto custom-scrollbar bg-slate-50">
        {/* Page Header & Filters */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-lg gap-md">
          <div>
            <h1 className="font-display-lg text-display-lg text-on-surface">Logistics Mastery</h1>
            <p className="text-on-surface-variant font-body-md text-body-md">Real-time oversight of global operations</p>
          </div>
          <div className="flex items-center gap-sm">
            <div className="flex bg-white rounded-lg border border-outline-variant p-1 shadow-sm">
              <button className="px-3 py-1.5 rounded text-label-md font-label-md bg-secondary-container text-on-secondary-container">24h</button>
              <button className="px-3 py-1.5 rounded text-label-md font-label-md hover:bg-surface-container-low">7d</button>
              <button className="px-3 py-1.5 rounded text-label-md font-label-md hover:bg-surface-container-low">30d</button>
            </div>
            <div className="relative">
              <button className="flex items-center gap-2 bg-white border border-outline-variant px-4 py-2 rounded-lg text-body-md font-medium shadow-sm active:scale-95 transition-all">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <span>May 14, 2026</span>
              </button>
            </div>
            <div className="relative">
              <button className="flex items-center gap-2 bg-white border border-outline-variant px-4 py-2 rounded-lg text-body-md font-medium shadow-sm active:scale-95 transition-all">
                <span className="material-symbols-outlined text-[18px]">location_city</span>
                <span>Karachi</span>
              </button>
            </div>
          </div>
        </header>

        {/* Stat Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-xl">
          {/* Total Shipments */}
          <div className="bg-white p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-sm">
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined">sailing</span>
              </div>
              <span className="text-emerald-600 flex items-center font-tabular-nums text-[12px] bg-emerald-50 px-2 py-0.5 rounded-full">+12.5%</span>
            </div>
            <h3 className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Total Shipments</h3>
            <p className="font-display-lg text-display-lg mt-1 tabular-nums">4,821</p>
          </div>

          {/* Not Arrived */}
          <div className="bg-white p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-sm">
              <div className="p-2 rounded-lg bg-tertiary-container/10 text-tertiary group-hover:bg-tertiary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <span className="text-on-surface-variant font-tabular-nums text-[12px] bg-surface-container-high px-2 py-0.5 rounded-full">Pending</span>
            </div>
            <h3 className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Not Arrived</h3>
            <p className="font-display-lg text-display-lg mt-1 tabular-nums text-tertiary">342</p>
          </div>

          {/* Arrived */}
          <div className="bg-white p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-sm">
              <div className="p-2 rounded-lg bg-secondary-container/50 text-on-secondary-container group-hover:bg-secondary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>inventory</span>
              </div>
              <span className="text-secondary font-tabular-nums text-[12px] bg-secondary-container/30 px-2 py-0.5 rounded-full">In Transit</span>
            </div>
            <h3 className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Arrived</h3>
            <p className="font-display-lg text-display-lg mt-1 tabular-nums text-secondary">1,208</p>
          </div>

          {/* Delivered */}
          <div className="bg-white p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-sm">
              <div className="p-2 rounded-lg bg-primary-container text-white group-hover:bg-primary transition-colors">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <span className="text-emerald-600 font-tabular-nums text-[12px] bg-emerald-50 px-2 py-0.5 rounded-full">98% Goal</span>
            </div>
            <h3 className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Delivered</h3>
            <p className="font-display-lg text-display-lg mt-1 tabular-nums text-primary-container">3,271</p>
          </div>
        </div>

        {/* Bento Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
          {/* Active Fleet Map / Visualization */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-outline-variant overflow-hidden shadow-[0px_1px_3px_rgba(0,0,0,0.05)] flex flex-col h-[500px]">
            <div className="p-md border-b border-outline-variant flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Fleet Geographic Distribution</h2>
                <p className="text-on-surface-variant font-body-md text-body-md">Live monitoring across 42 routes</p>
              </div>
              <button className="text-primary font-label-md text-label-md flex items-center gap-1 hover:underline">
                Open Map <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </button>
            </div>
            <div className="flex-1 bg-surface-container-low relative">
              <img alt="Fleet status" className="w-full h-full object-cover grayscale-[0.2]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFAeu2cWS7G_K0P_RS6myAyueOr2IZpR7W1KsMQtrziBRcMziYLcwGtLuX1JoCYhmoKmd6It_KjxrOXwEmtbZMS0Y33VAciUnLgyPSHzRnuc2FtftwaqzaQSupQi0EVuhpPPL0Grvkpj_ZPxGKwwzrX0m84v-nQ0Sbp-3ObWF1J0aUDtcAqP-lJpabWeirDha-zbSpvZZuJYZhz7FvNY8tKVE8p9bw8B8WQH8fkOPfNUaF6WhwlI7uPantqPFUC5Zj73A8peoVUtw"/>
              {/* Simulated Overlay Markers */}
              <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-primary rounded-full ring-4 ring-primary/20 animate-pulse"></div>
              <div className="absolute top-1/2 left-2/3 w-4 h-4 bg-primary rounded-full ring-4 ring-primary/20 animate-pulse"></div>
              <div className="absolute bottom-1/3 left-1/2 w-4 h-4 bg-tertiary rounded-full ring-4 ring-tertiary/20"></div>
            </div>
          </div>

          {/* Live Feed / Notifications */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] flex flex-col h-[500px]">
            <div className="p-md border-b border-outline-variant bg-white/50 backdrop-blur-sm sticky top-0">
              <h2 className="font-headline-md text-headline-md text-on-surface">Live Operations Feed</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-md custom-scrollbar flex flex-col gap-md">
              {/* Feed Item */}
              <div className="flex gap-md group">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                  </div>
                  <div className="absolute top-8 left-1/2 w-[1px] h-full bg-outline-variant"></div>
                </div>
                <div className="pb-md">
                  <p className="font-body-md text-body-md font-semibold text-on-surface">Shipment #2394 Delivered</p>
                  <p className="text-on-surface-variant font-body-md text-body-md">KHI-82 to Blue Area, Islamabad</p>
                  <p className="text-outline text-[12px] font-medium mt-1">2 mins ago</p>
                </div>
              </div>

              {/* Feed Item */}
              <div className="flex gap-md group">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">warning</span>
                  </div>
                  <div className="absolute top-8 left-1/2 w-[1px] h-full bg-outline-variant"></div>
                </div>
                <div className="pb-md">
                  <p className="font-body-md text-body-md font-semibold text-on-surface">Weather Delay Warning</p>
                  <p className="text-on-surface-variant font-body-md text-body-md">Route Lahore-Faisalabad affected by heavy rain.</p>
                  <p className="text-outline text-[12px] font-medium mt-1">15 mins ago</p>
                </div>
              </div>

              {/* Feed Item */}
              <div className="flex gap-md group">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                  </div>
                  <div className="absolute top-8 left-1/2 w-[1px] h-full bg-outline-variant"></div>
                </div>
                <div className="pb-md">
                  <p className="font-body-md text-body-md font-semibold text-on-surface">Bulk Load Sheet Generated</p>
                  <p className="text-on-surface-variant font-body-md text-body-md">Warehouse A - Unit 4: 128 new items ready for dispatch.</p>
                  <p className="text-outline text-[12px] font-medium mt-1">42 mins ago</p>
                </div>
              </div>

              {/* Feed Item */}
              <div className="flex gap-md group">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                </div>
                <div className="">
                  <p className="font-body-md text-body-md font-semibold text-on-surface">New Fleet Partner</p>
                  <p className="text-on-surface-variant font-body-md text-body-md">Swift Movers Ltd added to vendor network.</p>
                  <p className="text-outline text-[12px] font-medium mt-1">1 hour ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Shipments Table Section */}
        <section className="mt-lg bg-white rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="p-md border-b border-outline-variant flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
            <h2 className="font-headline-md text-headline-md text-on-surface">Active Operations Detail</h2>
            <div className="flex items-center gap-sm w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <input className="w-full text-body-md border-outline-variant rounded-lg py-1.5 pl-9 bg-slate-50 focus:bg-white transition-all" placeholder="Filter by ID or City..." type="text"/>
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">filter_list</span>
              </div>
              <button className="bg-surface-container-high px-4 py-2 rounded-lg text-label-md font-label-md hover:bg-surface-container-highest transition-colors active:scale-95">Export CSV</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-on-surface-variant">
                <tr>
                  <th className="px-md py-3 font-label-md text-label-md border-b border-outline-variant">Tracking ID</th>
                  <th className="px-md py-3 font-label-md text-label-md border-b border-outline-variant">Customer</th>
                  <th className="px-md py-3 font-label-md text-label-md border-b border-outline-variant">Origin / Destination</th>
                  <th className="px-md py-3 font-label-md text-label-md border-b border-outline-variant">Status</th>
                  <th className="px-md py-3 font-label-md text-label-md border-b border-outline-variant text-right">ETA</th>
                  <th className="px-md py-3 font-label-md text-label-md border-b border-outline-variant">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                <tr className="hover:bg-slate-50 transition-colors cursor-pointer group">
                  <td className="px-md py-4 font-tabular-nums text-primary font-semibold">#FLY-92841</td>
                  <td className="px-md py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary text-[10px] font-bold">AS</div>
                      <span className="font-body-md text-body-md text-on-surface font-medium">Ahmed Sheikh</span>
                    </div>
                  </td>
                  <td className="px-md py-4">
                    <div className="flex items-center gap-2 text-on-surface-variant font-body-md text-body-md">
                      <span>Karachi</span>
                      <span className="material-symbols-outlined text-[16px] text-outline">arrow_forward</span>
                      <span>Islamabad</span>
                    </div>
                  </td>
                  <td className="px-md py-4">
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-semibold border border-primary/20">In Transit</span>
                  </td>
                  <td className="px-md py-4 text-right font-tabular-nums font-body-md text-body-md text-on-surface">Today, 18:45</td>
                  <td className="px-md py-4">
                    <button className="p-1.5 rounded-lg hover:bg-surface-container-high text-outline group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined">visibility</span>
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors cursor-pointer group">
                  <td className="px-md py-4 font-tabular-nums text-primary font-semibold">#FLY-92842</td>
                  <td className="px-md py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary text-[10px] font-bold">MK</div>
                      <span className="font-body-md text-body-md text-on-surface font-medium">Maryam Khan</span>
                    </div>
                  </td>
                  <td className="px-md py-4">
                    <div className="flex items-center gap-2 text-on-surface-variant font-body-md text-body-md">
                      <span>Lahore</span>
                      <span className="material-symbols-outlined text-[16px] text-outline">arrow_forward</span>
                      <span>Multan</span>
                    </div>
                  </td>
                  <td className="px-md py-4">
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[12px] font-semibold border border-emerald-200">Delivered</span>
                  </td>
                  <td className="px-md py-4 text-right font-tabular-nums font-body-md text-body-md text-on-surface">May 14, 09:20</td>
                  <td className="px-md py-4">
                    <button className="p-1.5 rounded-lg hover:bg-surface-container-high text-outline group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined">visibility</span>
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors cursor-pointer group">
                  <td className="px-md py-4 font-tabular-nums text-primary font-semibold">#FLY-92843</td>
                  <td className="px-md py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary text-[10px] font-bold">JD</div>
                      <span className="font-body-md text-body-md text-on-surface font-medium">Javeria Dawood</span>
                    </div>
                  </td>
                  <td className="px-md py-4">
                    <div className="flex items-center gap-2 text-on-surface-variant font-body-md text-body-md">
                      <span>Quetta</span>
                      <span className="material-symbols-outlined text-[16px] text-outline">arrow_forward</span>
                      <span>Karachi</span>
                    </div>
                  </td>
                  <td className="px-md py-4">
                    <span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full text-[12px] font-semibold border border-outline-variant">Booked</span>
                  </td>
                  <td className="px-md py-4 text-right font-tabular-nums font-body-md text-body-md text-on-surface">Tomorrow, 14:00</td>
                  <td className="px-md py-4">
                    <button className="p-1.5 rounded-lg hover:bg-surface-container-high text-outline group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined">visibility</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="p-md flex justify-between items-center bg-slate-50/50">
            <p className="text-label-md font-label-md text-on-surface-variant">Showing 1-15 of 248 items</p>
            <div className="flex gap-2">
              <button className="p-2 border border-outline-variant rounded bg-white hover:bg-slate-100 disabled:opacity-50" disabled>
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button className="p-2 border border-outline-variant rounded bg-white hover:bg-slate-100">
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        </section>

        {/* FAB for Quick Actions */}
        <button className="fixed bottom-24 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all lg:bottom-8 z-40">
          <span className="material-symbols-outlined text-[32px]">add</span>
        </button>
      </div>
    </PortalLayout>
  );
}
