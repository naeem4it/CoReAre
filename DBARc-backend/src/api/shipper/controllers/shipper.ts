import { factories } from '@strapi/strapi';
import shipperOrderApi from './shipper-order-api';

export default factories.createCoreController('api::shipper.shipper', ({ strapi }) => ({
  createOrder: (ctx) => shipperOrderApi.createOrder(ctx),
  createBulkOrders: (ctx) => shipperOrderApi.createBulkOrders(ctx),
  trackOrder: (ctx) => shipperOrderApi.trackOrder(ctx),
  cancelOrder: (ctx) => shipperOrderApi.cancelOrder(ctx),
  getServiceableCities: (ctx) => shipperOrderApi.getServiceableCities(ctx),
  getProfile: (ctx) => shipperOrderApi.getProfile(ctx),
  getApiKey: (ctx) => shipperOrderApi.getApiKey(ctx),
  generateApiKey: (ctx) => shipperOrderApi.generateApiKey(ctx),
}));



