import crypto from 'node:crypto';
import CONFIG from '../config/config.js';
import { errorMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

const { AUTHORIZATION: { USER, PASSWORD } } = CONFIG;
const { generic } = messages;

const safeEquals = (left = '', right = '') => {
    const leftBuffer = Buffer.from(String(left));
    const rightBuffer = Buffer.from(String(right));
    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const parseBasicCredentials = (authHeader) => {
    if (!authHeader || typeof authHeader !== 'string') return null;
    const [scheme, encoded] = authHeader.split(' ');
    if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) return null;
    try {
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const separatorIndex = decoded.indexOf(':');
        if (separatorIndex <= 0) return null;
        return {
            user: decoded.slice(0, separatorIndex),
            password: decoded.slice(separatorIndex + 1),
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
    return safeEquals(credentials.user, USER) && safeEquals(credentials.password, PASSWORD);
};

export default (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    const credentials = parseBasicCredentials(req.get('authorization'));
    if (!credentials) {
        return res.status(401).json(errorMessage({ message: generic.autorization_required }));
    }

    if (safeEquals(credentials.user, USER) && safeEquals(credentials.password, PASSWORD)) {
        return next();
    }

    return res.status(401).json(errorMessage({ message: generic.credential_invalid }));
};
