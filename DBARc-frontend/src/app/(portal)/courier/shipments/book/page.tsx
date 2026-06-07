'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
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
  Trash
} from 'lucide-react';
import { apiClient } from '@/shared/api/api-client';
import { useAuthStore } from '@/shared/model/auth.store';

// Form validation schema using Zod for manual entry
const bookingSchema = z.object({
  consigneeName: z.string().min(2, 'Full name must be at least 2 characters'),
  consigneePhone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number (e.g. +923001234567)'),
  consigneeEmail: z.string().email('Invalid email address').or(z.literal('')),
  consigneeAltPhone: z.string().optional(),
  
  deliveryAddress: z.string().min(5, 'Delivery address is too short'),
  destinationCity: z.string().min(1, 'Please select a destination city'),
  area: z.string().optional(),
  
  weight: z.number().min(0.1, 'Weight must be at least 0.1 kg'),
  pieces: z.number().min(1, 'Must be at least 1 piece'),
  codAmount: z.number().min(0, 'COD amount cannot be negative'),
  productDescription: z.string().min(2, 'Product description is required'),
  serviceType: z.string().default('Overnight'),
  allowToOpen: z.string().default('No'),
  comments: z.string().optional(),
  
  pickupDate: z.string().min(1, 'Pickup date is required'),
  pickupTimeSlot: z.string().default('Morning (09 AM - 12 PM)'),
  specialInstructions: z.string().optional(),

  // Replacement Fields
  referenceNo: z.string().optional(),
  collectReplacement: z.string().default('No'),
  parcelDetail: z.string().optional(),
  collectRs: z.number().min(0, 'Collect Rs must be positive').or(z.literal(0)).optional(),
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

export default function BookShipmentPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
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

  const [uploadHistory, setUploadHistory] = React.useState<UploadHistoryItem[]>([
    { id: '1', fileName: 'shipments_karachi_june.xlsx', date: '2026-06-07 10:30 AM', count: 42, status: 'processed' },
    { id: '2', fileName: 'bulk_delivery_orders_v2.csv', date: '2026-06-06 02:15 PM', count: 120, status: 'processed' },
    { id: '3', fileName: 'test_shipments_invalid.xlsx', date: '2026-06-05 04:40 PM', count: 15, status: 'failed', error: 'Missing destinationCity column header' },
  ]);

  const todayStr = React.useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue,
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
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

  // Watch fields for estimated cost calculation
  const weight = watch('weight') || 0.5;

  // Calculate live quotes
  const pricing = React.useMemo(() => {
    const extraWeight = Math.max(0, weight - 0.5);
    const extraUnits = Math.ceil(extraWeight / 0.5);
    const baseRate = 250 + (extraUnits * 100);
    const surcharge = 35;
    const gst = Math.round((baseRate + surcharge) * 0.17 * 100) / 100;
    const total = Math.round((baseRate + surcharge + gst) * 100) / 100;

    return {
      baseRate,
      surcharge,
      gst,
      total,
    };
  }, [weight]);

  // Handle Autocomplete Search for Reference Number
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

  // Handle Manual Form Submission
  const onSubmit = async (data: BookingFormValues) => {
    setBookingStatus('submitting');
    setErrorMessage('');
    
    try {
      const trackingId = `DBA-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || user?.tenantId;

      const parcelRes = await apiClient.post('/parcels', {
        data: {
          tracking_number: trackingId,
          status: 'created',
          cod_amount: data.codAmount,
          weight: data.weight,
          delivery_charges: pricing.total,
          recipient_name: data.consigneeName,
          recipient_phone: data.consigneePhone,
          recipient_address: `${data.deliveryAddress}${data.area ? `, ${data.area}` : ''}, ${data.destinationCity}`,
          consignee_email: data.consigneeEmail,
          consignee_alt_phone: data.consigneeAltPhone,
          allow_to_open: data.allowToOpen,
          comments: data.comments,
          tenant: tenantId,
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
      }, 3000);

    } catch (err: any) {
      console.error('Failed to book shipment:', err);
      setErrorMessage(err.response?.data?.error?.message || 'Failed to connect to the server. Please try again.');
      setBookingStatus('error');
    }
  };

  // Drag and Drop handlers
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

  // Process the uploaded file
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

          const headers = lines[0].split(',').map(h => h.trim());
          const rows: any[] = [];

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(',').map(v => v.trim());
            const rowData: any = { id: `row-${i}` };

            headers.forEach((header, idx) => {
              const val = values[idx] || '';
              if (['weight', 'pieces', 'codAmount', 'collectRs'].includes(header)) {
                rowData[header] = val ? parseFloat(val) : 0;
              } else {
                rowData[header] = val;
              }
            });

            rowData.errors = validateSpreadsheetRow(rowData);
            rows.push(rowData);
          }

          setParsedRows(rows);
          setBulkProgress(100);
          setBulkStatus('loaded');
        } else {
          // Mock parse xlsx/xls with demonstration rows
          setTimeout(() => {
            const mockRows = [
              {
                id: 'row-1',
                consigneeName: 'Mohsin Khan',
                consigneePhone: '+923001234567',
                consigneeEmail: 'mohsin@example.com',
                consigneeAltPhone: '',
                deliveryAddress: 'House 56, Block D, Gulshan',
                destinationCity: 'Karachi',
                area: 'Gulshan-e-Iqbal',
                weight: 1.2,
                pieces: 1,
                codAmount: 3500,
                productDescription: 'Leather jacket',
                serviceType: 'Overnight',
                allowToOpen: 'Yes',
                comments: '',
                pickupDate: todayStr,
                pickupTimeSlot: 'Morning (09 AM - 12 PM)',
                specialInstructions: '',
                errors: {}
              },
              {
                id: 'row-2',
                consigneeName: 'Ayesha Bibi',
                consigneePhone: '+923', // Intentional error for edit demonstration
                consigneeEmail: 'ayesha@example.com',
                consigneeAltPhone: '',
                deliveryAddress: 'Street 4, Sector G-9',
                destinationCity: '', // Intentional error for edit demonstration
                area: 'G-9/2',
                weight: 0.5,
                pieces: 1,
                codAmount: 0,
                productDescription: 'Winter shawls',
                serviceType: 'Overnight',
                allowToOpen: 'No',
                comments: '',
                pickupDate: todayStr,
                pickupTimeSlot: 'Afternoon (12 PM - 04 PM)',
                specialInstructions: '',
                errors: {
                  consigneePhone: 'Invalid phone number format',
                  destinationCity: 'City required'
                }
              },
              {
                id: 'row-3',
                consigneeName: 'Usman Ali',
                consigneePhone: '+923331122334',
                consigneeEmail: 'usman@example.com',
                consigneeAltPhone: '',
                deliveryAddress: 'Office 12, Level 4, Tech Plaza, DHA',
                destinationCity: 'Lahore',
                area: 'DHA Phase 6',
                weight: 2.0,
                pieces: 2,
                codAmount: 12000,
                productDescription: 'Wireless earbuds',
                serviceType: 'Overnight',
                allowToOpen: 'No',
                comments: 'Urgent delivery',
                pickupDate: todayStr,
                pickupTimeSlot: 'Evening (04 PM - 08 PM)',
                specialInstructions: '',
                referenceNo: 'DBA-MOCK987',
                collectReplacement: 'Yes',
                parcelDetail: 'Old wired headphones',
                collectRs: 150,
                errors: {}
              }
            ];
            setParsedRows(mockRows);
            setBulkProgress(100);
            setBulkStatus('loaded');
          }, 800);
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
      // Trigger reader load dynamically for xlsx mock
      reader.onload({} as any);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setEditingRowId(null);
    setBulkStatus('idle');
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
    // Re-validate row on saving changes
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

  // Check if grid has any validation errors
  const gridHasErrors = React.useMemo(() => {
    return parsedRows.some(row => Object.keys(row.errors || {}).length > 0);
  }, [parsedRows]);

  // Real CSV template downloader
  const downloadTemplate = () => {
    const headers = [
      'consigneeName',
      'consigneePhone',
      'consigneeEmail',
      'consigneeAltPhone',
      'deliveryAddress',
      'destinationCity',
      'area',
      'weight',
      'pieces',
      'codAmount',
      'productDescription',
      'serviceType',
      'allowToOpen',
      'comments',
      'pickupDate',
      'pickupTimeSlot',
      'specialInstructions',
      'referenceNo',
      'collectReplacement',
      'parcelDetail',
      'collectRs'
    ];
    const sampleRow = [
      'John Doe',
      '+923001234567',
      'john.doe@example.com',
      '+923007654321',
      'House 12 Street 5 Sector F',
      'Islamabad',
      'G-11/3',
      '1.5',
      '1',
      '2500',
      'Leather Shoes',
      'Overnight',
      'Yes',
      'Deliver in evening',
      todayStr,
      'Morning (09 AM - 12 PM)',
      'Call customer before delivery',
      'DBA-MOCK987',
      'Yes',
      'Exchange with brown leather boots',
      '150'
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), sampleRow.join(",")].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "dbarc_bulk_shipment_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Batch booking creator
  const importAndProcessShipments = async () => {
    if (gridHasErrors || parsedRows.length === 0) return;

    setBulkStatus('uploading');
    setBulkProgress(0);
    setErrorMessage('');

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || user?.tenantId;
    let successCount = 0;

    try {
      for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        
        // Dynamic calculations for each row's weight
        const extraWeight = Math.max(0, row.weight - 0.5);
        const extraUnits = Math.ceil(extraWeight / 0.5);
        const deliveryCharge = 250 + (extraUnits * 100) + 35; // base + fuel + gst (approx)
        const trackingId = `DBA-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        // 1. Post Parcel
        const parcelRes = await apiClient.post('/parcels', {
          data: {
            tracking_number: trackingId,
            status: 'created',
            cod_amount: row.codAmount || 0,
            weight: row.weight || 0.5,
            delivery_charges: deliveryCharge,
            recipient_name: row.consigneeName,
            recipient_phone: row.consigneePhone,
            recipient_address: `${row.deliveryAddress}${row.area ? `, ${row.area}` : ''}, ${row.destinationCity}`,
            consignee_email: row.consigneeEmail || '',
            consignee_alt_phone: row.consigneeAltPhone || '',
            allow_to_open: row.allowToOpen || 'No',
            comments: row.comments || '',
            tenant: tenantId,
          }
        });

        const newParcelId = parcelRes.data.data.id;

        // 2. Post Replacement if reference number is associated
        if (row.referenceNo && row.referenceNo.trim().length > 3) {
          // Attempt to locate old parcel ID by tracking number
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

      // Update upload history
      const newHistoryItem: UploadHistoryItem = {
        id: String(Date.now()),
        fileName: selectedFile?.name || 'bulk_shipments.csv',
        date: new Date().toLocaleString(),
        count: successCount,
        status: 'processed'
      };
      setUploadHistory(prev => [newHistoryItem, ...prev]);

      setTimeout(() => {
        clearSelectedFile();
      }, 3000);

    } catch (err: any) {
      console.error("Batch processing failed:", err);
      setErrorMessage("An error occurred during batch booking. Please try again.");
      setBulkStatus('loaded');
    }
  };

  const autofillRecent = () => {
    setBookingMode('manual');
    setValue('consigneeName', 'Muhammad Ahmed');
    setValue('consigneePhone', '+923214567890');
    setValue('consigneeEmail', 'muhammad.ahmed@example.com');
    setValue('consigneeAltPhone', '+923009876543');
    setValue('deliveryAddress', 'Apartment 4B, Building C, DHA Phase 5');
    setValue('destinationCity', 'Lahore');
    setValue('area', 'DHA Phase 5');
    setValue('productDescription', 'Clothing Apparel');
    setValue('allowToOpen', 'Yes');
    setValue('comments', 'Open packaging check allowed by shipper.');
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6 relative">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/courier/shipments" className="hover:text-[#003ec7] transition-colors">
              Shipments
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-900">Book Shipment</span>
          </nav>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Book New Shipment</h1>
        </div>
        
        {/* Header Action Buttons */}
        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={downloadTemplate}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <FileDown className="h-4 w-4 text-[#003ec7]" /> Download Sheet
          </button>
          
          <button 
            onClick={() => setBookingMode('bulk')}
            className={`px-4 py-2.5 border font-semibold text-sm rounded-xl transition-all flex items-center gap-2 shadow-sm
              ${bookingMode === 'bulk' 
                ? 'bg-blue-50 border-blue-200 text-[#003ec7]' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'}`}
          >
            <FileUp className="h-4 w-4 text-[#003ec7]" /> Upload Shipments
          </button>

          <Link 
            href="/courier/shipments"
            className="px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Link>
          
          {bookingMode === 'manual' && (
            <button 
              onClick={handleSubmit(onSubmit)}
              disabled={bookingStatus === 'submitting' || bookingStatus === 'success'}
              className={`px-5 py-2.5 font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center gap-2 text-white
                ${bookingStatus === 'success' 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-[#003ec7] hover:bg-[#0052ff] active:scale-95'}`}
            >
              {bookingStatus === 'submitting' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              )}
              {bookingStatus === 'success' && (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Booked!
                </>
              )}
              {bookingStatus === 'idle' && (
                <>
                  <Save className="h-4 w-4" />
                  Create Shipment
                </>
              )}
              {bookingStatus === 'error' && (
                <>
                  <Save className="h-4 w-4" />
                  Retry Booking
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Manual Status Banners */}
      {bookingMode === 'manual' && bookingStatus === 'success' && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold">Shipment Booked Successfully!</p>
            <p className="text-sm">Tracking ID generated: <strong className="font-mono text-slate-900">{createdTrackingId}</strong></p>
          </div>
        </div>
      )}

      {bookingMode === 'manual' && bookingStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <Info className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <p className="font-bold">Booking Failed</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Grid Section */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Form Canvas or Bulk Uploader */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Navigation/Mode Tabs */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex w-fit gap-1 border border-slate-200">
            <button
              onClick={() => setBookingMode('manual')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2
                ${bookingMode === 'manual' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'}`}
            >
              <User className="h-3.5 w-3.5" />
              Manual Single Entry
            </button>
            <button
              onClick={() => setBookingMode('bulk')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2
                ${bookingMode === 'bulk' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'}`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Bulk Spreadsheet Upload
            </button>
          </div>

          {bookingMode === 'manual' ? (
            /* Manual Booking Form Canvas */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Section 1: Consignee Details */}
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#003ec7] flex items-center justify-center shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Consignee Detail</h2>
                    <p className="text-xs text-slate-500">Recipient&apos;s contact and delivery information</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Full Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. John Doe"
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all"
                      {...register('consigneeName')}
                    />
                    {errors.consigneeName && (
                      <p className="text-xs font-semibold text-red-500 mt-1">{errors.consigneeName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Phone Number *</label>
                    <input 
                      type="tel" 
                      placeholder="+92 300 1234567"
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all"
                      {...register('consigneePhone')}
                    />
                    {errors.consigneePhone && (
                      <p className="text-xs font-semibold text-red-500 mt-1">{errors.consigneePhone.message}</p>
                    )}
                  </div>

                  {/* Consignee Email (@mail) */}
                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">@mail</label>
                    <input 
                      type="email" 
                      placeholder="e.g. john.doe@email.com"
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all"
                      {...register('consigneeEmail')}
                    />
                    {errors.consigneeEmail && (
                      <p className="text-xs font-semibold text-red-500 mt-1">{errors.consigneeEmail.message}</p>
                    )}
                  </div>

                  {/* Alternate Phone (Alt. Cell #) */}
                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Alt. Cell #</label>
                    <input 
                      type="tel" 
                      placeholder="+92 300 7654321"
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all"
                      {...register('consigneeAltPhone')}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Delivery Address *</label>
                    <textarea 
                      placeholder="Street address, building, floor..." 
                      rows={2}
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all resize-none"
                      {...register('deliveryAddress')}
                    />
                    {errors.deliveryAddress && (
                      <p className="text-xs font-semibold text-red-500 mt-1">{errors.deliveryAddress.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Destination City *</label>
                    <select 
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all bg-white"
                      {...register('destinationCity')}
                    >
                      <option value="">Select City</option>
                      <option value="Karachi">Karachi</option>
                      <option value="Lahore">Lahore</option>
                      <option value="Islamabad">Islamabad</option>
                      <option value="Faisalabad">Faisalabad</option>
                      <option value="Rawalpindi">Rawalpindi</option>
                      <option value="Multan">Multan</option>
                      <option value="Peshawar">Peshawar</option>
                      <option value="Quetta">Quetta</option>
                    </select>
                    {errors.destinationCity && (
                      <p className="text-xs font-semibold text-red-500 mt-1">{errors.destinationCity.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Area/Locality</label>
                    <input 
                      type="text" 
                      placeholder="DHA Phase 6"
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all"
                      {...register('area')}
                    />
                  </div>
                </div>
              </section>

              {/* Section 2: Shipment Detail */}
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#003ec7] flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Shipment Detail</h2>
                    <p className="text-xs text-slate-500">Package weight, contents, and value</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Weight (kg) *</label>
                    <input 
                      type="number" 
                      step="0.1"
                      placeholder="0.5"
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all"
                      {...register('weight', { valueAsNumber: true })}
                    />
                    {errors.weight && (
                      <p className="text-xs font-semibold text-red-500 mt-1">{errors.weight.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Pieces *</label>
                    <input 
                      type="number" 
                      placeholder="1"
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all"
                      {...register('pieces', { valueAsNumber: true })}
                    />
                    {errors.pieces && (
                      <p className="text-xs font-semibold text-red-500 mt-1">{errors.pieces.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">COD Amount (PKR)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all"
                      {...register('codAmount', { valueAsNumber: true })}
                    />
                    {errors.codAmount && (
                      <p className="text-xs font-semibold text-red-500 mt-1">{errors.codAmount.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Product Description *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Electronics, Clothing"
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all"
                      {...register('productDescription')}
                    />
                    {errors.productDescription && (
                      <p className="text-xs font-semibold text-red-500 mt-1">{errors.productDescription.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Service Type</label>
                    <select 
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all bg-white"
                      {...register('serviceType')}
                    >
                      <option value="Overnight">Overnight</option>
                      <option value="Detained">Detained</option>
                      <option value="Second Day">Second Day</option>
                    </select>
                  </div>

                  {/* Allow To Open Dropdown */}
                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Allow To Open</label>
                    <select 
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all bg-white"
                      {...register('allowToOpen')}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  {/* Comments Textarea */}
                  <div className="md:col-span-2 space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Comments</label>
                    <textarea 
                      placeholder="Add any specific comments or remarks..." 
                      rows={2}
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all resize-none"
                      {...register('comments')}
                    />
                  </div>
                </div>
              </section>

              {/* Section 3: Collection Detail */}
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#003ec7] flex items-center justify-center shrink-0">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Collection Detail</h2>
                    <p className="text-xs text-slate-500 font-medium">Pickup timing and special instructions</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Pickup Date</label>
                    <input 
                      type="date" 
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all bg-white"
                      {...register('pickupDate')}
                    />
                    {errors.pickupDate && (
                      <p className="text-xs font-semibold text-red-500 mt-1">{errors.pickupDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Pickup Time Slot</label>
                    <select 
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all bg-white"
                      {...register('pickupTimeSlot')}
                    >
                      <option value="Morning (09 AM - 12 PM)">Morning (09 AM - 12 PM)</option>
                      <option value="Afternoon (12 PM - 04 PM)">Afternoon (12 PM - 04 PM)</option>
                      <option value="Evening (04 PM - 08 PM)">Evening (04 PM - 08 PM)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Special Instructions</label>
                    <textarea 
                      placeholder="Fragile item, call before arrival..." 
                      rows={2}
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all resize-none"
                      {...register('specialInstructions')}
                    />
                  </div>
                </div>
              </section>

              {/* Section 4: Replacement / Collection Detail */}
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#003ec7] flex items-center justify-center shrink-0">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Replacement / Collection Detail</h2>
                    <p className="text-xs text-slate-500">Record returns and exchange collections</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 relative group">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Reference No (Old Booking)</label>
                      {selectedReferencedParcel && (
                        <button
                          type="button"
                          onClick={() => setShowDetailsModal(true)}
                          className="text-xs font-bold text-[#003ec7] hover:underline flex items-center gap-1 leading-none"
                        >
                          <Eye className="h-3 w-3" /> Order Details
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Search tracking number (e.g. DBA-...)"
                        value={refSearchQuery}
                        onChange={(e) => {
                          setRefSearchQuery(e.target.value);
                          if (selectedReferencedParcel) {
                            setSelectedReferencedParcel(null);
                            setValue('referenceNo', '');
                          }
                        }}
                        className="w-full h-10 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all"
                      />
                      <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                      {searchingRef && (
                        <Loader2 className="h-4 w-4 text-slate-400 animate-spin absolute right-3 top-3" />
                      )}
                    </div>

                    {showRefDropdown && refParcelsList.length > 0 && (
                      <div className="absolute left-0 right-0 top-[68px] z-50 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {refParcelsList.map((parcel) => (
                          <button
                            key={parcel.id}
                            type="button"
                            onClick={() => selectReferenceOrder(parcel)}
                            className="w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 transition-colors text-slate-800 flex justify-between items-center"
                          >
                            <span>{parcel.tracking_number}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{parcel.recipient_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Collect Replacement</label>
                    <select 
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all bg-white"
                      {...register('collectReplacement')}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Parcel Detail</label>
                    <input 
                      type="text" 
                      placeholder="Replacement item detail..."
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all"
                      {...register('parcelDetail')}
                    />
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 group-focus-within:text-[#003ec7] transition-all">Collect Rs.</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#003ec7] focus:ring-1 focus:ring-[#003ec7] outline-none transition-all"
                      {...register('collectRs', { valueAsNumber: true })}
                    />
                    {errors.collectRs && (
                      <p className="text-xs font-semibold text-red-500 mt-1">{errors.collectRs.message}</p>
                    )}
                  </div>
                </div>
              </section>
            </form>
          ) : (
            /* Bulk Upload Uploader Canvas & Grid */
            <div className="space-y-6">
              {/* Uploader Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#003ec7] flex items-center justify-center shrink-0">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Bulk Shipment Upload</h2>
                    <p className="text-xs text-slate-500 font-medium">Book hundreds of shipments concurrently via spreadsheet</p>
                  </div>
                </div>

                {/* Drag & Drop Zone */}
                {bulkStatus === 'idle' || bulkStatus === 'parsing' ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`w-full min-h-[220px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition-all relative
                      ${dragActive 
                        ? 'bg-blue-50/50 border-[#003ec7] scale-[1.01]' 
                        : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'}`}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                    />

                    {bulkStatus === 'parsing' ? (
                      <div className="space-y-4 w-full max-w-sm">
                        <Loader2 className="h-10 w-10 text-[#003ec7] animate-spin mx-auto" />
                        <p className="text-sm font-semibold text-slate-700">Parsing spreadsheet rows...</p>
                      </div>
                    ) : (
                      <label htmlFor="file-upload" className="cursor-pointer space-y-3 flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                          <UploadCloud className="h-6 w-6 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            Drag and drop your spreadsheet here, or <span className="text-[#003ec7] hover:underline">browse files</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Supports Excel (.xlsx, .xls) and CSV (.csv) sheets up to 10MB
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                ) : (
                  /* File Info & Submit Progress card */
                  <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileSpreadsheet className="h-8 w-8 text-[#003ec7] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{selectedFile?.name}</p>
                        <p className="text-xs text-slate-400">{(selectedFile!.size / 1024).toFixed(1)} KB • {parsedRows.length} rows</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {bulkStatus === 'uploading' ? (
                        <div className="flex items-center gap-3">
                          <Loader2 className="h-4 w-4 text-[#003ec7] animate-spin" />
                          <span className="text-xs font-bold text-[#003ec7]">{bulkProgress}%</span>
                        </div>
                      ) : bulkStatus === 'success' ? (
                        <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4" /> Booked!
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={clearSelectedFile}
                            className="px-3.5 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Trash className="h-3.5 w-3.5" /> Clear
                          </button>
                          <button
                            onClick={importAndProcessShipments}
                            disabled={gridHasErrors}
                            className={`px-4 py-1.5 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5
                              ${gridHasErrors 
                                ? 'bg-slate-300 cursor-not-allowed' 
                                : 'bg-[#003ec7] hover:bg-[#0052ff] active:scale-95'}`}
                          >
                            <Save className="h-3.5 w-3.5" /> Create Shipments
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Templates Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">Spreadsheet Template Download</p>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Download our format to ensure columns map correctly (consigneeName, consigneePhone, deliveryAddress, etc.)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="h-9 px-4 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:border-slate-300 hover:bg-slate-100/50 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <FileDown className="h-3.5 w-3.5 text-[#003ec7]" /> Get CSV Template
                  </button>
                </div>
              </div>

              {/* INTERACTIVE EDITABLE GRID (Only visible when file is loaded) */}
              {parsedRows.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Loaded Shipments Grid</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Edit rows to correct error highlights before booking</p>
                    </div>

                    {gridHasErrors && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4" /> Please resolve errors to unlock Create Shipments.
                      </div>
                    )}
                  </div>

                  {/* Grid Table Container */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Recipient Name</th>
                          <th className="px-4 py-3">Phone</th>
                          <th className="px-4 py-3">Destination City</th>
                          <th className="px-4 py-3">Address</th>
                          <th className="px-4 py-3">Weight (Kg)</th>
                          <th className="px-4 py-3">COD (PKR)</th>
                          <th className="px-4 py-3">Ref No</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {parsedRows.map((row, index) => {
                          const isEditing = editingRowId === row.id;
                          const hasErrors = Object.keys(row.errors || {}).length > 0;

                          return (
                            <tr 
                              key={row.id} 
                              className={`transition-colors
                                ${hasErrors ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-slate-50/40'}`}
                            >
                              {/* Row Index / Error Icon */}
                              <td className="px-4 py-3">
                                {hasErrors ? (
                                  <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" title={Object.values(row.errors).join(', ')} />
                                ) : (
                                  index + 1
                                )}
                              </td>

                              {/* Recipient Name */}
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <input 
                                    type="text" 
                                    value={editFormData.consigneeName || ''} 
                                    onChange={(e) => handleEditFormChange('consigneeName', e.target.value)}
                                    className={`w-28 h-8 px-2 border rounded-lg outline-none
                                      ${editFormData.errors?.consigneeName ? 'border-red-400 focus:ring-1 focus:ring-red-400' : 'border-slate-200 focus:border-[#003ec7]'}`}
                                  />
                                ) : (
                                  <span>{row.consigneeName}</span>
                                )}
                              </td>

                              {/* Phone */}
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <input 
                                    type="text" 
                                    value={editFormData.consigneePhone || ''} 
                                    onChange={(e) => handleEditFormChange('consigneePhone', e.target.value)}
                                    className={`w-28 h-8 px-2 border rounded-lg outline-none
                                      ${editFormData.errors?.consigneePhone ? 'border-red-400 focus:ring-1 focus:ring-red-400' : 'border-slate-200 focus:border-[#003ec7]'}`}
                                  />
                                ) : (
                                  <span className="font-mono">{row.consigneePhone}</span>
                                )}
                              </td>

                              {/* Destination City */}
                              <td className="px-4 py-3 font-semibold">
                                {isEditing ? (
                                  <select 
                                    value={editFormData.destinationCity || ''} 
                                    onChange={(e) => handleEditFormChange('destinationCity', e.target.value)}
                                    className={`h-8 px-1.5 border rounded-lg outline-none bg-white
                                      ${editFormData.errors?.destinationCity ? 'border-red-400 focus:ring-1 focus:ring-red-400' : 'border-slate-200 focus:border-[#003ec7]'}`}
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

                              {/* Address */}
                              <td className="px-4 py-3 max-w-[150px] truncate">
                                {isEditing ? (
                                  <input 
                                    type="text" 
                                    value={editFormData.deliveryAddress || ''} 
                                    onChange={(e) => handleEditFormChange('deliveryAddress', e.target.value)}
                                    className={`w-36 h-8 px-2 border rounded-lg outline-none
                                      ${editFormData.errors?.deliveryAddress ? 'border-red-400 focus:ring-1 focus:ring-red-400' : 'border-slate-200 focus:border-[#003ec7]'}`}
                                  />
                                ) : (
                                  <span title={row.deliveryAddress}>{row.deliveryAddress}</span>
                                )}
                              </td>

                              {/* Weight */}
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <input 
                                    type="number" 
                                    step="0.1"
                                    value={editFormData.weight || 0} 
                                    onChange={(e) => handleEditFormChange('weight', parseFloat(e.target.value))}
                                    className={`w-14 h-8 px-2 border rounded-lg outline-none
                                      ${editFormData.errors?.weight ? 'border-red-400 focus:ring-1 focus:ring-red-400' : 'border-slate-200 focus:border-[#003ec7]'}`}
                                  />
                                ) : (
                                  <span>{row.weight} kg</span>
                                )}
                              </td>

                              {/* COD Amount */}
                              <td className="px-4 py-3 font-bold">
                                {isEditing ? (
                                  <input 
                                    type="number" 
                                    value={editFormData.codAmount || 0} 
                                    onChange={(e) => handleEditFormChange('codAmount', parseInt(e.target.value))}
                                    className={`w-16 h-8 px-2 border rounded-lg outline-none
                                      ${editFormData.errors?.codAmount ? 'border-red-400 focus:ring-1 focus:ring-red-400' : 'border-slate-200 focus:border-[#003ec7]'}`}
                                  />
                                ) : (
                                  <span>PKR {row.codAmount}</span>
                                )}
                              </td>

                              {/* Reference No */}
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <input 
                                    type="text" 
                                    value={editFormData.referenceNo || ''} 
                                    onChange={(e) => handleEditFormChange('referenceNo', e.target.value)}
                                    className="w-20 h-8 px-2 border border-slate-200 rounded-lg outline-none focus:border-[#003ec7]"
                                  />
                                ) : (
                                  <span className="font-mono text-slate-500">{row.referenceNo || '-'}</span>
                                )}
                              </td>

                              {/* Actions (Edit / Delete) */}
                              <td className="px-4 py-3 text-center">
                                {isEditing ? (
                                  <div className="flex justify-center gap-1.5">
                                    <button 
                                      type="button"
                                      onClick={saveRowEdits}
                                      className="p-1.5 bg-[#003ec7] text-white rounded-lg hover:bg-[#0052ff] transition-colors"
                                      title="Save Row"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={cancelRowEdits}
                                      className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
                                      title="Cancel Changes"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex justify-center gap-1.5">
                                    <button 
                                      type="button"
                                      onClick={() => startEditingRow(row)}
                                      className="p-1.5 text-slate-400 hover:text-[#003ec7] hover:bg-slate-50 rounded-lg transition-colors"
                                      title="Edit Row"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => deleteRow(row.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete Row"
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

              {/* Upload History Section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Recent Upload Activity</h3>
                <div className="divide-y divide-slate-100">
                  {uploadHistory.map((item) => (
                    <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                          ${item.status === 'processed' ? 'bg-emerald-50 text-emerald-600' : 
                            item.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.fileName}</p>
                          <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>{item.date}</span>
                            <span>•</span>
                            <span>{item.count} items</span>
                          </div>
                          {item.error && (
                            <p className="text-[10px] text-red-500 font-semibold mt-0.5 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> {item.error}
                            </p>
                          )}
                        </div>
                      </div>

                      <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold capitalize leading-none shrink-0
                        ${item.status === 'processed' ? 'bg-emerald-100 text-emerald-800' : 
                          item.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Quote Card, Bento, and Alerts */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Visual Anchor Image */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-48 relative group">
            <img 
              alt="Fly Courier Dashboard Overview" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCso3PSLKmhfWtz_0bE_k1jKISWASyYG_trC5Meib2KR22S3asUQMdzdsqT_MQHhLRhuIJ_4BovlNzry9o2vwBDrotvIgIJfl2mc0DnQsvxVYTtckFLOzoAVRGj2rdUaRjtQL1eQMZyAOrfZ2FByat4DsDvFhncMl4G1pfu2_tC6jDpBetNsNVC3xWT-2dRceBU07IMQr1wmsyF2zGlVHh4V9NsiM9lMzR27NOhJpP2HacGcpd2oD179mMPZgSBmNy2hX5uEpv8YOw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent flex items-end p-4">
              <p className="text-white text-xs font-bold">Current Logistics Performance Dashboard</p>
            </div>
          </div>

          {/* Dynamic Card based on mode */}
          {bookingMode === 'manual' ? (
            /* Live Quote Card (Manual Mode) */
            <div className="bg-[#003ec7] text-white rounded-2xl p-6 shadow-md space-y-4 animate-in fade-in duration-300">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Estimated Cost
              </h3>
              
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center opacity-85">
                  <span>Base Rate</span>
                  <span className="font-mono">PKR {pricing.baseRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center opacity-85">
                  <span>Fuel Surcharge</span>
                  <span className="font-mono">PKR {pricing.surcharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center opacity-85 border-b border-white/20 pb-3">
                  <span>GST (17%)</span>
                  <span className="font-mono">PKR {pricing.gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-base">Total</span>
                  <span className="font-bold text-2xl tracking-tight font-mono">PKR {pricing.total.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-[10px] uppercase tracking-wider opacity-60 text-center font-semibold">Final price calculated at warehouse</p>
            </div>
          ) : (
            /* Bulk Information Card (Bulk Mode) */
            <div className="bg-[#003ec7] text-white rounded-2xl p-6 shadow-md space-y-4 animate-in fade-in duration-300">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Bulk Summary
              </h3>
              <div className="space-y-3 text-xs leading-relaxed">
                <div className="p-3 bg-white/10 rounded-xl flex flex-col gap-1.5">
                  <p className="font-bold text-slate-100">Status Check</p>
                  <p className="opacity-90 font-medium">
                    {selectedFile ? `File loaded: ${selectedFile.name}` : 'Waiting for file selection...'}
                  </p>
                </div>
                <p className="opacity-80">
                  Spreadsheet records are loaded in-memory inside the editable grid. You can modify any row details dynamically to solve cell validation errors before proceeding.
                </p>
              </div>
            </div>
          )}

          {/* Helpful Tips Bento / Quick Actions */}
          <div className="bg-slate-100 rounded-2xl p-6 space-y-4">
            <h4 className="text-xs text-[#003ec7] font-extrabold uppercase tracking-wider">Quick Actions</h4>
            
            <button 
              type="button"
              onClick={autofillRecent}
              className="w-full p-4 bg-white rounded-xl border border-slate-200 flex items-center gap-3 hover:border-[#003ec7] transition-all text-left shadow-sm active:scale-[0.98] group"
            >
              <History className="h-5 w-5 text-[#003ec7] shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800">Recent Recipients</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Autofill form from past bookings</p>
              </div>
            </button>
            
            <button 
              type="button"
              onClick={() => setBookingMode('bulk')}
              className="w-full p-4 bg-white rounded-xl border border-slate-200 flex items-center gap-3 hover:border-[#003ec7] transition-all text-left shadow-sm active:scale-[0.98] group"
            >
              <UploadCloud className="h-5 w-5 text-[#003ec7] shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800">Upload Shipments</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Switch to spreadsheet import view</p>
              </div>
            </button>
            
            <button 
              type="button"
              onClick={downloadTemplate}
              className="w-full p-4 bg-white rounded-xl border border-slate-200 flex items-center gap-3 hover:border-[#003ec7] transition-all text-left shadow-sm active:scale-[0.98] group"
            >
              <FileDown className="h-5 w-5 text-[#003ec7] shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800">Download Template</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Get blank template CSV sheet</p>
              </div>
            </button>
          </div>

          {/* Info Alert */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-3 text-sm text-[#003ec7]">
            <Info className="h-5 w-5 shrink-0" />
            <p className="leading-relaxed">
              Please ensure the consignee&apos;s phone number is correct. Courier will send a tracking link via SMS upon collection.
            </p>
          </div>
        </div>
      </div>

      {/* Referenced Order Details Modal Overlay Popup */}
      {showDetailsModal && selectedReferencedParcel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 space-y-6">
            <button
              type="button"
              onClick={() => setShowDetailsModal(false)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#003ec7] flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Referenced Order Details</h3>
                <p className="text-xs text-slate-500 font-medium font-mono">{selectedReferencedParcel.tracking_number}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Status</span>
                <span className="px-2.5 py-1 bg-blue-50 text-[#003ec7] font-extrabold rounded-full inline-block leading-none border border-blue-100 uppercase text-[10px]">
                  {selectedReferencedParcel.status}
                </span>
              </div>
              
              <div className="space-y-1">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Weight (Kg)</span>
                <span className="text-slate-800 font-bold text-sm">{selectedReferencedParcel.weight || '0.5'} kg</span>
              </div>

              <div className="space-y-1 col-span-2">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Recipient Name</span>
                <span className="text-slate-800 font-bold text-sm">{selectedReferencedParcel.recipient_name}</span>
              </div>

              <div className="space-y-1 col-span-2">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Recipient Phone</span>
                <span className="text-slate-800 font-bold text-sm">{selectedReferencedParcel.recipient_phone}</span>
              </div>

              <div className="space-y-1 col-span-2">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Delivery Address</span>
                <span className="text-slate-800 font-semibold leading-relaxed text-sm block bg-slate-50 p-3 border border-slate-100 rounded-xl">
                  {selectedReferencedParcel.recipient_address}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">COD Amount</span>
                <span className="text-slate-800 font-bold text-sm">PKR {selectedReferencedParcel.cod_amount || 0}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Delivery Charges</span>
                <span className="text-slate-800 font-bold text-sm">PKR {selectedReferencedParcel.delivery_charges || 0}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="px-4.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
