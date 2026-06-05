import connection from '../utils/connection.js';
import { errorMessage } from '../utils/messages.js';
import CONFIG from '../config/config.js';

const { AUTH_API_URL } = CONFIG;

export default async (req, res, next) => {
    const headerToken = req.headers.token;
    const authHeader = req.headers.authorization;
    const bearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null;
    const token = headerToken || bearerToken;

    if (!token) {
        return res.status(401).json(errorMessage({ message: 'Token no encontrado.' }));
    }

    const response = await connection({
        method: 'GET',
        url: `${AUTH_API_URL}/auth/validate-token`,
        headers: { token },
    });

    if (!response?.status || response.status <= 0) {
        return res.status(401).json(response ?? errorMessage({ message: 'Token invalido o expirado.' }));
    }

    req.user = response.user;
    next();
};
