export default {
  routes: [
    {
      method: 'POST',
      path: '/tenant/provision',
      handler: 'tenant.provision',
      config: {
        auth: false, // Determine if auth is needed. Typically tenant creation is protected by a Super Admin token. Let's start with false or role based. Actually, it should be protected, but if we don't have the auth setup clear, we can leave auth: false and do manual token verification, or just auth: false for development if this is an internal admin endpoint. 
      },
    },
    {
      method: 'POST',
      path: '/tenant/:id/resend-admin-invite',
      handler: 'tenant.resendAdminInvite',
      config: {
        auth: false,
      },
    },
    {
      method: 'PUT',
      path: '/tenant/update/:id',
      handler: 'tenant.customUpdate',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/tenant/list',
      handler: 'tenant.customFind',
      config: {
        auth: false,
      },
    },
  ],
};
