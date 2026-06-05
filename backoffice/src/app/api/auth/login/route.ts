import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const AUTH_API_URL = process.env.AUTH_API_URL || '';
const AUTH_BASIC_USER = process.env.AUTH_BASIC_USER || '';
const AUTH_BASIC_PW = process.env.AUTH_BASIC_PW || '';
const basicAuth = Buffer.from(`${AUTH_BASIC_USER}:${AUTH_BASIC_PW}`).toString('base64');

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ status: 0, message: 'Email y contraseña son requeridos' }, { status: 400 });
        }

        // Validar credenciales en auth
        const res = await axios({
            method: 'POST',
            url: `${AUTH_API_URL}/auth/login`,
            data: { email, password },
            headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
        });

        const authRes = res.data;
        if (authRes.status <= 0) {
            return NextResponse.json(authRes, { status: authRes.internal_code ?? 401 });
        }

        return NextResponse.json(authRes);
    } catch (err: any) {
        const data = err?.response?.data;
        if (data) return NextResponse.json(data, { status: err.response.status || 400 });
        console.error('login', { err });
        return NextResponse.json({ status: 0, message: 'Error al iniciar sesión' }, { status: 502 });
    }
}
