export default {
  routes: [
    {
      method: 'GET',
      path: '/shipper-plan/list',
      handler: 'shipper-plan.customFind',
      config: {
        auth: false, // In production, add appropriate policies/auth
      },
    },
    {
      method: 'POST',
      path: '/shipper-plan/create',
      handler: 'shipper-plan.customCreate',
      config: {
        auth: false,
      },
    },
    {
      method: 'PUT',
      path: '/shipper-plan/update/:id',
      handler: 'shipper-plan.customUpdate',
      config: {
        auth: false,
      },
    },
    {
      method: 'DELETE',
      path: '/shipper-plan/delete/:id',
      handler: 'shipper-plan.customDelete',
      config: {
        auth: false,
      },
    },
  ],
};
