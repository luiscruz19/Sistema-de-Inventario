import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { token } = await getApiHeaders();
    const { id } = await params;
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const result = await serviceRequest({ method: 'GET', baseUrl: CONFIG.COMPRAS_SERVICE_URL, path: `/suppliers/${id}/transactions`, token, params: query });
    return NextResponse.json(result);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { token } = await getApiHeaders();
    const { id } = await params;
    const data = await request.json().catch(() => ({}));
    const result = await serviceRequest({ method: 'POST', baseUrl: CONFIG.COMPRAS_SERVICE_URL, path: `/suppliers/${id}/transactions`, token, data });
    return NextResponse.json(result);
}
