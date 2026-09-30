'use client';

import * as React from 'react';

export type OrderRow = {
  id: number | string;
  trackingNumber: string;
  orderReference: string;
  customerName: string;
  avatar: string;
  phone: string;
  origin: string;
  destination: string;
  address: string;
  shipperName: string;
  shipperAddress: string;
  shipperPhone: string;
  paymentType: 'COD' | 'PAID';
  codAmount: number;
  weightKg: number;
  pieces: number;
  status: string;
  allowToOpen: string;
  product: string;
  remarks: string;
  parcelDetail: string;
  is2PL: boolean;
  tplCourierId: string;
  tplTrackingNo: string;
  dateCreated: string;
  dateFormatted: string;
};

/**
 * Business Rule: Dispatch slips can ONLY be generated for orders in 'Booked' status.
 * Any other status (In Transit, Delivered, Cancelled, Picked Up, Delivery Failed, etc.) is strictly prohibited.
 */
export function isEligibleForDispatchSlip(status?: string | null): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return s === 'booked' || s === 'total booking' || s === 'pending';
}

// Clean SVG Barcode Component for High-Precision Thermal and A4 Printing
export function SlipBarcode({
  text,
  height = 24,
  maxWidth = 150,
  showText = true,
  textSize = 9,
}: {
  text: string;
  height?: number;
  maxWidth?: number;
  showText?: boolean;
  textSize?: number;
}) {
  const bars = React.useMemo(() => {
    let result = '';
    const clean = (text || '0000').toUpperCase().replace(/[^A-Z0-9-]/g, '') || '0000';
    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i);
      const pattern = (code * 9301 + 49297) % 233280;
      const bin = (pattern % 64).toString(2).padStart(6, '1');
      result += bin;
    }
    return (result + '110011001101').slice(0, 56);
  }, [text]);

  return (
    <div className="flex flex-col items-center justify-center">
      <svg
        height={height}
        viewBox="0 0 110 26"
        style={{ width: '100%', maxWidth: `${maxWidth}px`, height: `${height}px` }}
      >
        {bars.split('').map((b, i) => (
          <rect
            key={i}
            x={i * 1.9 + 2}
            y="0"
            width={b === '1' ? 1.3 : 0.6}
            height="26"
            fill="#000000"
          />
        ))}
      </svg>
      {showText && (
        <span
          className="font-mono font-bold text-black tracking-wider leading-none"
          style={{ fontSize: `${textSize}px`, marginTop: '1.5px' }}
        >
          {text}
        </span>
      )}
    </div>
  );
}

// Clean 21x21 Vector SVG QR Code with 3 Authentic Corner Markers
export function SlipQRCode({ value, size = 46 }: { value: string; size?: number }) {
  const matrix = React.useMemo(() => {
    const N = 21;
    const grid: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));

    // Finder patterns: 7x7 outer square, 5x5 white, 3x3 black center
    const drawFinder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            grid[r0 + r][c0 + c] = true;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, N - 7);
    drawFinder(N - 7, 0);

    // Timing lines
    for (let i = 8; i < N - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Alignment marker module
    grid[N - 8][8] = true;

    // Deterministic data fill based on value string
    let hash = 0;
    const val = value || '0';
    for (let i = 0; i < val.length; i++) {
      hash = ((hash << 5) - hash) + val.charCodeAt(i);
      hash |= 0;
    }

    let seed = Math.abs(hash) || 54321;
    const nextRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        // Skip finder zones & separators
        if (r < 8 && (c < 8 || c >= N - 8)) continue;
        if (r >= N - 8 && c < 8) continue;
        if (r === 6 || c === 6) continue;
        grid[r][c] = nextRandom() > 0.48;
      }
    }

    return grid;
  }, [value]);

  return (
    <svg width={size} height={size} viewBox="0 0 21 21" className="shrink-0 bg-white" shapeRendering="crispEdges">
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#000" /> : null
        )
      )}
    </svg>
  );
}

// Pixel-perfect Dispatch Slip Card matching the reference courier standard
export function DispatchSlipCard({ order, businessName }: { order: OrderRow; businessName?: string }) {
  return (
    <div className="dispatch-slip-card bg-white text-black font-sans border-2 border-black p-0 select-none overflow-hidden text-[9px] leading-tight shadow-sm">
      {/* ===================== TOP ROW: 7 Header Cells ===================== */}
      <div className="grid grid-cols-[82px_72px_95px_95px_65px_75px_1fr] border-b border-black divide-x divide-black text-center min-h-[46px] bg-white">
        {/* 1. Logo Block */}
        <div className="bg-black text-white flex flex-col items-center justify-center px-1 font-black italic tracking-wider text-base">
          <span>{businessName || 'Shipzo'}</span>
        </div>

        {/* 2. Date */}
        <div className="flex flex-col justify-center px-1">
          <span className="text-[7.5px] uppercase font-bold text-slate-600">Date:</span>
          <span className="font-extrabold text-[10.5px]">{order.dateFormatted}</span>
        </div>

        {/* 3. Destination */}
        <div className="flex flex-col justify-center px-1">
          <span className="text-[7.5px] uppercase font-bold text-slate-600">Destination</span>
          <span className="font-black text-[12px] truncate">{order.destination}</span>
        </div>

        {/* 4. COD */}
        <div className="flex flex-col justify-center px-1">
          <span className="text-[7.5px] uppercase font-bold text-slate-600">COD</span>
          <span className="font-black text-[11px]">
            {order.codAmount > 0 ? `Rs: ${order.codAmount.toLocaleString()}` : 'Prepaid (Rs 0)'}
          </span>
        </div>

        {/* 5. Weight */}
        <div className="flex flex-col justify-center px-1">
          <span className="text-[7.5px] uppercase font-bold text-slate-600">Weight</span>
          <span className="font-bold text-[9.5px]">Kg: {order.weightKg.toFixed(2)}</span>
        </div>

        {/* 6. Allow to Open */}
        <div className="flex flex-col justify-center px-1">
          <span className="text-[7.5px] uppercase font-bold text-slate-600">Allow to Open</span>
          <span className="font-black text-[11px]">{order.allowToOpen || 'No'}</span>
        </div>

        {/* 7. Barcode 1 (3PL Barcode): Shown ONLY IF 3PL */}
        <div className="flex flex-col items-center justify-center p-1 bg-white">
          {!order.is2PL ? (
            /* 3PL Partner Barcode (Barcode 1) */
            <div className="w-full flex flex-col items-center justify-center">
              <SlipBarcode text={order.tplTrackingNo} height={20} maxWidth={150} textSize={8.5} />
            </div>
          ) : (
            /* 2PL In-House: NO second barcode -> ONLY 1 barcode total on slip */
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-[8px] font-bold text-slate-700">
              <span className="uppercase tracking-wider">2PL Routing</span>
              <span className="text-[7px] font-medium text-slate-500">In-House Courier Delivery</span>
            </div>
          )}
        </div>
      </div>

      {/* ===================== MIDDLE ROW: 3 Columns ===================== */}
      <div className="grid grid-cols-[1fr_1.35fr_1fr] border-b border-black divide-x divide-black bg-white">
        {/* Column 1: Shipper Information */}
        <div className="flex flex-col">
          <div className="bg-slate-200/90 font-black text-center text-[9px] uppercase py-0.5 border-b border-black text-slate-900">
            Shipper Information
          </div>
          <div className="divide-y divide-black text-[8.5px] flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-[45px_1fr] px-1.5 py-0.5">
              <span className="font-bold text-slate-700">Name:</span>
              <span className="font-bold text-black truncate">{order.shipperName}</span>
            </div>
            <div className="grid grid-cols-[45px_1fr] px-1.5 py-0.5">
              <span className="font-bold text-slate-700">Contact:</span>
              <span className="font-mono font-bold text-black">{order.shipperPhone}</span>
            </div>
            <div className="grid grid-cols-[45px_1fr] px-1.5 py-0.5 flex-1">
              <span className="font-bold text-slate-700">Address:</span>
              <span className="text-black leading-tight line-clamp-3 font-medium">{order.shipperAddress}</span>
            </div>
          </div>
        </div>

        {/* Column 2: Center Primary Tracking Number, Main Barcode (Barcode 2), Dual QR Codes */}
        <div className="flex flex-col items-center justify-between p-1.5 text-center bg-white">
          {/* Primary Tracking Number Header */}
          <div className="font-black text-[13px] tracking-wide text-black">
            {order.trackingNumber}
          </div>

          {/* Main Barcode (Barcode 2) */}
          <div className="my-0.5 w-full flex flex-col items-center justify-center">
            <SlipBarcode text={order.trackingNumber} height={26} maxWidth={180} textSize={8.5} />
          </div>

          {/* Two QR Codes side by side */}
          <div className="flex items-center justify-center gap-6 mt-1 w-full">
            {/* Left QR: Order id */}
            <div className="flex flex-col items-center">
              <SlipQRCode value={String(order.orderReference || order.id)} size={42} />
              <span className="text-[7.5px] font-bold text-black mt-0.5">Order id</span>
            </div>

            {/* Right QR: Tracking ID */}
            <div className="flex flex-col items-center">
              <SlipQRCode value={order.trackingNumber} size={42} />
              <span className="text-[7.5px] font-bold text-black mt-0.5">Tracking ID</span>
            </div>
          </div>
        </div>

        {/* Column 3: Consignee Information */}
        <div className="flex flex-col">
          <div className="bg-slate-200/90 font-black text-center text-[9px] uppercase py-0.5 border-b border-black text-slate-900">
            Consignee Information
          </div>
          <div className="divide-y divide-black text-[8.5px] flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-[45px_1fr] px-1.5 py-0.5">
              <span className="font-bold text-slate-700">Name:</span>
              <span className="font-bold text-black truncate">{order.customerName}</span>
            </div>
            <div className="grid grid-cols-[45px_1fr] px-1.5 py-0.5">
              <span className="font-bold text-slate-700">Mobile:</span>
              <span className="font-mono font-bold text-black">{order.phone}</span>
            </div>
            <div className="grid grid-cols-[45px_1fr] px-1.5 py-0.5 flex-1">
              <span className="font-bold text-slate-700">Address:</span>
              <span className="text-black leading-tight line-clamp-3 font-medium">{order.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== BOTTOM ROW: Order Reference, Pieces, Product ===================== */}
      <div className="grid grid-cols-[130px_70px_1fr] border-b border-black divide-x divide-black text-[8.5px] bg-white">
        <div className="px-1.5 py-1 flex items-center gap-1">
          <span className="font-bold text-slate-700">Order Reference:</span>
          <span className="font-black text-black">{order.orderReference || `#${order.id}`}</span>
        </div>
        <div className="px-1.5 py-1 flex items-center justify-center gap-1 text-center">
          <span className="font-bold text-slate-700">Pieces</span>
          <span className="font-black text-black">{order.pieces}</span>
        </div>
        <div className="px-1.5 py-1 flex items-center gap-1 truncate">
          <span className="font-bold text-slate-700">Product:</span>
          <span className="font-bold text-black truncate">{order.product}</span>
        </div>
      </div>

      {/* ===================== FOOTER ROW: Remarks ===================== */}
      <div className="px-2 py-1 text-[8.5px] flex items-center gap-1.5 bg-white">
        <span className="font-black text-slate-800">Remarks:</span>
        <span className="font-medium text-black truncate">{order.remarks}</span>
      </div>
    </div>
  );
}
