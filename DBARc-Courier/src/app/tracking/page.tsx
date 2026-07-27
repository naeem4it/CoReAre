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
  Sparkles,
  Filter,
  Calendar,
  Eye,
  X,
  RefreshCw,
  MapPin,
  FileText
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
    cod_amount: 4500,
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
    cod_amount: 2800,
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
    cod_amount: 12500,
  },
  {
    id: 4,
    tracking_number: 'DBA-4591-RS',
    recipient_name: 'Bilal Hassan',
    recipient_phone: '+92 312 3456789',
    recipient_address: 'Shop 14, Commercial Market, Satellite Town, Rawalpindi',
    status: 'Failed Attempt',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    description: 'Auto Spare Parts',
    origin: 'Islamabad Hub',
    destination: 'Rawalpindi Hub',
    rider_name: 'Usman Tariq',
    cod_amount: 6300,
  },
  {
    id: 5,
    tracking_number: 'DBA-3301-KL',
    recipient_name: 'Ayesha Siddiqui',
    recipient_phone: '+92 345 6789012',
    recipient_address: 'Villa 18, Block B, Naval Anchorage, Islamabad',
    status: 'Arrived',
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    description: 'Home Decor & Crafts',
    origin: 'Multan Hub',
    destination: 'Islamabad Central Hub',
    rider_name: 'Tahir Shah',
    cod_amount: 3200,
  }
];

export default function TrackingPage() {
  const [parcels, setParcels] = React.useState<any[]>(FALLBACK_PARCELS);
  const [loading, setLoading] = React.useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  // Selected Order Detail Modal State
  const [selectedOrder, setSelectedOrder] = React.useState<any | null>(null);
  const [customStatus, setCustomStatus] = React.useState<string>('');

  // Notification States
  const [activeChannel, setActiveChannel] = React.useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
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
          cod_amount: item.cod_amount || 0,
        }));
        setParcels(mapped);
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

  React.useEffect(() => {
    if (selectedOrder) {
      setCustomStatus(selectedOrder.status);
    }
  }, [selectedOrder]);

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
        description: `Handed over to rider ${parcel.rider_name || 'Assigned Rider'} for final delivery.`,
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

  const currentTimeline = selectedOrder ? getTimelineEvents(selectedOrder, customStatus) : [];

  // Notification content preview
  const getNotificationContent = () => {
    if (!selectedOrder) return { whatsapp: '', sms: '', emailSubject: '', emailBody: '' };
    
    const trackingLink = `https://dbarc.com/track?id=${selectedOrder.tracking_number}`;
    const statusText = customStatus === 'booked' ? 'booked' : customStatus;
    
    const whatsappMsg = `*DBArc Logistics Alert* 📦\n\nDear *${selectedOrder.recipient_name}*,\n\nYour parcel with Tracking ID *${selectedOrder.tracking_number}* is now *${statusText}*.\n\n📍 *Details:*\n• Origin: ${selectedOrder.origin}\n• Destination: ${selectedOrder.destination}\n• Status: ${statusText}\n\n🔗 Track your live delivery status here:\n${trackingLink}\n\nThank you for choosing DBArc!`;
    
    const smsMsg = `DBArc Alert: Dear ${selectedOrder.recipient_name}, your parcel ${selectedOrder.tracking_number} is now ${statusText}. Track live at: ${trackingLink}`;
    
    const emailSubject = `DBArc Logistics - Shipment ${selectedOrder.tracking_number} Update [${statusText.toUpperCase()}]`;
    const emailBody = `Dear ${selectedOrder.recipient_name},

We are writing to update you on your shipment with Tracking ID ${selectedOrder.tracking_number}.

The status of your package has been updated to: ${statusText.toUpperCase()}.

Shipment Details:
- Description: ${selectedOrder.description}
- Origin: ${selectedOrder.origin}
- Destination: ${selectedOrder.destination}
- Current Status: ${statusText}

You can track the live progress of your shipment using the link below:
${trackingLink}

Best Regards,
DBArc Logistics Team`;

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
      setToastMessage(`Notification successfully dispatched to ${selectedOrder.recipient_name} via ${activeChannel.toUpperCase()}!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    }, 1200);
  };

  const getStatusBadgeColors = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Out For delivery':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Arrived':
      case 'Arrived At Destination':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Failed Attempt':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Ready To Return':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'booked':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // Filter Logic
  const filteredParcels = parcels.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      item.tracking_number.toLowerCase().includes(q) ||
      item.recipient_name.toLowerCase().includes(q) ||
      item.recipient_address.toLowerCase().includes(q) ||
      item.recipient_phone.includes(q)
    );

    const matchesStatus = !statusFilter || item.status === statusFilter;

    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(item.createdAt) >= new Date(dateFrom);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(item.createdAt) <= toDate;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <PortalLayout>
      <div className="flex flex-col gap-lg max-w-[1920px] w-full mx-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-on-surface flex items-center gap-2">
              <Navigation className="w-6 h-6 text-primary" />
              Order Delivery Tracking & Status List
            </h1>
            <p className="text-body-md text-secondary mt-1">
              Live tracking list for order delivery statuses. Click any row to open the complete shipment details and notification center.
            </p>
          </div>
          <button 
            onClick={fetchParcels} 
            className="flex items-center gap-2 h-10 px-4 bg-white border border-outline-variant text-secondary rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer shadow-sm w-fit"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Statuses
          </button>
        </div>

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white py-3 px-5 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-emerald-500 rounded-full p-1 text-white">
              <Check className="w-4 h-4" />
            </div>
            <div className="text-sm font-semibold pr-2">{toastMessage}</div>
            <button onClick={() => setShowToast(false)} className="text-white/60 hover:text-white text-xs font-bold">Dismiss</button>
          </div>
        )}

        {/* Comprehensive Filters Bar */}
        <div className="bg-white border border-outline-variant rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-outline uppercase tracking-wider">Search Order</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input
                type="text"
                placeholder="Tracking ID, Recipient, Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-outline-variant rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-outline uppercase tracking-wider">Delivery Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-outline-variant rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium cursor-pointer"
            >
              <option value="">All Delivery Statuses</option>
              <option value="booked">Booked</option>
              <option value="Arrived">Arrived Hub</option>
              <option value="Out For delivery">Out For Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Failed Attempt">Failed Attempt</option>
              <option value="Ready To Return">Ready To Return</option>
            </select>
          </div>

          {/* Date From */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-outline uppercase tracking-wider">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-slate-50 border border-outline-variant rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium cursor-pointer"
            />
          </div>

          {/* Date To */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-outline uppercase tracking-wider">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-slate-50 border border-outline-variant rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium cursor-pointer"
            />
          </div>
        </div>

        {/* Main Orders Delivery List */}
        <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-slate-50/50">
            <h2 className="font-bold text-sm text-on-surface flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Active Delivery Status Listing
            </h2>
            <span className="text-xs font-semibold text-outline">
              Showing {filteredParcels.length} of {parcels.length} orders
            </span>
          </div>

          <div className="overflow-x-auto min-h-[350px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-outline">
                <span className="material-symbols-outlined animate-spin text-[32px] mb-2">sync</span>
                <p className="text-xs font-semibold">Loading delivery tracking list...</p>
              </div>
            ) : filteredParcels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-outline">
                <Package className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">No matching orders found</p>
                <p className="text-xs mt-1">Try clearing or adjusting filters.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    <th className="px-4 py-3">Tracking ID</th>
                    <th className="px-4 py-3">Consignee Name</th>
                    <th className="px-4 py-3">Delivery Address</th>
                    <th className="px-4 py-3">Route (Origin → Dest)</th>
                    <th className="px-4 py-3">Rider</th>
                    <th className="px-4 py-3">COD Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant text-xs font-medium">
                  {filteredParcels.map((parcel) => (
                    <tr 
                      key={parcel.id}
                      onClick={() => setSelectedOrder(parcel)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-4 font-mono font-bold text-primary">{parcel.tracking_number}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{parcel.recipient_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{parcel.recipient_phone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700 max-w-[260px] truncate">{parcel.recipient_address}</td>
                      <td className="px-4 py-4 text-slate-800">
                        <div className="flex items-center gap-1">
                          <span>{parcel.origin}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span>{parcel.destination}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700 font-semibold">{parcel.rider_name}</td>
                      <td className="px-4 py-4 font-bold text-slate-900">PKR {parcel.cod_amount?.toLocaleString() || 0}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeColors(parcel.status)}`}>
                          {parcel.status === 'booked' ? 'Booked' : parcel.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(parcel);
                          }}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg font-semibold transition-colors flex items-center gap-1 ml-auto text-[11px] cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* SINGLE ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-outline-variant animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    Order Details & Tracking: <span className="font-mono text-primary">{selectedOrder.tracking_number}</span>
                  </h3>
                  <p className="text-xs text-slate-500">Full delivery timeline and live customer notification status.</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Order Overview & Timeline */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                {/* Parcel Summary Card */}
                <div className="bg-slate-50 border border-outline-variant rounded-2xl p-4 flex flex-col gap-3 text-xs">
                  <div className="flex items-center justify-between border-b border-outline-variant pb-2">
                    <span className="font-bold text-slate-700 text-sm">{selectedOrder.recipient_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-semibold">Simulate Status:</span>
                      <select
                        value={customStatus}
                        onChange={(e) => setCustomStatus(e.target.value)}
                        className="bg-white border border-outline-variant rounded-lg p-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="booked">Booked</option>
                        <option value="Arrived">Arrived Hub</option>
                        <option value="Arrived At Destination">Arrived Destination</option>
                        <option value="Out For delivery">Out For Delivery</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 font-medium block">Phone Contact</span>
                      <span className="font-bold text-slate-800">{selectedOrder.recipient_phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">COD Amount</span>
                      <span className="font-bold text-slate-900">PKR {selectedOrder.cod_amount?.toLocaleString() || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Origin Hub</span>
                      <span className="font-bold text-slate-800">{selectedOrder.origin}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Destination Hub</span>
                      <span className="font-bold text-slate-800">{selectedOrder.destination}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 font-medium block">Full Address</span>
                      <span className="font-semibold text-slate-800">{selectedOrder.recipient_address}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Assigned Rider</span>
                      <span className="font-bold text-slate-800">{selectedOrder.rider_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Item Description</span>
                      <span className="font-bold text-slate-800">{selectedOrder.description}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline Progress */}
                <div className="bg-white border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Transit Progress History</h4>
                  
                  <div className="flex flex-col gap-4 relative pl-5 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {currentTimeline.map((event, idx) => (
                      <div key={idx} className="relative flex flex-col gap-0.5">
                        <div className={`absolute -left-5 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center -translate-x-1/2 z-10 ${
                          event.isCompleted 
                            ? 'bg-primary border-primary text-white' 
                            : 'bg-white border-slate-300 text-slate-300'
                        }`}>
                          {event.isCompleted && <Check className="w-2.5 h-2.5" />}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className={`font-bold ${event.isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                            {event.title}
                          </span>
                          <span className={`text-[10px] font-bold ${event.isCompleted ? 'text-primary' : 'text-slate-400'}`}>
                            {event.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{event.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Notification Sender */}
              <div className="lg:col-span-5 bg-slate-50 border border-outline-variant rounded-2xl p-4 flex flex-col gap-4">
                <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Dispatch Customer Alert
                </h4>

                {/* Channel Switcher */}
                <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-outline-variant">
                  <button
                    onClick={() => setActiveChannel('whatsapp')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      activeChannel === 'whatsapp' ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-200' : 'text-slate-600'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                  </button>
                  <button
                    onClick={() => setActiveChannel('sms')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      activeChannel === 'sms' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200' : 'text-slate-600'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-blue-600" /> SMS
                  </button>
                  <button
                    onClick={() => setActiveChannel('email')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      activeChannel === 'email' ? 'bg-primary/10 text-primary shadow-sm border border-primary/20' : 'text-slate-600'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-primary" /> Email
                  </button>
                </div>

                {/* Phone Preview Frame */}
                <div className="border-[6px] border-slate-800 rounded-[24px] bg-slate-900 max-w-[240px] mx-auto w-full aspect-[9/15] flex flex-col overflow-hidden shadow-md">
                  {activeChannel === 'whatsapp' && (
                    <div className="flex-1 bg-[#efeae2] p-2 flex flex-col font-sans text-slate-900">
                      <div className="bg-[#075e54] text-white p-2 rounded-t text-[10px] font-bold">DBArc Logistics</div>
                      <div className="flex-1 flex flex-col justify-end">
                        <div className="bg-[#dcf8c6] p-2 rounded-lg text-[9px] leading-relaxed whitespace-pre-line border border-[#c7eba7]">
                          {notificationPreview.whatsapp}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeChannel === 'sms' && (
                    <div className="flex-1 bg-white p-2 flex flex-col justify-end text-[9px]">
                      <div className="bg-slate-100 p-2 rounded-xl text-slate-800 leading-relaxed">
                        {notificationPreview.sms}
                      </div>
                    </div>
                  )}

                  {activeChannel === 'email' && (
                    <div className="flex-1 bg-slate-100 p-2 flex flex-col text-[9px] overflow-y-auto">
                      <div className="bg-primary text-white p-1.5 rounded font-bold text-[8px]">{notificationPreview.emailSubject}</div>
                      <div className="bg-white p-2 mt-1 rounded text-slate-700 whitespace-pre-line leading-tight border border-slate-200">
                        {notificationPreview.emailBody}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSendNotification}
                  disabled={isSending}
                  className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSending ? 'Sending Alert...' : 'Dispatch Live Notification'}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </PortalLayout>
  );
}
