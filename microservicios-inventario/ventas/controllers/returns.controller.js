import ReturnRequest from '../models/ReturnRequest.js';
import ReturnRequestItem from '../models/ReturnRequestItem.js';
import Sale from '../models/Sale.js';
import SaleItem from '../models/SaleItem.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Stock from '../models/Stock.js';
import StockMovement from '../models/StockMovement.js';
import sequelize from '../db/sequelize.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import { Op } from 'sequelize';

/**
 * Listar solicitudes de devolución (RMA)
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 20, estado, sale_id } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (estado) where.estado = estado;
        if (sale_id) where.sale_id = Number(sale_id);

        const { count, rows } = await ReturnRequest.findAndCountAll({
            where,
            include: [
                { model: Sale, as: 'sale', attributes: ['id', 'sale_number', 'total'] },
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
        console.error('returns list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener devoluciones' }));
    }
}

/**
 * Obtener devolución por ID (incluye items)
 */
export async function getById(req, res) {
    try {
        const returnRequest = await ReturnRequest.findOne({
            where: { id: req.params.id },
            include: [
                { model: Sale, as: 'sale', attributes: ['id', 'sale_number', 'total'] },
                { model: Customer, as: 'customer', attributes: ['id', 'name'], required: false },
                {
                    model: ReturnRequestItem, as: 'items',
                    include: [
                        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
                        { model: ProductVariant, as: 'variant', attributes: ['id', 'name'], required: false },
                    ],
                },
            ],
        });

        if (!returnRequest) {
            return res.status(404).json(errorMessage({ message: 'Devolución no encontrada' }));
        }

        return res.status(200).json(successMessage({ data: returnRequest }));
    } catch (error) {
        console.error('returns getById error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener devolución' }));
    }
}

/**
 * Crear solicitud de devolución (RMA)
 * Crea ReturnRequest + ReturnRequestItems y si reingresa_stock = true, actualiza stock
 */
export async function create(req, res) {
    const t = await sequelize.transaction();
    try {
        const { sale_id, customer_id, motivo, items, observaciones } = req.body;

        if (!sale_id || !motivo || !Array.isArray(items) || items.length === 0) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'sale_id, motivo e items son requeridos' }));
        }

        const sale = await Sale.findOne({ where: { id: sale_id } });
        if (!sale) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: 'Venta no encontrada' }));
        }

        // Validar items antes de crear
        for (const item of items) {
            if (!item.product_id || Number(item.cantidad) <= 0 || Number.isNaN(Number(item.cantidad))) {
                await t.rollback();
                return res.status(400).json(errorMessage({ message: 'Cada ítem requiere product_id y una cantidad mayor a 0' }));
            }
        }

        // Generar número RMA de forma atómica
        const count = await ReturnRequest.count({ transaction: t });
        const numero_rma = `RMA-${String(count + 1).padStart(5, '0')}`;

        const returnRequest = await ReturnRequest.create({
            sale_id,
            customer_id: customer_id || sale.customer_id || null,
            numero_rma,
            estado: 'pendiente',
            motivo,
            observaciones: observaciones || null,
        }, { transaction: t });

        // Solo se registran los items. El stock se reingresa al PROCESAR el RMA
        // (estado procesada), nunca al crearlo, para no devolver stock de RMAs sin aprobar.
        for (const item of items) {
            const { product_id, variant_id, cantidad, precio_unitario, motivo: itemMotivo, reingresa_stock = true } = item;
            const subtotal = Number(cantidad) * Number(precio_unitario || 0);

            await ReturnRequestItem.create({
                return_request_id: returnRequest.id,
                product_id,
                variant_id: variant_id || null,
                cantidad: Number(cantidad),
                precio_unitario: Number(precio_unitario || 0),
                subtotal,
                motivo: itemMotivo || null,
                reingresa_stock: Boolean(reingresa_stock),
                stock_reingresado: false,
            }, { transaction: t });
        }

        await t.commit();

        const full = await ReturnRequest.findOne({
            where: { id: returnRequest.id },
            include: [{ model: ReturnRequestItem, as: 'items' }],
        });

        return res.status(201).json(successMessage({ data: full, message: 'Devolución creada correctamente' }));
    } catch (error) {
        await t.rollback();
        console.error('returns create error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear devolución' }));
    }
}

/**
 * Aprobar devolución
 */
export async function approve(req, res) {
    try {
        const returnRequest = await ReturnRequest.findOne({ where: { id: req.params.id } });
        if (!returnRequest) return res.status(404).json(errorMessage({ message: 'Devolución no encontrada' }));
        if (returnRequest.estado !== 'pendiente') {
            return res.status(409).json(errorMessage({ message: `La devolución está en estado ${returnRequest.estado}` }));
        }

        await returnRequest.update({
            estado: 'aprobada',
            aprobado_por: req.user?.id || req.admin?.id || null,
            aprobado_at: new Date(),
        });

        return res.status(200).json(successMessage({ data: returnRequest, message: 'Devolución aprobada' }));
    } catch (error) {
        console.error('returns approve error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al aprobar devolución' }));
    }
}

/**
 * Rechazar devolución
 */
export async function reject(req, res) {
    try {
        const returnRequest = await ReturnRequest.findOne({ where: { id: req.params.id } });
        if (!returnRequest) return res.status(404).json(errorMessage({ message: 'Devolución no encontrada' }));
        if (returnRequest.estado !== 'pendiente') {
            return res.status(409).json(errorMessage({ message: `La devolución está en estado ${returnRequest.estado}` }));
        }

        const { observaciones } = req.body;

        await returnRequest.update({
            estado: 'rechazada',
            ...(observaciones && { observaciones }),
        });

        return res.status(200).json(successMessage({ data: returnRequest, message: 'Devolución rechazada' }));
    } catch (error) {
        console.error('returns reject error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al rechazar devolución' }));
    }
}

/**
 * Completar/procesar devolución
 */
export async function complete(req, res) {
    const t = await sequelize.transaction();
    try {
        const returnRequest = await ReturnRequest.findOne({
            where: { id: req.params.id },
            include: [
                { model: Sale, as: 'sale', attributes: ['id', 'branch_id'] },
                { model: ReturnRequestItem, as: 'items' },
            ],
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!returnRequest) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: 'Devolución no encontrada' }));
        }
        if (returnRequest.estado !== 'aprobada') {
            await t.rollback();
            return res.status(409).json(errorMessage({ message: `La devolución debe estar aprobada para procesarla (estado actual: ${returnRequest.estado})` }));
        }

        const { nota_credito_id, observaciones } = req.body;
        const branch_id = returnRequest.sale?.branch_id;

        // Reingresar stock de los items marcados, evitando doble reingreso.
        for (const item of returnRequest.items || []) {
            if (!item.reingresa_stock || item.stock_reingresado) continue;

            const product = await Product.findByPk(item.product_id, { transaction: t });
            if (!product?.track_stock || !branch_id) {
                await item.update({ stock_reingresado: true }, { transaction: t });
                continue;
            }

            const [stockRecord] = await Stock.findOrCreate({
                where: { product_id: item.product_id, variant_id: item.variant_id || null, branch_id },
                defaults: { product_id: item.product_id, variant_id: item.variant_id || null, branch_id, quantity: 0, reserved_quantity: 0 },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            const prevQty = Number(stockRecord.quantity);
            const newQty = prevQty + Number(item.cantidad);
            await stockRecord.update({ quantity: newQty }, { transaction: t });

            await StockMovement.create({
                product_id: item.product_id,
                variant_id: item.variant_id || null,
                branch_id,
                type: 'return',
                quantity: Number(item.cantidad),
                previous_stock: prevQty,
                new_stock: newQty,
                reference_type: 'return_request',
                reference_id: returnRequest.id,
                notes: `RMA ${returnRequest.numero_rma} - reingreso por devolución`,
                created_by: req.user?.id || req.admin?.id || null,
            }, { transaction: t });

            await item.update({ stock_reingresado: true }, { transaction: t });
        }

        await returnRequest.update({
            estado: 'procesada',
            ...(nota_credito_id && { nota_credito_id }),
            ...(observaciones && { observaciones }),
        }, { transaction: t });

        await t.commit();

        return res.status(200).json(successMessage({ data: returnRequest, message: 'Devolución procesada correctamente' }));
    } catch (error) {
        await t.rollback();
        console.error('returns complete error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al completar devolución' }));
    }
}
