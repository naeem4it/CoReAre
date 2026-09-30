import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::load-sheet.load-sheet', ({ strapi }) => ({
  async create(ctx) {
    const response = await super.create(ctx);
    const entry = response?.data;
    const parcelIds = ctx.request.body?.data?.parcels;

    if (entry && Array.isArray(parcelIds) && parcelIds.length > 0) {
      try {
        // Fast atomic bulk link of all selected parcels in a single SQL update query
        await strapi.db.query('api::parcel.parcel').updateMany({
          where: { id: { $in: parcelIds } },
          data: { load_sheet: entry.id },
        });
      } catch (err) {
        console.warn('Could not bulk link parcels to load_sheet in controller:', err);
      }
    }

    return response;
  },

  async update(ctx) {
    const response = await super.update(ctx);
    const entry = response?.data;
    const status = ctx.request.body?.data?.status;

    if (entry && status === 'Dispatched') {
      try {
        // Fast atomic update of all linked parcels to 'Picked up by rider'
        await strapi.db.query('api::parcel.parcel').updateMany({
          where: { load_sheet: entry.id },
          data: { status: 'Picked up by rider' },
        });
      } catch (err) {
        console.warn('Could not bulk update parcels on dispatch:', err);
      }
    }

    return response;
  },
}));
