import ProductSerial from '../models/ProductSerial.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import ProductBatch from '../models/ProductBatch.js';
import Customer from '../models/Customer.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import { Op } from 'sequelize';

/**
 * Listar números de serie con filtros
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 20, product_id, batch_id, estado } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (product_id) where.product_id = Number(product_id);
        if (batch_id) where.batch_id = Number(batch_id);
        if (estado) where.estado = estado;

        const { count, rows } = await ProductSerial.findAndCountAll({
            where,
            include: [
                { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
                { model: ProductVariant, as: 'variant', attributes: ['id', 'name'], required: false },
                { model: ProductBatch, as: 'batch', attributes: ['id', 'numero_lote'], required: false },
                { model: Customer, as: 'customer', attributes: ['id', 'name'], required: false },
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
        console.error('serials list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener números de serie' }));
    }
}

/**
 * Obtener número de serie por ID
 */
export async function getById(req, res) {
    try {
        const serial = await ProductSerial.findOne({
            where: { id: req.params.id },
            include: [
                { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
                { model: ProductVariant, as: 'variant', attributes: ['id', 'name'], required: false },
                { model: ProductBatch, as: 'batch', attributes: ['id', 'numero_lote'], required: false },
                { model: Customer, as: 'customer', attributes: ['id', 'name'], required: false },
            ],
        });

        if (!serial) {
            return res.status(404).json(errorMessage({ message: 'Número de serie no encontrado' }));
        }

        return res.status(200).json(successMessage({ data: serial }));
    } catch (error) {
        console.error('serials getById error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener número de serie' }));
    }
}

/**
 * Crear número de serie
 */
export async function create(req, res) {
    try {
        const {
            product_id, variant_id, numero_serie,
            batch_id, estado, garantia_hasta,
        } = req.body;

        if (!product_id || !numero_serie) {
            return res.status(400).json(errorMessage({ message: 'product_id y numero_serie son requeridos' }));
        }

        const product = await Product.findOne({ where: { id: product_id } });
        if (!product) {
            return res.status(404).json(errorMessage({ message: 'Producto no encontrado' }));
        }

        const serial = await ProductSerial.create({
            product_id,
            variant_id: variant_id || null,
            numero_serie,
            batch_id: batch_id || null,
            estado: estado || 'disponible',
            garantia_hasta: garantia_hasta || null,
        });

        return res.status(201).json(successMessage({ data: serial, message: 'Número de serie creado correctamente' }));
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json(errorMessage({ message: 'El número de serie ya existe' }));
        }
        console.error('serials create error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear número de serie' }));
    }
}

/**
 * Actualizar número de serie (cambiar estado, garantía, etc.)
 */
export async function update(req, res) {
    try {
        const serial = await ProductSerial.findOne({ where: { id: req.params.id } });
        if (!serial) {
            return res.status(404).json(errorMessage({ message: 'Número de serie no encontrado' }));
        }

        const {
            estado, garantia_hasta, customer_id,
            fecha_venta, sale_item_id, batch_id,
        } = req.body;

        await serial.update({
            ...(estado !== undefined && { estado }),
            ...(garantia_hasta !== undefined && { garantia_hasta }),
            ...(customer_id !== undefined && { customer_id }),
            ...(fecha_venta !== undefined && { fecha_venta }),
            ...(sale_item_id !== undefined && { sale_item_id }),
            ...(batch_id !== undefined && { batch_id }),
        });

        return res.status(200).json(successMessage({ data: serial, message: 'Número de serie actualizado' }));
    } catch (error) {
        console.error('serials update error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al actualizar número de serie' }));
    }
}

/**
 * Crear múltiples números de serie en bulk
 */
export async function bulkCreate(req, res) {
    try {
        const {
            product_id, variant_id, batch_id,
            numeros_serie, garantia_hasta,
        } = req.body;

        if (!product_id || !Array.isArray(numeros_serie) || numeros_serie.length === 0) {
            return res.status(400).json(errorMessage({ message: 'product_id y numeros_serie (array) son requeridos' }));
        }

        const product = await Product.findOne({ where: { id: product_id } });
        if (!product) {
            return res.status(404).json(errorMessage({ message: 'Producto no encontrado' }));
        }

        const records = numeros_serie.map(ns => ({
            product_id,
            variant_id: variant_id || null,
            numero_serie: ns,
            batch_id: batch_id || null,
            estado: 'disponible',
            garantia_hasta: garantia_hasta || null,
        }));

        const created = await ProductSerial.bulkCreate(records, {
            ignoreDuplicates: true,
        });

        return res.status(201).json(successMessage({
            data: { created: created.length, total: numeros_serie.length },
            message: `${created.length} números de serie creados`,
        }));
    } catch (error) {
        console.error('serials bulkCreate error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear números de serie en bulk' }));
    }
}
