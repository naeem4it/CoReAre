'use client';

import * as React from 'react';
import { apiClient } from '@/shared/api/api-client';
import { 
  ShoppingBag, 
  Check, 
  Truck, 
  ShieldCheck, 
  CreditCard, 
  Banknote, 
  CheckCircle2, 
  ArrowRight, 
  Star, 
  RotateCcw,
  Package,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info
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

const SIZES = [
  { id: 'S', name: 'Small', chest: '38" Chest' },
  { id: 'M', name: 'Medium', chest: '40" Chest' },
  { id: 'L', name: 'Large', chest: '42" Chest' },
  { id: 'XL', name: 'Extra Large', chest: '44" Chest' },
];

const COLORS = [
  { id: 'Sky Blue', name: 'Sky Blue', hex: '#38bdf8', bgClass: 'bg-sky-400' },
  { id: 'Classic Navy', name: 'Classic Navy', hex: '#1e3a8a', bgClass: 'bg-blue-900' },
  { id: 'Crisp White', name: 'Crisp White', hex: '#f8fafc', bgClass: 'bg-slate-100' },
];

export default function SampleShirtStorePage() {
  const [cities, setCities] = React.useState<City[]>([]);
  const [shippers, setShippers] = React.useState<Shipper[]>([]);
  const [selectedShipperId, setSelectedShipperId] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Shirt Customization State
  const [selectedSize, setSelectedSize] = React.useState<string>('L');
  const [selectedColor, setSelectedColor] = React.useState<string>('Sky Blue');
  const [quantity, setQuantity] = React.useState<number>(1);
  const unitPrice = 2450;
  const totalPrice = unitPrice * quantity;

  // Checkout Customer Details
  const [orderReference, setOrderReference] = React.useState(`STORE-SHIRT-${Math.floor(10000 + Math.random() * 90000)}`);
  const [recipientName, setRecipientName] = React.useState('Usman Tariq');
  const [recipientPhone, setRecipientPhone] = React.useState('03214567890');
  const [recipientAddress, setRecipientAddress] = React.useState('House 24-B, Street 11, DHA Phase 6');
  const [selectedCityId, setSelectedCityId] = React.useState<string>('');
  const [paymentType, setPaymentType] = React.useState<'COD' | 'PAID'>('COD');

  // Confirmation state
  const [orderConfirmed, setOrderConfirmed] = React.useState<{
    trackingNumber: string;
    orderReference: string;
    size: string;
    color: string;
    quantity: number;
    amount: number;
    paymentType: 'COD' | 'PAID';
    codToCollect: number;
    city: string;
  } | null>(null);

  // Load real cities and shippers from DBARc backend
  React.useEffect(() => {
    const fetchStoreData = async () => {
      try {
        const [citiesRes, shippersRes] = await Promise.all([
          apiClient.get('/cities?pagination[pageSize]=150&sort=name:asc').catch(() => ({ data: [] })),
          apiClient.get('/shippers?pagination[pageSize]=50&sort=name:asc').catch(() => ({ data: [] })),
        ]);

        const rawCities = (citiesRes as any)?.data || [];
        const mappedCities = rawCities.map((c: any) => ({
          id: c.id,
          name: c.attributes?.name || c.name || `City #${c.id}`,
        }));
        setCities(mappedCities);
        if (mappedCities.length > 0) {
          // Default to Lahore or first city
          const lahore = mappedCities.find((c: any) => c.name.toLowerCase().includes('lahore'));
          setSelectedCityId(lahore ? String(lahore.id) : String(mappedCities[0].id));
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
      } catch (e) {
        console.error('Failed to load store data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStoreData();
  }, []);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const trackingNumber = `DBA-${Math.floor(100000 + Math.random() * 900000)}-PK`;
      const isCod = paymentType === 'COD';
      const actualCod = isCod ? totalPrice : 0;
      const cityName = cities.find(c => String(c.id) === selectedCityId)?.name || 'Destination City';

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
          delivery_charges: 200,
          weight: 0.6 * quantity,
          pieces: quantity,
          service_type: 'Overnight',
          shipment_type: 'Parcel',
          status: 'Total Booking',
          comments: `Oxford Casual Shirt | Size: ${selectedSize} | Color: ${selectedColor} | Qty: ${quantity}`,
        }
      };

      await apiClient.post('/parcels', payload);

      setOrderConfirmed({
        trackingNumber,
        orderReference,
        size: selectedSize,
        color: selectedColor,
        quantity,
        amount: totalPrice,
        paymentType,
        codToCollect: actualCod,
        city: cityName,
      });
    } catch (err: any) {
      alert(`Store checkout error: ${err?.message || 'Could not connect to DBARc server'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewOrder = () => {
    setOrderConfirmed(null);
    setOrderReference(`STORE-SHIRT-${Math.floor(10000 + Math.random() * 90000)}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Top Notification Bar */}
      <div className="bg-slate-900 text-white text-xs py-2 px-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-slate-300">Live QA E-Commerce Storefront</span>
            <span className="hidden sm:inline text-slate-500">• Connected to Local DBARc PostgreSQL</span>
          </div>
          <Link
            href="/orders"
            target="_blank"
            className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 hover:underline text-xs"
          >
            <span>Open Shipper Portal</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Main Store Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg tracking-wider shadow-sm">
              US
            </div>
            <div>
              <div className="font-black text-base text-slate-900 tracking-tight leading-none">
                Urban Stitch Apparel
              </div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                Merchant Store • DBARc Partner
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <span className="hidden md:flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <Truck className="w-3.5 h-3.5" /> Express Overnight Delivery by DBARc
            </span>
            <div className="flex items-center gap-1 bg-slate-100 text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200">
              <ShoppingBag className="w-4 h-4 text-slate-700" />
              <span className="font-bold">{quantity} Item</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {orderConfirmed ? (
          /* Thank You / Order Confirmed Card */
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-emerald-200 shadow-xl p-8 sm:p-12 text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <span className="px-3.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
                Order Placed &amp; Dispatched to DBARc!
              </span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Thank You, {recipientName}!
              </h2>
              <p className="text-sm text-slate-600">
                Your order <span className="font-mono font-bold text-slate-900">{orderConfirmed.orderReference}</span> has been received and booked into the DBARc courier network.
              </p>
            </div>

            {/* Tracking Banner */}
            <div className="bg-slate-950 text-white p-6 rounded-2xl shadow-md text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">DBARc Tracking Number</div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Active in DB
                </span>
              </div>
              <div className="font-mono text-2xl font-black text-emerald-400 tracking-wider">
                {orderConfirmed.trackingNumber}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                <div>
                  <div className="text-slate-400 text-[10px]">Shirt Size</div>
                  <div className="font-bold text-white text-sm mt-0.5">{orderConfirmed.size}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Color</div>
                  <div className="font-bold text-white text-sm mt-0.5">{orderConfirmed.color}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Payment Type</div>
                  <div className="font-bold text-amber-400 text-sm mt-0.5">{orderConfirmed.paymentType}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Cash to Collect</div>
                  <div className="font-bold text-emerald-400 text-sm mt-0.5">
                    {orderConfirmed.paymentType === 'PAID' ? 'PKR 0' : `PKR ${orderConfirmed.codToCollect.toLocaleString()}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Verification Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-left flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 leading-relaxed">
                <p className="font-bold mb-0.5">Real-Time Verification in Shipper Portal:</p>
                <p>
                  Switch to your other browser window or click below to open the Shipper Portal. This order is now sitting under <strong>Booked Orders</strong> with tracking code <span className="font-mono font-bold">{orderConfirmed.trackingNumber}</span> and status <span className="font-bold">{orderConfirmed.paymentType}</span>.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/orders"
                target="_blank"
                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-400" /> View in Shipper Orders Portal (New Tab)
              </Link>
              <button
                onClick={handleNewOrder}
                className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-4 h-4" /> Book Another Shirt (Different Size)
              </button>
            </div>
          </div>
        ) : (
          /* Product Page & Checkout Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Product Showcase (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              {/* Product Visual Mockup */}
              <div className="relative rounded-2xl bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 p-8 flex flex-col items-center justify-center min-h-[300px] border border-slate-200 overflow-hidden group">
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-black text-slate-800 border border-slate-200 shadow-xs">
                  100% PURE COTTON
                </div>
                <div className="absolute top-3 right-3 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[10px] font-black shadow-xs">
                  SAVE 25%
                </div>

                {/* SVG Shirt Graphic */}
                <div className="relative transform transition-transform group-hover:scale-105 duration-300">
                  <svg className="w-48 h-48 drop-shadow-xl" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M28 20 L38 32 L50 26 L62 32 L72 20 L86 34 L78 50 L72 44 L72 88 L28 88 L28 44 L22 50 L14 34 Z"
                      fill={selectedColor === 'Sky Blue' ? '#38bdf8' : (selectedColor === 'Classic Navy' ? '#1e3a8a' : '#f8fafc')}
                      stroke="#0f172a"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />
                    <path d="M50 26 L50 88" stroke="#0f172a" strokeWidth="1.5" strokeDasharray="3 3" />
                    <circle cx="50" cy="40" r="1.5" fill="#0f172a" />
                    <circle cx="50" cy="52" r="1.5" fill="#0f172a" />
                    <circle cx="50" cy="64" r="1.5" fill="#0f172a" />
                    <circle cx="50" cy="76" r="1.5" fill="#0f172a" />
                    <path d="M38 32 L50 40 L62 32" stroke="#0f172a" strokeWidth="2" fill="none" />
                  </svg>
                  <div className="absolute bottom-2 right-2 bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] font-black">
                    Size: {selectedSize}
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <span className="text-xs font-bold text-slate-500">Color: {selectedColor}</span>
                </div>
              </div>

              {/* Product Info */}
              <div>
                <div className="flex items-center gap-1.5 text-amber-500 text-xs mb-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="font-bold text-slate-700">4.9</span>
                  <span className="text-slate-400 font-medium">(218 verified reviews)</span>
                </div>

                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Classic Oxford Cotton Shirt
                </h1>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tailored fit, breathable premium fabric, wrinkle-resistant finish. Perfect for daily office and smart casual wear.
                </p>

                <div className="flex items-baseline gap-3 mt-4">
                  <span className="text-3xl font-black text-slate-900">
                    PKR {unitPrice.toLocaleString()}
                  </span>
                  <span className="text-sm text-slate-400 line-through font-semibold">
                    PKR 3,299
                  </span>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    In Stock
                  </span>
                </div>
              </div>

              {/* Color Selection */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Shirt Color
                </label>
                <div className="flex items-center gap-3">
                  {COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedColor(c.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border-2 transition-all cursor-pointer ${
                        selectedColor === c.id
                          ? 'border-slate-900 bg-slate-50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${c.bgClass} border border-slate-300`}></span>
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 Different Sizes Selector (Requested by User) */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Shirt Size (4 Options)
                  </label>
                  <span className="text-[11px] font-semibold text-primary">Standard Fit Guide</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SIZES.map((sz) => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => setSelectedSize(sz.id)}
                      className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                        selectedSize === sz.id
                          ? 'border-primary bg-primary/5 text-primary shadow-sm ring-2 ring-primary/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-base font-black">{sz.id}</div>
                      <div className="text-[10px] font-semibold mt-0.5 opacity-80">{sz.name}</div>
                      <div className="text-[9px] text-slate-400 mt-1">{sz.chest}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" />
                  <span>DBARc Express Courier</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Cash on Delivery Verified</span>
                </div>
              </div>
            </div>

            {/* Right Column: Checkout & Order Booking Form (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Order Booking &amp; Checkout
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Order is placed directly into DBARc Courier system via the merchant API
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Order Ref</div>
                  <div className="font-mono text-xs font-bold text-slate-900">{orderReference}</div>
                </div>
              </div>

              <form onSubmit={handlePlaceOrder} className="space-y-6">
                {/* Shipper Account Picker */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Merchant / Shipper Account
                  </label>
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

                {/* Customer Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Delivery Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Full Name</label>
                      <input
                        type="text"
                        required
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Phone Number</label>
                      <input
                        type="text"
                        required
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Delivery Address</label>
                      <input
                        type="text"
                        required
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">City</label>
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

                {/* Payment Mode Selection (COD vs PAID) */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Payment Method (Select to Test Booking Mode)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* COD Option */}
                    <div
                      onClick={() => setPaymentType('COD')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        paymentType === 'COD'
                          ? 'border-amber-500 bg-amber-50/50 shadow-sm ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl mt-0.5 ${paymentType === 'COD' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Banknote className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            Cash on Delivery (COD)
                            {paymentType === 'COD' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            Pay <strong className="text-slate-900">PKR {totalPrice.toLocaleString()}</strong> in cash to the rider at delivery
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PAID Option */}
                    <div
                      onClick={() => setPaymentType('PAID')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        paymentType === 'PAID'
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl mt-0.5 ${paymentType === 'PAID' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            Prepaid (Online Payment)
                            {paymentType === 'PAID' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            Customer paid on store. Rider collects <strong className="text-emerald-700">PKR 0</strong> cash
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Summary & Pricing Box */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                    <span>Executive Oxford Shirt (Size: <strong className="text-slate-900">{selectedSize}</strong>, {selectedColor})</span>
                    <span className="text-slate-900 font-bold">PKR {unitPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                    <span>DBARc Express Shipping</span>
                    <span className="text-emerald-600 font-bold">FREE</span>
                  </div>
                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-bold text-slate-900 uppercase">Total Payable</div>
                      <div className="text-[10px] text-slate-500">
                        {paymentType === 'COD' ? 'Cash collected upon delivery' : 'Zero cash to collect'}
                      </div>
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      PKR {totalPrice.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-white text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                    paymentType === 'COD'
                      ? 'bg-amber-600 hover:bg-amber-700 active:scale-98'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                  }`}
                >
                  {isSubmitting ? (
                    'Booking Order in DBARc System...'
                  ) : (
                    <>
                      Place Order on {paymentType} (Size: {selectedSize}) <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
