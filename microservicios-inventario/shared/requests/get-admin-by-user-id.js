import CONFIG from "../config/config.js";
import connection from "../utils/connection.js";

export default async function getAdminByUserIDService({ user_id, token }) {
    if (!CONFIG.AUTH_API_URL) {
        return { status: 0, message: 'AUTH_API_URL no configurada' };
    }
    return await connection({ method: 'GET', url: `${CONFIG.AUTH_API_URL}/admins/get-by-user-id/${user_id}`, headers: { token } });
}
