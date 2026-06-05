export const errorMessage = ({ extra = null, message = 'Ocurrió un error al procesar la solicitud.', code = 400 } = {}) => {
    return Object.assign({
        status: 0,
        message,
        internal_code: code,
    }, extra);
};

export const successMessage = ({ extra = null, message = 'La solicitud se procesó correctamente.', code = 200 } = {}) => {
    return Object.assign({
        status: 1,
        message,
        internal_code: code,
    }, extra);
};
