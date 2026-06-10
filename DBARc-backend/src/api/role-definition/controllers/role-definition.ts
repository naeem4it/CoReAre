import { factories } from '@strapi/strapi';

const getAuthenticatedContext = async (ctx: any, strapi: any) => {
  if (ctx.state.user) {
    if (ctx.state.user.isAdminUser) {
      return {
        isSuperAdmin: ctx.state.user.role?.type === 'super_admin',
        tenantId: ctx.state.user.tenant?.id || null,
        user: ctx.state.user.adminUser,
      };
    }
    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: ctx.state.user.id },
      populate: ['tenant', 'role'],
    });
    if (user) {
      return {
        isSuperAdmin: user.role?.type === 'super_admin',
        tenantId: user.tenant?.id || null,
        user,
      };
    }
  }

  const authHeader = ctx.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = await strapi.service('admin::jwt').verify(token);
      if (decoded && decoded.id) {
        const admin = await strapi.db.query('admin::user').findOne({
          where: { id: decoded.id },
          populate: ['roles', 'tenant'],
        });
        if (admin) {
          const isSuperAdmin = admin.roles?.some((r: any) => r.code === 'strapi-super-admin');
          return {
            isSuperAdmin,
            tenantId: admin.tenant?.id || null,
            user: admin,
          };
        }
      }
    } catch (err) {
      // Ignore
    }
  }

  return null;
};

export default factories.createCoreController('api::role-definition.role-definition', ({ strapi }) => ({
  async find(ctx) {
    const authContext = await getAuthenticatedContext(ctx, strapi);
    if (!authContext) return ctx.unauthorized();

    if (!authContext.isSuperAdmin && authContext.tenantId) {
      const existingFilters = (ctx.query.filters || {}) as any;
      ctx.query.filters = {
        ...existingFilters,
        tenant: authContext.tenantId,
      };
    } else if (!authContext.isSuperAdmin) {
      const existingFilters = (ctx.query.filters || {}) as any;
      ctx.query.filters = {
        ...existingFilters,
        tenant: null,
      };
    }

    return await super.find(ctx);
  },

  async create(ctx) {
    const authContext = await getAuthenticatedContext(ctx, strapi);
    if (!authContext) return ctx.unauthorized();

    if (!authContext.isSuperAdmin && !authContext.tenantId) {
      return ctx.badRequest('Tenant context not found.');
    }

    const tenantId = authContext.isSuperAdmin ? ctx.request.body.data?.tenant : authContext.tenantId;

    ctx.request.body.data = {
      ...ctx.request.body.data,
      tenant: tenantId,
    };

    return await super.create(ctx);
  },

  async update(ctx) {
    const authContext = await getAuthenticatedContext(ctx, strapi);
    if (!authContext) return ctx.unauthorized();

    const { id } = ctx.params;
    const tenantId = authContext.isSuperAdmin ? (ctx.request.body.data?.tenant) : authContext.tenantId;

    if (!authContext.isSuperAdmin) {
      const existing = await strapi.db.query('api::role-definition.role-definition').findOne({
        where: { id, tenant: authContext.tenantId },
      });
      if (!existing) {
        return ctx.notFound('Role definition not found under this tenant.');
      }
    }

    if (tenantId !== undefined) {
      ctx.request.body.data = {
        ...ctx.request.body.data,
        tenant: tenantId,
      };
    }

    return await super.update(ctx);
  },

  async delete(ctx) {
    const authContext = await getAuthenticatedContext(ctx, strapi);
    if (!authContext) return ctx.unauthorized();

    const { id } = ctx.params;
    if (!authContext.isSuperAdmin) {
      const existing = await strapi.db.query('api::role-definition.role-definition').findOne({
        where: { id, tenant: authContext.tenantId },
      });
      if (!existing) {
        return ctx.notFound('Role definition not found under this tenant.');
      }
    }

    return await super.delete(ctx);
  }
}));
