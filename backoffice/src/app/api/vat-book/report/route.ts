import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function GET(request: NextRequest) {
    const { token } = await getApiHeaders();
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const result = await serviceRequest({ method: 'GET', baseUrl: CONFIG.CONTABILIDAD_SERVICE_URL, path: '/vat-book/report', token, params: query });
    return NextResponse.json(result);
}
