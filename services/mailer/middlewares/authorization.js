import crypto from 'crypto';
import CONFIG from '../config/config.js';
import { errorMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

const { AUTHORIZATION: { USER, PASSWORD } } = CONFIG;
const { generic } = messages;

function safeCompare(a, b) {
    const bufA = Buffer.from(String(a || ''));
    const bufB = Buffer.from(String(b || ''));
    if (bufA.length !== bufB.length) {
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}

const parseBasicCredentials = (authHeader) => {
    if (!authHeader || typeof authHeader !== 'string') return null;
    const spaceIdx = authHeader.indexOf(' ');
    if (spaceIdx === -1) return null;
    const scheme = authHeader.slice(0, spaceIdx);
    const encoded = authHeader.slice(spaceIdx + 1);
    if (scheme.toLowerCase() !== 'basic' || !encoded) return null;
    try {
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const colonIdx = decoded.indexOf(':');
        if (colonIdx <= 0) return null;
        return {
            user: decoded.slice(0, colonIdx),
            password: decoded.slice(colonIdx + 1),
        };
    } catch {
        return null;
    }
};

/**
 * True si la request trae Basic Auth válida (servicio-a-servicio interno).
 * Usado por los rate-limiters para saltearlos en tráfico autenticado interno.
 */
export const hasValidBasicAuth = (req) => {
    const credentials = parseBasicCredentials(req.get('authorization'));
    if (!credentials) return false;
    return safeCompare(credentials.user, USER) && safeCompare(credentials.password, PASSWORD);
};

export default (req, res, next) => {
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    const credentials = parseBasicCredentials(req.get('authorization'));
    if (!credentials) {
        return res.status(401).json(errorMessage({ message: generic.autorization_required }));
    }
    if (safeCompare(credentials.user, USER) && safeCompare(credentials.password, PASSWORD)) {
        return next();
    }
    return res.status(401).json(errorMessage({ message: generic.credential_invalid }));
};
