import { Router } from 'express';
import validateToken from '../middlewares/validate-token.js';

import * as connectionsCtrl from '../controllers/connections.controller.js';
import * as mpProductsCtrl from '../controllers/products.controller.js';
import * as ordersCtrl from '../controllers/orders.controller.js';

const api = Router();

// Marketplace Connections
api.get('/marketplace/connections', validateToken, connectionsCtrl.list);
api.get('/marketplace/connections/:id', validateToken, connectionsCtrl.getById);
api.post('/marketplace/connections', validateToken, connectionsCtrl.create);
api.put('/marketplace/connections/:id', validateToken, connectionsCtrl.update);
api.delete('/marketplace/connections/:id', validateToken, connectionsCtrl.remove);
api.patch('/marketplace/connections/:id/sync', validateToken, connectionsCtrl.sync);

// Marketplace Products
api.get('/marketplace/products', validateToken, mpProductsCtrl.list);
api.get('/marketplace/products/:id', validateToken, mpProductsCtrl.getById);
api.post('/marketplace/products', validateToken, mpProductsCtrl.create);
api.put('/marketplace/products/:id', validateToken, mpProductsCtrl.update);
api.delete('/marketplace/products/:id', validateToken, mpProductsCtrl.remove);

// Marketplace Orders
api.get('/marketplace/orders', validateToken, ordersCtrl.list);
api.get('/marketplace/orders/:id', validateToken, ordersCtrl.getById);
api.patch('/marketplace/orders/:id/status', validateToken, ordersCtrl.updateStatus);

export default api;
