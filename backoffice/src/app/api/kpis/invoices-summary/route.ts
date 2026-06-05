import { NextResponse } from 'next/server';
import { serviceRequest } from '@/utils/connection';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

export async function GET() {
    const { token } = await getApiHeaders();
    const result = await serviceRequest({
        method: 'GET',
        baseUrl: CONFIG.DASHBOARD_BI_SERVICE_URL,
        path: '/kpis/invoices-summary',
        token,
    });
    return NextResponse.json(result);
}
