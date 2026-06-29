import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::tenant-plan.tenant-plan', ({ strapi }) => ({
  async customFind(ctx) {
    try {
      const entities = await strapi.entityService.findMany('api::tenant-plan.tenant-plan', {
        ...ctx.query,
      }) as any[];
      
      const transformed = entities.map(entity => {
        const { id, ...attributes } = entity;
        return { id, attributes };
      });
      
      return ctx.send({ data: transformed });
    } catch (err) {
      console.error('Failed to find tenant plans:', err);
      return ctx.internalServerError('Failed to fetch tenant plans');
    }
  },

  async customCreate(ctx) {
    try {
      const data = ctx.request.body;
      const created = await strapi.entityService.create('api::tenant-plan.tenant-plan', {
        data: {
          ...data,
          publishedAt: new Date(),
        }
      });
      return ctx.send({ data: created });
    } catch (err) {
      console.error('Failed to create tenant plan:', err);
      return ctx.internalServerError('Failed to create tenant plan');
    }
  },

  async customUpdate(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;
      const updated = await strapi.entityService.update('api::tenant-plan.tenant-plan', id, {
        data: data
      });
      return ctx.send({ data: updated });
    } catch (err) {
      console.error('Failed to update tenant plan:', err);
      return ctx.internalServerError('Failed to update tenant plan');
    }
  },

  async customDelete(ctx) {
    try {
      const { id } = ctx.params;
      const deleted = await strapi.entityService.delete('api::tenant-plan.tenant-plan', id);
      return ctx.send({ data: deleted });
    } catch (err) {
      console.error('Failed to delete tenant plan:', err);
      return ctx.internalServerError('Failed to delete tenant plan');
    }
  }
}));
