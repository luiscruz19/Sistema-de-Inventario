import { NextResponse } from "next/server";
import axios from "axios";
import { serviceRequest } from "@/utils/connection";
import CONFIG from "@/config/config";

const AUTH_API_URL = process.env.AUTH_API_URL || '';
const AUTH_BASIC_USER = process.env.AUTH_BASIC_USER || '';
const AUTH_BASIC_PW = process.env.AUTH_BASIC_PW || '';
const basicAuth = Buffer.from(`${AUTH_BASIC_USER}:${AUTH_BASIC_PW}`).toString('base64');

export async function POST(request: Request) {
    try {
        const token = request.headers.get('token');
        if (!token) {
            return NextResponse.json({ status: 0, message: 'No se encontró el token' }, { status: 401 });
        }

        // 1. Validar token en auth
        let authData;
        try {
            const authRes = await axios({
                method: 'GET',
                url: `${AUTH_API_URL}/auth/validate-token`,
                headers: { token, Authorization: `Basic ${basicAuth}` },
            });
            authData = authRes.data;
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                return NextResponse.json(err.response.data, { status: err.response.status || 401 });
            }
            return NextResponse.json({ status: 0, message: 'Error validando token' }, { status: 502 });
        }

        if (authData.status <= 0) {
            return NextResponse.json(authData, { status: authData.internal_code ?? 401 });
        }

        const { id: userId, email } = authData.user;

        // 2. Fetch admin record para incluir type/name en el payload
        let adminData: Record<string, unknown> = {};
        try {
            const adminRes = await serviceRequest({
                method: 'GET',
                baseUrl: CONFIG.COMPRAS_SERVICE_URL,
                path: `/system/administrators/get-by-user-id/${userId}`,
                token,
            });
            if (adminRes.status === 1 && adminRes.data) {
                adminData = adminRes.data;
            }
        } catch {
            // Non-critical: continue without admin data
        }

        return NextResponse.json({
            status: 1,
            message: 'Tu sesión es válida y está activa.',
            internal_code: 200,
            data: { id: userId, email, type: adminData.type || 'internal', ...adminData },
        });

    } catch (error) {
        console.error('validate-token', { error });
        return NextResponse.json({ status: 0, message: 'Error al intentar validar el token' }, { status: 502 });
    }
}
