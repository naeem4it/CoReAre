export default {
  routes: [
    {
      method: 'GET',
      path: '/shipper-plan/list',
      handler: 'shipper-plan.customFind',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/shipper-plans',
      handler: 'shipper-plan.customFind',
      config: {
        auth: false,
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
      method: 'POST',
      path: '/shipper-plans',
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
      method: 'PUT',
      path: '/shipper-plans/:id',
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
    {
      method: 'DELETE',
      path: '/shipper-plans/:id',
      handler: 'shipper-plan.customDelete',
      config: {
        auth: false,
      },
    },
  ],
};
