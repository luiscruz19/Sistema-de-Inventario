/**
 * Seed de datos demo.
 * Reutiliza la instancia de Sequelize de shared/db/sequelize.js y los modelos
 * de shared/models/index.js (montados como db/ y models/ dentro de cada microservicio).
 *
 * Uso:
 *   node db/seed.js
 *
 * Es idempotente: usa findOrCreate, por lo que correrlo varias veces no duplica datos.
 */

import sequelize from './sequelize.js';
import {
    setupAssociations,
    BusinessConfig,
    Branch,
    Category,
    Product,
    Stock,
    StockMovement,
    Customer,
    Supplier,
    PriceList,
} from '../models/index.js';

async function seed() {
    try {
        await sequelize.authenticate();
        console.info('Conexion a DB establecida');

        setupAssociations();

        // --- Configuracion del negocio ---
        const [business] = await BusinessConfig.findOrCreate({
            where: { name: 'Comercio Demo' },
            defaults: {
                name: 'Comercio Demo',
                tax_id: '30-71234567-8',
                address: 'Av. Belgrano 1234, Salta',
                phone: '+54 387 4123456',
                currency: 'ARS',
                tax_rate_default: 21.00,
                receipt_prefix: 'T',
                receipt_next_number: 1,
            },
        });
        console.info(`BusinessConfig: ${business.name}`);

        // --- Sucursal central ---
        const [branch] = await Branch.findOrCreate({
            where: { name: 'Sucursal Central' },
            defaults: {
                name: 'Sucursal Central',
                address: 'Av. Belgrano 1234, Salta',
                phone: '+54 387 4123456',
                is_main: true,
                active: true,
            },
        });
        console.info(`Branch: ${branch.name}`);

        // --- Categorias ---
        const categoriasData = [
            { name: 'Bebidas', sort_order: 1 },
            { name: 'Almacen', sort_order: 2 },
            { name: 'Limpieza', sort_order: 3 },
            { name: 'Perfumeria', sort_order: 4 },
        ];

        const categorias = {};
        for (const data of categoriasData) {
            const [cat] = await Category.findOrCreate({
                where: { name: data.name },
                defaults: { ...data, active: true },
            });
            categorias[data.name] = cat;
        }
        console.info(`Categorias: ${Object.keys(categorias).join(', ')}`);

        // --- Productos ---
        const productosData = [
            { sku: 'BEB-001', name: 'Gaseosa Cola 2.25L', categoria: 'Bebidas', unit: 'UN', cost_price: 1200.00, sale_price: 1850.00, tax_rate: 21.00, min_stock_alert: 12, stock_inicial: 48 },
            { sku: 'BEB-002', name: 'Agua Mineral sin Gas 2L', categoria: 'Bebidas', unit: 'UN', cost_price: 600.00, sale_price: 950.00, tax_rate: 21.00, min_stock_alert: 12, stock_inicial: 60 },
            { sku: 'ALM-001', name: 'Arroz Largo Fino 1kg', categoria: 'Almacen', unit: 'UN', cost_price: 900.00, sale_price: 1400.00, tax_rate: 21.00, min_stock_alert: 10, stock_inicial: 80 },
            { sku: 'ALM-002', name: 'Fideos Tirabuzon 500g', categoria: 'Almacen', unit: 'UN', cost_price: 700.00, sale_price: 1100.00, tax_rate: 21.00, min_stock_alert: 10, stock_inicial: 70 },
            { sku: 'ALM-003', name: 'Aceite de Girasol 1.5L', categoria: 'Almacen', unit: 'UN', cost_price: 2100.00, sale_price: 3200.00, tax_rate: 21.00, min_stock_alert: 8, stock_inicial: 35 },
            { sku: 'LIM-001', name: 'Lavandina 1L', categoria: 'Limpieza', unit: 'UN', cost_price: 500.00, sale_price: 850.00, tax_rate: 21.00, min_stock_alert: 10, stock_inicial: 40 },
            { sku: 'LIM-002', name: 'Detergente Concentrado 750ml', categoria: 'Limpieza', unit: 'UN', cost_price: 950.00, sale_price: 1500.00, tax_rate: 21.00, min_stock_alert: 10, stock_inicial: 45 },
            { sku: 'PER-001', name: 'Jabon de Tocador 90g', categoria: 'Perfumeria', unit: 'UN', cost_price: 350.00, sale_price: 600.00, tax_rate: 21.00, min_stock_alert: 15, stock_inicial: 90 },
        ];

        let productosCreados = 0;
        for (const data of productosData) {
            const categoria = categorias[data.categoria];

            const [product] = await Product.findOrCreate({
                where: { sku: data.sku },
                defaults: {
                    name: data.name,
                    sku: data.sku,
                    category_id: categoria.id,
                    unit: data.unit,
                    cost_price: data.cost_price,
                    sale_price: data.sale_price,
                    tax_rate: data.tax_rate,
                    min_stock_alert: data.min_stock_alert,
                    active: true,
                    track_stock: true,
                },
            });
            productosCreados += 1;

            // --- Stock inicial en la sucursal central ---
            const [stock, stockCreado] = await Stock.findOrCreate({
                where: { product_id: product.id, variant_id: null, branch_id: branch.id },
                defaults: {
                    product_id: product.id,
                    variant_id: null,
                    branch_id: branch.id,
                    quantity: data.stock_inicial,
                    reserved_quantity: 0,
                },
            });

            // --- Movimiento de alta de stock (solo si el stock se acaba de crear) ---
            if (stockCreado) {
                await StockMovement.create({
                    product_id: product.id,
                    variant_id: null,
                    branch_id: branch.id,
                    type: 'adjustment',
                    quantity: data.stock_inicial,
                    previous_stock: 0,
                    new_stock: data.stock_inicial,
                    unit_cost: data.cost_price,
                    reference_type: 'seed',
                    notes: 'Carga inicial de stock (datos demo)',
                });
            }
        }
        console.info(`Productos: ${productosCreados} con stock inicial en ${branch.name}`);

        // --- Clientes ---
        const clientesData = [
            { name: 'Juan Perez', tax_id: '20-30123456-7', email: 'juan.perez@example.com', phone: '+54 387 5551234', address: 'Caseros 567, Salta', type: 'regular' },
            { name: 'Distribuidora El Sol SRL', tax_id: '30-70987654-3', email: 'ventas@elsol.example.com', phone: '+54 387 5555678', address: 'Parque Industrial, Salta', type: 'wholesale', discount_percentage: 10.00 },
        ];

        for (const data of clientesData) {
            await Customer.findOrCreate({
                where: { name: data.name },
                defaults: { ...data, active: true },
            });
        }
        console.info(`Clientes: ${clientesData.length}`);

        // --- Proveedores ---
        const proveedoresData = [
            { name: 'Mayorista Norte SA', tax_id: '30-61234567-9', email: 'pedidos@mayoristanorte.example.com', phone: '+54 387 4998877', address: 'Ruta 9 Km 1592, Salta', contact_person: 'Maria Gomez', payment_terms: 'Cuenta corriente 30 dias' },
            { name: 'Bebidas del Valle SRL', tax_id: '30-65432198-7', email: 'comercial@bebidasdelvalle.example.com', phone: '+54 387 4112233', address: 'Av. Tavella 980, Salta', contact_person: 'Carlos Diaz', payment_terms: 'Contado' },
        ];

        for (const data of proveedoresData) {
            await Supplier.findOrCreate({
                where: { name: data.name },
                defaults: { ...data, active: true },
            });
        }
        console.info(`Proveedores: ${proveedoresData.length}`);

        // --- Lista de precios ---
        const [priceList] = await PriceList.findOrCreate({
            where: { name: 'Lista general' },
            defaults: {
                name: 'Lista general',
                type: 'retail',
                active: true,
            },
        });
        console.info(`PriceList: ${priceList.name}`);

        console.info('\nSeed de datos demo finalizado');
        await sequelize.close();
        process.exit(0);
    } catch (err) {
        console.error('Error en el seed:', err.message);
        try {
            await sequelize.close();
        } catch (closeErr) {
            console.error('Error al cerrar la conexion:', closeErr.message);
        }
        process.exit(1);
    }
}

seed();
