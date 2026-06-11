import Branch from '../models/Branch.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

export async function list(req, res) {
    try {
        const where = {};
        if (req.query.active === undefined) where.active = true;
        else if (req.query.active !== 'all') where.active = req.query.active === 'true';

        const branches = await Branch.findAll({
            where,
            order: [['is_main', 'DESC'], ['name', 'ASC']],
        });

        return res.status(200).json(successMessage({
            message: messages.entities.branch.success.list,
            extra: { data: branches }
        }));
    } catch (error) {
        console.error('Error listing branches:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function getById(req, res) {
    try {
        const branch = await Branch.findOne({
            where: { id: req.params.id },
        });
        if (!branch) {
            return res.status(404).json(errorMessage({ message: messages.entities.branch.errors.notFound }));
        }
        return res.status(200).json(successMessage({
            message: messages.entities.branch.success.fetch,
            extra: { data: branch }
        }));
    } catch (error) {
        console.error('Error getting branch:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function create(req, res) {
    try {
        const branch = await Branch.create({ ...req.body });
        return res.status(201).json(successMessage({
            message: messages.entities.branch.success.created,
            extra: { data: branch }
        }));
    } catch (error) {
        console.error('Error creating branch:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function update(req, res) {
    try {
        const branch = await Branch.findOne({ where: { id: req.params.id } });
        if (!branch) {
            return res.status(404).json(errorMessage({ message: messages.entities.branch.errors.notFound }));
        }
        await branch.update(req.body);
        return res.status(200).json(successMessage({
            message: messages.entities.branch.success.updated,
            extra: { data: branch }
        }));
    } catch (error) {
        console.error('Error updating branch:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function remove(req, res) {
    try {
        const branch = await Branch.findOne({ where: { id: req.params.id } });
        if (!branch) {
            return res.status(404).json(errorMessage({ message: messages.entities.branch.errors.notFound }));
        }
        // Soft-delete: marcar como inactiva
        await branch.update({ active: false });
        return res.status(200).json(successMessage({ message: messages.entities.branch.success.deleted }));
    } catch (error) {
        console.error('Error deleting branch:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function toggle(req, res) {
    try {
        const branch = await Branch.findOne({ where: { id: req.params.id } });
        if (!branch) {
            return res.status(404).json(errorMessage({ message: messages.entities.branch.errors.notFound }));
        }
        await branch.update({ active: !branch.active });
        return res.status(200).json(successMessage({
            message: messages.entities.branch.success.toggled,
            extra: { data: branch }
        }));
    } catch (error) {
        console.error('Error toggling branch:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}
