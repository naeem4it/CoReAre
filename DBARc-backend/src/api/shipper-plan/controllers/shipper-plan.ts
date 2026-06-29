import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::shipper-plan.shipper-plan', ({ strapi }) => ({
  async customFind(ctx) {
    try {
      const plans = await strapi.entityService.findMany('api::shipper-plan.shipper-plan', {
        populate: ['shippers'],
      });
      return { data: plans };
    } catch (err) {
      ctx.throw(500, err);
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
      return { data: newPlan };
    } catch (err) {
      ctx.throw(500, err);
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
      return { data: updatedPlan };
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  async customDelete(ctx) {
    try {
      const { id } = ctx.params;
      const deletedPlan = await strapi.entityService.delete('api::shipper-plan.shipper-plan', id);
      return { data: deletedPlan };
    } catch (err) {
      ctx.throw(500, err);
    }
  }
}));
