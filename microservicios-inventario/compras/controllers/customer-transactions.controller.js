import Customer from '../models/Customer.js';
import CustomerTransaction from '../models/CustomerTransaction.js';
import sequelize from '../db/sequelize.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

/**
 * Listar transacciones de un cliente
 */
export async function list(req, res) {
    try {
        const { id: customer_id } = req.params;
        const { page = 1, limit = 30 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const customer = await Customer.findOne({ where: { id: customer_id } });
        if (!customer) return res.status(404).json(errorMessage({ message: 'Cliente no encontrado' }));

        const { count, rows } = await CustomerTransaction.findAndCountAll({
            where: { customer_id },
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            extra: {
                data: rows,
                customer,
                pagination: {
                    totalItems: count,
                    totalPages: Math.ceil(count / Number(limit)),
                    currentPage: Number(page),
                    perPage: Number(limit),
                },
            }
        }));
    } catch (error) {
        console.error('customer-transactions list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener movimientos' }));
    }
}

/**
 * Registrar movimiento manual en la cuenta corriente
 */
export async function create(req, res) {
    const t = await sequelize.transaction();
    try {
        const { id: customer_id } = req.params;
        const { type, amount, description, reference_type = 'manual' } = req.body;

        if (!type || !['credit', 'debit'].includes(type)) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'type debe ser "credit" o "debit"' }));
        }
        if (!amount || Number(amount) <= 0) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'El monto debe ser mayor a 0' }));
        }
        if (!description?.trim()) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'La descripción es requerida' }));
        }

        const customer = await Customer.findOne({ where: { id: customer_id }, lock: true, transaction: t });
        if (!customer) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: 'Cliente no encontrado' }));
        }

        const delta = type === 'credit' ? Number(amount) : -Number(amount);
        const newBalance = Number(customer.balance) + delta;

        await customer.update({ balance: newBalance }, { transaction: t });

        const tx = await CustomerTransaction.create({
            customer_id,
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
        console.error('customer-transactions create error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al registrar movimiento' }));
    }
}
