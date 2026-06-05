import PriceList from '../models/PriceList.js';
import PriceListItem from '../models/PriceListItem.js';
import Product from '../models/Product.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

export async function list(req, res) {
    try {
        const where = {};
        if (req.query.active !== undefined) where.active = req.query.active === 'true';

        const priceLists = await PriceList.findAll({
            where,
            order: [['name', 'ASC']],
        });

        return res.status(200).json(successMessage({
            message: messages.entities.priceList.success.list,
            extra: { data: priceLists }
        }));
    } catch (error) {
        console.error('Error listing price lists:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function getById(req, res) {
    try {
        const priceList = await PriceList.findOne({
            where: { id: req.params.id },
            include: [{
                model: PriceListItem, as: 'items',
                include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'sale_price'] }]
            }],
        });
        if (!priceList) {
            return res.status(404).json(errorMessage({ message: messages.entities.priceList.errors.notFound }));
        }
        return res.status(200).json(successMessage({
            message: messages.entities.priceList.success.fetch,
            extra: { data: priceList }
        }));
    } catch (error) {
        console.error('Error getting price list:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function create(req, res) {
    try {
        const priceList = await PriceList.create({ ...req.body });

        // Crear items si se envían
        if (req.body.items && Array.isArray(req.body.items)) {
            for (const item of req.body.items) {
                await PriceListItem.create({ ...item, price_list_id: priceList.id });
            }
        }

        return res.status(201).json(successMessage({
            message: messages.entities.priceList.success.created,
            extra: { data: priceList }
        }));
    } catch (error) {
        console.error('Error creating price list:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function update(req, res) {
    try {
        const priceList = await PriceList.findOne({ where: { id: req.params.id } });
        if (!priceList) {
            return res.status(404).json(errorMessage({ message: messages.entities.priceList.errors.notFound }));
        }
        await priceList.update(req.body);

        // Actualizar items si se envían
        if (req.body.items && Array.isArray(req.body.items)) {
            await PriceListItem.destroy({ where: { price_list_id: priceList.id } });
            for (const item of req.body.items) {
                await PriceListItem.create({ ...item, price_list_id: priceList.id });
            }
        }

        return res.status(200).json(successMessage({
            message: messages.entities.priceList.success.updated,
            extra: { data: priceList }
        }));
    } catch (error) {
        console.error('Error updating price list:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function remove(req, res) {
    try {
        const priceList = await PriceList.findOne({ where: { id: req.params.id } });
        if (!priceList) {
            return res.status(404).json(errorMessage({ message: messages.entities.priceList.errors.notFound }));
        }
        await PriceListItem.destroy({ where: { price_list_id: priceList.id } });
        await priceList.destroy();
        return res.status(200).json(successMessage({ message: messages.entities.priceList.success.deleted }));
    } catch (error) {
        console.error('Error deleting price list:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}
