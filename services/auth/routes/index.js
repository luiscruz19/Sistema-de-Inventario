import { Router } from 'express';
import authRoutes from './api/auth.routes.js';
import usersRoutes from './api/users.routes.js';
import adminsRoutes from './api/admin.routes.js';
import validateToken from '../middlewares/validate-token.js';
import User from '../models/User.js';
import messages from '../config/messages.js';
import CONFIG from '../config/config.js';
import { errorMessage, successMessage } from '../utils/messages.js';

const { generic } = messages;

const api = Router();

api.use('/auth', authRoutes);
api.use('/user', [validateToken], usersRoutes);
api.use('/admin', [validateToken], adminsRoutes);

api.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', service: 'auth' });
});

api.get('/', (req, res) => {
    res.status(200).json({ message: 'AUTH service is running' });
});

// Internal: generate a fresh token for a known verified user.
// Protected by a shared secret (not the Basic Auth credentials).
function validateClient(req, res, next) {
    const token = req.headers.token;
    if (!token) return res.status(401).json(errorMessage({ message: generic.token_not_found }));
    if (token === CONFIG.SECRET_KEY) return next();
    return res.status(401).json(errorMessage({ message: generic.token_invalid }));
}

api.get('/generate-token', [validateClient], async (req, res) => {
    const { user_id } = req.query;
    const user = await User.findByPk(user_id);
    if (!user) {
        return res.status(400).json(errorMessage({ message: 'User not found' }));
    }
    if (!user.verified) {
        return res.status(400).json(errorMessage({ message: messages.error.login.not_verified }));
    }
    const { dataValues: data } = user;
    const token = User.prototype.generateToken({ id: data.id, email: data.email, remember_token: data.remember_token });
    return res.status(200).json(successMessage({
        message: messages.success.login,
        extra: { user: { id: data.id, token } },
    }));
});

export default api;
