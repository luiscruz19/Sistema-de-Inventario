import { Router } from 'express';
import { batch, validate, view, remove, findByEmail, restore, updateEmail } from '../../controllers/admin.js';
import validateToken from '../../middlewares/validate-token.js';
import requireAdmin from '../../middlewares/admin.js';

const api = Router();

api.post('/batch', [validateToken, requireAdmin], batch);
api.put('/validate-user/:id', [validateToken, requireAdmin], validate);
api.get('/users/by-email', [validateToken, requireAdmin], findByEmail);
api.get('/users/:id', [validateToken, requireAdmin], view);
api.delete('/users/:id', [validateToken, requireAdmin], remove);
api.patch('/users/:id/email', [validateToken, requireAdmin], updateEmail);
api.post('/users/:id/restore', [validateToken, requireAdmin], restore);

export default api;
