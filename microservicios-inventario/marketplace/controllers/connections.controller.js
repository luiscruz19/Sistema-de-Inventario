import MarketplaceConnection from '../models/MarketplaceConnection.js';
import { errorMessage, successMessage } from '../utils/messages.js';

/**
 * Listar conexiones a marketplaces
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 20, marketplace, activa } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (marketplace) where.marketplace = marketplace;
        if (activa !== undefined) where.activa = activa === 'true';

        const { count, rows } = await MarketplaceConnection.findAndCountAll({
            where,
            order: [['marketplace', 'ASC']],
            limit: Number(limit),
            offset,
        });

        // Ocultar tokens en el listado
        const sanitized = rows.map(r => {
            const row = r.toJSON();
            delete row.access_token;
            delete row.refresh_token;
            return row;
        });

        return res.status(200).json(successMessage({
            data: sanitized,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / Number(limit)),
                currentPage: Number(page),
                perPage: Number(limit),
            },
        }));
    } catch (error) {
        console.error('marketplace-connections list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener conexiones de marketplace' }));
    }
}

/**
 * Obtener conexión por ID
 */
export async function getById(req, res) {
    try {
        const connection = await MarketplaceConnection.findOne({
            where: { id: req.params.id },
        });

        if (!connection) {
            return res.status(404).json(errorMessage({ message: 'Conexión de marketplace no encontrada' }));
        }

        const row = connection.toJSON();
        delete row.access_token;
        delete row.refresh_token;

        return res.status(200).json(successMessage({ data: row }));
    } catch (error) {
        console.error('marketplace-connections getById error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener conexión de marketplace' }));
    }
}

/**
 * Crear conexión a marketplace
 */
export async function create(req, res) {
    try {
        const {
            marketplace, nombre, access_token, refresh_token,
            token_expira_at, seller_id, shop_url,
        } = req.body;

        if (!marketplace || !nombre) {
            return res.status(400).json(errorMessage({ message: 'marketplace y nombre son requeridos' }));
        }

        const connection = await MarketplaceConnection.create({
            marketplace,
            nombre,
            access_token: access_token || null,
            refresh_token: refresh_token || null,
            token_expira_at: token_expira_at || null,
            seller_id: seller_id || null,
            shop_url: shop_url || null,
            activa: true,
        });

        const row = connection.toJSON();
        delete row.access_token;
        delete row.refresh_token;

        return res.status(201).json(successMessage({ data: row, message: 'Conexión de marketplace creada correctamente' }));
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json(errorMessage({ message: 'Ya existe una conexión para ese marketplace' }));
        }
        console.error('marketplace-connections create error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear conexión de marketplace' }));
    }
}

/**
 * Actualizar conexión a marketplace
 */
export async function update(req, res) {
    try {
        const connection = await MarketplaceConnection.findOne({ where: { id: req.params.id } });
        if (!connection) {
            return res.status(404).json(errorMessage({ message: 'Conexión de marketplace no encontrada' }));
        }

        const {
            nombre, access_token, refresh_token,
            token_expira_at, seller_id, shop_url, activa,
        } = req.body;

        await connection.update({
            ...(nombre !== undefined && { nombre }),
            ...(access_token !== undefined && { access_token }),
            ...(refresh_token !== undefined && { refresh_token }),
            ...(token_expira_at !== undefined && { token_expira_at }),
            ...(seller_id !== undefined && { seller_id }),
            ...(shop_url !== undefined && { shop_url }),
            ...(activa !== undefined && { activa }),
        });

        const row = connection.toJSON();
        delete row.access_token;
        delete row.refresh_token;

        return res.status(200).json(successMessage({ data: row, message: 'Conexión de marketplace actualizada' }));
    } catch (error) {
        console.error('marketplace-connections update error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al actualizar conexión de marketplace' }));
    }
}

/**
 * Eliminar conexión (soft delete)
 */
export async function remove(req, res) {
    try {
        const connection = await MarketplaceConnection.findOne({ where: { id: req.params.id } });
        if (!connection) {
            return res.status(404).json(errorMessage({ message: 'Conexión de marketplace no encontrada' }));
        }

        await connection.destroy();
        return res.status(200).json(successMessage({ message: 'Conexión de marketplace eliminada correctamente' }));
    } catch (error) {
        console.error('marketplace-connections delete error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al eliminar conexión de marketplace' }));
    }
}

/**
 * Sincronizar conexión — actualiza último sync y estado
 */
export async function sync(req, res) {
    try {
        const connection = await MarketplaceConnection.findOne({ where: { id: req.params.id } });
        if (!connection) {
            return res.status(404).json(errorMessage({ message: 'Conexión de marketplace no encontrada' }));
        }

        if (!connection.activa) {
            return res.status(409).json(errorMessage({ message: 'La conexión está desactivada' }));
        }

        await connection.update({
            ultimo_sync_at: new Date(),
            sync_status: 'synced',
        });

        const row = connection.toJSON();
        delete row.access_token;
        delete row.refresh_token;

        return res.status(200).json(successMessage({ data: row, message: 'Sincronización registrada' }));
    } catch (error) {
        console.error('marketplace-connections sync error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al sincronizar conexión' }));
    }
}
