import JournalEntry from '../models/JournalEntry.js';
import JournalEntryLine from '../models/JournalEntryLine.js';
import ChartOfAccount from '../models/ChartOfAccount.js';
import sequelize from '../db/sequelize.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import { Op } from 'sequelize';

/**
 * Listar asientos contables
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 20, fecha_desde, fecha_hasta, tipo, aprobado } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (tipo) where.tipo = tipo;
        if (aprobado !== undefined) where.aprobado = aprobado === 'true';

        if (fecha_desde && fecha_hasta) {
            where.fecha = { [Op.between]: [fecha_desde, fecha_hasta] };
        } else if (fecha_desde) {
            where.fecha = { [Op.gte]: fecha_desde };
        } else if (fecha_hasta) {
            where.fecha = { [Op.lte]: fecha_hasta };
        }

        const { count, rows } = await JournalEntry.findAndCountAll({
            where,
            order: [['fecha', 'DESC'], ['numero', 'DESC']],
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
        console.error('journal-entries list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener asientos contables' }));
    }
}

/**
 * Obtener asiento contable por ID (con líneas)
 */
export async function getById(req, res) {
    try {
        const entry = await JournalEntry.findOne({
            where: { id: req.params.id },
            include: [
                {
                    model: JournalEntryLine, as: 'lines',
                    include: [
                        { model: ChartOfAccount, as: 'account', attributes: ['id', 'codigo', 'nombre', 'tipo'] },
                    ],
                },
            ],
        });

        if (!entry) {
            return res.status(404).json(errorMessage({ message: 'Asiento contable no encontrado' }));
        }

        return res.status(200).json(successMessage({ data: entry }));
    } catch (error) {
        console.error('journal-entries getById error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener asiento contable' }));
    }
}

/**
 * Crear asiento contable con sus líneas
 * Valida que debe == haber antes de guardar
 */
export async function create(req, res) {
    const t = await sequelize.transaction();
    try {
        const { fecha, descripcion, tipo = 'manual', referencia_tipo, referencia_id, lines } = req.body;

        if (!fecha || !descripcion || !Array.isArray(lines) || lines.length < 2) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'fecha, descripcion y al menos 2 líneas son requeridos' }));
        }

        const total_debe = lines.reduce((sum, l) => sum + Number(l.debe || 0), 0);
        const total_haber = lines.reduce((sum, l) => sum + Number(l.haber || 0), 0);

        if (Math.abs(total_debe - total_haber) > 0.01) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: `El asiento no cuadra: debe=${total_debe} haber=${total_haber}` }));
        }

        // Generar número correlativo
        const count = await JournalEntry.count();

        const entry = await JournalEntry.create({
            fecha,
            numero: count + 1,
            descripcion,
            tipo,
            referencia_tipo: referencia_tipo || null,
            referencia_id: referencia_id || null,
            total_debe: Number(total_debe.toFixed(2)),
            total_haber: Number(total_haber.toFixed(2)),
            aprobado: false,
        }, { transaction: t });

        await JournalEntryLine.bulkCreate(
            lines.map(l => ({
                journal_entry_id: entry.id,
                account_id: l.account_id,
                descripcion: l.descripcion || null,
                debe: Number(l.debe || 0),
                haber: Number(l.haber || 0),
            })),
            { transaction: t }
        );

        // Actualizar saldo de las cuentas involucradas
        for (const l of lines) {
            const account = await ChartOfAccount.findByPk(l.account_id, { transaction: t });
            if (account) {
                const delta = Number(l.debe || 0) - Number(l.haber || 0);
                await account.update({ saldo: Number(account.saldo) + delta }, { transaction: t });
            }
        }

        await t.commit();

        const full = await JournalEntry.findOne({
            where: { id: entry.id },
            include: [{ model: JournalEntryLine, as: 'lines' }],
        });

        return res.status(201).json(successMessage({ data: full, message: 'Asiento contable creado correctamente' }));
    } catch (error) {
        await t.rollback();
        console.error('journal-entries create error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear asiento contable' }));
    }
}
