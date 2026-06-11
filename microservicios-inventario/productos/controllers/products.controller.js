import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Category from '../models/Category.js';
import Stock from '../models/Stock.js';
import Branch from '../models/Branch.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

/**
 * Listar productos con filtros y paginación
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 20, category_id, active, search, track_stock } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const where = {};

        if (category_id) where.category_id = Number(category_id);
        // Por defecto se ocultan los inactivos (soft-deleted). active=false o all para verlos.
        if (active === undefined) where.active = true;
        else if (active !== 'all') where.active = active === 'true';
        if (track_stock !== undefined) where.track_stock = track_stock === 'true';

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { sku: { [Op.like]: `%${search}%` } },
                { barcode: { [Op.like]: `%${search}%` } },
            ];
        }

        const { count, rows } = await Product.findAndCountAll({
            where,
            include: [
                { model: Category, as: 'category', attributes: ['id', 'name'] },
                { model: ProductVariant, as: 'variants', required: false },
                { model: Stock, as: 'stockEntries', attributes: ['id', 'variant_id', 'branch_id', 'quantity', 'reserved_quantity'], required: false },
            ],
            order: [['name', 'ASC']],
            limit: Number(limit),
            offset,
            distinct: true,
        });

        return res.status(200).json(successMessage({
            message: messages.entities.product.success.list,
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
        console.error('Error listing products:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Obtener producto por ID con variantes y stock
 */
export async function getById(req, res) {
    try {
        const { id } = req.params;

        const product = await Product.findOne({
            where: { id },
            include: [
                { model: Category, as: 'category' },
                { model: ProductVariant, as: 'variants' },
                {
                    model: Stock, as: 'stockEntries',
                    include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
                },
            ],
        });

        if (!product) {
            return res.status(404).json(errorMessage({ message: messages.entities.product.errors.notFound }));
        }

        return res.status(200).json(successMessage({
            message: messages.entities.product.success.fetch,
            extra: { data: product }
        }));

    } catch (error) {
        console.error('Error getting product:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Crear producto
 */
export async function create(req, res) {
    try {
        const productData = { ...req.body };

        // Verificar SKU único
        if (productData.sku) {
            const existing = await Product.findOne({ where: { sku: productData.sku } });
            if (existing) {
                return res.status(409).json(errorMessage({ message: messages.entities.product.errors.skuDuplicate }));
            }
        }

        const product = await Product.create(productData);

        // Crear variantes si se envían
        if (req.body.variants && Array.isArray(req.body.variants)) {
            for (const v of req.body.variants) {
                await ProductVariant.create({ ...v, product_id: product.id });
            }
        }

        // Crear stock inicial en todas las sucursales activas si track_stock
        if (product.track_stock) {
            const branches = await Branch.findAll({ where: { active: true } });
            for (const branch of branches) {
                await Stock.findOrCreate({
                    where: { product_id: product.id, variant_id: null, branch_id: branch.id },
                    defaults: { product_id: product.id, variant_id: null, branch_id: branch.id, quantity: 0, reserved_quantity: 0 }
                });
            }
        }

        const created = await Product.findOne({
            where: { id: product.id },
            include: [{ model: ProductVariant, as: 'variants' }],
        });

        return res.status(201).json(successMessage({
            message: messages.entities.product.success.created,
            extra: { data: created }
        }));

    } catch (error) {
        console.error('Error creating product:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Actualizar producto
 */
export async function update(req, res) {
    try {
        const { id } = req.params;

        const product = await Product.findOne({ where: { id } });
        if (!product) {
            return res.status(404).json(errorMessage({ message: messages.entities.product.errors.notFound }));
        }

        // Verificar SKU único si cambió
        if (req.body.sku && req.body.sku !== product.sku) {
            const existing = await Product.findOne({ where: { sku: req.body.sku, id: { [Op.ne]: id } } });
            if (existing) {
                return res.status(409).json(errorMessage({ message: messages.entities.product.errors.skuDuplicate }));
            }
        }

        await product.update(req.body);

        return res.status(200).json(successMessage({
            message: messages.entities.product.success.updated,
            extra: { data: product }
        }));

    } catch (error) {
        console.error('Error updating product:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Eliminar producto (soft delete via active=false)
 */
export async function remove(req, res) {
    try {
        const { id } = req.params;

        const product = await Product.findOne({ where: { id } });
        if (!product) {
            return res.status(404).json(errorMessage({ message: messages.entities.product.errors.notFound }));
        }

        await product.update({ active: false });

        return res.status(200).json(successMessage({ message: messages.entities.product.success.deleted }));

    } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Toggle active
 */
export async function toggle(req, res) {
    try {
        const { id } = req.params;

        const product = await Product.findOne({ where: { id } });
        if (!product) {
            return res.status(404).json(errorMessage({ message: messages.entities.product.errors.notFound }));
        }

        await product.update({ active: !product.active });

        return res.status(200).json(successMessage({
            message: messages.entities.product.success.toggled,
            extra: { data: product }
        }));

    } catch (error) {
        console.error('Error toggling product:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * CRUD de variantes de un producto
 */
export async function listVariants(req, res) {
    try {
        const { productId } = req.params;
        const variants = await ProductVariant.findAll({
            where: { product_id: productId },
            order: [['name', 'ASC']],
        });
        return res.status(200).json(successMessage({
            message: messages.entities.productVariant.success.list,
            extra: { data: variants }
        }));
    } catch (error) {
        console.error('Error listing variants:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function createVariant(req, res) {
    try {
        const { productId } = req.params;
        const variant = await ProductVariant.create({
            ...req.body,
            product_id: productId,
        });
        return res.status(201).json(successMessage({
            message: messages.entities.productVariant.success.created,
            extra: { data: variant }
        }));
    } catch (error) {
        console.error('Error creating variant:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function updateVariant(req, res) {
    try {
        const { id } = req.params;
        const variant = await ProductVariant.findOne({ where: { id } });
        if (!variant) {
            return res.status(404).json(errorMessage({ message: messages.entities.productVariant.errors.notFound }));
        }
        await variant.update(req.body);
        return res.status(200).json(successMessage({
            message: messages.entities.productVariant.success.updated,
            extra: { data: variant }
        }));
    } catch (error) {
        console.error('Error updating variant:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

export async function removeVariant(req, res) {
    try {
        const { id } = req.params;
        const variant = await ProductVariant.findOne({ where: { id } });
        if (!variant) {
            return res.status(404).json(errorMessage({ message: messages.entities.productVariant.errors.notFound }));
        }
        await variant.destroy();
        return res.status(200).json(successMessage({ message: messages.entities.productVariant.success.deleted }));
    } catch (error) {
        console.error('Error deleting variant:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}
