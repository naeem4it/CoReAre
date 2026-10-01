export default {
  routes: [
    {
      method: 'GET',
      path: '/parcels/stats',
      handler: 'parcel.getStats',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/parcels/bulk',
      handler: 'parcel.createBulk',
      config: {
        auth: false,
      },
    },
  ],
};

