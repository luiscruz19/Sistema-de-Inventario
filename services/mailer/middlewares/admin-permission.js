import { errorMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

export default async (req, res, next) => {
    if (!req.headers.token) {
        return res.status(401).json(errorMessage({ message: messages.generic.login_required }));
    }
    if (!req.user) {
        return res.status(401).json(errorMessage({ message: messages.generic.login_required }));
    }
    const role = req.user.role || req.user.rol || req.user.tipo;
    const adminRoles = ['admin', 'superadmin', 'administrador'];
    if (!role || !adminRoles.includes(String(role).toLowerCase())) {
        return res.status(403).json(errorMessage({ message: messages.generic.permission_denied, code: 403 }));
    }
    return next();
};
