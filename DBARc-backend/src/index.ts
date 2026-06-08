// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

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

      // Find the Roles
      const roles = await strapi.db.query('plugin::users-permissions.role').findMany();
      const authenticatedRole = roles.find((r: any) => r.type === 'authenticated');
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
      await grantPermissions(publicRole.id, publicPermissions);

      console.log('All permissions successfully bootstrapped!');
    } catch (err) {
      console.error('Error during permissions bootstrap:', err);
    }
  },
};
