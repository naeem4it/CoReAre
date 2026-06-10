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

  const getAuthenticatedContext = async (ctx: any) => {
    if (ctx.state.user) {
      if (ctx.state.user.isAdminUser) {
        return {
          isSuperAdmin: ctx.state.user.role?.type === 'super_admin',
          tenantId: ctx.state.user.tenant?.id || null,
          courierId: null,
          shipperId: null,
          user: ctx.state.user.adminUser,
        };
      }
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: ctx.state.user.id },
        populate: ['tenant', 'role', 'courier', 'shipper'],
      });
      if (user) {
        return {
          isSuperAdmin: user.role?.type === 'super_admin',
          tenantId: user.tenant?.id || null,
          courierId: user.courier?.id || null,
          shipperId: user.shipper?.id || null,
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
              courierId: null,
              shipperId: null,
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

  // 6. Custom employee list/find with tenant scoping
  plugin.controllers.user.find = async (ctx: any) => {
    const authContext = await getAuthenticatedContext(ctx);
    if (!authContext) return ctx.unauthorized();

    try {
      const filters: any = {};
      if (!authContext.isSuperAdmin && authContext.tenantId) {
        filters.tenant = authContext.tenantId;
      } else if (!authContext.isSuperAdmin) {
        filters.tenant = null;
      }

      if (ctx.query.search) {
        const search = (ctx.query.search as string).trim();
        filters.$or = [
          { username: { $contains: search } },
          { fullName: { $contains: search } },
          { email: { $contains: search } },
        ];
      }

      if (ctx.query.blocked !== undefined) {
        filters.blocked = ctx.query.blocked === 'true';
      }

      const users = await strapi.db.query('plugin::users-permissions.user').findMany({
        where: filters,
        populate: ['role_definition', 'tenant', 'courier', 'shipper', 'role'],
        orderBy: { createdAt: 'desc' },
      });

      users.forEach(stripTenantSuffix);
      ctx.body = users;
    } catch (err: any) {
      return ctx.badRequest(err.message || 'An error occurred while listing users.');
    }
  };

  plugin.controllers.user.findOne = async (ctx: any) => {
    const authContext = await getAuthenticatedContext(ctx);
    if (!authContext) return ctx.unauthorized();

    try {
      const { id } = ctx.params;
      const queryFilters: any = { id };
      if (!authContext.isSuperAdmin) {
        queryFilters.tenant = authContext.tenantId || null;
      }

      const targetUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: queryFilters,
        populate: ['role_definition', 'tenant', 'courier', 'shipper', 'role'],
      });

      if (!targetUser) {
        return ctx.notFound();
      }

      stripTenantSuffix(targetUser);
      ctx.body = targetUser;
    } catch (err: any) {
      return ctx.badRequest(err.message || 'An error occurred while fetching user.');
    }
  };

  // 7. Custom user create endpoint
  plugin.controllers.user.createEmployee = async (ctx: any) => {
    const authContext = await getAuthenticatedContext(ctx);
    if (!authContext) return ctx.unauthorized();

    try {
      const {
        username,
        email,
        fullName,
        phone,
        role_definition,
        confirmationType,
        password,
        isenable,
        tenant,
        courier,
        shipper,
        role,
      } = ctx.request.body;

      const tenantId = authContext.isSuperAdmin ? tenant : authContext.tenantId;
      const courierId = authContext.isSuperAdmin ? courier : authContext.courierId;
      const shipperId = authContext.isSuperAdmin ? shipper : authContext.shipperId;

      if (!tenantId) {
        return ctx.badRequest('Tenant ID is required.');
      }

      if (!username || !email) {
        return ctx.badRequest('Username and email are required.');
      }

      const scopedEmail = getTenantScopedEmail(email, tenantId);
      const scopedUsername = getTenantScopedUsername(username, tenantId);

      const existing = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: {
          $or: [
            { email: scopedEmail },
            { username: scopedUsername },
          ],
        },
      });

      if (existing) {
        return ctx.badRequest('Username or Email already exists for this tenant.');
      }

      let targetRoleId;
      const roles = await strapi.db.query('plugin::users-permissions.role').findMany();
      
      if (authContext.isSuperAdmin && role) {
        const matchedRole = roles.find((r: any) => r.id === Number(role) || r.type === role || r.name === role);
        if (!matchedRole) {
          return ctx.badRequest(`Requested system role ${role} not found.`);
        }
        targetRoleId = matchedRole.id;
      } else {
        const authenticatedRole = roles.find((r: any) => r.type === 'authenticated');
        if (!authenticatedRole) {
          return ctx.badRequest('Default authenticated role not found.');
        }
        targetRoleId = authenticatedRole.id;
      }

      const isNoConfirmation = confirmationType === 'no_confirmation';
      const userPassword = isNoConfirmation ? password : Math.random().toString(36).substring(2, 10) + '!A1';

      const userData: any = {
        username: scopedUsername,
        email: scopedEmail,
        fullName,
        phone,
        tenant: tenantId,
        role: targetRoleId,
        role_definition: role_definition || null,
        courier: courierId,
        shipper: shipperId,
        blocked: isenable === false,
        confirmed: isNoConfirmation,
        password: userPassword,
        provider: 'local',
      };

      const userService = strapi.plugin('users-permissions').service('user');
      const newUser = await userService.add(userData);

      if (!isNoConfirmation) {
        try {
          await strapi.plugin('users-permissions').service('user').sendConfirmationEmail(newUser);
        } catch (mailErr) {
          console.error('Failed to send confirmation email:', mailErr);
        }
      }

      stripTenantSuffix(newUser);
      ctx.body = newUser;
    } catch (err: any) {
      return ctx.badRequest(err.message || 'An error occurred while creating employee.');
    }
  };

  // 8. Custom user update endpoint
  plugin.controllers.user.updateEmployee = async (ctx: any) => {
    const authContext = await getAuthenticatedContext(ctx);
    if (!authContext) return ctx.unauthorized();

    try {
      const { id } = ctx.params;
      
      const queryFilters: any = { id };
      if (!authContext.isSuperAdmin) {
        queryFilters.tenant = authContext.tenantId || null;
      }

      const targetUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: queryFilters,
        populate: ['tenant'],
      });

      if (!targetUser) {
        return ctx.notFound('User not found.');
      }

      const {
        username,
        email,
        fullName,
        phone,
        role_definition,
        password,
        isenable,
        tenant,
        courier,
        shipper,
        role,
      } = ctx.request.body;

      const tenantId = authContext.isSuperAdmin ? (tenant || targetUser.tenant?.id) : authContext.tenantId;

      const updateData: any = {};
      if (username) updateData.username = getTenantScopedUsername(username, tenantId);
      if (email) updateData.email = getTenantScopedEmail(email, tenantId);
      if (fullName !== undefined) updateData.fullName = fullName;
      if (phone !== undefined) updateData.phone = phone;
      if (role_definition !== undefined) updateData.role_definition = role_definition;
      if (isenable !== undefined) updateData.blocked = isenable === false;
      
      if (authContext.isSuperAdmin) {
        if (tenant !== undefined) updateData.tenant = tenant || null;
        if (courier !== undefined) updateData.courier = courier || null;
        if (shipper !== undefined) updateData.shipper = shipper || null;
        if (role !== undefined) {
          const roles = await strapi.db.query('plugin::users-permissions.role').findMany();
          const matchedRole = roles.find((r: any) => r.id === Number(role) || r.type === role || r.name === role);
          if (matchedRole) {
            updateData.role = matchedRole.id;
          }
        }
      }

      if (password) {
        const userService = strapi.plugin('users-permissions').service('user');
        updateData.password = await userService.hashPassword({ password });
      }

      const updatedUser = await strapi.plugin('users-permissions').service('user').edit(id, updateData);

      stripTenantSuffix(updatedUser);
      ctx.body = updatedUser;
    } catch (err: any) {
      return ctx.badRequest(err.message || 'An error occurred while updating employee.');
    }
  };

  // Register Custom Routes
  plugin.routes['content-api'].routes.push(
    {
      method: 'POST',
      path: '/tenant/users/create',
      handler: 'user.createEmployee',
      config: {
        prefix: '',
      },
    },
    {
      method: 'PUT',
      path: '/tenant/users/:id',
      handler: 'user.updateEmployee',
      config: {
        prefix: '',
      },
    }
  );

  return plugin;
};
