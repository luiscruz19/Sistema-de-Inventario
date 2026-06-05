import { Router } from 'express';

import {
    login, signup, sendActivationLink, guestSignup, validateAccount, validateToken as validateTokenController,
    forgotPassword, restorePassword, searchUser, generateGuestToken, systemToken,
} from '../../controllers/auth.js';
import { findByEmail, findById } from '../../controllers/users.js';
import { setup2FA, verify2FA, disable2FA, verifyTotpLogin } from '../../controllers/totp.js';
import {
    loginValidation, signupValidation, forgotPasswordValidation,
    restorePasswordValidation, validateAccountValidation,
} from '../../validations/auth.js';
import { body } from 'express-validator';
import validateToken from '../../middlewares/validate-token.js';
import requireNoPending2FA from '../../middlewares/require-no-pending-2fa.js';
import { signupLimit, forgotPasswordLimit, totpLimit } from '../../middlewares/rate-limit.js';
import cronSecret from '../../middlewares/cron-secret.js';
import { validate } from '../../utils/helpers.js';

const api = Router();

api.post('/login', [validate(loginValidation)], login);
api.post('/signup', [signupLimit, validate(signupValidation)], signup);
// Reenvía link de activación a un usuario existente no verificado (internal s2s).
api.post('/send-activation-link', sendActivationLink);
api.post('/guest-signup', [
    validate([body('email').optional({ checkFalsy: true }).isEmail().withMessage('El email de contacto no es válido')]),
], guestSignup);
api.post('/validate-account', [validate(validateAccountValidation)], validateAccount);

api.post('/forgot-password', [forgotPasswordLimit, validate(forgotPasswordValidation)], forgotPassword);
api.post('/restore-password', [validate(restorePasswordValidation)], restorePassword);

// Both paths do the same — /validate-token is the canonical form, /me is the alias
api.get('/validate-token', [validateToken, requireNoPending2FA], validateTokenController);
api.get('/me', [validateToken, requireNoPending2FA], validateTokenController);

api.get('/search', [], searchUser);

// 2FA endpoints — require a valid non-pending JWT
api.post('/2fa/setup', [validateToken, requireNoPending2FA], setup2FA);
api.post('/2fa/verify', [validateToken, requireNoPending2FA, totpLimit], verify2FA);
api.post('/2fa/disable', [validateToken, requireNoPending2FA, totpLimit], disable2FA);
api.post('/2fa/login-verify', [totpLimit], verifyTotpLogin);

// Internal service-to-service endpoints (protected by Basic Auth at router level)
api.get('/user-by-email/:email', findByEmail);
api.get('/user-by-id/:id', findById);
api.post('/internal/generate-guest-token', generateGuestToken);

// Token system-to-system: protegido por header `cron-secret`.
// Le permite a los microservicios obtener un JWT válido sin firmar local.
api.post('/system-token', [cronSecret], systemToken);

export default api;
