import { errorMessage } from './messages.js';
import { validationResult } from 'express-validator';
import messages from '../config/messages.js';

const { generic: { fields_empty } } = messages;

export function validate(validations) {
    return async (req, res, next) => {
        await Promise.all(validations.map(v => v.run(req)));
        const errors = validationResult(req);
        if (errors.isEmpty()) return next();
        return res.status(400).json(errorMessage({
            message: fields_empty,
            extra: { errors: errors.array().map(item => item.msg) },
        }));
    };
}

export function Normalize(data) {
    return {
        id: data.id,
        email: data.email,
        verified: data.verified,
        is_guest: data.is_guest ?? false,
        created_at: data.created_at,
    };
}
