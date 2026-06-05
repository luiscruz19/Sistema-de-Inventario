import { Router } from 'express';
import { remove, view, findByEmail, updatePassword } from '../../controllers/users.js';
import validateToken from '../../middlewares/validate-token.js';

const api = Router();

// Internal endpoint — service-to-service user resolution by email
api.get('/by-email/:email', findByEmail);

api.put('/update-password', [validateToken], updatePassword);
api.get('/:id', [validateToken], view);
api.delete('/:id', [validateToken], remove);

export default api;
