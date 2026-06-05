import Sale from '../models/Sale.js';
import SaleItem from '../models/SaleItem.js';
import SalePayment from '../models/SalePayment.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Stock from '../models/Stock.js';
import StockMovement from '../models/StockMovement.js';
import Customer from '../models/Customer.js';
import Branch from '../models/Branch.js';
import BusinessConfig from '../models/BusinessConfig.js';
import sequelize from '../db/sequelize.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

/**
 * Listar ventas con filtros
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 20, branch_id, status, payment_method, date_from, date_to, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (branch_id) where.branch_id = Number(branch_id);
        if (status) where.status = status;
        if (payment_method) where.payment_method = payment_method;

        if (date_from && date_to) {
            where.completed_at = { [Op.between]: [new Date(date_from), new Date(date_to + 'T23:59:59')] };
        } else if (date_from) {
            where.completed_at = { [Op.gte]: new Date(date_from) };
        } else if (date_to) {
            where.completed_at = { [Op.lte]: new Date(date_to + 'T23:59:59') };
        }

        if (search) {
            where[Op.or] = [
                { sale_number: { [Op.like]: `%${search}%` } },
            ];
        }

        const { count, rows } = await Sale.findAndCountAll({
            where,
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'tax_id'], required: false },
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
            ],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            message: messages.entities.sale.success.list,
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
        console.error('Error listing sales:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Obtener venta por ID con items y pagos
 */
export async function getById(req, res) {
    try {
        const sale = await Sale.findOne({
            where: { id: req.params.id },
            include: [
                { model: Customer, as: 'customer', required: false },
                { model: Branch, as: 'branch' },
                {
                    model: SaleItem, as: 'items',
                    include: [
                        { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'unit'] },
                        { model: ProductVariant, as: 'variant', attributes: ['id', 'name'], required: false },
                    ]
                },
                { model: SalePayment, as: 'payments' },
            ],
        });

        if (!sale) {
            return res.status(404).json(errorMessage({ message: messages.entities.sale.errors.notFound }));
        }

        return res.status(200).json(successMessage({
            message: messages.entities.sale.success.fetch,
            extra: { data: sale }
        }));
    } catch (error) {
        console.error('Error getting sale:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Crear venta (POS) — decrementa stock, calcula totales, crea items y pagos
 */
export async function create(req, res) {
    const t = await sequelize.transaction();
    try {
        const {
            branch_id, customer_id, items, payments,
            payment_method, discount_percentage, discount_amount, notes,
        } = req.body;

        if (!items || items.length === 0) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: messages.entities.sale.errors.emptyItems }));
        }

        // Generar número de venta de forma atómica para evitar duplicados con POS concurrentes
        const config = await BusinessConfig.findOne({ transaction: t });
        const prefix = config?.receipt_prefix || 'T';
        let nextNum = 1;
        if (config) {
            await config.increment('receipt_next_number', { transaction: t });
            await config.reload({ transaction: t });
            nextNum = config.receipt_next_number - 1;
        }
        const saleNumber = `${prefix}-${String(nextNum).padStart(8, '0')}`;

        let subtotal = 0;
        let taxAmount = 0;
        const saleItems = [];

        // Procesar items: validar stock, calcular subtotales
        for (const item of items) {
            const product = await Product.findOne({ where: { id: item.product_id } });
            if (!product) {
                await t.rollback();
                return res.status(404).json(errorMessage({ message: `Producto ID ${item.product_id} no encontrado` }));
            }

            const variant = item.variant_id ? await ProductVariant.findByPk(item.variant_id) : null;
            const unitPrice = item.unit_price || Number(variant?.sale_price || product.sale_price);
            const costPrice = Number(variant?.cost_price || product.cost_price);
            const itemDiscount = item.discount_percentage || 0;
            const qty = Number(item.quantity);
            const itemSubtotal = unitPrice * qty * (1 - itemDiscount / 100);
            const itemTax = itemSubtotal * Number(product.tax_rate) / 100;

            subtotal += itemSubtotal;
            taxAmount += itemTax;

            saleItems.push({
                product_id: product.id,
                variant_id: item.variant_id || null,
                quantity: qty,
                unit_price: unitPrice,
                discount_percentage: itemDiscount,
                subtotal: Number(itemSubtotal.toFixed(2)),
                cost_at_sale: costPrice,
            });

            // Decrementar stock si track_stock
            if (product.track_stock) {
                const [stockRecord] = await Stock.findOrCreate({
                    where: { product_id: product.id, variant_id: item.variant_id || null, branch_id },
                    defaults: { product_id: product.id, variant_id: item.variant_id || null, branch_id, quantity: 0, reserved_quantity: 0 },
                    transaction: t,
                });

                const prevQty = Number(stockRecord.quantity);

                // Validar stock suficiente dentro de la transacción (salvo override por configuración)
                const allowOversell = config?.allow_oversell === true;
                if (!allowOversell && prevQty < qty) {
                    await t.rollback();
                    const productName = variant?.name ? `${product.name} (${variant.name})` : product.name;
                    return res.status(400).json(errorMessage({
                        message: `Stock insuficiente para ${productName}. Disponible: ${prevQty}`
                    }));
                }

                const newQty = prevQty - qty;
                await stockRecord.update({ quantity: newQty }, { transaction: t });

                await StockMovement.create({
                    product_id: product.id,
                    variant_id: item.variant_id || null,
                    branch_id,
                    type: 'sale',
                    quantity: -qty,
                    previous_stock: prevQty,
                    new_stock: newQty,
                    unit_cost: costPrice,
                    reference_type: 'sale',
                    created_by: req.user?.id || null,
                }, { transaction: t });
            }
        }

        // Descuento: una sola fuente de verdad. Si viene discount_percentage se calcula a
        // partir del porcentaje; si no, se usa discount_amount fijo. Nunca se aplican ambos.
        const discountPct = Number(discount_percentage) || 0;
        let discountAmount;
        let discountPercentage;
        if (discountPct > 0) {
            discountAmount = subtotal * discountPct / 100;
            discountPercentage = discountPct;
        } else {
            discountAmount = Math.min(Number(discount_amount) || 0, subtotal);
            discountPercentage = 0;
        }
        const total = Number((subtotal - discountAmount + taxAmount).toFixed(2));

        // Calcular pagos
        let paidAmount = 0;
        if (payments && payments.length > 0) {
            paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        } else {
            paidAmount = total;
        }
        const changeAmount = Math.max(0, Number((paidAmount - total).toFixed(2)));

        // Crear la venta
        const sale = await Sale.create({
            branch_id,
            customer_id: customer_id || null,
            sale_number: saleNumber,
            payment_method: payment_method || (payments && payments.length > 1 ? 'mixed' : payments?.[0]?.method || 'cash'),
            status: 'completed',
            subtotal: Number(subtotal.toFixed(2)),
            discount_amount: Number(discountAmount.toFixed(2)),
            discount_percentage: Number(discountPercentage),
            tax_amount: Number(taxAmount.toFixed(2)),
            total,
            paid_amount: Number(paidAmount.toFixed(2)),
            change_amount: changeAmount,
            notes,
            created_by: req.user?.id || null,
            completed_at: new Date(),
        }, { transaction: t });

        // Crear sale_items
        for (const saleItem of saleItems) {
            await SaleItem.create({ ...saleItem, sale_id: sale.id }, { transaction: t });
        }

        // Actualizar reference_id en stock_movements
        await StockMovement.update(
            { reference_id: sale.id },
            { where: { reference_type: 'sale', reference_id: null, created_by: req.user?.id || null }, transaction: t }
        );

        // Crear sale_payments
        if (payments && payments.length > 0) {
            for (const payment of payments) {
                await SalePayment.create({
                    sale_id: sale.id,
                    method: payment.method,
                    amount: Number(payment.amount),
                    reference: payment.reference || null,
                }, { transaction: t });
            }
        } else {
            await SalePayment.create({
                sale_id: sale.id,
                method: 'cash',
                amount: paidAmount,
            }, { transaction: t });
        }

        // El número de comprobante ya fue incrementado de forma atómica al inicio
        await t.commit();

        return res.status(201).json(successMessage({
            message: messages.entities.sale.success.created,
            extra: { data: { ...sale.toJSON(), sale_number: saleNumber } }
        }));
    } catch (error) {
        await t.rollback();
        console.error('Error creating sale:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Cancelar venta — devuelve stock
 */
export async function cancel(req, res) {
    const t = await sequelize.transaction();
    try {
        const sale = await Sale.findOne({
            where: { id: req.params.id },
            include: [{ model: SaleItem, as: 'items' }],
        });

        if (!sale) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: messages.entities.sale.errors.notFound }));
        }
        if (sale.status === 'cancelled') {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: messages.entities.sale.errors.alreadyCancelled }));
        }

        // Devolver stock
        for (const item of sale.items) {
            const product = await Product.findByPk(item.product_id);
            if (product?.track_stock) {
                const stockRecord = await Stock.findOne({
                    where: { product_id: item.product_id, variant_id: item.variant_id, branch_id: sale.branch_id },
                    transaction: t,
                });

                if (stockRecord) {
                    const prevQty = Number(stockRecord.quantity);
                    const newQty = prevQty + Number(item.quantity);
                    await stockRecord.update({ quantity: newQty }, { transaction: t });

                    await StockMovement.create({
                        product_id: item.product_id,
                        variant_id: item.variant_id,
                        branch_id: sale.branch_id,
                        type: 'return',
                        quantity: Number(item.quantity),
                        previous_stock: prevQty,
                        new_stock: newQty,
                        reference_type: 'sale',
                        reference_id: sale.id,
                        notes: 'Devolución por cancelación de venta',
                        created_by: req.user?.id || null,
                    }, { transaction: t });
                }
            }
        }

        await sale.update({ status: 'cancelled' }, { transaction: t });
        await t.commit();

        return res.status(200).json(successMessage({
            message: messages.entities.sale.success.cancelled,
            extra: { data: sale }
        }));
    } catch (error) {
        await t.rollback();
        console.error('Error cancelling sale:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Actualizar estado de venta vía PUT — delega a cancel o refund según status recibido
 */
export async function updateStatus(req, res) {
    const { status } = req.body;
    if (status === 'cancelled') return cancel(req, res);
    if (status === 'refunded') return refund(req, res);
    try {
        const sale = await Sale.findOne({ where: { id: req.params.id } });
        if (!sale) {
            return res.status(404).json(errorMessage({ message: messages.entities.sale.errors.notFound }));
        }
        await sale.update({ status });
        return res.status(200).json(successMessage({
            message: messages.entities.sale.success.updated || 'Venta actualizada',
            extra: { data: sale }
        }));
    } catch (error) {
        console.error('Error updating sale status:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Reembolso (refund) — marca como refunded
 */
export async function refund(req, res) {
    try {
        const sale = await Sale.findOne({ where: { id: req.params.id } });
        if (!sale) {
            return res.status(404).json(errorMessage({ message: messages.entities.sale.errors.notFound }));
        }
        await sale.update({ status: 'refunded' });
        return res.status(200).json(successMessage({
            message: messages.entities.sale.success.refunded,
            extra: { data: sale }
        }));
    } catch (error) {
        console.error('Error refunding sale:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}
