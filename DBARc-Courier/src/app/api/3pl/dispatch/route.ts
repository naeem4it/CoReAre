import { NextRequest, NextResponse } from 'next/server';

interface PostExOrderPayload {
  cityName: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  invoiceDivision: number;
  invoicePayment: number;
  items: number;
  orderDetail: string;
  orderRefNumber: string;
  orderType: string;
  transactionNotes?: string;
  pickupAddressCode?: string;
}

function normalizePostExCity(city: string): string {
  const c = (city || '').trim();
  const lower = c.toLowerCase();
  if (lower.includes('karachi')) return 'Karachi';
  if (lower.includes('lahore')) return 'Lahore';
  if (lower.includes('islamabad')) return 'Islamabad';
  if (lower.includes('rawalpindi')) return 'Rawalpindi';
  if (lower.includes('faisalabad')) return 'Faisalabad';
  if (lower.includes('multan')) return 'Multan';
  if (lower.includes('peshawar')) return 'Peshawar';
  if (lower.includes('quetta')) return 'Quetta';
  if (lower.includes('sialkot')) return 'Sialkot';
  if (lower.includes('gujranwala')) return 'Gujranwala';
  if (lower.includes('hyderabad')) return 'Hyderabad';
  if (lower.includes('sukkur')) return 'Sukkur';
  if (lower.includes('bahawalpur')) return 'Bahawalpur';
  if (lower.includes('sargodha')) return 'Sargodha';
  if (lower.includes('abbottabad')) return 'Abbottabad';
  if (lower.includes('gujrat')) return 'Gujrat';
  if (lower.includes('sahiwal')) return 'Sahiwal';
  if (lower.includes('sheikhupura')) return 'Sheikhupura';
  if (lower.includes('jhelum')) return 'Jhelum';
  if (lower.includes('mardan')) return 'Mardan';
  return c || 'Karachi';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { manifest_number, provider = 'postex', tracking_numbers = [], tenant_id } = body;

    if (!Array.isArray(tracking_numbers) || tracking_numbers.length === 0) {
      return NextResponse.json({ error: 'No tracking numbers provided for 3PL dispatch' }, { status: 400 });
    }

    const strapiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:1337/api';
    const strapiToken = process.env.NEXT_PUBLIC_JWT_TOKEN || process.env.JWT_TOKEN || '';

    const strapiHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(strapiToken ? { Authorization: `Bearer ${strapiToken}` } : {}),
    };

    // 1. Fetch 3PL Partner credentials from Strapi
    const providerCode = String(provider).toLowerCase().trim();
    const partnerRes = await fetch(
      `${strapiBase}/tpl-partners?filters[provider_code][$eq]=${providerCode}&filters[status][$eq]=active&populate=*`,
      { headers: strapiHeaders }
    ).catch(() => null);

    const partnerData = partnerRes?.ok ? await partnerRes.json() : null;
    const partners = partnerData?.data || [];
    const activePartner = partners.find((p: any) => {
      if (!tenant_id) return true;
      const tId = p.tenant?.id || p.tenant;
      return String(tId) === String(tenant_id);
    }) || partners[0];

    const credentials = activePartner?.api_credentials || activePartner?.credentials || {};
    const postexApiToken = credentials.api_token || credentials.token || '';

    const results: Array<{
      tracking_number: string;
      tpl_tracking_number?: string;
      status: 'success' | 'failed' | 'skipped';
      provider: string;
      error?: string;
    }> = [];

    // 2. Process each tracking number
    for (const trackingNumber of tracking_numbers) {
      try {
        // Fetch parcel details from Strapi
        const parcelQuery = await fetch(
          `${strapiBase}/parcels?filters[tracking_number][$eq]=${encodeURIComponent(trackingNumber)}&populate=*`,
          { headers: strapiHeaders }
        );
        const parcelJson = parcelQuery.ok ? await parcelQuery.json() : null;
        const parcel = parcelJson?.data?.[0];

        if (!parcel) {
          results.push({
            tracking_number: trackingNumber,
            provider: providerCode,
            status: 'failed',
            error: 'Parcel not found in system',
          });
          continue;
        }

        const parcelDocId = parcel.documentId || parcel.id;
        const rawCity =
          parcel.destination_city?.CityName ||
          parcel.destination_city?.name ||
          (typeof parcel.destination_city === 'string' ? parcel.destination_city : '') ||
          'Karachi';
        const destCity = normalizePostExCity(rawCity);

        const consigneeName = parcel.recipient_name || 'Customer';
        let consigneePhone = (parcel.recipient_phone || '03001234567').replace(/\D/g, '');
        if (consigneePhone.startsWith('92')) consigneePhone = '0' + consigneePhone.slice(2);
        if (!consigneePhone.startsWith('0')) consigneePhone = '0' + consigneePhone;

        const deliveryAddress = parcel.recipient_address || 'Delivery Address';
        const codAmount = parcel.payment_type === 'PAID' ? 0 : Number(parcel.cod_amount) || 0;
        const pieces = Number(parcel.pieces) || 1;
        const orderDetail = parcel.comments || parcel.product_description || 'General Goods';

        // 3. Dispatch to PostEx API if provider is postex
        if (providerCode === 'postex') {
          if (!postexApiToken) {
            results.push({
              tracking_number: trackingNumber,
              provider: 'postex',
              status: 'failed',
              error: 'PostEx API Token is not configured in 3PL Setup',
            });
            continue;
          }

          const postExPayload: PostExOrderPayload = {
            cityName: destCity,
            customerName: consigneeName,
            customerPhone: consigneePhone,
            deliveryAddress: deliveryAddress,
            invoiceDivision: 1,
            invoicePayment: codAmount,
            items: pieces,
            orderDetail: orderDetail,
            orderRefNumber: trackingNumber,
            orderType: 'Normal',
            transactionNotes: manifest_number ? `DBARc Manifest #${manifest_number}` : 'DBARc Courier Handover',
          };

          console.log('\n============================================================');
          console.log('🚀 [3PL SERVICE DISPATCH REQUEST]');
          console.log(`Tracking Number: ${trackingNumber}`);
          console.log(`Provider: PostEx`);
          console.log(`Payload:`, JSON.stringify(postExPayload, null, 2));
          console.log('============================================================\n');

          const postexRes = await fetch('https://api.postex.pk/services/integration/api/order/v1/create-order', {
            method: 'POST',
            headers: {
              token: postexApiToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(postExPayload),
          });

          const postExData = await postexRes.json().catch(() => ({}));

          console.log('\n============================================================');
          console.log('📥 [3PL SERVICE DISPATCH RESPONSE]');
          console.log(`Provider: PostEx`);
          console.log(`HTTP Status: ${postexRes.status}`);
          console.log(`Response Body:`, JSON.stringify(postExData, null, 2));
          console.log('============================================================\n');

          if (postexRes.ok && (postExData.statusCode === '200' || postExData.statusCode === 200)) {
            const tplCn = postExData.dist?.trackingNumber || postExData.trackingNumber || '';

            // Update parcel in Strapi with PostEx tracking number and status
            if (parcelDocId && tplCn) {
              await fetch(`${strapiBase}/parcels/${parcelDocId}`, {
                method: 'PUT',
                headers: strapiHeaders,
                body: JSON.stringify({
                  data: {
                    secondary_barcode: tplCn,
                    reference_number: tplCn,
                    service_provider: 'PostEx',
                    is_3pl: true,
                    comments: `Manifested to PostEx (CN: ${tplCn})`,
                  },
                }),
              });
            }

            results.push({
              tracking_number: trackingNumber,
              tpl_tracking_number: tplCn,
              provider: 'postex',
              status: 'success',
            });
          } else {
            const errorMsg =
              postExData.statusMessage ||
              postExData.message ||
              `PostEx API returned status ${postexRes.status}`;

            results.push({
              tracking_number: trackingNumber,
              provider: 'postex',
              status: 'failed',
              error: errorMsg,
            });
          }
        } else {
          // Other 3PL partners (TRAX, Leopards, etc.)
          results.push({
            tracking_number: trackingNumber,
            provider: providerCode,
            status: 'skipped',
            error: `Automated dispatch for ${providerCode} is in staging`,
          });
        }
      } catch (itemErr: any) {
        results.push({
          tracking_number: trackingNumber,
          provider: providerCode,
          status: 'failed',
          error: itemErr.message || 'Dispatch exception',
        });
      }
    }

    const totalSuccess = results.filter((r) => r.status === 'success').length;

    return NextResponse.json({
      success: totalSuccess > 0,
      total: tracking_numbers.length,
      successful: totalSuccess,
      results,
    });
  } catch (error: any) {
    console.error('3PL Dispatch Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process 3PL dispatch' },
      { status: 500 }
    );
  }
}
