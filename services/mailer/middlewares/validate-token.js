import { errorMessage } from '../utils/messages.js';
import CONFIG from '../config/config.js';
import messages from '../config/messages.js';

const { generic } = messages;
const { AUTH_API_URL, AUTHORIZATION: { USER, PASSWORD } } = CONFIG;

const basicAuth = 'Basic ' + Buffer.from(`${USER}:${PASSWORD}`).toString('base64');

export default async (req, res, next) => {
    const token = req.headers.token;
    if (!token) {
        return res.status(401).json(errorMessage({ message: generic.token_not_found }));
    }

    try {
        const response = await fetch(`${AUTH_API_URL}/auth/validate-token`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: basicAuth,
                token,
            },
        });
        const body = await response.json();
        if (!body?.status || body.status <= 0) {
            return res.status(401).json(body ?? errorMessage({ message: generic.token_invalid }));
        }
        req.user = body.user;
        next();
    } catch {
        return res.status(401).json(errorMessage({ message: generic.token_invalid }));
    }
};
