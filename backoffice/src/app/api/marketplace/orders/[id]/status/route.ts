import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { token } = await getApiHeaders();
    const data = await request.json();
    const result = await serviceRequest({ method: 'PATCH', baseUrl: CONFIG.CORE_SERVICE_URL, path: `/marketplace/orders/${id}/status`, token, data });
    return NextResponse.json(result);
}
