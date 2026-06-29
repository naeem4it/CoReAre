export default {
  routes: [
    {
      method: 'GET',
      path: '/tenant-plan/list',
      handler: 'tenant-plan.customFind',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/tenant-plan/create',
      handler: 'tenant-plan.customCreate',
      config: {
        auth: false,
      },
    },
    {
      method: 'PUT',
      path: '/tenant-plan/update/:id',
      handler: 'tenant-plan.customUpdate',
      config: {
        auth: false,
      },
    },
    {
      method: 'DELETE',
      path: '/tenant-plan/delete/:id',
      handler: 'tenant-plan.customDelete',
      config: {
        auth: false,
      },
    }
  ],
};
