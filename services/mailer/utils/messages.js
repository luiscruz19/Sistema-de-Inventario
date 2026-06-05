export const errorMessage = ({ extra = null, message = 'There was a problem executing the request to the server', code = 400 } = {}) => {
    return Object.assign({
        status: 0,
        message,
        internal_code: code,
    }, extra);
};

export const successMessage = ({ extra = null, message = 'The request was made correctly', code = 200 } = {}) => {
    return Object.assign({
        status: 1,
        message,
        internal_code: code,
    }, extra);
};
