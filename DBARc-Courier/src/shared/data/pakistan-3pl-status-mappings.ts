/**
 * Pakistan 3PL Courier Status Mapping & Normalization Engine
 * Standardizes raw carrier statuses from TRAX, PostEx, Leopards, TCS, M&P, Call Courier into DBARc Unified Statuses
 */

export interface TPLStatusMapping {
  rawStatus: string;
  normalizedStatus: 'Booked' | 'In Transit' | 'Arrived At Destination' | 'Out for Delivery' | 'Delivered' | 'Failed Attempt' | 'Ready To Return' | 'Return Dispatched' | 'Return to Shipper';
  category: 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'returned';
  description: string;
  actionTriggered: string;
}

export const TPL_STATUS_DICTIONARY: Record<string, TPLStatusMapping[]> = {
  trax: [
    { rawStatus: 'BOOKED', normalizedStatus: 'Booked', category: 'in_transit', description: 'Shipment registered with TRAX', actionTriggered: 'Tracking generated' },
    { rawStatus: 'PICKED_UP', normalizedStatus: 'In Transit', category: 'in_transit', description: 'Picked up from origin hub', actionTriggered: 'In-transit timeline updated' },
    { rawStatus: 'ARRIVED_AT_STATION', normalizedStatus: 'Arrived At Destination', category: 'in_transit', description: 'Arrived at TRAX destination gateway station', actionTriggered: 'Destination arrival logged' },
    { rawStatus: 'IN_TRANSIT', normalizedStatus: 'In Transit', category: 'in_transit', description: 'Linehaul transit between hubs', actionTriggered: 'Customer tracking updated' },
    { rawStatus: 'OUT_FOR_DELIVERY', normalizedStatus: 'Out for Delivery', category: 'out_for_delivery', description: 'Dispatched with TRAX delivery rider', actionTriggered: 'SMS notification sent' },
    { rawStatus: 'DELIVERED', normalizedStatus: 'Delivered', category: 'delivered', description: 'Successfully delivered & POD captured', actionTriggered: 'COD settlement queued' },
    { rawStatus: 'DELIVERY_ATTEMPTED', normalizedStatus: 'Failed Attempt', category: 'exception', description: 'Delivery attempted (Consignee unavailable / unreachable)', actionTriggered: 'Alert support for re-attempt' },
    { rawStatus: 'CUSTOMER_REFUSED', normalizedStatus: 'Failed Attempt', category: 'exception', description: 'Consignee refused package', actionTriggered: 'Shipper advise alert created' },
    { rawStatus: 'RETURN_TO_ORIGIN', normalizedStatus: 'Ready To Return', category: 'returned', description: 'Marked for Return to Origin', actionTriggered: 'RTO journey started' },
    { rawStatus: 'RTO_IN_TRANSIT', normalizedStatus: 'Return Dispatched', category: 'returned', description: 'Returning to merchant warehouse', actionTriggered: 'Return linehaul updated' },
    { rawStatus: 'RTO_DELIVERED', normalizedStatus: 'Return to Shipper', category: 'returned', description: 'Delivered back to merchant', actionTriggered: 'Shipment closed' },
  ],
  postex: [
    { rawStatus: 'Order Created', normalizedStatus: 'Booked', category: 'in_transit', description: 'Order created in PostEx portal', actionTriggered: 'PostEx waybill assigned' },
    { rawStatus: 'Picked Up', normalizedStatus: 'In Transit', category: 'in_transit', description: 'Picked up by PostEx fleet', actionTriggered: 'Hub intake recorded' },
    { rawStatus: 'In Transit', normalizedStatus: 'In Transit', category: 'in_transit', description: 'En route to destination hub', actionTriggered: 'Status synced' },
    { rawStatus: 'Out For Delivery', normalizedStatus: 'Out for Delivery', category: 'out_for_delivery', description: 'Rider on route for delivery', actionTriggered: 'Out for delivery notification' },
    { rawStatus: 'Delivered', normalizedStatus: 'Delivered', category: 'delivered', description: 'Delivered and cash collected', actionTriggered: 'Instant COD cashout processed' },
    { rawStatus: 'Un-Attempted', normalizedStatus: 'Failed Attempt', category: 'exception', description: 'Address unlocated / time expired', actionTriggered: 'Auto re-attempt scheduled' },
    { rawStatus: 'Customer Refused', normalizedStatus: 'Failed Attempt', category: 'exception', description: 'Customer cancelled or refused', actionTriggered: 'NDR ticket generated' },
    { rawStatus: 'Returned to Origin', normalizedStatus: 'Return to Shipper', category: 'returned', description: 'Returned to shipper', actionTriggered: 'Return closed' },
  ],
  leopards: [
    { rawStatus: 'CN_GENERATED', normalizedStatus: 'Booked', category: 'in_transit', description: 'Leopards CN generated', actionTriggered: 'Barcode ready' },
    { rawStatus: 'RECEIVED_AT_HUB', normalizedStatus: 'In Transit', category: 'in_transit', description: 'Received at Leopards Sorting Hub', actionTriggered: 'Hub routing' },
    { rawStatus: 'DISPATCHED_TO_DESTINATION', normalizedStatus: 'In Transit', category: 'in_transit', description: 'Dispatched via express cargo', actionTriggered: 'Linehaul underway' },
    { rawStatus: 'ARRIVED_DESTINATION', normalizedStatus: 'Arrived At Destination', category: 'in_transit', description: 'Arrived at destination branch', actionTriggered: 'Ready for rider runsheet' },
    { rawStatus: 'ASSIGNED_TO_COURIER', normalizedStatus: 'Out for Delivery', category: 'out_for_delivery', description: 'Assigned to courier on delivery runsheet', actionTriggered: 'Live rider dispatch' },
    { rawStatus: 'DELIVERED', normalizedStatus: 'Delivered', category: 'delivered', description: 'Shipment delivered to receiver', actionTriggered: 'POD signed' },
    { rawStatus: 'NOT_DELIVERED', normalizedStatus: 'Failed Attempt', category: 'exception', description: 'Delivery failed - Receiver closed/refused', actionTriggered: 'Branch follow up' },
    { rawStatus: 'RETURNED', normalizedStatus: 'Return to Shipper', category: 'returned', description: 'Returned to consignor', actionTriggered: 'RTO completed' },
  ],
  tcs: [
    { rawStatus: 'MANIFEST_CREATED', normalizedStatus: 'Booked', category: 'in_transit', description: 'TCS Manifest created', actionTriggered: 'Booking verified' },
    { rawStatus: 'IN_TRANSIT', normalizedStatus: 'In Transit', category: 'in_transit', description: 'In Transit within TCS Network', actionTriggered: 'Tracking update' },
    { rawStatus: 'OUT_FOR_DELIVERY', normalizedStatus: 'Out for Delivery', category: 'out_for_delivery', description: 'Out with TCS Courier', actionTriggered: 'Delivery route active' },
    { rawStatus: 'DELIVERED', normalizedStatus: 'Delivered', category: 'delivered', description: 'Delivered successfully', actionTriggered: 'TCS Settlement' },
    { rawStatus: 'RETURNED_TO_SHIPPER', normalizedStatus: 'Return to Shipper', category: 'returned', description: 'Returned to Shipper', actionTriggered: 'Closed' },
  ],
  mnp: [
    { rawStatus: 'BOOKED', normalizedStatus: 'Booked', category: 'in_transit', description: 'M&P Shipment Booked', actionTriggered: 'Tracking created' },
    { rawStatus: 'IN_TRANSIT', normalizedStatus: 'In Transit', category: 'in_transit', description: 'M&P Air/Surface Transit', actionTriggered: 'Tracking sync' },
    { rawStatus: 'OUT_FOR_DELIVERY', normalizedStatus: 'Out for Delivery', category: 'out_for_delivery', description: 'Out for Delivery with M&P Rider', actionTriggered: 'Live tracking' },
    { rawStatus: 'DELIVERED', normalizedStatus: 'Delivered', category: 'delivered', description: 'Delivered', actionTriggered: 'Settled' },
    { rawStatus: 'RETURNED', normalizedStatus: 'Return to Shipper', category: 'returned', description: 'Returned to Shipper', actionTriggered: 'RTO Settled' },
  ],
  callcourier: [
    { rawStatus: 'CREATED', normalizedStatus: 'Booked', category: 'in_transit', description: 'Call Courier CN Created', actionTriggered: 'Barcode active' },
    { rawStatus: 'TRANSIT', normalizedStatus: 'In Transit', category: 'in_transit', description: 'In Transit', actionTriggered: 'Hub scan' },
    { rawStatus: 'OUT_FOR_DELIVERY', normalizedStatus: 'Out for Delivery', category: 'out_for_delivery', description: 'Out for Delivery', actionTriggered: 'Rider dispatch' },
    { rawStatus: 'DELIVERED', normalizedStatus: 'Delivered', category: 'delivered', description: 'Delivered', actionTriggered: 'COD recorded' },
    { rawStatus: 'RTO', normalizedStatus: 'Return to Shipper', category: 'returned', description: 'Returned to Merchant', actionTriggered: 'Closed' },
  ]
};

export function translate3PLStatus(provider: string, rawStatus: string): TPLStatusMapping {
  const pCode = (provider || 'trax').toLowerCase().replace(/[^a-z]/g, '');
  const mappings = TPL_STATUS_DICTIONARY[pCode] || TPL_STATUS_DICTIONARY['trax'];
  
  const rawNorm = (rawStatus || '').toUpperCase().trim();
  
  // Exact match
  const exact = mappings.find(m => m.rawStatus.toUpperCase() === rawNorm);
  if (exact) return exact;

  // Partial heuristic matching
  if (rawNorm.includes('DELIVERED') && !rawNorm.includes('RTO') && !rawNorm.includes('RETURN')) {
    return { rawStatus, normalizedStatus: 'Delivered', category: 'delivered', description: 'Delivered by 3PL Partner', actionTriggered: 'COD recorded' };
  }
  if (rawNorm.includes('OUT') || rawNorm.includes('DISPATCH') || rawNorm.includes('RUNSHEET')) {
    return { rawStatus, normalizedStatus: 'Out for Delivery', category: 'out_for_delivery', description: 'Out for delivery with 3PL rider', actionTriggered: 'Customer notification' };
  }
  if (rawNorm.includes('RETURN') || rawNorm.includes('RTO')) {
    return { rawStatus, normalizedStatus: 'Return to Shipper', category: 'returned', description: 'Returned to origin by 3PL', actionTriggered: 'Return journey' };
  }
  if (rawNorm.includes('ATTEMPT') || rawNorm.includes('FAILED') || rawNorm.includes('REFUSED') || rawNorm.includes('UNATTEMPTED')) {
    return { rawStatus, normalizedStatus: 'Failed Attempt', category: 'exception', description: 'Delivery attempt unsuccessful', actionTriggered: 'Action required' };
  }
  if (rawNorm.includes('ARRIVE') || rawNorm.includes('STATION') || rawNorm.includes('HUB')) {
    return { rawStatus, normalizedStatus: 'Arrived At Destination', category: 'in_transit', description: 'Arrived at 3PL destination hub', actionTriggered: 'Destination arrival' };
  }

  // Fallback default
  return {
    rawStatus,
    normalizedStatus: 'In Transit',
    category: 'in_transit',
    description: `In Transit via 3PL Partner (${provider.toUpperCase()})`,
    actionTriggered: 'Synchronized via 3PL integration'
  };
}
