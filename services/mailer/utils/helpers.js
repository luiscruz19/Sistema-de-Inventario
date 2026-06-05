import { validationResult } from 'express-validator';
import { errorMessage } from './messages.js';
import messages from '../config/messages.js';

export function validate(validations) {
    return async (req, res, next) => {
        await Promise.all(validations.map(v => v.run(req)));
        const errors = validationResult(req);
        if (errors.isEmpty()) return next();
        return res.status(400).json(errorMessage({
            message: messages.generic.fields_empty,
            extra: { errors: errors.array().map(item => item.msg) },
        }));
    };
}
