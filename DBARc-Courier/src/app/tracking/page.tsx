'use client';

import * as React from 'react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/shared/api/api-client';
import { 
  Search, 
  Mail, 
  Send, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Package, 
  Phone,
  MessageSquare,
  AlertCircle,
  Smartphone,
  Navigation,
  User,
  ArrowRight,
  ShieldCheck,
  Check,
  Sparkles
} from 'lucide-react';

interface TrackingEvent {
  title: string;
  description: string;
  time: string;
  status: string;
  isCompleted: boolean;
}

const FALLBACK_PARCELS = [
  {
    id: 1,
    tracking_number: 'DBA-9823-XK',
    recipient_name: 'Zeeshan Ahmed',
    recipient_phone: '+92 300 1234567',
    recipient_address: 'Flat 402, Al-Rehman Heights, Gulshan-e-Iqbal, Karachi',
    status: 'Out For delivery',
    createdAt: new Date().toISOString(),
    description: 'Electronics & Accessories',
    origin: 'Lahore Hub',
    destination: 'Karachi Central Hub',
    rider_name: 'Muhammad Asif',
  },
  {
    id: 2,
    tracking_number: 'DBA-1104-ZA',
    recipient_name: 'Mariam Khan',
    recipient_phone: '+92 321 9876543',
    recipient_address: 'House 42, Street 5, DHA Phase 6, Karachi',
    status: 'Delivered',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    description: 'Apparel & Textiles',
    origin: 'Faisalabad Hub',
    destination: 'Karachi South Hub',
    rider_name: 'Sajid Ali',
  },
  {
    id: 3,
    tracking_number: 'DBA-8742-MM',
    recipient_name: 'Dr. Faisal Qureshi',
    recipient_phone: '+92 333 4567890',
    recipient_address: 'Aga Khan University Hospital, Stadium Road, Karachi',
    status: 'booked',
    createdAt: new Date().toISOString(),
    description: 'Medical Supplies',
    origin: 'Karachi Central Hub',
    destination: 'Karachi East Hub',
    rider_name: 'Unassigned',
  }
];

export default function TrackingPage() {
  const [parcels, setParcels] = React.useState<any[]>(FALLBACK_PARCELS);
  const [activeParcel, setActiveParcel] = React.useState<any>(FALLBACK_PARCELS[0]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  
  // Notification States
  const [activeChannel, setActiveChannel] = React.useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  const [customStatus, setCustomStatus] = React.useState<string>('');
  const [isSending, setIsSending] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');

  const fetchParcels = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/parcels?populate=*');
      const data = response.data?.data || [];
      if (data.length > 0) {
        const mapped = data.map((item: any) => ({
          id: item.id,
          tracking_number: item.tracking_number,
          recipient_name: item.recipient_name || 'Unknown',
          recipient_phone: item.recipient_phone || '+92 300 0000000',
          recipient_address: item.recipient_address || 'No address provided',
          status: item.status || 'booked',
          createdAt: item.createdAt,
          description: item.description || 'General Cargo',
          origin: item.origin_hub?.name || 'Origin Hub',
          destination: item.destination_hub?.name || 'Destination Hub',
          rider_name: item.rider?.user?.fullName || item.rider?.user?.username || 'Unassigned',
        }));
        setParcels(mapped);
        setActiveParcel(mapped[0]);
      }
    } catch (error) {
      console.warn('Could not fetch parcels, using fallbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchParcels();
  }, []);

  // Update active parcel status simulator
  React.useEffect(() => {
    if (activeParcel) {
      setCustomStatus(activeParcel.status);
    }
  }, [activeParcel]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const found = parcels.find(
      p => p.tracking_number.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
           p.recipient_name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
    if (found) {
      setActiveParcel(found);
    } else {
      alert(`No parcel found matching "${searchQuery}"`);
    }
  };

  // Timeline events based on current status
  const getTimelineEvents = (parcel: any, simStatus: string): TrackingEvent[] => {
    const timeBooked = new Date(parcel.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateBooked = new Date(parcel.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });

    const statuses = ['booked', 'Arrived', 'Arrived At Destination', 'Out For delivery', 'Delivered'];
    const currentIdx = statuses.indexOf(simStatus);

    return [
      {
        title: 'Shipment Booked',
        description: `Shipment registered at ${parcel.origin} by shipper.`,
        time: `${dateBooked}, ${timeBooked}`,
        status: 'booked',
        isCompleted: currentIdx >= 0,
      },
      {
        title: 'Arrived at Sorting Facility',
        description: `Scanned and processed at ${parcel.origin}.`,
        time: currentIdx >= 1 ? `${dateBooked}, 04:30 PM` : 'Pending',
        status: 'Arrived',
        isCompleted: currentIdx >= 1,
      },
      {
        title: 'In Transit to Destination Hub',
        description: `Dispatched towards ${parcel.destination}.`,
        time: currentIdx >= 2 ? `${dateBooked}, 09:15 PM` : 'Pending',
        status: 'Arrived At Destination',
        isCompleted: currentIdx >= 2,
      },
      {
        title: 'Out For Delivery',
        description: `Handed over to rider ${parcel.rider_name || 'Muhammad Asif'} for final delivery.`,
        time: currentIdx >= 3 ? 'Today, 09:30 AM' : 'Pending',
        status: 'Out For delivery',
        isCompleted: currentIdx >= 3,
      },
      {
        title: 'Delivered',
        description: `Successfully delivered to ${parcel.recipient_name}.`,
        time: currentIdx >= 4 ? 'Today, 02:45 PM' : 'Pending',
        status: 'Delivered',
        isCompleted: currentIdx >= 4,
      },
    ];
  };

  const currentTimeline = activeParcel ? getTimelineEvents(activeParcel, customStatus) : [];

  // Generate notification message preview
  const getNotificationContent = () => {
    if (!activeParcel) return { whatsapp: '', sms: '', emailSubject: '', emailBody: '' };
    
    const trackingLink = `https://dbarc.com/track?id=${activeParcel.tracking_number}`;
    const statusText = customStatus === 'booked' ? 'booked' : customStatus;
    
    const whatsappMsg = `*DBArc Logistics Alert* 📦\n\nDear *${activeParcel.recipient_name}*,\n\nYour parcel with Tracking ID *${activeParcel.tracking_number}* is now *${statusText}*.\n\n📍 *Details:*\n• Origin: ${activeParcel.origin}\n• Destination: ${activeParcel.destination}\n• Status: ${statusText}\n\n🔗 Track your live delivery status here:\n${trackingLink}\n\nThank you for choosing DBArc!`;
    
    const smsMsg = `DBArc Alert: Dear ${activeParcel.recipient_name}, your parcel ${activeParcel.tracking_number} is now ${statusText}. Track live at: ${trackingLink}`;
    
    const emailSubject = `DBArc Logistics - Shipment ${activeParcel.tracking_number} Update [${statusText.toUpperCase()}]`;
    const emailBody = `
Dear ${activeParcel.recipient_name},

We are writing to update you on your shipment with Tracking ID ${activeParcel.tracking_number}.

The status of your package has been updated to: ${statusText.toUpperCase()}.

Shipment Details:
- Description: ${activeParcel.description}
- Origin: ${activeParcel.origin}
- Destination: ${activeParcel.destination}
- Current Status: ${statusText}

You can track the live progress of your shipment using the link below:
${trackingLink}

Best Regards,
DBArc Logistics Team
    `;

    return {
      whatsapp: whatsappMsg,
      sms: smsMsg,
      emailSubject,
      emailBody
    };
  };

  const notificationPreview = getNotificationContent();

  const handleSendNotification = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setToastMessage(`Notification successfully dispatched to ${activeParcel.recipient_name} via ${activeChannel.toUpperCase()}!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    }, 1200);
  };

  const getStatusLabelColors = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Out For delivery':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'booked':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <PortalLayout>
      <div className="flex flex-col gap-lg max-w-[1200px] mx-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-on-surface flex items-center gap-2">
              <Navigation className="w-6 h-6 text-primary" />
              Real-Time Tracking & Alerts
            </h1>
            <p className="text-body-md text-secondary mt-1">
              Track packages, configure milestones, and dispatch notifications via WhatsApp, SMS, and Email.
            </p>
          </div>
          
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
              <input
                type="text"
                placeholder="Search Tracking ID or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-outline-variant rounded-xl py-2.5 pl-10 pr-4 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm transition-all"
              />
            </div>
            <button 
              type="submit"
              className="bg-primary text-white h-11 px-4 rounded-xl hover:shadow-lg active:scale-95 transition-all font-semibold text-sm flex items-center gap-1.5 cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {/* Success Toast */}
        {showToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white py-3 px-5 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-emerald-500 rounded-full p-1 text-white">
              <Check className="w-4 h-4" />
            </div>
            <div className="text-sm font-semibold pr-2">{toastMessage}</div>
            <button onClick={() => setShowToast(false)} className="text-white/60 hover:text-white text-xs font-bold">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
          
          {/* Column 1: Active Shipments Quick List */}
          <div className="lg:col-span-4 bg-white border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col gap-4">
            <h2 className="font-semibold text-label-lg text-on-surface flex items-center gap-1.5">
              <Package className="w-5 h-5 text-secondary" />
              Select Shipment
            </h2>
            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-8 text-center text-outline">
                  <span className="material-symbols-outlined animate-spin text-[32px]">sync</span>
                  <p className="text-xs mt-2">Loading active shipments...</p>
                </div>
              ) : parcels.length === 0 ? (
                <p className="text-sm text-outline text-center py-6">No parcels found.</p>
              ) : (
                parcels.map((parcel) => (
                  <button
                    key={parcel.id}
                    onClick={() => setActiveParcel(parcel)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      activeParcel?.id === parcel.id
                        ? 'border-primary bg-primary-container/20 shadow-sm'
                        : 'border-outline-variant hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-primary">{parcel.tracking_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusLabelColors(parcel.status)}`}>
                        {parcel.status === 'booked' ? 'Booked' : parcel.status}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-on-surface">{parcel.recipient_name}</span>
                      <span className="text-xs text-secondary truncate">{parcel.recipient_address}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Details & Timeline Tracker */}
          <div className="lg:col-span-4 flex flex-col gap-lg">
            
            {/* Shipment Detail Overview */}
            {activeParcel && (
              <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-on-surface">{activeParcel.recipient_name}</h3>
                    <p className="text-xs font-semibold text-outline font-mono mt-0.5">{activeParcel.tracking_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-outline font-semibold">Status Sim:</span>
                    <select
                      value={customStatus}
                      onChange={(e) => setCustomStatus(e.target.value)}
                      className="bg-slate-50 border border-outline-variant rounded-lg p-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="booked">Booked</option>
                      <option value="Arrived">Arrived Hub</option>
                      <option value="Arrived At Destination">Arrived Destination</option>
                      <option value="Out For delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </div>
                </div>

                <hr className="border-outline-variant" />

                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                  <div>
                    <span className="text-outline block font-medium">Origin</span>
                    <span className="font-semibold text-on-surface">{activeParcel.origin}</span>
                  </div>
                  <div>
                    <span className="text-outline block font-medium">Destination</span>
                    <span className="font-semibold text-on-surface">{activeParcel.destination}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-outline block font-medium">Delivery Address</span>
                    <span className="font-semibold text-on-surface line-clamp-2">{activeParcel.recipient_address}</span>
                  </div>
                  <div>
                    <span className="text-outline block font-medium">Contact Phone</span>
                    <span className="font-semibold text-on-surface flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-secondary" /> {activeParcel.recipient_phone}
                    </span>
                  </div>
                  <div>
                    <span className="text-outline block font-medium">Assigned Rider</span>
                    <span className="font-semibold text-on-surface">{activeParcel.rider_name || 'Unassigned'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step Progress Timeline */}
            <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">Transit History</h3>
              
              <div className="flex flex-col gap-4 relative pl-5 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {currentTimeline.map((event, idx) => (
                  <div key={idx} className="relative flex flex-col gap-0.5">
                    {/* Visual Dot indicator */}
                    <div className={`absolute -left-5 top-1.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center -translate-x-1/2 z-10 ${
                      event.isCompleted 
                        ? 'bg-primary border-primary text-white' 
                        : 'bg-white border-slate-300 text-slate-300'
                    }`}>
                      {event.isCompleted && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`font-semibold text-sm ${event.isCompleted ? 'text-on-surface font-bold' : 'text-outline'}`}>
                        {event.title}
                      </span>
                      <span className={`text-[10px] font-semibold ${event.isCompleted ? 'text-primary' : 'text-outline'}`}>
                        {event.time}
                      </span>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">{event.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 3: Live Notifications Simulator (WhatsApp, SMS, Email) */}
          <div className="lg:col-span-4 bg-white border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <h2 className="font-semibold text-label-lg text-on-surface flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Notifications & Alerts
            </h2>
            
            {/* Channel Switcher */}
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveChannel('whatsapp')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeChannel === 'whatsapp'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-secondary hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                WhatsApp
              </button>
              <button
                onClick={() => setActiveChannel('sms')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeChannel === 'sms'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-secondary hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                SMS
              </button>
              <button
                onClick={() => setActiveChannel('email')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeChannel === 'email'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-secondary hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-primary" />
                Email
              </button>
            </div>

            {/* SmartPhone / Mockup Frame */}
            <div className="border-[8px] border-slate-800 rounded-[32px] overflow-hidden bg-slate-900 aspect-[9/16] max-w-[280px] mx-auto w-full shadow-lg relative flex flex-col">
              
              {/* Dynamic Mockup Body */}
              {activeChannel === 'whatsapp' && (
                <div className="flex-1 bg-[#efeae2] flex flex-col h-full font-sans text-slate-800">
                  {/* WhatsApp Header */}
                  <div className="bg-[#075e54] text-white p-3 pt-4 flex items-center gap-2 shadow">
                    <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs">
                      DB
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold">DBArc Logistics</h4>
                      <p className="text-[8px] text-emerald-100">Online</p>
                    </div>
                  </div>
                  {/* Message Bubble Container */}
                  <div className="flex-1 p-3 flex flex-col justify-end">
                    <div className="bg-[#dcf8c6] rounded-xl rounded-tr-none p-2.5 shadow-sm text-[10px] leading-relaxed max-w-[90%] self-end relative border-t border-r border-[#c7eba7]">
                      <div className="whitespace-pre-line font-medium text-slate-900">{notificationPreview.whatsapp}</div>
                      <span className="text-[8px] text-slate-500 float-right mt-1 font-mono">1:10 PM ✓✓</span>
                    </div>
                  </div>
                </div>
              )}

              {activeChannel === 'sms' && (
                <div className="flex-1 bg-white flex flex-col h-full font-sans text-slate-800">
                  {/* SMS Header */}
                  <div className="border-b border-slate-100 p-3 pt-4 text-center">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs mx-auto text-slate-600">
                      DB
                    </div>
                    <span className="text-[8px] font-bold text-slate-500 block mt-1">DBArc Alert</span>
                  </div>
                  {/* Message Bubble Container */}
                  <div className="flex-1 p-3 flex flex-col justify-end">
                    <div className="bg-[#e9e9eb] rounded-2xl rounded-bl-none p-3 text-[10px] leading-relaxed max-w-[85%] self-start text-slate-900 font-medium">
                      {notificationPreview.sms}
                    </div>
                    <span className="text-[8px] text-slate-400 mt-1 pl-1 font-mono">iMessage • Today 1:10 PM</span>
                  </div>
                </div>
              )}

              {activeChannel === 'email' && (
                <div className="flex-1 bg-slate-50 flex flex-col h-full font-sans text-slate-800 overflow-y-auto">
                  {/* Email Header */}
                  <div className="bg-primary text-white p-3 pt-4 flex flex-col gap-0.5">
                    <span className="text-[8px] font-semibold opacity-85">Subject:</span>
                    <h4 className="text-[9px] font-bold line-clamp-1">{notificationPreview.emailSubject}</h4>
                  </div>
                  {/* Email Body Card */}
                  <div className="p-3">
                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm text-[9px] leading-relaxed flex flex-col gap-2">
                      <div className="w-12 h-4 bg-slate-100 rounded flex items-center justify-center font-bold text-[8px] text-primary">
                        DBArc
                      </div>
                      <div className="whitespace-pre-line font-medium text-slate-700">{notificationPreview.emailBody}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Trigger Button */}
            <button
              onClick={handleSendNotification}
              disabled={isSending || !activeParcel}
              className="w-full bg-primary text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'Sending Alerts...' : 'Dispatch Live Notification'}
            </button>
          </div>

        </div>
      </div>
    </PortalLayout>
  );
}
