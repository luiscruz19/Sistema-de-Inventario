import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
    const { provider } = await params;
    const { token } = await getApiHeaders();
    const data = await request.json();
    const result = await serviceRequest({
        method: 'PUT',
        baseUrl: CONFIG.FACTURACION_SERVICE_URL,
        path: `/fiscal-config/integrations/${provider}`,
        token,
        data,
    });
    return NextResponse.json(result);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
    const { provider } = await params;
    const { token } = await getApiHeaders();
    const result = await serviceRequest({
        method: 'DELETE',
        baseUrl: CONFIG.FACTURACION_SERVICE_URL,
        path: `/fiscal-config/integrations/${provider}`,
        token,
    });
    return NextResponse.json(result);
}
