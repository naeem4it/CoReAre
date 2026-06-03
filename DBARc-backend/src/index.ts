import bcrypt from 'bcryptjs';
import type { Core } from '@strapi/strapi';

const SUPER_ADMIN_EMAIL = 'naeem4it@gmail.com';
const SUPER_ADMIN_PASSWORD = '#0321Blouch';
const SUPER_ADMIN_USERNAME = 'naeem4it';
const SUPER_ADMIN_FIRSTNAME = 'Naeem';
const SUPER_ADMIN_LASTNAME = 'IT';
const SUPER_ADMIN_ROLE_CODES = ['strapi-super-admin'];

const ALL_ROLES_USER_EMAIL = 'naeemTenant@DBARC.com';
const ALL_ROLES_USER_PASSWORD = '#0321Blouch';
const ALL_ROLES_USER_USERNAME = 'naeemTenant';
const ALL_ROLES_USER_FIRSTNAME = 'Naeem';
const ALL_ROLES_USER_LASTNAME = 'Tenant';
const ALL_ROLES_USER_ROLE_CODES = ['strapi-tenant-admin', 'strapi-shipper', 'strapi-rider'];

async function ensureAdminUser(
  strapi: Core.Strapi,
  email: string,
  username: string,
  firstname: string,
  lastname: string,
  password: string,
  roleCodes: string[],
) {
  const adminRoles = await strapi.db.query('admin::role').findMany({
    where: { code: roleCodes },
  });

  if (!adminRoles || adminRoles.length === 0) {
    strapi.log.warn(`No admin roles found for bootstrap user ${email}. Skipping creation.`);
    return;
  }

  const existingAdmin = await strapi.db.query('admin::user').findOne({
    where: { email },
    populate: ['roles'],
  });

  const hashedPassword = await bcrypt.hash(password, 10);
  const adminData = {
    email,
    username,
    firstname,
    lastname,
    password: hashedPassword,
    isActive: true,
    blocked: false,
    roles: adminRoles.map((role) => role.id),
  };

  if (!existingAdmin) {
    await strapi.db.query('admin::user').create({
      data: adminData,
      populate: ['roles'],
    });

    strapi.log.info(`Created bootstrap admin user: ${email}`);
    return;
  }

  const currentRoleIds = existingAdmin.roles?.map((role: any) => role.id) ?? [];
  const adminRoleIds = adminRoles.map((role) => role.id);
  const missingRoleIds = adminRoleIds.filter((id) => !currentRoleIds.includes(id));
  const needsUpdate =
    existingAdmin.username !== username ||
    !existingAdmin.isActive ||
    existingAdmin.blocked ||
    missingRoleIds.length > 0;

  if (needsUpdate) {
    await strapi.db.query('admin::user').update({
      where: { id: existingAdmin.id },
      data: {
        username,
        firstname,
        lastname,
        password: hashedPassword,
        isActive: true,
        blocked: false,
        roles: Array.from(new Set([...currentRoleIds, ...adminRoleIds])),
      },
      populate: ['roles'],
    });

    strapi.log.info(`Updated existing admin user: ${email}`);
    return;
  }

  await strapi.db.query('admin::user').update({
    where: { id: existingAdmin.id },
    data: {
      password: hashedPassword,
    },
  });
  strapi.log.info(`Updated bootstrap admin password for: ${email}`);
}

async function ensurePublicPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' }
  });

  if (!publicRole) {
    strapi.log.warn('Public role not found in users-permissions plugin');
    return;
  }

  const actionsToEnable = [
    'api::parcel.parcel.find',
    'api::parcel.parcel.findOne',
    'api::rider.rider.find',
    'api::rider.rider.findOne',
    'api::tenant.tenant.find',
    'api::tenant.tenant.findOne',
  ];

  for (const action of actionsToEnable) {
    const existingPerm = await strapi.db.query('plugin::users-permissions.permission').findOne({
      where: {
        role: publicRole.id,
        action: action
      }
    });

    if (existingPerm) {
      if (!existingPerm.enabled) {
        await strapi.db.query('plugin::users-permissions.permission').update({
          where: { id: existingPerm.id },
          data: { enabled: true }
        });
        strapi.log.info(`Enabled public permission: ${action}`);
      }
    } else {
      await strapi.db.query('plugin::users-permissions.permission').create({
        data: {
          action,
          role: publicRole.id,
          enabled: true
        }
      });
      strapi.log.info(`Created and enabled public permission: ${action}`);
    }
  }
}

async function seedDatabase(strapi: Core.Strapi) {
  try {
    // 1. Ensure Tenant
    let tenant = await strapi.db.query('api::tenant.tenant').findOne({
      where: { domain: 'flycourier.dbarc.com' }
    });

    if (!tenant) {
      tenant = await strapi.db.query('api::tenant.tenant').create({
        data: {
          name: 'Fly Courier Tenant',
          domain: 'flycourier.dbarc.com',
          status: 'active',
          platform_commission_pct: 2.5
        }
      });
      strapi.log.info('Seeded default tenant');
    }

    // 2. Ensure Riders
    const existingRidersCount = await strapi.db.query('api::rider.rider').count();
    if (existingRidersCount === 0) {
      const ridersData = [
        { name: 'Kamran Akmal', phone: '+923001234567', email: 'kamran@flycourier.com', status: 'active', tenant: tenant.id },
        { name: 'Zahid Mahmood', phone: '+923119876543', email: 'zahid@flycourier.com', status: 'active', tenant: tenant.id },
        { name: 'Sajid Khan', phone: '+923225556677', email: 'sajid@flycourier.com', status: 'active', tenant: tenant.id }
      ];

      for (const r of ridersData) {
        await strapi.db.query('api::rider.rider').create({ data: r });
      }
      strapi.log.info('Seeded test riders');
    }

    // 3. Ensure Parcels (Shipments)
    const existingParcelsCount = await strapi.db.query('api::parcel.parcel').count();
    if (existingParcelsCount === 0) {
      const parcelsData = [
        {
          tracking_number: 'FLY-92841',
          status: 'in_transit',
          cod_amount: 4500,
          weight: 1.5,
          delivery_charges: 250,
          recipient_name: 'Ahmed Sheikh',
          recipient_phone: '+923334445555',
          recipient_address: 'House 12, Street 3, F-8, Islamabad',
          tenant: tenant.id
        },
        {
          tracking_number: 'FLY-92842',
          status: 'delivered',
          cod_amount: 12000,
          weight: 3.2,
          delivery_charges: 350,
          recipient_name: 'Maryam Khan',
          recipient_phone: '+923445556666',
          recipient_address: 'Flat 4B, Gulberg Heights, Lahore',
          tenant: tenant.id
        },
        {
          tracking_number: 'FLY-92843',
          status: 'created',
          cod_amount: 0,
          weight: 0.8,
          delivery_charges: 150,
          recipient_name: 'Javeria Dawood',
          recipient_phone: '+923556667777',
          recipient_address: 'House 44, Defence Phase 5, Karachi',
          tenant: tenant.id
        }
      ];

      for (const p of parcelsData) {
        await strapi.db.query('api::parcel.parcel').create({ data: p });
      }
      strapi.log.info('Seeded test parcels');
    }
  } catch (err) {
    strapi.log.error('Failed to seed database:', err);
  }
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      await ensureAdminUser(
        strapi,
        SUPER_ADMIN_EMAIL,
        SUPER_ADMIN_USERNAME,
        SUPER_ADMIN_FIRSTNAME,
        SUPER_ADMIN_LASTNAME,
        SUPER_ADMIN_PASSWORD,
        SUPER_ADMIN_ROLE_CODES,
      );

      await ensureAdminUser(
        strapi,
        ALL_ROLES_USER_EMAIL,
        ALL_ROLES_USER_USERNAME,
        ALL_ROLES_USER_FIRSTNAME,
        ALL_ROLES_USER_LASTNAME,
        ALL_ROLES_USER_PASSWORD,
        ALL_ROLES_USER_ROLE_CODES,
      );

      await ensurePublicPermissions(strapi);
      await seedDatabase(strapi);
    } catch (error) {
      strapi.log.error('Failed to create bootstrap admin users, permissions, or seed database:', error);
    }
  },
};

