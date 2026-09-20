import { NextRequest, NextResponse } from 'next/server';
import { translate3PLStatus } from '@/shared/data/pakistan-3pl-status-mappings';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: rawProvider } = await context.params;
    const provider = rawProvider || 'trax';
    const body = await req.json().catch(() => ({}));

    // Parse tracking number and status based on provider
    let trackingNumber = '';
    let rawStatus = '';
    let eventLocation = '';
    const timestamp = new Date().toISOString();

    if (provider === 'trax') {
      // TRAX webhook payload structure
      trackingNumber = body.tracking_number || body.consignment_number || body.cn || '';
      rawStatus = body.status || body.event || body.current_status || '';
      eventLocation = body.location || body.station || 'TRAX Gateway';
    } else if (provider === 'postex') {
      // PostEx webhook payload structure
      trackingNumber = body.trackingNumber || body.orderId || '';
      rawStatus = body.orderStatus || body.status || '';
      eventLocation = body.cityName || 'PostEx Hub';
    } else if (provider === 'leopards') {
      // Leopards webhook payload structure
      trackingNumber = body.track_number || body.cn || '';
      rawStatus = body.status || body.activity || '';
      eventLocation = body.station || 'Leopards Branch';
    } else if (provider === 'tcs') {
      // TCS webhook payload structure
      trackingNumber = body.consignmentNo || body.tracking_number || '';
      rawStatus = body.status || body.event_code || '';
      eventLocation = body.location || 'TCS Facility';
    } else {
      // Generic structure
      trackingNumber = body.tracking_number || body.trackingNumber || body.cn || '';
      rawStatus = body.status || body.event || '';
      eventLocation = body.location || `${provider.toUpperCase()} Station`;
    }

    if (!trackingNumber) {
      return NextResponse.json(
        { error: 'Missing tracking_number or consignment_number in webhook payload' },
        { status: 400 }
      );
    }

    const mapping = translate3PLStatus(provider, rawStatus);

    return NextResponse.json({
      success: true,
      provider,
      tracking_number: trackingNumber,
      raw_status: rawStatus,
      normalized_status: mapping.normalizedStatus,
      category: mapping.category,
      description: mapping.description,
      action_triggered: mapping.actionTriggered,
      location: eventLocation,
      synced_at: timestamp
    });
  } catch (error: any) {
    console.error('3PL Webhook Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error processing 3PL webhook' },
      { status: 500 }
    );
  }
}
