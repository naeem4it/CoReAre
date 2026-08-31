/**
 * DBARc Automated Background Tasks
 * - Shipper Advise 48-Hour SLA Expiration & Auto-Return
 */

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export default {
  /**
   * Run every hour on the hour to enforce 48h Shipper Advise SLA
   */
  '0 * * * *': async ({ strapi }: { strapi: any }) => {
    try {
      console.log('[Cron] Checking 48h Shipper Advise SLA expiries...');
      const cutoffDate = new Date(Date.now() - FORTY_EIGHT_HOURS_MS);

      // Find all pending delivery attempts created before the cutoff date
      const expiredAttempts = await strapi.db.query('api::delivery-attempt.delivery-attempt').findMany({
        where: {
          advice_status: 'Awaiting advice',
          createdAt: { $lt: cutoffDate },
        },
        populate: ['parcel'],
      });

      if (!expiredAttempts || expiredAttempts.length === 0) {
        console.log('[Cron] No expired shipper advise attempts found.');
        return;
      }

      console.log(`[Cron] Found ${expiredAttempts.length} expired shipper advise attempts. Processing auto-RTO...`);

      for (const attempt of expiredAttempts) {
        try {
          // 1. Update delivery attempt
          await strapi.db.query('api::delivery-attempt.delivery-attempt').update({
            where: { id: attempt.id },
            data: {
              advice_status: 'Failed',
              shipper_advice: 'Auto Return: 48h Shipper Advise SLA expired without response.',
            },
          });

          // 2. Transition parcel to Ready To Return
          if (attempt.parcel && attempt.parcel.id) {
            await strapi.db.query('api::parcel.parcel').update({
              where: { id: attempt.parcel.id },
              data: {
                status: 'Ready To Return',
                comments: `Auto RTO: 48-hour Shipper Advise window expired on ${new Date().toISOString()}`,
              },
            });
            console.log(`[Cron] Parcel ID ${attempt.parcel.id} automatically transitioned to Ready To Return.`);
          }
        } catch (itemErr) {
          console.error(`[Cron] Error processing attempt ID ${attempt.id}:`, itemErr);
        }
      }

      console.log('[Cron] Shipper Advise SLA processing completed.');
    } catch (err) {
      console.error('[Cron] Error in Shipper Advise cron job:', err);
    }
  },
};
