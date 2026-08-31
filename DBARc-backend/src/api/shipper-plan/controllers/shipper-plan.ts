import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::shipper-plan.shipper-plan', ({ strapi }) => ({
  async customFind(ctx) {
    try {
      const plans = await strapi.entityService.findMany('api::shipper-plan.shipper-plan', {
        populate: ['shippers'],
      });
      return ctx.send({ data: plans });
    } catch (err) {
      console.error('Failed to fetch shipper plans:', err);
      return ctx.internalServerError('Failed to fetch shipper plans');
    }
  },

  async customCreate(ctx) {
    try {
      const { 
        name, 
        charge_type, 
        charge_value,
        rto_charge_type,
        rto_charge_value,
        replacement_charge_type,
        replacement_charge_value,
        cod_charge_type,
        cod_charge_value,
        max_parcels_per_month,
        support_level,
        api_access,
        shippers 
      } = ctx.request.body;

      const newPlan = await strapi.entityService.create('api::shipper-plan.shipper-plan', {
        data: {
          name,
          charge_type,
          charge_value,
          rto_charge_type,
          rto_charge_value,
          replacement_charge_type,
          replacement_charge_value,
          cod_charge_type,
          cod_charge_value,
          max_parcels_per_month,
          support_level,
          api_access,
          shippers,
        },
        populate: ['shippers'],
      });
      return ctx.send({ data: newPlan });
    } catch (err) {
      console.error('Failed to create shipper plan:', err);
      return ctx.internalServerError('Failed to create shipper plan');
    }
  },

  async customUpdate(ctx) {
    try {
      const { id } = ctx.params;
      const { 
        name, 
        charge_type, 
        charge_value,
        rto_charge_type,
        rto_charge_value,
        replacement_charge_type,
        replacement_charge_value,
        cod_charge_type,
        cod_charge_value,
        max_parcels_per_month,
        support_level,
        api_access,
        shippers 
      } = ctx.request.body;

      const updatedPlan = await strapi.entityService.update('api::shipper-plan.shipper-plan', id, {
        data: {
          name,
          charge_type,
          charge_value,
          rto_charge_type,
          rto_charge_value,
          replacement_charge_type,
          replacement_charge_value,
          cod_charge_type,
          cod_charge_value,
          max_parcels_per_month,
          support_level,
          api_access,
          shippers,
        },
        populate: ['shippers'],
      });
      return ctx.send({ data: updatedPlan });
    } catch (err) {
      console.error('Failed to update shipper plan:', err);
      return ctx.internalServerError('Failed to update shipper plan');
    }
  },

  async customDelete(ctx) {
    try {
      const { id } = ctx.params;
      const deletedPlan = await strapi.entityService.delete('api::shipper-plan.shipper-plan', id);
      return ctx.send({ data: deletedPlan });
    } catch (err) {
      console.error('Failed to delete shipper plan:', err);
      return ctx.internalServerError('Failed to delete shipper plan');
    }
  }
}));
