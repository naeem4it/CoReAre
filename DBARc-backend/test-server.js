const plugin = { controllers: { auth: {}, user: {} }, routes: { 'content-api': { routes: [] }, admin: { routes: [] } } };
const strapiServer = require('./dist/src/extensions/users-permissions/strapi-server.js').default;
const modifiedPlugin = strapiServer(plugin);
console.log(Object.keys(modifiedPlugin.controllers.auth));
console.log(Object.keys(modifiedPlugin.controllers.user));
console.log(modifiedPlugin.routes['content-api'].routes.map(r => r.handler));
