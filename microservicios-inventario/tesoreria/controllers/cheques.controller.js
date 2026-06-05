import Cheque from '../models/Cheque.js';
import BankAccount from '../models/BankAccount.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import { Op } from 'sequelize';

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
 * Cobrar cheque — cambia estado a cobrado
 */
export async function cobrar(req, res) {
    try {
        const cheque = await Cheque.findOne({ where: { id: req.params.id } });
        if (!cheque) return res.status(404).json(errorMessage({ message: 'Cheque no encontrado' }));

        const estadosValidos = ['en_cartera', 'depositado'];
        if (!estadosValidos.includes(cheque.estado)) {
            return res.status(409).json(errorMessage({ message: `No se puede cobrar un cheque en estado ${cheque.estado}` }));
        }

        const { observaciones } = req.body;

        await cheque.update({
            estado: 'cobrado',
            ...(observaciones && { observaciones }),
        });

        return res.status(200).json(successMessage({ data: cheque, message: 'Cheque marcado como cobrado' }));
    } catch (error) {
        console.error('cheques cobrar error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al cobrar cheque' }));
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
