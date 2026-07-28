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
  ],
};
