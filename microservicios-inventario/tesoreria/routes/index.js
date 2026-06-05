import { Router } from 'express';
import validateToken from '../middlewares/validate-token.js';

import * as bankAccountsCtrl from '../controllers/bank-accounts.controller.js';
import * as bankMovementsCtrl from '../controllers/bank-movements.controller.js';
import * as chequesCtrl from '../controllers/cheques.controller.js';

const api = Router();

// ── Bank Accounts (cuentas bancarias) ────────────────────────────────────
api.get('/bank-accounts', validateToken, bankAccountsCtrl.list);
api.get('/bank-accounts/:id', validateToken, bankAccountsCtrl.getById);
api.get('/bank-accounts/:id/movements', validateToken, bankAccountsCtrl.getMovements);
api.post('/bank-accounts', validateToken, bankAccountsCtrl.create);
api.put('/bank-accounts/:id', validateToken, bankAccountsCtrl.update);
api.delete('/bank-accounts/:id', validateToken, bankAccountsCtrl.remove);

// ── Bank Movements (movimientos bancarios) ────────────────────────────────
api.get('/bank-movements', validateToken, bankMovementsCtrl.list);
api.get('/bank-movements/:id', validateToken, bankMovementsCtrl.getById);
api.post('/bank-movements', validateToken, bankMovementsCtrl.create);

// ── Cheques ───────────────────────────────────────────────────────────────
api.get('/cheques', validateToken, chequesCtrl.list);
api.get('/cheques/:id', validateToken, chequesCtrl.getById);
api.post('/cheques', validateToken, chequesCtrl.create);
api.put('/cheques/:id', validateToken, chequesCtrl.update);
api.patch('/cheques/:id/cobrar', validateToken, chequesCtrl.cobrar);
api.patch('/cheques/:id/rechazar', validateToken, chequesCtrl.rechazar);

export default api;
