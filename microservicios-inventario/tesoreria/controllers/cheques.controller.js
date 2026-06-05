import Cheque from '../models/Cheque.js';
import BankAccount from '../models/BankAccount.js';
import BankMovement from '../models/BankMovement.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import sequelize from '../db/sequelize.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import { Op } from 'sequelize';

/**
 * Registra un movimiento bancario por la acreditación/débito de un cheque
 * sobre la cuenta bancaria asociada, calculando el saldo resultante.
 */
async function registerChequeBankMovement(cheque, t) {
    if (!cheque.bank_account_id) return null;

    const account = await BankAccount.findByPk(cheque.bank_account_id, { transaction: t });
    if (!account) return null;

    // Cheque recibido cobrado = ingreso; cheque emitido cobrado/debitado = egreso.
    const tipo = cheque.tipo === 'recibido' ? 'ingreso' : 'egreso';

    const lastMovement = await BankMovement.findOne({
        where: { bank_account_id: cheque.bank_account_id },
        order: [['fecha', 'DESC'], ['id', 'DESC']],
        transaction: t,
    });
    const baseSaldo = lastMovement?.saldo_resultante != null
        ? Number(lastMovement.saldo_resultante)
        : Number(account.saldo_inicial || 0);
    const saldo_resultante = tipo === 'ingreso'
        ? baseSaldo + Number(cheque.monto)
        : baseSaldo - Number(cheque.monto);

    return BankMovement.create({
        bank_account_id: cheque.bank_account_id,
        fecha: new Date().toISOString().slice(0, 10),
        concepto: `Cheque ${cheque.numero} - ${cheque.banco}`,
        tipo,
        monto: Number(cheque.monto),
        saldo_resultante: Number(saldo_resultante.toFixed(2)),
        referencia: `cheque:${cheque.id}`,
        conciliado: false,
    }, { transaction: t });
}

/**
 * Listar cheques con filtros
 */
export async function list(req, res) {
    try {
        const {
            page = 1, limit = 20,
            tipo, estado,
            vencimiento_desde, vencimiento_hasta,
        } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (tipo) where.tipo = tipo;
        if (estado) where.estado = estado;

        if (vencimiento_desde && vencimiento_hasta) {
            where.fecha_vencimiento = { [Op.between]: [vencimiento_desde, vencimiento_hasta] };
        } else if (vencimiento_desde) {
            where.fecha_vencimiento = { [Op.gte]: vencimiento_desde };
        } else if (vencimiento_hasta) {
            where.fecha_vencimiento = { [Op.lte]: vencimiento_hasta };
        }

        const { count, rows } = await Cheque.findAndCountAll({
            where,
            include: [
                { model: BankAccount, as: 'bankAccount', attributes: ['id', 'nombre', 'banco'], required: false },
                { model: Customer, as: 'customer', attributes: ['id', 'name'], required: false },
                { model: Supplier, as: 'supplier', attributes: ['id', 'name'], required: false },
            ],
            order: [['fecha_vencimiento', 'ASC']],
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
        console.error('cheques list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener cheques' }));
    }
}

/**
 * Obtener cheque por ID
 */
export async function getById(req, res) {
    try {
        const cheque = await Cheque.findOne({
            where: { id: req.params.id },
            include: [
                { model: BankAccount, as: 'bankAccount', attributes: ['id', 'nombre', 'banco'], required: false },
                { model: Customer, as: 'customer', attributes: ['id', 'name'], required: false },
                { model: Supplier, as: 'supplier', attributes: ['id', 'name'], required: false },
            ],
        });

        if (!cheque) {
            return res.status(404).json(errorMessage({ message: 'Cheque no encontrado' }));
        }

        return res.status(200).json(successMessage({ data: cheque }));
    } catch (error) {
        console.error('cheques getById error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener cheque' }));
    }
}

/**
 * Crear cheque
 */
export async function create(req, res) {
    try {
        const {
            tipo, numero, banco, monto,
            fecha_emision, fecha_vencimiento,
            beneficiario, emisor, bank_account_id,
            customer_id, supplier_id, observaciones,
        } = req.body;

        if (!tipo || !numero || !banco || !monto || !fecha_emision || !fecha_vencimiento) {
            return res.status(400).json(errorMessage({ message: 'tipo, numero, banco, monto, fecha_emision y fecha_vencimiento son requeridos' }));
        }

        const cheque = await Cheque.create({
            tipo,
            numero,
            banco,
            monto: Number(monto),
            fecha_emision,
            fecha_vencimiento,
            beneficiario: beneficiario || null,
            emisor: emisor || null,
            estado: 'en_cartera',
            bank_account_id: bank_account_id || null,
            customer_id: customer_id || null,
            supplier_id: supplier_id || null,
            observaciones: observaciones || null,
        });

        return res.status(201).json(successMessage({ data: cheque, message: 'Cheque registrado correctamente' }));
    } catch (error) {
        console.error('cheques create error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear cheque' }));
    }
}

/**
 * Actualizar cheque
 */
export async function update(req, res) {
    try {
        const cheque = await Cheque.findOne({ where: { id: req.params.id } });
        if (!cheque) {
            return res.status(404).json(errorMessage({ message: 'Cheque no encontrado' }));
        }

        const {
            numero, banco, monto, fecha_emision, fecha_vencimiento,
            beneficiario, emisor, bank_account_id, customer_id, supplier_id, observaciones,
        } = req.body;

        await cheque.update({
            ...(numero !== undefined && { numero }),
            ...(banco !== undefined && { banco }),
            ...(monto !== undefined && { monto: Number(monto) }),
            ...(fecha_emision !== undefined && { fecha_emision }),
            ...(fecha_vencimiento !== undefined && { fecha_vencimiento }),
            ...(beneficiario !== undefined && { beneficiario }),
            ...(emisor !== undefined && { emisor }),
            ...(bank_account_id !== undefined && { bank_account_id }),
            ...(customer_id !== undefined && { customer_id }),
            ...(supplier_id !== undefined && { supplier_id }),
            ...(observaciones !== undefined && { observaciones }),
        });

        return res.status(200).json(successMessage({ data: cheque, message: 'Cheque actualizado' }));
    } catch (error) {
        console.error('cheques update error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al actualizar cheque' }));
    }
}

/**
 * Depositar cheque — cambia estado en_cartera -> depositado
 */
export async function depositar(req, res) {
    try {
        const cheque = await Cheque.findOne({ where: { id: req.params.id } });
        if (!cheque) return res.status(404).json(errorMessage({ message: 'Cheque no encontrado' }));

        if (cheque.estado !== 'en_cartera') {
            return res.status(409).json(errorMessage({ message: `Solo se puede depositar un cheque en cartera (estado actual: ${cheque.estado})` }));
        }

        const { bank_account_id, observaciones } = req.body;

        await cheque.update({
            estado: 'depositado',
            ...(bank_account_id && { bank_account_id }),
            ...(observaciones && { observaciones }),
        });

        return res.status(200).json(successMessage({ data: cheque, message: 'Cheque marcado como depositado' }));
    } catch (error) {
        console.error('cheques depositar error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al depositar cheque' }));
    }
}

/**
 * Cobrar cheque — cambia estado a cobrado y genera el movimiento bancario asociado.
 */
export async function cobrar(req, res) {
    const t = await sequelize.transaction();
    try {
        const cheque = await Cheque.findOne({ where: { id: req.params.id }, transaction: t, lock: t.LOCK.UPDATE });
        if (!cheque) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: 'Cheque no encontrado' }));
        }

        const estadosValidos = ['en_cartera', 'depositado'];
        if (!estadosValidos.includes(cheque.estado)) {
            await t.rollback();
            return res.status(409).json(errorMessage({ message: `No se puede cobrar un cheque en estado ${cheque.estado}` }));
        }

        const { observaciones } = req.body;

        await cheque.update({
            estado: 'cobrado',
            ...(observaciones && { observaciones }),
        }, { transaction: t });

        await registerChequeBankMovement(cheque, t);

        await t.commit();

        return res.status(200).json(successMessage({ data: cheque, message: 'Cheque marcado como cobrado' }));
    } catch (error) {
        await t.rollback();
        console.error('cheques cobrar error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al cobrar cheque' }));
    }
}

/**
 * Anular cheque — cambia estado a anulado (no puede estar ya cobrado).
 */
export async function anular(req, res) {
    try {
        const cheque = await Cheque.findOne({ where: { id: req.params.id } });
        if (!cheque) return res.status(404).json(errorMessage({ message: 'Cheque no encontrado' }));

        if (['cobrado', 'anulado'].includes(cheque.estado)) {
            return res.status(409).json(errorMessage({ message: `No se puede anular un cheque en estado ${cheque.estado}` }));
        }

        const { observaciones } = req.body;
        await cheque.update({ estado: 'anulado', ...(observaciones && { observaciones }) });

        return res.status(200).json(successMessage({ data: cheque, message: 'Cheque anulado' }));
    } catch (error) {
        console.error('cheques anular error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al anular cheque' }));
    }
}

/**
 * Rechazar cheque — cambia estado a rechazado
 */
export async function rechazar(req, res) {
    try {
        const cheque = await Cheque.findOne({ where: { id: req.params.id } });
        if (!cheque) return res.status(404).json(errorMessage({ message: 'Cheque no encontrado' }));

        const estadosValidos = ['en_cartera', 'depositado'];
        if (!estadosValidos.includes(cheque.estado)) {
            return res.status(409).json(errorMessage({ message: `No se puede rechazar un cheque en estado ${cheque.estado}` }));
        }

        const { observaciones } = req.body;

        await cheque.update({
            estado: 'rechazado',
            ...(observaciones && { observaciones }),
        });

        return res.status(200).json(successMessage({ data: cheque, message: 'Cheque marcado como rechazado' }));
    } catch (error) {
        console.error('cheques rechazar error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al rechazar cheque' }));
    }
}
