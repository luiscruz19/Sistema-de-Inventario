import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const { token } = await getApiHeaders();
    const result = await serviceRequest({
        method: 'GET',
        baseUrl: CONFIG.FACTURACION_SERVICE_URL,
        path: `/invoices/${id}/cae-status`,
        token,
    });
    return NextResponse.json(result);
}
