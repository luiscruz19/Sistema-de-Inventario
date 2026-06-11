import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { token } = await getApiHeaders();
    const { id } = await params;
    const data = await request.json().catch(() => ({}));
    const result = await serviceRequest({ method: 'PATCH', baseUrl: CONFIG.COMPRAS_SERVICE_URL, path: `/suppliers/${id}/toggle`, token, data });
    return NextResponse.json(result);
}
