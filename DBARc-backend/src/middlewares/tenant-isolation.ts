/**
 * Multi-Tenancy Isolation Middleware for Strapi
 * Enforces strict tenant data boundaries across content-api endpoints.
 */

export default (config: any, { strapi }: { strapi: any }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    const url = ctx.request.url;

    // Only apply to content-api endpoints
    if (!url.startsWith('/api/')) {
      return await next();
    }

    // Bypass public endpoints like healthchecks or auth login/register/setup
    if (
      url.startsWith('/api/auth/') ||
      url.startsWith('/api/users-permissions/') ||
      url.startsWith('/api/event-stream')
    ) {
      return await next();
    }

    const user = ctx.state.user;
    const headerTenantId = ctx.headers['x-tenant-id'];

    if (user) {
      // Super Admin has global access
      const isSuperAdmin =
        user.isAdminUser && user.role?.type === 'super_admin';

      if (!isSuperAdmin) {
        // Resolve user's tenant ID
        let userTenantId = user.tenant?.id || user.tenant;
        if (!userTenantId && user.id) {
          try {
            const dbUser = await strapi.db
              .query('plugin::users-permissions.user')
              .findOne({
                where: { id: user.id },
                populate: ['tenant'],
              });
            if (dbUser?.tenant) {
              userTenantId = dbUser.tenant.id;
            }
          } catch (e) {
            // Ignore
          }
        }

        const effectiveTenantId = userTenantId || (headerTenantId ? Number(headerTenantId) : null);

        if (effectiveTenantId) {
          // If request body contains a different tenant, enforce the authenticated tenant
          if (ctx.request.body && ctx.request.body.data) {
            if (ctx.request.body.data.tenant) {
              if (Number(ctx.request.body.data.tenant) !== Number(effectiveTenantId)) {
                return ctx.forbidden('Cross-tenant data mutation is not permitted.');
              }
              ctx.request.body.data.tenant = effectiveTenantId;
            }
          }

          // If query params are searching, ensure query doesn't try to access another tenant
          if (ctx.query && ctx.query.filters) {
            if (
              ctx.query.filters.tenant &&
              typeof ctx.query.filters.tenant === 'object' &&
              ctx.query.filters.tenant.id &&
              Number(ctx.query.filters.tenant.id) !== Number(effectiveTenantId)
            ) {
              return ctx.forbidden('Cross-tenant data query is not permitted.');
            }
          }
        }
      }
    }

    return await next();
  };
};
