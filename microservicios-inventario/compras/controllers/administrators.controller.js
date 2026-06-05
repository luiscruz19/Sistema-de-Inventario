import Admin from '../models/Admin.js';

/**
 * GET /system/administrators/get-by-user-id/:user_id
 * Retorna el registro de administrador para el user_id dado. Usado por el
 * validate-token del backoffice para incluir type/name del admin en el payload
 * de respuesta.
 */
export async function searchByUserId(req, res) {
    try {
        const { user_id } = req.params;
        if (!user_id || isNaN(Number(user_id))) {
            return res.status(400).json({ status: 0, message: 'user_id requerido' });
        }
        const record = await Admin.findOne({ where: { user_id: Number(user_id) } });
        if (!record) {
            return res.status(200).json({ status: 0, message: 'No encontrado' });
        }
        return res.json({ status: 1, data: record.dataValues });
    } catch (error) {
        console.error('searchByUserId', { error });
        return res.status(500).json({ status: 0, message: 'Error interno' });
    }
}

/**
 * GET /system/administrators/by-user/:user_id
 * Retorna los registros de administrador para el user_id dado.
 * Usado en el login del backoffice.
 */
export async function listByUser(req, res) {
    try {
        const { user_id } = req.params;
        if (!user_id || isNaN(Number(user_id))) {
            return res.status(400).json({ status: 0, message: 'user_id requerido' });
        }
        const records = await Admin.findAll({
            where: { user_id: Number(user_id) },
            attributes: ['client_name'],
        });
        return res.json({ status: 1, data: records.map(r => r.dataValues) });
    } catch (error) {
        console.error('listByUser', { error });
        return res.status(500).json({ status: 0, message: 'Error interno' });
    }
}

/**
 * POST /system/administrators/provision
 * Crea el registro de administrador en la DB del producto.
 * Idempotente: si ya existe el user_id no lo duplica.
 */
export async function provision(req, res) {
    try {
        const { user_id, name, client_name } = req.body;
        if (!user_id || !name) {
            return res.status(400).json({ status: 0, message: 'user_id y name son requeridos' });
        }
        const [record, created] = await Admin.findOrCreate({
            where: { user_id: Number(user_id) },
            defaults: {
                user_id: Number(user_id),
                name,
                client_name: client_name || null,
                phone: '',
                created_by: 0,
            },
        });
        return res.json({ status: 1, data: { id: record.id, created } });
    } catch (error) {
        console.error('provision', { error });
        return res.status(500).json({ status: 0, message: 'Error interno' });
    }
}
