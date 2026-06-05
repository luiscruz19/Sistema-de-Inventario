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
    const result = await serviceRequest({ method: 'PATCH', baseUrl: CONFIG.VENTAS_SERVICE_URL, path: `/returns/${id}/complete`, token });
    return NextResponse.json(result);
}
