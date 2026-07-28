import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::parcel.parcel', ({ strapi }) => ({
  async create(ctx: any) {
    const { data } = ctx.request.body;
    
    // Default to not 3PL
    data.is_3pl = false;

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
        status: { $in: ['Total Booking', 'Not Arrived'] }
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
