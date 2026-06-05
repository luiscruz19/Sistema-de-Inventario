import { NextRequest, NextResponse } from 'next/server';
import { getApiHeaders } from '@/utils/api-headers';
import CONFIG from '@/config/config';

/**
 * Stream del PDF del microservicio al cliente.
 * No usamos serviceRequest porque necesitamos pasar el body binario.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const { token } = await getApiHeaders();

    const AUTH_BASIC_USER = process.env.AUTH_BASIC_USER || '';
    const AUTH_BASIC_PW = process.env.AUTH_BASIC_PW || '';
    const basicAuth = Buffer.from(`${AUTH_BASIC_USER}:${AUTH_BASIC_PW}`).toString('base64');

    const headers: Record<string, string> = {
        Authorization: `Basic ${basicAuth}`,
    };
    if (token) headers.token = token;

    try {
        const upstream = await fetch(`${CONFIG.FACTURACION_SERVICE_URL}/invoices/${id}/pdf`, {
            method: 'GET',
            headers,
        });

        if (!upstream.ok) {
            return NextResponse.json({ status: 0, message: 'Error al obtener PDF' }, { status: upstream.status });
        }

        const contentType = upstream.headers.get('content-type') || 'application/pdf';
        const disposition = upstream.headers.get('content-disposition') || `inline; filename="factura-${id}.pdf"`;
        const buffer = Buffer.from(await upstream.arrayBuffer());

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': disposition,
            },
        });
    } catch (err) {
        console.error('Error downloading invoice pdf:', err);
        return NextResponse.json({ status: 0, message: 'Error de conexión con facturación' }, { status: 500 });
    }
}
