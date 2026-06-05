import { Router } from 'express';
import validateToken from '../middlewares/validate-token.js';

import * as invoicesCtrl from '../controllers/invoices.controller.js';
import * as fiscalConfigCtrl from '../controllers/fiscal-config.controller.js';

const api = Router();

// ── Configuración fiscal ───────────────────────────────────────────────
api.get('/fiscal-config', validateToken, fiscalConfigCtrl.get);
api.put('/fiscal-config', validateToken, fiscalConfigCtrl.upsert);
api.put('/fiscal-config/arca', validateToken, fiscalConfigCtrl.upsertArcaCredentials);
api.post('/fiscal-config/arca/test', validateToken, fiscalConfigCtrl.testArca);

// ── Integraciones genéricas (credentials en variables de entorno) ──────
api.get('/fiscal-config/integrations', validateToken, fiscalConfigCtrl.listAllIntegrations);
api.put('/fiscal-config/integrations/:provider', validateToken, fiscalConfigCtrl.upsertIntegration);
api.delete('/fiscal-config/integrations/:provider', validateToken, fiscalConfigCtrl.deleteIntegration);

// ── Invoices ───────────────────────────────────────────────────────────
api.get('/invoices', validateToken, invoicesCtrl.list);
api.get('/invoices/last-authorized', validateToken, invoicesCtrl.lastAuthorized);
api.get('/invoices/:id', validateToken, invoicesCtrl.getById);
api.get('/invoices/:id/cae-status', validateToken, invoicesCtrl.caeStatus);
api.get('/invoices/:id/pdf', validateToken, invoicesCtrl.pdf);

api.post('/invoices', validateToken, invoicesCtrl.create);
api.post('/invoices/:id/credit-note', validateToken, invoicesCtrl.createCreditNote);
api.post('/invoices/:id/void', validateToken, invoicesCtrl.voidInvoice);
api.post('/invoices/:id/retry', validateToken, invoicesCtrl.retryCae);

export default api;
