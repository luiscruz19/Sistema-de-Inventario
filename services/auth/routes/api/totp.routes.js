import { Router } from 'express';
import { setup2FA, verify2FA, disable2FA, verifyTotpLogin } from '../../controllers/totp.js';
import validateToken from '../../middlewares/validate-token.js';
import requireNoPending2FA from '../../middlewares/require-no-pending-2fa.js';
import { totpLimit } from '../../middlewares/rate-limit.js';

// Standalone TOTP router — mounted at /totp if needed separately.
// The same endpoints are also registered under /auth/2fa in auth.routes.js.
const api = Router();

api.post('/setup', [validateToken, requireNoPending2FA], setup2FA);
api.post('/verify', [validateToken, requireNoPending2FA, totpLimit], verify2FA);
api.post('/disable', [validateToken, requireNoPending2FA, totpLimit], disable2FA);
api.post('/login-verify', [totpLimit], verifyTotpLogin);

export default api;
