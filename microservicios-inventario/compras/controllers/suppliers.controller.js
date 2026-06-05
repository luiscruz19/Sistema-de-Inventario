import Supplier from '../models/Supplier.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

export async function list(req, res) {
    try {
        const { page = 1, limit = 20, active, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (active !== undefined) where.active = active === 'true';
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { tax_id: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
            ];
        }

        const { count, rows } = await Supplier.findAndCountAll({
            where,
            order: [['name', 'ASC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            message: messages.entities.supplier.success.list,
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
        console.error('Error listing suppliers:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function getById(req, res) {
    try {
        const supplier = await Supplier.findOne({ where: { id: req.params.id } });
        if (!supplier) {
            return res.status(404).json(errorMessage({ message: messages.entities.supplier.errors.notFound }));
        }
        return res.status(200).json(successMessage({
            message: messages.entities.supplier.success.fetch,
            extra: { data: supplier }
        }));
    } catch (error) {
        console.error('Error getting supplier:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function create(req, res) {
    try {
        const supplier = await Supplier.create({ ...req.body });
        return res.status(201).json(successMessage({
            message: messages.entities.supplier.success.created,
            extra: { data: supplier }
        }));
    } catch (error) {
        console.error('Error creating supplier:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function update(req, res) {
    try {
        const supplier = await Supplier.findOne({ where: { id: req.params.id } });
        if (!supplier) {
            return res.status(404).json(errorMessage({ message: messages.entities.supplier.errors.notFound }));
        }
        await supplier.update(req.body);
        return res.status(200).json(successMessage({
            message: messages.entities.supplier.success.updated,
            extra: { data: supplier }
        }));
    } catch (error) {
        console.error('Error updating supplier:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function remove(req, res) {
    try {
        const supplier = await Supplier.findOne({ where: { id: req.params.id } });
        if (!supplier) {
            return res.status(404).json(errorMessage({ message: messages.entities.supplier.errors.notFound }));
        }
        await supplier.update({ active: false });
        return res.status(200).json(successMessage({ message: messages.entities.supplier.success.deleted }));
    } catch (error) {
        console.error('Error deleting supplier:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function toggle(req, res) {
    try {
        const supplier = await Supplier.findOne({ where: { id: req.params.id } });
        if (!supplier) {
            return res.status(404).json(errorMessage({ message: messages.entities.supplier.errors.notFound }));
        }
        await supplier.update({ active: !supplier.active });
        return res.status(200).json(successMessage({
            message: messages.entities.supplier.success.toggled,
            extra: { data: supplier }
        }));
    } catch (error) {
        console.error('Error toggling supplier:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}
