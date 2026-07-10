export default {
  routes: [
    {
      method: 'POST',
      path: '/load-sheets/upload',
      handler: 'custom-load-sheet.upload',
      config: {
        auth: false, // In production, this should require auth
      },
    },
  ],
};
