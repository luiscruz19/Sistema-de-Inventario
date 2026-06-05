import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { token } = await getApiHeaders();
    const { id } = await params;
    const result = await serviceRequest({ method: 'GET', baseUrl: CONFIG.STOCK_SERVICE_URL, path: `/transfers/${id}`, token });
    return NextResponse.json(result);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { token } = await getApiHeaders();
    const { id } = await params;
    const data = await request.json();
    const result = await serviceRequest({ method: 'PUT', baseUrl: CONFIG.STOCK_SERVICE_URL, path: `/transfers/${id}`, token, data });
    return NextResponse.json(result);
}
