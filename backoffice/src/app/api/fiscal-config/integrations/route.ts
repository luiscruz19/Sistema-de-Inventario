import { NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function GET() {
    const { token } = await getApiHeaders();
    const result = await serviceRequest({
        method: 'GET',
        baseUrl: CONFIG.FACTURACION_SERVICE_URL,
        path: '/fiscal-config/integrations',
        token,
    });
    return NextResponse.json(result);
}
