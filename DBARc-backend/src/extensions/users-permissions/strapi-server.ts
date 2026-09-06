declare const strapi: any;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

export default (plugin: any) => {
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

  // Password Policy: 8 to 20 characters, 1 uppercase, 1 lowercase, 1 digit, 1 special character
  const validatePasswordRule = (pwd: string): { isValid: boolean; error?: string } => {
    if (!pwd || pwd.length < 8 || pwd.length > 20) {
      return { isValid: false, error: 'Password must be between 8 and 20 characters long.' };
    }
    if (!/[A-Z]/.test(pwd)) {
      return { isValid: false, error: 'Password must contain at least one uppercase letter (A-Z).' };
    }
    if (!/[a-z]/.test(pwd)) {
      return { isValid: false, error: 'Password must contain at least one lowercase letter (a-z).' };
    }
    if (!/[0-9]/.test(pwd)) {
      return { isValid: false, error: 'Password must contain at least one number (0-9).' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd)) {
      return { isValid: false, error: 'Password must contain at least one special character (e.g. !@#$%^&*).' };
    }
    return { isValid: true };
  };

  const originalAuthFactory = plugin.controllers.auth;

  plugin.controllers.auth = (params: any) => {
    const authControllers = typeof originalAuthFactory === 'function' ? originalAuthFactory(params) : originalAuthFactory;
    const originalCallback = authControllers.callback;
    const originalRegister = authControllers.register;
    const originalForgotPassword = authControllers.forgotPassword;
    const originalResetPassword = authControllers.resetPassword;

    return {
      ...authControllers,

      async callback(ctx: any) {
        const tenantId = ctx.headers['x-tenant-id'] || ctx.request.body?.tenant_id;
        const provider = ctx.params?.provider || 'local';
        const identifier = ctx.request.body?.identifier;

        if (provider === 'local' && identifier) {
          const cleanIdentifier = identifier.split('#')[0].trim().toLowerCase();

          let candidateUser = null;

          if (tenantId) {
            candidateUser = await strapi.db.query('plugin::users-permissions.user').findOne({
              where: {
                $or: [
                  { email: { $containsi: cleanIdentifier } },
                  { username: { $containsi: cleanIdentifier } },
                ],
                tenant: Number(tenantId) || tenantId,
              }
            });
          }

          if (!candidateUser) {
            const matchingUsers = await strapi.db.query('plugin::users-permissions.user').findMany({
              where: {
                $or: [
                  { email: { $containsi: cleanIdentifier } },
                  { username: { $containsi: cleanIdentifier } },
                ]
              },
              orderBy: { id: 'desc' },
              limit: 1
            });

            if (matchingUsers && matchingUsers.length > 0) {
              candidateUser = matchingUsers[0];
            }
          }

          if (candidateUser) {
            ctx.request.body.identifier = candidateUser.email;
          }
        }

        await originalCallback(ctx);

        if (ctx.body && ctx.body.user) {
          stripTenantSuffix(ctx.body.user);
        }
      },

      async register(ctx: any) {
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
          ctx.request.body.tenant = tenantId;
        }

        await originalRegister(ctx);

        if (ctx.body && ctx.body.user) {
          stripTenantSuffix(ctx.body.user);
        }
      },

      async forgotPassword(ctx: any) {
        const tenantId = ctx.headers['x-tenant-id'] || ctx.request.body?.tenant_id;
        if (tenantId && ctx.request.body?.email) {
          ctx.request.body.email = getTenantScopedEmail(ctx.request.body.email, tenantId);
        }
        await originalForgotPassword(ctx);
      },

      async resetPassword(ctx: any) {
        const tenantId = ctx.headers['x-tenant-id'] || ctx.request.body?.tenant_id;
        if (tenantId && ctx.request.body?.email) {
          ctx.request.body.email = getTenantScopedEmail(ctx.request.body.email, tenantId);
        }
        await originalResetPassword(ctx);
        if (ctx.body && ctx.body.user) {
          stripTenantSuffix(ctx.body.user);
        }
      }
    };
  };

  // 4b. Custom Account Setup logic
  plugin.controllers.user.setupAccount = async (ctx: any) => {
    try {
      const { token, password } = ctx.request.body;
      if (!token || !password) {
        return ctx.badRequest('Token and new password are required');
      }

      const pwdValidation = validatePasswordRule(password);
      if (!pwdValidation.isValid) {
        return ctx.badRequest(pwdValidation.error);
      }

      let decodedToken: any;
      try {
        const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
        decodedToken = jwt.verify(token, jwtSecret);
      } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
          return ctx.badRequest('EXPIRED_TOKEN');
        }
        return ctx.badRequest('INVALID_TOKEN');
      }

      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: decodedToken.id, confirmationToken: token }
      });

      if (!user) {
        return ctx.badRequest('INVALID_TOKEN');
      }

      const userService = strapi.plugin('users-permissions').service('user');
      const hashedPassword = await userService.hashPassword({ password });

      const updatedUser = await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          confirmed: true,
          confirmationToken: null,
        }
      });

      // Issue JWT using Strapi service
      const responseJwt = strapi.plugin('users-permissions').service('jwt').issue({ id: updatedUser.id });

      stripTenantSuffix(updatedUser);
      return ctx.send({
        jwt: responseJwt,
        user: updatedUser
      });
    } catch (err: any) {
      return ctx.badRequest(err.message || 'An error occurred during account setup.');
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
        populate: ['role', 'tenant', 'role_definition', 'courier', 'shipper', 'pickup_locations'],
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
    // 1. Check ctx.state.user already attached by Strapi
    if (ctx.state?.user) {
      if (ctx.state.user.isAdminUser) {
        return {
          isSuperAdmin: ctx.state.user.role?.type === 'super_admin' || ctx.state.user.role_type === 'SUPER_ADMIN',
          tenantId: ctx.state.user.tenant?.id || (typeof ctx.state.user.tenant === 'number' ? ctx.state.user.tenant : null),
          courierId: null,
          shipperIds: [],
          user: ctx.state.user.adminUser,
        };
      }
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: ctx.state.user.id },
        populate: ['tenant', 'role', 'courier', 'shipper'],
      });
      if (user) {
        let tenantId = user.tenant?.id || (typeof user.tenant === 'number' ? user.tenant : null);
        if (!tenantId && ctx.headers?.['x-tenant-id']) {
          tenantId = Number(ctx.headers['x-tenant-id']);
        }
        if (!tenantId) {
          const firstTenant = await strapi.db.query('api::tenant.tenant').findOne();
          tenantId = firstTenant?.id || 1;
        }
        return {
          isSuperAdmin: user.role?.type === 'super_admin' || user.role_type === 'SUPER_ADMIN',
          tenantId,
          courierId: user.courier?.id || (typeof user.courier === 'number' ? user.courier : null),
          shipperIds: Array.isArray(user.shipper) ? user.shipper.map((s: any) => s.id) : (user.shipper ? [user.shipper.id] : []),
          user,
        };
      }
    }

    // 2. Extract Authorization Header
    const authHeader = 
      ctx.headers?.authorization || 
      ctx.headers?.Authorization || 
      ctx.header?.authorization || 
      ctx.header?.Authorization || 
      ctx.request?.headers?.authorization || 
      ctx.request?.headers?.Authorization;

    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
      let decodedUserId: number | null = null;
      let decodedAdminId: number | null = null;

      // Try 1: users-permissions jwt service
      try {
        const decoded = await strapi.plugin('users-permissions').service('jwt').verify(token);
        if (decoded?.id) decodedUserId = decoded.id;
      } catch (e) {}

      // Try 2: jsonwebtoken with users-permissions secret
      if (!decodedUserId) {
        try {
          const secret = strapi.config.get('plugin.users-permissions.jwtSecret') || process.env.JWT_SECRET;
          if (secret) {
            const decoded: any = jwt.verify(token, secret);
            if (decoded?.id) decodedUserId = decoded.id;
          }
        } catch (e) {}
      }

      // Try 3: admin::jwt service
      if (!decodedUserId) {
        try {
          const decoded = await strapi.service('admin::jwt').verify(token);
          if (decoded?.id) decodedAdminId = decoded.id;
        } catch (e) {}
      }

      // Try 4: jwt decode directly as fallback
      if (!decodedUserId && !decodedAdminId) {
        try {
          const decoded: any = jwt.decode(token);
          if (decoded?.id) {
            decodedUserId = decoded.id;
          }
        } catch (e) {}
      }

      // If user ID was resolved, load users-permissions user
      if (decodedUserId) {
        const user = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { id: decodedUserId },
          populate: ['tenant', 'role', 'courier', 'shipper'],
        });
        if (user) {
          let tenantId = user.tenant?.id || (typeof user.tenant === 'number' ? user.tenant : null);
          if (!tenantId && (ctx.headers?.['x-tenant-id'] || ctx.header?.['x-tenant-id'])) {
            tenantId = Number(ctx.headers?.['x-tenant-id'] || ctx.header?.['x-tenant-id']);
          }
          if (!tenantId) {
            const firstTenant = await strapi.db.query('api::tenant.tenant').findOne();
            tenantId = firstTenant?.id || 1;
          }
          return {
            isSuperAdmin: user.role?.type === 'super_admin' || user.role_type === 'SUPER_ADMIN',
            tenantId,
            courierId: user.courier?.id || (typeof user.courier === 'number' ? user.courier : null),
            shipperIds: Array.isArray(user.shipper) ? user.shipper.map((s: any) => s.id) : (user.shipper ? [user.shipper.id] : []),
            user,
          };
        }
      }

      // If admin ID was resolved, load admin user
      if (decodedAdminId) {
        const admin = await strapi.db.query('admin::user').findOne({
          where: { id: decodedAdminId },
          populate: ['roles', 'tenant'],
        });
        if (admin) {
          const isSuperAdmin = admin.roles?.some((r: any) => r.code === 'strapi-super-admin');
          let tenantId = admin.tenant?.id || (typeof admin.tenant === 'number' ? admin.tenant : null);
          if (!tenantId) {
            const firstTenant = await strapi.db.query('api::tenant.tenant').findOne();
            tenantId = firstTenant?.id || 1;
          }
          return {
            isSuperAdmin,
            tenantId,
            courierId: null,
            shipperIds: [],
            user: admin,
          };
        }
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

      if (!authContext.isSuperAdmin && authContext.shipperIds && authContext.shipperIds.length > 0) {
        filters.shipper = { id: { $in: authContext.shipperIds } };
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
        populate: ['role_definition', 'tenant', 'courier', 'shipper', 'role', 'pickup_locations'],
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
        if (authContext.shipperIds && authContext.shipperIds.length > 0) {
          queryFilters.shipper = { id: { $in: authContext.shipperIds } };
        }
      }

      const targetUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: queryFilters,
        populate: ['role_definition', 'tenant', 'courier', 'shipper', 'role', 'pickup_locations'],
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
        shipper_roles,
        confirmationType,
        password,
        isenable,
        tenant,
        courier,
        shipper,
        pickup_locations,
        role,
        shipperName,
        shipperAddress,
        shipperCity,
      } = ctx.request.body;

      const tenantId = authContext.isSuperAdmin ? tenant : authContext.tenantId;
      const courierId = authContext.isSuperAdmin ? courier : authContext.courierId;
      
      let targetShipperIds: number[] = [];
      const adminShipperIds = authContext.shipperIds || [];
      
      if (shipper && Array.isArray(shipper) && shipper.length > 0) {
        for (const item of shipper) {
          if (typeof item === 'object' && item !== null) {
            // Safely resolve shipper_plan
            let resolvedPlanId: number | null = null;
            if (item.planId && !isNaN(Number(item.planId))) {
              const existingPlan = await strapi.db.query('api::shipper-plan.shipper-plan').findOne({
                where: { id: Number(item.planId) }
              });
              if (existingPlan) {
                resolvedPlanId = existingPlan.id;
              }
            }

            if (!resolvedPlanId && tenantId) {
              let defaultPlan = await strapi.db.query('api::shipper-plan.shipper-plan').findOne({
                where: { tenant: tenantId },
                orderBy: { id: 'asc' }
              });
              if (!defaultPlan) {
                defaultPlan = await strapi.db.query('api::shipper-plan.shipper-plan').create({
                  data: {
                    name: 'Standard Commercial Plan',
                    base_rate: 200,
                    additional_kg_rate: 100,
                    fuel_surcharge_pct: 5,
                    insurance_pct: 1,
                    tenant: tenantId,
                    publishedAt: new Date(),
                  }
                });
              }
              if (defaultPlan) {
                resolvedPlanId = defaultPlan.id;
              }
            }

            if (item.id && typeof item.id === 'number' && item.id < 1000000000000) {
              const existingShipper = await strapi.db.query('api::shipper.shipper').findOne({
                where: { id: item.id }
              });
              if (existingShipper) {
                targetShipperIds.push(existingShipper.id);
                if (resolvedPlanId) {
                  await strapi.db.query('api::shipper.shipper').update({
                    where: { id: existingShipper.id },
                    data: { shipper_plan: resolvedPlanId }
                  });
                }
                continue;
              }
            }
            if (item.name) {
              const newShipper = await strapi.db.query('api::shipper.shipper').create({
                data: {
                  name: item.name,
                  tenant: tenantId,
                  status: 'active',
                  shipper_plan: resolvedPlanId || null,
                  publishedAt: new Date(),
                }
              });
              targetShipperIds.push(newShipper.id);
              if (item.address || item.city) {
                await strapi.db.query('api::office.office').create({
                  data: {
                    name: `${item.name} Main Office`,
                    address: item.address || '',
                    city: item.city || null,
                    type: 'shipper',
                    shipper: newShipper.id,
                    tenant: tenantId,
                    publishedAt: new Date(),
                  }
                });
              }
            }
          } else if (typeof item === 'number') {
            targetShipperIds.push(item);
          }
        }
      } else if (adminShipperIds.length === 0 && shipperName) {
        // Create the new Shipper record
        const newShipper = await strapi.db.query('api::shipper.shipper').create({
          data: {
            name: shipperName,
            tenant: tenantId,
            status: 'active',
            publishedAt: new Date(),
          }
        });
        targetShipperIds = [newShipper.id];
        
        // Also create the Shipper's default office
        await strapi.db.query('api::office.office').create({
          data: {
            name: 'Main Office',
            address: shipperAddress || '',
            city: shipperCity || null,
            type: 'shipper',
            shipper: newShipper.id,
            tenant: tenantId,
            publishedAt: new Date(),
          }
        });
        console.log(`Automatically created Shipper record: ${shipperName} (ID: ${newShipper.id}) with office.`);
      } else if (adminShipperIds.length === 0 && shipper_roles && shipper_roles.length > 0 && !shipper) {
        // Fallback if no shipperName is provided but we need a shipper
        const fallbackName = fullName || username || `Shipper for ${email}`;
        const newShipper = await strapi.db.query('api::shipper.shipper').create({
          data: {
            name: fallbackName,
            tenant: tenantId,
            status: 'active',
            publishedAt: new Date()
          }
        });
        targetShipperIds = [newShipper.id];
        console.log(`Automatically created Shipper record: ${fallbackName} (ID: ${newShipper.id})`);
      } else if (adminShipperIds.length > 0) {
        if (Array.isArray(shipper)) {
          targetShipperIds = shipper.filter((id: any) => adminShipperIds.includes(Number(id))).map(Number);
        } else if (shipper && adminShipperIds.includes(Number(shipper))) {
          targetShipperIds = [Number(shipper)];
        }
        if (targetShipperIds.length === 0) {
          targetShipperIds = adminShipperIds;
        }
      } else if (shipper) {
        // Allow courier/tenant admin to specify shippers if it belongs to their tenant
        const requestedShippers = Array.isArray(shipper) ? shipper.map(Number) : [Number(shipper)];
        const validShippers = await strapi.db.query('api::shipper.shipper').findMany({
          where: { id: { $in: requestedShippers }, tenant: tenantId }
        });
        targetShipperIds = validShippers.map((s: any) => s.id);
      }

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
      if (isNoConfirmation) {
        const pwdValidation = validatePasswordRule(password);
        if (!pwdValidation.isValid) {
          return ctx.badRequest(pwdValidation.error);
        }
      }
      const userPassword = isNoConfirmation ? password : Math.random().toString(36).substring(2, 10) + '!A1';
      const passwordHash = await bcrypt.hash(userPassword, 10);

      const userData: any = {
        username: scopedUsername,
        email: scopedEmail,
        fullName,
        phone,
        tenant: tenantId,
        role: targetRoleId,
        role_definition: role_definition || null,
        shipper_roles: shipper_roles || null,
        courier: courierId,
        shipper: targetShipperIds,
        pickup_locations: Array.isArray(pickup_locations) ? pickup_locations.map(Number) : (pickup_locations ? [Number(pickup_locations)] : []),
        blocked: isenable === false,
        confirmed: isNoConfirmation,
        password: passwordHash,
        provider: 'local',
      };

      const newUser = await strapi.db.query('plugin::users-permissions.user').create({
        data: userData,
        populate: ['role', 'tenant', 'courier', 'shipper', 'role_definition'],
      });

      if (!isNoConfirmation) {
        try {
          const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
          const confirmationToken = jwt.sign({ id: newUser.id, type: 'setup' }, jwtSecret, { expiresIn: '24h' });
          
          await strapi.db.query('plugin::users-permissions.user').update({
            where: { id: newUser.id },
            data: { confirmationToken }
          });

          const origin = ctx.request.header.origin || `http://${ctx.request.header.host}`;
          const setupLink = `${origin}/auth/setup-account?token=${confirmationToken}`;
          
          console.log(`[Email Mock] Setup link for ${email}: ${setupLink}`);
          
          await strapi.plugin('email').service('email').send({
            to: email,
            from: 'no-reply@dbarc.com',
            subject: 'Welcome! Setup your account',
            text: `Please set up your account by clicking this link: ${setupLink}`,
            html: `<p>Please set up your account by clicking this link: <a href="${setupLink}">${setupLink}</a></p>`,
          });
        } catch (mailErr) {
          console.error('Failed to send setup email:', mailErr);
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
        if (authContext.shipperIds && authContext.shipperIds.length > 0) {
          queryFilters.shipper = { id: { $in: authContext.shipperIds } };
        }
      }

      const targetUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: queryFilters,
        populate: ['tenant', 'shipper', 'pickup_locations'],
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
        shipper_roles,
        password,
        isenable,
        tenant,
        courier,
        shipper,
        pickup_locations,
        role,
      } = ctx.request.body;

      const tenantId = authContext.isSuperAdmin ? (tenant || targetUser.tenant?.id) : authContext.tenantId;

      const updateData: any = {};
      if (username) updateData.username = getTenantScopedUsername(username, tenantId);
      if (email) updateData.email = getTenantScopedEmail(email, tenantId);
      if (fullName !== undefined) {
        updateData.fullName = fullName;
      }
      if (phone !== undefined) updateData.phone = phone;
      if (role_definition !== undefined) updateData.role_definition = role_definition;
      if (shipper_roles !== undefined) updateData.shipper_roles = shipper_roles;
      if (pickup_locations !== undefined) {
        updateData.pickup_locations = Array.isArray(pickup_locations) ? pickup_locations.map(Number) : (pickup_locations ? [Number(pickup_locations)] : []);
      }
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
      } else {
        if (authContext.shipperIds && authContext.shipperIds.length > 0) {
          // Enforce shipper admin's shipper association for their employees
          if (shipper !== undefined) {
            const requestedShippers = Array.isArray(shipper) ? shipper.map(Number) : [Number(shipper)];
            updateData.shipper = requestedShippers.filter(id => authContext.shipperIds.includes(id));
          }
        } else if (shipper !== undefined) {
          // Allow tenant/courier admin to update shipper for users within their tenant
          if (shipper === null || shipper === '') {
            updateData.shipper = [];
          } else {
            const requestedShippers = Array.isArray(shipper) ? shipper.map(Number) : [Number(shipper)];
            const validShippers = await strapi.db.query('api::shipper.shipper').findMany({
              where: { id: { $in: requestedShippers }, tenant: tenantId }
            });
            updateData.shipper = validShippers.map((s: any) => s.id);
          }
        }
      }

      if (password) {
        const pwdValidation = validatePasswordRule(password);
        if (!pwdValidation.isValid) {
          return ctx.badRequest(pwdValidation.error);
        }
        updateData.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await strapi.db.query('plugin::users-permissions.user').update({
        where: { id },
        data: updateData,
        populate: ['role', 'tenant', 'courier', 'shipper', 'role_definition'],
      });

      stripTenantSuffix(updatedUser);
      ctx.body = updatedUser;
    } catch (err: any) {
      return ctx.badRequest(err.message || 'An error occurred while updating employee.');
    }
  };

  plugin.controllers.user.resendInvite = async (ctx: any) => {
    const authContext = await getAuthenticatedContext(ctx);
    if (!authContext) return ctx.unauthorized();

    try {
      const { id } = ctx.params;
      
      const queryFilters: any = { id };
      if (!authContext.isSuperAdmin) {
        queryFilters.tenant = authContext.tenantId || null;
        if (authContext.shipperIds && authContext.shipperIds.length > 0) {
          queryFilters.shipper = { id: { $in: authContext.shipperIds } };
        }
      }

      const targetUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: queryFilters,
      });

      if (!targetUser) {
        return ctx.notFound('User not found.');
      }
      
      if (targetUser.confirmed) {
        return ctx.badRequest('User is already confirmed.');
      }

      const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
      const confirmationToken = jwt.sign({ id: targetUser.id, type: 'setup' }, jwtSecret, { expiresIn: '24h' });
      
      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: targetUser.id },
        data: { confirmationToken }
      });

      const origin = ctx.request.header.origin || `http://${ctx.request.header.host}`;
      const setupLink = `${origin}/auth/setup-account?token=${confirmationToken}`;
      
      console.log(`[Email Mock] Resent Setup link for ${targetUser.email}: ${setupLink}`);
      
      try {
        await strapi.plugin('email').service('email').send({
          to: targetUser.email,
          from: 'no-reply@dbarc.com',
          subject: 'Welcome! Setup your account',
          text: `Please set up your account by clicking this link: ${setupLink}`,
          html: `<p>Please set up your account by clicking this link: <a href="${setupLink}">${setupLink}</a></p>`,
        });
      } catch (mailErr) {
        console.error('Failed to send setup email:', mailErr);
      }

      return ctx.send({ message: 'Invitation resent successfully' });
    } catch (err: any) {
      return ctx.badRequest(err.message || 'An error occurred while resending invitation.');
    }
  };

  // Register Custom Routes
  plugin.routes['content-api'].routes.push(
    {
      method: 'POST',
      path: '/tenant/users/:id/resend-invite',
      handler: 'user.resendInvite',
      config: {
        prefix: '',
        auth: false,
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/auth/setup-account',
      handler: 'user.setupAccount',
      config: {
        prefix: '',
        auth: false,
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/tenant/users/create',
      handler: 'user.createEmployee',
      config: {
        prefix: '',
        auth: false,
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/tenant/users/:id',
      handler: 'user.updateEmployee',
      config: {
        prefix: '',
        auth: false,
        policies: [],
      },
    }
  );

  return plugin;
};
