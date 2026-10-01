import type { Core } from '@strapi/strapi';

const config: Core.Config.Api = {
  rest: {
    defaultLimit: 25,
    maxLimit: 50000,
    withCount: true,
  },
  documents: {
    strictParams: true,
  },
};

export default config;
