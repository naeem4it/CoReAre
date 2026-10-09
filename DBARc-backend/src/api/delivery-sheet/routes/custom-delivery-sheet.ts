export default {
  routes: [
    {
      method: 'GET',
      path: '/delivery-sheets/riders-summary',
      handler: 'delivery-sheet.getRidersSummary',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/delivery-sheets/:id/close',
      handler: 'delivery-sheet.close',
      config: {
        auth: false,
      },
    },
  ],
};
