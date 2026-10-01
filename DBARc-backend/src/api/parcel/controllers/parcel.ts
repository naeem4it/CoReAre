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

    // --- 3PL SERVICE INTEGRATION (PostEx) ---
    let tplBookingMeta: any = null;

    if (data.is_3pl) {
      try {
        const tenantId = data.tenant || ctx.request.headers?.['x-tenant-id'] || ctx.state?.user?.tenant?.id || null;

        // Query active PostEx 3PL partners
        const partners = await strapi.db.query('api::tpl-partner.tpl-partner').findMany({
          where: {
            provider_code: 'postex',
            status: 'active',
          },
          populate: ['tenant']
        });

        // 1. Try to find partner matching tenantId
        let partner = partners.find((p: any) => {
          if (!tenantId) return false;
          const pTid = p.tenant?.id || p.tenant;
          return String(pTid) === String(tenantId);
        });

        // 2. If not found by tenant, prefer the one with a valid production base64 token
        if (!partner) {
          partner = partners.find((p: any) => p.environment === 'production' || (p.api_credentials?.api_token && !p.api_credentials.api_token.includes('sandbox')));
        }

        // 3. Fallback to first active partner
        if (!partner && partners.length > 0) {
          partner = partners[0];
        }

        const credentials = partner?.api_credentials || partner?.credentials || {};
        const apiToken = credentials.api_token || credentials.token || '';

        if (apiToken) {
          const cleanCity = normalizePostExCity(rawDestCityName || data.recipient_address || 'Karachi');

          let phone = (data.recipient_phone || '03001234567').replace(/\D/g, '');
          if (phone.startsWith('92')) phone = '0' + phone.slice(2);
          if (!phone.startsWith('0')) phone = '0' + phone;

          const postExPayload = {
            cityName: cleanCity,
            customerName: data.recipient_name || 'Customer',
            customerPhone: phone,
            deliveryAddress: data.recipient_address || `${cleanCity}, Pakistan`,
            invoiceDivision: 1,
            invoicePayment: data.payment_type === 'PAID' ? 0 : (Number(data.cod_amount) || 0),
            items: Number(data.pieces) || 1,
            orderDetail: data.comments || data.product_description || 'General Goods',
            orderRefNumber: data.tracking_number,
            orderType: 'Normal',
            transactionNotes: 'DBARc 3PL Booking'
          };

          console.log('\n============================================================');
          console.log('🚀 [3PL SERVICE BOOKING REQUEST]');
          console.log(`Tracking Number: ${data.tracking_number}`);
          console.log(`Provider: PostEx`);
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
          console.log(`Provider: PostEx`);
          console.log(`HTTP Status: ${httpStatus}`);
          console.log(`Response Body:`, JSON.stringify(responseJson, null, 2));
          console.log('============================================================\n');

          tplBookingMeta = {
            provider: 'PostEx',
            status: httpStatus,
            payload: postExPayload,
            response: responseJson
          };

          if (postexRes.ok && (responseJson.statusCode === '200' || responseJson.statusCode === 200)) {
            const tplCn = responseJson.dist?.trackingNumber || responseJson.trackingNumber;
            data.secondary_barcode = tplCn;
            data.reference_number = tplCn;
            data.service_provider = 'PostEx';
            data.comments = data.comments 
              ? `${data.comments} | 3PL PostEx (CN: ${tplCn})`
              : `3PL PostEx (CN: ${tplCn})`;
            console.log(`✅ [3PL BOOKED SUCCESSFULLY]: ${data.tracking_number} -> PostEx CN: ${tplCn}`);
          } else {
            const errMsg = responseJson.statusMessage || responseJson.message || `HTTP ${httpStatus}`;
            console.error(`❌ [3PL BOOKING FAILED] for ${data.tracking_number}:`, errMsg);
          }
        } else {
          console.warn('⚠️ [3PL BOOKING WARNING]: No active PostEx API token found in tpl_partners.');
        }
      } catch (err: any) {
        console.error('❌ [3PL BOOKING EXCEPTION]:', err.message || err);
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
    if (!isBooked && data && (
      data.recipient_name !== undefined ||
      data.recipient_phone !== undefined ||
      data.recipient_address !== undefined ||
      data.cod_amount !== undefined ||
      data.weight !== undefined ||
      data.destination_city !== undefined
    )) {
      return ctx.badRequest(`Cannot edit order: Only orders in 'Booked' status can be modified. (Current status: '${existing.status}')`);
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
  }
}));
