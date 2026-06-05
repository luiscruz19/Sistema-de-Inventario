import crypto from 'node:crypto';
import { validationResult } from 'express-validator';
import { errorMessage } from './messages.js';
import MESSAGE_KEYS from '../config/message-keys.js';
import { getMessage } from './get-message.js';

/**
 * Middleware de validación mejorado con mensajes detallados
 */
export const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        const errors = validationResult(req);

        if (errors.isEmpty()) {
            return next();
        }

        const errorArray = errors.array();

        const errorsByField = {};
        errorArray.forEach(error => {
            const field = error.param || error.path;
            if (!errorsByField[field]) {
                errorsByField[field] = [];
            }
            errorsByField[field].push(error.msg);
        });

        const errorMessages = Object.entries(errorsByField).map(([field, messages]) => {
            return `${field}: ${messages.join(', ')}`;
        });

        return res.status(400).json(errorMessage({
            message: getMessage(MESSAGE_KEYS.SYSTEM.VALIDATION.ERRORS.REQUEST_INVALID),
            extra: {
                details: errorMessages.join(' | '),
                errors: errorArray.map(err => ({
                    field: err.param || err.path,
                    message: err.msg,
                    value: err.value
                })),
                validation: errorsByField
            }
        }));
    };
};

// Check if a value is empty
export const isEmpty = (value) => {
    return (value === null || value === undefined || value === '' || value === 0);
};

export function makeID(length, prefix = '') {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
    const bytes = crypto.randomBytes(length);
    let result = prefix;
    for (let i = 0; i < length; i++) {
        result += characters[bytes[i] % charactersLength];
    }
    return result;
}

export const ensureAuthUser = (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json(errorMessage({ message: getMessage(MESSAGE_KEYS.SYSTEM.COMMON.ERRORS.INVALID_USER_IN_TOKEN) }));
        return null;
    }
    return Number(userId);
};
