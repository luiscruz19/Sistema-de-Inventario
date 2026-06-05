import { Router } from 'express';
import validateToken from '../middlewares/validate-token.js';
import * as kpisCtrl from '../controllers/kpis.controller.js';

const api = Router();

api.get('/kpis/sales-vs-prev-month', validateToken, kpisCtrl.salesVsPrevMonth);
api.get('/kpis/receivables-aging', validateToken, kpisCtrl.receivablesAging);
api.get('/kpis/top-customers', validateToken, kpisCtrl.topCustomers);
api.get('/kpis/top-products', validateToken, kpisCtrl.topProducts);
api.get('/kpis/available-cash', validateToken, kpisCtrl.availableCash);
api.get('/kpis/stock-alerts', validateToken, kpisCtrl.stockAlerts);
api.get('/kpis/invoices-summary', validateToken, kpisCtrl.invoicesSummary);

export default api;
