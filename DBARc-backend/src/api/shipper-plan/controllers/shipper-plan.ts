import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::shipper-plan.shipper-plan', ({ strapi }) => ({
  async customFind(ctx) {
    try {
      const plans = await strapi.db.query('api::shipper-plan.shipper-plan').findMany({
        populate: ['shippers', 'tenant'],
        orderBy: { id: 'asc' },
      });
      return ctx.send({ data: plans });
    } catch (err) {
      console.error('Failed to fetch shipper plans:', err);
      return ctx.internalServerError('Failed to fetch shipper plans');
    }
  },

  async customCreate(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body || {};
      const { 
        name, 
        charge_type = 'percentage', 
        charge_value,
        rto_charge_type = 'percentage',
        rto_charge_value,
        replacement_charge_type,
        replacement_charge_value,
        cod_charge_type = 'percentage',
        cod_charge_value,
        max_parcels_per_month,
        support_level,
        api_access = false,
        shippers,
        weight_tiers,
        zones,
        cash_handling_type,
        cash_handling_value,
        cash_handling_min_fee,
        tenant,
      } = body;

      const newPlan = await strapi.db.query('api::shipper-plan.shipper-plan').create({
        data: {
          name: name || 'Custom Tariff Plan',
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
          shippers: Array.isArray(shippers) ? shippers.map(Number) : undefined,
          weight_tiers,
          zones,
          cash_handling_type,
          cash_handling_value,
          cash_handling_min_fee,
          tenant: tenant || null,
          publishedAt: new Date(),
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
      const body = ctx.request.body?.data || ctx.request.body || {};
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
        shippers,
        weight_tiers,
        zones,
        cash_handling_type,
        cash_handling_value,
        cash_handling_min_fee,
      } = body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (charge_type !== undefined) updateData.charge_type = charge_type;
      if (charge_value !== undefined) updateData.charge_value = charge_value;
      if (rto_charge_type !== undefined) updateData.rto_charge_type = rto_charge_type;
      if (rto_charge_value !== undefined) updateData.rto_charge_value = rto_charge_value;
      if (replacement_charge_type !== undefined) updateData.replacement_charge_type = replacement_charge_type;
      if (replacement_charge_value !== undefined) updateData.replacement_charge_value = replacement_charge_value;
      if (cod_charge_type !== undefined) updateData.cod_charge_type = cod_charge_type;
      if (cod_charge_value !== undefined) updateData.cod_charge_value = cod_charge_value;
      if (max_parcels_per_month !== undefined) updateData.max_parcels_per_month = max_parcels_per_month;
      if (support_level !== undefined) updateData.support_level = support_level;
      if (api_access !== undefined) updateData.api_access = api_access;
      if (shippers !== undefined) updateData.shippers = Array.isArray(shippers) ? shippers.map(Number) : [];
      if (weight_tiers !== undefined) updateData.weight_tiers = weight_tiers;
      if (zones !== undefined) updateData.zones = zones;
      if (cash_handling_type !== undefined) updateData.cash_handling_type = cash_handling_type;
      if (cash_handling_value !== undefined) updateData.cash_handling_value = cash_handling_value;
      if (cash_handling_min_fee !== undefined) updateData.cash_handling_min_fee = cash_handling_min_fee;

      const whereClause = isNaN(Number(id)) ? { documentId: id } : { id: Number(id) };
      const updatedPlan = await strapi.db.query('api::shipper-plan.shipper-plan').update({
        where: whereClause,
        data: updateData,
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
      const whereClause = isNaN(Number(id)) ? { documentId: id } : { id: Number(id) };
      await strapi.db.query('api::shipper-plan.shipper-plan').delete({
        where: whereClause,
      });
      return ctx.send({ message: 'Shipper plan deleted successfully' });
    } catch (err) {
      console.error('Failed to delete shipper plan:', err);
      return ctx.internalServerError('Failed to delete shipper plan');
    }
  },
}));
