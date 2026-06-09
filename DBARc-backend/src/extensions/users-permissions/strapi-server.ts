declare const strapi: any;

export default (plugin: any) => {
  // Save original controllers
  const originalCallback = plugin.controllers.auth.callback;
  const originalRegister = plugin.controllers.auth.register;
  const originalForgotPassword = plugin.controllers.auth.forgotPassword;
  const originalResetPassword = plugin.controllers.auth.resetPassword;
  const originalMe = plugin.controllers.user.me;

  // Helper to append tenant ID to email/username to bypass global database unique constraints
  const getTenantScopedEmail = (email: string, tenantId: string | number) => {
    if (!tenantId || !email) return email;
    const baseEmail = email.trim().toLowerCase();
    if (baseEmail.includes('#')) {
      return baseEmail;
    }
    return `${baseEmail}#${tenantId}`;
  };

  const getTenantScopedUsername = (username: string, tenantId: string | number) => {
    if (!tenantId || !username) return username;
    const baseUsername = username.trim().toLowerCase();
    if (baseUsername.includes('#')) {
      return baseUsername;
    }
    return `${baseUsername}#${tenantId}`;
  };

  // Helper to remove tenant scoping suffix from email and username in response payloads
  const stripTenantSuffix = (user: any) => {
    if (!user) return;
    if (user.email && user.email.includes('#')) {
      user.email = user.email.split('#')[0];
    }
    if (user.username && user.username.includes('#')) {
      user.username = user.username.split('#')[0];
    }
  };

  // 1. Intercept Login (Local Auth callback)
  plugin.controllers.auth.callback = async (ctx: any) => {
    const tenantId = ctx.headers['x-tenant-id'] || ctx.request.body?.tenant_id;
    const provider = ctx.params?.provider || 'local';

    if (provider === 'local' && tenantId && ctx.request.body?.identifier) {
      // Rewrite user email/username input to match the tenant-scoped version in database
      ctx.request.body.identifier = getTenantScopedEmail(ctx.request.body.identifier, tenantId);
    }

    await originalCallback(ctx);

    // Clean up response user details so the frontend is unaware of database-level suffixes
    if (ctx.body && ctx.body.user) {
      stripTenantSuffix(ctx.body.user);
    }
  };

  // 2. Intercept Registration
  plugin.controllers.auth.register = async (ctx: any) => {
    const tenantId = ctx.headers['x-tenant-id'] || ctx.request.body?.tenant_id;
    if (!tenantId) {
      return ctx.badRequest('Tenant ID is required for registration.');
    }

    if (ctx.request.body) {
      if (ctx.request.body.email) {
        ctx.request.body.email = getTenantScopedEmail(ctx.request.body.email, tenantId);
      }
      if (ctx.request.body.username) {
        ctx.request.body.username = getTenantScopedUsername(ctx.request.body.username, tenantId);
      }
      
      // Bind tenant relation directly on registration
      ctx.request.body.tenant = tenantId;
    }

    await originalRegister(ctx);

    // Clean up response user details
    if (ctx.body && ctx.body.user) {
      stripTenantSuffix(ctx.body.user);
    }
  };

  // 3. Intercept Forgot Password
  plugin.controllers.auth.forgotPassword = async (ctx: any) => {
    const tenantId = ctx.headers['x-tenant-id'] || ctx.request.body?.tenant_id;
    if (tenantId && ctx.request.body?.email) {
      ctx.request.body.email = getTenantScopedEmail(ctx.request.body.email, tenantId);
    }

    await originalForgotPassword(ctx);
  };

  // 4. Intercept Reset Password
  plugin.controllers.auth.resetPassword = async (ctx: any) => {
    const tenantId = ctx.headers['x-tenant-id'] || ctx.request.body?.tenant_id;
    if (tenantId && ctx.request.body?.email) {
      ctx.request.body.email = getTenantScopedEmail(ctx.request.body.email, tenantId);
    }

    await originalResetPassword(ctx);

    // Clean up response user details
    if (ctx.body && ctx.body.user) {
      stripTenantSuffix(ctx.body.user);
    }
  };

  // 5. Intercept /users/me Profile Retrieval to populate relations
  plugin.controllers.user.me = async (ctx: any) => {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized();
    }

    // Fetch user using DB Query API to ensure compatibility across Strapi v4 and v5, populating relationships
    try {
      const populatedUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role', 'tenant', 'role_definition', 'courier', 'shipper'],
      });

      if (populatedUser) {
        stripTenantSuffix(populatedUser);
        ctx.body = populatedUser;
      } else {
        await originalMe(ctx);
        if (ctx.body) {
          stripTenantSuffix(ctx.body);
        }
      }
    } catch (err) {
      // Fallback to original controller if relation queries raise errors (e.g. database not migrated yet)
      await originalMe(ctx);
      if (ctx.body) {
        stripTenantSuffix(ctx.body);
      }
    }
  };

  return plugin;
};
