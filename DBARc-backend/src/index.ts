import bcrypt from 'bcryptjs';
import type { Core } from '@strapi/strapi';

const SUPER_ADMIN_EMAIL = 'naeem4it@gmail.com';
const SUPER_ADMIN_PASSWORD = '#0321Blouch';
const SUPER_ADMIN_USERNAME = 'naeem4it';
const SUPER_ADMIN_FIRSTNAME = 'Naeem';
const SUPER_ADMIN_LASTNAME = 'IT';
const SUPER_ADMIN_ROLE_CODE = 'strapi-super-admin';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      const superAdminRole = await strapi.db.query('admin::role').findOne({
        where: { code: SUPER_ADMIN_ROLE_CODE },
      });

      if (!superAdminRole) {
        strapi.log.warn('Super Admin role not found. Skipping admin bootstrap.');
        return;
      }

      const existingAdmin = await strapi.db.query('admin::user').findOne({
        where: { email: SUPER_ADMIN_EMAIL },
        populate: ['roles'],
      });

      const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
      const defaultAdminData = {
        email: SUPER_ADMIN_EMAIL,
        username: SUPER_ADMIN_USERNAME,
        firstname: SUPER_ADMIN_FIRSTNAME,
        lastname: SUPER_ADMIN_LASTNAME,
        password: hashedPassword,
        isActive: true,
        blocked: false,
        roles: [superAdminRole.id],
      };

      if (!existingAdmin) {
        await strapi.db.query('admin::user').create({
          data: defaultAdminData,
          populate: ['roles'],
        });

        strapi.log.info(`Created bootstrap admin user: ${SUPER_ADMIN_EMAIL}`);
        return;
      }

      const currentRoleIds = existingAdmin.roles?.map((role: any) => role.id) ?? [];
      const needsUpdate =
        existingAdmin.username !== SUPER_ADMIN_USERNAME ||
        !existingAdmin.isActive ||
        existingAdmin.blocked ||
        !currentRoleIds.includes(superAdminRole.id);

      if (needsUpdate) {
        await strapi.db.query('admin::user').update({
          where: { id: existingAdmin.id },
          data: {
            username: SUPER_ADMIN_USERNAME,
            firstname: SUPER_ADMIN_FIRSTNAME,
            lastname: SUPER_ADMIN_LASTNAME,
            password: hashedPassword,
            isActive: true,
            blocked: false,
            roles: Array.from(new Set([...currentRoleIds, superAdminRole.id])),
          },
          populate: ['roles'],
        });

        strapi.log.info(`Updated existing admin user: ${SUPER_ADMIN_EMAIL}`);
      } else {
        await strapi.db.query('admin::user').update({
          where: { id: existingAdmin.id },
          data: {
            password: hashedPassword,
          },
        });
        strapi.log.info(`Updated bootstrap admin password for: ${SUPER_ADMIN_EMAIL}`);
      }
    } catch (error) {
      strapi.log.error('Failed to create bootstrap admin user:', error);
    }
  },
};
