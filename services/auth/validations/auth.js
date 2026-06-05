import { body } from 'express-validator';
import messages from '../config/messages.js';

export const loginValidation = [
    body('email')
        .notEmpty().withMessage(messages.error.login.fields_empty.email)
        .isEmail().normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false })
        .withMessage(messages.error.login.fields_empty.email),
    body('password')
        .notEmpty().withMessage(messages.error.login.fields_empty.password),
];

export const signupValidation = [
    body('email')
        .notEmpty().withMessage(messages.error.signup.fields_empty.email)
        .isEmail().normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false })
        .withMessage(messages.error.signup.fields_empty.email),
    body('password')
        .notEmpty().withMessage(messages.error.signup.fields_empty.password)
        .isLength({ min: 6 }).withMessage(messages.error.signup.password.min_length)
        .matches(/[A-Z]/).withMessage(messages.error.signup.password.uppercase)
        .matches(/[a-z]/).withMessage(messages.error.signup.password.lowercase)
        .matches(/[0-9]/).withMessage(messages.error.signup.password.number)
        .matches(/[\W_]/).withMessage(messages.error.signup.password.special_character),
    body('verify_password')
        .notEmpty().withMessage(messages.error.signup.fields_empty.verify_password)
        .custom((value, { req }) => {
            if (value !== req.body.password) throw new Error(messages.error.signup.password.not_match);
            return true;
        }),
];

export const validateAccountValidation = [
    body('id').notEmpty().withMessage(messages.error.validate_account.fields_empty.id),
    body('token').notEmpty().withMessage(messages.error.validate_account.fields_empty.token),
];

export const forgotPasswordValidation = [
    body('email')
        .notEmpty().withMessage(messages.error.forgot_password.fields_empty.email)
        .isEmail().normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false })
        .withMessage(messages.error.forgot_password.fields_empty.email),
];

export const restorePasswordValidation = [
    body('password')
        .notEmpty().withMessage(messages.error.restore_password.fields_empty.password)
        .isLength({ min: 6 }).withMessage(messages.error.restore_password.password.min_length)
        .matches(/[A-Z]/).withMessage(messages.error.restore_password.password.uppercase)
        .matches(/[a-z]/).withMessage(messages.error.restore_password.password.lowercase)
        .matches(/[0-9]/).withMessage(messages.error.restore_password.password.number)
        .matches(/[\W_]/).withMessage(messages.error.restore_password.password.special_character),
    body('verify_password')
        .notEmpty().withMessage(messages.error.restore_password.fields_empty.verify_password)
        .custom((value, { req }) => {
            if (value !== req.body.password) throw new Error(messages.error.restore_password.password.not_match);
            return true;
        }),
];
