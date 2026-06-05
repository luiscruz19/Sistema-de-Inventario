import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { token } = await getApiHeaders();
    const { id } = await params;
    const result = await serviceRequest({ method: 'GET', baseUrl: CONFIG.COMPRAS_SERVICE_URL, path: `/customers/${id}/transactions`, token });
    return NextResponse.json(result);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { token } = await getApiHeaders();
    const { id } = await params;
    const data = await request.json();
    const result = await serviceRequest({ method: 'POST', baseUrl: CONFIG.COMPRAS_SERVICE_URL, path: `/customers/${id}/transactions`, token, data });
    return NextResponse.json(result);
}
