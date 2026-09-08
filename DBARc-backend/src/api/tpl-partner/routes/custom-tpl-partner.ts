export default {
  routes: [
    {
      method: 'GET',
      path: '/tpl-partner/list',
      handler: 'tpl-partner.customFind',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/tpl-partner/create',
      handler: 'tpl-partner.customCreate',
      config: {
        auth: false,
      },
    },
    {
      method: 'PUT',
      path: '/tpl-partner/update/:id',
      handler: 'tpl-partner.customUpdate',
      config: {
        auth: false,
      },
    },
    {
      method: 'DELETE',
      path: '/tpl-partner/delete/:id',
      handler: 'tpl-partner.customDelete',
      config: {
        auth: false,
      },
    }
  ],
};
