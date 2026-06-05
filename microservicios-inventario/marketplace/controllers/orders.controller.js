import MarketplaceOrder from '../models/MarketplaceOrder.js';
import MarketplaceConnection from '../models/MarketplaceConnection.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import { Op } from 'sequelize';

const ESTADOS_VALIDOS = ['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'];

/**
 * Listar pedidos de marketplaces
 */
export async function list(req, res) {
    try {
        const {
            page = 1, limit = 20,
            connection_id, estado,
            fecha_desde, fecha_hasta,
        } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (connection_id) where.connection_id = Number(connection_id);
        if (estado) where.estado = estado;

        if (fecha_desde && fecha_hasta) {
            where.createdAt = { [Op.between]: [new Date(fecha_desde), new Date(fecha_hasta + 'T23:59:59')] };
        } else if (fecha_desde) {
            where.createdAt = { [Op.gte]: new Date(fecha_desde) };
        } else if (fecha_hasta) {
            where.createdAt = { [Op.lte]: new Date(fecha_hasta + 'T23:59:59') };
        }

        const { count, rows } = await MarketplaceOrder.findAndCountAll({
            where,
            include: [
                { model: MarketplaceConnection, as: 'connection', attributes: ['id', 'marketplace', 'nombre'] },
            ],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            data: rows,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / Number(limit)),
                currentPage: Number(page),
                perPage: Number(limit),
            },
        }));
    } catch (error) {
        console.error('marketplace-orders list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener pedidos de marketplace' }));
    }
}

/**
 * Obtener pedido por ID
 */
export async function getById(req, res) {
    try {
        const order = await MarketplaceOrder.findOne({
            where: { id: req.params.id },
            include: [
                { model: MarketplaceConnection, as: 'connection' },
            ],
        });

        if (!order) {
            return res.status(404).json(errorMessage({ message: 'Pedido de marketplace no encontrado' }));
        }

        return res.status(200).json(successMessage({ data: order }));
    } catch (error) {
        console.error('marketplace-orders getById error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener pedido de marketplace' }));
    }
}

/**
 * Actualizar estado del pedido
 * También permite vincular el pedido a una sale_id cuando se genera la venta en el sistema
 */
export async function updateStatus(req, res) {
    try {
        const order = await MarketplaceOrder.findOne({ where: { id: req.params.id } });
        if (!order) {
            return res.status(404).json(errorMessage({ message: 'Pedido de marketplace no encontrado' }));
        }

        const { estado, sale_id } = req.body;

        if (!estado) {
            return res.status(400).json(errorMessage({ message: 'El campo estado es requerido' }));
        }

        if (!ESTADOS_VALIDOS.includes(estado)) {
            return res.status(400).json(errorMessage({ message: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}` }));
        }

        await order.update({
            estado,
            ...(sale_id !== undefined && { sale_id }),
        });

        return res.status(200).json(successMessage({ data: order, message: 'Estado del pedido actualizado' }));
    } catch (error) {
        console.error('marketplace-orders updateStatus error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al actualizar estado del pedido' }));
    }
}
