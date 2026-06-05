import PurchaseOrder from '../models/PurchaseOrder.js';
import PurchaseOrderItem from '../models/PurchaseOrderItem.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Supplier from '../models/Supplier.js';
import Branch from '../models/Branch.js';
import Stock from '../models/Stock.js';
import StockMovement from '../models/StockMovement.js';
import SupplierTransaction from '../models/SupplierTransaction.js';
import BusinessConfig from '../models/BusinessConfig.js';
import sequelize from '../db/sequelize.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';
import { generatePurchaseEntry } from '../utils/accounting.js';

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
    const t = await sequelize.transaction();
    try {
        const { supplier_id, branch_id, items, notes, expected_date, supplier_invoice_number, supplier_invoice_date } = req.body;

        if (!supplier_id || !branch_id) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'supplier_id y branch_id son requeridos' }));
        }
        if (!Array.isArray(items) || items.length === 0) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'La orden debe tener al menos un ítem' }));
        }

        const supplier = await Supplier.findByPk(supplier_id, { transaction: t });
        if (!supplier) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: messages.entities.supplier?.errors?.notFound || 'Proveedor no encontrado' }));
        }

        let subtotal = 0;
        const poItems = [];

        for (const item of items) {
            if (!item.product_id || Number(item.quantity_ordered) <= 0 || Number.isNaN(Number(item.quantity_ordered))) {
                await t.rollback();
                return res.status(400).json(errorMessage({ message: 'Cada ítem requiere product_id y cantidad mayor a 0' }));
            }
            if (Number(item.unit_cost) < 0 || Number.isNaN(Number(item.unit_cost))) {
                await t.rollback();
                return res.status(400).json(errorMessage({ message: 'El costo unitario no puede ser negativo' }));
            }
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

        // Tasa de IVA por defecto desde la configuración del negocio.
        const config = await BusinessConfig.findOne({ transaction: t });
        const taxRate = Number(config?.tax_rate_default ?? 21) / 100;
        const taxAmount = subtotal * taxRate;
        const total = subtotal + taxAmount;

        // Número de orden correlativo
        const count = await PurchaseOrder.count({ transaction: t });
        const orderNumber = `OC-${String(count + 1).padStart(6, '0')}`;

        const po = await PurchaseOrder.create({
            supplier_id,
            branch_id,
            order_number: orderNumber,
            status: 'draft',
            subtotal: Number(subtotal.toFixed(2)),
            tax_amount: Number(taxAmount.toFixed(2)),
            total: Number(total.toFixed(2)),
            notes,
            expected_date: expected_date || null,
            supplier_invoice_number: supplier_invoice_number || null,
            supplier_invoice_date: supplier_invoice_date || null,
            created_by: req.user?.id || null,
        }, { transaction: t });

        for (const item of poItems) {
            await PurchaseOrderItem.create({ ...item, purchase_order_id: po.id }, { transaction: t });
        }

        await t.commit();

        return res.status(201).json(successMessage({
            message: messages.entities.purchaseOrder.success.created,
            extra: { data: po }
        }));
    } catch (error) {
        await t.rollback();
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
        let receivedSubtotal = 0;

        for (const poItem of po.items) {
            const receivedMatch = receivedItems.find(ri => ri.id === poItem.id);
            const pending = Number(poItem.quantity_ordered) - Number(poItem.quantity_received);
            let qtyReceiving = receivedMatch ? Number(receivedMatch.quantity_received) : pending;

            if (Number.isNaN(qtyReceiving) || qtyReceiving < 0) {
                await t.rollback();
                return res.status(400).json(errorMessage({ message: 'Cantidad recibida inválida' }));
            }
            // No permitir recibir más de lo pendiente
            if (qtyReceiving > pending) {
                qtyReceiving = pending;
            }

            const totalReceived = Number(poItem.quantity_received) + qtyReceiving;
            receivedSubtotal += qtyReceiving * Number(poItem.unit_cost);

            await poItem.update({ quantity_received: totalReceived }, { transaction: t });

            if (totalReceived < Number(poItem.quantity_ordered)) {
                allFullyReceived = false;
            }

            if (qtyReceiving === 0) continue;

            // Incrementar stock
            const [stockRecord] = await Stock.findOrCreate({
                where: { product_id: poItem.product_id, variant_id: poItem.variant_id, branch_id: po.branch_id },
                defaults: { product_id: poItem.product_id, variant_id: poItem.variant_id, branch_id: po.branch_id, quantity: 0, reserved_quantity: 0 },
                transaction: t,
                lock: t.LOCK.UPDATE,
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

        // Generar cuenta a pagar al proveedor por la mercadería recibida en esta operación.
        if (receivedSubtotal > 0) {
            const config = await BusinessConfig.findOne({ transaction: t });
            const taxRate = Number(config?.tax_rate_default ?? 21) / 100;
            const receivedTotal = Number((receivedSubtotal * (1 + taxRate)).toFixed(2));

            const supplier = await Supplier.findByPk(po.supplier_id, { transaction: t, lock: t.LOCK.UPDATE });
            if (supplier) {
                const newBalance = Number((Number(supplier.balance) + receivedTotal).toFixed(2));
                await supplier.update({ balance: newBalance }, { transaction: t });
                await SupplierTransaction.create({
                    supplier_id: supplier.id,
                    type: 'credit',
                    amount: receivedTotal,
                    description: `Recepción de mercadería ${po.order_number || po.id}`,
                    reference_type: 'purchase_order',
                    reference_id: po.id,
                    balance_after: newBalance,
                    created_by: req.user?.id || null,
                }, { transaction: t });
            }

            // Asiento contable automático de la compra recibida (si está configurado).
            try {
                await generatePurchaseEntry({
                    purchaseOrder: {
                        id: po.id,
                        order_number: po.order_number,
                        subtotal: Number(receivedSubtotal.toFixed(2)),
                        tax_amount: Number((receivedSubtotal * taxRate).toFixed(2)),
                        total: receivedTotal,
                    },
                    transaction: t,
                });
            } catch (accErr) {
                console.error('Error generando asiento de compra (se omite):', accErr.message);
            }
        }

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
 * Registrar un pago a proveedor sobre una orden de compra.
 * Actualiza paid_amount / payment_status y cancela deuda en la cuenta del proveedor.
 */
export async function pay(req, res) {
    const t = await sequelize.transaction();
    try {
        const { amount } = req.body;

        if (!amount || Number(amount) <= 0 || Number.isNaN(Number(amount))) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'El monto del pago debe ser mayor a 0' }));
        }

        const po = await PurchaseOrder.findOne({ where: { id: req.params.id }, transaction: t, lock: t.LOCK.UPDATE });
        if (!po) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: messages.entities.purchaseOrder.errors.notFound }));
        }
        if (po.status === 'cancelled') {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'No se puede pagar una orden cancelada' }));
        }

        const pending = Number((Number(po.total) - Number(po.paid_amount)).toFixed(2));
        if (pending <= 0) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'La orden ya está totalmente pagada' }));
        }
        const payAmount = Math.min(Number(amount), pending);
        const newPaid = Number((Number(po.paid_amount) + payAmount).toFixed(2));
        const newPaymentStatus = newPaid >= Number(po.total) - 0.01 ? 'paid' : 'partial';

        await po.update({ paid_amount: newPaid, payment_status: newPaymentStatus }, { transaction: t });

        // Cancelar deuda en la cuenta corriente del proveedor.
        const supplier = await Supplier.findByPk(po.supplier_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (supplier) {
            const newBalance = Number((Number(supplier.balance) - payAmount).toFixed(2));
            await supplier.update({ balance: newBalance }, { transaction: t });
            await SupplierTransaction.create({
                supplier_id: supplier.id,
                type: 'debit',
                amount: payAmount,
                description: `Pago de orden de compra ${po.order_number || po.id}`,
                reference_type: 'payment',
                reference_id: po.id,
                balance_after: newBalance,
                created_by: req.user?.id || null,
            }, { transaction: t });
        }

        await t.commit();

        return res.status(200).json(successMessage({
            message: 'Pago registrado',
            extra: { data: po }
        }));
    } catch (error) {
        await t.rollback();
        console.error('Error paying purchase order:', error);
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
