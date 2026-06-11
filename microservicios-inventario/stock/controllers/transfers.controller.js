import StockTransfer from '../models/StockTransfer.js';
import StockTransferItem from '../models/StockTransferItem.js';
import Stock from '../models/Stock.js';
import StockMovement from '../models/StockMovement.js';
import Branch from '../models/Branch.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import sequelize from '../db/sequelize.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

export async function list(req, res) {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};
        if (status) where.status = status;

        const { count, rows } = await StockTransfer.findAndCountAll({
            where,
            include: [
                { model: Branch, as: 'fromBranch', attributes: ['id', 'name'] },
                { model: Branch, as: 'toBranch', attributes: ['id', 'name'] },
            ],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            message: messages.entities.stockTransfer.success.list,
            extra: {
                data: rows,
                pagination: {
                    totalItems: count,
                    totalPages: Math.ceil(count / Number(limit)),
                    currentPage: Number(page),
                    perPage: Number(limit),
                }
            }
        }));
    } catch (error) {
        console.error('Error listing transfers:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function getById(req, res) {
    try {
        const transfer = await StockTransfer.findOne({
            where: { id: req.params.id },
            include: [
                { model: Branch, as: 'fromBranch' },
                { model: Branch, as: 'toBranch' },
                {
                    model: StockTransferItem, as: 'items',
                    include: [
                        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
                        { model: ProductVariant, as: 'variant', attributes: ['id', 'name'], required: false },
                    ]
                },
            ],
        });
        if (!transfer) {
            return res.status(404).json(errorMessage({ message: messages.entities.stockTransfer.errors.notFound }));
        }
        return res.status(200).json(successMessage({
            message: messages.entities.stockTransfer.success.fetch,
            extra: { data: transfer }
        }));
    } catch (error) {
        console.error('Error getting transfer:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Crear transferencia: descuenta stock de origen con movimiento transfer_out
 */
export async function create(req, res) {
    const t = await sequelize.transaction();
    try {
        const { from_branch_id, to_branch_id, items, notes } = req.body;

        if (!from_branch_id || !to_branch_id) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'from_branch_id y to_branch_id son requeridos' }));
        }
        if (Number(from_branch_id) === Number(to_branch_id)) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'La sucursal de origen y destino no pueden ser la misma' }));
        }
        if (!Array.isArray(items) || items.length === 0) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'La transferencia debe tener al menos un ítem' }));
        }
        for (const item of items) {
            if (!item.product_id || Number(item.quantity) <= 0 || Number.isNaN(Number(item.quantity))) {
                await t.rollback();
                return res.status(400).json(errorMessage({ message: 'Cada ítem requiere product_id y una cantidad mayor a 0' }));
            }
        }

        const transfer = await StockTransfer.create({
            from_branch_id,
            to_branch_id,
            status: 'in_transit',
            notes,
            created_by: req.user?.id || null,
        }, { transaction: t });

        for (const item of items) {
            await StockTransferItem.create({
                transfer_id: transfer.id,
                product_id: item.product_id,
                variant_id: item.variant_id || null,
                quantity_sent: item.quantity,
                quantity_received: 0,
            }, { transaction: t });

            // Descontar stock de sucursal origen
            const [stockRecord] = await Stock.findOrCreate({
                where: { product_id: item.product_id, variant_id: item.variant_id || null, branch_id: from_branch_id },
                defaults: { product_id: item.product_id, variant_id: item.variant_id || null, branch_id: from_branch_id, quantity: 0, reserved_quantity: 0 },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            const prevQty = Number(stockRecord.quantity);

            // Validar stock suficiente en origen
            if (prevQty < Number(item.quantity)) {
                await t.rollback();
                return res.status(400).json(errorMessage({
                    message: `Stock insuficiente en sucursal origen para el producto ${item.product_id}. Disponible: ${prevQty}`
                }));
            }

            const newQty = prevQty - Number(item.quantity);
            await stockRecord.update({ quantity: newQty }, { transaction: t });

            await StockMovement.create({
                product_id: item.product_id,
                variant_id: item.variant_id || null,
                branch_id: from_branch_id,
                type: 'transfer_out',
                quantity: -Number(item.quantity),
                previous_stock: prevQty,
                new_stock: newQty,
                reference_type: 'transfer',
                reference_id: transfer.id,
                created_by: req.user?.id || null,
            }, { transaction: t });
        }

        await t.commit();

        return res.status(201).json(successMessage({
            message: messages.entities.stockTransfer.success.created,
            extra: { data: transfer }
        }));
    } catch (error) {
        await t.rollback();
        console.error('Error creating transfer:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Recibir transferencia: incrementa stock en destino con movimiento transfer_in
 */
export async function receive(req, res) {
    const t = await sequelize.transaction();
    try {
        const transfer = await StockTransfer.findOne({
            where: { id: req.params.id },
            include: [{ model: StockTransferItem, as: 'items' }],
        });

        if (!transfer) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: messages.entities.stockTransfer.errors.notFound }));
        }
        if (transfer.status === 'received') {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: messages.entities.stockTransfer.errors.alreadyReceived }));
        }
        if (transfer.status === 'cancelled') {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: messages.entities.stockTransfer.errors.alreadyCancelled }));
        }

        const receivedItems = req.body.items || [];

        for (const transferItem of transfer.items) {
            const receivedMatch = receivedItems.find(ri => ri.id === transferItem.id);
            const qtyReceived = receivedMatch ? Number(receivedMatch.quantity_received) : Number(transferItem.quantity_sent);

            await transferItem.update({ quantity_received: qtyReceived }, { transaction: t });

            // Incrementar stock en sucursal destino
            const [stockRecord] = await Stock.findOrCreate({
                where: { product_id: transferItem.product_id, variant_id: transferItem.variant_id, branch_id: transfer.to_branch_id },
                defaults: { product_id: transferItem.product_id, variant_id: transferItem.variant_id, branch_id: transfer.to_branch_id, quantity: 0, reserved_quantity: 0 },
                transaction: t,
            });

            const prevQty = Number(stockRecord.quantity);
            const newQty = prevQty + qtyReceived;
            await stockRecord.update({ quantity: newQty }, { transaction: t });

            await StockMovement.create({
                product_id: transferItem.product_id,
                variant_id: transferItem.variant_id,
                branch_id: transfer.to_branch_id,
                type: 'transfer_in',
                quantity: qtyReceived,
                previous_stock: prevQty,
                new_stock: newQty,
                reference_type: 'transfer',
                reference_id: transfer.id,
                created_by: req.user?.id || null,
            }, { transaction: t });

            // Recepción parcial: la diferencia (enviado - recibido) vuelve al origen
            // para no perder inventario (el origen se debitó el total enviado al crear).
            const shortfall = Number(transferItem.quantity_sent) - qtyReceived;
            if (shortfall > 0) {
                const [originStock] = await Stock.findOrCreate({
                    where: { product_id: transferItem.product_id, variant_id: transferItem.variant_id, branch_id: transfer.from_branch_id },
                    defaults: { product_id: transferItem.product_id, variant_id: transferItem.variant_id, branch_id: transfer.from_branch_id, quantity: 0, reserved_quantity: 0 },
                    transaction: t,
                });
                const oPrev = Number(originStock.quantity);
                const oNew = oPrev + shortfall;
                await originStock.update({ quantity: oNew }, { transaction: t });
                await StockMovement.create({
                    product_id: transferItem.product_id,
                    variant_id: transferItem.variant_id,
                    branch_id: transfer.from_branch_id,
                    type: 'transfer_in',
                    quantity: shortfall,
                    previous_stock: oPrev,
                    new_stock: oNew,
                    reference_type: 'transfer',
                    reference_id: transfer.id,
                    created_by: req.user?.id || null,
                }, { transaction: t });
            }
        }

        await transfer.update({
            status: 'received',
            received_by: req.user?.id || null,
            received_at: new Date(),
        }, { transaction: t });

        await t.commit();

        return res.status(200).json(successMessage({
            message: messages.entities.stockTransfer.success.received,
            extra: { data: transfer }
        }));
    } catch (error) {
        await t.rollback();
        console.error('Error receiving transfer:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Cancelar transferencia: devuelve stock a origen
 */
export async function cancel(req, res) {
    const t = await sequelize.transaction();
    try {
        const transfer = await StockTransfer.findOne({
            where: { id: req.params.id },
            include: [{ model: StockTransferItem, as: 'items' }],
        });

        if (!transfer) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: messages.entities.stockTransfer.errors.notFound }));
        }
        if (transfer.status === 'received') {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: messages.entities.stockTransfer.errors.alreadyReceived }));
        }
        if (transfer.status === 'cancelled') {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: messages.entities.stockTransfer.errors.alreadyCancelled }));
        }

        // Devolver stock a sucursal origen
        for (const item of transfer.items) {
            const stockRecord = await Stock.findOne({
                where: { product_id: item.product_id, variant_id: item.variant_id, branch_id: transfer.from_branch_id },
                transaction: t,
            });

            if (stockRecord) {
                const prevQty = Number(stockRecord.quantity);
                const newQty = prevQty + Number(item.quantity_sent);
                await stockRecord.update({ quantity: newQty }, { transaction: t });

                await StockMovement.create({
                    product_id: item.product_id,
                    variant_id: item.variant_id,
                    branch_id: transfer.from_branch_id,
                    type: 'adjustment',
                    quantity: Number(item.quantity_sent),
                    previous_stock: prevQty,
                    new_stock: newQty,
                    reference_type: 'transfer',
                    reference_id: transfer.id,
                    notes: 'Devolución por cancelación de transferencia',
                    created_by: req.user?.id || null,
                }, { transaction: t });
            }
        }

        await transfer.update({ status: 'cancelled' }, { transaction: t });
        await t.commit();

        return res.status(200).json(successMessage({
            message: messages.entities.stockTransfer.success.cancelled,
            extra: { data: transfer }
        }));
    } catch (error) {
        await t.rollback();
        console.error('Error cancelling transfer:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Actualizar transferencia vía PUT — delega a receive o cancel según status recibido
 */
export async function updateStatus(req, res) {
    const { status } = req.body;
    if (status === 'cancelled') return cancel(req, res);
    if (status === 'received') return receive(req, res);
    try {
        const transfer = await StockTransfer.findOne({ where: { id: req.params.id } });
        if (!transfer) {
            return res.status(404).json(errorMessage({ message: messages.entities.stockTransfer.errors.notFound }));
        }
        await transfer.update({ status });
        return res.status(200).json(successMessage({
            message: 'Transferencia actualizada',
            extra: { data: transfer }
        }));
    } catch (error) {
        console.error('Error updating transfer status:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}
