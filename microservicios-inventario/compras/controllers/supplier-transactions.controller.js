import Supplier from '../models/Supplier.js';
import SupplierTransaction from '../models/SupplierTransaction.js';
import sequelize from '../db/sequelize.js';
import { errorMessage, successMessage } from '../utils/messages.js';

/**
 * Listar movimientos de cuenta corriente de un proveedor.
 */
export async function list(req, res) {
    try {
        const { id: supplier_id } = req.params;
        const { page = 1, limit = 30 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const supplier = await Supplier.findOne({ where: { id: supplier_id } });
        if (!supplier) return res.status(404).json(errorMessage({ message: 'Proveedor no encontrado' }));

        const { count, rows } = await SupplierTransaction.findAndCountAll({
            where: { supplier_id },
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            extra: {
                data: rows,
                supplier,
                pagination: {
                    totalItems: count,
                    totalPages: Math.ceil(count / Number(limit)),
                    currentPage: Number(page),
                    perPage: Number(limit),
                },
            }
        }));
    } catch (error) {
        console.error('supplier-transactions list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener movimientos del proveedor' }));
    }
}

/**
 * Registrar movimiento manual en la cuenta corriente del proveedor.
 * credit = aumenta la deuda; debit = cancela deuda (pago).
 */
export async function create(req, res) {
    const t = await sequelize.transaction();
    try {
        const { id: supplier_id } = req.params;
        const { type, amount, description, reference_type = 'manual' } = req.body;

        if (!type || !['credit', 'debit'].includes(type)) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'type debe ser "credit" o "debit"' }));
        }
        if (!amount || Number(amount) <= 0 || Number.isNaN(Number(amount))) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'El monto debe ser mayor a 0' }));
        }
        if (!description?.trim()) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'La descripción es requerida' }));
        }

        const supplier = await Supplier.findOne({ where: { id: supplier_id }, lock: t.LOCK.UPDATE, transaction: t });
        if (!supplier) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: 'Proveedor no encontrado' }));
        }

        const delta = type === 'credit' ? Number(amount) : -Number(amount);
        const newBalance = Number((Number(supplier.balance) + delta).toFixed(2));

        await supplier.update({ balance: newBalance }, { transaction: t });

        const tx = await SupplierTransaction.create({
            supplier_id,
            type,
            amount: Number(amount),
            description: description.trim(),
            reference_type,
            balance_after: newBalance,
            created_by: req.user?.id || null,
        }, { transaction: t });

        await t.commit();
        return res.status(201).json(successMessage({ data: tx, message: 'Movimiento registrado' }));
    } catch (error) {
        await t.rollback();
        console.error('supplier-transactions create error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al registrar movimiento' }));
    }
}
