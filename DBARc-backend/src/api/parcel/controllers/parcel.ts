import { factories } from '@strapi/strapi';

function normalizePostExCity(city: string): string {
  const c = (city || '').trim();
  const lower = c.toLowerCase();
  if (lower.includes('karachi')) return 'Karachi';
  if (lower.includes('lahore')) return 'Lahore';
  if (lower.includes('islamabad')) return 'Islamabad';
  if (lower.includes('rawalpindi')) return 'Rawalpindi';
  if (lower.includes('faisalabad')) return 'Faisalabad';
  if (lower.includes('multan')) return 'Multan';
  if (lower.includes('peshawar')) return 'Peshawar';
  if (lower.includes('quetta')) return 'Quetta';
  if (lower.includes('sialkot')) return 'Sialkot';
  if (lower.includes('gujranwala')) return 'Gujranwala';
  if (lower.includes('hyderabad')) return 'Hyderabad';
  if (lower.includes('sukkur')) return 'Sukkur';
  if (lower.includes('bahawalpur')) return 'Bahawalpur';
  if (lower.includes('sargodha')) return 'Sargodha';
  if (lower.includes('abbottabad')) return 'Abbottabad';
  if (lower.includes('gujrat')) return 'Gujrat';
  if (lower.includes('sahiwal')) return 'Sahiwal';
  if (lower.includes('sheikhupura')) return 'Sheikhupura';
  if (lower.includes('jhelum')) return 'Jhelum';
  if (lower.includes('mardan')) return 'Mardan';
  return c || 'Karachi';
}

interface Book3PLResult {
  trackingNumber: string;
  provider: string;
  response?: any;
  payload?: any;
  status?: number;
  error?: string;
}

async function book3PLConsignment(
  strapi: any,
  parcelData: {
    tracking_number: string;
    recipient_name?: string;
    recipient_phone?: string;
    recipient_address?: string;
    rawDestCityName?: string;
    destination_city_name?: string;
    payment_type?: string;
    cod_amount?: number | string;
    pieces?: number | string;
    comments?: string;
    product_description?: string;
    tenant?: number | string | null;
  },
  tenantId?: number | string | null
): Promise<Book3PLResult | null> {
  try {
    const tid = tenantId || parcelData.tenant || null;

    // Query active 3PL partners configured by admin
    const partners = await strapi.db.query('api::tpl-partner.tpl-partner').findMany({
      where: {
        status: 'active',
      },
      populate: ['tenant']
    });

    // 1. Try to find partner matching tenantId
    let partner = partners.find((p: any) => {
      if (!tid) return false;
      const pTid = p.tenant?.id || p.tenant;
      return String(pTid) === String(tid);
    });

    // 2. If not found by tenant, prefer the one with a valid production base64 token
    if (!partner) {
      partner = partners.find((p: any) => p.environment === 'production' || (p.api_credentials?.api_token && !p.api_credentials.api_token.includes('sandbox')));
    }

    // 3. Fallback to first active partner
    if (!partner && partners.length > 0) {
      partner = partners[0];
    }

    if (!partner) {
      console.warn('⚠️ [3PL BOOKING WARNING]: No active 3PL partner found in tpl_partners.');
      return null;
    }

    const credentials = partner?.api_credentials || partner?.credentials || {};
    const apiToken = credentials.api_token || credentials.token || '';
    const providerCode = (partner.provider_code || 'postex').toLowerCase();
    const providerName = partner.name || (providerCode === 'postex' ? 'PostEx' : providerCode.toUpperCase());

    if (!apiToken) {
      console.warn(`⚠️ [3PL BOOKING WARNING]: No active API token found for partner: ${providerName}`);
      return null;
    }

    // Provider: PostEx
    if (providerCode === 'postex') {
      const cleanCity = normalizePostExCity(parcelData.rawDestCityName || parcelData.destination_city_name || parcelData.recipient_address || 'Karachi');

      let phone = String(parcelData.recipient_phone || '03001234567').replace(/\D/g, '');
      if (phone.startsWith('92')) phone = '0' + phone.slice(2);
      if (!phone.startsWith('0')) phone = '0' + phone;

      const postExPayload = {
        cityName: cleanCity,
        customerName: parcelData.recipient_name || 'Customer',
        customerPhone: phone,
        deliveryAddress: parcelData.recipient_address || `${cleanCity}, Pakistan`,
        invoiceDivision: 1,
        invoicePayment: parcelData.payment_type === 'PAID' ? 0 : (Number(parcelData.cod_amount) || 0),
        items: Number(parcelData.pieces) || 1,
        orderDetail: parcelData.comments || parcelData.product_description || 'General Goods',
        orderRefNumber: parcelData.tracking_number,
        orderType: 'Normal',
        transactionNotes: 'DBARc 3PL Booking'
      };

      console.log('\n============================================================');
      console.log('🚀 [3PL SERVICE BOOKING REQUEST]');
      console.log(`Tracking Number: ${parcelData.tracking_number}`);
      console.log(`Provider: PostEx (${providerName})`);
      console.log(`Payload:`, JSON.stringify(postExPayload, null, 2));
      console.log('============================================================\n');

      const postexRes = await fetch('https://api.postex.pk/services/integration/api/order/v1/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': apiToken
        },
        body: JSON.stringify(postExPayload)
      });

      const httpStatus = postexRes.status;
      const responseJson: any = await postexRes.json().catch(() => ({}));

      console.log('\n============================================================');
      console.log('📥 [3PL SERVICE BOOKING RESPONSE]');
      console.log(`Provider: PostEx (${providerName})`);
      console.log(`HTTP Status: ${httpStatus}`);
      console.log(`Response Body:`, JSON.stringify(responseJson, null, 2));
      console.log('============================================================\n');

      if (postexRes.ok && (responseJson.statusCode === '200' || responseJson.statusCode === 200)) {
        const tplCn = responseJson.dist?.trackingNumber || responseJson.trackingNumber;
        console.log(`✅ [3PL BOOKED SUCCESSFULLY]: ${parcelData.tracking_number} -> PostEx CN: ${tplCn}`);
        return {
          trackingNumber: tplCn,
          provider: 'PostEx',
          response: responseJson,
          payload: postExPayload,
          status: httpStatus
        };
      } else {
        const errMsg = responseJson.statusMessage || responseJson.message || `HTTP ${httpStatus}`;
        console.error(`❌ [3PL BOOKING FAILED] for ${parcelData.tracking_number}:`, errMsg);
        return {
          trackingNumber: '',
          provider: 'PostEx',
          error: errMsg,
          response: responseJson,
          status: httpStatus
        };
      }
    }

    return null;
  } catch (err: any) {
    console.error('❌ [3PL BOOKING EXCEPTION]:', err.message || err);
    return null;
  }
}

export default factories.createCoreController('api::parcel.parcel', ({ strapi }) => ({
  async create(ctx: any) {
    const { data } = ctx.request.body;
    
    // Default to not 3PL unless explicitly specified
    if (data.is_3pl === undefined) {
      data.is_3pl = false;
    }

    // When shipper/user adds an order, status must be 'Booked'
    if (!data.status || data.status === 'Total Booking' || String(data.status).toLowerCase() === 'booked') {
      data.status = 'Booked';
    }

    // Auto-generate tracking number with SHZ prefix and numeric sequence if not provided,
    // or if the provided tracking number already exists in the database.
    let needsTracking = !data.tracking_number;
    if (data.tracking_number) {
      const existing = await strapi.db.query('api::parcel.parcel').findOne({
        where: { tracking_number: data.tracking_number }
      });
      if (existing) {
        needsTracking = true;
      }
    }

    if (needsTracking) {
      const prefix = 'SHZ';
      const lastParcel = await strapi.db.query('api::parcel.parcel').findOne({
        where: { tracking_number: { $startsWith: prefix } },
        orderBy: { id: 'desc' }
      });
      let nextSeq = 100001134;
      if (lastParcel && lastParcel.tracking_number) {
        const num = parseInt(lastParcel.tracking_number.replace(prefix, ''), 10);
        if (!isNaN(num) && num >= 100000000) {
          nextSeq = num + 1;
        }
      }
      // Safety check to guarantee uniqueness
      while (await strapi.db.query('api::parcel.parcel').findOne({ where: { tracking_number: `${prefix}${nextSeq}` } })) {
        nextSeq++;
      }
      data.tracking_number = `${prefix}${nextSeq}`;
    }

    // Map and sanitize non-schema routing parameters
    if (data.fulfillment_type) {
      if (data.fulfillment_type === '3PL' || data.fulfillment_type === '3PL Partner') {
        data.is_3pl = true;
      }
      delete data.fulfillment_type;
    }
    if ('tpl_partner' in data) delete data.tpl_partner;
    if ('tpl_city_code' in data) delete data.tpl_city_code;
    if ('routing_scenario' in data) delete data.routing_scenario;

    // Safely resolve source_city if string city name was provided
    if (data.source_city && typeof data.source_city === 'string' && isNaN(Number(data.source_city))) {
      const foundCity = await strapi.db.query('api::city.city').findOne({
        where: { CityName: { $eqi: data.source_city.trim() } }
      });
      data.source_city = foundCity ? foundCity.id : null;
    } else if (data.source_city) {
      data.source_city = Number(data.source_city) || null;
    }

    // Safely resolve destination_city if string city name was provided
    let rawDestCityName = typeof data.destination_city === 'string' ? data.destination_city.trim() : '';
    if (data.destination_city && typeof data.destination_city === 'string' && isNaN(Number(data.destination_city))) {
      const foundCity = await strapi.db.query('api::city.city').findOne({
        where: { CityName: { $eqi: data.destination_city.trim() } }
      });
      data.destination_city = foundCity ? foundCity.id : null;
      if (foundCity && foundCity.CityName) {
        rawDestCityName = foundCity.CityName;
      }
    } else if (data.destination_city) {
      data.destination_city = Number(data.destination_city) || null;
      if (data.destination_city && !rawDestCityName) {
        const foundCity = await strapi.db.query('api::city.city').findOne({
          where: { id: data.destination_city }
        });
        if (foundCity && foundCity.CityName) {
          rawDestCityName = foundCity.CityName;
        }
      }
    }

    // Auto populate shipper from pickup_location if available and shipper not explicitly passed
    if (!data.shipper && data.pickup_location) {
      const pickupLoc = await strapi.db.query('api::pickup-location.pickup-location').findOne({
        where: { id: data.pickup_location },
        populate: ['shipper']
      });
      if (pickupLoc && pickupLoc.shipper) {
        data.shipper = pickupLoc.shipper.id || pickupLoc.shipper;
      }
    }

    // Safely validate and resolve shipper relation if provided
    if (data.shipper) {
      const shipperIdNum = Number(data.shipper);
      if (isNaN(shipperIdNum)) {
        data.shipper = null;
      } else {
        const existingShipper = await strapi.db.query('api::shipper.shipper').findOne({
          where: { id: shipperIdNum }
        });
        if (!existingShipper) {
          // Fallback to tenant's first valid shipper if provided ID does not exist in DB
          let fallback = null;
          if (data.tenant) {
            fallback = await strapi.db.query('api::shipper.shipper').findOne({
              where: { tenant: data.tenant }
            });
          }
          data.shipper = fallback ? fallback.id : null;
        } else {
          data.shipper = existingShipper.id;
        }
      }
    }

    // Safely validate origin_office relation if provided
    if (data.origin_office) {
      const officeIdNum = Number(data.origin_office);
      if (isNaN(officeIdNum)) {
        data.origin_office = null;
      } else {
        const existingOffice = await strapi.db.query('api::office.office').findOne({
          where: { id: officeIdNum }
        });
        data.origin_office = existingOffice ? existingOffice.id : null;
      }
    }

    if (data.destination_city && data.courier) {
      // Find if the courier has an active region covering this city
      const courierRegions = await strapi.db.query('api::region.region').findMany({
        where: {
          courier: data.courier,
          active: true,
          cities: { id: data.destination_city }
        }
      });

      if (courierRegions.length === 0) {
        // Fallback to Tenant default regions if courier doesn't cover it
        if (data.tenant) {
          const tenantRegions = await strapi.db.query('api::region.region').findMany({
            where: {
              tenant: data.tenant,
              active: true,
              cities: { id: data.destination_city }
            }
          });

          if (tenantRegions.length === 0) {
            // Not covered by courier nor tenant default -> route to 3PL
            data.is_3pl = true;
          }
        } else {
          data.is_3pl = true;
        }
      }
    }

    // --- 3PL SERVICE INTEGRATION (Admin-Configured 3PL Partner e.g. PostEx) ---
    let tplBookingMeta: any = null;

    if (data.is_3pl) {
      const tenantId = data.tenant || ctx.request.headers?.['x-tenant-id'] || ctx.state?.user?.tenant?.id || null;
      const tplResult = await book3PLConsignment(strapi, { ...data, rawDestCityName }, tenantId);

      if (tplResult) {
        tplBookingMeta = {
          provider: tplResult.provider,
          status: tplResult.status,
          payload: tplResult.payload,
          response: tplResult.response
        };

        if (tplResult.trackingNumber) {
          data.secondary_barcode = tplResult.trackingNumber;
          data.reference_number = tplResult.trackingNumber;
          data.service_provider = tplResult.provider;
          data.comments = data.comments 
            ? `${data.comments} | 3PL ${tplResult.provider} (CN: ${tplResult.trackingNumber})`
            : `3PL ${tplResult.provider} (CN: ${tplResult.trackingNumber})`;
        }
      }
    }

    // Call default create controller
    const result: any = await super.create(ctx);
    if (tplBookingMeta && result?.data) {
      result.data.tpl_booking = tplBookingMeta;
    }
    return result;
  },

  async find(ctx: any) {
    // If client queries by numeric id e.g. filters[id][$eq]=372, translate to documentId
    if (ctx.query?.filters?.id) {
      const idVal = ctx.query.filters.id.$eq || ctx.query.filters.id;
      if (idVal && !isNaN(Number(idVal))) {
        const item = await strapi.db.query('api::parcel.parcel').findOne({
          where: { id: Number(idVal) },
        });
        if (item && item.documentId) {
          ctx.query.filters.documentId = { $eq: item.documentId };
          delete ctx.query.filters.id;
        }
      }
    }
    return await super.find(ctx);
  },

  async findOne(ctx: any) {
    const { id } = ctx.params;
    const existing = await strapi.db.query('api::parcel.parcel').findOne({
      where: { $or: [{ id: isNaN(Number(id)) ? 0 : Number(id) }, { documentId: String(id) }] },
      populate: true,
    });

    if (!existing) {
      return ctx.notFound('Parcel not found');
    }

    if (existing.documentId) {
      ctx.params.id = existing.documentId;
    }

    return await super.findOne(ctx);
  },

  async update(ctx: any) {
    const { id } = ctx.params;
    const { data } = ctx.request.body || {};

    // Validate that parcel exists and check status
    const existing = await strapi.db.query('api::parcel.parcel').findOne({
      where: { $or: [{ id: isNaN(Number(id)) ? 0 : Number(id) }, { documentId: String(id) }] }
    });

    if (!existing) {
      return ctx.notFound('Parcel not found');
    }

    // Ensure ctx.params.id is the documentId required by Strapi 5 core update controller
    if (existing.documentId) {
      ctx.params.id = existing.documentId;
    }

    // Business Rule: Only parcels in 'Booked' status can have their order/booking details updated
    const statusNormalized = String(existing.status || '').toLowerCase().trim();
    const isBooked = statusNormalized === 'booked' || statusNormalized === 'total booking';
    
    // Strict Cancellation Rule: Cannot cancel if order is already in transit or completed
    if (data?.status === 'Cancelled') {
      const nonCancellable = ['in transit', 'arrived at destination', 'arrived at warehouse (dest)', 'out for delivery', 'delivered', 'delivery failed', 'ready for return', 'return to shipper', 'lost / damage'];
      if (nonCancellable.some(st => statusNormalized.includes(st))) {
        return ctx.badRequest(`Cannot cancel order: Order is already in transit or completed (Current status: '${existing.status}').`);
      }
    }

    // If order is beyond booked status and customer/order details are being edited
    if (!isBooked && data?.status !== 'Cancelled' && data && (
      data.recipient_name !== undefined ||
      data.recipient_phone !== undefined ||
      data.recipient_address !== undefined ||
      data.cod_amount !== undefined ||
      data.weight !== undefined ||
      data.destination_city !== undefined
    )) {
      return ctx.badRequest(`Cannot edit order: Only orders in 'Booked' status can be modified. (Current status: '${existing.status}')`);
    }

    // Sync remarks and comments
    if (data?.remarks && !data.comments) {
      data.comments = data.remarks;
    } else if (data?.comments && !data.remarks) {
      data.remarks = data.comments;
    }

    // Safely resolve source_city if string city name was provided
    if (data?.source_city && typeof data.source_city === 'string' && isNaN(Number(data.source_city))) {
      const foundCity = await strapi.db.query('api::city.city').findOne({
        where: { CityName: { $eqi: data.source_city.trim() } }
      });
      data.source_city = foundCity ? foundCity.id : null;
    }

    // Safely resolve destination_city if string city name was provided
    if (data?.destination_city && typeof data.destination_city === 'string' && isNaN(Number(data.destination_city))) {
      const foundCity = await strapi.db.query('api::city.city').findOne({
        where: { CityName: { $eqi: data.destination_city.trim() } }
      });
      data.destination_city = foundCity ? foundCity.id : null;
    }

    return await super.update(ctx);
  },

  async getStats(ctx: any) {
    const shipperId = ctx.query.shipperId || ctx.query.shipper;
    
    let whereCondition: any = {};
    if (shipperId) {
      const sId = Number(shipperId);
      whereCondition = {
        $or: [
          { shipper: sId },
          { pickup_location: { shipper: sId } }
        ]
      };
    }

    const totalShipments = await strapi.db.query('api::parcel.parcel').count({
      where: whereCondition
    });

    const notArrived = await strapi.db.query('api::parcel.parcel').count({
      where: {
        ...whereCondition,
        status: { $in: ['booked', 'Booked', 'Total Booking', 'Not Arrived'] }
      }
    });

    const arrived = await strapi.db.query('api::parcel.parcel').count({
      where: {
        ...whereCondition,
        status: { $in: ['Arrived', 'Arrived At Destination', 'Out For delivery', 'Ready To Return', 'Return Dispatched'] }
      }
    });

    const delivered = await strapi.db.query('api::parcel.parcel').count({
      where: {
        ...whereCondition,
        status: 'Delivered'
      }
    });

    return {
      data: {
        totalShipments,
        notArrived,
        arrived,
        delivered
      }
    };
  },

  async createBulk(ctx: any) {
    const body = ctx.request.body || {};
    const parcels = Array.isArray(body.parcels) ? body.parcels : (Array.isArray(body.data) ? body.data : (Array.isArray(body) ? body : []));

    if (!parcels || parcels.length === 0) {
      return ctx.badRequest('No parcels provided in request body');
    }

    const defaultTenantId = ctx.request.headers?.['x-tenant-id'] || ctx.state?.user?.tenant?.id || null;

    // 1. Prefetch all cities in 1 query for instant O(1) in-memory resolution
    const allCities = await strapi.db.query('api::city.city').findMany({
      select: ['id', 'CityName']
    });
    const cityMap = new Map<string, number>();
    for (const c of allCities) {
      if (c.CityName) {
        cityMap.set(c.CityName.trim().toLowerCase(), c.id);
      }
    }

    // 2. Prefetch tracking sequence starting point
    const prefix = 'SHZ';
    const lastParcel = await strapi.db.query('api::parcel.parcel').findOne({
      where: { tracking_number: { $startsWith: prefix } },
      orderBy: { id: 'desc' }
    });
    let nextSeq = 100001134;
    if (lastParcel && lastParcel.tracking_number) {
      const num = parseInt(lastParcel.tracking_number.replace(prefix, ''), 10);
      if (!isNaN(num) && num >= 100000000) {
        nextSeq = num + 1;
      }
    }

    // 3. Insert in controlled concurrent sub-batches of 25 to respect DB pool
    const createdParcels: any[] = [];
    const errors: any[] = [];
    const SUB_BATCH_SIZE = 25;

    for (let i = 0; i < parcels.length; i += SUB_BATCH_SIZE) {
      const slice = parcels.slice(i, i + SUB_BATCH_SIZE);
      const batchPromises = slice.map(async (p: any) => {
        try {
          const trackingId = p.tracking_number || `${prefix}${nextSeq++}`;

          let destCityId = p.destination_city;
          let rawDestCityName = '';
          if (typeof destCityId === 'string' && isNaN(Number(destCityId))) {
            rawDestCityName = destCityId.trim();
            destCityId = cityMap.get(destCityId.trim().toLowerCase()) || null;
          } else if (destCityId) {
            destCityId = Number(destCityId) || null;
            rawDestCityName = p.destination_city_name || '';
          }

          let sourceCityId = p.source_city;
          if (typeof sourceCityId === 'string' && isNaN(Number(sourceCityId))) {
            sourceCityId = cityMap.get(sourceCityId.trim().toLowerCase()) || null;
          } else if (sourceCityId) {
            sourceCityId = Number(sourceCityId) || null;
          }

          const is3PL = Boolean(p.is_3pl);
          let secondaryBarcode = p.secondary_barcode || null;
          let serviceProvider = p.service_provider || (is3PL ? 'PostEx' : null);
          let referenceNumber = p.reference_number || null;
          let comments = p.comments || null;

          // Dispatch 3PL consignment with configured provider (e.g. PostEx)
          if (is3PL) {
            const itemTenantId = p.tenant || defaultTenantId;
            const tplRes = await book3PLConsignment(strapi, {
              tracking_number: trackingId,
              recipient_name: p.recipient_name,
              recipient_phone: p.recipient_phone,
              recipient_address: p.recipient_address,
              rawDestCityName: rawDestCityName || p.recipient_address,
              destination_city_name: rawDestCityName,
              payment_type: (p.cod_amount && Number(p.cod_amount) > 0) ? 'COD' : (p.payment_type || 'PAID'),
              cod_amount: p.cod_amount,
              pieces: p.pieces,
              comments: p.comments,
              product_description: p.product_description || p.comments,
              tenant: itemTenantId
            }, itemTenantId);

            if (tplRes && tplRes.trackingNumber) {
              secondaryBarcode = tplRes.trackingNumber;
              referenceNumber = referenceNumber || tplRes.trackingNumber;
              serviceProvider = tplRes.provider || 'PostEx';
              comments = comments 
                ? `${comments} | 3PL ${serviceProvider} (CN: ${secondaryBarcode})`
                : `3PL ${serviceProvider} (CN: ${secondaryBarcode})`;
            }
          }

          const record = await strapi.db.query('api::parcel.parcel').create({
            data: {
              tracking_number: trackingId,
              status: p.status || 'Booked',
              payment_type: (p.cod_amount && Number(p.cod_amount) > 0) ? 'COD' : (p.payment_type || 'PAID'),
              cod_amount: Number(p.cod_amount) || 0,
              weight: Number(p.weight) || 0.5,
              pieces: Number(p.pieces) || 1,
              delivery_charges: Number(p.delivery_charges) || 0,
              recipient_name: String(p.recipient_name || 'Customer').trim(),
              recipient_phone: String(p.recipient_phone || '').trim(),
              recipient_address: String(p.recipient_address || '').trim(),
              source_city: sourceCityId,
              destination_city: destCityId,
              consignee_email: p.consignee_email || null,
              consignee_alt_phone: p.consignee_alt_phone || null,
              allow_to_open: p.allow_to_open === 'Yes' ? 'Yes' : 'No',
              comments: comments,
              shipper: p.shipper ? Number(p.shipper) : null,
              origin_office: p.origin_office ? Number(p.origin_office) : null,
              tenant: p.tenant ? Number(p.tenant) : (defaultTenantId ? Number(defaultTenantId) : null),
              is_3pl: is3PL,
              secondary_barcode: secondaryBarcode,
              service_provider: serviceProvider,
              reference_number: referenceNumber,
            }
          });
          return {
            success: true,
            id: record.id,
            tracking_number: trackingId,
            is_3pl: is3PL,
            secondary_barcode: secondaryBarcode,
            service_provider: serviceProvider
          };
        } catch (err: any) {
          return { success: false, error: err.message, recipient: p.recipient_name };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      for (const r of batchResults) {
        if (r.success) createdParcels.push(r);
        else errors.push(r);
      }
    }

    return ctx.send({
      success: true,
      created_count: createdParcels.length,
      failed_count: errors.length,
      created: createdParcels,
      errors: errors.slice(0, 10),
    });
  }
}));

