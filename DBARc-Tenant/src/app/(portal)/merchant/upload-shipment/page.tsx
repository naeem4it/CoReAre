'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { UploadCloud, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function UploadShipmentPage() {
  const [isDragging, setIsDragging] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/)) {
      setUploadStatus('error');
      setErrorMessage('Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadStatus('idle');
    setErrorMessage('');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadStatus('uploading');

    // Simulate API call for uploading and parsing Excel
    setTimeout(() => {
      setUploadStatus('success');
      // In a real implementation, we would use FormData:
      // const formData = new FormData();
      // formData.append('file', selectedFile);
      // axios.post('/api/load-sheets/upload', formData, { ... })
    }, 2000);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bulk Shipment Upload</h1>
        <p className="text-slate-500 mt-1">Upload an Excel or CSV file to create multiple orders at once.</p>
      </div>

      <Card className="rounded-[28px] border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden bg-white">
        <CardContent className="p-8">
          
          {uploadStatus === 'success' ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Successful!</h2>
              <p className="text-slate-600 mb-8 max-w-sm">
                Your bulk shipment file has been successfully processed. The orders have been created.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={resetUpload} className="rounded-xl border-slate-200 px-6">
                  Upload Another
                </Button>
                <Button className="rounded-xl bg-primary-600 hover:bg-primary-700 px-6 shadow-md shadow-primary-600/20">
                  View Orders
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Drag and Drop Zone */}
              <div 
                className={`relative border-2 border-dashed rounded-3xl p-12 transition-all duration-200 ease-in-out flex flex-col items-center justify-center text-center cursor-pointer
                  ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-primary-400 hover:bg-slate-50'}
                  ${selectedFile ? 'bg-slate-50 border-solid border-slate-200 cursor-default hover:border-slate-200 hover:bg-slate-50' : ''}
                `}
                onDragOver={!selectedFile ? handleDragOver : undefined}
                onDragLeave={!selectedFile ? handleDragLeave : undefined}
                onDrop={!selectedFile ? handleDrop : undefined}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                  onChange={handleFileChange}
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center w-full animate-in fade-in zoom-in duration-200">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 relative shadow-sm">
                      <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); resetUpload(); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors cursor-pointer text-red-600 shadow-sm"
                      >
                        <X className="w-3 h-3 font-bold" />
                      </button>
                    </div>
                    <p className="font-semibold text-slate-900 text-lg">{selectedFile.name}</p>
                    <p className="text-slate-500 text-sm mt-1">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                      <UploadCloud className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Drag & Drop your file here</h3>
                    <p className="text-slate-500 mb-6">Or click to browse from your computer</p>
                    <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-400 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500"/> XLSX</span>
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500"/> XLS</span>
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500"/> CSV</span>
                    </div>
                  </>
                )}
              </div>

              {uploadStatus === 'error' && (
                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 animate-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{errorMessage}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                <Button variant="ghost" className="text-slate-500 font-semibold px-6 rounded-xl hover:bg-slate-100">
                  Download Template
                </Button>
                <Button 
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadStatus === 'uploading'}
                  isLoading={uploadStatus === 'uploading'}
                  className="bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/20 rounded-xl px-8 h-12 text-base font-bold"
                >
                  {uploadStatus === 'uploading' ? 'Processing...' : 'Upload & Process'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
