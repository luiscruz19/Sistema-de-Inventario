import { Op, fn, col, literal } from 'sequelize';
import sequelize from '../db/sequelize.js';
import Sale from '../models/Sale.js';
import SaleItem from '../models/SaleItem.js';
import Customer from '../models/Customer.js';
import CustomerTransaction from '../models/CustomerTransaction.js';
import Product from '../models/Product.js';
import Stock from '../models/Stock.js';
import CashRegister from '../models/CashRegister.js';
import Invoice from '../models/Invoice.js';
import Supplier from '../models/Supplier.js';
import SupplierTransaction from '../models/SupplierTransaction.js';
import { errorMessage, successMessage } from '../utils/messages.js';

function startOfDay(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}
function endOfDay(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}
function startOfMonth(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}
function startOfPrevMonth(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}
function endOfPrevMonth(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999);
}

/**
 * GET /kpis/sales-vs-prev-month
 * Devuelve total vendido en el mes actual y el mes anterior.
 */
export async function salesVsPrevMonth(req, res) {
    try {
        const now = new Date();

        const [current] = await Sale.findAll({
            where: {
                status: 'completed',
                completed_at: { [Op.between]: [startOfMonth(now), endOfMonth(now)] },
            },
            attributes: [
                [fn('COALESCE', fn('SUM', col('total')), 0), 'total'],
                [fn('COUNT', col('id')), 'count'],
            ],
            raw: true,
        });

        const [previous] = await Sale.findAll({
            where: {
                status: 'completed',
                completed_at: { [Op.between]: [startOfPrevMonth(now), endOfPrevMonth(now)] },
            },
            attributes: [
                [fn('COALESCE', fn('SUM', col('total')), 0), 'total'],
                [fn('COUNT', col('id')), 'count'],
            ],
            raw: true,
        });

        const currentTotal = Number(current?.total || 0);
        const prevTotal = Number(previous?.total || 0);
        const diff = currentTotal - prevTotal;
        const deltaPct = prevTotal > 0 ? Number(((diff / prevTotal) * 100).toFixed(2)) : null;

        return res.status(200).json(successMessage({
            message: 'Ventas vs mes anterior',
            extra: {
                data: {
                    current_month: { total: currentTotal, count: Number(current?.count || 0) },
                    previous_month: { total: prevTotal, count: Number(previous?.count || 0) },
                    difference: Number(diff.toFixed(2)),
                    delta_percentage: deltaPct,
                },
            },
        }));
    } catch (err) {
        console.error('Error salesVsPrevMonth:', err);
        return res.status(500).json(errorMessage({ message: 'Error al calcular ventas' }));
    }
}

/**
 * GET /kpis/receivables-aging
 * Devuelve la cuenta corriente de clientes por buckets de vencimiento.
 * Toma las transacciones tipo 'debit' más recientes como saldos pendientes.
 */
export async function receivablesAging(req, res) {
    try {
        const now = Date.now();

        // Obtenemos todos los clientes con balance > 0 via último balance_after.
        const customers = await Customer.findAll({
            attributes: ['id', 'name', 'tax_id'],
            include: [{
                model: CustomerTransaction,
                as: 'transactions',
                required: false,
                attributes: ['id', 'type', 'amount', 'balance_after', 'createdAt', 'reference_type'],
            }],
        });

        const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
        const rows = [];

        for (const customer of customers) {
            const txs = (customer.transactions || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            const latest = txs[0];
            const balance = Number(latest?.balance_after || 0);
            if (balance <= 0) continue;

            // Usar la fecha de la deuda más vieja sin pagar para aging (aproximación: fecha del último debit).
            const oldestDebit = txs.filter((t) => t.type === 'debit').pop();
            const ageDays = oldestDebit
                ? Math.max(0, Math.floor((now - new Date(oldestDebit.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
                : 0;

            let bucket = '0-30';
            if (ageDays > 90) bucket = '90+';
            else if (ageDays > 60) bucket = '61-90';
            else if (ageDays > 30) bucket = '31-60';

            buckets[bucket] += balance;
            rows.push({
                customer_id: customer.id,
                customer_name: customer.name,
                tax_id: customer.tax_id,
                balance,
                age_days: ageDays,
                bucket,
            });
        }

        const total = Object.values(buckets).reduce((a, b) => a + b, 0);

        return res.status(200).json(successMessage({
            message: 'Cuenta corriente por aging',
            extra: {
                data: {
                    total: Number(total.toFixed(2)),
                    buckets: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, Number(v.toFixed(2))])),
                    customers: rows.sort((a, b) => b.balance - a.balance),
                },
            },
        }));
    } catch (err) {
        console.error('Error receivablesAging:', err);
        return res.status(500).json(errorMessage({ message: 'Error al calcular cuenta corriente' }));
    }
}

/**
 * GET /kpis/top-customers?limit=10
 */
export async function topCustomers(req, res) {
    try {
        const limit = Math.min(Number(req.query.limit || 10), 50);
        const dateFrom = req.query.date_from ? new Date(req.query.date_from) : null;

        const where = { status: 'completed', customer_id: { [Op.ne]: null } };
        if (dateFrom) where.completed_at = { [Op.gte]: dateFrom };

        const rows = await Sale.findAll({
            where,
            attributes: [
                'customer_id',
                [fn('SUM', col('total')), 'total_sales'],
                [fn('COUNT', col('sales.id')), 'orders_count'],
            ],
            include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'tax_id', 'email'] }],
            group: ['customer_id', 'customer.id'],
            order: [[literal('total_sales'), 'DESC']],
            limit,
            raw: false,
        });

        return res.status(200).json(successMessage({
            message: 'Top clientes',
            extra: { data: rows },
        }));
    } catch (err) {
        console.error('Error topCustomers:', err);
        return res.status(500).json(errorMessage({ message: 'Error al calcular top clientes' }));
    }
}

/**
 * GET /kpis/top-products?limit=10
 */
export async function topProducts(req, res) {
    try {
        const limit = Math.min(Number(req.query.limit || 10), 50);
        const dateFrom = req.query.date_from ? new Date(req.query.date_from) : null;

        const saleWhere = { status: 'completed' };
        if (dateFrom) saleWhere.completed_at = { [Op.gte]: dateFrom };

        const rows = await SaleItem.findAll({
            attributes: [
                'product_id',
                [fn('SUM', col('sale_items.quantity')), 'units'],
                [fn('SUM', col('sale_items.subtotal')), 'revenue'],
            ],
            include: [
                { model: Sale, as: 'sale', attributes: [], where: saleWhere, required: true },
                { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
            ],
            group: ['product_id', 'product.id'],
            order: [[literal('revenue'), 'DESC']],
            limit,
        });

        return res.status(200).json(successMessage({
            message: 'Top productos',
            extra: { data: rows },
        }));
    } catch (err) {
        console.error('Error topProducts:', err);
        return res.status(500).json(errorMessage({ message: 'Error al calcular top productos' }));
    }
}

/**
 * GET /kpis/available-cash
 * Suma de los opening_amount+ventas de cajas abiertas.
 */
export async function availableCash(req, res) {
    try {
        const openRegisters = await CashRegister.findAll({
            where: { status: 'open' },
            attributes: ['id', 'branch_id', 'opened_at', 'opening_amount'],
        });

        let totalOpening = 0;
        let salesSinceOpen = 0;

        for (const reg of openRegisters) {
            totalOpening += Number(reg.opening_amount || 0);
            const [row] = await Sale.findAll({
                where: {
                    branch_id: reg.branch_id,
                    status: 'completed',
                    payment_method: 'cash',
                    completed_at: { [Op.gte]: reg.opened_at },
                },
                attributes: [[fn('COALESCE', fn('SUM', col('total')), 0), 'total']],
                raw: true,
            });
            salesSinceOpen += Number(row?.total || 0);
        }

        return res.status(200).json(successMessage({
            message: 'Efectivo disponible',
            extra: {
                data: {
                    open_registers: openRegisters.length,
                    opening_amount: Number(totalOpening.toFixed(2)),
                    cash_sales_since_open: Number(salesSinceOpen.toFixed(2)),
                    estimated_cash: Number((totalOpening + salesSinceOpen).toFixed(2)),
                },
            },
        }));
    } catch (err) {
        console.error('Error availableCash:', err);
        return res.status(500).json(errorMessage({ message: 'Error al calcular efectivo' }));
    }
}

/**
 * GET /kpis/stock-alerts
 * Productos con stock consolidado < min_stock_alert.
 */
export async function stockAlerts(req, res) {
    try {
        const rows = await sequelize.query(
            `SELECT p.id, p.name, p.sku, p.min_stock_alert,
                    COALESCE(SUM(s.quantity), 0) AS total_stock
             FROM products p
             LEFT JOIN stocks s
                 ON s.product_id = p.id
             WHERE p.active = true
               AND p.track_stock = true
               AND p.min_stock_alert > 0
             GROUP BY p.id, p.name, p.sku, p.min_stock_alert
             HAVING total_stock <= p.min_stock_alert
             ORDER BY (p.min_stock_alert - total_stock) DESC
             LIMIT 200`,
            { type: sequelize.QueryTypes.SELECT },
        );

        return res.status(200).json(successMessage({
            message: 'Alertas de stock',
            extra: { data: { count: rows.length, products: rows } },
        }));
    } catch (err) {
        console.error('Error stockAlerts:', err);
        return res.status(500).json(errorMessage({ message: 'Error al calcular alertas de stock' }));
    }
}

/**
 * GET /kpis/invoices-summary — resumen mensual de facturas emitidas.
 */
export async function invoicesSummary(req, res) {
    try {
        const now = new Date();

        const rows = await Invoice.findAll({
            where: {
                issued_at: { [Op.between]: [startOfMonth(now), endOfMonth(now)] },
            },
            attributes: [
                'status',
                'doc_type',
                [fn('COUNT', col('id')), 'count'],
                [fn('COALESCE', fn('SUM', col('total')), 0), 'total'],
            ],
            group: ['status', 'doc_type'],
            raw: true,
        });

        return res.status(200).json(successMessage({
            message: 'Resumen de facturas',
            extra: { data: rows },
        }));
    } catch (err) {
        console.error('Error invoicesSummary:', err);
        return res.status(500).json(errorMessage({ message: 'Error al calcular resumen de facturas' }));
    }
}

/**
 * GET /kpis/sales-today
 * Ventas del día (total, cantidad, ticket promedio) y margen bruto del día/mes.
 */
export async function salesToday(req, res) {
    try {
        const now = new Date();
        const branchId = req.query.branch_id ? Number(req.query.branch_id) : null;

        const baseWhere = { status: 'completed' };
        if (branchId) baseWhere.branch_id = branchId;

        const [today] = await Sale.findAll({
            where: { ...baseWhere, completed_at: { [Op.between]: [startOfDay(now), endOfDay(now)] } },
            attributes: [
                [fn('COALESCE', fn('SUM', col('total')), 0), 'total'],
                [fn('COUNT', col('id')), 'count'],
            ],
            raw: true,
        });

        const [month] = await Sale.findAll({
            where: { ...baseWhere, completed_at: { [Op.between]: [startOfMonth(now), endOfMonth(now)] } },
            attributes: [
                [fn('COALESCE', fn('SUM', col('total')), 0), 'total'],
                [fn('COUNT', col('id')), 'count'],
            ],
            raw: true,
        });

        // Margen bruto del mes: ingresos por ítem - costo al momento de la venta.
        const saleWhere = { status: 'completed', completed_at: { [Op.between]: [startOfMonth(now), endOfMonth(now)] } };
        if (branchId) saleWhere.branch_id = branchId;

        const [marginRow] = await SaleItem.findAll({
            attributes: [
                [fn('COALESCE', fn('SUM', col('sale_items.subtotal')), 0), 'revenue'],
                [fn('COALESCE', fn('SUM', literal('sale_items.cost_at_sale * sale_items.quantity')), 0), 'cost'],
            ],
            include: [{ model: Sale, as: 'sale', attributes: [], where: saleWhere, required: true }],
            raw: true,
        });

        const monthRevenue = Number(marginRow?.revenue || 0);
        const monthCost = Number(marginRow?.cost || 0);
        const grossMargin = Number((monthRevenue - monthCost).toFixed(2));
        const marginPct = monthRevenue > 0 ? Number(((grossMargin / monthRevenue) * 100).toFixed(2)) : null;

        const todayTotal = Number(today?.total || 0);
        const todayCount = Number(today?.count || 0);

        return res.status(200).json(successMessage({
            message: 'Ventas del día',
            extra: {
                data: {
                    today: {
                        total: Number(todayTotal.toFixed(2)),
                        count: todayCount,
                        average_ticket: todayCount > 0 ? Number((todayTotal / todayCount).toFixed(2)) : 0,
                    },
                    month: {
                        total: Number(Number(month?.total || 0).toFixed(2)),
                        count: Number(month?.count || 0),
                        revenue_net: monthRevenue,
                        cost: monthCost,
                        gross_margin: grossMargin,
                        margin_percentage: marginPct,
                    },
                },
            },
        }));
    } catch (err) {
        console.error('Error salesToday:', err);
        return res.status(500).json(errorMessage({ message: 'Error al calcular ventas del día' }));
    }
}

/**
 * GET /kpis/payables-aging
 * Cuentas por pagar: proveedores con saldo > 0, con aging según última deuda registrada.
 */
export async function payablesAging(req, res) {
    try {
        const now = Date.now();

        const suppliers = await Supplier.findAll({
            attributes: ['id', 'name', 'tax_id', 'balance'],
            where: { balance: { [Op.gt]: 0 } },
            include: [{
                model: SupplierTransaction,
                as: 'transactions',
                required: false,
                attributes: ['id', 'type', 'createdAt'],
            }],
        });

        const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
        const rows = [];

        for (const supplier of suppliers) {
            const balance = Number(supplier.balance || 0);
            if (balance <= 0) continue;

            const credits = (supplier.transactions || [])
                .filter((tx) => tx.type === 'credit')
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            const oldest = credits[0];
            const ageDays = oldest
                ? Math.max(0, Math.floor((now - new Date(oldest.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
                : 0;

            let bucket = '0-30';
            if (ageDays > 90) bucket = '90+';
            else if (ageDays > 60) bucket = '61-90';
            else if (ageDays > 30) bucket = '31-60';

            buckets[bucket] += balance;
            rows.push({
                supplier_id: supplier.id,
                supplier_name: supplier.name,
                tax_id: supplier.tax_id,
                balance,
                age_days: ageDays,
                bucket,
            });
        }

        const total = Object.values(buckets).reduce((a, b) => a + b, 0);

        return res.status(200).json(successMessage({
            message: 'Cuentas por pagar por aging',
            extra: {
                data: {
                    total: Number(total.toFixed(2)),
                    buckets: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, Number(v.toFixed(2))])),
                    suppliers: rows.sort((a, b) => b.balance - a.balance),
                },
            },
        }));
    } catch (err) {
        console.error('Error payablesAging:', err);
        return res.status(500).json(errorMessage({ message: 'Error al calcular cuentas por pagar' }));
    }
}
