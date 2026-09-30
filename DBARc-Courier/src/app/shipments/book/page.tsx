'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Save, 
  User, 
  Package, 
  Truck, 
  History, 
  Calculator, 
  Info, 
  Loader2, 
  CheckCircle,
  ChevronRight,
  ArrowLeft,
  FileSpreadsheet,
  UploadCloud,
  FileDown,
  FileUp,
  Trash2,
  Check,
  AlertCircle,
  Eye,
  X,
  RefreshCw,
  Search,
  Edit,
  Trash,
  Printer, 
  Barcode as BarcodeIcon, 
  Layers, 
  Upload, 
  Plus, 
  HelpCircle,
  Navigation,
  MapPin,
  Building2,
  Lock,
  Edit3,
  CheckCircle2
} from 'lucide-react';

import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/components/AuthProvider';
import { apiClient } from '@/shared/api/api-client';
import { TextBox } from '@/components/ui/form/text-box';
import { TextAreaInput } from '@/components/ui/form/text-area';
import { SearchableDropdown } from '@/components/ui/form/searchable-dropdown';
import { PakistanLocationSelect } from '@/components/ui/PakistanLocationSelect';
import { findPakistanLocation, FLAT_PAKISTAN_LOCATIONS } from '@/shared/data/pakistan-locations';
import { evaluateLogisticsRouting, TPLPartnerModel } from '@/shared/data/pakistan-3pl-city-mappings';
import { generateTrackingId, parseCsvLine, cleanCodAmount, cleanWeight } from '@/shared/utils/tracking';

const PAKISTAN_CITY_COORDINATES = [
  { name: 'Lahore', lat: 31.5497, lng: 74.3436 },
  { name: 'Karachi', lat: 24.8607, lng: 67.0011 },
  { name: 'Islamabad', lat: 33.6844, lng: 73.0479 },
  { name: 'Rawalpindi', lat: 33.5651, lng: 73.0169 },
  { name: 'Faisalabad', lat: 31.4504, lng: 73.1350 },
  { name: 'Multan', lat: 30.1575, lng: 71.5249 },
  { name: 'Peshawar', lat: 34.0151, lng: 71.5249 },
  { name: 'Quetta', lat: 30.1798, lng: 66.9750 },
  { name: 'Sialkot', lat: 32.4945, lng: 74.5229 },
  { name: 'Gujranwala', lat: 32.1877, lng: 74.1945 },
  { name: 'Hyderabad', lat: 25.3960, lng: 68.3578 },
  { name: 'Sukkur', lat: 27.7052, lng: 68.8574 },
  { name: 'Bahawalpur', lat: 29.3544, lng: 71.6911 },
  { name: 'Sargodha', lat: 32.0836, lng: 72.6711 },
  { name: 'Abbottabad', lat: 34.1688, lng: 73.2215 },
  { name: 'Mardan', lat: 34.1989, lng: 72.0404 },
  { name: 'Muzaffarabad', lat: 34.3597, lng: 73.4711 },
  { name: 'Gilgit', lat: 35.9221, lng: 74.3087 },
  { name: 'Mirpur', lat: 33.1484, lng: 73.7519 },
  { name: 'Gwadar', lat: 25.1216, lng: 62.3254 },
];

// Form validation schema using Zod for manual entry
const preprocessNumberWithDefault = (val: unknown, fallback = 0) => {
  if (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
    return fallback;
  }
  const n = Number(val);
  return isNaN(n) ? fallback : n;
};

const bookingSchema = z.object({
  consigneeName: z.string().min(2, 'Full name must be at least 2 characters'),
  consigneePhone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number (e.g. +923001234567)'),
  consigneeEmail: z.string().email('Invalid email address').or(z.literal('')),
  consigneeAltPhone: z.string().optional(),
  
  sourceCity: z.union([z.number(), z.string()]).optional(),
  sourceCityName: z.string().optional(),
  deliveryAddress: z.string().min(5, 'Delivery address is too short'),
  destinationCity: z.union([z.number(), z.string()]).refine(val => val !== '', 'Please select a destination city'),
  destinationCityName: z.string().optional(),
  area: z.string().optional(),
  
  weight: z.preprocess(
    (val) => preprocessNumberWithDefault(val, 0.5),
    z.number().min(0.01, 'Weight must be at least 0.01 kg')
  ),
  pieces: z.preprocess(
    (val) => preprocessNumberWithDefault(val, 1),
    z.number().min(1, 'Must be at least 1 piece')
  ),
  paymentType: z.enum(['COD', 'PAID']).default('COD'),
  codAmount: z.preprocess(
    (val) => preprocessNumberWithDefault(val, 0),
    z.number().min(0, 'COD amount cannot be negative')
  ),
  productDescription: z.string().min(2, 'Product description is required'),
  serviceType: z.string().default('Overnight'),
  allowToOpen: z.string().default('No'),
  comments: z.string().optional(),
  
  pickupDate: z.string().optional().or(z.literal('')),
  pickupTimeSlot: z.string().optional().default('Morning (09 AM - 12 PM)'),
  pickupLocation: z.union([z.number(), z.string()]).optional(),
  specialInstructions: z.string().optional().or(z.literal('')),

  // Replacement Fields (All Optional)
  referenceNo: z.string().optional().or(z.literal('')),
  collectReplacement: z.string().optional().default('No'),
  parcelDetail: z.string().optional().or(z.literal('')),
  collectRs: z.preprocess(
    (val) => preprocessNumberWithDefault(val, 0),
    z.number().min(0, 'Collect Rs must be positive').optional()
  ),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface UploadHistoryItem {
  id: string;
  fileName: string;
  date: string;
  count: number;
  status: 'processed' | 'processing' | 'failed';
  error?: string;
}

interface BulkOrderItem {
  itemId: string;
  itemName: string;
  codAmount: number;
}

interface GroupedBulkOrder {
  orderId: string;
  consigneeName: string;
  consigneePhone: string;
  consigneeAddress: string;
  shipperName: string;
  shipperAddress: string;
  shippingType: 'In-House' | '3PL';
  primaryBarcode: string;
  secondary3PLBarcode?: string | undefined;
  items: BulkOrderItem[];
  totalCod: number;
  createdAt: string;
}

// Validator for uploader spreadsheet rows
const validateSpreadsheetRow = (row: any) => {
  const rowErrors: Record<string, string> = {};
  if (!row.consigneeName || row.consigneeName.trim().length < 2) {
    rowErrors.consigneeName = 'Name too short';
  }
  if (!row.consigneePhone || !/^\+?[0-9]{10,15}$/.test(row.consigneePhone.trim())) {
    rowErrors.consigneePhone = 'Invalid phone number format';
  }
  if (!row.deliveryAddress || row.deliveryAddress.trim().length < 5) {
    rowErrors.deliveryAddress = 'Address too short';
  }
  if (!row.destinationCity || row.destinationCity.trim().length === 0) {
    rowErrors.destinationCity = 'City required';
  }
  if (row.weight === undefined || isNaN(row.weight) || row.weight <= 0) {
    rowErrors.weight = 'Weight must be > 0';
  }
  if (row.codAmount === undefined || isNaN(row.codAmount) || row.codAmount < 0) {
    rowErrors.codAmount = 'COD amount cannot be negative';
  }
  return rowErrors;
};

const SERVICE_OPTIONS = [
  { label: 'Overnight', value: 'Overnight' },
  { label: 'Detained', value: 'Detained' },
  { label: 'Second Day', value: 'Second Day' },
];

const YES_NO_OPTIONS = [
  { label: 'No', value: 'No' },
  { label: 'Yes', value: 'Yes' },
];

// Dynamic delivery / service charge calculator for Pakistan logistics
export function calculateDeliveryCharge(
  originCity: string,
  destinationCity: string,
  weight: number,
  plan?: any
): number {
  const oCity = (originCity || 'Lahore').toLowerCase().trim();
  const dCity = (destinationCity || 'Lahore').toLowerCase().trim();
  const numWeight = Math.max(0.1, Number(weight) || 0.5);

  const isWithinCity = oCity && dCity && (oCity === dCity || oCity.includes(dCity) || dCity.includes(oCity));
  const isMajorMetro = dCity.includes('karachi') || dCity.includes('lahore') || dCity.includes('islamabad') || dCity.includes('rawalpindi');

  // Realistic Pakistan courier standard rates: Base first 1 kg + Additional kg
  let baseRate = isWithinCity ? 150 : (isMajorMetro ? 180 : 220);
  let addKgRate = isWithinCity ? 35 : (isMajorMetro ? 45 : 55);

  // If active plan has zones configured, check for custom rates
  if (plan?.zones && Array.isArray(plan.zones)) {
    const targetZoneName = isWithinCity ? 'Within City' : (isMajorMetro ? 'Zone A' : 'Zone B');
    const matchedZone = plan.zones.find((z: any) => z.zoneName?.toLowerCase() === targetZoneName.toLowerCase());
    if (matchedZone?.tierRates) {
      if (numWeight <= 0.5 && matchedZone.tierRates.tier_half_kg) {
        baseRate = Number(matchedZone.tierRates.tier_half_kg);
      } else if (matchedZone.tierRates.tier_one_kg) {
        baseRate = Number(matchedZone.tierRates.tier_one_kg);
      }
      if (matchedZone.tierRates.tier_add_kg) {
        const rawAdd = Number(matchedZone.tierRates.tier_add_kg);
        // Protect against inflated tier_add_kg
        addKgRate = rawAdd <= 80 ? rawAdd : (isWithinCity ? 35 : (isMajorMetro ? 45 : 55));
      }
    }
  }

  let charge = baseRate;
  if (numWeight > 1.0) {
    const extraKg = Math.ceil(numWeight - 1.0);
    charge = baseRate + (extraKg * addKgRate);
  }

  return Math.round(charge);
}

// Robust helper to extract destination city from various Strapi relation shapes, strings, or addresses
const extractDestinationCity = (parcelOrAttrs: any): string => {
  if (!parcelOrAttrs) return '';
  const attrs = parcelOrAttrs.attributes || parcelOrAttrs;

  // 1. Relational object with CityName / city_name / name / tehsil (Strapi v4/v5)
  const dObj = attrs.destination_city?.data?.attributes || attrs.destination_city?.attributes || attrs.destination_city;
  if (dObj && typeof dObj === 'object') {
    const name = dObj.CityName || dObj.city_name || dObj.cityName || dObj.name || dObj.tehsil || dObj.title;
    if (name && typeof name === 'string' && name.trim() && isNaN(Number(name))) {
      return name.trim();
    }
  }

  // 2. Direct string fields
  if (typeof attrs.destination_city === 'string' && attrs.destination_city.trim() && isNaN(Number(attrs.destination_city))) {
    return attrs.destination_city.trim();
  }
  if (attrs.destination_city_name && typeof attrs.destination_city_name === 'string' && attrs.destination_city_name.trim()) {
    return attrs.destination_city_name.trim();
  }
  if (attrs.destinationCity && typeof attrs.destinationCity === 'string' && attrs.destinationCity.trim()) {
    return attrs.destinationCity.trim();
  }
  if (attrs.destination && typeof attrs.destination === 'string' && attrs.destination.trim() && attrs.destination.trim().toLowerCase() !== 'dest') {
    return attrs.destination.trim();
  }

  // 3. Fallback: Parse from recipient_address (e.g. "Street 4, Sector G-9, Islamabad")
  const addr = attrs.recipient_address || attrs.consigneeAddress || attrs.delivery_address || attrs.address || '';
  if (addr && typeof addr === 'string') {
    const parts = addr.split(',').map((s: string) => s.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (!part || part.toLowerCase() === 'pakistan' || part.toLowerCase() === 'pk') continue;
      const matched = findPakistanLocation(part);
      if (matched) return matched.tehsil;
      if (!/\d/.test(part) && part.length >= 3 && part.length <= 25) {
        return part;
      }
    }
  }

  return '';
};

const extractSourceCity = (parcelOrAttrs: any): string => {
  if (!parcelOrAttrs) return '';
  const attrs = parcelOrAttrs.attributes || parcelOrAttrs;

  const sObj = attrs.source_city?.data?.attributes || attrs.source_city?.attributes || attrs.source_city;
  if (sObj && typeof sObj === 'object') {
    const name = sObj.CityName || sObj.city_name || sObj.cityName || sObj.name || sObj.tehsil || sObj.title;
    if (name && typeof name === 'string' && name.trim() && isNaN(Number(name))) {
      return name.trim();
    }
  }

  if (typeof attrs.source_city === 'string' && attrs.source_city.trim() && isNaN(Number(attrs.source_city))) {
    return attrs.source_city.trim();
  }
  if (attrs.source_city_name && typeof attrs.source_city_name === 'string' && attrs.source_city_name.trim()) {
    return attrs.source_city_name.trim();
  }
  if (attrs.sourceCity && typeof attrs.sourceCity === 'string' && attrs.sourceCity.trim()) {
    return attrs.sourceCity.trim();
  }

  return '';
};

function BookShipmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser, activeBusinessId: authActiveBizId, isShipper } = useAuth();
  
  // Selected shipper ID when Courier staff books order on behalf of a shipper
  const [selectedCourierShipperId, setSelectedCourierShipperId] = React.useState<number | null>(null);

  // User auth state read directly from authContext or localStorage fallback
  const [user, setUser] = React.useState<any>(null);
  React.useEffect(() => {
    if (authUser) {
      setUser(authUser);
    } else if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to parse user from localStorage:', e);
      }
    }
  }, [authUser]);

  // Load all tenant shippers to guarantee full business address and city data
  const [allShippers, setAllShippers] = React.useState<Array<{
    id: number;
    name: string;
    account_id?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    shipper_plan?: any;
    preferred_tpl_partner?: any;
    pickup_locations?: any[];
  }>>([]);

  React.useEffect(() => {
    apiClient.get('/shippers/with-plans')
      .catch(() => apiClient.get('/shippers?populate=*'))
      .then(res => {
        const raw = res.data?.data || [];
        const mapped = raw.map((item: any) => {
          const attrs = item.attributes || item;
          return {
            id: item.id,
            name: attrs.name || `Shipper #${item.id}`,
            account_id: attrs.account_id || item.account_id || String(28000 + item.id),
            address: attrs.address || (attrs.offices && attrs.offices[0]?.address) || '',
            city: attrs.city || (attrs.offices && attrs.offices[0]?.city?.name) || (typeof attrs.offices?.[0]?.city === 'string' ? attrs.offices[0].city : '') || '',
            phone: attrs.phone || item.phone || '',
            email: attrs.email || item.email || '',
            shipper_plan: attrs.shipper_plan?.data ? { id: attrs.shipper_plan.data.id, ...attrs.shipper_plan.data.attributes } : (attrs.shipper_plan || item.shipper_plan),
            preferred_tpl_partner: attrs.preferred_tpl_partner?.data ? { id: attrs.preferred_tpl_partner.data.id, ...attrs.preferred_tpl_partner.data.attributes } : (attrs.preferred_tpl_partner || item.preferred_tpl_partner),
            pickup_locations: attrs.pickup_locations?.data || attrs.pickup_locations || [],
          };
        });
        setAllShippers(mapped);
        if (!isShipper && mapped.length > 0) {
          setSelectedCourierShipperId(prev => prev || mapped[0].id);
        }
      })
      .catch(err => console.warn('Failed to load shippers:', err));
  }, [isShipper]);

  const currentActiveBizId = authActiveBizId || (typeof window !== 'undefined' ? Number(localStorage.getItem('activeBusinessId')) : null);

  const selectedShipperBusiness = React.useMemo(() => {
    // 0. For Courier users (!isShipper), use selectedCourierShipperId
    if (!isShipper) {
      if (selectedCourierShipperId && allShippers.length > 0) {
        const found = allShippers.find(s => s.id === selectedCourierShipperId);
        if (found) return found;
      }
      if (allShippers.length > 0) {
        return allShippers[0];
      }
      return null;
    }

    // 1. Match by currentActiveBizId in allShippers
    if (currentActiveBizId && allShippers.length > 0) {
      const found = allShippers.find(s => s.id === currentActiveBizId);
      if (found) return found;
    }
    // 2. Match in user.shipper
    const currentUser = authUser || user;
    if (currentUser?.shipper) {
      const userShippers = Array.isArray(currentUser.shipper) ? currentUser.shipper : [currentUser.shipper];
      if (currentActiveBizId) {
        const foundInUser = userShippers.find((s: any) => s.id === currentActiveBizId);
        if (foundInUser) {
          const full = allShippers.find(s => s.id === foundInUser.id);
          return {
            id: foundInUser.id,
            name: foundInUser.name || full?.name || `Shipper #${foundInUser.id}`,
            account_id: full?.account_id || foundInUser.account_id || '',
            address: full?.address || foundInUser.address || '',
            city: full?.city || foundInUser.city || '',
            phone: full?.phone || foundInUser.phone || '',
            email: full?.email || foundInUser.email || '',
            shipper_plan: full?.shipper_plan || foundInUser.shipper_plan,
          };
        }
      }
      if (userShippers.length > 0) {
        const first = userShippers[0];
        const full = allShippers.find(s => s.id === first.id);
        return {
          id: first.id,
          name: first.name || full?.name || `Shipper #${first.id}`,
          account_id: full?.account_id || first.account_id || '',
          address: full?.address || first.address || '',
          city: full?.city || first.city || '',
          phone: full?.phone || first.phone || '',
          email: full?.email || first.email || '',
          shipper_plan: full?.shipper_plan || first.shipper_plan,
        };
      }
    }
    // 3. Fallback to first in allShippers
    if (allShippers.length > 0) {
      return allShippers[0];
    }
    return null;
  }, [isShipper, selectedCourierShipperId, currentActiveBizId, allShippers, authUser, user]);
  
  // UI States
  const [bookingMode, setBookingMode] = React.useState<'manual' | 'bulk'>('manual');
  const [bookingStatus, setBookingStatus] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [createdTrackingId, setCreatedTrackingId] = React.useState('');

  // Auto-complete Reference States
  const [refSearchQuery, setRefSearchQuery] = React.useState('');
  const [refParcelsList, setRefParcelsList] = React.useState<any[]>([]);
  const [searchingRef, setSearchingRef] = React.useState(false);
  const [showRefDropdown, setShowRefDropdown] = React.useState(false);
  const [selectedReferencedParcel, setSelectedReferencedParcel] = React.useState<any | null>(null);

  // Offices state for default pickup location
  const [offices, setOffices] = React.useState<{label: string, value: string}[]>([]);

  // Grouped Bulk Orders & Printing States
  const [groupedOrders, setGroupedOrders] = React.useState<GroupedBulkOrder[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'All' | 'In-House' | '3PL'>('All');
  const [selectedOrderForLabel, setSelectedOrderForLabel] = React.useState<GroupedBulkOrder | null>(null);
  const [showPasteModal, setShowPasteModal] = React.useState(false);
  const [rawCsvText, setRawCsvText] = React.useState('');

  // Sync mode with query parameter tab state (?tab=bulk or ?tab=manual)
  React.useEffect(() => {
    if (!isShipper) {
      setBookingMode('manual');
      return;
    }
    const tab = searchParams?.get('tab');
    if (tab === 'bulk') {
      setBookingMode('bulk');
    } else {
      setBookingMode('manual');
    }
  }, [searchParams, isShipper]);

  const [showDetailsModal, setShowDetailsModal] = React.useState(false);

  // Bulk Upload States
  const [dragActive, setDragActive] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [bulkProgress, setBulkProgress] = React.useState(0);
  const [bulkStatus, setBulkStatus] = React.useState<'idle' | 'parsing' | 'loaded' | 'uploading' | 'success'>('idle');
  
  // Parsed Uploader Grid States
  const [parsedRows, setParsedRows] = React.useState<any[]>([]);
  const [editingRowId, setEditingRowId] = React.useState<string | null>(null);
  const [editFormData, setEditFormData] = React.useState<any>({});

  const [uploadHistory, setUploadHistory] = React.useState<UploadHistoryItem[]>([]);

  const todayStr = React.useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const methods = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema) as any,
    defaultValues: {
      sourceCity: '',
      sourceCityName: '',
      weight: 0.5,
      pieces: 1,
      codAmount: 0,
      serviceType: 'Overnight',
      allowToOpen: 'No',
      collectReplacement: 'No',
      collectRs: 0,
      pickupDate: todayStr,
      pickupTimeSlot: 'Morning (09 AM - 12 PM)',
    },
  });

  const {
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { dirtyFields },
  } = methods;

  const userEditedCodRef = React.useRef(false);

  // Edit Existing Booked Order States
  const [editingParcel, setEditingParcel] = React.useState<{
    id: number | string;
    documentId?: string;
    trackingNumber: string;
    status: string;
    customerName?: string;
  } | null>(null);
  const [showEditOrderModal, setShowEditOrderModal] = React.useState(false);
  const [bookedOrdersList, setBookedOrdersList] = React.useState<any[]>([]);
  const [loadingBookedOrders, setLoadingBookedOrders] = React.useState(false);
  const [bookedOrdersSearch, setBookedOrdersSearch] = React.useState('');
  const [filterOnlyBooked, setFilterOnlyBooked] = React.useState(true);

  const fetchBookedOrders = React.useCallback(async () => {
    setLoadingBookedOrders(true);
    try {
      const res = await apiClient.get('/parcels?populate=*&sort=createdAt:desc&pagination[limit]=100');
      const raw = res.data?.data || [];
      const mapped = raw.map((item: any) => {
        const attrs = item.attributes || item;
        const destCity = extractDestinationCity(attrs);
        const srcCity = extractSourceCity(attrs);
        return {
          id: item.id,
          documentId: attrs.documentId || item.documentId,
          trackingNumber: attrs.tracking_number || attrs.trackingNumber || `SHZ${item.id}`,
          customerName: attrs.recipient_name || attrs.customerName || 'Customer',
          phone: attrs.recipient_phone || attrs.phone || '',
          address: attrs.recipient_address || attrs.address || '',
          destinationCity: destCity,
          sourceCity: srcCity,
          codAmount: Number(attrs.cod_amount) || 0,
          weight: Number(attrs.weight) || 0.5,
          pieces: Number(attrs.pieces) || 1,
          status: attrs.status || 'Booked',
          paymentType: attrs.payment_type || (attrs.cod_amount > 0 ? 'COD' : 'PAID'),
          allowToOpen: attrs.allow_to_open || 'No',
          comments: attrs.comments || attrs.product_description || '',
          productDescription: attrs.comments || attrs.product_description || '',
          originOffice: attrs.origin_office?.id || attrs.origin_office,
          createdAt: attrs.createdAt || attrs.created_at || new Date().toISOString(),
        };
      });
      setBookedOrdersList(mapped);
    } catch (err: any) {
      console.error('Failed to fetch booked orders:', err);
    } finally {
      setLoadingBookedOrders(false);
    }
  }, []);

  const handleOpenEditModal = () => {
    setShowEditOrderModal(true);
    fetchBookedOrders();
  };

  const handleSelectOrderToEdit = React.useCallback((order: any) => {
    const s = String(order.status || '').toLowerCase().trim();
    if (s && s !== 'booked' && s !== 'total booking' && s !== 'pending') {
      alert(`Cannot edit order ${order.trackingNumber}: Current status is '${order.status}'. Only orders in 'Booked' status can be modified.`);
      return;
    }

    userEditedCodRef.current = true;
    setBookingMode('manual');
    setEditingParcel({
      id: order.id,
      documentId: order.documentId,
      trackingNumber: order.trackingNumber,
      status: order.status || 'Booked',
      customerName: order.customerName,
    });

    let cleanAddress = order.address || '';
    if (order.destinationCity && cleanAddress.toLowerCase().endsWith(`, ${order.destinationCity.toLowerCase()}`)) {
      cleanAddress = cleanAddress.substring(0, cleanAddress.length - (order.destinationCity.length + 2)).trim();
    }

    const formValues: BookingFormValues = {
      consigneeName: order.customerName || '',
      consigneePhone: order.phone || '',
      deliveryAddress: cleanAddress || order.address || '',
      destinationCity: order.destinationCity || '',
      destinationCityName: order.destinationCity || '',
      weight: Number(order.weight) || 0.5,
      pieces: Number(order.pieces) || 1,
      codAmount: Number(order.codAmount) || 0,
      paymentType: order.paymentType || (Number(order.codAmount) > 0 ? 'COD' : 'PAID'),
      allowToOpen: order.allowToOpen || 'No',
      comments: order.comments || '',
      productDescription: order.productDescription || order.comments || 'General Goods',
      pickupLocation: order.originOffice ? String(order.originOffice) : '',
      sourceCity: order.sourceCity || '',
      sourceCityName: order.sourceCity || '',
      consigneeEmail: order.email || '',
      consigneeAltPhone: order.altPhone || '',
      area: order.area || '',
      referenceNo: order.referenceNo || '',
      specialInstructions: order.specialInstructions || '',
      serviceType: order.serviceType || 'Overnight',
      pickupDate: todayStr,
      pickupTimeSlot: 'Morning (09 AM - 12 PM)',
      collectReplacement: 'No',
      collectRs: 0,
      parcelDetail: '',
    };

    reset(formValues);

    // Explicitly update individual inputs to trigger any registered listeners
    setValue('consigneeName', formValues.consigneeName, { shouldDirty: true });
    setValue('consigneePhone', formValues.consigneePhone, { shouldDirty: true });
    setValue('deliveryAddress', formValues.deliveryAddress, { shouldDirty: true });
    setValue('destinationCity', formValues.destinationCity, { shouldDirty: true });
    setValue('destinationCityName', formValues.destinationCityName, { shouldDirty: true });
    setValue('weight', formValues.weight, { shouldDirty: true });
    setValue('pieces', formValues.pieces, { shouldDirty: true });
    setValue('codAmount', formValues.codAmount, { shouldDirty: true });
    setValue('paymentType', formValues.paymentType, { shouldDirty: true });
    setValue('allowToOpen', formValues.allowToOpen, { shouldDirty: true });
    setValue('comments', formValues.comments, { shouldDirty: true });
    setValue('productDescription', formValues.productDescription, { shouldDirty: true });
    if (formValues.pickupLocation) {
      setValue('pickupLocation', formValues.pickupLocation, { shouldDirty: true });
    }
    if (formValues.sourceCity) {
      setValue('sourceCity', formValues.sourceCity, { shouldDirty: true });
      setValue('sourceCityName', formValues.sourceCityName, { shouldDirty: true });
    }
    if (formValues.consigneeEmail) {
      setValue('consigneeEmail', formValues.consigneeEmail, { shouldDirty: true });
    }
    if (formValues.consigneeAltPhone) {
      setValue('consigneeAltPhone', formValues.consigneeAltPhone, { shouldDirty: true });
    }
    if (formValues.area) {
      setValue('area', formValues.area, { shouldDirty: true });
    }

    setShowEditOrderModal(false);
    setBookingStatus('idle');
    setErrorMessage('');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [setValue, reset, todayStr]);

  const handleCancelEditing = React.useCallback(() => {
    setEditingParcel(null);
    reset({
      sourceCity: '',
      sourceCityName: '',
      weight: 0.5,
      pieces: 1,
      paymentType: 'COD',
      codAmount: 0,
      serviceType: 'Overnight',
      allowToOpen: 'No',
      collectReplacement: 'No',
      collectRs: 0,
      consigneeEmail: '',
      consigneeAltPhone: '',
      comments: '',
      referenceNo: '',
      parcelDetail: '',
      pickupDate: todayStr,
      pickupTimeSlot: 'Morning (09 AM - 12 PM)',
      consigneeName: '',
      consigneePhone: '',
      deliveryAddress: '',
      destinationCity: '',
      area: '',
      productDescription: '',
      specialInstructions: '',
    });
    setBookingStatus('idle');
    setErrorMessage('');
  }, [reset, todayStr]);

  const filteredModalOrders = React.useMemo(() => {
    return bookedOrdersList.filter(order => {
      const s = String(order.status || '').toLowerCase().trim();
      const isBooked = s === 'booked' || s === 'total booking' || s === 'pending';
      if (filterOnlyBooked && !isBooked) return false;

      if (!bookedOrdersSearch.trim()) return true;
      const q = bookedOrdersSearch.toLowerCase().trim();
      return (
        order.trackingNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.phone.toLowerCase().includes(q) ||
        order.destinationCity.toLowerCase().includes(q) ||
        order.address.toLowerCase().includes(q)
      );
    });
  }, [bookedOrdersList, filterOnlyBooked, bookedOrdersSearch]);

  const lastLoadedEditKeyRef = React.useRef<string | null>(null);
  const [isLoadingDirectOrder, setIsLoadingDirectOrder] = React.useState(false);

  // Handle URL edit params (e.g. ?editId=372 or ?editTracking=SHZ100001134 or ?documentId=...)
  React.useEffect(() => {
    const editId = searchParams?.get('editId');
    const editTracking = searchParams?.get('editTracking');
    const docId = searchParams?.get('documentId') || searchParams?.get('editDocId');
    if (!editId && !editTracking && !docId) return;

    const currentKey = `${editId || ''}_${editTracking || ''}_${docId || ''}`;
    if (lastLoadedEditKeyRef.current === currentKey) return;

    const loadDirectOrder = async () => {
      setIsLoadingDirectOrder(true);
      try {
        let orderItem: any = null;
        const cleanId = editId ? String(editId).trim() : '';
        const cleanTracking = editTracking ? String(editTracking).trim() : '';
        const cleanDocId = docId ? String(docId).trim() : '';

        // Strategy 0: Check if already present in bookedOrdersList state
        if (bookedOrdersList && bookedOrdersList.length > 0) {
          const cached = bookedOrdersList.find(o => 
            (cleanId && (String(o.id) === cleanId || o.documentId === cleanId)) ||
            (cleanDocId && o.documentId === cleanDocId) ||
            (cleanTracking && o.trackingNumber === cleanTracking)
          );
          if (cached) {
            orderItem = cached;
          }
        }

        // Strategy 1: Direct documentId route if docId is available
        if (!orderItem && cleanDocId) {
          try {
            const res = await apiClient.get(`/parcels/${encodeURIComponent(cleanDocId)}?populate=*`);
            const data = res.data?.data;
            if (Array.isArray(data) && data.length > 0) {
              orderItem = data[0];
            } else if (data && !Array.isArray(data) && (data.id || data.attributes)) {
              orderItem = data;
            }
          } catch (e) {
            console.warn('DocId fetch failed:', e);
          }
        }

        // Strategy 2: Tracking number filter (Exact match)
        if (!orderItem && cleanTracking) {
          try {
            const res = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${encodeURIComponent(cleanTracking)}&populate=*`);
            const list = res.data?.data;
            if (Array.isArray(list) && list.length > 0) {
              orderItem = list[0];
            }
          } catch (e) {
            console.warn('Tracking filter failed:', e);
          }
        }

        // Strategy 3: Direct route /parcels/:id
        if (!orderItem && cleanId) {
          try {
            const res = await apiClient.get(`/parcels/${encodeURIComponent(cleanId)}?populate=*`);
            const data = res.data?.data;
            if (Array.isArray(data) && data.length > 0) {
              orderItem = data[0];
            } else if (data && !Array.isArray(data) && (data.id || data.attributes)) {
              orderItem = data;
            }
          } catch (e) {
            console.warn('Direct id endpoint failed:', e);
          }
        }

        // Strategy 4: Numeric ID filter (Handled in Strapi v4 or enhanced v5 controller)
        if (!orderItem && cleanId && !isNaN(Number(cleanId))) {
          try {
            const res = await apiClient.get(`/parcels?filters[id][$eq]=${cleanId}&populate=*`);
            const list = res.data?.data;
            if (Array.isArray(list) && list.length > 0) {
              orderItem = list[0];
            }
          } catch (e) {
            console.warn('id filter failed:', e);
          }
        }

        // Strategy 5: Tracking number contains cleanId or tracking number matches SHZ + cleanId
        if (!orderItem && cleanId) {
          try {
            const res = await apiClient.get(`/parcels?filters[tracking_number][$contains]=${encodeURIComponent(cleanId)}&populate=*`);
            const list = res.data?.data;
            if (Array.isArray(list) && list.length > 0) {
              orderItem = list.find((item: any) => {
                const attrs = item.attributes || item;
                return String(item.id) === cleanId || attrs.tracking_number?.endsWith(cleanId);
              }) || list[0];
            }
          } catch (e) {
            console.warn('Tracking contains cleanId failed:', e);
          }
        }

        // Strategy 6: Collection Scan (Fetches recent parcels and matches in memory)
        if (!orderItem) {
          try {
            const res = await apiClient.get('/parcels?populate=*&sort[0]=createdAt:desc&pagination[pageSize]=100');
            const list = res.data?.data;
            if (Array.isArray(list) && list.length > 0) {
              orderItem = list.find((item: any) => {
                const attrs = item.attributes || item;
                const pId = String(item.id || '');
                const pDoc = String(item.documentId || attrs.documentId || '');
                const pTrack = String(attrs.tracking_number || item.tracking_number || '');
                return (
                  (cleanId && (pId === cleanId || pDoc === cleanId)) ||
                  (cleanDocId && (pDoc === cleanDocId || pId === cleanDocId)) ||
                  (cleanTracking && pTrack === cleanTracking) ||
                  (cleanId && pTrack.endsWith(cleanId))
                );
              });
            }
          } catch (e) {
            console.warn('Collection scan fallback failed:', e);
          }
        }

        if (!orderItem) {
          console.warn(`Order #${editId || editTracking || docId} could not be loaded from database.`);
          setErrorMessage(`Order #${editId || editTracking || docId} could not be loaded. Please ensure the order exists.`);
          return;
        }

        lastLoadedEditKeyRef.current = currentKey;

        const attrs = orderItem.attributes || orderItem;
        const s = String(attrs.status || '').toLowerCase().trim();
        if (s && s !== 'booked' && s !== 'total booking' && s !== 'pending') {
          setErrorMessage(`Order #${attrs.tracking_number || editId} is currently '${attrs.status}'. Only orders in 'Booked' status can be modified.`);
          setBookingStatus('error');
          return;
        }

        const destCity = extractDestinationCity(attrs);
        const srcCity = extractSourceCity(attrs);

        const orderShipperId = attrs.shipper?.data?.id || attrs.shipper?.id || (typeof attrs.shipper === 'number' ? attrs.shipper : null);
        if (orderShipperId) {
          setSelectedCourierShipperId(orderShipperId);
        }

        userEditedCodRef.current = true;
        setBookingMode('manual');
        handleSelectOrderToEdit({
          id: orderItem.id,
          documentId: attrs.documentId || orderItem.documentId,
          trackingNumber: attrs.tracking_number || attrs.trackingNumber || `SHZ${orderItem.id}`,
          customerName: attrs.recipient_name || attrs.customerName || 'Customer',
          phone: attrs.recipient_phone || attrs.phone || '',
          address: attrs.recipient_address || attrs.address || '',
          email: attrs.consignee_email || attrs.email || '',
          altPhone: attrs.consignee_alt_phone || attrs.alt_phone || '',
          area: attrs.area || '',
          destinationCity: destCity,
          sourceCity: srcCity,
          codAmount: Number(attrs.cod_amount) || 0,
          weight: Number(attrs.weight) || 0.5,
          pieces: Number(attrs.pieces) || 1,
          status: attrs.status || 'Booked',
          paymentType: attrs.payment_type || (attrs.cod_amount > 0 ? 'COD' : 'PAID'),
          allowToOpen: attrs.allow_to_open || 'No',
          comments: attrs.comments || attrs.product_description || '',
          productDescription: attrs.comments || attrs.product_description || 'General Goods',
          originOffice: attrs.origin_office?.id || attrs.origin_office,
          referenceNo: attrs.reference_no || '',
          specialInstructions: attrs.special_instructions || '',
          serviceType: attrs.service_type || 'Overnight',
        });
      } catch (err: any) {
        console.error('Failed to load order for direct edit:', err);
        setErrorMessage('Failed to load order for editing: ' + (err.response?.data?.error?.message || err.message));
      } finally {
        setIsLoadingDirectOrder(false);
      }
    };

    loadDirectOrder();
  }, [searchParams, handleSelectOrderToEdit, bookedOrdersList]);

  const [configuredZones, setConfiguredZones] = React.useState<any[]>([]);
  const [detailedOffices, setDetailedOffices] = React.useState<any[]>([]);
  const [isDetectingOriginLocation, setIsDetectingOriginLocation] = React.useState(false);

  // 2PL and 3PL Routing states
  const [courierSelfServiceCities, setCourierSelfServiceCities] = React.useState<string[]>([]);
  const [courierTplPartners, setCourierTplPartners] = React.useState<TPLPartnerModel[]>([]);
  const [shipperPreferredTplId, setShipperPreferredTplId] = React.useState<string | number | null>(null);
  const [zone3plAssignments, setZone3plAssignments] = React.useState<Record<string, any>>({});

  // Fetch courier 2PL self-service areas and configured 3PL partners
  React.useEffect(() => {
    const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : 2);
    apiClient.get('/tenants', {
      params: {
        filters: {
          $or: [
            { id: { $eq: tenantId } },
            { documentId: { $eq: user?.tenant?.documentId || String(tenantId) } }
          ]
        }
      }
    }).then(res => {
      const items = res.data?.data || [];
      const data = items[0]?.attributes || items[0] || null;
      if (data?.self_service_cities && Array.isArray(data.self_service_cities)) {
        setCourierSelfServiceCities(data.self_service_cities);
      } else {
        const saved = localStorage.getItem(`self_service_cities_${tenantId}`);
        if (saved) try { setCourierSelfServiceCities(JSON.parse(saved)); } catch {}
        else setCourierSelfServiceCities(['Lahore', 'Rawalpindi', 'Islamabad', 'Faisalabad']);
      }
    }).catch(() => {
      const saved = localStorage.getItem(`self_service_cities_${tenantId}`);
      if (saved) try { setCourierSelfServiceCities(JSON.parse(saved)); } catch {}
      else setCourierSelfServiceCities(['Lahore', 'Rawalpindi', 'Islamabad', 'Faisalabad']);
    });

    // 2. 3PL Partners
    apiClient.get('/tpl-partners', {
      params: { filters: { tenant: tenantId }, populate: '*' }
    }).then(res => {
      let loaded = (res.data?.data || []).map((item: any) => ({ id: item.id, ...(item.attributes || item) }));
      if (loaded.length === 0) {
        const saved = localStorage.getItem(`tpl_partners_${tenantId}`);
        if (saved) try { loaded = JSON.parse(saved); } catch {}
      }
      setCourierTplPartners(loaded);
    }).catch(() => {
      const saved = localStorage.getItem(`tpl_partners_${tenantId}`);
      if (saved) try { setCourierTplPartners(JSON.parse(saved)); } catch {}
    });

    // 3. Check shipper preferred 3PL mapping
    const activeBusinessIdStr = typeof window !== 'undefined' ? localStorage.getItem('activeBusinessId') : null;
    const shipperId = activeBusinessIdStr || user?.shipper?.id || (Array.isArray(user?.shipper) ? user.shipper[0]?.id : null);
    if (shipperId) {
      const mapKey = `shipper_tpl_map_${tenantId}`;
      const savedMap = localStorage.getItem(mapKey);
      if (savedMap) {
        try {
          const map = JSON.parse(savedMap);
          if (map[shipperId]) setShipperPreferredTplId(map[shipperId]);
        } catch {}
      }
    }

    // 4. Load zone 3PL assignments
    let localZoneMap: any = {};
    const savedZoneMap = localStorage.getItem(`zone_3pl_assignments_${tenantId}`);
    if (savedZoneMap) {
      try {
        localZoneMap = JSON.parse(savedZoneMap);
        setZone3plAssignments(localZoneMap);
      } catch {}
    }

    apiClient.get('/region-coverage-rules?populate=*', {
      params: { filters: { tenant: tenantId } }
    }).then(res => {
      const rules = res.data?.data || [];
      const loaded: Record<string, any> = { ...localZoneMap };
      for (const rule of rules) {
        const attrs = rule.attributes || rule;
        const regionName = attrs.region?.data?.attributes?.name || attrs.region?.name;
        const partner = attrs.preferred_tpl_partner?.data || attrs.preferred_tpl_partner;
        if (regionName && partner) {
          const pAttrs = partner.attributes || partner;
          loaded[regionName] = {
            partnerId: partner.id,
            partnerName: pAttrs.name || '3PL Partner',
            providerCode: pAttrs.provider_code || '3pl'
          };
        }
      }
      setZone3plAssignments(loaded);
    }).catch(() => null);
  }, [user]);

  // Fetch configured zones (tenant-specific or global defaults)
  React.useEffect(() => {
    const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : 2);
    apiClient.get('/regions', {
      params: {
        filters: { tenant: tenantId },
        populate: ['cities'],
        pagination: { limit: 100 }
      }
    }).then(res => {
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        setConfiguredZones(data);
      } else {
        // Fallback to Super Admin Global Defaults
        apiClient.get('/regions', {
          params: {
            filters: { tenant: { $null: true } },
            populate: ['cities'],
            pagination: { limit: 100 }
          }
        }).then(globalRes => {
          const gData = globalRes.data?.data || globalRes.data || [];
          if (Array.isArray(gData) && gData.length > 0) {
            setConfiguredZones(gData);
          }
        }).catch(() => null);
      }
    }).catch(err => console.warn('Could not fetch tenant regions:', err));
  }, [user]);

  // Fetch offices with linked city and auto-detect source city
  React.useEffect(() => {
    const fetchOfficesData = async () => {
      try {
        const tenantId = user?.tenant?.id || user?.tenantId || (typeof user?.tenant === 'number' ? user.tenant : null);
        const res = await apiClient.get('/offices', {
          params: {
            filters: tenantId ? { tenant: tenantId } : {},
            populate: ['city'],
            pagination: { limit: 50 }
          }
        }).catch(() => null);

        let officeList = res?.data?.data || [];
        if (!Array.isArray(officeList) || officeList.length === 0) {
          if (user?.id) {
            const userRes = await apiClient.get(`/users/${user.id}?populate[offices][populate]=city`).catch(() => null);
            officeList = userRes?.data?.offices || [];
          }
        }

        if (Array.isArray(officeList) && officeList.length > 0) {
          const mappedDetailed = officeList.map((o: any) => {
            const attrs = o.attributes || o;
            const cityObj = attrs.city?.data?.attributes || attrs.city || {};
            const cityName = cityObj.CityName || cityObj.name || attrs.cityName || '';
            return {
              id: String(o.id),
              name: attrs.name || `Office #${o.id}`,
              address: attrs.address || '',
              cityName: cityName || (attrs.address ? attrs.address.split(',').pop()?.trim() : '') || 'Lahore',
            };
          });

          setDetailedOffices(mappedDetailed);
          const dropdownItems = mappedDetailed.map(o => ({ label: `${o.name} (${o.cityName})`, value: o.id }));
          setOffices(dropdownItems);

          // Auto-select first office (if no shipper business city)
          if (mappedDetailed.length > 0) {
            setValue('pickupLocation', mappedDetailed[0].id);
            if (!selectedShipperBusiness?.city) {
              setValue('sourceCity', mappedDetailed[0].cityName);
              setValue('sourceCityName', mappedDetailed[0].cityName);
            }
          }
        }
      } catch (e) {
        console.warn('Could not fetch offices for source auto-selection:', e);
      }
    };

    fetchOfficesData();
  }, [user, selectedShipperBusiness, setValue]);

  // Priority: Auto-populate source city from selected shipper business (fallback to office)
  const selectedPickupLocation = watch('pickupLocation');
  React.useEffect(() => {
    if (selectedShipperBusiness?.city) {
      setValue('sourceCity', selectedShipperBusiness.city);
      setValue('sourceCityName', selectedShipperBusiness.city);
    } else if (selectedPickupLocation && detailedOffices.length > 0) {
      const match = detailedOffices.find(o => o.id === String(selectedPickupLocation));
      if (match && match.cityName) {
        setValue('sourceCity', match.cityName);
        setValue('sourceCityName', match.cityName);
      }
    }
  }, [selectedShipperBusiness, selectedPickupLocation, detailedOffices, setValue]);

  // GPS Auto-detect location
  const handleDetectOriginLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingOriginLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsDetectingOriginLocation(false);
        const { latitude, longitude } = position.coords;
        let closest = PAKISTAN_CITY_COORDINATES[0];
        let minDist = Infinity;
        for (const city of PAKISTAN_CITY_COORDINATES) {
          const dist = Math.hypot(city.lat - latitude, city.lng - longitude);
          if (dist < minDist) {
            minDist = dist;
            closest = city;
          }
        }
        setValue('sourceCity', closest.name);
        setValue('sourceCityName', closest.name);
      },
      (err) => {
        setIsDetectingOriginLocation(false);
        console.warn('Geolocation error:', err);
        alert('Could not auto-detect location. Please select origin city manually.');
      },
      { timeout: 10000 }
    );
  };

  // Watch fields for live estimated cost calculation
  const weight = watch('weight') || 0.5;
  const pieces = watch('pieces') || 1;
  const codAmount = watch('codAmount') || 0;
  const paymentType = watch('paymentType') || 'COD';
  const serviceType = watch('serviceType') || 'Overnight';
  const sourceCityVal = watch('sourceCity');
  const sourceCityName = selectedShipperBusiness?.city || watch('sourceCityName') || (typeof sourceCityVal === 'string' ? sourceCityVal : '') || 'Lahore';
  const destinationCityId = watch('destinationCity');
  const destinationCityName = watch('destinationCityName') || (typeof destinationCityId === 'string' ? destinationCityId : '');

  const pricing = React.useMemo(() => {
    const activePlanName = selectedShipperBusiness?.shipper_plan?.name || user?.tariffPlan || user?.planName || (typeof window !== 'undefined' ? localStorage.getItem('activeBusinessTariffPlan') : null) || 'Standard Tariff Plan';
    const sourceLower = String(sourceCityName || '').toLowerCase().trim();
    const cityLower = String(destinationCityName || '').toLowerCase().trim();
    let zoneName = 'Within City';

    // 1. Same origin and destination city -> "Within City"
    const isSameCity = sourceLower && cityLower && (sourceLower === cityLower || sourceLower.includes(cityLower) || cityLower.includes(sourceLower));

    if (isSameCity) {
      zoneName = 'Within City';
    } else {
      // 2. Check tenant configured zones
      let matchedInConfigured = false;
      if (configuredZones.length > 0 && cityLower) {
        for (const reg of configuredZones) {
          const attrs = reg.attributes || reg;
          if (attrs.name.toLowerCase().includes('within')) continue;

          const regCities = attrs.cities?.data || attrs.cities || [];
          const isMatched = regCities.some((c: any) => {
            const cName = (c.attributes?.CityName || c.attributes?.name || c.CityName || c.name || '').toLowerCase().trim();
            return cName && (cityLower === cName || cityLower.includes(cName) || cName.includes(cityLower));
          });
          if (isMatched) {
            zoneName = attrs.name;
            matchedInConfigured = true;
            break;
          }
        }
      }

      // 3. Fallback heuristic if not found in configured zones
      if (!matchedInConfigured && destinationCityId) {
        if (cityLower.includes('karachi') || cityLower.includes('lahore') || cityLower.includes('islamabad') || cityLower.includes('rawalpindi')) {
          zoneName = 'Zone A (Major Metros)';
        } else if (cityLower.includes('faisalabad') || cityLower.includes('multan') || cityLower.includes('peshawar') || cityLower.includes('gujranwala') || cityLower.includes('sialkot') || cityLower.includes('hyderabad')) {
          zoneName = 'Zone B (Regional Hubs)';
        } else if (cityLower.includes('quetta') || cityLower.includes('sukkur') || cityLower.includes('bahawalpur') || cityLower.includes('sargodha') || cityLower.includes('abbottabad')) {
          zoneName = 'Zone C (Secondary Cities)';
        } else {
          zoneName = 'Zone D (Remote & Extended)';
        }
      }
    }

    const isCorporate = activePlanName.toLowerCase().includes('corporate');
    const isVip = activePlanName.toLowerCase().includes('vip');

    let halfKgRate = isVip ? 110 : isCorporate ? 120 : 135;
    let oneKgRate = isVip ? 130 : isCorporate ? 140 : 150;
    let addKgRate = isVip ? 35 : isCorporate ? 40 : 45;

    const zLower = zoneName.toLowerCase();
    if (zLower.includes('zone a') || zLower.includes('metro')) {
      halfKgRate = Math.round(halfKgRate * 1.2);
      oneKgRate = Math.round(oneKgRate * 1.2);
      addKgRate = Math.round(addKgRate * 1.2);
    } else if (zLower.includes('zone b') || zLower.includes('regional')) {
      halfKgRate = Math.round(halfKgRate * 1.3);
      oneKgRate = Math.round(oneKgRate * 1.3);
      addKgRate = Math.round(addKgRate * 1.3);
    } else if (zLower.includes('zone c') || zLower.includes('secondary')) {
      halfKgRate = Math.round(halfKgRate * 1.4);
      oneKgRate = Math.round(oneKgRate * 1.4);
      addKgRate = Math.round(addKgRate * 1.4);
    } else if (zLower.includes('zone d') || zLower.includes('remote') || zLower.includes('other')) {
      halfKgRate = Math.round(halfKgRate * 1.5);
      oneKgRate = Math.round(oneKgRate * 1.5);
      addKgRate = Math.round(addKgRate * 1.5);
    }

    const numWeight = Math.max(0.1, Number(weight) || 0.5);
    let weightCharge = halfKgRate;

    if (numWeight <= 0.5) {
      weightCharge = halfKgRate;
    } else if (numWeight <= 1.0) {
      weightCharge = oneKgRate;
    } else {
      const extraKg = Math.ceil(numWeight - 1.0);
      weightCharge = oneKgRate + (extraKg * addKgRate);
    }

    if (serviceType === 'Same Day') {
      weightCharge = Math.round(weightCharge * 1.5);
    } else if (serviceType === 'Cargo / Economy') {
      weightCharge = Math.round(weightCharge * 0.85);
    }

    const surcharge = 35;
    const subtotal = weightCharge + surcharge;
    const gst = Math.round(subtotal * 0.17 * 100) / 100;
    const total = Math.round((subtotal + gst) * 100) / 100;

    return {
      planName: activePlanName,
      zoneName,
      weightCharge,
      codFee: 0,
      surcharge,
      gst,
      total,
    };
  }, [weight, pieces, serviceType, destinationCityId, destinationCityName, sourceCityName, configuredZones, selectedShipperBusiness, user]);

  // Auto-update COD Amount in textbox whenever pricing changes while paymentType is COD
  const prevPricingTotalRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (paymentType === 'COD') {
      if (!userEditedCodRef.current && !dirtyFields.codAmount) {
        if (pricing.total > 0 && prevPricingTotalRef.current !== pricing.total) {
          setValue('codAmount', Math.round(pricing.total) || pricing.total, { shouldValidate: true });
          prevPricingTotalRef.current = pricing.total;
        }
      }
    } else if (paymentType === 'PAID') {
      setValue('codAmount', 0, { shouldValidate: true });
      prevPricingTotalRef.current = null;
    }
  }, [pricing.total, paymentType, dirtyFields.codAmount, setValue]);

  // Dynamic 4-step 2PL vs 3PL Routing Calculation
  const logisticsRouting = React.useMemo(() => {
    const dest = destinationCityName || destinationCityId;
    if (!dest) return null;
    return evaluateLogisticsRouting({
      sourceCity: sourceCityName,
      destinationCity: dest,
      selfServiceCities: courierSelfServiceCities,
      configuredZones,
      zone3plAssignments,
      shipperPreferredTplId,
      courierTplPartners,
    });
  }, [sourceCityName, destinationCityName, destinationCityId, courierSelfServiceCities, configuredZones, zone3plAssignments, shipperPreferredTplId, courierTplPartners]);

  // Search Reference Order
  React.useEffect(() => {
    if (refSearchQuery.trim().length < 3) {
      setRefParcelsList([]);
      setShowRefDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingRef(true);
      try {
        const response = await apiClient.get(`/parcels?filters[tracking_number][$contains]=${refSearchQuery}`);
        const list = response.data.data || [];
        setRefParcelsList(list);
        setShowRefDropdown(true);
      } catch (err) {
        console.error('Failed to query reference tracking numbers:', err);
      } finally {
        setSearchingRef(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [refSearchQuery]);

  const selectReferenceOrder = (parcel: any) => {
    setSelectedReferencedParcel(parcel);
    setValue('referenceNo', parcel.tracking_number);
    setRefSearchQuery(parcel.tracking_number);
    setShowRefDropdown(false);
  };

  // Submit Manual Single Order
  const onSubmit = async (data: BookingFormValues) => {
    setBookingStatus('submitting');
    setErrorMessage('');

    // Strict Scenario 5 enforcement: Reject if no 2PL or 3PL covers the area
    if (logisticsRouting && !logisticsRouting.allowed) {
      setErrorMessage("Sorry, we don't have delivery service in that area.");
      setBookingStatus('error');
      return;
    }
    
    try {
      // If editing an existing booked order, update it in place
      if (editingParcel) {
        const originOfficeId = data.pickupLocation && !isNaN(Number(data.pickupLocation)) ? Number(data.pickupLocation) : null;
        const parcelId = editingParcel.documentId || editingParcel.id;

        await apiClient.put(`/parcels/${parcelId}`, {
          data: {
            recipient_name: data.consigneeName,
            recipient_phone: data.consigneePhone,
            recipient_address: `${data.deliveryAddress}${data.area ? `, ${data.area}` : ''}, ${data.destinationCityName || data.destinationCity}`,
            source_city: selectedShipperBusiness?.city || data.sourceCityName || data.sourceCity || 'Lahore',
            destination_city: data.destinationCityName || data.destinationCity,
            payment_type: data.paymentType || (data.codAmount > 0 ? 'COD' : 'PAID'),
            cod_amount: data.paymentType === 'PAID' ? 0 : (Number(data.codAmount) || 0),
            weight: Number(data.weight) || 0.5,
            pieces: Number(data.pieces) || 1,
            delivery_charges: pricing.total,
            consignee_email: data.consigneeEmail || '',
            consignee_alt_phone: data.consigneeAltPhone || '',
            allow_to_open: data.allowToOpen || 'No',
            comments: data.comments || data.productDescription || '',
            origin_office: originOfficeId,
            is_3pl: Boolean(logisticsRouting?.is3PL),
          }
        });

        setCreatedTrackingId(editingParcel.trackingNumber);
        setBookingStatus('success');

        setTimeout(() => {
          setBookingStatus('idle');
        }, 3500);
        return;
      }

      const trackingId = generateTrackingId(isShipper ? 'shipper' : 'courier');
      const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || user?.tenantId;
      const activeBusinessIdStr = typeof window !== 'undefined' ? localStorage.getItem('activeBusinessId') : null;
      const activeBusinessId = activeBusinessIdStr ? Number(activeBusinessIdStr) : null;
      
      let shipperId: number | null = selectedShipperBusiness?.id || selectedCourierShipperId || null;
      if (!shipperId) {
        if (Array.isArray(user?.shipper) && user.shipper.length > 0) {
          const matchingShipper = user.shipper.find((s: any) => s.id === activeBusinessId);
          shipperId = matchingShipper ? matchingShipper.id : user.shipper[0].id;
        } else if (user?.shipper?.id) {
          shipperId = user.shipper.id;
        } else if (activeBusinessId && !isNaN(activeBusinessId)) {
          shipperId = activeBusinessId;
        }
      }

      if (!isShipper && !shipperId) {
        setErrorMessage('Please select a shipper account before booking an order.');
        setBookingStatus('error');
        return;
      }

      const originOfficeId = data.pickupLocation && !isNaN(Number(data.pickupLocation)) ? Number(data.pickupLocation) : null;

      const parcelRes = await apiClient.post('/parcels', {
        data: {
          tracking_number: trackingId,
          status: 'Booked',
          payment_type: data.paymentType || (data.codAmount > 0 ? 'COD' : 'PAID'),
          cod_amount: data.paymentType === 'PAID' ? 0 : (Number(data.codAmount) || 0),
          weight: Number(data.weight) || 0.5,
          pieces: Number(data.pieces) || 1,
          delivery_charges: pricing.total,
          recipient_name: data.consigneeName,
          recipient_phone: data.consigneePhone,
          recipient_address: `${data.deliveryAddress}${data.area ? `, ${data.area}` : ''}, ${data.destinationCityName || data.destinationCity}`,
          source_city: selectedShipperBusiness?.city || data.sourceCityName || data.sourceCity || 'Lahore',
          destination_city: data.destinationCityName || data.destinationCity,
          consignee_email: data.consigneeEmail || '',
          consignee_alt_phone: data.consigneeAltPhone || '',
          allow_to_open: data.allowToOpen || 'No',
          comments: data.comments || data.productDescription || '',
          shipper: shipperId || null,
          origin_office: originOfficeId,
          is_3pl: Boolean(logisticsRouting?.is3PL),
        }
      });

      const newParcelId = parcelRes.data.data.id;

      if (selectedReferencedParcel) {
        await apiClient.post('/replacements', {
          data: {
            parcel_detail: data.parcelDetail || '',
            collect_rs: data.collectRs || 0,
            collect_replacement: data.collectReplacement,
            orderid: selectedReferencedParcel.id,
            replacementorderid: newParcelId,
          }
        });
      }

      setCreatedTrackingId(trackingId);
      setBookingStatus('success');
      setSelectedReferencedParcel(null);
      setRefSearchQuery('');
      
      setTimeout(() => {
        reset({
          weight: 0.5,
          pieces: 1,
          paymentType: 'COD',
          codAmount: 0,
          serviceType: 'Overnight',
          allowToOpen: 'No',
          collectReplacement: 'No',
          collectRs: 0,
          consigneeEmail: '',
          consigneeAltPhone: '',
          comments: '',
          referenceNo: '',
          parcelDetail: '',
          pickupDate: todayStr,
          pickupTimeSlot: 'Morning (09 AM - 12 PM)',
          consigneeName: '',
          consigneePhone: '',
          deliveryAddress: '',
          destinationCity: '',
          area: '',
          productDescription: '',
          specialInstructions: '',
        });
        userEditedCodRef.current = false;
        prevPricingTotalRef.current = null;
        setBookingStatus('idle');
      }, 3000);

    } catch (err: any) {
      console.warn('Failed to book order:', err?.response?.data || err.message);
      if (err.response?.status === 401) {
        setErrorMessage('Your session has expired. Redirecting to login page...');
        setTimeout(() => {
          window.location.href = '/login?expired=1';
        }, 1200);
      } else {
        setErrorMessage(err.response?.data?.error?.message || 'Failed to connect to the server. Please try again.');
      }
      setBookingStatus('error');
    }
  };

  // Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processUploadedFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const processUploadedFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(extension || '')) {
      alert("Unsupported file format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.");
      return;
    }

    setSelectedFile(file);
    setBulkStatus('parsing');
    setBulkProgress(20);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        setBulkProgress(60);
        if (extension === 'csv') {
          const text = event.target?.result as string;
          const lines = text.split('\n');
          if (lines.length < 2) {
            alert("Spreadsheet is empty.");
            setBulkStatus('idle');
            setSelectedFile(null);
            return;
          }

          const headers = parseCsvLine(lines[0]);
          const rows: any[] = [];

          // Pre-scan headers to locate key columns flexibly
          const cleanH = (h: string) => h.toLowerCase().replace(/[\s_\-()]/g, '');
          let codIdx = -1;
          let weightIdx = -1;
          let piecesIdx = -1;
          let cityIdx = -1;
          let addrIdx = -1;
          let nameIdx = -1;
          let phoneIdx = -1;
          let descIdx = -1;
          let refIdx = -1;

          headers.forEach((h, idx) => {
            const ch = cleanH(h);
            if (['codamount', 'cod', 'codpkr', 'codrs', 'amount', 'cashondelivery', 'collectamount', 'totalamount', 'orderamount', 'price', 'collectrs', 'collectableamount', 'codvalue'].includes(ch) || (ch.includes('cod') && !ch.includes('charge') && !ch.includes('fee'))) {
              codIdx = idx;
            } else if (['weight', 'weightkg', 'wt', 'kg', 'grossweight', 'actualweight'].includes(ch) || ch.includes('weight')) {
              weightIdx = idx;
            } else if (['pieces', 'piece', 'pcs', 'qty', 'quantity', 'itemcount', 'items', 'count'].includes(ch) || ch.includes('piece') || ch.includes('qty')) {
              piecesIdx = idx;
            } else if (['destinationcity', 'destination', 'city', 'destcity', 'deliverycity', 'tocity'].includes(ch) || (ch.includes('city') && !ch.includes('source') && !ch.includes('origin'))) {
              cityIdx = idx;
            } else if (['deliveryaddress', 'address', 'consigneeaddress', 'recipientaddress', 'streetaddress', 'customeraddress', 'street'].includes(ch) || ch.includes('address')) {
              addrIdx = idx;
            } else if (['consigneename', 'name', 'customername', 'recipientname', 'receivername'].includes(ch) || ch.includes('name')) {
              nameIdx = idx;
            } else if (['consigneephone', 'phone', 'mobile', 'contact', 'cell', 'tel', 'phonenumber', 'mobilenumber'].includes(ch) || ch.includes('phone') || ch.includes('mobile')) {
              phoneIdx = idx;
            } else if (['productdescription', 'product', 'item', 'description', 'desc', 'itemname', 'itemdescription', 'comments', 'remarks'].includes(ch) || ch.includes('product') || ch.includes('desc')) {
              descIdx = idx;
            } else if (['referenceno', 'reference', 'ref', 'orderid', 'orderno'].includes(ch) || ch.includes('reference') || ch.includes('orderid')) {
              refIdx = idx;
            }
          });

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            let values = parseCsvLine(line);

            // If an unquoted address contained commas, values length exceeds headers length.
            // Recombine the split address parts back together at addrIdx.
            if (values.length > headers.length && addrIdx >= 0) {
              const extraCount = values.length - headers.length;
              const addressParts = values.slice(addrIdx, addrIdx + extraCount + 1);
              const combinedAddress = addressParts.join(', ');
              values.splice(addrIdx, extraCount + 1, combinedAddress);
            }

            const rawCod = codIdx !== -1 ? values[codIdx] : values[6];
            const rawWeight = weightIdx !== -1 ? values[weightIdx] : values[4];

            let codAmount = cleanCodAmount(rawCod, rawWeight, values);
            let weight = cleanWeight(rawWeight, rawCod);

            // Auto-correct any 1.6 COD issue
            if (codAmount === 1.6) {
              codAmount = 1600;
            }
            if (codAmount <= 10 && weight >= 50) {
              const temp = codAmount;
              codAmount = weight;
              weight = temp;
            }

            const consigneeName = nameIdx !== -1 ? values[nameIdx] : (values[0] || 'Customer');
            const consigneePhone = phoneIdx !== -1 ? values[phoneIdx] : (values[1] || '');
            const deliveryAddress = addrIdx !== -1 ? values[addrIdx] : (values[2] || '');
            const destinationCity = cityIdx !== -1 ? values[cityIdx] : (values[3] || '');
            const pieces = piecesIdx !== -1 && values[piecesIdx] && !isNaN(parseInt(values[piecesIdx])) ? parseInt(values[piecesIdx]) : 1;
            const productDescription = descIdx !== -1 ? values[descIdx] : (values[7] || '');
            const referenceNo = refIdx !== -1 ? values[refIdx] : '';

            const rowData: any = { 
              id: `row-${i}`,
              consigneeName,
              consigneePhone,
              deliveryAddress,
              destinationCity,
              weight,
              pieces,
              codAmount,
              productDescription,
              referenceNo,
              serviceType: 'Overnight',
              allowToOpen: 'No',
            };

            // Map any custom raw header fields
            headers.forEach((header, idx) => {
              if (!rowData[header]) {
                rowData[header] = values[idx] || '';
              }
            });

            // Calculate delivery / service charges and payable to shipper
            const originCity = selectedShipperBusiness?.city || 'Lahore';
            const destCity = rowData.destinationCity || '';
            const serviceCharge = calculateDeliveryCharge(originCity, destCity, rowData.weight, selectedShipperBusiness?.shipper_plan);
            const payableToShipper = rowData.codAmount > 0 ? (rowData.codAmount - serviceCharge) : -serviceCharge;

            rowData.serviceCharge = serviceCharge;
            rowData.payableToShipper = payableToShipper;
            rowData.errors = validateSpreadsheetRow(rowData);
            rows.push(rowData);
          }

          setParsedRows(rows);
          setBulkProgress(100);
          setBulkStatus('loaded');
        } else {
          alert("Please save your Excel sheet as a .csv (Comma Delimited) file and upload it.");
          setBulkStatus('idle');
          setSelectedFile(null);
        }
      } catch (err) {
        console.error("Error reading file:", err);
        alert("Failed to parse file. Please verify CSV template formatting.");
        setBulkStatus('idle');
        setSelectedFile(null);
      }
    };

    if (extension === 'csv') {
      reader.readAsText(file);
    } else {
      reader.onload({} as any);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setEditingRowId(null);
    setBulkStatus('idle');
  };

  // Parse Raw Sheet Paste
  const handleProcessBulkSheetPaste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawCsvText.trim()) return;

    const lines = rawCsvText.trim().split('\n');
    const orderMap: { [orderId: string]: GroupedBulkOrder } = {};

    lines.forEach((line, idx) => {
      const parts = parseCsvLine(line);
      if (parts.length < 3) return;

      const orderId = parts[0] || `ORD-${Date.now()}-${idx}`;
      const consigneeName = parts[1] || 'Unknown Consignee';
      const consigneePhone = parts[2] || '+92 300 0000000';
      const consigneeAddress = parts[3] || 'No Address Provided';
      const shipperName = parts[4] || 'Shipper Business';
      const shipperAddress = parts[5] || 'Warehouse Center';
      const itemName = parts[6] || 'Item Product';
      const codAmount = cleanCodAmount(parts[7], undefined, parts);
      const shippingType = (parts[8]?.toUpperCase() === '3PL' ? '3PL' : 'In-House') as 'In-House' | '3PL';
      const secondary3PLBarcode = parts[9] || (shippingType === '3PL' ? `3PL-${Math.floor(100000 + Math.random() * 900000)}` : undefined);

      if (!orderMap[orderId]) {
        orderMap[orderId] = {
          orderId,
          consigneeName,
          consigneePhone,
          consigneeAddress,
          shipperName,
          shipperAddress,
          shippingType,
          primaryBarcode: generateTrackingId(isShipper ? 'shipper' : 'courier'),
          secondary3PLBarcode,
          items: [],
          totalCod: 0,
          createdAt: new Date().toISOString(),
        };
      }

      orderMap[orderId].items.push({
        itemId: `ITM-${orderMap[orderId].items.length + 1}`,
        itemName,
        codAmount
      });
      orderMap[orderId].totalCod += codAmount;
    });

    const parsedOrders = Object.values(orderMap);
    if (parsedOrders.length > 0) {
      setGroupedOrders(prev => [...parsedOrders, ...prev]);
      setShowPasteModal(false);
      setRawCsvText('');
      alert(`Successfully processed and grouped ${parsedOrders.length} unique orders!`);
    } else {
      alert('Could not parse valid lines. Please verify formatting.');
    }
  };

  // Inline Row Editor Handlers
  const startEditingRow = (row: any) => {
    setEditingRowId(row.id);
    setEditFormData({ ...row });
  };

  const handleEditFormChange = (field: string, val: any) => {
    setEditFormData((prev: any) => ({
      ...prev,
      [field]: val
    }));
  };

  const saveRowEdits = () => {
    const updatedForm = { ...editFormData };
    const originCity = selectedShipperBusiness?.city || 'Lahore';
    const destCity = updatedForm.destinationCity || '';
    const serviceCharge = calculateDeliveryCharge(originCity, destCity, updatedForm.weight, selectedShipperBusiness?.shipper_plan);
    const payableToShipper = updatedForm.codAmount > 0 ? (updatedForm.codAmount - serviceCharge) : -serviceCharge;
    updatedForm.serviceCharge = serviceCharge;
    updatedForm.payableToShipper = payableToShipper;
    updatedForm.errors = validateSpreadsheetRow(updatedForm);
    setParsedRows(prev => prev.map(row => (row.id === updatedForm.id ? updatedForm : row)));
    setEditingRowId(null);
  };

  const cancelRowEdits = () => {
    setEditingRowId(null);
  };

  const deleteRow = (rowId: string) => {
    setParsedRows(prev => prev.filter(row => row.id !== rowId));
  };

  const gridHasErrors = React.useMemo(() => {
    return parsedRows.some(row => Object.keys(row.errors || {}).length > 0);
  }, [parsedRows]);

  const downloadTemplate = () => {
    const headers = [
      'consigneeName',
      'consigneePhone',
      'deliveryAddress',
      'destinationCity',
      'weight',
      'pieces',
      'codAmount',
      'productDescription'
    ];
    
    const sampleRow = [
      'Ali Khan',
      '+923001234567',
      'House 123 Street 4 Block B',
      'Lahore',
      '1.0',
      '1',
      '2500',
      'Cotton Clothes'
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + sampleRow.join(",") + "\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "dbarc_bulk_order_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importAndProcessShipments = async () => {
    if (parsedRows.length === 0) {
      alert("Please upload a spreadsheet first.");
      return;
    }
    if (gridHasErrors) {
      alert("Please resolve validation errors in the grid before booking.");
      return;
    }

    setBulkStatus('uploading');
    setBulkProgress(0);
    setErrorMessage('');

    const activeBusinessIdStr = typeof window !== 'undefined' ? localStorage.getItem('activeBusinessId') : null;
    const activeBusinessId = activeBusinessIdStr ? Number(activeBusinessIdStr) : null;
    
    let shipperId: number | null = null;
    if (Array.isArray(user?.shipper) && user.shipper.length > 0) {
      const matchingShipper = user.shipper.find((s: any) => s.id === activeBusinessId);
      shipperId = matchingShipper ? matchingShipper.id : user.shipper[0].id;
    } else if (user?.shipper?.id) {
      shipperId = user.shipper.id;
    } else if (activeBusinessId && !isNaN(activeBusinessId)) {
      shipperId = activeBusinessId;
    }

    let successCount = 0;

    try {
      for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        const originCity = selectedShipperBusiness?.city || 'Lahore';
        const destCity = row.destinationCity || 'Lahore';
        const deliveryCharge = row.serviceCharge || calculateDeliveryCharge(originCity, destCity, row.weight, selectedShipperBusiness?.shipper_plan);
        const trackingId = generateTrackingId(isShipper ? 'shipper' : 'courier');

        // Check dynamically against courier offices loaded from database (detailedOffices)
        const is2PLCourierCity = detailedOffices && detailedOffices.length > 0
          ? detailedOffices.some((o: any) => {
              const oCity = (o.cityName || '').trim().toLowerCase();
              const dCity = destCity.trim().toLowerCase();
              return oCity && (dCity === oCity || dCity.includes(oCity) || oCity.includes(dCity));
            })
          : false;

        const parcelPayload: any = {
          tracking_number: trackingId,
          status: 'Booked',
          payment_type: (row.codAmount && Number(row.codAmount) > 0) ? 'COD' : 'PAID',
          cod_amount: Number(row.codAmount) || 0,
          weight: Number(row.weight) || 0.5,
          pieces: Number(row.pieces) || 1,
          delivery_charges: deliveryCharge,
          recipient_name: row.consigneeName || 'Customer',
          recipient_phone: row.consigneePhone || '',
          recipient_address: `${row.deliveryAddress || ''}${row.area ? `, ${row.area}` : ''}, ${destCity}`,
          source_city: originCity,
          destination_city: destCity,
          consignee_email: row.consigneeEmail || '',
          consignee_alt_phone: row.consigneeAltPhone || '',
          allow_to_open: row.allowToOpen || 'No',
          comments: row.productDescription || row.comments || '',
          shipper: shipperId || null,
          is_3pl: !is2PLCourierCity,
        };

        const parcelRes = await apiClient.post('/parcels', { data: parcelPayload });

        const newParcelId = parcelRes.data.data.id;

        if (row.referenceNo && row.referenceNo.trim().length > 3) {
          const oldParcelRes = await apiClient.get(`/parcels?filters[tracking_number][$eq]=${row.referenceNo.trim()}`);
          const oldParcel = oldParcelRes.data.data?.[0];

          if (oldParcel) {
            await apiClient.post('/replacements', {
              data: {
                parcel_detail: row.parcelDetail || '',
                collect_rs: row.collectRs || 0,
                collect_replacement: row.collectReplacement || 'No',
                orderid: oldParcel.id,
                replacementorderid: newParcelId,
              }
            });
          }
        }

        successCount++;
        setBulkProgress(Math.round(((i + 1) / parsedRows.length) * 100));
      }

      setBulkStatus('success');

      const newHistoryItem: UploadHistoryItem = {
        id: String(Date.now()),
        fileName: selectedFile?.name || 'bulk_orders.csv',
        date: new Date().toLocaleString(),
        count: successCount,
        status: 'processed'
      };
      setUploadHistory(prev => [newHistoryItem, ...prev]);

      setTimeout(() => {
        clearSelectedFile();
      }, 3000);

    } catch (err: any) {
      console.warn("Batch processing failed:", err?.response?.data || err.message);
      if (err.response?.status === 401) {
        setErrorMessage("Your session has expired. Please refresh the page or log in again.");
      } else {
        setErrorMessage(err.response?.data?.error?.message || "An error occurred during batch booking. Please try again.");
      }
      setBulkStatus('loaded');
    }
  };

  const filteredGroupedOrders = React.useMemo(() => {
    return groupedOrders.filter(ord => {
      const matchesSearch = !searchQuery || (
        ord.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.consigneeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.consigneePhone.includes(searchQuery)
      );
      const matchesType = typeFilter === 'All' || ord.shippingType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [groupedOrders, searchQuery, typeFilter]);

  const handleTriggerPrint = () => {
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <PortalLayout>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #bulk-label-print-area, #bulk-label-print-area * {
            visibility: visible !important;
          }
          #bulk-label-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div className="w-full space-y-md relative no-print">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-md">
          <div>
            <nav className="flex gap-xs text-label-md font-label-md text-on-surface-variant mb-xs">
              <Link href="/orders" className="hover:text-primary transition-colors cursor-pointer">Booking Order</Link>
              <span>/</span>
              <span className="text-on-surface">{bookingMode === 'manual' || !isShipper ? 'Book Order' : 'Bulk Booking'}</span>
            </nav>
            <h1 className="font-display-lg text-display-lg text-on-surface">
              {editingParcel
                ? `Edit Order #${editingParcel.trackingNumber}`
                : (bookingMode === 'manual' || !isShipper ? 'Book New Order' : 'Bulk Booking Orders')}
            </h1>
          </div>
          
          {/* Header Action Buttons, Live Price Summary & Selected Business Badge */}
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2.5">
              {(bookingMode === 'manual' || !isShipper) && (
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="px-4 py-2.5 font-semibold text-sm rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-primary transition-all shadow-2xs flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Edit3 className="w-4 h-4 text-primary" />
                  <span>{editingParcel ? 'Select Different Order' : 'Edit Booked Order'}</span>
                </button>
              )}
              
              {bookingMode === 'manual' || !isShipper ? (
                <button 
                  onClick={handleSubmit(onSubmit)}
                  disabled={bookingStatus === 'submitting' || bookingStatus === 'success'}
                  className={`px-5 py-2.5 font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center gap-2 text-white cursor-pointer
                    ${bookingStatus === 'success' 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : editingParcel
                        ? 'bg-amber-600 hover:bg-amber-700 active:scale-95'
                        : 'bg-primary hover:bg-[#003ec7] active:scale-95'}`}
                >
                  {bookingStatus === 'submitting' && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {editingParcel ? 'Updating...' : 'Processing...'}
                    </>
                  )}
                  {bookingStatus === 'success' && (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      {editingParcel ? 'Updated!' : 'Booked!'}
                    </>
                  )}
                  {bookingStatus === 'idle' && (
                    <>
                      <Save className="h-4 w-4" />
                      {editingParcel ? 'Update Order' : 'Create Order'}
                    </>
                  )}
                  {bookingStatus === 'error' && (
                    <>
                      <Save className="h-4 w-4" />
                      {editingParcel ? 'Retry Update' : 'Retry Order'}
                    </>
                  )}
                </button>
              ) : (
                <button 
                  onClick={importAndProcessShipments}
                  disabled={bulkStatus === 'uploading' || bulkStatus === 'success' || parsedRows.length === 0}
                  className={`px-5 py-2.5 font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center gap-2 text-white cursor-pointer
                    ${bulkStatus === 'success' 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : parsedRows.length === 0 || bulkStatus === 'uploading'
                        ? 'bg-slate-300 cursor-not-allowed opacity-60'
                        : 'bg-primary hover:bg-[#003ec7] active:scale-95'}`}
                >
                  {bulkStatus === 'uploading' && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Booking ({bulkProgress}%)...
                    </>
                  )}
                  {bulkStatus === 'success' && (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Booked!
                    </>
                  )}
                  {(bulkStatus === 'idle' || bulkStatus === 'parsing' || bulkStatus === 'loaded') && (
                    <>
                      <Save className="h-4 w-4" />
                      Create Order
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Below Create Order: Selected Business Address & Origin City Indicator */}
            {selectedShipperBusiness && (
              <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl shadow-2xs animate-in fade-in duration-200">
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-bold text-slate-800">
                  {!isShipper ? `Shipper: ${selectedShipperBusiness.name}` : selectedShipperBusiness.name}
                </span>
                {selectedShipperBusiness.address && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600 text-[11px] max-w-[280px] truncate" title={selectedShipperBusiness.address}>
                      {selectedShipperBusiness.address}
                    </span>
                  </>
                )}
                {selectedShipperBusiness.city && (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] ml-1">
                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                    Origin: {selectedShipperBusiness.city}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status Banners */}
        {isLoadingDirectOrder && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
            <div className="animate-spin h-5 w-5 text-blue-600 border-2 border-solid border-current border-r-transparent rounded-full shrink-0" />
            <div>
              <p className="font-bold text-sm">Loading Booked Order for Editing...</p>
              <p className="text-xs text-blue-600">Retrieving details and populating form.</p>
            </div>
          </div>
        )}

        {bookingMode === 'manual' && bookingStatus === 'success' && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">{editingParcel ? 'Order Updated Successfully!' : 'Order Booked Successfully!'}</p>
              <p className="text-sm">Tracking ID: <strong className="font-mono text-slate-900">{createdTrackingId}</strong></p>
            </div>
          </div>
        )}

        {/* Active Edit Order Banner */}
        {editingParcel && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold shrink-0">
                <Edit3 className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-slate-900 text-base">Editing Booked Order:</span>
                  <span className="font-mono font-black text-primary text-base">{editingParcel.trackingNumber}</span>
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                    Booked
                  </span>
                  {editingParcel.customerName && (
                    <span className="text-xs font-semibold text-slate-600">({editingParcel.customerName})</span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Modifying fields will directly update this existing order in the database. Only Booked orders can be modified.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCancelEditing}
                className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-4 h-4 text-slate-500" /> Cancel Edit & Book New
              </button>
            </div>
          </div>
        )}

        {bulkStatus === 'success' && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Bulk Orders Booked Successfully!</p>
              <p className="text-sm">All shipments have been created and assigned tracking numbers.</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-red-600 shrink-0" />
              <div>
                <p className="font-bold">Booking Notice</p>
                <p className="text-sm">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="text-red-700 hover:text-red-900 text-xs font-bold px-2 py-1 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Full-Width Compact Layout Section */}
        <div className="w-full space-y-md">
          {/* Mode Switch Tabs (Hidden for Courier, only single booking is supported) */}
          {isShipper && (
            <div className="bg-surface-container-high p-1.5 rounded-2xl flex w-fit gap-1 border border-outline-variant">
              <button
                onClick={() => {
                  setBookingMode('manual');
                  router.push('/shipments/book?tab=manual');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer
                  ${bookingMode === 'manual' 
                    ? 'bg-white text-on-surface shadow-sm' 
                    : 'text-outline hover:text-on-surface'}`}
              >
                <User className="h-3.5 w-3.5" />
                Book Order
              </button>
              <button
                onClick={() => {
                  setBookingMode('bulk');
                  router.push('/shipments/book?tab=bulk');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer
                  ${bookingMode === 'bulk' 
                    ? 'bg-white text-on-surface shadow-sm' 
                    : 'text-outline hover:text-on-surface'}`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Bulk Booking
              </button>
            </div>
          )}

          {bookingMode === 'manual' || !isShipper ? (
            /* Manual Booking Form Context Provider & Form Canvas */
            <FormProvider {...methods}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-md">
                {/* Shipper Selection Section for Courier Staff */}
                {!isShipper && (
                  <section className="bg-surface-container-lowest border-2 border-primary/20 rounded-xl p-md shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center justify-between mb-sm border-b border-outline-variant pb-xs">
                      <div className="flex items-center gap-sm">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="font-bold text-sm text-on-surface">Book Order for Shipper / Merchant</h2>
                          <p className="text-xs text-on-surface-variant">Select the registered shipper merchant account this consignment belongs to</p>
                        </div>
                      </div>
                      {selectedShipperBusiness && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          Active: {selectedShipperBusiness.name}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-md items-end">
                      <div className="md:col-span-2 flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-on-surface flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-primary" />
                          Select Shipper Account <span className="text-error font-bold">*</span>
                        </label>
                        <select
                          value={selectedCourierShipperId || selectedShipperBusiness?.id || ''}
                          onChange={(e) => {
                            const newId = Number(e.target.value);
                            setSelectedCourierShipperId(newId);
                            const found = allShippers.find(s => s.id === newId);
                            if (found) {
                              if (found.city) {
                                setValue('sourceCity', found.city);
                                setValue('sourceCityName', found.city);
                              }
                              if (found.preferred_tpl_partner) {
                                setShipperPreferredTplId(found.preferred_tpl_partner?.id || found.preferred_tpl_partner);
                              }
                            }
                          }}
                          className="w-full h-11 px-3 py-2 bg-white border border-outline-variant rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer shadow-2xs"
                        >
                          <option value="" disabled>-- Select a Shipper Account --</option>
                          {allShippers.map((sh) => (
                            <option key={sh.id} value={sh.id}>
                              {sh.name} {sh.account_id ? `(${sh.account_id})` : ''} - {sh.city || 'No City'} {sh.shipper_plan?.name ? `• [${sh.shipper_plan.name}]` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Selected Shipper Summary Card */}
                      {selectedShipperBusiness && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs flex flex-col justify-center gap-1">
                          <div className="flex items-center justify-between text-slate-500">
                            <span className="font-semibold text-[11px]">Tariff Plan</span>
                            <span className="font-bold text-primary text-[11px] truncate max-w-[130px]" title={selectedShipperBusiness.shipper_plan?.name}>
                              {selectedShipperBusiness.shipper_plan?.name || 'Standard Tariff Plan'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span className="font-semibold text-[11px]">Origin City</span>
                            <span className="font-bold text-slate-800 text-[11px]">
                              {selectedShipperBusiness.city || 'Not Specified'}
                            </span>
                          </div>
                          {selectedShipperBusiness.phone && (
                            <div className="flex items-center justify-between text-slate-500">
                              <span className="font-semibold text-[11px]">Phone</span>
                              <span className="font-medium text-slate-700 text-[11px]">
                                {selectedShipperBusiness.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                )}
                {/* Section 1: Consignee & Delivery Detail */}
                <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
                  <div className="flex items-center gap-sm mb-md border-b border-outline-variant pb-xs">
                    <div className="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">person</span>
                    </div>
                    <div>
                      <h2 className="font-bold text-sm text-on-surface">Consignee & Delivery Detail</h2>
                      <p className="text-xs text-on-surface-variant">Recipient contact and delivery location</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
                    <TextBox<BookingFormValues>
                      name="consigneeName"
                      label="Full Name"
                      placeholder="e.g. John Doe"
                      required
                    />

                    <TextBox<BookingFormValues>
                      name="consigneePhone"
                      label="Phone Number"
                      placeholder="+92 300 1234567"
                      required
                    />

                    <TextBox<BookingFormValues>
                      name="consigneeEmail"
                      label="@mail"
                      placeholder="e.g. john.doe@email.com"
                      type="email"
                    />

                    <TextBox<BookingFormValues>
                      name="consigneeAltPhone"
                      label="Alt. Cell #"
                      placeholder="+92 300 7654321"
                    />

                    <div className="flex flex-col gap-1.5 sm:col-span-1 lg:col-span-2">
                      <label className="text-xs font-bold text-on-surface flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        Destination City / Tehsil <span className="text-error font-bold">*</span>
                      </label>
                      <Controller
                        name="destinationCity"
                        control={control}
                        render={({ field, fieldState }) => (
                          <PakistanLocationSelect
                            value={field.value ?? ''}
                            onChange={(val, loc: any) => {
                              field.onChange(val);
                              if (loc) {
                                setValue('destinationCityName', loc.cityName || loc.tehsil);
                              }
                            }}
                            placeholder="Select Destination Location"
                            error={fieldState.error?.message || undefined}
                          />
                        )}
                      />
                    </div>

                    <div className="sm:col-span-1 lg:col-span-2">
                      <TextBox<BookingFormValues>
                        name="area"
                        label="Area/Locality"
                        placeholder="DHA Phase 6"
                      />
                    </div>

                    <div className="col-span-full">
                      <TextBox<BookingFormValues>
                        name="deliveryAddress"
                        label="Delivery Address"
                        placeholder="Street address, building, floor..."
                        required
                      />
                    </div>

                    {/* Live Logistics Fulfillment Routing Banner */}
                    {logisticsRouting && (
                      <div className="sm:col-span-2 lg:col-span-4 mt-1">
                        {!logisticsRouting.allowed ? (
                          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-3 animate-in fade-in">
                            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                                Delivery Service Unavailable (Scenario 5)
                              </div>
                              <div className="text-xs font-medium">
                                {logisticsRouting.message}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs animate-in fade-in">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-2.5 h-2.5 rounded-full ${
                                logisticsRouting.fulfillmentType === '2PL' ? 'bg-emerald-500' : 'bg-blue-500'
                              }`} />
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  Fulfillment: {logisticsRouting.serviceType}
                                </span>
                                <span className="text-slate-500 block text-[11px]">
                                  {logisticsRouting.message}
                                </span>
                              </div>
                            </div>

                            <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider ${
                              logisticsRouting.fulfillmentType === '2PL'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}>
                              {logisticsRouting.fulfillmentType === '2PL' 
                                ? `2PL: ${logisticsRouting.subCategory || 'In-House'}`
                                : `3PL: ${logisticsRouting.matchedZoneName || 'Partner'}`
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* Section 2: Order & Package Detail */}
                <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
                  <div className="flex items-center gap-sm mb-md border-b border-outline-variant pb-xs">
                    <div className="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                    </div>
                    <div>
                      <h2 className="font-bold text-sm text-on-surface">Order & Package Detail</h2>
                      <p className="text-xs text-on-surface-variant">Package weight, contents, and COD details</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
                    <TextBox<BookingFormValues>
                      name="weight"
                      label="Weight (kg)"
                      placeholder="0.5"
                      type="number"
                      step="0.1"
                      required
                    />

                    <TextBox<BookingFormValues>
                      name="pieces"
                      label="Pieces"
                      placeholder="1"
                      type="number"
                      required
                    />

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-700">Order Payment Type</label>
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setValue('paymentType', 'COD');
                            if (!userEditedCodRef.current && pricing.total > 0) {
                              setValue('codAmount', Math.round(pricing.total) || pricing.total);
                            }
                          }}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                            paymentType === 'COD' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          COD
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setValue('paymentType', 'PAID');
                            setValue('codAmount', 0);
                          }}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                            paymentType === 'PAID' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          PAID
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-700">
                        {paymentType === 'PAID' ? 'COD Amount (Disabled for PAID)' : 'COD Amount (PKR)'}
                      </label>
                      <TextBox<BookingFormValues>
                        name="codAmount"
                        placeholder="0"
                        type="number"
                        disabled={paymentType === 'PAID'}
                        onInput={() => {
                          userEditedCodRef.current = true;
                        }}
                      />
                    </div>

                    <SearchableDropdown<BookingFormValues>
                      name="serviceType"
                      label="Service Type"
                      items={SERVICE_OPTIONS}
                    />

                    <SearchableDropdown<BookingFormValues>
                      name="allowToOpen"
                      label="Allow To Open"
                      items={YES_NO_OPTIONS}
                    />

                    <div className="lg:col-span-2">
                      <TextBox<BookingFormValues>
                        name="productDescription"
                        label="Product Description"
                        placeholder="e.g. Electronics, Clothing"
                        required
                      />
                    </div>

                    <div className="col-span-full">
                      <TextBox<BookingFormValues>
                        name="comments"
                        label="Comments"
                        placeholder="Special remarks..."
                      />
                    </div>
                  </div>
                </section>

                {/* Section 3: Collection & Replacement Detail */}
                <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
                  <div className="flex items-center gap-sm mb-md border-b border-outline-variant pb-xs">
                    <div className="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">autorenew</span>
                    </div>
                    <div>
                      <h2 className="font-bold text-sm text-on-surface">Collection & Replacement Detail</h2>
                      <p className="text-xs text-on-surface-variant">Pickup timing, office location, and exchange details</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
                    <TextBox<BookingFormValues>
                      name="pickupDate"
                      label="Pickup Date"
                      type="date"
                    />

                    <div className="sm:col-span-1 lg:col-span-3">
                      <TextBox<BookingFormValues>
                        name="specialInstructions"
                        label="Special Instructions"
                        placeholder="Fragile, call before arrival..."
                      />
                    </div>

                    {/* Replacement / Exchange Sub-fields */}
                    <div className="space-y-1.5 relative group flex flex-col w-full">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[12px] font-bold text-on-surface-variant">Ref. No (Old Booking)</label>
                        {selectedReferencedParcel && (
                          <button
                            type="button"
                            onClick={() => setShowDetailsModal(true)}
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="h-3 w-3" /> Order Details
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Search tracking # (e.g. SHZ100001134)..."
                          value={refSearchQuery}
                          onChange={(e) => {
                            setRefSearchQuery(e.target.value);
                            if (selectedReferencedParcel) {
                              setSelectedReferencedParcel(null);
                              setValue('referenceNo', '');
                            }
                          }}
                          className="w-full h-10 border border-outline-variant rounded-lg pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white transition-all"
                        />
                        <Search className="h-4 w-4 text-outline absolute left-3 top-3" />
                        {searchingRef && (
                          <Loader2 className="h-4 w-4 text-outline animate-spin absolute right-3 top-3" />
                        )}
                      </div>

                      {showRefDropdown && refParcelsList.length > 0 && (
                        <div className="absolute left-0 right-0 top-[70px] z-50 bg-white border border-outline-variant rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-outline-variant">
                          {refParcelsList.map((parcel) => (
                            <button
                              key={parcel.id}
                              type="button"
                              onClick={() => selectReferenceOrder(parcel)}
                              className="w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-surface-container-low transition-colors text-on-surface flex justify-between items-center cursor-pointer"
                            >
                              <span>{parcel.tracking_number}</span>
                              <span className="text-[10px] text-outline font-normal">{parcel.recipient_name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <SearchableDropdown<BookingFormValues>
                      name="collectReplacement"
                      label="Collect Replacement"
                      items={YES_NO_OPTIONS}
                    />

                    <div className="sm:col-span-2 lg:col-span-2">
                      <TextBox<BookingFormValues>
                        name="parcelDetail"
                        label="Parcel Detail"
                        placeholder="Replacement item detail..."
                      />
                    </div>
                  </div>
                </section>
              </form>
            </FormProvider>
          ) : (
            /* UNIFIED BULK BOOKING TAB CONTENT */
            <div className="space-y-md">
              {/* Sleek, Compact Bulk Uploader Control Bar */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-on-surface">Bulk Order Upload</h2>
                    <p className="text-xs text-on-surface-variant">Upload spreadsheet or paste CSV lines to book multiple orders concurrently</p>
                  </div>
                </div>

                {/* Compact Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                  />

                  <button
                    type="button"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="px-3.5 py-2 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <FileUp className="h-4 w-4" /> Upload File
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPasteModal(true)}
                    className="px-3.5 py-2 bg-white border border-outline-variant text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Upload className="h-4 w-4 text-primary" /> Paste CSV Sheet
                  </button>

                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="px-3.5 py-2 bg-white border border-outline-variant text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <FileDown className="h-4 w-4 text-primary" /> CSV Template
                  </button>
                </div>
              </div>

              {/* Compact Drag & Drop Strip / File Selected Status */}
              {selectedFile ? (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{(selectedFile.size / 1024).toFixed(1)} KB • {parsedRows.length} rows loaded</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {bulkStatus === 'uploading' ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{bulkProgress}%</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={clearSelectedFile}
                        className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:text-red-600 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Trash className="h-3.5 w-3.5" /> Clear
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`w-full py-3 px-4 rounded-xl border border-dashed flex items-center justify-between text-xs transition-all cursor-pointer
                    ${dragActive 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-slate-50/80 border-slate-300 hover:border-slate-400'}`}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <div className="flex items-center gap-2 text-slate-600">
                    <UploadCloud className="h-4 w-4 text-primary" />
                    <span><strong className="text-slate-900">Drag & drop</strong> spreadsheet here or click to browse (.xlsx, .csv)</span>
                  </div>
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Max 10MB</span>
                </div>
              )}

              {/* SEARCH & FULFILLMENT FILTER BAR FOR GROUPED BULK ORDERS */}
              <div className="bg-white border border-outline-variant rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Search Order ID / Consignee</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="Search order_id or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-outline-variant rounded-xl py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Fulfillment & Barcode Routing</label>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setTypeFilter('All')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        typeFilter === 'All' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-outline-variant hover:bg-slate-100'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setTypeFilter('In-House')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        typeFilter === 'In-House' ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-700 border-outline-variant hover:bg-slate-100'
                      }`}
                    >
                      1 Barcode (In-House)
                    </button>
                    <button
                      onClick={() => setTypeFilter('3PL')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        typeFilter === '3PL' ? 'bg-purple-700 text-white border-purple-700' : 'bg-slate-50 text-slate-700 border-outline-variant hover:bg-slate-100'
                      }`}
                    >
                      2 Barcodes (3PL)
                    </button>
                  </div>
                </div>

                <div className="flex justify-end text-xs text-slate-500 font-semibold">
                  Total Grouped Orders: <strong className="text-slate-900 ml-1">{filteredGroupedOrders.length}</strong>
                </div>
              </div>

              {/* GROUPED BULK ORDERS TABLE WITH PRINT LABELS */}
              <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-3.5 border-b border-outline-variant flex items-center justify-between bg-slate-50">
                  <h4 className="font-bold text-xs text-on-surface flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-primary" /> Grouped Bulk Orders & Labels
                  </h4>
                  <span className="text-[11px] font-medium text-slate-500">
                    Items sharing 1 <code className="text-primary font-bold">order_id</code> are grouped together
                  </span>
                </div>

                <div className="overflow-x-auto min-h-[260px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/60 border-b border-outline-variant text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                        <th className="px-4 py-2.5">Order ID</th>
                        <th className="px-4 py-2.5">Items</th>
                        <th className="px-4 py-2.5">Consignee Detail</th>
                        <th className="px-4 py-2.5">Shipper Detail</th>
                        <th className="px-4 py-2.5">Fulfillment & Barcodes</th>
                        <th className="px-4 py-2.5">Total COD</th>
                        <th className="px-4 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant text-xs font-medium">
                      {filteredGroupedOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                            No bulk booking orders found. Upload or paste a sheet to add entries.
                          </td>
                        </tr>
                      ) : (
                        filteredGroupedOrders.map((ord) => (
                          <tr key={ord.orderId} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-primary text-xs">
                              {ord.orderId}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                                <Package className="w-3 h-3 text-primary" /> {ord.items.length} Item{ord.items.length !== 1 ? 's' : ''}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{ord.consigneeName}</span>
                                <span className="text-[10px] text-slate-500 font-mono">{ord.consigneePhone}</span>
                                <span className="text-[10px] text-slate-600 truncate max-w-[200px]">{ord.consigneeAddress}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800">{ord.shipperName}</span>
                                <span className="text-[10px] text-slate-500 truncate max-w-[180px]">{ord.shipperAddress}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {ord.shippingType === 'In-House' ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px] w-fit">
                                    <BarcodeIcon className="w-3 h-3" /> 1 Barcode (In-House)
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500">{ord.primaryBarcode}</span>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-bold text-[10px] w-fit">
                                    <BarcodeIcon className="w-3 h-3" /> 2 Barcodes (3PL)
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500">1: {ord.primaryBarcode}</span>
                                  <span className="text-[10px] font-mono text-purple-700 font-bold">2: {ord.secondary3PLBarcode}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900">
                              PKR {ord.totalCod?.toLocaleString() || 0}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => setSelectedOrderForLabel(ord)}
                                className="px-3 py-1 bg-primary text-white rounded-lg font-bold text-xs hover:shadow-md active:scale-95 transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" /> Print Labels
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* INTERACTIVE EDITABLE GRID (WHEN FILE UPLOADED) */}
              {parsedRows.length > 0 && (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm space-y-md">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant pb-md">
                    <div>
                      <h3 className="font-headline-md text-headline-md">Loaded Orders &amp; COD Settlement Calculation</h3>
                      <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">Calculated courier freight charges deducted from COD, showing net payable to shipper</p>
                    </div>

                    {gridHasErrors && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4" /> Please resolve errors to unlock Create Order.
                      </div>
                    )}
                  </div>

                  {/* Financial Settlement Overview Cards (matching COD Settlement) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loaded Orders</span>
                      <div className="text-xl font-black text-slate-900 mt-0.5">{parsedRows.length}</div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Shipments in spreadsheet</p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total COD Collected</span>
                      <div className="text-xl font-black font-mono text-slate-900 mt-0.5">
                        PKR {parsedRows.reduce((acc, r) => acc + (Number(r.codAmount) || 0), 0).toLocaleString()}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Gross cash from recipients</p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Courier Freight Charges</span>
                      <div className="text-xl font-black font-mono text-red-600 mt-0.5">
                        - PKR {parsedRows.reduce((acc, r) => acc + (Number(r.serviceCharge) || 0), 0).toLocaleString()}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Service charges deduction</p>
                    </div>

                    <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Net Payout to Shipper</span>
                      <div className="text-xl font-black font-mono text-emerald-700 mt-0.5">
                        PKR {parsedRows.reduce((acc, r) => acc + (Number(r.payableToShipper) || 0), 0).toLocaleString()}
                      </div>
                      <p className="text-[10px] font-bold text-emerald-800 mt-0.5">Remaining payable to merchant</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-outline-variant">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-outline-variant text-outline font-bold uppercase">
                        <tr>
                          <th className="px-3 py-3">#</th>
                          <th className="px-3 py-3">Recipient Name</th>
                          <th className="px-3 py-3">Phone</th>
                          <th className="px-3 py-3">Destination City</th>
                          <th className="px-3 py-3">Address</th>
                          <th className="px-3 py-3 text-center">Weight (Kg)</th>
                          <th className="px-3 py-3 text-right">COD Collected</th>
                          <th className="px-3 py-3 text-right">Freight Charges</th>
                          <th className="px-3 py-3 text-right text-emerald-700">Net Payable</th>
                          <th className="px-3 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant font-medium text-on-surface">
                        {parsedRows.map((row, index) => {
                          const isEditing = editingRowId === row.id;
                          const hasErrors = Object.keys(row.errors || {}).length > 0;

                          return (
                            <tr 
                              key={row.id} 
                              className={`transition-colors ${hasErrors ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-slate-50/40'}`}
                            >
                              <td className="px-3 py-3">
                                {hasErrors ? (
                                  <span title={Object.values(row.errors).join(', ')}>
                                    <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                                  </span>
                                ) : (
                                  index + 1
                                )}
                              </td>

                              <td className="px-3 py-3">
                                {isEditing ? (
                                  <input 
                                    type="text" 
                                    value={editFormData.consigneeName || ''} 
                                    onChange={(e) => handleEditFormChange('consigneeName', e.target.value)}
                                    className={`w-28 h-8 px-2 border rounded-lg outline-none ${editFormData.errors?.consigneeName ? 'border-error' : 'border-outline-variant'}`}
                                  />
                                ) : (
                                  <span>{row.consigneeName}</span>
                                )}
                              </td>

                              <td className="px-3 py-3">
                                {isEditing ? (
                                  <input 
                                    type="text" 
                                    value={editFormData.consigneePhone || ''} 
                                    onChange={(e) => handleEditFormChange('consigneePhone', e.target.value)}
                                    className={`w-28 h-8 px-2 border rounded-lg outline-none ${editFormData.errors?.consigneePhone ? 'border-error' : 'border-outline-variant'}`}
                                  />
                                ) : (
                                  <span className="font-mono">{row.consigneePhone}</span>
                                )}
                              </td>

                              <td className="px-3 py-3 font-semibold">
                                {isEditing ? (
                                  <select 
                                    value={editFormData.destinationCity || ''} 
                                    onChange={(e) => handleEditFormChange('destinationCity', e.target.value)}
                                    className="h-8 px-1.5 border border-outline-variant rounded-lg outline-none bg-white"
                                  >
                                    <option value="">Select</option>
                                    <option value="Karachi">Karachi</option>
                                    <option value="Lahore">Lahore</option>
                                    <option value="Islamabad">Islamabad</option>
                                    <option value="Faisalabad">Faisalabad</option>
                                    <option value="Rawalpindi">Rawalpindi</option>
                                    <option value="Multan">Multan</option>
                                    <option value="Peshawar">Peshawar</option>
                                    <option value="Quetta">Quetta</option>
                                  </select>
                                ) : (
                                  row.destinationCity || <span className="text-red-500 italic">Missing</span>
                                )}
                              </td>

                              <td className="px-3 py-3 max-w-[150px] truncate">
                                {isEditing ? (
                                  <input 
                                    type="text" 
                                    value={editFormData.deliveryAddress || ''} 
                                    onChange={(e) => handleEditFormChange('deliveryAddress', e.target.value)}
                                    className="w-36 h-8 px-2 border border-outline-variant rounded-lg outline-none"
                                  />
                                ) : (
                                  <span title={row.deliveryAddress}>{row.deliveryAddress}</span>
                                )}
                              </td>

                              <td className="px-3 py-3 text-center">
                                {isEditing ? (
                                  <input 
                                    type="number" 
                                    step="0.1"
                                    value={editFormData.weight || 0} 
                                    onChange={(e) => handleEditFormChange('weight', parseFloat(e.target.value))}
                                    className="w-14 h-8 px-2 border border-outline-variant rounded-lg outline-none text-center"
                                  />
                                ) : (
                                  <span>{row.weight} kg</span>
                                )}
                              </td>

                              <td className="px-3 py-3 font-bold text-right font-mono text-slate-900">
                                {isEditing ? (
                                  <input 
                                    type="number" 
                                    value={editFormData.codAmount || 0} 
                                    onChange={(e) => handleEditFormChange('codAmount', parseInt(e.target.value) || 0)}
                                    className="w-16 h-8 px-2 border border-outline-variant rounded-lg outline-none text-right font-mono"
                                  />
                                ) : (
                                  <span>PKR {Number(row.codAmount || 0).toLocaleString()}</span>
                                )}
                              </td>

                              <td className="px-3 py-3 text-right font-mono text-red-600 font-semibold whitespace-nowrap">
                                - PKR {Number(row.serviceCharge || 0).toLocaleString()}
                              </td>

                              <td className="px-3 py-3 text-right font-mono font-bold whitespace-nowrap">
                                {row.payableToShipper >= 0 ? (
                                  <span className="text-emerald-700 font-black">PKR {Number(row.payableToShipper || 0).toLocaleString()}</span>
                                ) : (
                                  <span className="text-red-700 font-black">- PKR {Math.abs(Number(row.payableToShipper || 0)).toLocaleString()}</span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-center">
                                {isEditing ? (
                                  <div className="flex justify-center gap-1.5">
                                    <button 
                                      type="button"
                                      onClick={saveRowEdits}
                                      className="p-1.5 bg-primary text-white rounded-lg cursor-pointer"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={cancelRowEdits}
                                      className="p-1.5 bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex justify-center gap-1.5">
                                    <button 
                                      type="button"
                                      onClick={() => startEditingRow(row)}
                                      className="p-1.5 text-outline hover:text-primary rounded-lg cursor-pointer"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => deleteRow(row.id)}
                                      className="p-1.5 text-outline hover:text-error rounded-lg cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal for Pasting CSV Lines */}
        {/* SELECT BOOKED ORDER TO EDIT MODAL */}
        {showEditOrderModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div 
              style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh' }}
              className="bg-white rounded-2xl w-full p-6 shadow-2xl border border-outline-variant flex flex-col gap-4 animate-in zoom-in-95 duration-200 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b border-outline-variant pb-3 shrink-0">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-primary" /> Select Booked Order to Edit
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Only orders currently in <span className="font-bold text-emerald-700">Booked</span> status can be modified. Orders in transit or delivered are strictly locked.
                  </p>
                </div>
                <button 
                  onClick={() => setShowEditOrderModal(false)} 
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tracking #, name, city, phone..."
                    value={bookedOrdersSearch}
                    onChange={(e) => setBookedOrdersSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  {bookedOrdersSearch && (
                    <button 
                      onClick={() => setBookedOrdersSearch('')} 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setFilterOnlyBooked(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterOnlyBooked 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Only Booked (Eligible)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterOnlyBooked(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !filterOnlyBooked 
                        ? 'bg-slate-800 text-white' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Recent Orders
                  </button>
                  <button
                    type="button"
                    onClick={fetchBookedOrders}
                    title="Refresh orders"
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingBookedOrders ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Orders Table Container */}
              <div className="overflow-y-auto border border-slate-200 rounded-xl max-h-[50vh]">
                {loadingBookedOrders ? (
                  <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-7 h-7 text-primary animate-spin" />
                    <p className="text-xs text-slate-500 font-medium">Loading orders from database...</p>
                  </div>
                ) : filteredModalOrders.length === 0 ? (
                  <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
                    <Package className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No matching orders found</p>
                    <p className="text-xs text-slate-500">
                      {filterOnlyBooked ? 'No orders are currently in Booked status.' : 'Try adjusting your search criteria.'}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                      <tr>
                        <th className="px-3.5 py-2.5 font-bold text-slate-600">Tracking #</th>
                        <th className="px-3.5 py-2.5 font-bold text-slate-600">Consignee</th>
                        <th className="px-3.5 py-2.5 font-bold text-slate-600">Destination</th>
                        <th className="px-3.5 py-2.5 font-bold text-slate-600">COD / Wt</th>
                        <th className="px-3.5 py-2.5 font-bold text-slate-600">Status</th>
                        <th className="px-3.5 py-2.5 font-bold text-slate-600 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredModalOrders.map((order) => {
                        const s = String(order.status || '').toLowerCase().trim();
                        const isBooked = s === 'booked' || s === 'total booking' || s === 'pending';

                        return (
                          <tr 
                            key={order.id} 
                            className={`transition-colors ${isBooked ? 'hover:bg-primary-50/30' : 'bg-slate-50/50 opacity-75'}`}
                          >
                            <td className="px-3.5 py-3 font-mono font-bold text-primary">
                              {order.trackingNumber}
                            </td>
                            <td className="px-3.5 py-3">
                              <div className="font-semibold text-slate-800">{order.customerName}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{order.phone}</div>
                            </td>
                            <td className="px-3.5 py-3 max-w-[200px]">
                              <div className="font-bold text-slate-800 truncate flex items-center gap-1" title={order.address}>
                                <MapPin className="w-3 h-3 text-primary shrink-0" />
                                <span>{order.destinationCity || 'City Not Set'}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate" title={order.address}>{order.address}</div>
                            </td>
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <div className="font-bold text-slate-900">PKR {Number(order.codAmount).toLocaleString()}</div>
                              <div className="text-[11px] text-slate-500">{order.weight} kg</div>
                            </td>
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              {isBooked ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Booked
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                                  {order.status}
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              {isBooked ? (
                                <button
                                  type="button"
                                  onClick={() => handleSelectOrderToEdit(order)}
                                  className="px-3 py-1.5 bg-primary hover:bg-[#003ec7] text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 ml-auto cursor-pointer active:scale-95"
                                >
                                  <Edit3 className="w-3.5 h-3.5" /> Edit Order
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="px-3 py-1.5 bg-slate-100 text-slate-400 font-medium text-xs rounded-lg border border-slate-200 flex items-center gap-1.5 ml-auto cursor-not-allowed opacity-60"
                                  title={`Cannot edit: order is in '${order.status}' status. Only Booked orders can be edited.`}
                                >
                                  <Lock className="w-3 h-3 text-slate-400" /> Locked
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-between items-center border-t border-outline-variant pt-3 shrink-0">
                <span className="text-xs text-slate-500">
                  Showing {filteredModalOrders.length} order{filteredModalOrders.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowEditOrderModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showPasteModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div 
              style={{ width: '100%', maxWidth: '640px', minWidth: '320px' }}
              className="bg-white rounded-2xl w-full p-6 shadow-2xl border border-outline-variant flex flex-col gap-4 animate-in zoom-in-95 duration-200"
            >
              <div className="flex justify-between items-center border-b border-outline-variant pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" /> Paste Bulk Booking Sheet
                  </h3>
                  <p className="text-xs text-slate-500">Items sharing 1 order_id will be grouped together.</p>
                </div>
                <button onClick={() => setShowPasteModal(false)} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProcessBulkSheetPaste} className="flex flex-col gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-700 leading-relaxed font-mono">
                  <strong>Expected CSV Line Format:</strong><br />
                  <code>order_id, consignee_name, consignee_phone, consignee_address, shipper_name, shipper_address, item_name, cod_amount, shipping_type(In-House/3PL), 3pl_barcode</code>
                </div>

                <textarea
                  rows={6}
                  placeholder={`ORD-901, Ali Khan, +92 300 1112233, Gulberg II Lahore, Threads Store, Factory Road, Silk Shirt, 2500, In-House
ORD-901, Ali Khan, +92 300 1112233, Gulberg II Lahore, Threads Store, Factory Road, Denim Trousers, 3000, In-House`}
                  className="w-full p-3 border border-outline-variant rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  value={rawCsvText}
                  onChange={(e) => setRawCsvText(e.target.value)}
                  required
                />

                <div className="flex justify-end gap-2.5 border-t border-outline-variant pt-3">
                  <button
                    type="button"
                    onClick={() => setShowPasteModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Process & Group Orders
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* BARCODE STICKER LABEL PRINT MODAL */}
        {selectedOrderForLabel && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
            <div 
              style={{ width: '100%', maxWidth: '680px', minWidth: '320px' }}
              className="bg-white rounded-2xl w-full p-6 shadow-2xl border border-outline-variant flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh]"
            >
              <div className="flex justify-between items-center border-b border-outline-variant pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    Label Sticker Preview: <span className="font-mono text-primary">{selectedOrderForLabel.orderId}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedOrderForLabel.shippingType === 'In-House' ? '1 Barcode (In-House Shipping)' : '2 Barcodes (3PL Partner Shipping)'}
                  </p>
                </div>
                <button onClick={() => setSelectedOrderForLabel(null)} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
                {selectedOrderForLabel.items.map((item, index) => (
                  <div key={item.itemId} className="border-2 border-slate-900 rounded-2xl p-4 bg-white font-mono text-xs flex flex-col gap-3 shadow-sm">
                    <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
                      <span className="font-bold text-sm text-primary">DBArc Express Shipping</span>
                      <span className="text-[10px] font-bold border border-slate-900 px-2 py-0.5 rounded bg-slate-50">
                        Piece {index + 1} of {selectedOrderForLabel.items.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-b border-slate-900 pb-2 text-[10px]">
                      <div>
                        <span className="font-bold text-slate-500 uppercase block">Consignee Detail (To):</span>
                        <span className="font-bold text-slate-900 text-xs">{selectedOrderForLabel.consigneeName}</span>
                        <p className="text-slate-700">{selectedOrderForLabel.consigneePhone}</p>
                        <p className="text-slate-700 line-clamp-2">{selectedOrderForLabel.consigneeAddress}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 uppercase block">Shipper Detail (From):</span>
                        <span className="font-bold text-slate-900 text-xs">{selectedOrderForLabel.shipperName}</span>
                        <p className="text-slate-700 line-clamp-2">{selectedOrderForLabel.shipperAddress}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2 border border-slate-200 rounded text-[10px]">
                      <span className="font-bold text-slate-600">ITEM CONTENT:</span> {item.itemName} (ID: {item.itemId})
                    </div>

                    {selectedOrderForLabel.shippingType === 'In-House' ? (
                      <div className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-900 rounded">
                        <span className="text-[9px] font-bold text-slate-500 uppercase mb-1">In-House Primary Tracking Barcode</span>
                        <div className="flex items-center gap-0.5 h-10">
                          {[4,2,6,1,3,5,2,4,1,6,3,2,5,1,4,2,6,3,1,5,2,4,6,1,3,2,5,1,4].map((w, idx) => (
                            <div key={idx} className="bg-slate-900 h-full" style={{ width: `${w}px` }}></div>
                          ))}
                        </div>
                        <span className="text-sm font-bold tracking-widest mt-1 text-slate-900">{selectedOrderForLabel.primaryBarcode}</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-900 rounded">
                          <span className="text-[8px] font-bold text-slate-500 uppercase mb-1">Barcode 1: DBArc Primary</span>
                          <div className="flex items-center gap-0.5 h-8">
                            {[3,1,4,2,5,1,3,4,2,1,5,2,3,4,1,5,2].map((w, idx) => (
                              <div key={idx} className="bg-slate-900 h-full" style={{ width: `${w}px` }}></div>
                            ))}
                          </div>
                          <span className="text-xs font-bold tracking-wider mt-1 text-slate-900">{selectedOrderForLabel.primaryBarcode}</span>
                        </div>

                        <div className="flex flex-col items-center justify-center p-2 bg-purple-50 border border-purple-900 rounded">
                          <span className="text-[8px] font-bold text-purple-700 uppercase mb-1">Barcode 2: 3PL Partner</span>
                          <div className="flex items-center gap-0.5 h-8">
                            {[2,4,1,5,2,3,1,4,5,2,1,3,4,2,5,1,3].map((w, idx) => (
                              <div key={idx} className="bg-purple-950 h-full" style={{ width: `${w}px` }}></div>
                            ))}
                          </div>
                          <span className="text-xs font-bold tracking-wider mt-1 text-purple-950">{selectedOrderForLabel.secondary3PLBarcode}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1 font-sans">
                      <span className="text-[10px] font-bold text-slate-700">SHARED ORDER ID: {selectedOrderForLabel.orderId}</span>
                      <span className="text-sm font-bold text-slate-900">COD: PKR {item.codAmount?.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2.5 border-t border-outline-variant pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForLabel(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Item Labels
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Referenced Order Details Modal */}
        {showDetailsModal && selectedReferencedParcel && (() => {
          const parcelData = selectedReferencedParcel.attributes || selectedReferencedParcel;
          const trackingNo = parcelData.tracking_number || selectedReferencedParcel.tracking_number || 'N/A';
          const status = parcelData.status || selectedReferencedParcel.status || 'Booked';
          const weightVal = parcelData.weight || selectedReferencedParcel.weight || '0.5';
          const recipientName = parcelData.recipient_name || selectedReferencedParcel.recipient_name || 'N/A';
          const recipientPhone = parcelData.recipient_phone || selectedReferencedParcel.recipient_phone || 'N/A';
          const recipientAddress = parcelData.recipient_address || selectedReferencedParcel.recipient_address || 'N/A';
          const codVal = parcelData.cod_amount ?? selectedReferencedParcel.cod_amount ?? 0;
          const deliveryCharges = parcelData.delivery_charges ?? selectedReferencedParcel.delivery_charges ?? 0;
          const destCity = parcelData.destination_city || selectedReferencedParcel.destination_city || '';

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div 
                style={{ width: '100%', maxWidth: '560px', minWidth: '320px' }}
                className="bg-white rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 space-y-6 border border-slate-100 max-h-[90vh] overflow-y-auto"
              >
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4 pr-10">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-primary border border-blue-100 flex items-center justify-center shrink-0">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">Referenced Order Details</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                        {trackingNo}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Status */}
                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Current Status</span>
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-extrabold rounded-full inline-block leading-none border border-blue-200 uppercase text-[10px]">
                      {status}
                    </span>
                  </div>
                  
                  {/* Weight */}
                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Weight</span>
                    <span className="text-slate-800 font-bold text-sm block">{weightVal} kg</span>
                  </div>

                  {/* Recipient Name */}
                  <div className="space-y-1 col-span-2 sm:col-span-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Recipient Name</span>
                    <span className="text-slate-800 font-bold text-sm block">{recipientName}</span>
                  </div>

                  {/* Recipient Phone */}
                  <div className="space-y-1 col-span-2 sm:col-span-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Recipient Phone</span>
                    <span className="text-slate-800 font-bold text-sm font-mono block">{recipientPhone}</span>
                  </div>

                  {/* Delivery Address */}
                  <div className="space-y-1 col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Delivery Address</span>
                      {destCity && (
                        <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {destCity}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-800 font-medium leading-relaxed text-sm block pt-1">
                      {recipientAddress}
                    </span>
                  </div>

                  {/* COD Amount */}
                  <div className="space-y-1 bg-emerald-50 p-3.5 rounded-xl border border-emerald-100">
                    <span className="text-emerald-700 font-bold block uppercase tracking-wider text-[10px]">COD Amount</span>
                    <span className="text-emerald-900 font-black text-base font-mono">PKR {Number(codVal).toLocaleString()}</span>
                  </div>

                  {/* Delivery Charges */}
                  <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Delivery Charges</span>
                    <span className="text-slate-800 font-bold text-base font-mono">PKR {Number(deliveryCharges).toLocaleString()}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowDetailsModal(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ISOLATED PRINT AREA FOR BULK LABELS */}
      {selectedOrderForLabel && (
        <div id="bulk-label-print-area" className="hidden">
          {selectedOrderForLabel.items.map((item, index) => (
            <div key={item.itemId} style={{ width: '4in', height: '6in', border: '3px solid black', padding: '16px', fontFamily: 'monospace', color: 'black', background: 'white', pageBreakAfter: 'always', margin: '0 auto 20px auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid black', paddingBottom: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>DBArc Express Shipping</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Piece {index + 1} of {selectedOrderForLabel.items.length}</span>
              </div>

              <div style={{ borderBottom: '1px solid black', padding: '10px 0', fontSize: '11px' }}>
                <div><strong>ORDER ID:</strong> {selectedOrderForLabel.orderId}</div>
                <div><strong>CONSIGNEE:</strong> {selectedOrderForLabel.consigneeName} ({selectedOrderForLabel.consigneePhone})</div>
                <div><strong>ADDRESS:</strong> {selectedOrderForLabel.consigneeAddress}</div>
                <div><strong>SHIPPER:</strong> {selectedOrderForLabel.shipperName}</div>
              </div>

              <div style={{ padding: '8px 0', fontSize: '11px', borderBottom: '1px solid black' }}>
                <strong>ITEM:</strong> {item.itemName}
              </div>

              {selectedOrderForLabel.shippingType === 'In-House' ? (
                <div style={{ textAlign: 'center', margin: '16px 0', padding: '12px', border: '1px solid black' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '3px' }}>||| | ||| || ||| |||</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '6px' }}>{selectedOrderForLabel.primaryBarcode}</div>
                  <div style={{ fontSize: '10px', marginTop: '4px' }}>1 BARCODE (IN-HOUSE FULFILLMENT)</div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '8px', border: '1px solid black' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>||| || | |||</div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>{selectedOrderForLabel.primaryBarcode}</div>
                    <div style={{ fontSize: '9px' }}>BARCODE 1 (DBARC)</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '8px', border: '1px solid black' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>|| ||| | |||</div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>{selectedOrderForLabel.secondary3PLBarcode}</div>
                    <div style={{ fontSize: '9px' }}>BARCODE 2 (3PL PARTNER)</div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '16px' }}>
                <span><strong>TYPE:</strong> {selectedOrderForLabel.shippingType}</span>
                <span><strong>COD:</strong> PKR {item.codAmount?.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}

export default function BookShipmentPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 text-primary border-4 border-solid border-current border-r-transparent rounded-full" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    }>
      <BookShipmentForm />
    </React.Suspense>
  );
}
