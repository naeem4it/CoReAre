import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::region.region', ({ strapi }) => ({
  async update(ctx) {
    const { id } = ctx.params;
    let targetDocId = id;

    // Support both numeric id and Strapi 5 documentId
    if (!isNaN(Number(id))) {
      const found = await strapi.db.query('api::region.region').findOne({
        where: { id: Number(id) }
      });
      if (found?.documentId) {
        targetDocId = found.documentId;
      }
    }

    ctx.params.id = targetDocId;
    return super.update(ctx);
  },

  async delete(ctx) {
    const { id } = ctx.params;
    let targetDocId = id;

    if (!isNaN(Number(id))) {
      const found = await strapi.db.query('api::region.region').findOne({
        where: { id: Number(id) }
      });
      if (found?.documentId) {
        targetDocId = found.documentId;
      }
    }

    ctx.params.id = targetDocId;
    return super.delete(ctx);
  }
}));
