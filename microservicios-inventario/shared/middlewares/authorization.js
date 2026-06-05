import CONFIG from '../config/config.js';
const { AUTHORIZATION } = CONFIG;
const { PASSWORD, USER } = AUTHORIZATION;
import crypto from 'node:crypto';
import { errorMessage } from '../utils/messages.js';
import MESSAGE_KEYS from '../config/message-keys.js';
import { getMessage } from '../utils/get-message.js';

const safeEquals = (left = '', right = '') => {
    const leftBuffer = Buffer.from(String(left));
    const rightBuffer = Buffer.from(String(right));

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const parseBasicCredentials = (authHeader) => {
    if (!authHeader || typeof authHeader !== 'string') {
        return null;
    }

    const [scheme, encoded] = authHeader.split(' ');

    if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) {
        return null;
    }

    try {
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const separatorIndex = decoded.indexOf(':');

        if (separatorIndex <= 0) {
            return null;
        }

        const parsedUser = decoded.slice(0, separatorIndex);
        const parsedPassword = decoded.slice(separatorIndex + 1);

        return {
            user: parsedUser,
            password: parsedPassword
        };
    } catch {
        return null;
    }
};

const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

export default (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.length === 0)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'X-HTTP-Method-Override, Content-Type, x-requested-with, authorization, token, x-request-id');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    if (req.path === '/health') {
        return next();
    }

    const auth = req.get('authorization');

    if (!USER || !PASSWORD) {
        return res.status(500).json(errorMessage({ message: getMessage(MESSAGE_KEYS.SYSTEM.COMMON.ERRORS.MISCONFIGURED_AUTHORIZATION) }));
    }

    const credentials = parseBasicCredentials(auth);

    if (!credentials) {
        return res.status(401).json(errorMessage({ message: getMessage(MESSAGE_KEYS.SYSTEM.AUTH.ERRORS.AUTHORIZATION_REQUIRED) }));
    }

    const hasValidUser = safeEquals(credentials.user, USER);
    const hasValidPassword = safeEquals(credentials.password, PASSWORD);

    if (hasValidUser && hasValidPassword) {
        return next();
    }

    return res.status(401).json(errorMessage({ message: getMessage(MESSAGE_KEYS.SYSTEM.AUTH.ERRORS.CREDENTIALS_INVALID) }));
}
