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
    } catch (error) {
      strapi.log.error('Failed to create bootstrap admin users:', error);
    }
  },
};
