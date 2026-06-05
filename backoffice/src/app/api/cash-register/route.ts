import { NextRequest, NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function GET(request: NextRequest) {
    const { token } = await getApiHeaders();
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const path = params.current === 'true' ? '/cash-register/current' : '/cash-register';
    delete params.current;
    const result = await serviceRequest({ method: 'GET', baseUrl: CONFIG.VENTAS_SERVICE_URL, path, token, params });
    return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
    const { token } = await getApiHeaders();
    const data = await request.json();
    const result = await serviceRequest({ method: 'POST', baseUrl: CONFIG.VENTAS_SERVICE_URL, path: '/cash-register/open', token, data });
    return NextResponse.json(result);
}
