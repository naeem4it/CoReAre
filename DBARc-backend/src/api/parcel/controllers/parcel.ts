import { factories } from '@strapi/strapi';
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

    // Auto-generate tracking number with SHZ prefix and numeric sequence if not provided
    if (!data.tracking_number) {
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
    if (data.destination_city && typeof data.destination_city === 'string' && isNaN(Number(data.destination_city))) {
      const foundCity = await strapi.db.query('api::city.city').findOne({
        where: { CityName: { $eqi: data.destination_city.trim() } }
      });
      data.destination_city = foundCity ? foundCity.id : null;
    } else if (data.destination_city) {
      data.destination_city = Number(data.destination_city) || null;
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

    // Call default create controller
    return await super.create(ctx);
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
