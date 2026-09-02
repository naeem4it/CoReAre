const { createStrapi, compileStrapi } = require('@strapi/strapi');

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  
  try {
    const count = await strapi.db.query('api::parcel.parcel').count();
    console.log('Total parcels count in DB:', count);

    const parcels = await strapi.db.query('api::parcel.parcel').findMany({
      limit: 5,
      populate: ['shipper', 'pickup_location']
    });
    console.log('Sample parcels:', JSON.stringify(parcels, null, 2));

    const shippers = await strapi.db.query('api::shipper.shipper').findMany();
    console.log('Shippers in DB:', JSON.stringify(shippers, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await app.destroy();
    process.exit(0);
  }
}

main();
