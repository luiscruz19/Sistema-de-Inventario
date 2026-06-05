import { Router } from 'express';
import validateToken from '../middlewares/validate-token.js';

import * as stockCtrl from '../controllers/stock.controller.js';
import * as transfersCtrl from '../controllers/transfers.controller.js';

const api = Router();

// Stock
api.get('/stock', validateToken, stockCtrl.list);
api.post('/stock/adjust', validateToken, stockCtrl.adjust);

// Movements
api.get('/movements', validateToken, stockCtrl.listMovements);

// Alerts
api.get('/alerts', validateToken, stockCtrl.lowStockAlerts);

// Transfers
api.get('/transfers', validateToken, transfersCtrl.list);
api.get('/transfers/:id', validateToken, transfersCtrl.getById);
api.post('/transfers', validateToken, transfersCtrl.create);
api.put('/transfers/:id', validateToken, transfersCtrl.updateStatus);
api.patch('/transfers/:id/receive', validateToken, transfersCtrl.receive);
api.patch('/transfers/:id/cancel', validateToken, transfersCtrl.cancel);

export default api;
