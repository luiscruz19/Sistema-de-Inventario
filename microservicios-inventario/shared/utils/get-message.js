import messages from '../config/messages.js';

const getValueByPath = (source, path) => {
    if (!path || typeof path !== 'string') {
        return null;
    }

    return path.split('.').reduce((acc, chunk) => {
        if (acc && Object.prototype.hasOwnProperty.call(acc, chunk)) {
            return acc[chunk];
        }
        return null;
    }, source);
};

export const getMessage = (key, fallback = 'Mensaje no disponible') => {
    const value = getValueByPath(messages, key);
    return typeof value === 'string' ? value : fallback;
};

export default getMessage;
