import { Search, BarChart3, MapPin, Truck, CheckCircle2, XCircle, RefreshCcw, Package, ArrowLeftRight } from 'lucide-react'

const stats = [
  { label: 'Total Shipments', value: '0', subtext: '(Rs. 0)', icon: BarChart3 },
  { label: 'Not Arrived', value: '0', subtext: '(Rs. 0)', icon: Package },
  { label: 'Arrived', value: '0', subtext: '(Rs. 0)', icon: MapPin },
  { label: 'Arrived At Destination', value: '0', subtext: '(Rs. 0)', icon: CheckCircle2 },
  { label: 'Out For Delivery', value: '0', subtext: '(Rs. 0)', icon: Truck },
  { label: 'Delivered', value: '0', subtext: '(Rs. 0)', icon: Package },
  { label: 'Failed Attempt', value: '0', subtext: '(Rs. 0)', icon: XCircle },
  { label: 'Ready To Return', value: '0', subtext: '(Rs. 0)', icon: RefreshCcw },
  { label: 'Return Dispatched', value: '0', subtext: '(Rs. 0)', icon: ArrowLeftRight },
  { label: 'Return To Shipper', value: '0', subtext: '(Rs. 0)', icon: ArrowLeftRight },
]

export default function MerchantDashboard() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
          <div className="border-b border-slate-200 bg-[#191f60] px-6 py-4 text-white">
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
          <div className="px-6 py-8 sm:px-10">
            <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Welcome to</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  Fly <span className="font-black">International</span> - Success Driven
                </h2>
              </div>
              <div className="grid w-full gap-4 sm:grid-cols-2 lg:w-auto lg:grid-cols-[minmax(0,360px)_auto]">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">From Date</span>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-200"
                    defaultValue="2026-05-01"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">To Date</span>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-200"
                    defaultValue="2026-05-14"
                  />
                </label>
                <button className="inline-flex h-12 items-center justify-center rounded-xl bg-primary-600 px-6 text-sm font-semibold text-white transition hover:bg-primary-700">
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </button>
              </div>
            </div>

            <div className="mb-8 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="text-sm text-slate-600">City :</div>
              <div className="w-full sm:w-[220px]">
                <select className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-200">
                  <option>All</option>
                </select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                    <div className="h-2 bg-[#191f60]" />
                    <div className="px-5 py-6 sm:px-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-[#191f60] shadow-sm">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-3xl font-semibold text-slate-900">{item.value}</p>
                          <p className="mt-1 text-sm text-slate-500">{item.subtext}</p>
                        </div>
                      </div>
                      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {item.label}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
