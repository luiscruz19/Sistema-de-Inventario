import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { token } = await getApiHeaders();
    const result = await serviceRequest({ method: 'GET', baseUrl: CONFIG.CORE_SERVICE_URL, path: `/tax-settings/${id}`, token });
    return NextResponse.json(result);
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { token } = await getApiHeaders();
    const data = await request.json();
    const result = await serviceRequest({ method: 'PUT', baseUrl: CONFIG.CORE_SERVICE_URL, path: `/tax-settings/${id}`, token, data });
    return NextResponse.json(result);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { token } = await getApiHeaders();
    const result = await serviceRequest({ method: 'DELETE', baseUrl: CONFIG.CORE_SERVICE_URL, path: `/tax-settings/${id}`, token });
    return NextResponse.json(result);
}
