import Sale from '../models/Sale.js';
import SaleItem from '../models/SaleItem.js';
import SalePayment from '../models/SalePayment.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Stock from '../models/Stock.js';
import StockMovement from '../models/StockMovement.js';
import Customer from '../models/Customer.js';
import CustomerTransaction from '../models/CustomerTransaction.js';
import Branch from '../models/Branch.js';
import CashRegister from '../models/CashRegister.js';
import BusinessConfig from '../models/BusinessConfig.js';
import sequelize from '../db/sequelize.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';
import { generateSaleEntry } from '../utils/accounting.js';

/**
 * Listar ventas con filtros
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 20, branch_id, cash_register_id, status, payment_method, date_from, date_to, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (branch_id) where.branch_id = Number(branch_id);
        if (cash_register_id) where.cash_register_id = Number(cash_register_id);
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

        if (!Array.isArray(items) || items.length === 0) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: messages.entities.sale.errors.emptyItems }));
        }

        if (!branch_id) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'branch_id es requerido' }));
        }

        const branch = await Branch.findByPk(branch_id, { transaction: t });
        if (!branch) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: 'Sucursal no encontrada' }));
        }

        // Requiere una caja abierta en la sucursal: la venta queda registrada bajo esa apertura.
        const openRegister = await CashRegister.findOne({
            where: { branch_id: Number(branch_id), status: 'open' },
            transaction: t,
        });
        if (!openRegister) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'No hay una caja abierta en esta sucursal. Abrí la caja para poder registrar ventas.' }));
        }

        // Validar cantidades antes de procesar
        for (const item of items) {
            if (!item.product_id || Number(item.quantity) <= 0 || Number.isNaN(Number(item.quantity))) {
                await t.rollback();
                return res.status(400).json(errorMessage({ message: 'Cada ítem requiere product_id y una cantidad mayor a 0' }));
            }
            const itemDisc = Number(item.discount_percentage || 0);
            if (itemDisc < 0 || itemDisc > 100) {
                await t.rollback();
                return res.status(400).json(errorMessage({ message: 'El descuento por ítem debe estar entre 0 y 100%' }));
            }
        }

        // Determinar si es venta a cuenta corriente (crédito): requiere cliente
        const effectiveMethod = payment_method || (payments && payments.length > 1 ? 'mixed' : payments?.[0]?.method || 'cash');
        const isOnAccount = effectiveMethod === 'credit';
        if (isOnAccount && !customer_id) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'Las ventas a cuenta corriente requieren un cliente' }));
        }

        let customer = null;
        if (customer_id) {
            customer = await Customer.findByPk(customer_id, { transaction: t, lock: t.LOCK.UPDATE });
            if (!customer) {
                await t.rollback();
                return res.status(404).json(errorMessage({ message: 'Cliente no encontrado' }));
            }
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
            const product = await Product.findOne({ where: { id: item.product_id }, transaction: t });
            if (!product) {
                await t.rollback();
                return res.status(404).json(errorMessage({ message: `Producto ID ${item.product_id} no encontrado` }));
            }
            if (product.active === false) {
                await t.rollback();
                return res.status(400).json(errorMessage({ message: `El producto ${product.name} está inactivo y no puede venderse` }));
            }

            const variant = item.variant_id ? await ProductVariant.findByPk(item.variant_id, { transaction: t }) : null;
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
                    lock: t.LOCK.UPDATE,
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

        if (total <= 0) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'El total de la venta debe ser mayor a 0' }));
        }

        // Calcular y validar pagos
        let paidAmount = 0;
        if (isOnAccount) {
            // Venta a cuenta corriente: no se cobra al contado, queda como deuda del cliente.
            paidAmount = 0;
        } else if (payments && payments.length > 0) {
            for (const p of payments) {
                if (!p.method || Number(p.amount) <= 0 || Number.isNaN(Number(p.amount))) {
                    await t.rollback();
                    return res.status(400).json(errorMessage({ message: 'Cada pago requiere un método y un monto mayor a 0' }));
                }
            }
            paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
            if (Number(paidAmount.toFixed(2)) < total - 0.01) {
                await t.rollback();
                return res.status(400).json(errorMessage({
                    message: `El total pagado (${paidAmount.toFixed(2)}) es menor al total de la venta (${total.toFixed(2)})`
                }));
            }
        } else {
            paidAmount = total;
        }
        // El vuelto solo aplica a pagos en efectivo; en cuenta corriente no hay vuelto.
        const changeAmount = isOnAccount ? 0 : Math.max(0, Number((paidAmount - total).toFixed(2)));

        // Crear la venta
        const sale = await Sale.create({
            branch_id,
            cash_register_id: openRegister.id,
            customer_id: customer_id || null,
            sale_number: saleNumber,
            payment_method: effectiveMethod,
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

        // Crear sale_payments (las ventas a cuenta corriente no registran cobro)
        if (!isOnAccount) {
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
        }

        // Venta a cuenta corriente: impactar saldo del cliente y registrar movimiento.
        if (isOnAccount && customer) {
            const newBalance = Number((Number(customer.balance) + total).toFixed(2));
            await customer.update({ balance: newBalance }, { transaction: t });
            await CustomerTransaction.create({
                customer_id: customer.id,
                type: 'debit',
                amount: total,
                description: `Venta a cuenta corriente ${saleNumber}`,
                reference_type: 'sale',
                reference_id: sale.id,
                balance_after: newBalance,
                created_by: req.user?.id || null,
            }, { transaction: t });
        }

        // Asiento contable automático (si está configurado). No bloquea la venta si falla por config.
        try {
            await generateSaleEntry({ sale: sale.toJSON(), onAccount: isOnAccount, transaction: t });
        } catch (accErr) {
            console.error('Error generando asiento de venta (se omite):', accErr.message);
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
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!sale) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: messages.entities.sale.errors.notFound }));
        }
        if (sale.status === 'cancelled') {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: messages.entities.sale.errors.alreadyCancelled }));
        }
        if (sale.status === 'refunded') {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'La venta ya fue reembolsada y no puede cancelarse' }));
        }

        // Devolver stock
        for (const item of sale.items) {
            const product = await Product.findByPk(item.product_id, { transaction: t });
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

        // Revertir saldo de cuenta corriente si fue una venta a crédito.
        if (sale.payment_method === 'credit' && sale.customer_id) {
            const customer = await Customer.findByPk(sale.customer_id, { transaction: t, lock: t.LOCK.UPDATE });
            if (customer) {
                const newBalance = Number((Number(customer.balance) - Number(sale.total)).toFixed(2));
                await customer.update({ balance: newBalance }, { transaction: t });
                await CustomerTransaction.create({
                    customer_id: customer.id,
                    type: 'credit',
                    amount: Number(sale.total),
                    description: `Anulación de venta ${sale.sale_number}`,
                    reference_type: 'sale',
                    reference_id: sale.id,
                    balance_after: newBalance,
                    created_by: req.user?.id || null,
                }, { transaction: t });
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
