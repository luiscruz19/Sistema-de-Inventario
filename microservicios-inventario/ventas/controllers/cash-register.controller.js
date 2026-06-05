import CashRegister from '../models/CashRegister.js';
import Sale from '../models/Sale.js';
import SalePayment from '../models/SalePayment.js';
import Branch from '../models/Branch.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

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

        // Calcular ventas en efectivo durante el turno de caja
        const cashSales = await SalePayment.findAll({
            where: {
                method: 'cash',
            },
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
        const expectedAmount = Number(cashRegister.opening_amount) + cashIncome;
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
        const expectedAmount = Number(cashRegister.opening_amount) + cashIncome;
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
