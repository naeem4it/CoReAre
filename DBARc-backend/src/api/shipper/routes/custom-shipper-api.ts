export default {
  routes: [
    // 1. Single Order Booking
    {
      method: 'POST',
      path: '/v1/shipper/orders/create',
      handler: 'shipper.createOrder',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/shipper/orders',
      handler: 'shipper.createOrder',
      config: {
        auth: false,
      },
    },

    // 2. Bulk Orders Booking
    {
      method: 'POST',
      path: '/v1/shipper/orders/bulk',
      handler: 'shipper.createBulkOrders',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/shipper/orders/bulk',
      handler: 'shipper.createBulkOrders',
      config: {
        auth: false,
      },
    },

    // 3. Live Tracking
    {
      method: 'GET',
      path: '/v1/shipper/orders/track/:tracking_number',
      handler: 'shipper.trackOrder',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/shipper/orders/track/:tracking_number',
      handler: 'shipper.trackOrder',
      config: {
        auth: false,
      },
    },

    // 4. Cancel Order
    {
      method: 'POST',
      path: '/v1/shipper/orders/cancel',
      handler: 'shipper.cancelOrder',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/shipper/orders/cancel',
      handler: 'shipper.cancelOrder',
      config: {
        auth: false,
      },
    },

    // 5. Serviceable Cities Directory
    {
      method: 'GET',
      path: '/v1/shipper/cities',
      handler: 'shipper.getServiceableCities',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/shipper/cities',
      handler: 'shipper.getServiceableCities',
      config: {
        auth: false,
      },
    },

    // 6. Shipper Profile & Account Details (Shipper ID, Tenant ID)
    {
      method: 'GET',
      path: '/v1/shipper/profile',
      handler: 'shipper.getProfile',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/shipper/profile',
      handler: 'shipper.getProfile',
      config: {
        auth: false,
      },
    },

    // 7. API Key Lookup & Generation
    {
      method: 'GET',
      path: '/v1/shipper/api-key',
      handler: 'shipper.getApiKey',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/shipper/api-key',
      handler: 'shipper.getApiKey',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/v1/shipper/api-key/generate',
      handler: 'shipper.generateApiKey',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/shipper/api-key/generate',
      handler: 'shipper.generateApiKey',
      config: {
        auth: false,
      },
    },
  ],
};



