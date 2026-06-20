import { z } from 'zod';

export const shipmentSchema = z.object({
  originRegion: z.string().min(1, 'Origin region is required'),
  destinationRegion: z.string().min(1, 'Destination region is required'),
  weight: z.number().min(0.1, 'Weight must be at least 0.1kg'),
  codAmount: z.number().min(0, 'COD amount cannot be negative'),
  customerName: z.string().min(2, 'Customer name is too short'),
  customerPhone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  customerAddress: z.string().min(5, 'Address is too short'),
});

export type ShipmentFormValues = z.infer<typeof shipmentSchema>;

export const regions = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Faisalabad',
  'Rawalpindi',
  'Multan',
  'Peshawar',
  'Quetta',
] as const;
