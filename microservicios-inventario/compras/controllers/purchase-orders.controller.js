import PurchaseOrder from '../models/PurchaseOrder.js';
import PurchaseOrderItem from '../models/PurchaseOrderItem.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Supplier from '../models/Supplier.js';
import Branch from '../models/Branch.js';
import Stock from '../models/Stock.js';
import StockMovement from '../models/StockMovement.js';
import sequelize from '../db/sequelize.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

export async function list(req, res) {
    try {
        const { page = 1, limit = 20, status, supplier_id } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (status) where.status = status;
        if (supplier_id) where.supplier_id = Number(supplier_id);

        const { count, rows } = await PurchaseOrder.findAndCountAll({
            where,
            include: [
                { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
            ],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            message: messages.entities.purchaseOrder.success.list,
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
        console.error('Error listing purchase orders:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function getById(req, res) {
    try {
        const po = await PurchaseOrder.findOne({
            where: { id: req.params.id },
            include: [
                { model: Supplier, as: 'supplier' },
                { model: Branch, as: 'branch' },
                {
                    model: PurchaseOrderItem, as: 'items',
                    include: [
                        { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'unit'] },
                        { model: ProductVariant, as: 'variant', attributes: ['id', 'name'], required: false },
                    ]
                },
            ],
        });

        if (!po) {
            return res.status(404).json(errorMessage({ message: messages.entities.purchaseOrder.errors.notFound }));
        }

        return res.status(200).json(successMessage({
            message: messages.entities.purchaseOrder.success.fetch,
            extra: { data: po }
        }));
    } catch (error) {
        console.error('Error getting purchase order:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function create(req, res) {
    try {
        const { supplier_id, branch_id, items, notes, expected_date } = req.body;

        let subtotal = 0;
        const poItems = [];

        for (const item of items) {
            const itemSubtotal = Number(item.unit_cost) * Number(item.quantity_ordered);
            subtotal += itemSubtotal;
            poItems.push({
                product_id: item.product_id,
                variant_id: item.variant_id || null,
                quantity_ordered: item.quantity_ordered,
                quantity_received: 0,
                unit_cost: item.unit_cost,
                subtotal: Number(itemSubtotal.toFixed(2)),
            });
        }

        const taxAmount = subtotal * 0.21; // Default tax rate
        const total = subtotal + taxAmount;

        const po = await PurchaseOrder.create({
            supplier_id,
            branch_id,
            status: 'draft',
            subtotal: Number(subtotal.toFixed(2)),
            tax_amount: Number(taxAmount.toFixed(2)),
            total: Number(total.toFixed(2)),
            notes,
            expected_date,
            created_by: req.user?.id || null,
        });

        for (const item of poItems) {
            await PurchaseOrderItem.create({ ...item, purchase_order_id: po.id });
        }

        return res.status(201).json(successMessage({
            message: messages.entities.purchaseOrder.success.created,
            extra: { data: po }
        }));
    } catch (error) {
        console.error('Error creating purchase order:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Enviar orden de compra al proveedor (cambiar status a sent)
 */
export async function send(req, res) {
    try {
        const po = await PurchaseOrder.findOne({ where: { id: req.params.id } });
        if (!po) {
            return res.status(404).json(errorMessage({ message: messages.entities.purchaseOrder.errors.notFound }));
        }
        await po.update({ status: 'sent' });
        return res.status(200).json(successMessage({
            message: messages.entities.purchaseOrder.success.sent,
            extra: { data: po }
        }));
    } catch (error) {
        console.error('Error sending purchase order:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Recibir mercadería — incrementa stock, crea movimientos, actualiza quantity_received
 */
export async function receive(req, res) {
    const t = await sequelize.transaction();
    try {
        const po = await PurchaseOrder.findOne({
            where: { id: req.params.id },
            include: [{ model: PurchaseOrderItem, as: 'items' }],
        });

        if (!po) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: messages.entities.purchaseOrder.errors.notFound }));
        }
        if (po.status === 'cancelled') {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: messages.entities.purchaseOrder.errors.alreadyCancelled }));
        }
        if (po.status === 'received') {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: messages.entities.purchaseOrder.errors.alreadyReceived }));
        }

        const receivedItems = req.body.items || [];
        let allFullyReceived = true;

        for (const poItem of po.items) {
            const receivedMatch = receivedItems.find(ri => ri.id === poItem.id);
            const qtyReceiving = receivedMatch ? Number(receivedMatch.quantity_received) : Number(poItem.quantity_ordered);
            const totalReceived = Number(poItem.quantity_received) + qtyReceiving;

            await poItem.update({ quantity_received: totalReceived }, { transaction: t });

            if (totalReceived < Number(poItem.quantity_ordered)) {
                allFullyReceived = false;
            }

            // Incrementar stock
            const [stockRecord] = await Stock.findOrCreate({
                where: { product_id: poItem.product_id, variant_id: poItem.variant_id, branch_id: po.branch_id },
                defaults: { product_id: poItem.product_id, variant_id: poItem.variant_id, branch_id: po.branch_id, quantity: 0, reserved_quantity: 0 },
                transaction: t,
            });

            const prevQty = Number(stockRecord.quantity);
            const newQty = prevQty + qtyReceiving;
            await stockRecord.update({ quantity: newQty }, { transaction: t });

            // Crear movimiento de stock
            await StockMovement.create({
                product_id: poItem.product_id,
                variant_id: poItem.variant_id,
                branch_id: po.branch_id,
                type: 'purchase',
                quantity: qtyReceiving,
                previous_stock: prevQty,
                new_stock: newQty,
                unit_cost: Number(poItem.unit_cost),
                reference_type: 'purchase_order',
                reference_id: po.id,
                created_by: req.user?.id || null,
            }, { transaction: t });

            // Actualizar costo del producto si aplica
            const product = await Product.findByPk(poItem.product_id, { transaction: t });
            if (product && Number(poItem.unit_cost) > 0) {
                await product.update({ cost_price: Number(poItem.unit_cost) }, { transaction: t });
            }
        }

        const newStatus = allFullyReceived ? 'received' : 'partial';
        await po.update({
            status: newStatus,
            received_at: allFullyReceived ? new Date() : po.received_at,
        }, { transaction: t });

        await t.commit();

        return res.status(200).json(successMessage({
            message: messages.entities.purchaseOrder.success.received,
            extra: { data: po }
        }));
    } catch (error) {
        await t.rollback();
        console.error('Error receiving purchase order:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function cancel(req, res) {
    try {
        const po = await PurchaseOrder.findOne({ where: { id: req.params.id } });
        if (!po) {
            return res.status(404).json(errorMessage({ message: messages.entities.purchaseOrder.errors.notFound }));
        }
        if (po.status === 'cancelled') {
            return res.status(400).json(errorMessage({ message: messages.entities.purchaseOrder.errors.alreadyCancelled }));
        }
        await po.update({ status: 'cancelled' });
        return res.status(200).json(successMessage({
            message: messages.entities.purchaseOrder.success.cancelled,
            extra: { data: po }
        }));
    } catch (error) {
        console.error('Error cancelling purchase order:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Actualizar orden de compra vía PUT — delega a send, receive o cancel según status recibido
 */
export async function updateStatus(req, res) {
    const { status } = req.body;
    if (status === 'cancelled') return cancel(req, res);
    if (status === 'received') return receive(req, res);
    if (status === 'sent') return send(req, res);
    try {
        const po = await PurchaseOrder.findOne({ where: { id: req.params.id } });
        if (!po) {
            return res.status(404).json(errorMessage({ message: messages.entities.purchaseOrder.errors.notFound }));
        }
        await po.update({ status });
        return res.status(200).json(successMessage({
            message: 'Orden de compra actualizada',
            extra: { data: po }
        }));
    } catch (error) {
        console.error('Error updating purchase order status:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}
