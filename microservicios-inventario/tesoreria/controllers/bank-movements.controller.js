import BankMovement from '../models/BankMovement.js';
import BankAccount from '../models/BankAccount.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import { Op } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Listar movimientos bancarios
 */
export async function list(req, res) {
    try {
        const {
            page = 1, limit = 30,
            bank_account_id, tipo, conciliado,
            fecha_desde, fecha_hasta,
        } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (bank_account_id) where.bank_account_id = Number(bank_account_id);
        if (tipo) where.tipo = tipo;
        if (conciliado !== undefined) where.conciliado = conciliado === 'true';

        if (fecha_desde && fecha_hasta) {
            where.fecha = { [Op.between]: [fecha_desde, fecha_hasta] };
        } else if (fecha_desde) {
            where.fecha = { [Op.gte]: fecha_desde };
        } else if (fecha_hasta) {
            where.fecha = { [Op.lte]: fecha_hasta };
        }

        const { count, rows } = await BankMovement.findAndCountAll({
            where,
            include: [
                { model: BankAccount, as: 'bankAccount', attributes: ['id', 'nombre', 'banco'] },
            ],
            order: [['fecha', 'DESC'], ['createdAt', 'DESC']],
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
        console.error('bank-movements list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener movimientos bancarios' }));
    }
}

/**
 * Obtener movimiento bancario por ID
 */
export async function getById(req, res) {
    try {
        const movement = await BankMovement.findOne({
            where: { id: req.params.id },
            include: [
                { model: BankAccount, as: 'bankAccount', attributes: ['id', 'nombre', 'banco'] },
            ],
        });

        if (!movement) {
            return res.status(404).json(errorMessage({ message: 'Movimiento bancario no encontrado' }));
        }

        return res.status(200).json(successMessage({ data: movement }));
    } catch (error) {
        console.error('bank-movements getById error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener movimiento bancario' }));
    }
}

/**
 * Crear movimiento bancario — calcula saldo resultante automáticamente
 */
export async function create(req, res) {
    const t = await sequelize.transaction();
    try {
        const {
            bank_account_id, fecha, concepto, tipo,
            monto, referencia, sale_id, purchase_order_id,
        } = req.body;

        if (!bank_account_id || !fecha || !concepto || !tipo || monto === undefined) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'bank_account_id, fecha, concepto, tipo y monto son requeridos' }));
        }

        const account = await BankAccount.findOne({ where: { id: bank_account_id } });
        if (!account) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: 'Cuenta bancaria no encontrada' }));
        }

        // Calcular saldo resultante: buscar último movimiento de esa cuenta
        const lastMovement = await BankMovement.findOne({
            where: { bank_account_id },
            order: [['fecha', 'DESC'], ['id', 'DESC']],
            transaction: t,
        });

        const baseSaldo = lastMovement?.saldo_resultante !== null && lastMovement?.saldo_resultante !== undefined
            ? Number(lastMovement.saldo_resultante)
            : Number(account.saldo_inicial);

        const saldo_resultante = tipo === 'ingreso'
            ? baseSaldo + Number(monto)
            : baseSaldo - Number(monto);

        const movement = await BankMovement.create({
            bank_account_id,
            fecha,
            concepto,
            tipo,
            monto: Number(monto),
            saldo_resultante: Number(saldo_resultante.toFixed(2)),
            referencia: referencia || null,
            conciliado: false,
            sale_id: sale_id || null,
            purchase_order_id: purchase_order_id || null,
        }, { transaction: t });

        await t.commit();

        return res.status(201).json(successMessage({ data: movement, message: 'Movimiento bancario registrado' }));
    } catch (error) {
        await t.rollback();
        console.error('bank-movements create error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear movimiento bancario' }));
    }
}
