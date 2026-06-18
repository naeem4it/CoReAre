const { createStrapi, compileStrapi } = require('@strapi/strapi');

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  
  try {
    const users = await strapi.db.query('plugin::users-permissions.user').findMany({
      populate: ['role_definition', 'shipper', 'role']
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await app.destroy();
    process.exit(0);
  }
}

main();
