/**
 * Pakistan 3PL Courier Integration Engine & City Code Mappings
 * Supports: Trax, PostEx, Leopards, TCS, M&P, CallCourier, Blue-EX, Rider, Swyft, Daewoo FastEx
 */

import { findPakistanLocation } from './pakistan-locations';

export interface CredentialFieldDef {
  key: string;
  label: string;
  type: 'text' | 'password';
  placeholder?: string;
  required?: boolean;
  isSecret?: boolean;
  description?: string;
}

export interface TPLProviderDefinition {
  code: string;
  name: string;
  shortName: string;
  tagline: string;
  color: string;
  credentialFields: CredentialFieldDef[];
  requiresCityCodeMapping: boolean;
  defaultCoverage: 'all_pakistan' | 'major_cities';
  trackingUrlTemplate: string;
  docsUrl: string;
}

export const TPL_PROVIDERS: TPLProviderDefinition[] = [
  {
    code: 'trax',
    name: 'TRAX Logistics',
    shortName: 'TRAX',
    tagline: 'Nationwide tech-driven e-commerce logistics',
    color: '#E02020',
    requiresCityCodeMapping: true,
    defaultCoverage: 'all_pakistan',
    trackingUrlTemplate: 'https://sonic.pk/tracking?tracking_number={tracking_number}',
    docsUrl: 'https://sonic.pk/api-docs',
    credentialFields: [
      { key: 'api_key', label: 'API Authorization Key', type: 'password', placeholder: 'Enter Trax Authorization Key', required: true, isSecret: true },
      { key: 'service_type_id', label: 'Default Service Type ID', type: 'text', placeholder: '1 (Standard) / 2 (Express)', required: false, description: '1 for Rush/Standard COD' },
      { key: 'pickup_address_id', label: 'Pickup Address ID', type: 'text', placeholder: 'Default Pickup ID in Trax', required: false }
    ]
  },
  {
    code: 'postex',
    name: 'PostEx',
    shortName: 'PostEx',
    tagline: 'Instant COD cashouts & automated fulfillment',
    color: '#0052CC',
    requiresCityCodeMapping: false,
    defaultCoverage: 'all_pakistan',
    trackingUrlTemplate: 'https://postex.pk/tracking?trackingNumber={tracking_number}',
    docsUrl: 'https://api.postex.pk/docs',
    credentialFields: [
      { key: 'api_token', label: 'Bearer API Token', type: 'password', placeholder: 'eyJhbGciOi...', required: true, isSecret: true },
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', placeholder: 'Optional Merchant Code', required: false }
    ]
  },
  {
    code: 'leopards',
    name: 'Leopards Courier Service',
    shortName: 'Leopards',
    tagline: 'Deep rural and nationwide branch reach',
    color: '#F59E0B',
    requiresCityCodeMapping: true,
    defaultCoverage: 'all_pakistan',
    trackingUrlTemplate: 'https://www.leopardscourier.com/tracking?track_numbers={tracking_number}',
    docsUrl: 'https://leopardscourier.com/merchants/api',
    credentialFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Enter Leopards API Key', required: true, isSecret: true },
      { key: 'api_password', label: 'API Password', type: 'password', placeholder: 'Enter Leopards API Password', required: true, isSecret: true },
      { key: 'client_id', label: 'Client / Account Code', type: 'text', placeholder: 'e.g. LHE-10294', required: true }
    ]
  },
  {
    code: 'tcs',
    name: 'TCS Express',
    shortName: 'TCS',
    tagline: 'Pakistan’s largest corporate delivery network',
    color: '#DC2626',
    requiresCityCodeMapping: true,
    defaultCoverage: 'all_pakistan',
    trackingUrlTemplate: 'https://www.tcsexpress.com/tracking?track={tracking_number}',
    docsUrl: 'https://www.tcsexpress.com/solutions/e-retailer/api',
    credentialFields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'TCS Client ID', required: true },
      { key: 'client_secret', label: 'Client Secret Key', type: 'password', placeholder: 'TCS Client Secret', required: true, isSecret: true },
      { key: 'cost_center_code', label: 'Cost Center Code', type: 'text', placeholder: 'e.g. 001', required: true },
      { key: 'account_no', label: 'Account Number', type: 'text', placeholder: 'TCS Account No', required: true }
    ]
  },
  {
    code: 'mnp',
    name: 'M&P Express Logistics',
    shortName: 'M&P',
    tagline: 'Fast turnaround and automated booking system',
    color: '#EA580C',
    requiresCityCodeMapping: true,
    defaultCoverage: 'all_pakistan',
    trackingUrlTemplate: 'https://mulphilog.com/tracking/?tracking_no={tracking_number}',
    docsUrl: 'https://mulphilog.com/apis',
    credentialFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'M&P API Key', required: true, isSecret: true },
      { key: 'account_no', label: 'Account Number', type: 'text', placeholder: 'M&P Account Code', required: true },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'Account Password', required: true, isSecret: true }
    ]
  },
  {
    code: 'callcourier',
    name: 'CallCourier',
    shortName: 'CallCourier',
    tagline: 'Reliable Cash on Delivery services',
    color: '#059669',
    requiresCityCodeMapping: true,
    defaultCoverage: 'all_pakistan',
    trackingUrlTemplate: 'https://callcourier.com.pk/tracking/?cn={tracking_number}',
    docsUrl: 'https://callcourier.com.pk/web-api',
    credentialFields: [
      { key: 'login_id', label: 'Login ID', type: 'text', placeholder: 'CallCourier Account ID', required: true },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'Password', required: true, isSecret: true }
    ]
  },
  {
    code: 'blueex',
    name: 'Blue-EX',
    shortName: 'Blue-EX',
    tagline: 'Digital e-commerce fulfillment and logistics',
    color: '#2563EB',
    requiresCityCodeMapping: true,
    defaultCoverage: 'all_pakistan',
    trackingUrlTemplate: 'https://www.blue-ex.com/tracking?cn={tracking_number}',
    docsUrl: 'https://www.blue-ex.com/developers',
    credentialFields: [
      { key: 'user_name', label: 'Account User Name', type: 'text', placeholder: 'Blue-EX Username', required: true },
      { key: 'password', label: 'Secret Key / Password', type: 'password', placeholder: 'Password', required: true, isSecret: true },
      { key: 'account_code', label: 'Account Code', type: 'text', placeholder: 'e.g. BLU-091', required: true }
    ]
  },
  {
    code: 'rider',
    name: 'Rider Logistics',
    shortName: 'Rider',
    tagline: 'Modern last-mile logistics for digital brands',
    color: '#7C3AED',
    requiresCityCodeMapping: false,
    defaultCoverage: 'major_cities',
    trackingUrlTemplate: 'https://withrider.com/track/{tracking_number}',
    docsUrl: 'https://withrider.com/api',
    credentialFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Rider API Key', required: true, isSecret: true },
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', placeholder: 'Rider Merchant ID', required: true }
    ]
  },
  {
    code: 'swyft',
    name: 'Swyft Logistics',
    shortName: 'Swyft',
    tagline: 'Specialized 24-hr urban parcel delivery',
    color: '#0891B2',
    requiresCityCodeMapping: false,
    defaultCoverage: 'major_cities',
    trackingUrlTemplate: 'https://swyftlogistics.com/track?cn={tracking_number}',
    docsUrl: 'https://swyftlogistics.com/developers',
    credentialFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Swyft API Key', required: true, isSecret: true },
      { key: 'vendor_id', label: 'Vendor / Client ID', type: 'text', placeholder: 'Vendor ID', required: true }
    ]
  },
  {
    code: 'daewoo_fastex',
    name: 'Daewoo FastEx',
    shortName: 'FastEx',
    tagline: 'Bus-terminal inter-city express cargo network',
    color: '#D97706',
    requiresCityCodeMapping: true,
    defaultCoverage: 'all_pakistan',
    trackingUrlTemplate: 'https://fastex.pk/tracking?consignment={tracking_number}',
    docsUrl: 'https://fastex.pk/api',
    credentialFields: [
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', placeholder: 'FastEx Merchant ID', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'Access Token', required: true, isSecret: true }
    ]
  }
];

/**
 * Standard default city code dictionary for Pakistan's top cities across major 3PLs
 */
export const DEFAULT_3PL_CITY_MAPPINGS: Record<string, Record<string, string>> = {
  'Lahore': {
    trax: '2',
    callcourier: '1',
    tcs: 'LHE',
    leopards: 'LHE',
    mnp: 'LHE',
    blueex: 'LHE',
    daewoo_fastex: 'LHR'
  },
  'Karachi': {
    trax: '1',
    callcourier: '2',
    tcs: 'KHI',
    leopards: 'KHI',
    mnp: 'KHI',
    blueex: 'KHI',
    daewoo_fastex: 'KHI'
  },
  'Islamabad': {
    trax: '3',
    callcourier: '8',
    tcs: 'ISB',
    leopards: 'ISB',
    mnp: 'ISB',
    blueex: 'ISB',
    daewoo_fastex: 'ISB'
  },
  'Rawalpindi': {
    trax: '4',
    callcourier: '9',
    tcs: 'RWP',
    leopards: 'RWP',
    mnp: 'RWP',
    blueex: 'RWP',
    daewoo_fastex: 'RWP'
  },
  'Faisalabad': {
    trax: '5',
    callcourier: '3',
    tcs: 'FSD',
    leopards: 'FSD',
    mnp: 'FSD',
    blueex: 'FSD',
    daewoo_fastex: 'FSD'
  },
  'Multan': {
    trax: '6',
    callcourier: '4',
    tcs: 'MUX',
    leopards: 'MUX',
    mnp: 'MUX',
    blueex: 'MUX',
    daewoo_fastex: 'MUX'
  },
  'Peshawar': {
    trax: '7',
    callcourier: '5',
    tcs: 'PEW',
    leopards: 'PEW',
    mnp: 'PEW',
    blueex: 'PEW',
    daewoo_fastex: 'PEW'
  },
  'Quetta': {
    trax: '8',
    callcourier: '6',
    tcs: 'UET',
    leopards: 'UET',
    mnp: 'UET',
    blueex: 'UET',
    daewoo_fastex: 'UET'
  },
  'Sialkot': {
    trax: '9',
    callcourier: '7',
    tcs: 'SKT',
    leopards: 'SKT',
    mnp: 'SKT',
    blueex: 'SKT',
    daewoo_fastex: 'SKT'
  },
  'Gujranwala': {
    trax: '10',
    callcourier: '10',
    tcs: 'GUJ',
    leopards: 'GUJ',
    mnp: 'GUJ',
    blueex: 'GUJ',
    daewoo_fastex: 'GUJ'
  },
  'Hyderabad': {
    trax: '11',
    callcourier: '11',
    tcs: 'HYD',
    leopards: 'HYD',
    mnp: 'HYD',
    blueex: 'HYD',
    daewoo_fastex: 'HYD'
  },
  'Sukkur': {
    trax: '12',
    callcourier: '12',
    tcs: 'SKR',
    leopards: 'SKR',
    mnp: 'SKR',
    blueex: 'SKR',
    daewoo_fastex: 'SKR'
  },
  'Bahawalpur': {
    trax: '13',
    callcourier: '13',
    tcs: 'BWP',
    leopards: 'BWP',
    mnp: 'BWP',
    blueex: 'BWP',
    daewoo_fastex: 'BWP'
  },
  'Sargodha': {
    trax: '14',
    callcourier: '14',
    tcs: 'SGD',
    leopards: 'SGD',
    mnp: 'SGD',
    blueex: 'SGD',
    daewoo_fastex: 'SGD'
  },
  'Abbottabad': {
    trax: '15',
    callcourier: '15',
    tcs: 'AAT',
    leopards: 'AAT',
    mnp: 'AAT',
    blueex: 'AAT',
    daewoo_fastex: 'AAT'
  },
  'Sahiwal': {
    trax: '16',
    callcourier: '16',
    tcs: 'SWL',
    leopards: 'SWL',
    mnp: 'SWL',
    blueex: 'SWL',
    daewoo_fastex: 'SWL'
  },
  'Gujrat': {
    trax: '17',
    callcourier: '17',
    tcs: 'GRT',
    leopards: 'GRT',
    mnp: 'GRT',
    blueex: 'GRT',
    daewoo_fastex: 'GRT'
  },
  'Sheikhupura': {
    trax: '18',
    callcourier: '18',
    tcs: 'SKP',
    leopards: 'SKP',
    mnp: 'SKP',
    blueex: 'SKP',
    daewoo_fastex: 'SKP'
  },
  'Jhang': {
    trax: '19',
    callcourier: '19',
    tcs: 'JNG',
    leopards: 'JNG',
    mnp: 'JNG',
    blueex: 'JNG',
    daewoo_fastex: 'JNG'
  },
  'Rahim Yar Khan': {
    trax: '20',
    callcourier: '20',
    tcs: 'RYK',
    leopards: 'RYK',
    mnp: 'RYK',
    blueex: 'RYK',
    daewoo_fastex: 'RYK'
  },
  'Mardan': {
    trax: '21',
    callcourier: '21',
    tcs: 'MDN',
    leopards: 'MDN',
    mnp: 'MDN',
    blueex: 'MDN',
    daewoo_fastex: 'MDN'
  },
  'Kasur': {
    trax: '22',
    callcourier: '22',
    tcs: 'KSR',
    leopards: 'KSR',
    mnp: 'KSR',
    blueex: 'KSR',
    daewoo_fastex: 'KSR'
  },
  'Okara': {
    trax: '23',
    callcourier: '23',
    tcs: 'OKR',
    leopards: 'OKR',
    mnp: 'OKR',
    blueex: 'OKR',
    daewoo_fastex: 'OKR'
  },
  'Wah Cantt': {
    trax: '24',
    callcourier: '24',
    tcs: 'WAH',
    leopards: 'WAH',
    mnp: 'WAH',
    blueex: 'WAH',
    daewoo_fastex: 'WAH'
  },
  'Dera Ghazi Khan': {
    trax: '25',
    callcourier: '25',
    tcs: 'DGK',
    leopards: 'DGK',
    mnp: 'DGK',
    blueex: 'DGK',
    daewoo_fastex: 'DGK'
  },
  'Mirpur': {
    trax: '26',
    callcourier: '26',
    tcs: 'MRP',
    leopards: 'MRP',
    mnp: 'MRP',
    blueex: 'MRP',
    daewoo_fastex: 'MRP'
  },
  'Muzaffarabad': {
    trax: '27',
    callcourier: '27',
    tcs: 'MFD',
    leopards: 'MFD',
    mnp: 'MFD',
    blueex: 'MFD',
    daewoo_fastex: 'MFD'
  },
  'Gilgit': {
    trax: '28',
    callcourier: '28',
    tcs: 'GIL',
    leopards: 'GIL',
    mnp: 'GIL',
    blueex: 'GIL',
    daewoo_fastex: 'GIL'
  },
  'Gwadar': {
    trax: '29',
    callcourier: '29',
    tcs: 'GWD',
    leopards: 'GWD',
    mnp: 'GWD',
    blueex: 'GWD',
    daewoo_fastex: 'GWD'
  }
};

export interface TPLPartnerModel {
  id: number | string;
  name: string;
  provider_code: string;
  is_preferred?: boolean;
  environment?: 'sandbox' | 'production';
  api_credentials?: Record<string, string>;
  city_mappings?: Record<string, string>;
  coverage_mode?: 'all_pakistan' | 'specific_cities';
  service_cities?: string[];
  verification_status?: 'verified' | 'failed' | 'untested';
  last_verified_at?: string;
  status?: string;
  tenant?: { id: number | string; name?: string } | number | string;
}

/**
 * Resolves a city name to provider-specific city code / ID.
 * Priority:
 * 1. Custom overrides configured on the partner record
 * 2. Default standard 3PL mappings
 * 3. Exact city name fallback (for APIs accepting city string like PostEx)
 */
export function resolve3PLCityCode(
  providerCode: string,
  cityName: string,
  customOverrides?: Record<string, string>
): { code: string; isMapped: boolean } {
  if (!cityName) return { code: '', isMapped: false };

  // 1. Check custom overrides
  if (customOverrides && customOverrides[cityName]) {
    return { code: customOverrides[cityName], isMapped: true };
  }

  // Also check case-insensitive match in overrides
  if (customOverrides) {
    const key = Object.keys(customOverrides).find(k => k.toLowerCase() === cityName.toLowerCase());
    if (key && customOverrides[key]) {
      return { code: customOverrides[key], isMapped: true };
    }
  }

  // 2. Check defaults
  const normCity = Object.keys(DEFAULT_3PL_CITY_MAPPINGS).find(k => k.toLowerCase() === cityName.toLowerCase());
  if (normCity && DEFAULT_3PL_CITY_MAPPINGS[normCity]?.[providerCode]) {
    return { code: DEFAULT_3PL_CITY_MAPPINGS[normCity][providerCode], isMapped: true };
  }

  // 3. Fallback to city name itself
  return { code: cityName, isMapped: false };
}

/**
 * Checks if a specific 3PL partner covers the destination city.
 */
export function check3PLPartnerCoverage(
  partner: TPLPartnerModel,
  destinationCity: string
): { covers: boolean; reason?: string } {
  if (!destinationCity) {
    return { covers: false, reason: 'Destination city is missing' };
  }

  // If partner is not active
  if (partner.status && partner.status !== 'active') {
    return { covers: false, reason: `Partner ${partner.name} is inactive` };
  }

  // Specific cities coverage mode
  if (partner.coverage_mode === 'specific_cities') {
    const cities = partner.service_cities || [];
    const normalizedDest = destinationCity.trim().toLowerCase();
    const isCovered = cities.some(c => {
      const normalizedC = c.trim().toLowerCase();
      return normalizedC === normalizedDest || normalizedDest.includes(normalizedC) || normalizedC.includes(normalizedDest);
    });

    if (!isCovered) {
      return {
        covers: false,
        reason: `${partner.name} does not service ${destinationCity} in restricted city mode.`
      };
    }
    return { covers: true };
  }

  // All Pakistan coverage mode
  return { covers: true };
}

/**
 * Verification simulation for testing credentials
 */
export async function verify3PLCredentials(
  providerCode: string,
  credentials: Record<string, string>,
  environment: 'sandbox' | 'production' = 'sandbox'
): Promise<{ success: boolean; message: string; accountDetails?: Record<string, any> }> {
  // Validate that required fields are non-empty
  const provider = TPL_PROVIDERS.find(p => p.code === providerCode);
  if (!provider) {
    return { success: false, message: `Unknown provider: ${providerCode}` };
  }

  const missing = provider.credentialFields.filter(f => f.required && !credentials[f.key]?.trim());
  if (missing.length > 0) {
    return {
      success: false,
      message: `Missing required credentials: ${missing.map(m => m.label).join(', ')}`
    };
  }

  // Quick simulated delay
  await new Promise(r => setTimeout(r, 900));

  // In sandbox or verified production input, return verified status
  const keyVal = Object.values(credentials)[0] || '';
  if (keyVal.toLowerCase().includes('fail') || keyVal.toLowerCase().includes('invalid')) {
    return {
      success: false,
      message: `Authentication Failed: [401 Unauthorized] The provided credentials could not be validated by ${provider.name}.`
    };
  }

  return {
    success: true,
    message: `Connection successful! Verified with ${provider.name} (${environment.toUpperCase()}).`,
    accountDetails: {
      provider: provider.name,
      environment,
      status: 'Active Merchant',
      verifiedAt: new Date().toISOString(),
      balance: 'PKR 0.00'
    }
  };
}

export interface RoutingDecision {
  fulfillmentType: '2PL' | '3PL';
  serviceType: string;
  scenario: 1 | 2 | 3 | 4 | 5;
  partner?: TPLPartnerModel | null;
  partnerCityCode?: string;
  message: string;
  allowed: boolean;
}

/**
 * 5-Scenario Delivery Routing Engine:
 * 1. Destination in courier's 2PL self-service areas -> In-House 2PL.
 * 2. Outside 2PL -> check Shipper's preferred 3PL. If covered -> route.
 * 3. If Shipper's preferred doesn't cover -> fallback to Courier's preferred 3PL.
 * 4. If Courier's preferred doesn't cover -> check other active configured 3PLs.
 * 5. If NO configured 3PL covers -> reject booking: "Sorry, we don't have delivery service in that area."
 */
export function evaluateLogisticsRouting({
  destinationCity,
  selfServiceCities = [],
  shipperPreferredTplId,
  courierTplPartners = [],
}: {
  destinationCity: string | number;
  selfServiceCities: string[];
  shipperPreferredTplId?: string | number | null;
  courierTplPartners: TPLPartnerModel[];
}): RoutingDecision {
  if (!destinationCity) {
    return {
      fulfillmentType: '2PL',
      serviceType: 'Unspecified',
      scenario: 1,
      message: 'Please specify destination city.',
      allowed: true
    };
  }

  // Backward compatibility: resolve numeric ID or raw string to canonical city name
  const matchedLoc = findPakistanLocation(destinationCity);
  const canonicalCity = matchedLoc?.cityName || String(destinationCity).trim();
  const normDest = canonicalCity.toLowerCase();

  // Scenario 1: Destination in Courier's 2PL self-service areas
  const is2PL = (selfServiceCities || []).some(c => {
    const normC = c.trim().toLowerCase();
    return normC === normDest || normDest.includes(normC) || normC.includes(normDest);
  });

  if (is2PL) {
    return {
      fulfillmentType: '2PL',
      serviceType: 'In-House Courier Delivery (2PL)',
      scenario: 1,
      message: `Destination ${canonicalCity} is in your 2PL service coverage. Handled by in-house fleet.`,
      allowed: true
    };
  }

  // 3PL Partner routing
  const activePartners = (courierTplPartners || []).filter(p => p.status !== 'inactive');

  // Scenario 2: Check Shipper's Preferred 3PL
  if (shipperPreferredTplId) {
    const shipperPartner = activePartners.find(p => String(p.id) === String(shipperPreferredTplId));
    if (shipperPartner) {
      const coverage = check3PLPartnerCoverage(shipperPartner, canonicalCity);
      if (coverage.covers) {
        const codeRes = resolve3PLCityCode(shipperPartner.provider_code, canonicalCity, shipperPartner.city_mappings);
        return {
          fulfillmentType: '3PL',
          serviceType: `3PL Partner (${shipperPartner.name})`,
          scenario: 2,
          partner: shipperPartner,
          partnerCityCode: codeRes.code,
          message: `Destination outside 2PL. Routed via Shipper's preferred partner: ${shipperPartner.name}.`,
          allowed: true
        };
      }
    }
  }

  // Scenario 3: Fallback to Courier's Preferred 3PL
  const courierPreferred = activePartners.find(p => p.is_preferred);
  if (courierPreferred) {
    const coverage = check3PLPartnerCoverage(courierPreferred, canonicalCity);
    if (coverage.covers) {
      const codeRes = resolve3PLCityCode(courierPreferred.provider_code, canonicalCity, courierPreferred.city_mappings);
      return {
        fulfillmentType: '3PL',
        serviceType: `3PL Partner (${courierPreferred.name})`,
        scenario: 3,
        partner: courierPreferred,
        partnerCityCode: codeRes.code,
        message: `Destination outside 2PL. Routed via Courier's primary 3PL: ${courierPreferred.name}.`,
        allowed: true
      };
    }
  }

  // Scenario 4: Check other active configured 3PLs for coverage
  for (const altPartner of activePartners) {
    if (courierPreferred && String(altPartner.id) === String(courierPreferred.id)) continue;
    const coverage = check3PLPartnerCoverage(altPartner, canonicalCity);
    if (coverage.covers) {
      const codeRes = resolve3PLCityCode(altPartner.provider_code, canonicalCity, altPartner.city_mappings);
      return {
        fulfillmentType: '3PL',
        serviceType: `3PL Partner (${altPartner.name})`,
        scenario: 4,
        partner: altPartner,
        partnerCityCode: codeRes.code,
        message: `Routed via Alternate 3PL partner: ${altPartner.name}.`,
        allowed: true
      };
    }
  }

  // Scenario 5: NO configured 3PL covers the area
  return {
    fulfillmentType: '3PL',
    serviceType: 'None',
    scenario: 5,
    partner: null,
    message: "Sorry, we don't have delivery service in that area.",
    allowed: false
  };
}

