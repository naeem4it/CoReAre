import { NextRequest, NextResponse } from 'next/server';
import { translate3PLStatus } from '@/shared/data/pakistan-3pl-status-mappings';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { tracking_numbers, provider } = body;

    const list = Array.isArray(tracking_numbers) && tracking_numbers.length > 0 
      ? tracking_numbers 
      : ['DBA-100234', 'DBA-100235'];

    const syncResults = list.map((tn: string) => {
      const p = provider || (tn.includes('POST') ? 'postex' : tn.includes('LEO') ? 'leopards' : 'trax');
      const sampleRawStatuses = ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'ARRIVED_AT_STATION'];
      const randomStatus = sampleRawStatuses[Math.floor(Math.random() * sampleRawStatuses.length)];
      const mapped = translate3PLStatus(p, randomStatus);

      return {
        tracking_number: tn,
        provider: p,
        raw_status: randomStatus,
        status: mapped.normalizedStatus,
        category: mapped.category,
        description: mapped.description,
        action_triggered: mapped.actionTriggered,
        synced_at: new Date().toISOString()
      };
    });

    return NextResponse.json({
      success: true,
      total_synced: syncResults.length,
      results: syncResults
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to execute 3PL sync' },
      { status: 500 }
    );
  }
}
