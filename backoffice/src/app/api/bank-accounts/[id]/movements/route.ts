import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { token } = await getApiHeaders();
    const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const result = await serviceRequest({ method: 'GET', baseUrl: CONFIG.TESORERIA_SERVICE_URL, path: `/bank-accounts/${id}/movements`, token, params: queryParams });
    return NextResponse.json(result);
}
