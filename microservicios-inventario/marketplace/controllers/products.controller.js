import MarketplaceProduct from '../models/MarketplaceProduct.js';
import MarketplaceConnection from '../models/MarketplaceConnection.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import { errorMessage, successMessage } from '../utils/messages.js';

/**
 * Listar productos publicados en marketplaces
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 20, connection_id, product_id, activa } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (connection_id) where.connection_id = Number(connection_id);
        if (product_id) where.product_id = Number(product_id);
        if (activa !== undefined) where.activa = activa === 'true';

        const { count, rows } = await MarketplaceProduct.findAndCountAll({
            where,
            include: [
                { model: MarketplaceConnection, as: 'connection', attributes: ['id', 'marketplace', 'nombre'] },
                { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
                { model: ProductVariant, as: 'variant', attributes: ['id', 'name'], required: false },
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
        console.error('marketplace-products list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener productos de marketplace' }));
    }
}

/**
 * Obtener producto de marketplace por ID
 */
export async function getById(req, res) {
    try {
        const item = await MarketplaceProduct.findOne({
            where: { id: req.params.id },
            include: [
                { model: MarketplaceConnection, as: 'connection' },
                { model: Product, as: 'product' },
                { model: ProductVariant, as: 'variant', required: false },
            ],
        });

        if (!item) {
            return res.status(404).json(errorMessage({ message: 'Producto de marketplace no encontrado' }));
        }

        return res.status(200).json(successMessage({ data: item }));
    } catch (error) {
        console.error('marketplace-products getById error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener producto de marketplace' }));
    }
}

/**
 * Crear publicación de producto en marketplace
 */
export async function create(req, res) {
    try {
        const {
            connection_id, product_id, variant_id,
            marketplace_item_id, titulo, precio_publicado, stock_publicado,
        } = req.body;

        if (!connection_id || !product_id || !marketplace_item_id || !titulo || precio_publicado === undefined) {
            return res.status(400).json(errorMessage({ message: 'connection_id, product_id, marketplace_item_id, titulo y precio_publicado son requeridos' }));
        }

        // Verificar que la conexión exista
        const connection = await MarketplaceConnection.findOne({ where: { id: connection_id } });
        if (!connection) {
            return res.status(404).json(errorMessage({ message: 'Conexión de marketplace no encontrada' }));
        }

        const item = await MarketplaceProduct.create({
            connection_id,
            product_id,
            variant_id: variant_id || null,
            marketplace_item_id,
            titulo,
            precio_publicado: Number(precio_publicado),
            stock_publicado: stock_publicado || 0,
            activa: true,
        });

        return res.status(201).json(successMessage({ data: item, message: 'Producto publicado en marketplace' }));
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json(errorMessage({ message: 'Ya existe una publicación con ese marketplace_item_id en esta conexión' }));
        }
        console.error('marketplace-products create error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear publicación en marketplace' }));
    }
}

/**
 * Actualizar publicación en marketplace
 */
export async function update(req, res) {
    try {
        const item = await MarketplaceProduct.findOne({ where: { id: req.params.id } });
        if (!item) {
            return res.status(404).json(errorMessage({ message: 'Producto de marketplace no encontrado' }));
        }

        const { titulo, precio_publicado, stock_publicado, activa } = req.body;

        await item.update({
            ...(titulo !== undefined && { titulo }),
            ...(precio_publicado !== undefined && { precio_publicado: Number(precio_publicado) }),
            ...(stock_publicado !== undefined && { stock_publicado: Number(stock_publicado) }),
            ...(activa !== undefined && { activa }),
        });

        return res.status(200).json(successMessage({ data: item, message: 'Publicación actualizada' }));
    } catch (error) {
        console.error('marketplace-products update error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al actualizar publicación' }));
    }
}

/**
 * Eliminar publicación (soft delete)
 */
export async function remove(req, res) {
    try {
        const item = await MarketplaceProduct.findOne({ where: { id: req.params.id } });
        if (!item) {
            return res.status(404).json(errorMessage({ message: 'Producto de marketplace no encontrado' }));
        }

        await item.destroy();
        return res.status(200).json(successMessage({ message: 'Publicación eliminada correctamente' }));
    } catch (error) {
        console.error('marketplace-products delete error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al eliminar publicación' }));
    }
}
