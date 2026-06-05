import { NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function POST() {
    const { token } = await getApiHeaders();
    const result = await serviceRequest({
        method: 'POST',
        baseUrl: CONFIG.FACTURACION_SERVICE_URL,
        path: '/fiscal-config/arca/test',
        token,
    });
    return NextResponse.json(result);
}
