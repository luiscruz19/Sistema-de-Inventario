import CreditNote from '../models/CreditNote.js';
import CreditNoteItem from '../models/CreditNoteItem.js';
import Sale from '../models/Sale.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import sequelize from '../db/sequelize.js';

function generateNumber(count) {
    return `NC-${String(count + 1).padStart(4, '0')}`;
}

/**
 * Listar notas de crédito
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 20, status, sale_id } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};
        if (status) where.status = status;
        if (sale_id) where.sale_id = sale_id;

        const { count, rows } = await CreditNote.findAndCountAll({
            where,
            include: [{ model: CreditNoteItem, as: 'items' }],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            data: rows,
            pagination: { currentPage: Number(page), totalPages: Math.ceil(count / Number(limit)), totalItems: count, itemsPerPage: Number(limit) },
        }));
    } catch (error) {
        console.error('credit-notes list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener notas de crédito' }));
    }
}

/**
 * Obtener NC por ID
 */
export async function getById(req, res) {
    try {
        const { id } = req.params;
        const creditNote = await CreditNote.findOne({
            where: { id },
            include: [{ model: CreditNoteItem, as: 'items' }],
        });
        if (!creditNote) return res.status(404).json(errorMessage({ message: 'Nota de crédito no encontrada' }));
        return res.status(200).json(successMessage({ data: creditNote }));
    } catch (error) {
        console.error('credit-notes getById error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener nota de crédito' }));
    }
}

/**
 * Crear nota de crédito
 */
export async function create(req, res) {
    const t = await sequelize.transaction();
    try {
        const { sale_id, reason, items, refund_method, notes } = req.body;
        const created_by = req.user?.id || req.admin?.id;

        if (!reason || !items || !Array.isArray(items) || items.length === 0) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'reason e items son requeridos' }));
        }

        // Verificar venta si se proporciona
        if (sale_id) {
            const sale = await Sale.findOne({ where: { id: sale_id } });
            if (!sale) { await t.rollback(); return res.status(404).json(errorMessage({ message: 'Venta no encontrada' })); }
        }

        // Calcular totales
        let subtotal = 0;
        let tax_amount = 0;
        const normalizedItems = items.map(item => {
            const itemSubtotal = Number(item.quantity) * Number(item.unit_price);
            const itemTax = itemSubtotal * (Number(item.tax_rate || 0) / 100);
            subtotal += itemSubtotal;
            tax_amount += itemTax;
            return { ...item, subtotal: itemSubtotal };
        });
        const total = subtotal + tax_amount;

        // Generar número
        const count = await CreditNote.count();
        const number = generateNumber(count);

        const creditNote = await CreditNote.create({
            sale_id: sale_id || null,
            number,
            reason,
            status: 'pending',
            subtotal,
            tax_amount,
            total,
            refund_method: refund_method || 'none',
            notes: notes || null,
            created_by,
        }, { transaction: t });

        await CreditNoteItem.bulkCreate(
            normalizedItems.map(item => ({ ...item, credit_note_id: creditNote.id })),
            { transaction: t }
        );

        await t.commit();

        const full = await CreditNote.findOne({ where: { id: creditNote.id }, include: [{ model: CreditNoteItem, as: 'items' }] });
        return res.status(201).json(successMessage({ data: full, message: 'Nota de crédito creada' }));
    } catch (error) {
        await t.rollback();
        console.error('credit-notes create error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear nota de crédito' }));
    }
}

/**
 * Aplicar NC (marcar como applied)
 */
export async function apply(req, res) {
    try {
        const { id } = req.params;
        const creditNote = await CreditNote.findOne({ where: { id } });
        if (!creditNote) return res.status(404).json(errorMessage({ message: 'Nota de crédito no encontrada' }));
        if (creditNote.status !== 'pending') return res.status(409).json(errorMessage({ message: `La NC está en estado ${creditNote.status}` }));
        await creditNote.update({ status: 'applied', applied_at: new Date() });
        return res.status(200).json(successMessage({ data: creditNote, message: 'Nota de crédito aplicada' }));
    } catch (error) {
        console.error('credit-notes apply error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al aplicar nota de crédito' }));
    }
}

/**
 * Cancelar NC
 */
export async function cancel(req, res) {
    try {
        const { id } = req.params;
        const creditNote = await CreditNote.findOne({ where: { id } });
        if (!creditNote) return res.status(404).json(errorMessage({ message: 'Nota de crédito no encontrada' }));
        if (creditNote.status === 'cancelled') return res.status(409).json(errorMessage({ message: 'La NC ya está cancelada' }));
        await creditNote.update({ status: 'cancelled', cancelled_at: new Date() });
        return res.status(200).json(successMessage({ data: creditNote, message: 'Nota de crédito cancelada' }));
    } catch (error) {
        console.error('credit-notes cancel error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al cancelar nota de crédito' }));
    }
}
