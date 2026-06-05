import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function POST(request: NextRequest) {
    const { token } = await getApiHeaders();
    const data = await request.json();
    const result = await serviceRequest({ method: 'POST', baseUrl: CONFIG.STOCK_SERVICE_URL, path: '/stock/adjust', token, data });
    return NextResponse.json(result);
}
