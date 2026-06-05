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
    const result = await serviceRequest({ method: 'GET', baseUrl: CONFIG.CORE_SERVICE_URL, path: `/marketplace/orders/${id}`, token });
    return NextResponse.json(result);
}
