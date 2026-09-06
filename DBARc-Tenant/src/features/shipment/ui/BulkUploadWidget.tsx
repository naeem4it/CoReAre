'use client';

import * as React from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, XCircle, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent } from '@/shared/ui/Card';
import { cn } from '@/shared/lib/utils';
import { apiClient } from '@/shared/api/api-client';
import { useAuthStore } from '@/shared/model/auth.store';

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: string;
}

interface ParsedRow {
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  destination_city: string;
  cod_amount: number;
  weight: number;
  pieces: number;
  comments?: string;
}

export const BulkUploadWidget = () => {
  const { user } = useAuthStore();
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'parsing' | 'validating' | 'uploading' | 'done'>('idle');
  const [progress, setProgress] = React.useState(0);
  const [errors, setErrors] = React.useState<ValidationError[]>([]);
  const [successCount, setSuccessCount] = React.useState(0);
  const [cities, setCities] = React.useState<any[]>([]);

  React.useEffect(() => {
    // Fetch cities for validation
    apiClient.get('/cities?pagination[pageSize]=500')
      .then((res) => setCities(res.data?.data || []))
      .catch(() => {});
  }, []);

  const downloadTemplate = () => {
    const csvContent = 'recipient_name,recipient_phone,recipient_address,destination_city,cod_amount,weight,pieces,comments\n';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'DBARc_Bulk_Shipment_Template.csv';
    link.click();
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please select a valid CSV file.');
      return;
    }

    setUploadStatus('parsing');
    setProgress(20);
    setErrors([]);
    setSuccessCount(0);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setUploadStatus('idle');
        return;
      }

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        setErrors([{ row: 1, field: 'File', message: 'CSV file contains no data rows.', value: '' }]);
        setUploadStatus('done');
        return;
      }

      setUploadStatus('validating');
      setProgress(40);

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
      const validationErrors: ValidationError[] = [];
      const validRows: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rawLine = lines[i];
        // Handle comma within quotes
        const cols: string[] = [];
        let inQuotes = false;
        let currentCol = '';
        for (let char of rawLine) {
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cols.push(currentCol.trim());
            currentCol = '';
          } else {
            currentCol += char;
          }
        }
        cols.push(currentCol.trim());

        if (cols.length < 4) continue;

        const rowData: any = {};
        headers.forEach((h, idx) => {
          rowData[h] = cols[idx] ? cols[idx].replace(/^["']|["']$/g, '') : '';
        });

        const name = rowData.recipient_name || rowData.name || cols[0];
        const phone = rowData.recipient_phone || rowData.phone || cols[1];
        const address = rowData.recipient_address || rowData.address || cols[2];
        const city = rowData.destination_city || rowData.city || cols[3];
        const cod = parseFloat(rowData.cod_amount || rowData.cod || cols[4] || '0');
        const weight = parseFloat(rowData.weight || cols[5] || '0.5');
        const pieces = parseInt(rowData.pieces || cols[6] || '1', 10);
        const comments = rowData.comments || cols[7] || '';

        if (!name) {
          validationErrors.push({ row: i + 1, field: 'recipient_name', message: 'Recipient name is required', value: '' });
        }
        if (!phone || phone.length < 8) {
          validationErrors.push({ row: i + 1, field: 'recipient_phone', message: 'Valid phone number required', value: phone || '' });
        }
        if (!address) {
          validationErrors.push({ row: i + 1, field: 'recipient_address', message: 'Address is required', value: '' });
        }
        if (!city) {
          validationErrors.push({ row: i + 1, field: 'destination_city', message: 'Destination city is required', value: '' });
        }

        validRows.push({
          recipient_name: name,
          recipient_phone: phone,
          recipient_address: address,
          destination_city: city,
          cod_amount: isNaN(cod) ? 0 : cod,
          weight: isNaN(weight) ? 0.5 : weight,
          pieces: isNaN(pieces) ? 1 : pieces,
          comments,
        });
      }

      setErrors(validationErrors);

      if (validationErrors.length > 0) {
        setUploadStatus('done');
        return;
      }

      // Upload valid rows to backend
      setUploadStatus('uploading');
      setProgress(60);

      let created = 0;
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const tracking = `DBA-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        // Resolve city
        const matchedCity = cities.find(
          (c) => c.name?.toLowerCase() === row.destination_city?.toLowerCase()
        );

        try {
          await apiClient.post('/parcels', {
            data: {
              tracking_number: tracking,
              status: 'Total Booking',
              recipient_name: row.recipient_name,
              recipient_phone: row.recipient_phone,
              recipient_address: row.recipient_address,
              destination_city: matchedCity?.id || null,
              cod_amount: row.cod_amount,
              weight: row.weight,
              pieces: row.pieces,
              delivery_charges: 250,
              comments: row.comments,
              tenant: user?.tenantId,
              shipper: user?.id,
            },
          });
          created++;
        } catch (postErr) {
          console.warn(`Failed to create bulk row #${i + 1}:`, postErr);
        }

        setProgress(60 + Math.floor(((i + 1) / validRows.length) * 40));
      }

      setSuccessCount(created);
      setUploadStatus('done');
    };

    reader.readAsText(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        className={cn(
          'border-2 border-dashed rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center text-center',
          isDragging ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white hover:border-slate-300'
        )}
      >
        <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <Upload className={cn('h-10 w-10 transition-colors', isDragging ? 'text-primary-600' : 'text-slate-400')} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Bulk CSV Shipment Upload</h3>
        <p className="text-slate-500 mb-6 max-w-sm text-sm">
          Drag and drop your CSV file here, or click to browse files.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            className="hidden"
            id="file-upload"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <label htmlFor="file-upload">
            <Button variant="outline" size="lg" className="rounded-xl px-8 pointer-events-none">
              Select CSV File
            </Button>
          </label>

          <Button
            onClick={downloadTemplate}
            variant="outline"
            className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Download CSV Template
          </Button>
        </div>
      </div>

      {uploadStatus !== 'idle' && (
        <Card className="animate-in fade-in slide-in-from-top-4 rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {uploadStatus === 'done' ? (
                  errors.length > 0 ? (
                    <AlertCircle className="h-6 w-6 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  )
                ) : (
                  <RefreshCw className="animate-spin h-6 w-6 text-blue-500" />
                )}
                <span className="font-bold text-slate-900 capitalize text-sm">
                  {uploadStatus === 'done'
                    ? errors.length > 0
                      ? 'Validation Completed with Errors'
                      : `Successfully Created ${successCount} Shipments!`
                    : `${uploadStatus}...`}
                </span>
              </div>
              <span className="text-sm font-bold text-slate-500">{progress}%</span>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
              <div
                className={cn('h-full transition-all duration-500', errors.length > 0 ? 'bg-amber-500' : 'bg-emerald-500')}
                style={{ width: `${progress}%` }}
              />
            </div>

            {errors.length > 0 && (
              <div className="rounded-xl border border-red-100 bg-red-50/30 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-red-50 text-red-900 font-bold">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Field</th>
                      <th className="px-4 py-3">Error Message</th>
                      <th className="px-4 py-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {errors.map((err, i) => (
                      <tr key={i} className="text-red-700">
                        <td className="px-4 py-3 font-mono font-bold">#{err.row}</td>
                        <td className="px-4 py-3 font-medium">{err.field}</td>
                        <td className="px-4 py-3">{err.message}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{err.value || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
