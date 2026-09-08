import { factories } from '@strapi/strapi';
import shipperOrderApi from './shipper-order-api';

export default factories.createCoreController('api::shipper.shipper', ({ strapi }) => ({
  async update(ctx) {
    const { id } = ctx.params;
    if (id && !isNaN(Number(id))) {
      const found = await strapi.db.query('api::shipper.shipper').findOne({
        where: { id: Number(id) },
        select: ['id', 'documentId'],
      });
      if (found && (found as any).documentId) {
        ctx.params.id = (found as any).documentId;
      }
    }
    return super.update(ctx);
  },

  async findShippersWithPlans(ctx) {
    try {
      const shippers = await strapi.db.query('api::shipper.shipper').findMany({
        populate: ['shipper_plan', 'tenant'],
        orderBy: { id: 'asc' },
      });
      return ctx.send({ data: shippers });
    } catch (err: any) {
      console.error('Failed to get shippers with plans:', err);
      return ctx.internalServerError(err.message);
    }
  },

  async assignPlan(ctx) {
    try {
      const { id } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body || {};
      const planId = body.shipper_plan || body.planId;
      const preferredTplPartner = body.preferred_tpl_partner;

      if (!id) {
        return ctx.badRequest('Shipper ID is required.');
      }

      // Find shipper by either numeric id or documentId
      const shipper = await strapi.db.query('api::shipper.shipper').findOne({
        where: isNaN(Number(id)) ? { documentId: id } : { id: Number(id) },
        populate: ['shipper_plan', 'preferred_tpl_partner'],
      });

      if (!shipper) {
        return ctx.notFound('Shipper not found.');
      }

      const updateData: any = {};

      if (planId !== undefined) {
        if (planId) {
          const plan = await strapi.db.query('api::shipper-plan.shipper-plan').findOne({
            where: isNaN(Number(planId)) ? { documentId: planId } : { id: Number(planId) },
          });
          if (plan) {
            updateData.shipper_plan = plan.id;
          }
        } else {
          updateData.shipper_plan = null;
        }
      }

      if (preferredTplPartner !== undefined) {
        updateData.preferred_tpl_partner = preferredTplPartner ? (Number(preferredTplPartner) || preferredTplPartner) : null;
      }

      if (Object.keys(updateData).length > 0) {
        await strapi.db.query('api::shipper.shipper').update({
          where: { id: shipper.id },
          data: updateData,
        });
      }

      return ctx.send({
        success: true,
        message: 'Shipper updated successfully',
        data: {
          shipperId: shipper.id,
          ...updateData
        }
      });
    } catch (err: any) {
      console.error('Failed to update shipper:', err);
      return ctx.badRequest(err.message || 'Failed to update shipper.');
    }
  },
  createOrder: (ctx) => shipperOrderApi.createOrder(ctx),
  createBulkOrders: (ctx) => shipperOrderApi.createBulkOrders(ctx),
  trackOrder: (ctx) => shipperOrderApi.trackOrder(ctx),
  cancelOrder: (ctx) => shipperOrderApi.cancelOrder(ctx),
  getServiceableCities: (ctx) => shipperOrderApi.getServiceableCities(ctx),
  getProfile: (ctx) => shipperOrderApi.getProfile(ctx),
  getApiKey: (ctx) => shipperOrderApi.getApiKey(ctx),
  generateApiKey: (ctx) => shipperOrderApi.generateApiKey(ctx),
}));



