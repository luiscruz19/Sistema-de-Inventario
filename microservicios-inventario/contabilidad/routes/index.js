import { Router } from 'express';
import validateToken from '../middlewares/validate-token.js';

import * as chartOfAccountsCtrl from '../controllers/chart-of-accounts.controller.js';
import * as journalEntriesCtrl from '../controllers/journal-entries.controller.js';
import * as vatBookCtrl from '../controllers/vat-book.controller.js';
import * as taxSettingsCtrl from '../controllers/tax-settings.controller.js';
import * as taxWithholdingsCtrl from '../controllers/tax-withholdings.controller.js';

const api = Router();

// Plan de Cuentas
api.get('/chart-of-accounts', validateToken, chartOfAccountsCtrl.list);
api.get('/chart-of-accounts/:id', validateToken, chartOfAccountsCtrl.getById);
api.post('/chart-of-accounts', validateToken, chartOfAccountsCtrl.create);
api.put('/chart-of-accounts/:id', validateToken, chartOfAccountsCtrl.update);
api.delete('/chart-of-accounts/:id', validateToken, chartOfAccountsCtrl.remove);

// Asientos Contables
api.get('/journal-entries', validateToken, journalEntriesCtrl.list);
api.get('/journal-entries/:id', validateToken, journalEntriesCtrl.getById);
api.post('/journal-entries', validateToken, journalEntriesCtrl.create);

// Libro de IVA
api.get('/vat-book', validateToken, vatBookCtrl.list);
api.get('/vat-book/report', validateToken, vatBookCtrl.report);

// Configuración de Impuestos (IIBB/retenciones)
api.get('/tax-settings', validateToken, taxSettingsCtrl.list);
api.get('/tax-settings/:id', validateToken, taxSettingsCtrl.getById);
api.post('/tax-settings', validateToken, taxSettingsCtrl.create);
api.put('/tax-settings/:id', validateToken, taxSettingsCtrl.update);
api.delete('/tax-settings/:id', validateToken, taxSettingsCtrl.remove);

// Retenciones y Percepciones
api.get('/tax-withholdings/report', validateToken, taxWithholdingsCtrl.report);
api.get('/tax-withholdings', validateToken, taxWithholdingsCtrl.list);
api.get('/tax-withholdings/:id', validateToken, taxWithholdingsCtrl.getById);
api.post('/tax-withholdings', validateToken, taxWithholdingsCtrl.create);

export default api;
