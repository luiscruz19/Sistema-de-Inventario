import { errorMessage } from '../utils/messages.js';
import MESSAGE_KEYS from '../config/message-keys.js';
import { getMessage } from '../utils/get-message.js';

/**
 * Middleware para manejar rutas no encontradas (404)
 * Debe ser el último middleware registrado en la aplicación
 */
const notFound = (req, res, next) => {
    return res.status(404).json(errorMessage({ message: `${getMessage(MESSAGE_KEYS.SYSTEM.HTTP.ERRORS.ROUTE_NOT_FOUND_PREFIX)}: ${req.method} ${req.originalUrl}` }));
};

export default notFound;
