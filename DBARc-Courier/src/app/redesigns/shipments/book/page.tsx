import PortalLayout from '@/components/PortalLayout';

export default function BookShipmentRedesignPage() {
  return (
    <PortalLayout>
    <div className="max-w-[1280px] mx-auto px-lg py-xl">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-xl">
        <div>
          <nav className="flex gap-xs text-label-md font-label-md text-on-surface-variant mb-xs">
            <span className="hover:text-primary cursor-pointer">Shipments</span>
            <span>/</span>
            <span className="text-on-surface">Book Shipment</span>
          </nav>
          <h1 className="font-display-lg text-display-lg text-on-surface">Book New Shipment</h1>
        </div>
        <div className="flex gap-md">
          <button className="px-md py-sm bg-surface-container-high text-on-surface-variant font-label-md text-label-md rounded-xl hover:bg-surface-container-highest transition-all active:scale-95">Cancel</button>
          <button className="px-md py-sm bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm hover:bg-surface-tint transition-all active:scale-95 flex items-center gap-xs">
            <span className="material-symbols-outlined text-[18px]">save</span>
            Create Shipment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-lg">
        {/* Form Canvas */}
        <div className="col-span-12 lg:col-span-8 space-y-lg">
          {/* Section 1: Consignee Details */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
            <div className="flex items-center gap-sm mb-lg border-b border-outline-variant pb-md">
              <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined">person</span>
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md">Consignee Detail</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Recipient&apos;s contact and delivery information</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Full Name *</label>
                <input className="w-full h-10 border border-outline-variant rounded-lg px-sm text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="e.g. John Doe" type="text" />
              </div>
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Phone Number *</label>
                <input className="w-full h-10 border border-outline-variant rounded-lg px-sm text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="+92 300 1234567" type="tel" />
              </div>
              <div className="md:col-span-2 space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Delivery Address *</label>
                <textarea className="w-full border border-outline-variant rounded-lg p-sm text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Street address, building, floor..." rows={2}></textarea>
              </div>
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Destination City *</label>
                <select className="w-full h-10 border border-outline-variant rounded-lg px-sm text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white">
                  <option>Select City</option>
                  <option>Karachi</option>
                  <option>Lahore</option>
                  <option>Islamabad</option>
                </select>
              </div>
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Area/Locality</label>
                <input className="w-full h-10 border border-outline-variant rounded-lg px-sm text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="DHA Phase 6" type="text" />
              </div>
            </div>
          </section>

          {/* Section 2: Shipment Detail */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
            <div className="flex items-center gap-sm mb-lg border-b border-outline-variant pb-md">
              <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined">inventory_2</span>
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md">Shipment Detail</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Package weight, contents, and value</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Weight (kg) *</label>
                <input className="w-full h-10 border border-outline-variant rounded-lg px-sm text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="0.5" step="0.1" type="number" />
              </div>
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Pieces *</label>
                <input className="w-full h-10 border border-outline-variant rounded-lg px-sm text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="1" type="number" />
              </div>
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">COD Amount (PKR)</label>
                <input className="w-full h-10 border border-outline-variant rounded-lg px-sm text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="0" type="number" />
              </div>
              <div className="md:col-span-2 space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Product Description *</label>
                <input className="w-full h-10 border border-outline-variant rounded-lg px-sm text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="e.g. Electronics, Clothing" type="text" />
              </div>
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Service Type</label>
                <select className="w-full h-10 border border-outline-variant rounded-lg px-sm text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white">
                  <option>Overnight</option>
                  <option>Detained</option>
                  <option>Second Day</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 3: Collection Detail */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
            <div className="flex items-center gap-sm mb-lg border-b border-outline-variant pb-md">
              <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined">local_shipping</span>
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md">Collection Detail</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Pickup timing and special instructions</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Pickup Date</label>
                <div className="relative">
                  <input className="w-full h-10 border border-outline-variant rounded-lg px-sm text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" type="date" />
                </div>
              </div>
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Pickup Time Slot</label>
                <select className="w-full h-10 border border-outline-variant rounded-lg px-sm text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white">
                  <option>Morning (09 AM - 12 PM)</option>
                  <option>Afternoon (12 PM - 04 PM)</option>
                  <option>Evening (04 PM - 08 PM)</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Special Instructions</label>
                <textarea className="w-full border border-outline-variant rounded-lg p-sm text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Fragile item, call before arrival..." rows={2}></textarea>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar / Summary & Stats */}
        <div className="col-span-12 lg:col-span-4 space-y-lg">
          {/* Visual Anchor Image */}
          <div className="rounded-xl overflow-hidden border border-outline-variant shadow-sm h-48 relative group">
            <img alt="Fly Courier Dashboard Overview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCso3PSLKmhfWtz_0bE_k1jKISWASyYG_trC5Meib2KR22S3asUQMdzdsqT_MQHhLRhuIJ_4BovlNzry9o2vwBDrotvIgIJfl2mc0DnQsvxVYTtckFLOzoAVRGj2rdUaRjtQL1eQMZyAOrfZ2FByat4DsDvFhncMl4G1pfu2_tC6jDpBetNsNVC3xWT-2dRceBU07IMQr1wmsyF2zGlVHh4V9NsiM9lMzR27NOhJpP2HacGcpd2oD179mMPZgSBmNy2hX5uEpv8YOw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-md">
              <p className="text-white font-label-md text-label-md">Current Logistics Performance Dashboard</p>
            </div>
          </div>

          {/* Live Quote Card */}
          <div className="bg-primary text-on-primary rounded-xl p-md shadow-lg">
            <h3 className="font-headline-md text-headline-md mb-md flex items-center gap-xs">
              <span className="material-symbols-outlined">payments</span>
              Estimated Cost
            </h3>
            <div className="space-y-sm mb-lg">
              <div className="flex justify-between items-center opacity-80">
                <span className="font-body-md text-body-md">Base Rate</span>
                <span className="font-tabular-nums text-tabular-nums">PKR 250.00</span>
              </div>
              <div className="flex justify-between items-center opacity-80">
                <span className="font-body-md text-body-md">Fuel Surcharge</span>
                <span className="font-tabular-nums text-tabular-nums">PKR 35.00</span>
              </div>
              <div className="flex justify-between items-center opacity-80 border-b border-white/20 pb-sm">
                <span className="font-body-md text-body-md">GST (17%)</span>
                <span className="font-tabular-nums text-tabular-nums">PKR 48.45</span>
              </div>
              <div className="flex justify-between items-center pt-xs">
                <span className="font-headline-md text-headline-md">Total</span>
                <span className="font-display-lg text-display-lg tracking-tight">PKR 333.45</span>
              </div>
            </div>
            <p className="font-label-md text-[10px] uppercase tracking-widest opacity-60 text-center">Final price calculated at warehouse</p>
          </div>

          {/* Helpful Tips Bento */}
          <div className="bg-surface-container-high rounded-xl p-md space-y-md">
            <h4 className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">Quick Actions</h4>
            <button className="w-full p-sm bg-surface-container-lowest rounded-lg border border-outline-variant flex items-center gap-sm hover:border-primary transition-colors text-left">
              <span className="material-symbols-outlined text-primary">history</span>
              <div>
                <p className="font-label-md text-label-md">Recent Recipients</p>
                <p className="text-[10px] text-on-surface-variant">Autofill from past bookings</p>
              </div>
            </button>
            <button className="w-full p-sm bg-surface-container-lowest rounded-lg border border-outline-variant flex items-center gap-sm hover:border-primary transition-colors text-left">
              <span className="material-symbols-outlined text-primary">calculate</span>
              <div>
                <p className="font-label-md text-label-md">Rate Calculator</p>
                <p className="text-[10px] text-on-surface-variant">Compare different service levels</p>
              </div>
            </button>
          </div>

          {/* Info Alert */}
          <div className="bg-secondary-container/30 border border-secondary-container rounded-xl p-md flex gap-sm">
            <span className="material-symbols-outlined text-on-secondary-container">info</span>
            <p className="font-body-md text-body-md text-on-secondary-container">
              Please ensure the consignee&apos;s phone number is correct. Courier will send a tracking link via SMS upon collection.
            </p>
          </div>
        </div>
      </div>
    </div>
    </PortalLayout>
  );
}
