import { headers } from 'next/headers';

/**
 * Extrae el token de los headers de la request entrante (server-side).
 * Para usar en API routes y Server Components del backoffice.
 */
export async function getApiHeaders() {
    const headersList = await headers();
    const token = headersList.get('token') || headersList.get('authorization')?.replace('Bearer ', '') || '';

    return {
        token,
    };
}
