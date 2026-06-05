import ProductBatch from '../models/ProductBatch.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Supplier from '../models/Supplier.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import { Op } from 'sequelize';

/**
 * Listar lotes con filtros
 */
export async function list(req, res) {
    try {
        const {
            page = 1, limit = 20,
            product_id, variant_id,
            vencimiento_desde, vencimiento_hasta,
        } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (product_id) where.product_id = Number(product_id);
        if (variant_id) where.variant_id = Number(variant_id);

        if (vencimiento_desde && vencimiento_hasta) {
            where.fecha_vencimiento = { [Op.between]: [vencimiento_desde, vencimiento_hasta] };
        } else if (vencimiento_desde) {
            where.fecha_vencimiento = { [Op.gte]: vencimiento_desde };
        } else if (vencimiento_hasta) {
            where.fecha_vencimiento = { [Op.lte]: vencimiento_hasta };
        }

        const { count, rows } = await ProductBatch.findAndCountAll({
            where,
            include: [
                { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
                { model: ProductVariant, as: 'variant', attributes: ['id', 'name'], required: false },
                { model: Supplier, as: 'proveedor', attributes: ['id', 'name'], required: false },
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
        console.error('batches list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener lotes' }));
    }
}

/**
 * Obtener lote por ID
 */
export async function getById(req, res) {
    try {
        const batch = await ProductBatch.findOne({
            where: { id: req.params.id },
            include: [
                { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
                { model: ProductVariant, as: 'variant', attributes: ['id', 'name'], required: false },
                { model: Supplier, as: 'proveedor', attributes: ['id', 'name'], required: false },
            ],
        });

        if (!batch) {
            return res.status(404).json(errorMessage({ message: 'Lote no encontrado' }));
        }

        return res.status(200).json(successMessage({ data: batch }));
    } catch (error) {
        console.error('batches getById error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener lote' }));
    }
}

/**
 * Crear lote
 */
export async function create(req, res) {
    try {
        const {
            product_id, variant_id, numero_lote,
            fecha_vencimiento, fecha_fabricacion,
            cantidad_inicial, proveedor_id, observaciones,
        } = req.body;

        if (!product_id || !numero_lote || cantidad_inicial === undefined) {
            return res.status(400).json(errorMessage({ message: 'product_id, numero_lote y cantidad_inicial son requeridos' }));
        }

        const product = await Product.findOne({ where: { id: product_id } });
        if (!product) {
            return res.status(404).json(errorMessage({ message: 'Producto no encontrado' }));
        }

        const batch = await ProductBatch.create({
            product_id,
            variant_id: variant_id || null,
            numero_lote,
            fecha_vencimiento: fecha_vencimiento || null,
            fecha_fabricacion: fecha_fabricacion || null,
            cantidad_inicial: Number(cantidad_inicial),
            cantidad_actual: Number(cantidad_inicial),
            proveedor_id: proveedor_id || null,
            observaciones: observaciones || null,
        });

        return res.status(201).json(successMessage({ data: batch, message: 'Lote creado correctamente' }));
    } catch (error) {
        console.error('batches create error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear lote' }));
    }
}

/**
 * Actualizar lote
 */
export async function update(req, res) {
    try {
        const batch = await ProductBatch.findOne({ where: { id: req.params.id } });
        if (!batch) {
            return res.status(404).json(errorMessage({ message: 'Lote no encontrado' }));
        }

        const {
            numero_lote, fecha_vencimiento, fecha_fabricacion,
            cantidad_actual, proveedor_id, observaciones,
        } = req.body;

        await batch.update({
            ...(numero_lote !== undefined && { numero_lote }),
            ...(fecha_vencimiento !== undefined && { fecha_vencimiento }),
            ...(fecha_fabricacion !== undefined && { fecha_fabricacion }),
            ...(cantidad_actual !== undefined && { cantidad_actual: Number(cantidad_actual) }),
            ...(proveedor_id !== undefined && { proveedor_id }),
            ...(observaciones !== undefined && { observaciones }),
        });

        return res.status(200).json(successMessage({ data: batch, message: 'Lote actualizado' }));
    } catch (error) {
        console.error('batches update error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al actualizar lote' }));
    }
}

/**
 * Eliminar lote (soft delete)
 */
export async function remove(req, res) {
    try {
        const batch = await ProductBatch.findOne({ where: { id: req.params.id } });
        if (!batch) {
            return res.status(404).json(errorMessage({ message: 'Lote no encontrado' }));
        }

        await batch.destroy();
        return res.status(200).json(successMessage({ message: 'Lote eliminado correctamente' }));
    } catch (error) {
        console.error('batches delete error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al eliminar lote' }));
    }
}
