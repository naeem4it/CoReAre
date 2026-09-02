import { z } from 'zod';

export const shipmentSchema = z.object({
  sourceCity: z.union([z.number(), z.literal('')]).optional(),
  destinationCity: z.union([z.number(), z.literal('')]).optional(),
  originRegion: z.string().optional(),
  destinationRegion: z.string().optional(),
  weight: z.number().min(0.1, 'Weight must be at least 0.1kg'),
  codAmount: z.number().min(0, 'COD amount cannot be negative'),
  customerName: z.string().min(2, 'Customer name is too short'),
  customerPhone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  customerAddress: z.string().min(5, 'Address is too short'),
  pickupLocation: z.string().optional(),
});

export const regions = [
  'Karachi Central',
  'Lahore South',
  'Islamabad Capital',
  'Rawalpindi Cantt',
  'Faisalabad City',
  'Multan Hub',
  'Peshawar Cantt',
  'Quetta City',
];

export type ShipmentFormValues = z.infer<typeof shipmentSchema>;
