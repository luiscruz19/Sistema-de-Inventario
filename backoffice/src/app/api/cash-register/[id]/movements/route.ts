import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { token } = await getApiHeaders();
    const { id } = await params;
    const data = await request.json().catch(() => ({}));
    const result = await serviceRequest({ method: 'POST', baseUrl: CONFIG.VENTAS_SERVICE_URL, path: `/cash-register/${id}/movements`, token, data });
    return NextResponse.json(result);
}
