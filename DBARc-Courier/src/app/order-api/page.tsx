'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';

export default function OrderApiPage() {
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('booking');

  const handleCopy = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <PortalLayout>
      <div className="bg-background text-on-background font-body-md min-h-screen p-lg">
        <div className="max-w-[1280px] mx-auto space-y-lg">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-md border-b border-outline-variant pb-md">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  Developer Hub
                </span>
                <span className="text-xs text-outline">• Version v2.4.0-stable</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Order API & Integrations</h1>
              <p className="font-body-md text-body-md text-outline">
                Connect your WordPress/WooCommerce, Shopify store, or custom backend to automate order creation, label printing, and real-time tracking.
              </p>
            </div>
            <div className="flex items-center gap-sm">
              <button className="px-md py-2 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
                Generate API Key
              </button>
            </div>
          </div>

          {/* Section 1: API Key and Account Identifier */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-md">
            <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm flex flex-col gap-sm">
              <div className="flex justify-between items-center">
                <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Production API Key</h3>
                <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-xs py-[2px] rounded">Active</span>
              </div>
              <p className="text-xs text-outline">Use this key in your WordPress WooCommerce plugin or API headers for authentication.</p>
              <div className="relative mt-1">
                <input
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-mono text-sm pr-12 focus:outline-none"
                  readOnly
                  type="text"
                  value="dbarc_live_7721_99x2_kklp_9001"
                />
                <button
                  onClick={() => handleCopy(setCopiedKey)}
                  className={`absolute right-sm top-1/2 -translate-y-1/2 transition-colors p-1 rounded ${
                    copiedKey ? 'text-green-500' : 'text-primary hover:text-primary/80'
                  }`}
                  title="Copy API Key"
                >
                  <span className="material-symbols-outlined text-[18px]">{copiedKey ? 'check' : 'content_copy'}</span>
                </button>
              </div>
              <p className="text-xs text-on-surface-variant">Last rotated 12 days ago. <a className="text-primary hover:underline font-bold" href="#">Rotate Key</a></p>
            </div>

            <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm flex flex-col gap-sm">
              <div className="flex justify-between items-center">
                <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Merchant Account Identifier</h3>
                <span className="material-symbols-outlined text-outline">verified</span>
              </div>
              <p className="text-xs text-outline">Your unique Shipper account ID to bind automated orders to your merchant portal.</p>
              <div className="relative mt-1">
                <input
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-mono text-sm pr-12 focus:outline-none"
                  readOnly
                  type="text"
                  value="ACC_DBARC_7882910"
                />
                <button
                  onClick={() => handleCopy(setCopiedId)}
                  className={`absolute right-sm top-1/2 -translate-y-1/2 transition-colors p-1 rounded ${
                    copiedId ? 'text-green-500' : 'text-primary hover:text-primary/80'
                  }`}
                  title="Copy Account ID"
                >
                  <span className="material-symbols-outlined text-[18px]">{copiedId ? 'check' : 'content_copy'}</span>
                </button>
              </div>
              <p className="text-xs text-on-surface-variant">Merchant ID: <span className="font-mono font-bold">M-9811-A</span> | Default Origin: Main Warehouse</p>
            </div>
          </section>

          {/* Section 2: Ready-to-use E-commerce Plugins */}
          <section className="space-y-sm">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">Ready-to-use E-commerce Plugins</h2>
              <p className="text-sm text-outline">Install our plugin on your store to automatically sync orders directly into DBARc Courier.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
              {/* WordPress / WooCommerce Plugin Card */}
              <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm hover:border-primary transition-all cursor-pointer group flex items-start gap-md">
                <div className="w-16 h-16 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-blue-600 text-3xl">shopping_cart</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary font-bold transition-colors">
                      WordPress / WooCommerce Plugin
                    </h4>
                    <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  </div>
                  <p className="font-body-md text-sm text-on-surface-variant mt-xs leading-relaxed">
                    Auto-push new WooCommerce orders directly to DBARc courier upon checkout or status change. Prints thermal shipping labels and attaches tracking links to customer emails automatically.
                  </p>
                  <div className="mt-md flex items-center gap-xs text-primary font-bold text-sm">
                    <span>Download Plugin (v2.1.0 .zip)</span>
                    <span className="material-symbols-outlined text-sm">download</span>
                  </div>
                </div>
              </div>

              {/* Shopify App Card */}
              <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm hover:border-primary transition-all cursor-pointer group flex items-start gap-md">
                <div className="w-16 h-16 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-600 text-3xl">storefront</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary font-bold transition-colors">
                      Shopify Integration App
                    </h4>
                    <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      Live App
                    </span>
                  </div>
                  <p className="font-body-md text-sm text-on-surface-variant mt-xs leading-relaxed">
                    Direct integration with Shopify Webhooks. When an order is fulfilled, DBARc generates airway bills and updates the order tracking number in Shopify automatically.
                  </p>
                  <div className="mt-md flex items-center gap-xs text-primary font-bold text-sm">
                    <span>Connect Shopify Store</span>
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: REST API Endpoints Specification */}
          <section className="space-y-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-md">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">Order API Endpoints</h2>
                <p className="text-sm text-outline">Standard REST endpoints used by the WordPress plugin and external systems.</p>
              </div>
              <div className="flex flex-wrap gap-xs">
                <button className="px-md py-xs bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-xs">
                  Download Postman Collection
                </button>
                <button className="px-md py-xs border border-outline-variant text-on-surface font-bold rounded-lg hover:bg-surface-container-low transition-colors bg-white text-xs">
                  OpenAPI 3.0 Spec
                </button>
              </div>
            </div>

            <div className="space-y-md mt-md">
              {/* Endpoint 1: Book Shipment */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-md border-b border-outline-variant bg-surface-container-low flex flex-col sm:flex-row sm:justify-between sm:items-center gap-sm">
                  <div className="flex items-center gap-md">
                    <span className="bg-primary text-white px-md py-xs rounded font-bold text-xs">POST</span>
                    <h3 className="font-headline-md text-headline-md font-bold">Create / Book Order</h3>
                  </div>
                  <span className="font-mono text-sm text-on-surface-variant font-bold">/api/parcels</span>
                </div>
                <div className="p-md grid grid-cols-1 lg:grid-cols-2 gap-xl">
                  {/* Docs Column */}
                  <div className="space-y-md">
                    <div className="space-y-xs">
                      <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider font-bold">Required Headers</h4>
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
                              <td className="p-xs border-b border-outline-variant font-mono">x-tenant-id</td>
                              <td className="p-xs border-b border-outline-variant text-on-surface-variant">{"{TENANT_ID}"}</td>
                            </tr>
                            <tr>
                              <td className="p-xs border-b border-outline-variant font-mono">Content-Type</td>
                              <td className="p-xs border-b border-outline-variant text-on-surface-variant">application/json</td>
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
                        <span className="text-white text-xs font-bold">JSON Payload (WooCommerce Order Body)</span>
                      </div>
                      <pre className="bg-[#1e293b] text-[#e2e8f0] p-md text-xs leading-relaxed font-mono overflow-x-auto">
{`{
  "data": {
    "recipient_name": "Ali Khan",
    "recipient_phone": "03001234567",
    "recipient_address": "House 12, Street 4, Sector F-7, Islamabad",
    "destination_city": 14,
    "cod_amount": 3500,
    "weight": 1.2,
    "pieces": 1,
    "service_type": "Overnight",
    "reference_number": "WC-ORDER-#9821",
    "comments": "Fragile items inside"
  }
}`}
                      </pre>
                    </div>

                    <div className="rounded-lg overflow-hidden border border-outline-variant">
                      <div className="bg-[#2d3133] px-md py-xs flex justify-between items-center">
                        <span className="text-emerald-400 text-xs font-bold">Success Response (200 OK)</span>
                      </div>
                      <pre className="bg-[#1e293b] text-[#e2e8f0] p-md text-xs leading-relaxed font-mono overflow-x-auto">
{`{
  "data": {
    "id": 1042,
    "tracking_number": "DBA-9821-X9",
    "status": "Total Booking",
    "cod_amount": 3500,
    "tracking_url": "https://track.dbarc.com/DBA-9821-X9"
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Utility Endpoints Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md flex flex-col gap-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold bg-green-100 text-green-800 px-xs py-[2px] rounded">GET</span>
                    <span className="material-symbols-outlined text-outline text-sm">location_city</span>
                  </div>
                  <h4 className="font-headline-md text-headline-md font-bold">Cities & Coverage API</h4>
                  <p className="text-xs text-on-surface-variant">Fetch supported cities and auto-complete destination dropdowns on your store checkout.</p>
                  <div className="mt-auto pt-sm border-t border-outline-variant">
                    <code className="text-[10px] text-primary font-mono">/api/cities</code>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md flex flex-col gap-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-xs py-[2px] rounded">GET</span>
                    <span className="material-symbols-outlined text-outline text-sm">my_location</span>
                  </div>
                  <h4 className="font-headline-md text-headline-md font-bold">Order Tracking API</h4>
                  <p className="text-xs text-on-surface-variant">Retrieve current parcel status, rider assignment, and delivery history for any tracking code.</p>
                  <div className="mt-auto pt-sm border-t border-outline-variant">
                    <code className="text-[10px] text-primary font-mono">/api/parcels?filters[tracking_number][$eq]={'{TRACKING}'}</code>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md flex flex-col gap-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-xs py-[2px] rounded">PUT</span>
                    <span className="material-symbols-outlined text-outline text-sm">cancel</span>
                  </div>
                  <h4 className="font-headline-md text-headline-md font-bold">Cancel Order API</h4>
                  <p className="text-xs text-on-surface-variant">Cancel unfulfilled orders before hub pickup. Returns updated cancellation status.</p>
                  <div className="mt-auto pt-sm border-t border-outline-variant">
                    <code className="text-[10px] text-primary font-mono">/api/parcels/{'{id}'}</code>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* WordPress Plugin Step-by-Step Configuration Guide */}
          <section className="bg-surface-container-lowest p-lg rounded-2xl border border-outline-variant space-y-md">
            <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">extension</span>
              How the WordPress / WooCommerce Integration Works
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-md text-xs">
              <div className="p-md rounded-xl bg-surface-container-low border border-outline-variant space-y-2">
                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">1</span>
                <h4 className="font-bold text-sm text-slate-900">Install WP Plugin</h4>
                <p className="text-slate-600 leading-relaxed">
                  Upload the <span className="font-mono font-bold">dbarc-courier.zip</span> plugin into WordPress Admin under <span className="font-semibold">Plugins &gt; Add New</span>.
                </p>
              </div>

              <div className="p-md rounded-xl bg-surface-container-low border border-outline-variant space-y-2">
                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">2</span>
                <h4 className="font-bold text-sm text-slate-900">Enter Credentials</h4>
                <p className="text-slate-600 leading-relaxed">
                  In WordPress Settings &gt; DBARc, enter your <span className="font-mono font-bold">API Key</span> and <span className="font-mono font-bold">Account ID</span> shown above.
                </p>
              </div>

              <div className="p-md rounded-xl bg-surface-container-low border border-outline-variant space-y-2">
                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">3</span>
                <h4 className="font-bold text-sm text-slate-900">Automated Order Sync</h4>
                <p className="text-slate-600 leading-relaxed">
                  When customers place orders, the plugin automatically calls <span className="font-mono font-bold">/api/parcels</span> and generates thermal Airway Bills directly inside WooCommerce.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PortalLayout>
  );
}
