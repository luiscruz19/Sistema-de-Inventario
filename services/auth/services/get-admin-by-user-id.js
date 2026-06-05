import CONFIG from '../config/config.js';
import connection from '../utils/connection.js';

const { MICROSERVICES_URL: { USUARIOS } } = CONFIG;

/**
 * Consulta a ms_usuarios si un user_id corresponde a un administrador.
 * Fuente única de verdad de "admin": la tabla `administrators` (NOVITAS),
 * la misma que usa `admin-permission.js` en los microservicios. Evita la
 * desincronización que existía contra `users.is_admin` de auth.
 *
 * Devuelve la respuesta de ms_usuarios: { status: 1, data: {...} } si es admin,
 * { status: 0, ... } si no lo es.
 */
export default async function getAdminByUserIDService({ user_id, token }) {
    if (!USUARIOS) {
        return { status: 0, message: 'USUARIOS_API_URL no configurado' };
    }
    return connection({
        method: 'GET',
        url: `${USUARIOS}/administradores/get-by-user-id/${user_id}`,
        headers: { token },
    });
}
