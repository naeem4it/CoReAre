import { Context } from 'koa';

// Helper to authenticate shipper via API Key
async function authenticateShipper(ctx: Context, strapi: any) {
  const apiKey = 
    ctx.request.headers['x-api-key'] ||
    ctx.request.headers['x-api-token'] ||
    ctx.request.headers['api-key'] ||
    (ctx.request.headers['authorization']?.startsWith('Bearer ') 
      ? ctx.request.headers['authorization'].replace('Bearer ', '').trim() 
      : null) ||
    (ctx.request.body as any)?.api_key ||
    (ctx.request.body as any)?.apiKey ||
    (ctx.query as any)?.api_key ||
    (ctx.query as any)?.apiKey;

  if (!apiKey || typeof apiKey !== 'string') {
    return {
      authenticated: false,
      error: 'Missing API Key. Please provide your API Key via the "x-api-key" HTTP header or "api_key" parameter.',
      status: 401,
      shipper: null,
    };
  }

  const shipper = await strapi.db.query('api::shipper.shipper').findOne({
    where: { 
      api_key: apiKey.trim(),
      status: 'active'
    },
    populate: ['tenant', 'couriers', 'shipper_plan', 'pickup_locations']
  });

  if (!shipper) {
    return {
      authenticated: false,
      error: 'Invalid or inactive Shipper API Key.',
      status: 403,
      shipper: null,
    };
  }

  return {
    authenticated: true,
    error: null,
    status: 200,
    shipper,
  };
}

// Generate unique tracking number
async function generateUniqueTrackingNumber(strapi: any): Promise<string> {
  let isUnique = false;
  let trackingNumber = '';
  
  while (!isUnique) {
    const timestampPart = Date.now().toString().slice(-6);
    const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
    trackingNumber = `DBA${timestampPart}${randomPart}`;

    const existing = await strapi.db.query('api::parcel.parcel').findOne({
      where: { tracking_number: trackingNumber }
    });

    if (!existing) {
      isUnique = true;
    }
  }

  return trackingNumber;
}

// Helper to resolve city relation
async function resolveCity(strapi: any, cityInput: any): Promise<any> {
  if (!cityInput) return null;

  // If already an ID
  if (typeof cityInput === 'number' || (!isNaN(Number(cityInput)) && Number(cityInput) > 0)) {
    const foundById = await strapi.db.query('api::city.city').findOne({
      where: { id: Number(cityInput) }
    });
    if (foundById) return foundById;
  }

  // If string name (e.g. "Lahore", "Karachi", "Islamabad")
  if (typeof cityInput === 'string' && cityInput.trim()) {
    const cleanName = cityInput.trim();
    
    // Case-insensitive match
    const foundByName = await strapi.db.query('api::city.city').findOne({
      where: {
        CityName: {
          $eqi: cleanName
        }
      }
    });
    if (foundByName) return foundByName;

    // Substring match fallback
    const foundByContains = await strapi.db.query('api::city.city').findOne({
      where: {
        CityName: {
          $containsi: cleanName
        }
      }
    });
    if (foundByContains) return foundByContains;
  }

  return null;
}

export default {
  /**
   * POST /api/v1/shipper/orders/create
   * Single order booking from e-commerce store
   */
  async createOrder(ctx: Context) {
    const auth = await authenticateShipper(ctx, strapi);
    if (!auth.authenticated || !auth.shipper) {
      return ctx.badRequest(auth.error || 'Authentication failed', { status: auth.status });
    }

    const shipper = auth.shipper;
    const body = (ctx.request.body as any) || {};

    // Standardize incoming field names (supports Shopify, WooCommerce, Magento, custom REST webhooks)
    const recipientName = body.recipient_name || body.customer_name || body.consignee_name || body.name;
    const recipientPhone = body.recipient_phone || body.customer_phone || body.consignee_phone || body.phone;
    const recipientAddress = body.recipient_address || body.shipping_address || body.consignee_address || body.address;
    const destinationCityInput = body.destination_city || body.city || body.shipping_city;
    const recipientEmail = body.recipient_email || body.customer_email || body.consignee_email || body.email;
    const recipientAltPhone = body.recipient_alt_phone || body.alt_phone || body.secondary_phone;

    const orderRef = body.order_reference || body.order_id || body.reference_number || body.order_number;
    const codAmount = Number(body.cod_amount !== undefined ? body.cod_amount : body.total_price || body.amount || 0);
    const weight = Number(body.weight || body.weight_kg || 0.5);
    const pieces = Number(body.pieces || body.quantity || body.items_count || 1);
    const serviceType = body.service_type || 'Overnight';
    const shipmentType = body.shipment_type || 'Parcel';
    const allowToOpen = body.allow_to_open === true || body.allow_to_open === 'Yes' || body.allow_open === true ? 'Yes' : 'No';
    const comments = body.comments || body.instructions || body.product_description || body.item_description || body.note;

    // Validation
    if (!recipientName || !recipientPhone || !recipientAddress || !destinationCityInput) {
      return ctx.badRequest('Missing required order fields: recipient_name, recipient_phone, recipient_address, and destination_city are mandatory.');
    }

    // 1. Resolve Destination City
    let destinationCity = await resolveCity(strapi, destinationCityInput);
    if (!destinationCity) {
      // If city not found, attempt to find a fallback city or create it
      destinationCity = await strapi.db.query('api::city.city').findOne({
        where: { Active: true }
      });
    }

    // 2. Resolve Pickup Location & Source City
    let pickupLocationId = body.pickup_location_id || body.pickupLocationId;
    let pickupLoc: any = null;

    if (pickupLocationId) {
      pickupLoc = await strapi.db.query('api::pickup-location.pickup-location').findOne({
        where: { id: Number(pickupLocationId), shipper: shipper.id },
        populate: ['city']
      });
    }

    if (!pickupLoc && shipper.pickup_locations && shipper.pickup_locations.length > 0) {
      pickupLoc = await strapi.db.query('api::pickup-location.pickup-location').findOne({
        where: { id: shipper.pickup_locations[0].id },
        populate: ['city']
      });
    }

    const sourceCityId = pickupLoc?.city?.id || destinationCity?.id || null;

    // 3. Compute Estimated Delivery Charges
    let deliveryCharges = 160;
    if (weight > 0.5) {
      deliveryCharges = Math.round(160 + (weight - 0.5) * 120);
    }

    // 4. Determine 3PL routing status
    let is3pl = false;
    const defaultCourier = (shipper.couriers && shipper.couriers.length > 0) ? shipper.couriers[0] : null;

    if (destinationCity && defaultCourier) {
      const regionCoverage = await strapi.db.query('api::region.region').findMany({
        where: {
          courier: defaultCourier.id,
          active: true,
          cities: { id: destinationCity.id }
        }
      });
      if (regionCoverage.length === 0) {
        is3pl = true;
      }
    }

    // 5. Generate Tracking Number
    const trackingNumber = await generateUniqueTrackingNumber(strapi);

    // 6. Persist Parcel Entity
    try {
      const createdParcel = await strapi.entityService.create('api::parcel.parcel', {
        data: {
          tracking_number: trackingNumber,
          reference_number: orderRef ? String(orderRef) : null,
          recipient_name: String(recipientName).trim(),
          recipient_phone: String(recipientPhone).trim(),
          recipient_address: String(recipientAddress).trim(),
          consignee_email: recipientEmail ? String(recipientEmail).trim() : null,
          consignee_alt_phone: recipientAltPhone ? String(recipientAltPhone).trim() : null,
          destination_city: destinationCity ? destinationCity.id : null,
          source_city: sourceCityId,
          cod_amount: codAmount,
          weight: weight,
          delivery_charges: deliveryCharges,
          pieces: pieces,
          service_type: serviceType,
          shipment_type: shipmentType,
          allow_to_open: allowToOpen,
          comments: comments ? String(comments) : null,
          status: 'Total Booking',
          is_3pl: is3pl,
          shipper: shipper.id,
          pickup_location: pickupLoc?.id || null,
          courier: defaultCourier ? defaultCourier.id : null,
          tenant: shipper.tenant?.id || null,
        } as any
      });

      return ctx.send({
        status: 'success',
        message: 'Order booked successfully',
        data: {
          id: createdParcel.id,
          tracking_number: trackingNumber,
          order_id: orderRef || null,
          order_reference: orderRef || null,
          shipper_id: shipper.id,
          shipper_name: shipper.name,
          account_id: shipper.account_id || null,
          tenant_id: shipper.tenant?.id || null,
          tenant_name: shipper.tenant?.name || null,
          status: 'Total Booking',
          cod_amount: codAmount,
          weight: weight,
          pieces: pieces,
          recipient: {
            name: recipientName,
            phone: recipientPhone,
            address: recipientAddress,
            city: destinationCity?.CityName || destinationCityInput,
            email: recipientEmail || null,
          },
          destination_city: destinationCity?.CityName || destinationCityInput,
          pickup_location: pickupLoc?.location_name || 'Primary Warehouse',
          pickup_location_id: pickupLoc?.id || null,
          is_3pl: is3pl,
          delivery_charges_estimate: deliveryCharges,
          booking_date: new Date().toISOString(),
          tracking_url: `https://track.coreare.com/tracking/${trackingNumber}`,
          label_url: `/api/parcels/print/${trackingNumber}`,
        }
      });
    } catch (err: any) {
      strapi.log.error('Failed to create shipper order:', err);
      return ctx.badRequest(`Failed to book order: ${err.message || 'Internal database error'}`);
    }
  },


  /**
   * POST /api/v1/shipper/orders/bulk
   * Bulk order booking for e-commerce stores dispatching batches
   */
  async createBulkOrders(ctx: Context) {
    const auth = await authenticateShipper(ctx, strapi);
    if (!auth.authenticated || !auth.shipper) {
      return ctx.badRequest(auth.error || 'Authentication failed', { status: auth.status });
    }

    const shipper = auth.shipper;
    const body = (ctx.request.body as any) || {};
    const orders = Array.isArray(body.orders) ? body.orders : (Array.isArray(body) ? body : []);

    if (orders.length === 0) {
      return ctx.badRequest('Please provide an array of orders in the "orders" payload field.');
    }

    if (orders.length > 200) {
      return ctx.badRequest('Bulk booking limit exceeded. Maximum 200 orders allowed per request.');
    }

    const results = {
      total_received: orders.length,
      successful_count: 0,
      failed_count: 0,
      successful_orders: [] as any[],
      failed_orders: [] as any[],
    };

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      try {
        const recipientName = order.recipient_name || order.customer_name || order.consignee_name || order.name;
        const recipientPhone = order.recipient_phone || order.customer_phone || order.consignee_phone || order.phone;
        const recipientAddress = order.recipient_address || order.shipping_address || order.consignee_address || order.address;
        const destinationCityInput = order.destination_city || order.city || order.shipping_city;
        const orderRef = order.order_reference || order.order_id || order.reference_number || `ORDER-${i + 1}`;

        if (!recipientName || !recipientPhone || !recipientAddress || !destinationCityInput) {
          results.failed_count++;
          results.failed_orders.push({
            order_index: i,
            order_reference: orderRef,
            error: 'Missing required fields (name, phone, address, or destination city)',
          });
          continue;
        }

        const destinationCity = await resolveCity(strapi, destinationCityInput);
        const trackingNumber = await generateUniqueTrackingNumber(strapi);
        const codAmount = Number(order.cod_amount !== undefined ? order.cod_amount : order.total_price || 0);
        const weight = Number(order.weight || 0.5);

        const created = await strapi.entityService.create('api::parcel.parcel', {
          data: {
            tracking_number: trackingNumber,
            reference_number: orderRef ? String(orderRef) : null,
            recipient_name: String(recipientName).trim(),
            recipient_phone: String(recipientPhone).trim(),
            recipient_address: String(recipientAddress).trim(),
            consignee_email: order.recipient_email || null,
            destination_city: destinationCity ? destinationCity.id : null,
            cod_amount: codAmount,
            weight: weight,
            delivery_charges: 160,
            pieces: Number(order.pieces || 1),
            service_type: order.service_type || 'Overnight',
            status: 'Total Booking',
            allow_to_open: order.allow_to_open === true || order.allow_to_open === 'Yes' ? 'Yes' : 'No',
            comments: order.comments || null,
            shipper: shipper.id,
            tenant: shipper.tenant?.id || null,
          } as any
        });

        results.successful_count++;
        results.successful_orders.push({
          id: created.id,
          tracking_number: trackingNumber,
          order_reference: orderRef,
          status: 'Total Booking',
          destination_city: destinationCity?.CityName || destinationCityInput,
          cod_amount: codAmount,
        });
      } catch (orderErr: any) {
        results.failed_count++;
        results.failed_orders.push({
          order_index: i,
          order_reference: order.order_reference || order.order_id || null,
          error: orderErr.message || 'Error creating parcel',
        });
      }
    }

    return ctx.send({
      status: 'completed',
      summary: results,
    });
  },

  /**
   * GET /api/v1/shipper/orders/track/:tracking_number
   * Live real-time parcel tracking for merchant store order updates
   */
  async trackOrder(ctx: Context) {
    const auth = await authenticateShipper(ctx, strapi);
    if (!auth.authenticated || !auth.shipper) {
      return ctx.badRequest(auth.error || 'Authentication failed', { status: auth.status });
    }

    const { tracking_number } = ctx.params;
    if (!tracking_number) {
      return ctx.badRequest('Please provide a tracking number in the URL parameter.');
    }

    const parcel = await strapi.db.query('api::parcel.parcel').findOne({
      where: {
        tracking_number: tracking_number.trim(),
        shipper: auth.shipper.id
      },
      populate: ['destination_city', 'source_city', 'courier']
    });

    if (!parcel) {
      return ctx.notFound(`No shipment found matching tracking number "${tracking_number}" for your merchant account.`);
    }

    return ctx.send({
      status: 'success',
      data: {
        tracking_number: parcel.tracking_number,
        order_reference: parcel.reference_number || null,
        current_status: parcel.status,
        recipient_name: parcel.recipient_name,
        recipient_phone: parcel.recipient_phone,
        destination_city: parcel.destination_city?.CityName || 'N/A',
        cod_amount: parcel.cod_amount,
        weight: parcel.weight,
        is_3pl: parcel.is_3pl || false,
        booking_date: parcel.createdAt,
        arrival_date: parcel.arrival_date || null,
        delivered_date: parcel.delivered_date || null,
        courier: parcel.courier?.name || 'DBARc Express',
        comments: parcel.comments || null,
      }
    });
  },

  /**
   * POST /api/v1/shipper/orders/cancel
   * Cancel an un-dispatched booking from store
   */
  async cancelOrder(ctx: Context) {
    const auth = await authenticateShipper(ctx, strapi);
    if (!auth.authenticated || !auth.shipper) {
      return ctx.badRequest(auth.error || 'Authentication failed', { status: auth.status });
    }

    const body = (ctx.request.body as any) || {};
    const trackingNumber = body.tracking_number || body.trackingNumber;
    const orderRef = body.order_reference || body.order_id;
    const reason = body.reason || 'Cancelled by merchant';

    if (!trackingNumber && !orderRef) {
      return ctx.badRequest('Please provide either tracking_number or order_reference to cancel.');
    }

    let whereClause: any = { shipper: auth.shipper.id };
    if (trackingNumber) {
      whereClause.tracking_number = trackingNumber.trim();
    } else if (orderRef) {
      whereClause.reference_number = String(orderRef).trim();
    }

    const parcel = await strapi.db.query('api::parcel.parcel').findOne({
      where: whereClause
    });

    if (!parcel) {
      return ctx.notFound('Order not found under your merchant account.');
    }

    // Only allow cancellation if order hasn't departed/delivered
    const nonCancellableStatuses = ['Arrived At Destination', 'Out For delivery', 'Delivered', 'Ready To Return', 'Return Dispatched'];
    if (nonCancellableStatuses.includes(parcel.status)) {
      return ctx.badRequest(`Cannot cancel order. Shipment has already progressed to status "${parcel.status}".`);
    }

    await strapi.entityService.update('api::parcel.parcel', parcel.id, {
      data: {
        status: 'Cancelled',
        comments: parcel.comments ? `${parcel.comments} | Cancel Reason: ${reason}` : `Cancel Reason: ${reason}`,
      } as any
    });

    return ctx.send({
      status: 'success',
      message: `Order ${parcel.tracking_number} has been cancelled successfully.`,
      data: {
        tracking_number: parcel.tracking_number,
        order_reference: parcel.reference_number,
        previous_status: parcel.status,
        current_status: 'Cancelled',
        cancelled_at: new Date().toISOString(),
      }
    });
  },

  /**
   * GET /api/v1/shipper/cities
   * List available cities for checkout address dropdowns
   */
  async getServiceableCities(ctx: Context) {
    const auth = await authenticateShipper(ctx, strapi);
    if (!auth.authenticated || !auth.shipper) {
      return ctx.badRequest(auth.error || 'Authentication failed', { status: auth.status });
    }

    const cities = await strapi.db.query('api::city.city').findMany({
      where: { Active: true },
      orderBy: { CityName: 'asc' }
    });

    return ctx.send({
      status: 'success',
      total: cities.length,
      data: cities.map((c: any) => ({
        id: c.id,
        name: c.CityName,
        code: c.CityName?.substring(0, 3)?.toUpperCase() || '',
      }))
    });
  },

  /**
   * GET /api/v1/shipper/profile
   * Returns Shipper ID, Tenant ID, Account ID, and business details for WP / WooCommerce plugin setup
   */
  async getProfile(ctx: Context) {
    const auth = await authenticateShipper(ctx, strapi);
    if (!auth.authenticated || !auth.shipper) {
      return ctx.badRequest(auth.error || 'Authentication failed', { status: auth.status });
    }

    const shipper = auth.shipper;

    return ctx.send({
      status: 'success',
      data: {
        shipper_id: shipper.id,
        tenant_id: shipper.tenant?.id || null,
        tenant_name: shipper.tenant?.name || 'Main Tenant',
        account_id: shipper.account_id || null,
        business_name: shipper.name,
        business_type: shipper.business_type || 'E-commerce',
        status: shipper.status,
        api_key: shipper.api_key,
        webhook_url: shipper.webhook_url || null,
        pickup_locations: (shipper.pickup_locations || []).map((loc: any) => ({
          id: loc.id,
          location_name: loc.location_name,
          address: loc.address,
          phone: loc.phone,
        })),
      }
    });
  },

  /**
   * GET /api/v1/shipper/api-key
   * Retrieve or auto-generate API Key by Shipper ID or Account ID
   */
  async getApiKey(ctx: Context) {
    const shipperId = ctx.query.shipper_id || ctx.query.shipperId || ctx.query.id;
    const accountId = ctx.query.account_id || ctx.query.accountId;

    let whereClause: any = {};
    if (shipperId) {
      whereClause.id = Number(shipperId);
    } else if (accountId) {
      whereClause.account_id = String(accountId).trim();
    } else {
      // Check if authenticated with existing API Key or Bearer Token
      const auth = await authenticateShipper(ctx, strapi);
      if (auth.authenticated && auth.shipper) {
        whereClause.id = auth.shipper.id;
      } else {
        return ctx.badRequest('Please specify shipper_id or account_id parameter (e.g. /api/v1/shipper/api-key?shipper_id=12)');
      }
    }

    let shipper = await strapi.db.query('api::shipper.shipper').findOne({
      where: whereClause,
      populate: ['tenant']
    });

    if (!shipper) {
      return ctx.notFound('Shipper merchant record not found.');
    }

    // Auto-generate if missing
    if (!shipper.api_key) {
      const newKey = `dba_live_shipper_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
      await strapi.entityService.update('api::shipper.shipper', shipper.id, {
        data: { api_key: newKey } as any
      });
      shipper.api_key = newKey;
    }

    return ctx.send({
      status: 'success',
      data: {
        shipper_id: shipper.id,
        shipper_name: shipper.name,
        account_id: shipper.account_id || null,
        tenant_id: shipper.tenant?.id || null,
        api_key: shipper.api_key,
        status: shipper.status,
      }
    });
  },

  /**
   * POST /api/v1/shipper/api-key/generate
   * Generate or rotate a new secret API Key for a shipper
   */
  async generateApiKey(ctx: Context) {
    const body = (ctx.request.body as any) || {};
    const shipperId = body.shipper_id || body.shipperId || ctx.query.shipper_id;
    const accountId = body.account_id || body.accountId || ctx.query.account_id;

    let whereClause: any = {};
    if (shipperId) {
      whereClause.id = Number(shipperId);
    } else if (accountId) {
      whereClause.account_id = String(accountId).trim();
    } else {
      const auth = await authenticateShipper(ctx, strapi);
      if (auth.authenticated && auth.shipper) {
        whereClause.id = auth.shipper.id;
      } else {
        return ctx.badRequest('Please provide shipper_id or account_id in the request body.');
      }
    }

    const shipper = await strapi.db.query('api::shipper.shipper').findOne({
      where: whereClause,
      populate: ['tenant']
    });

    if (!shipper) {
      return ctx.notFound('Shipper merchant record not found.');
    }

    const newApiKey = `dba_live_shipper_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
    await strapi.entityService.update('api::shipper.shipper', shipper.id, {
      data: { api_key: newApiKey } as any
    });

    return ctx.send({
      status: 'success',
      message: 'New API Key generated successfully. Please update your e-commerce store settings.',
      data: {
        shipper_id: shipper.id,
        shipper_name: shipper.name,
        account_id: shipper.account_id || null,
        tenant_id: shipper.tenant?.id || null,
        api_key: newApiKey,
        created_at: new Date().toISOString(),
      }
    });
  }
};


