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
          let adminId: number | null = null;
          try {
            const sessionManager = strapi.sessionManager;
            if (sessionManager) {
              const result = sessionManager('admin').validateAccessToken(token);
              if (result?.isValid && result?.payload?.userId) {
                adminId = Number(result.payload.userId);
              }
            }
          } catch (e) {}

          if (!adminId) {
            try {
              const jwt = require('jsonwebtoken');
              const decoded: any = jwt.decode(token);
              const aid = decoded && (decoded.id || decoded.userId);
              if (aid) adminId = Number(aid);
            } catch (e) {}
          }

          if (adminId) {
            const admin = await strapi.db.query('admin::user').findOne({
              where: { id: Number(adminId) },
              populate: ['roles'],
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
        if (!user) {
          throw new UnauthorizedError();
        }

        // Super Admin bypass: full access across Content API
        const isSuperAdmin = user.isAdminUser && (
          user.adminUser?.roles?.some((r: any) => r.code === 'strapi-super-admin') ||
          user.role?.type === 'super_admin'
        );
        if (isSuperAdmin) {
          return;
        }

        if (!config.scope) {
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

      // Auto-sync all PostgreSQL primary key sequences to MAX(id)
      try {
        await strapi.db.connection.raw(`
          DO $$
          DECLARE
              rec RECORD;
              max_val BIGINT;
          BEGIN
              FOR rec IN 
                  SELECT 
                      tc.table_schema, 
                      tc.table_name, 
                      cc.column_name,
                      pg_get_serial_sequence('"' || tc.table_schema || '"."' || tc.table_name || '"', cc.column_name) AS seq_name
                  FROM information_schema.table_constraints tc
                  JOIN information_schema.constraint_column_usage cc 
                      ON tc.constraint_name = cc.constraint_name 
                      AND tc.table_schema = cc.table_schema
                  WHERE tc.constraint_type = 'PRIMARY KEY' 
                    AND tc.table_schema = 'public'
              LOOP
                  IF rec.seq_name IS NOT NULL THEN
                      EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I.%I', rec.column_name, rec.table_schema, rec.table_name) INTO max_val;
                      IF max_val > 0 THEN
                          EXECUTE format('SELECT setval(%L, %s, true)', rec.seq_name, max_val);
                      ELSE
                          EXECUTE format('SELECT setval(%L, 1, false)', rec.seq_name);
                      END IF;
                  END IF;
              END LOOP;
          END $$;
        `);
        console.log('PostgreSQL primary key sequences synchronized.');
      } catch (seqErr: any) {
        console.warn('Sequence alignment note:', seqErr.message);
      }

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

      // Seed default expense categories
      const defaultExpenseCategories = [
        'Fuel & Travel',
        'Vehicle Maintenance & Repair',
        'Office Rent & Utilities',
        'Packaging & Supplies',
        'Rider / Staff Advances & Allowances',
        'Refreshments & Food',
        'Marketing',
        'Miscellaneous'
      ];
      for (const catName of defaultExpenseCategories) {
        const existingCat = await strapi.db.query('api::expense-category.expense-category').findOne({
          where: { name: catName }
        });
        if (!existingCat) {
          await strapi.db.query('api::expense-category.expense-category').create({
            data: {
              name: catName,
              description: `Default category for ${catName}`,
              is_active: true
            }
          });
          console.log(`Seeded default expense category: ${catName}`);
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
        'plugin::users-permissions.auth.callback',
        'plugin::users-permissions.auth.connect',
        'plugin::users-permissions.user.update',
        'plugin::users-permissions.user.findOne',
        'plugin::users-permissions.user.find',
        'plugin::users-permissions.user.me',
        'plugin::users-permissions.user.createEmployee',
        'plugin::users-permissions.user.updateEmployee',
        'plugin::users-permissions.user.resendInvite',
        'plugin::users-permissions.user.setupAccount',
        'plugin::users-permissions.role.find',
        'plugin::users-permissions.role.findOne',
      ];

      const publicPermissions: string[] = [
        'plugin::users-permissions.user.me',
        'plugin::users-permissions.user.createEmployee',
        'plugin::users-permissions.user.updateEmployee',
        'plugin::users-permissions.user.resendInvite',
        'plugin::users-permissions.user.setupAccount',
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
        if (baseAction === 'api::parcel.parcel') {
          publicPermissions.push(`${baseAction}.create`);
        }
      });

      // Grant permissions to all roles
      for (const r of roles) {
        if (r.type === 'public') {
          await grantPermissions(r.id, publicPermissions);
        } else {
          await grantPermissions(r.id, authenticatedPermissions);
        }
      }

      console.log('All permissions successfully bootstrapped!');

      // Seed Pakistan Cities
      const citiesCount = await strapi.db.query('api::city.city').count();
      if (citiesCount === 0) {
        console.log('Fetching Pakistan cities from internet to seed database...');
        try {
          const response = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ country: 'pakistan' })
          });
          const result: any = await response.json();
          if (!result.error && Array.isArray(result.data)) {
            const citiesToInsert = result.data.map((c: string) => ({ CityName: c, Active: true }));
            for (const city of citiesToInsert) {
              await strapi.db.query('api::city.city').create({
                data: city
              });
            }
            console.log(`Successfully seeded ${citiesToInsert.length} cities of Pakistan!`);
          } else {
            console.error('Failed to fetch cities from API:', result.msg);
          }
        } catch (fetchErr) {
          console.error('Error fetching cities:', fetchErr);
        }
      } else {
        console.log(`Cities already seeded. Count: ${citiesCount}`);
      }

      // Ensure default regions/zones for all tenants
      for (const t of tenants) {
        const regionCount = await strapi.db.query('api::region.region').count({
          where: { tenant: t.id }
        });
        if (regionCount === 0) {
          const defaultZones = [
            { name: 'Within City', type: 'local', cities: [] },
            { name: 'Zone A', type: 'metro', cities: ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi'] },
            { name: 'Zone B', type: 'regional', cities: ['Faisalabad', 'Multan', 'Peshawar', 'Gujranwala', 'Sialkot', 'Hyderabad', 'Gujrat', 'Sahiwal', 'Sheikhupura', 'Jhelum'] },
            { name: 'Zone C', type: 'secondary', cities: ['Quetta', 'Sukkur', 'Bahawalpur', 'Sargodha', 'Abbottabad', 'Mardan', 'Larkana', 'Okara', 'Rahim Yar Khan', 'Muzaffargarh', 'Dera Ghazi Khan', 'Nawabshah (Shaheed Benazirabad)', 'Chiniot'] },
            { name: 'Zone D', type: 'remote', cities: ['Gwadar', 'Gilgit', 'Skardu', 'Turbat', 'Khuzdar', 'Chaman', 'Bannu', 'Dera Ismail Khan', 'Mirpur (AJK)', 'Muzaffarabad', 'Kotli', 'Rawalakot', 'Haripur', 'Swabi', 'Nowshera', 'Mansehra'] }
          ];

          for (const zone of defaultZones) {
            const matchedCities = await strapi.db.query('api::city.city').findMany({
              where: { CityName: { $in: zone.cities } }
            });

            await strapi.db.query('api::region.region').create({
              data: {
                name: zone.name,
                type: zone.type,
                active: true,
                tenant: t.id,
                cities: matchedCities.map((c: any) => c.id)
              }
            });
          }
          console.log(`Seeded default zones for Tenant: ${t.name}`);
        }
      }

    } catch (err) {
      console.error('Error during permissions bootstrap:', err);
    }
  },
};
