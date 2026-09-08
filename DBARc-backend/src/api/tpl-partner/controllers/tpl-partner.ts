import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::tpl-partner.tpl-partner', ({ strapi }) => ({
  async customFind(ctx) {
    try {
      const { tenant } = ctx.query;
      const whereClause: any = {};
      if (tenant) {
        whereClause.tenant = Number(tenant) || tenant;
      }

      const partners = await strapi.db.query('api::tpl-partner.tpl-partner').findMany({
        where: whereClause,
        populate: ['tenant'],
        orderBy: { id: 'asc' }
      });

      const transformed = partners.map((item: any) => ({
        id: item.id,
        documentId: item.documentId,
        attributes: {
          ...item
        }
      }));

      return ctx.send({ data: transformed });
    } catch (err) {
      console.error('Failed to find tpl partners:', err);
      return ctx.internalServerError('Failed to fetch tpl partners');
    }
  },

  async customCreate(ctx) {
    try {
      const payload = ctx.request.body.data || ctx.request.body;
      const created = await strapi.db.query('api::tpl-partner.tpl-partner').create({
        data: {
          ...payload,
          tenant: payload.tenant ? (Number(payload.tenant) || payload.tenant) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: new Date(),
        }
      });
      return ctx.send({ data: created });
    } catch (err: any) {
      console.error('Failed to create tpl partner:', err);
      return ctx.badRequest(err.message || 'Failed to create tpl partner');
    }
  },

  async customUpdate(ctx) {
    try {
      const { id } = ctx.params;
      const payload = ctx.request.body.data || ctx.request.body;
      const targetId = Number(id) || id;

      const updated = await strapi.db.query('api::tpl-partner.tpl-partner').update({
        where: typeof targetId === 'number' ? { id: targetId } : { documentId: targetId },
        data: {
          ...payload,
          tenant: payload.tenant ? (Number(payload.tenant) || payload.tenant) : undefined,
          updatedAt: new Date(),
        }
      });

      return ctx.send({ data: updated });
    } catch (err: any) {
      console.error('Failed to update tpl partner:', err);
      return ctx.badRequest(err.message || 'Failed to update tpl partner');
    }
  },

  async customDelete(ctx) {
    try {
      const { id } = ctx.params;
      const targetId = Number(id) || id;

      const deleted = await strapi.db.query('api::tpl-partner.tpl-partner').delete({
        where: typeof targetId === 'number' ? { id: targetId } : { documentId: targetId }
      });

      return ctx.send({ data: deleted });
    } catch (err: any) {
      console.error('Failed to delete tpl partner:', err);
      return ctx.badRequest(err.message || 'Failed to delete tpl partner');
    }
  }
}));
