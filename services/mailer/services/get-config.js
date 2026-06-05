import CONFIG from '../config/config.js';
import { logger } from '../utils/logger.js';

const { MICROSERVICES_URL: { CONFIG: CONFIG_URL }, AUTHORIZATION: { USER, PASSWORD } } = CONFIG;

export default async function getRemoteConfig() {
    if (!CONFIG_URL) {
        logger.warn('[get-config] CONFIG_API_URL no definido.');
        return null;
    }
    try {
        const response = await fetch(CONFIG_URL, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(`${USER}:${PASSWORD}`).toString('base64'),
            },
        });
        if (!response.ok) {
            logger.warn(`[get-config] Respuesta no OK: ${response.status}`);
            return null;
        }
        return await response.json();
    } catch (error) {
        logger.error('[get-config] Error al obtener configuración remota:', error);
        return null;
    }
}
