import CashRegister from '../models/CashRegister.js';
import CashMovement from '../models/CashMovement.js';
import Sale from '../models/Sale.js';
import SalePayment from '../models/SalePayment.js';
import Branch from '../models/Branch.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

/**
 * Calcula el efectivo esperado en una caja: apertura + ventas en efectivo del turno
 * + ingresos manuales - egresos manuales.
 */
async function computeExpectedCash(cashRegister) {
    const cashSales = await SalePayment.findAll({
        where: { method: 'cash' },
        include: [{
            model: Sale, as: 'sale',
            where: {
                branch_id: cashRegister.branch_id,
                status: 'completed',
                completed_at: { [Op.between]: [cashRegister.opened_at, new Date()] },
            },
            attributes: [],
        }],
    });
    const cashIncome = cashSales.reduce((sum, p) => sum + Number(p.amount), 0);

    const movements = await CashMovement.findAll({ where: { cash_register_id: cashRegister.id } });
    const manualIncome = movements
        .filter((m) => m.type === 'income')
        .reduce((sum, m) => sum + Number(m.amount), 0);
    const manualExpense = movements
        .filter((m) => m.type === 'expense')
        .reduce((sum, m) => sum + Number(m.amount), 0);

    const expected = Number(cashRegister.opening_amount) + cashIncome + manualIncome - manualExpense;
    return {
        cashIncome: Number(cashIncome.toFixed(2)),
        manualIncome: Number(manualIncome.toFixed(2)),
        manualExpense: Number(manualExpense.toFixed(2)),
        expected: Number(expected.toFixed(2)),
    };
}

/**
 * Listar cajas (historial)
 */
export async function list(req, res) {
    try {
        const { branch_id, status, page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (branch_id) where.branch_id = Number(branch_id);
        if (status) where.status = status;

        const { count, rows } = await CashRegister.findAndCountAll({
            where,
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
            order: [['opened_at', 'DESC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            message: messages.entities.cashRegister.success.list,
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
        console.error('Error listing cash registers:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Abrir caja
 */
export async function open(req, res) {
    try {
        const { branch_id, opening_amount = 0 } = req.body;

        // Verificar que no haya otra caja abierta en esa sucursal
        const existingOpen = await CashRegister.findOne({
            where: { branch_id, status: 'open' }
        });

        if (existingOpen) {
            return res.status(400).json(errorMessage({ message: messages.entities.cashRegister.errors.alreadyOpen }));
        }

        const cashRegister = await CashRegister.create({
            branch_id,
            opened_by: req.user?.id || null,
            opening_amount: Number(opening_amount),
            status: 'open',
            opened_at: new Date(),
        });

        return res.status(201).json(successMessage({
            message: messages.entities.cashRegister.success.opened,
            extra: { data: cashRegister }
        }));
    } catch (error) {
        console.error('Error opening cash register:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Cerrar caja — calcula monto esperado a partir de ventas en efectivo
 */
export async function close(req, res) {
    try {
        const { id } = req.params;
        const { closing_amount } = req.body;

        const cashRegister = await CashRegister.findOne({
            where: { id }
        });

        if (!cashRegister) {
            return res.status(404).json(errorMessage({ message: messages.entities.cashRegister.errors.notFound }));
        }
        if (cashRegister.status === 'closed') {
            return res.status(400).json(errorMessage({ message: messages.entities.cashRegister.errors.alreadyClosed }));
        }

        if (closing_amount === undefined || Number.isNaN(Number(closing_amount))) {
            return res.status(400).json(errorMessage({ message: 'closing_amount es requerido' }));
        }

        // Calcular efectivo esperado: apertura + ventas en efectivo + movimientos manuales
        const { expected: expectedAmount } = await computeExpectedCash(cashRegister);
        const difference = Number(closing_amount) - expectedAmount;

        await cashRegister.update({
            closing_amount: Number(closing_amount),
            expected_amount: Number(expectedAmount.toFixed(2)),
            difference: Number(difference.toFixed(2)),
            status: 'closed',
            closed_by: req.user?.id || null,
            closed_at: new Date(),
        });

        return res.status(200).json(successMessage({
            message: messages.entities.cashRegister.success.closed,
            extra: { data: cashRegister }
        }));
    } catch (error) {
        console.error('Error closing cash register:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Obtener caja abierta actual de una sucursal
 */
export async function getCurrent(req, res) {
    try {
        const { branch_id } = req.query;
        const cashRegister = await CashRegister.findOne({
            where: { branch_id: Number(branch_id), status: 'open' },
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
        });

        if (!cashRegister) {
            return res.status(404).json(errorMessage({ message: messages.entities.cashRegister.errors.noneOpen }));
        }

        return res.status(200).json(successMessage({
            message: messages.entities.cashRegister.success.fetch,
            extra: { data: cashRegister }
        }));
    } catch (error) {
        console.error('Error getting current cash register:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Cerrar caja activa de una sucursal (sin ID, busca por branch_id)
 * Usado por el BFF que envía POST /cash-register/close con { branch_id, closing_amount }
 */
export async function closeByBranch(req, res) {
    try {
        const { branch_id, closing_amount } = req.body;

        const cashRegister = await CashRegister.findOne({
            where: { branch_id: Number(branch_id), status: 'open' }
        });

        if (!cashRegister) {
            return res.status(404).json(errorMessage({ message: messages.entities.cashRegister.errors.noneOpen || 'No hay caja abierta para esta sucursal' }));
        }
        if (cashRegister.status === 'closed') {
            return res.status(400).json(errorMessage({ message: messages.entities.cashRegister.errors.alreadyClosed }));
        }

        if (closing_amount === undefined || Number.isNaN(Number(closing_amount))) {
            return res.status(400).json(errorMessage({ message: 'closing_amount es requerido' }));
        }

        const { expected: expectedAmount } = await computeExpectedCash(cashRegister);
        const difference = Number(closing_amount) - expectedAmount;

        await cashRegister.update({
            closing_amount: Number(closing_amount),
            expected_amount: Number(expectedAmount.toFixed(2)),
            difference: Number(difference.toFixed(2)),
            status: 'closed',
            closed_by: req.user?.id || null,
            closed_at: new Date(),
        });

        return res.status(200).json(successMessage({
            message: messages.entities.cashRegister.success.closed,
            extra: { data: cashRegister }
        }));
    } catch (error) {
        console.error('Error closing cash register by branch:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Registrar un movimiento de caja (ingreso/egreso de efectivo) sobre la caja abierta.
 */
export async function addMovement(req, res) {
    try {
        const { id } = req.params;
        const { type, amount, concept, reference } = req.body;

        if (!['income', 'expense'].includes(type)) {
            return res.status(400).json(errorMessage({ message: 'type debe ser "income" o "expense"' }));
        }
        if (!amount || Number(amount) <= 0 || Number.isNaN(Number(amount))) {
            return res.status(400).json(errorMessage({ message: 'El monto debe ser mayor a 0' }));
        }
        if (!concept?.trim()) {
            return res.status(400).json(errorMessage({ message: 'El concepto es requerido' }));
        }

        const cashRegister = await CashRegister.findOne({ where: { id } });
        if (!cashRegister) {
            return res.status(404).json(errorMessage({ message: messages.entities.cashRegister.errors.notFound }));
        }
        if (cashRegister.status !== 'open') {
            return res.status(400).json(errorMessage({ message: 'No se pueden registrar movimientos sobre una caja cerrada' }));
        }

        const movement = await CashMovement.create({
            cash_register_id: cashRegister.id,
            type,
            amount: Number(amount),
            concept: concept.trim(),
            reference: reference || null,
            created_by: req.user?.id || null,
        });

        return res.status(201).json(successMessage({
            message: 'Movimiento de caja registrado',
            extra: { data: movement },
        }));
    } catch (error) {
        console.error('Error adding cash movement:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Arqueo en vivo de una caja: detalle de efectivo esperado y movimientos.
 */
export async function getSummary(req, res) {
    try {
        const { id } = req.params;
        const cashRegister = await CashRegister.findOne({
            where: { id },
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
        });
        if (!cashRegister) {
            return res.status(404).json(errorMessage({ message: messages.entities.cashRegister.errors.notFound }));
        }

        const breakdown = await computeExpectedCash(cashRegister);
        const movements = await CashMovement.findAll({
            where: { cash_register_id: cashRegister.id },
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json(successMessage({
            message: 'Arqueo de caja',
            extra: {
                data: {
                    cash_register: cashRegister,
                    opening_amount: Number(cashRegister.opening_amount),
                    cash_sales: breakdown.cashIncome,
                    manual_income: breakdown.manualIncome,
                    manual_expense: breakdown.manualExpense,
                    expected_cash: breakdown.expected,
                    movements,
                },
            },
        }));
    } catch (error) {
        console.error('Error getting cash register summary:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}
