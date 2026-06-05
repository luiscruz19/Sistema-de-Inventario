import { Router } from 'express';
import validateToken from '../middlewares/validate-token.js';

import * as productsCtrl from '../controllers/products.controller.js';
import * as categoriesCtrl from '../controllers/categories.controller.js';
import * as priceListsCtrl from '../controllers/price-lists.controller.js';
import * as businessConfigCtrl from '../controllers/business-config.controller.js';
import * as branchesCtrl from '../controllers/branches.controller.js';
import * as batchesCtrl from '../controllers/batches.controller.js';
import * as serialsCtrl from '../controllers/serials.controller.js';

const api = Router();

// Business Config
api.get('/business-config', validateToken, businessConfigCtrl.get);
api.put('/business-config', validateToken, businessConfigCtrl.update);

// Branches
api.get('/branches', validateToken, branchesCtrl.list);
api.get('/branches/:id', validateToken, branchesCtrl.getById);
api.post('/branches', validateToken, branchesCtrl.create);
api.put('/branches/:id', validateToken, branchesCtrl.update);
api.delete('/branches/:id', validateToken, branchesCtrl.remove);
api.patch('/branches/:id/toggle', validateToken, branchesCtrl.toggle);

// Products
api.get('/products', validateToken, productsCtrl.list);
api.get('/products/:id', validateToken, productsCtrl.getById);
api.post('/products', validateToken, productsCtrl.create);
api.put('/products/:id', validateToken, productsCtrl.update);
api.delete('/products/:id', validateToken, productsCtrl.remove);
api.patch('/products/:id/toggle', validateToken, productsCtrl.toggle);

// Product Variants
api.get('/products/:productId/variants', validateToken, productsCtrl.listVariants);
api.post('/products/:productId/variants', validateToken, productsCtrl.createVariant);
api.put('/variants/:id', validateToken, productsCtrl.updateVariant);
api.delete('/variants/:id', validateToken, productsCtrl.removeVariant);

// Categories
api.get('/categories', validateToken, categoriesCtrl.list);
api.get('/categories/:id', validateToken, categoriesCtrl.getById);
api.post('/categories', validateToken, categoriesCtrl.create);
api.put('/categories/:id', validateToken, categoriesCtrl.update);
api.delete('/categories/:id', validateToken, categoriesCtrl.remove);

// Price Lists
api.get('/price-lists', validateToken, priceListsCtrl.list);
api.get('/price-lists/:id', validateToken, priceListsCtrl.getById);
api.post('/price-lists', validateToken, priceListsCtrl.create);
api.put('/price-lists/:id', validateToken, priceListsCtrl.update);
api.delete('/price-lists/:id', validateToken, priceListsCtrl.remove);

// Batches (lotes)
api.get('/batches', validateToken, batchesCtrl.list);
api.get('/batches/:id', validateToken, batchesCtrl.getById);
api.post('/batches', validateToken, batchesCtrl.create);
api.put('/batches/:id', validateToken, batchesCtrl.update);
api.delete('/batches/:id', validateToken, batchesCtrl.remove);

// Serials (números de serie)
api.get('/serials', validateToken, serialsCtrl.list);
api.get('/serials/:id', validateToken, serialsCtrl.getById);
api.post('/serials/bulk', validateToken, serialsCtrl.bulkCreate);
api.post('/serials', validateToken, serialsCtrl.create);
api.put('/serials/:id', validateToken, serialsCtrl.update);

export default api;
