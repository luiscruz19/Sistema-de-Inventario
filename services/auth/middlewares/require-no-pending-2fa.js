import jwt from 'jsonwebtoken';
import CONFIG from '../config/config.js';
import { errorMessage } from '../utils/messages.js';

const { SECRET_KEY } = CONFIG;

export default function requireNoPending2FA(req, res, next) {
    const headerToken = req.headers.token;
    const authHeader = req.headers.authorization;
    const bearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null;
    const token = headerToken || bearerToken;

    if (!token) return next();

    try {
        const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] });
        if (decoded.pending_2fa) {
            return res.status(401).json(errorMessage({ message: 'Debés completar la verificación 2FA' }));
        }
    } catch {
        // Invalid/expired token — validateToken middleware will handle it
    }

    next();
}
