import { errorMessage } from '../utils/messages.js';
import getAdminByUserIDService from '../services/get-admin-by-user-id.js';

// Verifica que el usuario sea administrador consultando la tabla `administrators`
// vía ms_usuarios (fuente única de verdad, la misma que `admin-permission.js`).
// Antes se usaba `users.is_admin` de auth, que se desincronizaba con `administrators`
// y causaba "Acceso denegado" en el backoffice aunque el usuario sí fuera admin.
export default async function requireAdmin(req, res, next) {
    try {
        const user_id = req.user?.id;
        const { token } = req.headers;
        if (!user_id || !token) {
            return res.status(403).json(errorMessage({ message: 'Acceso denegado' }));
        }
        const response = await getAdminByUserIDService({ user_id, token });
        if (!response?.status) {
            return res.status(403).json(errorMessage({ message: 'Acceso denegado' }));
        }
        req.admin = response.data;
        next();
    } catch {
        return res.status(403).json(errorMessage({ message: 'Acceso denegado' }));
    }
}
