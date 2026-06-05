import Stock from '../models/Stock.js';
import StockMovement from '../models/StockMovement.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Branch from '../models/Branch.js';
import BusinessConfig from '../models/BusinessConfig.js';
import sequelize from '../db/sequelize.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

/**
 * Listar stock por sucursal
 */
export async function list(req, res) {
    try {
        const { branch_id, product_id, page = 1, limit = 50 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (branch_id) where.branch_id = Number(branch_id);
        if (product_id) where.product_id = Number(product_id);

        const { count, rows } = await Stock.findAndCountAll({
            where,
            include: [
                { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'barcode', 'unit', 'min_stock_alert', 'cost_price', 'sale_price'] },
                { model: ProductVariant, as: 'variant', attributes: ['id', 'name', 'sku'], required: false },
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
            ],
            order: [['product_id', 'ASC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            message: messages.entities.stock.success.list,
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
        console.error('Error listing stock:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Ajustar stock manualmente.
 * Modos:
 *  - mode 'set' (por defecto): quantity es el nuevo valor absoluto.
 *  - mode 'delta': quantity es la variación (+/-) a aplicar.
 * Requiere un motivo (motivo o notes) para que el ajuste sea auditable.
 */
export async function adjust(req, res) {
    const t = await sequelize.transaction();
    try {
        const { product_id, variant_id, branch_id, quantity, notes, motivo, mode = 'set' } = req.body;

        const reason = (motivo || notes || '').trim();

        if (!product_id || !branch_id) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'product_id y branch_id son requeridos' }));
        }
        if (quantity === undefined || Number.isNaN(Number(quantity))) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'quantity es requerido y debe ser numérico' }));
        }
        if (!reason) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'El motivo del ajuste es obligatorio' }));
        }
        if (!['set', 'delta'].includes(mode)) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'mode debe ser "set" o "delta"' }));
        }

        const product = await Product.findByPk(product_id, { transaction: t });
        if (!product) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: 'Producto no encontrado' }));
        }

        const [stockRecord] = await Stock.findOrCreate({
            where: { product_id, variant_id: variant_id || null, branch_id },
            defaults: { product_id, variant_id: variant_id || null, branch_id, quantity: 0, reserved_quantity: 0 },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        const previousStock = Number(stockRecord.quantity);
        const newStock = mode === 'delta' ? previousStock + Number(quantity) : Number(quantity);

        if (newStock < 0) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'El ajuste dejaría el stock en negativo' }));
        }

        await stockRecord.update({ quantity: newStock }, { transaction: t });

        // Registrar movimiento auditable
        await StockMovement.create({
            product_id,
            variant_id: variant_id || null,
            branch_id,
            type: 'adjustment',
            quantity: newStock - previousStock,
            previous_stock: previousStock,
            new_stock: newStock,
            notes: reason,
            created_by: req.user?.id || null,
        }, { transaction: t });

        await t.commit();

        return res.status(200).json(successMessage({
            message: messages.entities.stock.success.adjusted,
            extra: { data: stockRecord }
        }));
    } catch (error) {
        await t.rollback();
        console.error('Error adjusting stock:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Listar movimientos de stock
 */
export async function listMovements(req, res) {
    try {
        const { branch_id, product_id, type, page = 1, limit = 50, date_from, date_to } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (branch_id) where.branch_id = Number(branch_id);
        if (product_id) where.product_id = Number(product_id);
        if (type) where.type = type;

        if (date_from && date_to) {
            where.createdAt = { [Op.between]: [new Date(date_from), new Date(date_to + 'T23:59:59')] };
        } else if (date_from) {
            where.createdAt = { [Op.gte]: new Date(date_from) };
        } else if (date_to) {
            where.createdAt = { [Op.lte]: new Date(date_to + 'T23:59:59') };
        }

        const { count, rows } = await StockMovement.findAndCountAll({
            where,
            include: [
                { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
                { model: ProductVariant, as: 'variant', attributes: ['id', 'name'], required: false },
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
            ],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            message: messages.entities.stockMovement.success.list,
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
        console.error('Error listing movements:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Alertas de stock bajo
 */
export async function lowStockAlerts(req, res) {
    try {
        const { branch_id } = req.query;

        const where = {};
        if (branch_id) where.branch_id = Number(branch_id);

        // Umbral global configurable: se usa cuando el producto no define min_stock_alert.
        const config = await BusinessConfig.findOne();
        const globalThreshold = Number(config?.low_stock_threshold || 0);

        const stockRecords = await Stock.findAll({
            where,
            include: [
                {
                    model: Product, as: 'product',
                    attributes: ['id', 'name', 'sku', 'min_stock_alert', 'unit'],
                    where: { track_stock: true }
                },
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
                { model: ProductVariant, as: 'variant', attributes: ['id', 'name'], required: false },
            ],
        });

        const alerts = stockRecords
            .map((s) => {
                const productThreshold = Number(s.product.min_stock_alert || 0);
                const threshold = productThreshold > 0 ? productThreshold : globalThreshold;
                return { record: s, threshold };
            })
            .filter(({ record, threshold }) => threshold > 0 && Number(record.quantity) <= threshold)
            .map(({ record, threshold }) => {
                const json = record.toJSON();
                json.threshold_applied = threshold;
                return json;
            });

        return res.status(200).json(successMessage({
            message: messages.entities.alert.success.list,
            extra: { data: alerts, total: alerts.length }
        }));
    } catch (error) {
        console.error('Error getting stock alerts:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}
