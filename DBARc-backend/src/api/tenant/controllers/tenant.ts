/**
 * tenant controller
 */

import { factories } from '@strapi/strapi';
import bcrypt from 'bcryptjs';

export default factories.createCoreController('api::tenant.tenant', ({ strapi }) => ({
  async provision(ctx) {
    try {
      const {
        name,
        domain,
        plan,
        commissionPct,
        status,
        features,
        adminUsername,
        adminFullName,
        adminEmail,
        adminPassword,
        confirmationType,
        address,
      } = ctx.request.body;

      if (!name || !domain || !adminUsername || !adminEmail) {
        return ctx.badRequest('Missing required fields');
      }

      // Check if user email already exists
      const existingUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email: adminEmail }
      });

      if (existingUser) {
        return ctx.badRequest('Admin email is already taken');
      }

      // Create Tenant
      const tenant = await strapi.db.query('api::tenant.tenant').create({
        data: {
          name,
          domain,
          plan,
          commissionPct,
          status,
          features,
          address,
          publishedAt: new Date(),
        }
      });

      // Fetch authenticated role
      const authenticatedUPRole = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'authenticated' }
      });

      // Handle password and confirmation
      let passwordHash = null;
      let confirmed = false;
      
      if (adminPassword && adminPassword.trim()) {
        passwordHash = await bcrypt.hash(adminPassword.trim(), 10);
        confirmed = true;
      } else if (confirmationType === 'no_confirmation') {
        return ctx.badRequest('Admin password is required when direct setup is selected');
      } else {
        // Generate a random password if email confirmation is needed
        passwordHash = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
      }

      const scopedEmail = adminEmail.includes('#') ? adminEmail : `${adminEmail}#${tenant.id}`;
      const scopedUsername = adminUsername.includes('#') ? adminUsername : `${adminUsername}#${tenant.id}`;

      // Create Courier Admin User
      const user = await strapi.db.query('plugin::users-permissions.user').create({
        data: {
          email: scopedEmail,
          username: scopedUsername,
          fullName: adminFullName,
          password: passwordHash,
          tenant: tenant.id,
          role: authenticatedUPRole.id,
          confirmed: confirmed,
          blocked: false,
          provider: 'local',
        }
      });

      // Create Courier Admin custom role for this tenant
      const courierAdminRole = await strapi.db.query('api::role-definition.role-definition').create({
        data: {
          role_name: 'Courier Admin',
          permissions: ['all'],
          tenant: tenant.id,
          publishedAt: new Date(),
        }
      });

      // Create default office
      const defaultOffice = await strapi.db.query('api::office.office').create({
        data: {
          name: 'Head Office',
          address: address || 'N/A',
          type: 'courier',
          tenant: tenant.id,
          publishedAt: new Date(),
        }
      });

      // Link role and office to user
      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: {
          role_definition: [courierAdminRole.id],
          offices: [defaultOffice.id]
        }
      });

      // If email confirmation is required, we should theoretically send an email here.
      if (!confirmed) {
        try {
          const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
          const jwt = require('jsonwebtoken');
          const confirmationToken = jwt.sign({ id: user.id, type: 'setup' }, jwtSecret, { expiresIn: '24h' });
          
          await strapi.db.query('plugin::users-permissions.user').update({
            where: { id: user.id },
            data: { confirmationToken }
          });

          // Since tenant admins will work in DBARc-Courier, we point them to the courier app auth
          // In a real environment, this might be `https://${domain}/auth/setup-account`
          // For dev, it could be `http://localhost:3000/...` but we'll use domain for illustration.
          const protocol = ctx.request.header.origin ? ctx.request.header.origin.split('://')[0] : 'https';
          const setupLink = `${protocol}://${domain}/auth/setup-account?token=${confirmationToken}`;
          
          console.log(`[Email Mock] Setup link for Tenant Admin ${adminEmail}: ${setupLink}`);
          
          await strapi.plugin('email').service('email').send({
            to: adminEmail,
            from: 'no-reply@dbarc.com',
            subject: 'Your DBARc Workspace is Ready - Setup your account',
            text: `Please set up your admin account by clicking this link: ${setupLink}`,
            html: `<p>Please set up your admin account by clicking this link: <a href="${setupLink}">${setupLink}</a></p>`,
          });
        } catch (emailErr) {
          console.error('Failed to send setup email:', emailErr);
          // We don't fail the whole request, but we log it.
        }
      }

      return ctx.send({
        message: 'Tenant and Admin provisioned successfully',
        tenant,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        }
      });
    } catch (err) {
      console.error('Provisioning error:', err);
      return ctx.internalServerError('Failed to provision tenant');
    }
  },

  async resendAdminInvite(ctx) {
    try {
      const { id } = ctx.params;
      
      const tenant = await strapi.db.query('api::tenant.tenant').findOne({
        where: { id }
      });

      if (!tenant) {
        return ctx.notFound('Tenant not found');
      }

      const unconfirmedAdmins = await strapi.db.query('plugin::users-permissions.user').findMany({
        where: { tenant: tenant.id, confirmed: false },
        orderBy: { createdAt: 'asc' },
        limit: 1
      });

      if (!unconfirmedAdmins || unconfirmedAdmins.length === 0) {
        return ctx.badRequest('No unconfirmed admin found for this tenant.');
      }

      const targetUser = unconfirmedAdmins[0];

      const jwtSecret = strapi.config.get('plugin.users-permissions.jwtSecret');
      const jwt = require('jsonwebtoken');
      const confirmationToken = jwt.sign({ id: targetUser.id, type: 'setup' }, jwtSecret, { expiresIn: '24h' });
      
      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: targetUser.id },
        data: { confirmationToken }
      });

      const protocol = ctx.request.header.origin ? ctx.request.header.origin.split('://')[0] : 'https';
      const setupLink = `${protocol}://${tenant.domain}/auth/setup-account?token=${confirmationToken}`;
      
      console.log(`[Email Mock] Resent Setup link for Tenant Admin ${targetUser.email}: ${setupLink}`);
      
      try {
        await strapi.plugin('email').service('email').send({
          to: targetUser.email,
          from: 'no-reply@dbarc.com',
          subject: 'Your DBARc Workspace is Ready - Setup your account',
          text: `Please set up your admin account by clicking this link: ${setupLink}`,
          html: `<p>Please set up your admin account by clicking this link: <a href="${setupLink}">${setupLink}</a></p>`,
        });
      } catch (emailErr) {
        console.error('Failed to send setup email:', emailErr);
      }

      return ctx.send({ message: 'Admin invitation resent successfully' });
    } catch (err) {
      console.error('Resend Invite error:', err);
      return ctx.internalServerError('Failed to resend admin invitation');
    }
  },

  async customFind(ctx) {
    try {
      // Find all tenants (auth is bypassed or set to false in route)
      const entities = await strapi.entityService.findMany('api::tenant.tenant', {
        ...ctx.query,
      }) as any[];
      
      const transformed = await Promise.all(entities.map(async (entity: any) => {
        const { id, ...attributes } = entity;
        // Lookup admin user associated with this tenant
        const adminUser = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { tenant: id },
          orderBy: { id: 'asc' }
        });

        let adminUsername = '';
        let adminEmail = '';
        let adminFullName = '';
        let adminPhone = '';

        if (adminUser) {
          adminUsername = adminUser.username ? adminUser.username.split('#')[0] : '';
          adminEmail = adminUser.email ? adminUser.email.split('#')[0] : '';
          adminFullName = adminUser.fullName || '';
          adminPhone = adminUser.phone || '';
        }

        return {
          id,
          attributes: {
            ...attributes,
            adminUser: adminUser ? {
              id: adminUser.id,
              username: adminUsername,
              email: adminEmail,
              fullName: adminFullName,
              phone: adminPhone,
            } : null,
            adminUsername,
            adminEmail,
            adminFullName,
          }
        };
      }));
      
      return ctx.send({ data: transformed });
    } catch (err) {
      console.error('Failed to find tenants:', err);
      return ctx.internalServerError('Failed to fetch tenants');
    }
  },

  async customUpdate(ctx) {
    try {
      const { id } = ctx.params;
      const targetTenantId = Number(id) || id;
      const {
        name,
        domain,
        plan,
        tenant_plan,
        commissionPct,
        status,
        features,
        address,
        business_name,
        theme_primary_color,
        logo,
        adminUsername,
        adminFullName,
        adminEmail,
        adminPassword,
        adminPhone
      } = ctx.request.body;
      
      const updatePayload: any = {};
      if (name !== undefined) updatePayload.name = name;
      if (domain !== undefined) updatePayload.domain = domain;
      if (plan !== undefined) updatePayload.plan = plan;
      if (commissionPct !== undefined) updatePayload.commissionPct = Number(commissionPct);
      if (status !== undefined) updatePayload.status = status;
      if (features !== undefined) updatePayload.features = features;
      if (address !== undefined) updatePayload.address = address;
      if (business_name !== undefined) updatePayload.business_name = business_name;
      if (theme_primary_color !== undefined) updatePayload.theme_primary_color = theme_primary_color;
      if (logo !== undefined) updatePayload.logo = logo;

      // Safely resolve tenant_plan relation ID
      if (tenant_plan !== undefined) {
        if (tenant_plan && !isNaN(Number(tenant_plan))) {
          updatePayload.tenant_plan = Number(tenant_plan);
        } else if (tenant_plan && typeof tenant_plan === 'string') {
          const matchedPlan = await strapi.db.query('api::tenant-plan.tenant-plan').findOne({
            where: { name: tenant_plan }
          });
          if (matchedPlan) {
            updatePayload.tenant_plan = matchedPlan.id;
          }
        } else if (tenant_plan === null || tenant_plan === '') {
          updatePayload.tenant_plan = null;
        }
      }

      const updated = await strapi.db.query('api::tenant.tenant').update({
        where: { id: targetTenantId },
        data: updatePayload
      });

      // If admin user fields are supplied, update the tenant admin user
      if (adminUsername || adminEmail || adminFullName || adminPassword || adminPhone) {
        const adminUser = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { tenant: targetTenantId },
          orderBy: { id: 'asc' }
        });

        if (adminUser) {
          const userUpdate: any = {};
          if (adminUsername) {
            userUpdate.username = adminUsername.includes('#') ? adminUsername : `${adminUsername}#${targetTenantId}`;
          }
          if (adminEmail) {
            userUpdate.email = adminEmail.includes('#') ? adminEmail : `${adminEmail}#${targetTenantId}`;
          }
          if (adminFullName !== undefined) userUpdate.fullName = adminFullName;
          if (adminPhone !== undefined) userUpdate.phone = adminPhone;
          if (adminPassword && adminPassword.trim()) {
            userUpdate.password = await bcrypt.hash(adminPassword.trim(), 10);
          }

          if (Object.keys(userUpdate).length > 0) {
            await strapi.db.query('plugin::users-permissions.user').update({
              where: { id: adminUser.id },
              data: userUpdate
            });
          }
        }
      }
      
      return ctx.send({ data: updated });
    } catch (err: any) {
      console.error('Failed to update tenant:', err);
      return ctx.badRequest(err.message || 'Failed to update tenant');
    }
  }
}));
