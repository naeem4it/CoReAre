const { createStrapi, compileStrapi } = require('@strapi/strapi');
const bcrypt = require('bcryptjs');

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  
  try {
    // 1. Create or Find Tenant
    let tenant = await strapi.db.query('api::tenant.tenant').findOne({ where: { name: 'Naeem Tenant' } });
    if (!tenant) {
      tenant = await strapi.db.query('api::tenant.tenant').create({
        data: {
          name: 'Naeem Tenant',
          status: 'active'
        }
      });
      console.log('Created Tenant: Naeem Tenant');
    } else {
      console.log('Using existing Tenant: Naeem Tenant');
    }

    // 2. Create or Find Shipper under this Tenant
    let shipper = await strapi.db.query('api::shipper.shipper').findOne({ 
      where: { 
        name: 'Naeem Shipper',
        tenant: tenant.id
      } 
    });
    if (!shipper) {
      shipper = await strapi.db.query('api::shipper.shipper').create({
        data: {
          name: 'Naeem Shipper',
          tenant: tenant.id,
          status: 'active'
        }
      });
      console.log('Created Shipper: Naeem Shipper under Tenant');
    }

    // 3. Seed default courier roles under this Tenant
    const defaultCourierRoles = ['Super Admin', 'Admin', 'Front desk', 'shipment Booker', 'Rider'];
    for (const roleName of defaultCourierRoles) {
      let roleDef = await strapi.db.query('api::role-definition.role-definition').findOne({
        where: {
          role_name: roleName,
          tenant: tenant.id
        }
      });
      if (!roleDef) {
        roleDef = await strapi.db.query('api::role-definition.role-definition').create({
          data: {
            role_name: roleName,
            tenant: tenant.id,
            permissions: []
          }
        });
        console.log(`Created Role Definition: ${roleName} under Tenant`);
      }
    }


    // ==========================================
    // SEED STRAPI ADMIN USERS (for admin/login)
    // ==========================================

    // Find or Create admin role for courier
    let courierAdminRole = await strapi.db.query('admin::role').findOne({ where: { code: 'strapi-tenant-admin' } });
    if (!courierAdminRole) {
      courierAdminRole = await strapi.db.query('admin::role').create({
        data: {
          name: 'Courier Admin',
          code: 'strapi-tenant-admin',
          description: 'Courier Tenant Admin Role'
        }
      });
      console.log('Created Admin Role: strapi-tenant-admin');
    }

    // Find or Create admin role for shipper
    let shipperRole = await strapi.db.query('admin::role').findOne({ where: { code: 'strapi-shipper' } });
    if (!shipperRole) {
      shipperRole = await strapi.db.query('admin::role').create({
        data: {
          name: 'Shipper Admin',
          code: 'strapi-shipper',
          description: 'Shipper Admin Role'
        }
      });
      console.log('Created Admin Role: strapi-shipper');
    }

    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 10);

    // Create Courier Admin User in admin::user
    const courierEmail = 'naeemcourier@test.com';
    let adminCourierUser = await strapi.db.query('admin::user').findOne({ where: { email: courierEmail } });
    if (adminCourierUser) {
      await strapi.db.query('admin::user').update({
        where: { id: adminCourierUser.id },
        data: {
          password: passwordHash,
          tenant: tenant.id,
          roles: [courierAdminRole.id],
          isActive: true
        }
      });
      console.log(`Updated Admin-User ${courierEmail} password to Password123!`);
    } else {
      await strapi.db.query('admin::user').create({
        data: {
          email: courierEmail,
          username: 'naeemcourier_admin',
          firstname: 'Naeem',
          lastname: 'Courier',
          password: passwordHash,
          tenant: tenant.id,
          roles: [courierAdminRole.id],
          isActive: true,
          registrationToken: null
        }
      });
      console.log(`Created Admin-User ${courierEmail} with password Password123!`);
    }

    // Create Shipper Admin User in admin::user
    const shipperEmail = 'naeemshiper@test.com';
    let adminShipperUser = await strapi.db.query('admin::user').findOne({ where: { email: shipperEmail } });
    if (adminShipperUser) {
      await strapi.db.query('admin::user').update({
        where: { id: adminShipperUser.id },
        data: {
          password: passwordHash,
          tenant: tenant.id,
          roles: [shipperRole.id],
          isActive: true
        }
      });
      console.log(`Updated Admin-User ${shipperEmail} password to Password123!`);
    } else {
      await strapi.db.query('admin::user').create({
        data: {
          email: shipperEmail,
          username: 'naeemshipper_admin',
          firstname: 'Naeem',
          lastname: 'Shipper',
          password: passwordHash,
          tenant: tenant.id,
          roles: [shipperRole.id],
          isActive: true,
          registrationToken: null
        }
      });
      console.log(`Created Admin-User ${shipperEmail} with password Password123!`);
    }

    // ====================================================================
    // SEED USERS-PERMISSIONS END USERS (for /auth/local - Courier Portal)
    // ====================================================================

    const authenticatedUPRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' }
    });
    if (!authenticatedUPRole) {
      throw new Error('Default users-permissions authenticated role not found.');
    }

    // Create Courier Admin User in plugin::users-permissions.user
    let upCourierUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email: courierEmail }
    });

    if (upCourierUser) {
      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: upCourierUser.id },
        data: {
          password: passwordHash,
          tenant: tenant.id,
          role: authenticatedUPRole.id,
          confirmed: true,
          blocked: false
        }
      });
      console.log(`Updated UP-User ${courierEmail} password to Password123!`);
    } else {
      await strapi.db.query('plugin::users-permissions.user').create({
        data: {
          email: courierEmail,
          username: 'naeemcourier',
          fullName: 'Naeem Courier',
          password: passwordHash,
          tenant: tenant.id,
          role: authenticatedUPRole.id,
          confirmed: true,
          blocked: false,
          provider: 'local'
        }
      });
      console.log(`Created UP-User ${courierEmail} (username: naeemcourier) with password Password123!`);
    }

    // Create Shipper Admin User in plugin::users-permissions.user
    let upShipperUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email: shipperEmail }
    });

    if (upShipperUser) {
      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: upShipperUser.id },
        data: {
          password: passwordHash,
          tenant: tenant.id,
          shipper: shipper.id,
          role: authenticatedUPRole.id,
          shipper_roles: ['shipper admin'],
          confirmed: true,
          blocked: false
        }
      });
      console.log(`Updated UP-User ${shipperEmail} password to Password123!`);
    } else {
      await strapi.db.query('plugin::users-permissions.user').create({
        data: {
          email: shipperEmail,
          username: 'naeemshipper',
          fullName: 'Naeem Shipper',
          password: passwordHash,
          tenant: tenant.id,
          shipper: shipper.id,
          role: authenticatedUPRole.id,
          shipper_roles: ['shipper admin'],
          confirmed: true,
          blocked: false,
          provider: 'local'
        }
      });
      console.log(`Created UP-User ${shipperEmail} (username: naeemshipper) with password Password123!`);
    }

  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await app.destroy();
    process.exit(0);
  }
}

main();
