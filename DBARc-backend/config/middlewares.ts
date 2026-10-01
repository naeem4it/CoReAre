import type { Core } from '@strapi/strapi';

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: ['*'],
      headers: [
        'Content-Type',
        'Authorization',
        'X-Frame-Options',
        'x-tenant-id',
        'X-Tenant-Id',
        'X-Tenant-ID',
        '*'
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    },
  },
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      jsonLimit: '256mb',
      formLimit: '256mb',
      textLimit: '256mb',
      formidable: {
        maxFileSize: 256 * 1024 * 1024,
      },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  {
    name: 'global::tenant-isolation',
    config: {},
  },
];

export default config;

