import { z } from 'zod';

const preprocessNumber = (val: unknown) => {
  if (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
    return undefined;
  }
  const n = Number(val);
  return isNaN(n) ? val : n;
};

export const shipmentSchema = z.object({
  sourceCity: z.union([z.number(), z.literal('')]).optional(),
  destinationCity: z.union([z.number(), z.literal('')]).optional(),
  originRegion: z.string().optional(),
  destinationRegion: z.string().optional(),
  weight: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number({
      required_error: 'Weight is required',
      invalid_type_error: 'Weight must be a valid number',
    }).min(0.1, 'Weight must be at least 0.1kg')
  ),
  codAmount: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number({
      required_error: 'COD amount is required (enter 0 for prepaid parcels)',
      invalid_type_error: 'COD amount must be a valid number (enter 0 for prepaid)',
    }).min(0, 'COD amount cannot be negative')
  ),
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
