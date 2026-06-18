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
      
      if (confirmationType === 'no_confirmation') {
        if (!adminPassword) {
          return ctx.badRequest('Admin password is required when no confirmation is selected');
        }
        passwordHash = await bcrypt.hash(adminPassword, 10);
        confirmed = true;
      } else {
        // Generate a random password if confirmation is needed (user will reset it)
        passwordHash = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
      }

      // Create Courier Admin User
      const user = await strapi.db.query('plugin::users-permissions.user').create({
        data: {
          email: adminEmail,
          username: adminUsername,
          fullName: adminFullName,
          password: passwordHash,
          tenant: tenant.id,
          role: authenticatedUPRole.id,
          confirmed: confirmed,
          blocked: false,
          provider: 'local',
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
  }
}));
