/**
 * Canonical Shipment Statuses across the Courier System.
 * Single Source of Truth for all Operations and Customer Service screens.
 */

export const SHIPMENT_STATUSES = {
  BOOKED: 'Booked',
  TOTAL_BOOKING: 'Booked', // backward-compatibility alias
  PICKED_UP_BY_RIDER: 'Picked up by rider',
  ARRIVED_ORIGIN: 'Arrived at warehouse (Origin)',
  NOT_ARRIVED: 'Not Arrived',
  IN_TRANSIT: 'In Transit',
  ARRIVED_DEST: 'Arrived at warehouse (Dest)',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  DELIVERY_FAILED: 'Delivery Failed',
  READY_FOR_RETURN: 'Ready for Return',
  RETURN_TO_SHIPPER: 'Return to Shipper',
  LOST_DAMAGE: 'Lost / Damage',
} as const;

export type ShipmentStatus = typeof SHIPMENT_STATUSES[keyof typeof SHIPMENT_STATUSES];

export const ALL_12_SHIPMENT_STATUSES: ShipmentStatus[] = [
  SHIPMENT_STATUSES.BOOKED,
  SHIPMENT_STATUSES.PICKED_UP_BY_RIDER,
  SHIPMENT_STATUSES.ARRIVED_ORIGIN,
  SHIPMENT_STATUSES.NOT_ARRIVED,
  SHIPMENT_STATUSES.IN_TRANSIT,
  SHIPMENT_STATUSES.ARRIVED_DEST,
  SHIPMENT_STATUSES.OUT_FOR_DELIVERY,
  SHIPMENT_STATUSES.DELIVERED,
  SHIPMENT_STATUSES.DELIVERY_FAILED,
  SHIPMENT_STATUSES.READY_FOR_RETURN,
  SHIPMENT_STATUSES.RETURN_TO_SHIPPER,
  SHIPMENT_STATUSES.LOST_DAMAGE,
];

/**
 * Normalizes legacy database status strings to one of the 12 canonical statuses.
 */
export function normalizeShipmentStatus(status?: string | null): ShipmentStatus {
  if (!status) return SHIPMENT_STATUSES.BOOKED;
  const s = status.trim();

  // 1. Booked
  if (s.toLowerCase() === 'booked' || s.toLowerCase() === 'total booking') {
    return SHIPMENT_STATUSES.BOOKED;
  }

  // 2. Picked up by rider
  if (s === 'Picked up by rider' || s.toLowerCase().includes('picked up')) {
    return SHIPMENT_STATUSES.PICKED_UP_BY_RIDER;
  }

  // 3. Arrived at warehouse (Origin)
  if (
    s === 'Arrived at warehouse (Origin)' ||
    s === 'Arrived at the warehouse' ||
    s === 'Arrived'
  ) {
    return SHIPMENT_STATUSES.ARRIVED_ORIGIN;
  }

  // 4. Not Arrived
  if (s === 'Not Arrived' || s.toLowerCase() === 'not arrived') {
    return SHIPMENT_STATUSES.NOT_ARRIVED;
  }

  // 5. In Transit
  if (s === 'In Transit' || s === 'In Transit (Linehaul)' || s.toLowerCase() === 'in transit') {
    return SHIPMENT_STATUSES.IN_TRANSIT;
  }

  // 6. Arrived at warehouse (Dest)
  if (
    s === 'Arrived at warehouse (Dest)' ||
    s === 'Arrived at warehouse' ||
    s === 'Arrived At Destination'
  ) {
    return SHIPMENT_STATUSES.ARRIVED_DEST;
  }

  // 7. Out for Delivery
  if (
    s === 'Out for Delivery' ||
    s === 'Out For delivery' ||
    s.toLowerCase() === 'out for delivery'
  ) {
    return SHIPMENT_STATUSES.OUT_FOR_DELIVERY;
  }

  // 8. Delivered
  if (s === 'Delivered' || s.toLowerCase() === 'delivered') {
    return SHIPMENT_STATUSES.DELIVERED;
  }

  // 9. Delivery Failed
  if (
    s === 'Delivery Failed' ||
    s === 'Failed Attempt' ||
    s.toLowerCase() === 'delivery failed'
  ) {
    return SHIPMENT_STATUSES.DELIVERY_FAILED;
  }

  // 10. Ready for Return
  if (
    s === 'Ready for Return' ||
    s === 'Ready To Return' ||
    s.toLowerCase() === 'ready for return'
  ) {
    return SHIPMENT_STATUSES.READY_FOR_RETURN;
  }

  // 11. Return to Shipper
  if (
    s === 'Return to Shipper' ||
    s === 'Return Dispatched' ||
    s === 'Returned' ||
    s.toLowerCase() === 'return to shipper'
  ) {
    return SHIPMENT_STATUSES.RETURN_TO_SHIPPER;
  }

  // 12. Lost / Damage
  if (
    s === 'Lost / Damage' ||
    s === 'Lost/Damage' ||
    s.toLowerCase().includes('lost') ||
    s.toLowerCase().includes('damage')
  ) {
    return SHIPMENT_STATUSES.LOST_DAMAGE;
  }

  return SHIPMENT_STATUSES.BOOKED;
}

/**
 * Maps a canonical status to all possible database values for queries ($in).
 */
export function getDbStatusQueryValues(canonicalStatus: ShipmentStatus | string): string[] {
  switch (canonicalStatus) {
    case SHIPMENT_STATUSES.BOOKED:
    case 'Total Booking':
      return ['Booked', 'booked', 'Total Booking'];
    case SHIPMENT_STATUSES.PICKED_UP_BY_RIDER:
      return ['Picked up by rider'];
    case SHIPMENT_STATUSES.ARRIVED_ORIGIN:
      return ['Arrived at warehouse (Origin)', 'Arrived at the warehouse', 'Arrived'];
    case SHIPMENT_STATUSES.NOT_ARRIVED:
      return ['Not Arrived'];
    case SHIPMENT_STATUSES.IN_TRANSIT:
      return ['In Transit', 'In Transit (Linehaul)'];
    case SHIPMENT_STATUSES.ARRIVED_DEST:
      return ['Arrived at warehouse (Dest)', 'Arrived at warehouse', 'Arrived At Destination'];
    case SHIPMENT_STATUSES.OUT_FOR_DELIVERY:
      return ['Out for Delivery', 'Out For delivery'];
    case SHIPMENT_STATUSES.DELIVERED:
      return ['Delivered'];
    case SHIPMENT_STATUSES.DELIVERY_FAILED:
      return ['Delivery Failed', 'Failed Attempt'];
    case SHIPMENT_STATUSES.READY_FOR_RETURN:
      return ['Ready for Return', 'Ready To Return'];
    case SHIPMENT_STATUSES.RETURN_TO_SHIPPER:
      return ['Return to Shipper', 'Return Dispatched', 'Returned'];
    case SHIPMENT_STATUSES.LOST_DAMAGE:
      return ['Lost / Damage', 'Lost/Damage'];
    default:
      return [canonicalStatus];
  }
}
