import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { token } = await getApiHeaders();
    const { id } = await params;
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const result = await serviceRequest({ method: 'GET', baseUrl: CONFIG.PRODUCTOS_SERVICE_URL, path: `/products/${id}/variants`, token, params: query });
    return NextResponse.json(result);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { token } = await getApiHeaders();
    const { id } = await params;
    const data = await request.json().catch(() => ({}));
    const result = await serviceRequest({ method: 'POST', baseUrl: CONFIG.PRODUCTOS_SERVICE_URL, path: `/products/${id}/variants`, token, data });
    return NextResponse.json(result);
}
