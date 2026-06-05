import Customer from '../models/Customer.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

export async function list(req, res) {
    try {
        const { page = 1, limit = 20, active, type, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (active !== undefined) where.active = active === 'true';
        if (type) where.type = type;
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { tax_id: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } },
            ];
        }

        const { count, rows } = await Customer.findAndCountAll({
            where,
            order: [['name', 'ASC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            message: messages.entities.customer.success.list,
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
        console.error('Error listing customers:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function getById(req, res) {
    try {
        const customer = await Customer.findOne({ where: { id: req.params.id } });
        if (!customer) {
            return res.status(404).json(errorMessage({ message: messages.entities.customer.errors.notFound }));
        }
        return res.status(200).json(successMessage({
            message: messages.entities.customer.success.fetch,
            extra: { data: customer }
        }));
    } catch (error) {
        console.error('Error getting customer:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function create(req, res) {
    try {
        const customer = await Customer.create({ ...req.body });
        return res.status(201).json(successMessage({
            message: messages.entities.customer.success.created,
            extra: { data: customer }
        }));
    } catch (error) {
        console.error('Error creating customer:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function update(req, res) {
    try {
        const customer = await Customer.findOne({ where: { id: req.params.id } });
        if (!customer) {
            return res.status(404).json(errorMessage({ message: messages.entities.customer.errors.notFound }));
        }
        await customer.update(req.body);
        return res.status(200).json(successMessage({
            message: messages.entities.customer.success.updated,
            extra: { data: customer }
        }));
    } catch (error) {
        console.error('Error updating customer:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function remove(req, res) {
    try {
        const customer = await Customer.findOne({ where: { id: req.params.id } });
        if (!customer) {
            return res.status(404).json(errorMessage({ message: messages.entities.customer.errors.notFound }));
        }
        await customer.update({ active: false });
        return res.status(200).json(successMessage({ message: messages.entities.customer.success.deleted }));
    } catch (error) {
        console.error('Error deleting customer:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function toggle(req, res) {
    try {
        const customer = await Customer.findOne({ where: { id: req.params.id } });
        if (!customer) {
            return res.status(404).json(errorMessage({ message: messages.entities.customer.errors.notFound }));
        }
        await customer.update({ active: !customer.active });
        return res.status(200).json(successMessage({
            message: messages.entities.customer.success.toggled,
            extra: { data: customer }
        }));
    } catch (error) {
        console.error('Error toggling customer:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}
