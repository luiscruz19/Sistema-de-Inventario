import Sale from '../models/Sale.js';
import SaleItem from '../models/SaleItem.js';
import Product from '../models/Product.js';
import Branch from '../models/Branch.js';
import sequelize from '../db/sequelize.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

/**
 * Reporte por período
 */
export async function byPeriod(req, res) {
    try {
        const { date_from, date_to, branch_id } = req.query;
        const where = { status: 'completed' };

        if (branch_id) where.branch_id = Number(branch_id);
        if (date_from && date_to) {
            where.completed_at = { [Op.between]: [new Date(date_from), new Date(date_to + 'T23:59:59')] };
        }

        const sales = await Sale.findAll({ where, attributes: ['id', 'total', 'discount_amount', 'tax_amount', 'subtotal', 'payment_method', 'completed_at'] });

        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
        const totalDiscount = sales.reduce((sum, s) => sum + Number(s.discount_amount), 0);
        const totalTax = sales.reduce((sum, s) => sum + Number(s.tax_amount), 0);
        const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

        // Ventas por método de pago
        const byPaymentMethod = {};
        sales.forEach(s => {
            if (!byPaymentMethod[s.payment_method]) byPaymentMethod[s.payment_method] = { count: 0, total: 0 };
            byPaymentMethod[s.payment_method].count++;
            byPaymentMethod[s.payment_method].total += Number(s.total);
        });

        return res.status(200).json(successMessage({
            message: messages.entities.saleReport.success.fetch,
            extra: {
                data: {
                    totalSales,
                    totalRevenue: Number(totalRevenue.toFixed(2)),
                    totalDiscount: Number(totalDiscount.toFixed(2)),
                    totalTax: Number(totalTax.toFixed(2)),
                    avgTicket: Number(avgTicket.toFixed(2)),
                    byPaymentMethod,
                }
            }
        }));
    } catch (error) {
        console.error('Error generating report by period:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Reporte por producto (top ventas)
 */
export async function byProduct(req, res) {
    try {
        const { date_from, date_to, branch_id, limit: topLimit = 20 } = req.query;

        const saleWhere = { status: 'completed' };
        if (branch_id) saleWhere.branch_id = Number(branch_id);
        if (date_from && date_to) {
            saleWhere.completed_at = { [Op.between]: [new Date(date_from), new Date(date_to + 'T23:59:59')] };
        }

        const saleIds = (await Sale.findAll({ where: saleWhere, attributes: ['id'], raw: true })).map(s => s.id);

        if (saleIds.length === 0) {
            return res.status(200).json(successMessage({ message: messages.entities.saleReport.success.fetch, extra: { data: [] } }));
        }

        const results = await SaleItem.findAll({
            where: { sale_id: { [Op.in]: saleIds } },
            attributes: [
                'product_id',
                [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity'],
                [sequelize.fn('SUM', sequelize.col('subtotal')), 'total_revenue'],
                [sequelize.fn('COUNT', sequelize.col('sale_id')), 'sale_count'],
            ],
            include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }],
            group: ['product_id'],
            order: [[sequelize.literal('total_revenue'), 'DESC']],
            limit: Number(topLimit),
        });

        return res.status(200).json(successMessage({
            message: messages.entities.saleReport.success.fetch,
            extra: { data: results }
        }));
    } catch (error) {
        console.error('Error generating report by product:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Reporte por sucursal
 */
export async function byBranch(req, res) {
    try {
        const { date_from, date_to } = req.query;

        const where = { status: 'completed' };
        if (date_from && date_to) {
            where.completed_at = { [Op.between]: [new Date(date_from), new Date(date_to + 'T23:59:59')] };
        }

        const results = await Sale.findAll({
            where,
            attributes: [
                'branch_id',
                [sequelize.fn('COUNT', sequelize.col('sales.id')), 'total_sales'],
                [sequelize.fn('SUM', sequelize.col('total')), 'total_revenue'],
                [sequelize.fn('AVG', sequelize.col('total')), 'avg_ticket'],
            ],
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
            group: ['branch_id'],
            order: [[sequelize.literal('total_revenue'), 'DESC']],
        });

        return res.status(200).json(successMessage({
            message: messages.entities.saleReport.success.fetch,
            extra: { data: results }
        }));
    } catch (error) {
        console.error('Error generating report by branch:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Reporte de márgenes
 */
export async function margins(req, res) {
    try {
        const { date_from, date_to, branch_id } = req.query;

        const saleWhere = { status: 'completed' };
        if (branch_id) saleWhere.branch_id = Number(branch_id);
        if (date_from && date_to) {
            saleWhere.completed_at = { [Op.between]: [new Date(date_from), new Date(date_to + 'T23:59:59')] };
        }

        const saleIds = (await Sale.findAll({ where: saleWhere, attributes: ['id'], raw: true })).map(s => s.id);

        if (saleIds.length === 0) {
            return res.status(200).json(successMessage({
                message: messages.entities.saleReport.success.fetch,
                extra: { data: { totalRevenue: 0, totalCost: 0, totalMargin: 0, marginPercentage: 0 } }
            }));
        }

        const items = await SaleItem.findAll({
            where: { sale_id: { [Op.in]: saleIds } },
            attributes: ['subtotal', 'cost_at_sale', 'quantity'],
            raw: true,
        });

        const totalRevenue = items.reduce((sum, i) => sum + Number(i.subtotal), 0);
        const totalCost = items.reduce((sum, i) => sum + (Number(i.cost_at_sale) * Number(i.quantity)), 0);
        const totalMargin = totalRevenue - totalCost;
        const marginPercentage = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

        return res.status(200).json(successMessage({
            message: messages.entities.saleReport.success.fetch,
            extra: {
                data: {
                    totalRevenue: Number(totalRevenue.toFixed(2)),
                    totalCost: Number(totalCost.toFixed(2)),
                    totalMargin: Number(totalMargin.toFixed(2)),
                    marginPercentage: Number(marginPercentage.toFixed(2)),
                }
            }
        }));
    } catch (error) {
        console.error('Error generating margins report:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}
