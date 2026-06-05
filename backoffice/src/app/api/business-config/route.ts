import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function GET() {
    const { token } = await getApiHeaders();
    const result = await serviceRequest({ method: 'GET', baseUrl: CONFIG.PRODUCTOS_SERVICE_URL, path: '/business-config', token });
    return NextResponse.json(result);
}

export async function PUT(request: NextRequest) {
    const { token } = await getApiHeaders();
    const data = await request.json();
    const result = await serviceRequest({ method: 'PUT', baseUrl: CONFIG.PRODUCTOS_SERVICE_URL, path: '/business-config', token, data });
    return NextResponse.json(result);
}
