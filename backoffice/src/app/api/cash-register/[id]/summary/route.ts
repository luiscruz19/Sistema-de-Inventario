import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { token } = await getApiHeaders();
    const { id } = await params;
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const result = await serviceRequest({ method: 'GET', baseUrl: CONFIG.VENTAS_SERVICE_URL, path: `/cash-register/${id}/summary`, token, params: query });
    return NextResponse.json(result);
}
