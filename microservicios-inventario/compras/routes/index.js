import { Router } from 'express';
import validateToken from '../middlewares/validate-token.js';

import * as suppliersCtrl from '../controllers/suppliers.controller.js';
import * as purchaseOrdersCtrl from '../controllers/purchase-orders.controller.js';
import * as customersCtrl from '../controllers/customers.controller.js';
import * as customerTxCtrl from '../controllers/customer-transactions.controller.js';
import { listByUser, provision, searchByUserId } from '../controllers/administrators.controller.js';

const api = Router();

// System / Administrators
// Endpoints internos consumidos por el backoffice (provisioning y lookup de
// administradores). Servidos por compras porque posee el modelo Admin.
api.get('/system/administrators/by-user/:user_id', listByUser);
api.get('/system/administrators/get-by-user-id/:user_id', searchByUserId);
api.post('/system/administrators/provision', provision);

// Suppliers
api.get('/suppliers', validateToken, suppliersCtrl.list);
api.get('/suppliers/:id', validateToken, suppliersCtrl.getById);
api.post('/suppliers', validateToken, suppliersCtrl.create);
api.put('/suppliers/:id', validateToken, suppliersCtrl.update);
api.delete('/suppliers/:id', validateToken, suppliersCtrl.remove);
api.patch('/suppliers/:id/toggle', validateToken, suppliersCtrl.toggle);

// Purchase Orders
api.get('/purchase-orders', validateToken, purchaseOrdersCtrl.list);
api.get('/purchase-orders/:id', validateToken, purchaseOrdersCtrl.getById);
api.post('/purchase-orders', validateToken, purchaseOrdersCtrl.create);
api.put('/purchase-orders/:id', validateToken, purchaseOrdersCtrl.updateStatus);
api.patch('/purchase-orders/:id/send', validateToken, purchaseOrdersCtrl.send);
api.patch('/purchase-orders/:id/receive', validateToken, purchaseOrdersCtrl.receive);
api.patch('/purchase-orders/:id/cancel', validateToken, purchaseOrdersCtrl.cancel);

// Customers
api.get('/customers', validateToken, customersCtrl.list);
api.get('/customers/:id', validateToken, customersCtrl.getById);
api.post('/customers', validateToken, customersCtrl.create);
api.put('/customers/:id', validateToken, customersCtrl.update);
api.delete('/customers/:id', validateToken, customersCtrl.remove);
api.patch('/customers/:id/toggle', validateToken, customersCtrl.toggle);

// Cuenta corriente del cliente
api.get('/customers/:id/transactions', validateToken, customerTxCtrl.list);
api.post('/customers/:id/transactions', validateToken, customerTxCtrl.create);

export default api;
