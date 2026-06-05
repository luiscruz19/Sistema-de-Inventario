import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const { token } = await getApiHeaders();
    const data = await request.json().catch(() => ({}));
    const result = await serviceRequest({
        method: 'POST',
        baseUrl: CONFIG.FACTURACION_SERVICE_URL,
        path: `/invoices/${id}/credit-note`,
        token,
        data,
    });
    return NextResponse.json(result);
}
