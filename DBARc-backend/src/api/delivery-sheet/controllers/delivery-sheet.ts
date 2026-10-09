import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::delivery-sheet.delivery-sheet', ({ strapi }) => ({
  async findOne(ctx) {
    const { id } = ctx.params;
    let targetDocId = id;

    if (!isNaN(Number(id))) {
      const found = await strapi.db.query('api::delivery-sheet.delivery-sheet').findOne({
        where: { id: Number(id) }
      });
      if (found?.documentId) {
        targetDocId = found.documentId;
      }
    }

    ctx.params.id = targetDocId;
    return super.findOne(ctx);
  },

  async update(ctx) {
    const { id } = ctx.params;
    let targetDocId = id;

    if (!isNaN(Number(id))) {
      const found = await strapi.db.query('api::delivery-sheet.delivery-sheet').findOne({
        where: { id: Number(id) }
      });
      if (found?.documentId) {
        targetDocId = found.documentId;
      }
    }

    ctx.params.id = targetDocId;
    return super.update(ctx);
  },

  async delete(ctx) {
    const { id } = ctx.params;
    let targetDocId = id;

    if (!isNaN(Number(id))) {
      const found = await strapi.db.query('api::delivery-sheet.delivery-sheet').findOne({
        where: { id: Number(id) }
      });
      if (found?.documentId) {
        targetDocId = found.documentId;
      }
    }

    ctx.params.id = targetDocId;
    return super.delete(ctx);
  },

  /**
   * GET /api/delivery-sheets/riders-summary
   * Returns list of riders with their current unclosed delivery sheets and running balances
   */
  async getRidersSummary(ctx) {
    try {
      const riders = await strapi.db.query('api::rider.rider').findMany({
        where: { status: 'active' },
        populate: ['office']
      });

      // Fetch all open delivery sheets to compute open sheets and pending receivable per rider
      const openSheets = await strapi.db.query('api::delivery-sheet.delivery-sheet').findMany({
        where: {
          status: { $ne: 'Completed' }
        },
        populate: ['rider', 'parcels']
      });

      const result = riders.map((r: any) => {
        const riderSheets = openSheets.filter((s: any) => s.rider?.id === r.id);
        
        // Calculate COD amount from parcels in open sheets
        let openSheetsCod = 0;
        riderSheets.forEach((s: any) => {
          (s.parcels || []).forEach((p: any) => {
            const st = String(p.status || '').toLowerCase();
            if (st === 'delivered' || st === 'out for delivery') {
              openSheetsCod += Number(p.cod_amount) || 0;
            }
          });
        });

        const storedBalance = Number(r.pending_balance) || 0;
        const totalPendingBalance = storedBalance > 0 ? storedBalance : openSheetsCod;

        return {
          id: r.id,
          documentId: r.documentId,
          name: r.name,
          phone: r.phone || '',
          rider_code: r.rider_code || `RDR-${r.id}`,
          area: r.office?.name || 'Main Zone',
          pendingBalance: totalPendingBalance,
          openSheetsCount: riderSheets.length,
          openSheetIds: riderSheets.map((s: any) => s.id)
        };
      });

      return ctx.send({ success: true, data: result });
    } catch (err: any) {
      strapi.log.error('getRidersSummary error:', err);
      return ctx.badRequest(err.message || 'Failed to fetch riders summary');
    }
  },

  /**
   * POST /api/delivery-sheets/:id/close
   * Atomic Rider Closing Endpoint:
   * Updates parcels, marks sheet Completed, records financial settlement, updates rider balance.
   */
  async close(ctx) {
    try {
      const { id } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body || {};
      const {
        cashHandedOver = 0,
        cashDepositAccount = 'Main Cash Drawer',
        transferredOnline = 0,
        onlineDepositAccount = '',
        pendingAmount = 0,
        pendingReason = '',
        parcels = [], // Array of { id, outcome, reason }
        closedBy = 'Dispatcher'
      } = body;

      // 1. Locate delivery sheet
      const foundSheet = await strapi.db.query('api::delivery-sheet.delivery-sheet').findOne({
        where: {
          $or: [
            { id: isNaN(Number(id)) ? -1 : Number(id) },
            { documentId: String(id) },
            { sheet_number: String(id) }
          ]
        },
        populate: ['rider', 'parcels', 'tenant']
      });

      if (!foundSheet) {
        return ctx.notFound(`Delivery sheet "${id}" not found.`);
      }

      // 2. Process and update each parcel
      let deliveredCount = 0;
      let returnCount = 0;
      let deliveredCodTotal = 0;

      const parcelMap = new Map<string, { outcome: string; reason: string }>();
      (parcels || []).forEach((p: any) => {
        parcelMap.set(String(p.id), { outcome: p.outcome || 'Delivered', reason: p.reason || '' });
        if (p.trackingNumber) {
          parcelMap.set(String(p.trackingNumber), { outcome: p.outcome || 'Delivered', reason: p.reason || '' });
        }
      });

      const sheetParcels = foundSheet.parcels || [];
      for (const p of sheetParcels) {
        const pInput = parcelMap.get(String(p.id)) || parcelMap.get(String(p.tracking_number)) || {
          outcome: String(p.status).toLowerCase() === 'delivered' ? 'Delivered' : 'Ready to return',
          reason: ''
        };

        const isDelivered = pInput.outcome === 'Delivered';
        const codVal = Number(p.cod_amount) || 0;

        let newStatus = p.status;
        let updateData: Record<string, any> = {};

        if (isDelivered) {
          deliveredCount++;
          deliveredCodTotal += codVal;
          newStatus = 'Delivered';
          updateData = {
            status: 'Delivered',
            delivered_date: new Date(),
            settlement_status: 'Pending' // Ready for merchant invoicing
          };
        } else {
          returnCount++;
          const outcomeLower = pInput.outcome.toLowerCase();
          if (outcomeLower.includes('return') || outcomeLower.includes('refused')) {
            newStatus = 'Ready To Return';
          } else if (outcomeLower.includes('attempt')) {
            newStatus = 'Failed Attempt';
          } else {
            newStatus = 'Ready To Return';
          }

          updateData = {
            status: newStatus,
            comments: pInput.reason ? `Closing: ${pInput.reason}` : (p.comments || 'Non-delivered during closing')
          };

          // Record delivery attempt if not delivered
          try {
            await strapi.db.query('api::delivery-attempt.delivery-attempt').create({
              data: {
                parcel: p.id,
                rider: foundSheet.rider?.id || null,
                attempt_time: new Date(),
                status: pInput.outcome,
                failure_reason: pInput.reason || pInput.outcome,
                advice_status: 'Awaiting advice'
              }
            });
          } catch (attErr) {
            strapi.log.warn('Attempt creation log skipped:', attErr);
          }
        }

        // Apply parcel update in DB
        await strapi.db.query('api::parcel.parcel').update({
          where: { id: p.id },
          data: updateData
        });
      }

      // 3. Update Delivery Sheet
      const updatedSheet = await strapi.db.query('api::delivery-sheet.delivery-sheet').update({
        where: { id: foundSheet.id },
        data: {
          status: 'Completed',
          collection_amount: deliveredCodTotal,
          delivered_count: deliveredCount,
          return_count: returnCount,
          cash_collected: Number(cashHandedOver) || 0,
          cash_deposit_account: String(cashDepositAccount || ''),
          online_collected: Number(transferredOnline) || 0,
          online_deposit_account: String(onlineDepositAccount || ''),
          rider_shortage_pending: Number(pendingAmount) || 0,
          shortage_reason: String(pendingReason || ''),
          closed_at: new Date(),
          closed_by: String(closedBy || 'Dispatcher')
        }
      });

      // 4. Update Rider's running pending balance
      if (foundSheet.rider?.id) {
        const riderId = foundSheet.rider.id;
        const currentRider = await strapi.db.query('api::rider.rider').findOne({
          where: { id: riderId }
        });

        if (currentRider) {
          const currentBal = Number(currentRider.pending_balance) || 0;
          // Any shortage on this sheet remains on the rider as outstanding
          const newBalance = Math.max(0, currentBal + (Number(pendingAmount) || 0));
          await strapi.db.query('api::rider.rider').update({
            where: { id: riderId },
            data: { pending_balance: newBalance }
          });
        }
      }

      // 5. Generate settlement voucher reference
      const voucherNo = `RC-${foundSheet.sheet_number || foundSheet.id}-${Date.now().toString().slice(-4)}`;

      // Return comprehensive response
      return ctx.send({
        success: true,
        message: `Rider closing for ${foundSheet.sheet_number} completed successfully.`,
        voucherNumber: voucherNo,
        data: {
          sheetId: foundSheet.id,
          sheetNumber: foundSheet.sheet_number,
          status: 'Completed',
          deliveredCount,
          returnCount,
          deliveredCodTotal,
          cashHandedOver: Number(cashHandedOver) || 0,
          transferredOnline: Number(transferredOnline) || 0,
          pendingAmount: Number(pendingAmount) || 0,
          closedAt: new Date()
        }
      });
    } catch (err: any) {
      strapi.log.error('Rider closing error:', err);
      return ctx.badRequest(err.message || 'Failed to save rider closing');
    }
  }
}));
