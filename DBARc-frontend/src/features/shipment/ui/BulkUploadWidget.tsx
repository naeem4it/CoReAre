'use client';

import * as React from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent } from '@/shared/ui/Card';
import { cn } from '@/shared/lib/utils';

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: string;
}

export const BulkUploadWidget = () => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'uploading' | 'validating' | 'done'>('idle');
  const [progress, setProgress] = React.useState(0);
  const [errors, setErrors] = React.useState<ValidationError[]>([]);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      startMockUpload();
    } else {
      alert('Please upload a valid CSV file.');
    }
  };

  const startMockUpload = async () => {
    setUploadStatus('uploading');
    setProgress(0);
    setErrors([]);

    // Mock Upload Progress
    for (let i = 0; i <= 100; i += 20) {
      setProgress(i);
      await new Promise(r => setTimeout(r, 400));
    }

    setUploadStatus('validating');
    await new Promise(r => setTimeout(r, 1000));

    // Mock Validation Errors
    setErrors([
      { row: 4, field: 'Destination', message: 'Region not found: "Mars"', value: 'Mars' },
      { row: 7, field: 'Phone', message: 'Invalid phone format', value: '123' },
    ]);
    setUploadStatus('done');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        className={cn(
          'border-2 border-dashed rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center text-center',
          isDragging 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-slate-200 bg-white hover:border-slate-300'
        )}
      >
        <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <Upload className={cn('h-10 w-10 transition-colors', isDragging ? 'text-primary-600' : 'text-slate-400')} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Bulk Shipment Upload</h3>
        <p className="text-slate-500 mb-8 max-w-sm">
          Drag and drop your CSV file here, or click to browse files. 
          Use our <span className="text-primary-600 font-bold cursor-pointer hover:underline">CSV Template</span> for best results.
        </p>
        <input type="file" className="hidden" id="file-upload" accept=".csv" onChange={startMockUpload} />
        <label htmlFor="file-upload">
          <Button variant="outline" size="lg" className="rounded-xl px-8 pointer-events-none">
            Select CSV File
          </Button>
        </label>
      </div>

      {uploadStatus !== 'idle' && (
        <Card className="animate-in fade-in slide-in-from-top-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {uploadStatus === 'done' ? (
                  errors.length > 0 ? <AlertCircle className="h-6 w-6 text-amber-500" /> : <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                ) : (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
                )}
                <span className="font-bold text-slate-900 capitalize">
                  {uploadStatus === 'done' ? (errors.length > 0 ? 'Validation Completed with Errors' : 'Upload Successful') : `${uploadStatus}...`}
                </span>
              </div>
              <span className="text-sm font-bold text-slate-500">{progress}%</span>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
              <div 
                className={cn('h-full transition-all duration-500', errors.length > 0 ? 'bg-amber-500' : 'bg-primary-500')} 
                style={{ width: `${progress}%` }} 
              />
            </div>

            {errors.length > 0 && (
              <div className="rounded-xl border border-red-100 bg-red-50/30 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-red-50 text-red-900 font-bold">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Field</th>
                      <th className="px-4 py-3">Error</th>
                      <th className="px-4 py-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {errors.map((err, i) => (
                      <tr key={i} className="text-red-700">
                        <td className="px-4 py-3 font-mono">#{err.row}</td>
                        <td className="px-4 py-3 font-medium">{err.field}</td>
                        <td className="px-4 py-3">{err.message}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{err.value}</td>
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
