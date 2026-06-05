export const errorMessage = ({ extra = null, message = null, code = null }) => Object.assign({ status: 0 }, message ? { message } : null, code ? { code } : null, extra);

export const successMessage = ({ extra = null, message = null, code = null }) => Object.assign({ status: 1 }, message ? { message } : null, code ? { code } : null, extra);

/**
 * Extrae errores de validación de Sequelize
 * @param {Error} error - Error de Sequelize
 * @returns {Array} Lista de errores formateados
 */
export const extractSequelizeErrors = (error) => {
    if (!error.errors || !Array.isArray(error.errors)) {
        return [];
    }

    return error.errors.map(err => ({
        field: err.path || err.field,
        message: err.message,
        value: err.value
    }));
};

/**
 * Formatea un error de Sequelize para respuesta
 * @param {Error} error - Error de Sequelize
 * @param {string} defaultMessage - Mensaje por defecto
 * @returns {Object} Objeto de respuesta de error
 */
export const formatSequelizeError = (error, defaultMessage = 'Error de validación en los campos ingresados') => {
    const errors = extractSequelizeErrors(error);

    if (errors.length > 0) {
        const details = errors.map(e => `${e.field}: ${e.message}`).join(' | ');
        const validation = errors.reduce((acc, e) => {
            acc[e.field] = [e.message];
            return acc;
        }, {});

        return Object.assign(
            { status: 0 },
            { message: defaultMessage },
            { details },
            { errors },
            { validation }
        );
    }

    return errorMessage({
        message: error.message || defaultMessage
    });
};
