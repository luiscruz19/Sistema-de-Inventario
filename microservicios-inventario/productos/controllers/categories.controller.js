import Category from '../models/Category.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

export async function list(req, res) {
    try {
        const where = {};
        if (req.query.active !== undefined) where.active = req.query.active === 'true';

        const categories = await Category.findAll({
            where,
            include: [{ model: Category, as: 'subcategories' }],
            order: [['sort_order', 'ASC'], ['name', 'ASC']],
        });

        // Filtrar solo categorías raíz (parent_id null) para respuesta jerárquica
        const rootCategories = categories.filter(c => !c.parent_id);

        return res.status(200).json(successMessage({
            message: messages.entities.category.success.list,
            extra: { data: rootCategories, all: categories }
        }));
    } catch (error) {
        console.error('Error listing categories:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function getById(req, res) {
    try {
        const category = await Category.findOne({
            where: { id: req.params.id },
            include: [{ model: Category, as: 'subcategories' }],
        });
        if (!category) {
            return res.status(404).json(errorMessage({ message: messages.entities.category.errors.notFound }));
        }
        return res.status(200).json(successMessage({
            message: messages.entities.category.success.fetch,
            extra: { data: category }
        }));
    } catch (error) {
        console.error('Error getting category:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function create(req, res) {
    try {
        const category = await Category.create({ ...req.body });
        return res.status(201).json(successMessage({
            message: messages.entities.category.success.created,
            extra: { data: category }
        }));
    } catch (error) {
        console.error('Error creating category:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function update(req, res) {
    try {
        const category = await Category.findOne({ where: { id: req.params.id } });
        if (!category) {
            return res.status(404).json(errorMessage({ message: messages.entities.category.errors.notFound }));
        }
        await category.update(req.body);
        return res.status(200).json(successMessage({
            message: messages.entities.category.success.updated,
            extra: { data: category }
        }));
    } catch (error) {
        console.error('Error updating category:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function remove(req, res) {
    try {
        const category = await Category.findOne({ where: { id: req.params.id } });
        if (!category) {
            return res.status(404).json(errorMessage({ message: messages.entities.category.errors.notFound }));
        }
        await category.update({ active: false });
        return res.status(200).json(successMessage({ message: messages.entities.category.success.deleted }));
    } catch (error) {
        console.error('Error deleting category:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}
