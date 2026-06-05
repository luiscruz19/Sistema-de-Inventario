import VatBookEntry from '../models/VatBookEntry.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import { Op } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Listar entradas del libro de IVA
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 50, tipo, periodo } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (tipo) where.tipo = tipo;
        if (periodo) where.periodo = periodo;

        const { count, rows } = await VatBookEntry.findAndCountAll({
            where,
            order: [['fecha', 'ASC'], ['id', 'ASC']],
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
        console.error('vat-book list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener libro IVA' }));
    }
}

/**
 * Reporte del libro de IVA por período con totales agrupados
 */
export async function report(req, res) {
    try {
        const { tipo, periodo } = req.query;

        if (!periodo) {
            return res.status(400).json(errorMessage({ message: 'El parámetro periodo (YYYY-MM) es requerido' }));
        }

        const where = { periodo };
        if (tipo) where.tipo = tipo;

        const entries = await VatBookEntry.findAll({
            where,
            order: [['fecha', 'ASC']],
        });

        // Calcular totales del período
        const totales = entries.reduce((acc, e) => {
            acc.neto_gravado += Number(e.neto_gravado);
            acc.neto_no_gravado += Number(e.neto_no_gravado);
            acc.iva_21 += Number(e.iva_21);
            acc.iva_105 += Number(e.iva_105);
            acc.iva_27 += Number(e.iva_27);
            acc.total += Number(e.total);
            return acc;
        }, { neto_gravado: 0, neto_no_gravado: 0, iva_21: 0, iva_105: 0, iva_27: 0, total: 0 });

        return res.status(200).json(successMessage({
            data: {
                periodo,
                tipo: tipo || 'todos',
                entries,
                totales: {
                    neto_gravado: Number(totales.neto_gravado.toFixed(2)),
                    neto_no_gravado: Number(totales.neto_no_gravado.toFixed(2)),
                    iva_21: Number(totales.iva_21.toFixed(2)),
                    iva_105: Number(totales.iva_105.toFixed(2)),
                    iva_27: Number(totales.iva_27.toFixed(2)),
                    total: Number(totales.total.toFixed(2)),
                },
                count: entries.length,
            },
        }));
    } catch (error) {
        console.error('vat-book report error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al generar reporte de IVA' }));
    }
}
