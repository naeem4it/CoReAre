'use client';

import * as React from 'react';

export default function StitchUnifiedPage() {
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(false);

  const handleCopy = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="bg-background text-on-background font-body-md overflow-hidden h-screen flex flex-col">
      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 h-[64px] bg-surface border-b border-outline-variant shadow-sm flex justify-between items-center px-lg">
        <div className="flex items-center gap-md">
          <span className="font-display-lg text-[24px] md:text-[36px] font-bold text-primary">Fly Courier DevPortal</span>
        </div>
        <div className="flex-1 max-w-[600px] mx-xl hidden md:block">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline">search</span>
            <input className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-xl pr-md py-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Search for endpoints, plugins, or guides..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-md">
          <div className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:bg-surface-container-low p-xs rounded-full transition-colors hidden sm:block">dark_mode</span>
            <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:bg-surface-container-low p-xs rounded-full transition-colors">notifications</span>
            <div className="flex items-center gap-xs ml-xs cursor-pointer hover:bg-surface-container-low p-xs rounded-lg transition-colors">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
              <span className="font-label-md text-label-md text-on-surface hidden sm:block">DevAdmin_FC</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-[64px] overflow-hidden">
        {/* SideNavBar */}
        <aside className="hidden md:flex flex-col fixed left-0 top-[64px] h-[calc(100vh-64px)] w-64 bg-surface-container-low border-r border-outline-variant p-sm space-y-base z-40">
          <div className="px-md py-sm">
            <h2 className="font-headline-md text-headline-md text-primary">API Reference</h2>
            <p className="font-label-md text-label-md text-on-surface-variant">v2.4.0-stable</p>
          </div>
          <nav className="flex-1 space-y-base overflow-y-auto">
            <div className="flex items-center gap-sm px-md py-sm cursor-pointer text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg">
              <span className="material-symbols-outlined">info</span>
              <span className="font-label-md text-label-md">Introduction</span>
            </div>
            <div className="flex items-center gap-sm px-md py-sm cursor-pointer text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg">
              <span className="material-symbols-outlined">vpn_key</span>
              <span className="font-label-md text-label-md">Authentication</span>
            </div>
            {/* Active Tab: Booking API */}
            <div className="flex items-center gap-sm px-md py-sm cursor-pointer bg-secondary-container text-on-secondary-container font-bold rounded-lg">
              <span className="material-symbols-outlined">local_shipping</span>
              <span className="font-label-md text-label-md">Booking API</span>
            </div>
            <div className="flex items-center gap-sm px-md py-sm cursor-pointer text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg">
              <span className="material-symbols-outlined">location_on</span>
              <span className="font-label-md text-label-md">Tracking API</span>
            </div>
            <div className="flex items-center gap-sm px-md py-sm cursor-pointer text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg">
              <span className="material-symbols-outlined">map</span>
              <span className="font-label-md text-label-md">City Services</span>
            </div>
            <div className="flex items-center gap-sm px-md py-sm cursor-pointer text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg">
              <span className="material-symbols-outlined">sync_alt</span>
              <span className="font-label-md text-label-md">Webhooks</span>
            </div>
          </nav>
          <div className="pt-sm border-t border-outline-variant">
            <div className="flex items-center gap-sm px-md py-sm cursor-pointer text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg">
              <span className="material-symbols-outlined">help_outline</span>
              <span className="font-label-md text-label-md">Support</span>
            </div>
            <div className="flex items-center gap-sm px-md py-sm cursor-pointer text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg">
              <span className="material-symbols-outlined">check_circle</span>
              <span className="font-label-md text-label-md">Status</span>
            </div>
          </div>
        </aside>

        {/* Main Content Canvas */}
        <main className="w-full md:ml-64 flex-1 overflow-y-auto bg-surface p-lg">
          <div className="max-w-[1280px] mx-auto space-y-lg">
            {/* Section 1: API Key and Account ID Management */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-md">
              <div className="bg-white p-md rounded-xl border border-outline-variant shadow-sm flex flex-col gap-sm">
                <div className="flex justify-between items-center">
                  <h3 className="font-headline-md text-headline-md text-on-surface">Production API Key</h3>
                  <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary-fixed px-xs py-[2px] rounded">Active</span>
                </div>
                <div className="relative">
                  <input className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-mono text-sm pr-12 focus:outline-none" readOnly type="password" value="fc_live_7721_99x2_kklp_9001" />
                  <button onClick={() => handleCopy(setCopiedKey)} className={`absolute right-sm top-1/2 -translate-y-1/2 transition-colors ${copiedKey ? 'text-green-500' : 'text-primary hover:text-primary-container'}`}>
                    <span className="material-symbols-outlined">{copiedKey ? 'check' : 'content_copy'}</span>
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant">Last rotated 12 days ago. <a className="text-primary hover:underline font-bold" href="#">Rotate Key</a></p>
              </div>
              <div className="bg-white p-md rounded-xl border border-outline-variant shadow-sm flex flex-col gap-sm">
                <div className="flex justify-between items-center">
                  <h3 className="font-headline-md text-headline-md text-on-surface">Account Identifier</h3>
                  <span className="material-symbols-outlined text-outline">help_outline</span>
                </div>
                <div className="relative">
                  <input className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-mono text-sm pr-12 focus:outline-none" readOnly type="text" value="ACC_FLY_7882910" />
                  <button onClick={() => handleCopy(setCopiedId)} className={`absolute right-sm top-1/2 -translate-y-1/2 transition-colors ${copiedId ? 'text-green-500' : 'text-primary hover:text-primary-container'}`}>
                    <span className="material-symbols-outlined">{copiedId ? 'check' : 'content_copy'}</span>
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant">Merchant ID: <span className="font-mono">M-9811-A</span> | Region: EU-WEST-1</p>
              </div>
            </section>

            {/* Section 2: Ready-to-use Plugins */}
            <section className="space-y-sm">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">E-commerce Plugins</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
                {/* WordPress Card */}
                <div className="bg-white p-md rounded-xl border border-outline-variant shadow-sm hover:border-primary transition-colors cursor-pointer group flex items-start gap-md">
                  <div className="w-16 h-16 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                    <img alt="WordPress Logo" className="w-10 h-10 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUrg6CI0A0ZQ6lG15rZ8vd3HB97uCRQ00SubLOz8mYPcAq3Kqtjpva152wFK2RiD1PfjhxRrrjB58cVFWRFb6t8BFEaD5yzArMJKR7BYpG7zfG6Iy4d0pxuhSVC2Oh2r3R8iG5aI6CBEJ8PJwoV_GnTDa9F7jCfZ87NPSEtt-BGdErGq5nSJn528E4E1yfRHDo0WeCBUYVO6kZ39KuV0Lx1R6h7XfZZvYZlsFjpbpejvYu6fjWr0DKjTushxQIJftGr5qhV2Lc7gs" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors">WordPress Plugin</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-xs">One-click installation for WooCommerce stores. Supports automatic label generation and real-time tracking updates.</p>
                    <div className="mt-md flex items-center gap-xs text-primary font-bold">
                      <span className="text-sm">Download v2.1.0</span>
                      <span className="material-symbols-outlined text-sm">download</span>
                    </div>
                  </div>
                </div>
                {/* Shopify Card */}
                <div className="bg-white p-md rounded-xl border border-outline-variant shadow-sm hover:border-primary transition-colors cursor-pointer group flex items-start gap-md">
                  <div className="w-16 h-16 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                    <img alt="Shopify Logo" className="w-10 h-10 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBClK157Q58Qn2dc4BYrm2sQTaxfp5-SC-qvn5up6VkC8i2eY_6ZEBzWoM5EpT9QreGtMBQ0u_lRQjL60mytgY5RDThn7pnUpW7vNed2RNlDfZzMqnM2A6NAZWDYxWNFoJOxN4BF4WX2uRrdD9MwNaOO0aj6av6ysta3ubk9apdPrONCwRgiTg_APaJOp9nJ8q5l3N41jnaLZyaYmdoVgvA-JCbbRal4jNGHhHkkTGQXdYIOJrEzakBG_T8SdThGdAZnRa6QMWg2Kk" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors">Shopify App</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Seamlessly sync orders and automate shipping. Integrated directly into the Shopify Admin dashboard.</p>
                    <div className="mt-md flex items-center gap-xs text-primary font-bold">
                      <span className="text-sm">Get from Shopify App Store</span>
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: REST API Endpoints */}
            <section className="space-y-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-md">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">REST API Endpoints</h2>
                <div className="flex flex-wrap gap-xs">
                  <button className="px-md py-xs bg-primary text-white font-bold rounded-lg hover:bg-primary-container transition-colors shadow-sm">Postman Collection</button>
                  <button className="px-md py-xs border border-outline-variant text-on-surface-variant font-bold rounded-lg hover:bg-surface-container-low transition-colors bg-white">Download OpenAPI Spec</button>
                </div>
              </div>
              
              <div className="space-y-lg mt-md">
                {/* Endpoint: Book Shipment */}
                <div className="bg-white rounded-xl border border-outline-variant overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-md border-b border-outline-variant bg-surface-container-lowest flex flex-col sm:flex-row sm:justify-between sm:items-center gap-sm">
                    <div className="flex items-center gap-md">
                      <span className="bg-primary-container text-white px-md py-xs rounded font-bold text-xs">POST</span>
                      <h3 className="font-headline-md text-headline-md">Book Shipment</h3>
                    </div>
                    <span className="font-mono text-sm text-on-surface-variant">/api/v2/shipment/book</span>
                  </div>
                  <div className="p-md grid grid-cols-1 lg:grid-cols-2 gap-xl">
                    {/* Docs Column */}
                    <div className="space-y-md">
                      <div className="space-y-xs">
                        <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider">Required Headers</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-surface-container-low text-on-surface-variant text-left">
                                <th className="p-xs font-bold border-b border-outline-variant">Header</th>
                                <th className="p-xs font-bold border-b border-outline-variant">Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="p-xs border-b border-outline-variant font-mono">Authorization</td>
                                <td className="p-xs border-b border-outline-variant text-on-surface-variant">Bearer {"{API_KEY}"}</td>
                              </tr>
                              <tr>
                                <td className="p-xs border-b border-outline-variant font-mono">Content-Type</td>
                                <td className="p-xs border-b border-outline-variant text-on-surface-variant">application/json</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="space-y-xs">
                        <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider">Parameters</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-surface-container-low text-on-surface-variant text-left">
                                <th className="p-xs font-bold border-b border-outline-variant">Name</th>
                                <th className="p-xs font-bold border-b border-outline-variant">Type</th>
                                <th className="p-xs font-bold border-b border-outline-variant">Example</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="p-xs border-b border-outline-variant font-bold">origin_zip</td>
                                <td className="p-xs border-b border-outline-variant italic">String (Req)</td>
                                <td className="p-xs border-b border-outline-variant text-on-surface-variant">"SW1A 1AA"</td>
                              </tr>
                              <tr>
                                <td className="p-xs border-b border-outline-variant font-bold">service_type</td>
                                <td className="p-xs border-b border-outline-variant italic">Enum (Req)</td>
                                <td className="p-xs border-b border-outline-variant text-on-surface-variant">"EXPRESS"</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                    {/* Code Column */}
                    <div className="space-y-md">
                      <div className="rounded-lg overflow-hidden border border-outline-variant">
                        <div className="bg-[#2d3133] px-md py-xs flex justify-between items-center">
                          <span className="text-white text-xs font-bold">JSON Request</span>
                          <span className="material-symbols-outlined text-sm text-outline cursor-pointer hover:text-white transition-colors">content_copy</span>
                        </div>
                        <pre className="bg-[#1e293b] text-[#e2e8f0] p-md text-xs leading-relaxed font-mono overflow-x-auto">
{`{
  "sender": { "name": "Global Hub", "city_id": 402 },
  "receiver": { "name": "Alex Smith", "city_id": 501 },
  "package": { "weight": 2.5, "unit": "kg" }
}`}
                        </pre>
                      </div>
                      <div className="rounded-lg overflow-hidden border border-outline-variant">
                        <div className="bg-[#2d3133] px-md py-xs flex justify-between items-center">
                          <span className="text-green-400 text-xs font-bold">Success Response (201)</span>
                        </div>
                        <pre className="bg-[#1e293b] text-[#e2e8f0] p-md text-xs leading-relaxed font-mono overflow-x-auto">
{`{
  "status": "success",
  "shipment_id": "FC-9921-X",
  "tracking_url": "https://fly.dev/track/9921"
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endpoint: Cancel Order (Compact Representation) */}
                <div className="bg-white rounded-xl border border-outline-variant overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-md border-b border-outline-variant bg-surface-container-lowest flex flex-col sm:flex-row sm:justify-between sm:items-center gap-sm">
                    <div className="flex items-center gap-md">
                      <span className="bg-error text-white px-md py-xs rounded font-bold text-xs">DELETE</span>
                      <h3 className="font-headline-md text-headline-md">Cancel Order</h3>
                    </div>
                    <span className="font-mono text-sm text-on-surface-variant">/api/v2/shipment/cancel/{"{id}"}</span>
                  </div>
                  <div className="p-md">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
                      <div className="space-y-sm">
                        <p className="text-on-surface-variant text-sm">Permanently cancels a pending shipment. Note: Shipments already 'In Transit' cannot be canceled via API and require manual support intervention.</p>
                        <div className="flex flex-col sm:flex-row gap-md">
                          <div className="flex-1">
                            <h4 className="font-label-md text-label-md text-outline mb-xs">Path Parameter</h4>
                            <div className="p-xs bg-surface-container rounded border border-outline-variant font-mono text-xs">id (String)</div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-label-md text-label-md text-outline mb-xs">Auth Required</h4>
                            <div className="p-xs bg-surface-container rounded border border-outline-variant font-mono text-xs">Write Permission</div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg overflow-hidden border border-outline-variant">
                        <div className="bg-[#2d3133] px-md py-xs flex justify-between items-center">
                          <span className="text-red-400 text-xs font-bold">Error Response (403)</span>
                        </div>
                        <pre className="bg-[#1e293b] text-[#e2e8f0] p-md text-xs leading-relaxed font-mono overflow-x-auto">
{`{
  "error": "SHIPMENT_IN_TRANSIT",
  "message": "Shipment cannot be canceled after pickup."
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid for smaller utility endpoints */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                  {/* City List */}
                  <div className="bg-white rounded-xl border border-outline-variant p-md flex flex-col gap-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold bg-green-100 text-green-800 px-xs py-[2px] rounded">GET</span>
                      <span className="material-symbols-outlined text-outline text-sm">open_in_new</span>
                    </div>
                    <h4 className="font-headline-md text-headline-md">City List</h4>
                    <p className="text-xs text-on-surface-variant">Fetch all supported service cities and their respective unique identifiers for shipment booking.</p>
                    <div className="mt-auto pt-sm border-t border-outline-variant">
                      <code className="text-[10px] text-primary">/api/v2/meta/cities</code>
                    </div>
                  </div>
                  {/* Tracking API */}
                  <div className="bg-white rounded-xl border border-outline-variant p-md flex flex-col gap-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold bg-green-100 text-green-800 px-xs py-[2px] rounded">GET</span>
                      <span className="material-symbols-outlined text-outline text-sm">open_in_new</span>
                    </div>
                    <h4 className="font-headline-md text-headline-md">Tracking API</h4>
                    <p className="text-xs text-on-surface-variant">Retrieve current status, location history, and estimated delivery time for any active tracking ID.</p>
                    <div className="mt-auto pt-sm border-t border-outline-variant">
                      <code className="text-[10px] text-primary">/api/v2/track/{"{id}"}</code>
                    </div>
                  </div>
                  {/* Address Labels */}
                  <div className="bg-white rounded-xl border border-outline-variant p-md flex flex-col gap-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold bg-primary-container text-white px-xs py-[2px] rounded">POST</span>
                      <span className="material-symbols-outlined text-outline text-sm">open_in_new</span>
                    </div>
                    <h4 className="font-headline-md text-headline-md">Address Labels</h4>
                    <p className="text-xs text-on-surface-variant">Generate PDF or PNG shipping labels for printing. Supports multiple formats (A4, 4x6 thermal).</p>
                    <div className="mt-auto pt-sm border-t border-outline-variant">
                      <code className="text-[10px] text-primary">/api/v2/labels/generate</code>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Help Footer */}
            <footer className="bg-[#2d3133] p-xl rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-lg text-white">
              <div className="space-y-xs text-center lg:text-left">
                <h3 className="font-headline-lg text-headline-lg">Need custom integration?</h3>
                <p className="text-outline">Our engineering team can help with enterprise-level bespoke logistics workflows.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-md w-full lg:w-auto">
                <button className="bg-white text-primary px-xl py-md rounded-lg font-bold hover:bg-surface-container-low transition-colors w-full sm:w-auto text-center">Contact Sales</button>
                <button className="border border-outline px-xl py-md rounded-lg font-bold hover:bg-white/10 transition-colors w-full sm:w-auto text-center">Join Discord</button>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-lg right-lg w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-container transition-all active:scale-95 group z-50">
        <span className="material-symbols-outlined text-[28px]">add</span>
        <span className="absolute right-full mr-sm bg-inverse-surface text-white text-xs px-md py-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none">Create API Key</span>
      </button>
    </div>
  );
}
