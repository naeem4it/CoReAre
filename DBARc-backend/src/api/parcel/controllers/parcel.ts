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
