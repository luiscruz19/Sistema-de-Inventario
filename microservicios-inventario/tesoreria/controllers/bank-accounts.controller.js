import BankAccount from '../models/BankAccount.js';
import BankMovement from '../models/BankMovement.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import { Op } from 'sequelize';

/**
 * Listar cuentas bancarias
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 20, activa } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (activa !== undefined) where.activa = activa === 'true';

        const { count, rows } = await BankAccount.findAndCountAll({
            where,
            order: [['nombre', 'ASC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            data: rows,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / Number(limit)),
                currentPage: Number(page),
                perPage: Number(limit),
            },
        }));
    } catch (error) {
        console.error('bank-accounts list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener cuentas bancarias' }));
    }
}

/**
 * Obtener cuenta bancaria por ID
 */
export async function getById(req, res) {
    try {
        const account = await BankAccount.findOne({
            where: { id: req.params.id },
        });

        if (!account) {
            return res.status(404).json(errorMessage({ message: 'Cuenta bancaria no encontrada' }));
        }

        return res.status(200).json(successMessage({ data: account }));
    } catch (error) {
        console.error('bank-accounts getById error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener cuenta bancaria' }));
    }
}

/**
 * Crear cuenta bancaria
 */
export async function create(req, res) {
    try {
        const { nombre, banco, numero_cuenta, cbu_cvu, tipo, moneda, saldo_inicial } = req.body;

        if (!nombre || !banco) {
            return res.status(400).json(errorMessage({ message: 'nombre y banco son requeridos' }));
        }

        const account = await BankAccount.create({
            nombre,
            banco,
            numero_cuenta: numero_cuenta || null,
            cbu_cvu: cbu_cvu || null,
            tipo: tipo || 'corriente',
            moneda: moneda || 'ARS',
            saldo_inicial: saldo_inicial || 0,
            activa: true,
        });

        return res.status(201).json(successMessage({ data: account, message: 'Cuenta bancaria creada correctamente' }));
    } catch (error) {
        console.error('bank-accounts create error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear cuenta bancaria' }));
    }
}

/**
 * Actualizar cuenta bancaria
 */
export async function update(req, res) {
    try {
        const account = await BankAccount.findOne({ where: { id: req.params.id } });
        if (!account) {
            return res.status(404).json(errorMessage({ message: 'Cuenta bancaria no encontrada' }));
        }

        const { nombre, banco, numero_cuenta, cbu_cvu, tipo, moneda, saldo_inicial, activa } = req.body;

        await account.update({
            ...(nombre !== undefined && { nombre }),
            ...(banco !== undefined && { banco }),
            ...(numero_cuenta !== undefined && { numero_cuenta }),
            ...(cbu_cvu !== undefined && { cbu_cvu }),
            ...(tipo !== undefined && { tipo }),
            ...(moneda !== undefined && { moneda }),
            ...(saldo_inicial !== undefined && { saldo_inicial }),
            ...(activa !== undefined && { activa }),
        });

        return res.status(200).json(successMessage({ data: account, message: 'Cuenta bancaria actualizada' }));
    } catch (error) {
        console.error('bank-accounts update error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al actualizar cuenta bancaria' }));
    }
}

/**
 * Eliminar cuenta bancaria (soft delete)
 */
export async function remove(req, res) {
    try {
        const account = await BankAccount.findOne({ where: { id: req.params.id } });
        if (!account) {
            return res.status(404).json(errorMessage({ message: 'Cuenta bancaria no encontrada' }));
        }

        await account.destroy();
        return res.status(200).json(successMessage({ message: 'Cuenta bancaria eliminada correctamente' }));
    } catch (error) {
        console.error('bank-accounts delete error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al eliminar cuenta bancaria' }));
    }
}

/**
 * Listar movimientos de una cuenta bancaria
 */
export async function getMovements(req, res) {
    try {
        const { id } = req.params;
        const { page = 1, limit = 30, tipo, fecha_desde, fecha_hasta } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const account = await BankAccount.findOne({ where: { id } });
        if (!account) {
            return res.status(404).json(errorMessage({ message: 'Cuenta bancaria no encontrada' }));
        }

        const where = { bank_account_id: Number(id) };
        if (tipo) where.tipo = tipo;
        if (fecha_desde && fecha_hasta) {
            where.fecha = { [Op.between]: [fecha_desde, fecha_hasta] };
        } else if (fecha_desde) {
            where.fecha = { [Op.gte]: fecha_desde };
        } else if (fecha_hasta) {
            where.fecha = { [Op.lte]: fecha_hasta };
        }

        const { count, rows } = await BankMovement.findAndCountAll({
            where,
            order: [['fecha', 'DESC'], ['createdAt', 'DESC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            data: { account, movements: rows },
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / Number(limit)),
                currentPage: Number(page),
                perPage: Number(limit),
            },
        }));
    } catch (error) {
        console.error('bank-accounts getMovements error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener movimientos' }));
    }
}
