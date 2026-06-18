import { errors } from '@strapi/utils';
const { ForbiddenError, UnauthorizedError } = errors;

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: any }) {
    strapi.get('auth').register('content-api', {
      name: 'admin-jwt-strategy',
      async authenticate(ctx: any) {
        const authHeader = ctx.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return { authenticated: false };
        }
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
              
              const roles = await strapi.db.query('plugin::users-permissions.role').findMany();
              const authenticatedRole = roles.find((r: any) => r.type === 'authenticated');
              const superAdminRole = roles.find((r: any) => r.type === 'super_admin') || authenticatedRole;
              const targetRole = isSuperAdmin ? superAdminRole : authenticatedRole;

              let ability = null;
              if (targetRole) {
                const permissions = await strapi.plugin('users-permissions').service('permission').findRolePermissions(targetRole.id);
                const mappedPermissions = permissions.map((p: any) => strapi.plugin('users-permissions').service('permission').toContentAPIPermission(p));
                ability = await strapi.contentAPI.permissions.engine.generateAbility(mappedPermissions);
              }

              const mockUser = {
                id: admin.id,
                username: admin.username || `${admin.firstname}_${admin.lastname}`,
                email: admin.email,
                tenant: admin.tenant,
                role: targetRole,
                isAdminUser: true,
                adminUser: admin,
              };

              return {
                authenticated: true,
                credentials: mockUser,
                ability,
              };
            }
          }
        } catch (err) {
          return { authenticated: false };
        }
        return { authenticated: false };
      },
      async verify(auth: any, config: any) {
        const { credentials: user, ability } = auth;
        if (!config.scope) {
          if (!user) {
            throw new UnauthorizedError();
          }
          return;
        }
        if (!ability) {
          throw new UnauthorizedError();
        }
        
        const scopes = Array.isArray(config.scope) ? config.scope : [config.scope];
        const isAllowed = scopes.every((scope: string) => ability.can(scope));
        if (!isAllowed) {
          throw new ForbiddenError();
        }
      }
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: any }) {
    try {
      console.log('Bootstrapping default permissions...');

      // Seed default courier roles for all existing tenants
      const tenants = await strapi.db.query('api::tenant.tenant').findMany();
      const defaultCourierRoles = ['Super Admin', 'Admin', 'Front desk', 'shipment Booker', 'Rider'];
      for (const t of tenants) {
        for (const roleName of defaultCourierRoles) {
          const existingRole = await strapi.db.query('api::role-definition.role-definition').findOne({
            where: { role_name: roleName, tenant: t.id }
          });
          if (!existingRole) {
            await strapi.db.query('api::role-definition.role-definition').create({
              data: {
                role_name: roleName,
                tenant: t.id,
                permissions: []
              }
            });
            console.log(`Seeded default courier role: ${roleName} for Tenant: ${t.name}`);
          }
        }
      }

      // Find the Roles
      const roles = await strapi.db.query('plugin::users-permissions.role').findMany();
      const authenticatedRole = roles.find((r: any) => r.type === 'authenticated');
      const superAdminRole = roles.find((r: any) => r.type === 'super_admin');
      const publicRole = roles.find((r: any) => r.type === 'public');

      if (!authenticatedRole || !publicRole) {
        console.log('Strapi roles not found. Skipping permissions bootstrap.');
        return;
      }

      // Helper to grant permissions
      const grantPermissions = async (roleId: number, permissionsList: string[]) => {
        for (const action of permissionsList) {
          // Check if permission already exists
          const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
            where: { action, role: roleId }
          });
          if (!existing) {
            await strapi.db.query('plugin::users-permissions.permission').create({
              data: { action, role: roleId }
            });
            console.log(`Granted permission: ${action} to role ID: ${roleId}`);
          }
        }
      };

      // Get all APIs defined in Strapi
      const contentTypes = Object.keys(strapi.contentTypes);
      const apiContentTypes = contentTypes.filter(ct => ct.startsWith('api::'));

      const authenticatedPermissions: string[] = [
        // Users-permissions endpoints
        'plugin::users-permissions.user.update',
        'plugin::users-permissions.user.findOne',
        'plugin::users-permissions.user.find',
        'plugin::users-permissions.user.me',
        'plugin::users-permissions.user.createEmployee',
        'plugin::users-permissions.user.updateEmployee',
        'plugin::users-permissions.role.find',
        'plugin::users-permissions.role.findOne',
      ];

      const publicPermissions: string[] = [
        'plugin::users-permissions.user.me',
      ];

      // Add all actions for all api content-types to authenticatedPermissions
      apiContentTypes.forEach(ct => {
        const apiName = ct.split('::')[1]; // e.g. 'parcel.parcel'
        const baseAction = `api::${apiName}`;
        authenticatedPermissions.push(
          `${baseAction}.find`,
          `${baseAction}.findOne`,
          `${baseAction}.create`,
          `${baseAction}.update`,
          `${baseAction}.delete`
        );
        publicPermissions.push(
          `${baseAction}.find`,
          `${baseAction}.findOne`
        );
      });

      // Grant permissions
      await grantPermissions(authenticatedRole.id, authenticatedPermissions);
      if (superAdminRole) {
        await grantPermissions(superAdminRole.id, authenticatedPermissions);
      }
      await grantPermissions(publicRole.id, publicPermissions);

      console.log('All permissions successfully bootstrapped!');
    } catch (err) {
      console.error('Error during permissions bootstrap:', err);
    }
  },
};
