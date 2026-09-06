'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { 
  ShoppingBag, 
  CreditCard, 
  Banknote, 
  CheckCircle2, 
  ArrowRight, 
  Truck, 
  Building2, 
  ExternalLink,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface City {
  id: number;
  name: string;
}

interface Shipper {
  id: number;
  name: string;
  contact_person?: string;
}

export default function QaOrderSandboxPage() {
  const [cities, setCities] = React.useState<City[]>([]);
  const [shippers, setShippers] = React.useState<Shipper[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form State
  const [selectedShipperId, setSelectedShipperId] = React.useState<string>('');
  const [orderReference, setOrderReference] = React.useState(`WC-QA-${Math.floor(10000 + Math.random() * 90000)}`);
  const [recipientName, setRecipientName] = React.useState('Muhammad Ali');
  const [recipientPhone, setRecipientPhone] = React.useState('03001234567');
  const [recipientAddress, setRecipientAddress] = React.useState('House 14-B, Street 9, Sector F-7/2');
  const [selectedCityId, setSelectedCityId] = React.useState<string>('');
  const [paymentType, setPaymentType] = React.useState<'COD' | 'PAID'>('COD');
  const [orderAmount, setOrderAmount] = React.useState<number>(2450);
  const [weight, setWeight] = React.useState<number>(1.2);
  const [comments, setComments] = React.useState('Live QA order via DBARc eCommerce plugin pipeline');

  // Success State
  const [bookedParcel, setBookedParcel] = React.useState<{
    id: number;
    trackingNumber: string;
    status: string;
    paymentType: string;
    codAmount: number;
  } | null>(null);

  // Fetch Cities and Shippers from Strapi (No mock data)
  React.useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [citiesRes, shippersRes] = await Promise.all([
          apiClient.get('/cities?pagination[pageSize]=100&sort=name:asc').catch(() => ({ data: [] })),
          apiClient.get('/shippers?pagination[pageSize]=50&sort=name:asc').catch(() => ({ data: [] })),
        ]);

        const rawCities = (citiesRes as any)?.data || [];
        const mappedCities = rawCities.map((c: any) => ({
          id: c.id,
          name: c.attributes?.name || c.name || `City #${c.id}`,
        }));
        setCities(mappedCities);
        if (mappedCities.length > 0) {
          setSelectedCityId(String(mappedCities[0].id));
        }

        const rawShippers = (shippersRes as any)?.data || [];
        const mappedShippers = rawShippers.map((s: any) => ({
          id: s.id,
          name: s.attributes?.name || s.name || `Shipper #${s.id}`,
          contact_person: s.attributes?.contact_person || s.contact_person,
        }));
        setShippers(mappedShippers);
        if (mappedShippers.length > 0) {
          setSelectedShipperId(String(mappedShippers[0].id));
        }
      } catch (err) {
        console.error('Failed to load QA metadata:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, []);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const isCod = paymentType === 'COD';
      const actualCod = isCod ? Number(orderAmount) : 0;
      const trackingNumber = `DBA-${Math.floor(100000 + Math.random() * 900000)}-PK`;

      // Live payload matching exactly what class-dbarc-order-sync.php sends
      const payload = {
        data: {
          tracking_number: trackingNumber,
          reference_number: orderReference,
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          recipient_address: recipientAddress,
          destination_city: selectedCityId ? Number(selectedCityId) : undefined,
          shipper: selectedShipperId ? Number(selectedShipperId) : undefined,
          payment_type: paymentType,
          cod_amount: actualCod,
          delivery_charges: 250,
          weight: Number(weight),
          pieces: 1,
          service_type: 'Overnight',
          shipment_type: 'Parcel',
          status: 'Total Booking',
          comments: comments,
        }
      };

      const res: any = await apiClient.post('/parcels', payload);
      const created = res.data || res;

      setBookedParcel({
        id: created.id || Math.floor(Math.random() * 1000),
        trackingNumber: trackingNumber,
        status: 'Total Booking',
        paymentType: paymentType,
        codAmount: actualCod,
      });
    } catch (err: any) {
      alert(`Booking failed: ${err?.message || 'Server error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setBookedParcel(null);
    setOrderReference(`WC-QA-${Math.floor(10000 + Math.random() * 90000)}`);
  };

  return (
    <PortalLayout>
      <div className="bg-slate-50 text-slate-900 min-h-screen p-6 md:p-10 font-sans">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> QA E-Commerce Sandbox
                </span>
                <span className="text-xs font-semibold text-slate-500">• 100% Real Live Database Sync</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Live Storefront Checkout Simulator
              </h1>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Use this page on your QA machine to test live order booking through the DBARc e-commerce integration pipeline.
                Orders placed here save directly to Strapi PostgreSQL database and show up in real-time in the Shipper and Courier portals.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link 
                href="/orders" 
                className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4 text-primary" /> View Shipper Orders
              </Link>
              <Link 
                href="/shipments" 
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <Truck className="w-4 h-4 text-emerald-400" /> Courier Shipments
              </Link>
            </div>
          </div>

          {bookedParcel ? (
            /* Success Confirmation Card */
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Order Successfully Ingested to DBARc
                </span>
                <h2 className="text-2xl font-black text-slate-900">
                  Tracking #: <span className="text-primary font-mono">{bookedParcel.trackingNumber}</span>
                </h2>
                <p className="text-xs text-slate-500">Reference: {orderReference}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto bg-slate-50 p-4 rounded-xl border border-slate-200 text-left">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Payment Mode</div>
                  <div className="mt-1">
                    {bookedParcel.paymentType === 'PAID' ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                        PAID (Prepaid)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 inline-block">
                        COD
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Cash to Collect</div>
                  <div className="text-sm font-black text-slate-900 mt-1">
                    {bookedParcel.paymentType === 'PAID' ? 'PKR 0' : `PKR ${bookedParcel.codAmount.toLocaleString()}`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Status in DBARc</div>
                  <div className="text-sm font-black text-primary mt-1">
                    {bookedParcel.status}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100">
                <Link
                  href="/orders"
                  className="w-full sm:w-auto px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" /> Check Real-Time in Shipper Orders
                </Link>
                <button
                  onClick={resetForm}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Book Another QA Test Order
                </button>
              </div>
            </div>
          ) : (
            /* Live Checkout Form */
            <form onSubmit={handlePlaceOrder} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">Storefront Checkout Form</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Emulates a customer completing purchase on WooCommerce / eCommerce store</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Order Ref</div>
                  <div className="font-mono text-xs font-bold text-emerald-400">{orderReference}</div>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                {/* Shipper Selector */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" /> Target Shipper Account (Merchant)
                  </label>
                  <p className="text-[11px] text-slate-500">The order will be created under this shipper and show up in their dashboard.</p>
                  <select
                    value={selectedShipperId}
                    onChange={(e) => setSelectedShipperId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none focus:border-primary"
                  >
                    {shippers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.contact_person || 'Merchant'})</option>
                    ))}
                  </select>
                </div>

                {/* Customer Information */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
                    Customer Delivery Address
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Recipient Name</label>
                      <input
                        type="text"
                        required
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Recipient Phone</label>
                      <input
                        type="text"
                        required
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Street Address</label>
                      <input
                        type="text"
                        required
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Destination City</label>
                      <select
                        value={selectedCityId}
                        onChange={(e) => setSelectedCityId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-primary"
                      >
                        {cities.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Payment Selection (The Key Feature) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
                    Payment Method (Choose to test COD vs PAID)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      onClick={() => setPaymentType('COD')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentType === 'COD'
                          ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${paymentType === 'COD' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Banknote className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">Cash on Delivery (COD)</div>
                          <div className="text-[11px] text-slate-500">Rider must collect full cash upon delivery</div>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => setPaymentType('PAID')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentType === 'PAID'
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${paymentType === 'PAID' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">Prepaid / Online Payment (PAID)</div>
                          <div className="text-[11px] text-slate-500">Customer paid online. Rider collects PKR 0</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Financials */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Order Amount (PKR)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={orderAmount}
                      onChange={(e) => setOrderAmount(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">COD Amount in DBARc</label>
                    <div className="py-2 px-3 bg-slate-200/70 border border-slate-300 rounded-xl text-xs font-black text-slate-700">
                      {paymentType === 'PAID' ? '0 (Locked for PAID)' : `PKR ${orderAmount.toLocaleString()}`}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Weight (KG)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={0.1}
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
                  >
                    {isSubmitting ? (
                      'Submitting Order to DBARc Backend...'
                    ) : (
                      <>
                        Place Order &amp; Push to DBARc Database <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-slate-400 mt-2">
                    Writes a real active parcel record into PostgreSQL database via Strapi REST API
                  </p>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
