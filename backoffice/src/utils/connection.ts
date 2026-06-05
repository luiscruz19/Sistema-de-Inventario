import axios from 'axios';

const AUTH_BASIC_USER = process.env.AUTH_BASIC_USER || '';
const AUTH_BASIC_PW = process.env.AUTH_BASIC_PW || '';

const basicAuth = Buffer.from(`${AUTH_BASIC_USER}:${AUTH_BASIC_PW}`).toString('base64');

/**
 * Conexión autenticada hacia los microservicios de inventario (server-side).
 * Usa Basic Auth + el token del usuario.
 */
export async function serviceRequest({
    method = 'GET',
    baseUrl,
    path,
    data,
    params,
    token,
}: {
    method?: string;
    baseUrl: string;
    path: string;
    data?: Record<string, unknown>;
    params?: Record<string, string>;
    token?: string;
}) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basicAuth}`,
    };

    if (token) {
        headers.token = token;
    }

    try {
        const response = await axios({
            method,
            url: `${baseUrl}${path}`,
            headers,
            data,
            params,
        });
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            return error.response?.data ?? { status: 0, message: 'Error en la conexión con el servicio de inventario' };
        }
        return { status: 0, message: 'Error desconocido' };
    }
}
