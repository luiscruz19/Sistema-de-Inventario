import rateLimit from 'express-rate-limit';
import { hasValidBasicAuth } from './authorization.js';

// Requests con la credencial Basic interna (BFF + microservicios) NO se limitan:
// son tráfico server-to-server confiable y la protección anti-abuso pública la cubre Cloudflare.
// Anónimos / credenciales falsas siguen limitadas como defensa en profundidad —
// con brechas amplias porque el flujo normal del sitio NUNCA pega directo a estos
// endpoints (siempre va vía BFF con Basic Auth, que skipea estos limiters).
// Los límites acá son para ataques directos a la URL del microservicio.
//
// Configurable por env. Defaults pensados para producción real:
//   AUTH_SIGNUP_RATE_LIMIT_WINDOW_MS / AUTH_SIGNUP_RATE_LIMIT_MAX  (default 60min, 500)
//   AUTH_FORGOT_RATE_LIMIT_WINDOW_MS / AUTH_FORGOT_RATE_LIMIT_MAX  (default 60min, 50)

const num = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const signupLimit = rateLimit({
    windowMs: num(process.env.AUTH_SIGNUP_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
    max: num(process.env.AUTH_SIGNUP_RATE_LIMIT_MAX, 500),
    message: { status: 0, message: 'Demasiados registros desde esta IP. Probá de nuevo más tarde.', internal_code: 429 },
    standardHeaders: true,
    legacyHeaders: false,
    skip: hasValidBasicAuth,
});

export const forgotPasswordLimit = rateLimit({
    windowMs: num(process.env.AUTH_FORGOT_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
    max: num(process.env.AUTH_FORGOT_RATE_LIMIT_MAX, 50),
    message: { status: 0, message: 'Demasiadas solicitudes de recuperación. Probá de nuevo más tarde.', internal_code: 429 },
    standardHeaders: true,
    legacyHeaders: false,
    skip: hasValidBasicAuth,
});
