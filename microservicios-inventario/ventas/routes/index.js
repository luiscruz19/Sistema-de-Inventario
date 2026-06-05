import { Router } from 'express';
import validateToken from '../middlewares/validate-token.js';

import * as salesCtrl from '../controllers/sales.controller.js';
import * as reportsCtrl from '../controllers/reports.controller.js';
import * as cashRegisterCtrl from '../controllers/cash-register.controller.js';
import * as creditNotesCtrl from '../controllers/credit-notes.controller.js';
import * as returnsCtrl from '../controllers/returns.controller.js';

const api = Router();

// ── Sales (POS) ───────────────────────────────────────────────────────────
api.get('/sales', validateToken, salesCtrl.list);
api.get('/sales/:id', validateToken, salesCtrl.getById);
api.post('/sales', validateToken, salesCtrl.create);
api.put('/sales/:id', validateToken, salesCtrl.updateStatus);
api.patch('/sales/:id/cancel', validateToken, salesCtrl.cancel);
api.patch('/sales/:id/refund', validateToken, salesCtrl.refund);

// ── Reports ───────────────────────────────────────────────────────────────
api.get('/reports/by-period', validateToken, reportsCtrl.byPeriod);
api.get('/reports/by-product', validateToken, reportsCtrl.byProduct);
api.get('/reports/by-branch', validateToken, reportsCtrl.byBranch);
api.get('/reports/margins', validateToken, reportsCtrl.margins);

// ── Cash Register ─────────────────────────────────────────────────────────
api.get('/cash-register', validateToken, cashRegisterCtrl.list);
api.get('/cash-register/current', validateToken, cashRegisterCtrl.getCurrent);
api.post('/cash-register/open', validateToken, cashRegisterCtrl.open);
api.post('/cash-register/close', validateToken, cashRegisterCtrl.closeByBranch);
api.patch('/cash-register/:id/close', validateToken, cashRegisterCtrl.close);

// ── Credit Notes (Notas de crédito/devoluciones) ─────────────────────────
api.get('/credit-notes', validateToken, creditNotesCtrl.list);
api.get('/credit-notes/:id', validateToken, creditNotesCtrl.getById);
api.post('/credit-notes', validateToken, creditNotesCtrl.create);
api.patch('/credit-notes/:id/apply', validateToken, creditNotesCtrl.apply);
api.patch('/credit-notes/:id/cancel', validateToken, creditNotesCtrl.cancel);

// ── Returns / RMA ─────────────────────────────────────────────────────────
api.get('/returns', validateToken, returnsCtrl.list);
api.get('/returns/:id', validateToken, returnsCtrl.getById);
api.post('/returns', validateToken, returnsCtrl.create);
api.patch('/returns/:id/approve', validateToken, returnsCtrl.approve);
api.patch('/returns/:id/reject', validateToken, returnsCtrl.reject);
api.patch('/returns/:id/complete', validateToken, returnsCtrl.complete);

export default api;
