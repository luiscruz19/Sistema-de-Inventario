import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { hasValidBasicAuth } from './authorization.js';

const isProduction = process.env.NODE_ENV === 'production';

const buildAllowedOrigins = () => {
    const raw = process.env.CORS_ALLOWED_ORIGINS || process.env.WEB_URL || '';
    if (!raw) {
        if (isProduction) {
            throw new Error('Missing required environment variable: CORS_ALLOWED_ORIGINS or WEB_URL');
        }
        return ['http://localhost:3000', 'http://localhost:5173'];
    }
    const parsed = raw.split(',').map(o => o.trim()).filter(Boolean);
    if (parsed.length) return parsed;
    try {
        const url = new URL(raw);
        return [`https://${url.host}`, `http://${url.host}`];
    } catch {
        return [raw];
    }
};

const allowedOrigins = buildAllowedOrigins();

const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'token', 'x-requested-with', 'x-idempotency-key'],
    credentials: true,
};

const windowMs = process.env.RATE_LIMIT_WINDOW_MS ? Number(process.env.RATE_LIMIT_WINDOW_MS) : 15 * 60 * 1000;
const max = process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : 100;

if (isProduction && !process.env.SECRET_KEY) {
    throw new Error('Missing required environment variable: SECRET_KEY (production)');
}

const apiRateLimit = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
    // Tráfico server-to-server interno (BFF/microservicios) no se limita;
    // la protección anti-abuso pública la cubre Cloudflare delante.
    skip: hasValidBasicAuth,
});

export const applySecurity = (app) => {
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        referrerPolicy: { policy: 'no-referrer' },
        hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    }));
    app.use(cors(corsOptions));
    app.use(apiRateLimit);
};
