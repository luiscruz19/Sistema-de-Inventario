import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function PUT(request: NextRequest) {
    const { token } = await getApiHeaders();
    const data = await request.json();
    const result = await serviceRequest({
        method: 'PUT',
        baseUrl: CONFIG.FACTURACION_SERVICE_URL,
        path: '/fiscal-config/arca',
        token,
        data,
    });
    return NextResponse.json(result);
}
