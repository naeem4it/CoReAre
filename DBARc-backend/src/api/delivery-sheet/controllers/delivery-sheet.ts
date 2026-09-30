import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::delivery-sheet.delivery-sheet', ({ strapi }) => ({
  async findOne(ctx) {
    const { id } = ctx.params;
    let targetDocId = id;

    if (!isNaN(Number(id))) {
      const found = await strapi.db.query('api::delivery-sheet.delivery-sheet').findOne({
        where: { id: Number(id) }
      });
      if (found?.documentId) {
        targetDocId = found.documentId;
      }
    }

    ctx.params.id = targetDocId;
    return super.findOne(ctx);
  },

  async update(ctx) {
    const { id } = ctx.params;
    let targetDocId = id;

    if (!isNaN(Number(id))) {
      const found = await strapi.db.query('api::delivery-sheet.delivery-sheet').findOne({
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
      const found = await strapi.db.query('api::delivery-sheet.delivery-sheet').findOne({
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
