/**
 * Migración: Crear todas las tablas del producto Sistema de Inventario y Ventas.
 * DB: inventario.
 */

export async function up(queryInterface, Sequelize) {

    // business_configs: configuración del negocio
    await queryInterface.createTable('business_configs', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false },
        tax_id: { type: Sequelize.STRING(30), allowNull: true, comment: 'CUIT/CUIL del negocio' },
        address: { type: Sequelize.STRING, allowNull: true },
        phone: { type: Sequelize.STRING, allowNull: true },
        currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'ARS' },
        tax_rate_default: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 21.00, comment: 'Tasa de IVA por defecto' },
        receipt_prefix: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'T' },
        receipt_next_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // branches: sucursales
    await queryInterface.createTable('branches', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false },
        address: { type: Sequelize.STRING, allowNull: true },
        phone: { type: Sequelize.STRING, allowNull: true },
        is_main: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('branches', ['active']);

    // categories: categorías de productos (self-referencing)
    await queryInterface.createTable('categories', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false },
        parent_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'categories', key: 'id' }, onDelete: 'SET NULL' },
        sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('categories', ['parent_id']);
    await queryInterface.addIndex('categories', ['active']);

    // products: catálogo de productos
    await queryInterface.createTable('products', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false },
        sku: { type: Sequelize.STRING(100), allowNull: true },
        barcode: { type: Sequelize.STRING(100), allowNull: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        category_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'categories', key: 'id' }, onDelete: 'SET NULL' },
        unit: { type: Sequelize.ENUM('UN', 'KG', 'LT', 'MT'), allowNull: false, defaultValue: 'UN' },
        cost_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        sale_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        tax_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 21.00 },
        min_stock_alert: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, comment: 'Alerta cuando stock baja de este valor' },
        image_url: { type: Sequelize.STRING, allowNull: true },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        track_stock: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, comment: 'Si es false, no se controla stock (ej: servicios)' },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('products', ['sku'], { unique: true });
    await queryInterface.addIndex('products', ['barcode']);
    await queryInterface.addIndex('products', ['category_id']);
    await queryInterface.addIndex('products', ['active']);

    // product_variants: variantes de producto (talle, color, etc.)
    await queryInterface.createTable('product_variants', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
        name: { type: Sequelize.STRING, allowNull: false, comment: 'Ej: Talle M Rojo' },
        sku: { type: Sequelize.STRING(100), allowNull: true },
        barcode: { type: Sequelize.STRING(100), allowNull: true },
        cost_price: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        sale_price: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('product_variants', ['product_id']);
    await queryInterface.addIndex('product_variants', ['sku']);

    // stock: stock por sucursal
    await queryInterface.createTable('stock', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
        variant_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'product_variants', key: 'id' }, onDelete: 'CASCADE' },
        branch_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onDelete: 'CASCADE' },
        quantity: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        reserved_quantity: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('stock', ['product_id', 'variant_id', 'branch_id'], { unique: true, name: 'idx_stock_unique' });
    await queryInterface.addIndex('stock', ['branch_id']);

    // stock_movements: movimientos de stock
    await queryInterface.createTable('stock_movements', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
        variant_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'product_variants', key: 'id' }, onDelete: 'SET NULL' },
        branch_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onDelete: 'CASCADE' },
        type: { type: Sequelize.ENUM('purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return'), allowNull: false },
        quantity: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        previous_stock: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        new_stock: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        unit_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        reference_type: { type: Sequelize.STRING(50), allowNull: true, comment: 'sale, purchase_order, transfer, etc.' },
        reference_id: { type: Sequelize.INTEGER, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('stock_movements', ['product_id']);
    await queryInterface.addIndex('stock_movements', ['branch_id']);
    await queryInterface.addIndex('stock_movements', ['type']);
    await queryInterface.addIndex('stock_movements', ['reference_type', 'reference_id']);

    // stock_transfers: transferencias entre sucursales
    await queryInterface.createTable('stock_transfers', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        from_branch_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onDelete: 'CASCADE' },
        to_branch_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onDelete: 'CASCADE' },
        status: { type: Sequelize.ENUM('pending', 'in_transit', 'received', 'cancelled'), allowNull: false, defaultValue: 'pending' },
        notes: { type: Sequelize.TEXT, allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        received_by: { type: Sequelize.INTEGER, allowNull: true },
        received_at: { type: Sequelize.DATE, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('stock_transfers', ['status']);
    await queryInterface.addIndex('stock_transfers', ['from_branch_id']);
    await queryInterface.addIndex('stock_transfers', ['to_branch_id']);

    // stock_transfer_items: items de transferencia
    await queryInterface.createTable('stock_transfer_items', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        transfer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'stock_transfers', key: 'id' }, onDelete: 'CASCADE' },
        product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
        variant_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'product_variants', key: 'id' }, onDelete: 'SET NULL' },
        quantity_sent: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        quantity_received: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('stock_transfer_items', ['transfer_id']);

    // suppliers: proveedores
    await queryInterface.createTable('suppliers', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false },
        tax_id: { type: Sequelize.STRING(30), allowNull: true },
        email: { type: Sequelize.STRING, allowNull: true },
        phone: { type: Sequelize.STRING, allowNull: true },
        address: { type: Sequelize.STRING, allowNull: true },
        contact_person: { type: Sequelize.STRING, allowNull: true },
        payment_terms: { type: Sequelize.STRING, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('suppliers', ['active']);

    // purchase_orders: órdenes de compra
    await queryInterface.createTable('purchase_orders', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        supplier_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'suppliers', key: 'id' }, onDelete: 'RESTRICT' },
        branch_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onDelete: 'RESTRICT' },
        order_number: { type: Sequelize.STRING(50), allowNull: true },
        status: { type: Sequelize.ENUM('draft', 'sent', 'partial', 'received', 'cancelled'), allowNull: false, defaultValue: 'draft' },
        subtotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        tax_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        total: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        notes: { type: Sequelize.TEXT, allowNull: true },
        expected_date: { type: Sequelize.DATEONLY, allowNull: true },
        received_at: { type: Sequelize.DATE, allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('purchase_orders', ['status']);
    await queryInterface.addIndex('purchase_orders', ['supplier_id']);
    await queryInterface.addIndex('purchase_orders', ['branch_id']);

    // purchase_order_items: items de orden de compra
    await queryInterface.createTable('purchase_order_items', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        purchase_order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'purchase_orders', key: 'id' }, onDelete: 'CASCADE' },
        product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
        variant_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'product_variants', key: 'id' }, onDelete: 'SET NULL' },
        quantity_ordered: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        quantity_received: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        unit_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        subtotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('purchase_order_items', ['purchase_order_id']);

    // customers: clientes del negocio
    await queryInterface.createTable('customers', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false },
        tax_id: { type: Sequelize.STRING(30), allowNull: true },
        email: { type: Sequelize.STRING, allowNull: true },
        phone: { type: Sequelize.STRING, allowNull: true },
        address: { type: Sequelize.STRING, allowNull: true },
        type: { type: Sequelize.ENUM('regular', 'wholesale'), allowNull: false, defaultValue: 'regular' },
        discount_percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
        credit_limit: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        balance: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0, comment: 'Saldo deudor del cliente' },
        notes: { type: Sequelize.TEXT, allowNull: true },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('customers', ['active']);
    await queryInterface.addIndex('customers', ['type']);
    await queryInterface.addIndex('customers', ['tax_id']);

    // sales: ventas/tickets
    await queryInterface.createTable('sales', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        branch_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onDelete: 'RESTRICT' },
        customer_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'customers', key: 'id' }, onDelete: 'SET NULL' },
        sale_number: { type: Sequelize.STRING(50), allowNull: true },
        payment_method: { type: Sequelize.ENUM('cash', 'card', 'transfer', 'mercadopago', 'credit', 'mixed'), allowNull: false, defaultValue: 'cash' },
        status: { type: Sequelize.ENUM('completed', 'cancelled', 'refunded'), allowNull: false, defaultValue: 'completed' },
        subtotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        discount_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        discount_percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
        tax_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        total: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        paid_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        change_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        notes: { type: Sequelize.TEXT, allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        completed_at: { type: Sequelize.DATE, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sales', ['branch_id']);
    await queryInterface.addIndex('sales', ['customer_id']);
    await queryInterface.addIndex('sales', ['status']);
    await queryInterface.addIndex('sales', ['payment_method']);
    await queryInterface.addIndex('sales', ['sale_number']);
    await queryInterface.addIndex('sales', ['completed_at']);

    // sale_items: items de venta
    await queryInterface.createTable('sale_items', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        sale_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'sales', key: 'id' }, onDelete: 'CASCADE' },
        product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'RESTRICT' },
        variant_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'product_variants', key: 'id' }, onDelete: 'SET NULL' },
        quantity: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        discount_percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
        subtotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        cost_at_sale: { type: Sequelize.DECIMAL(12, 2), allowNull: true, comment: 'Costo al momento de la venta para calcular margen' },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sale_items', ['sale_id']);
    await queryInterface.addIndex('sale_items', ['product_id']);

    // sale_payments: pagos mixtos de una venta
    await queryInterface.createTable('sale_payments', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        sale_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'sales', key: 'id' }, onDelete: 'CASCADE' },
        method: { type: Sequelize.ENUM('cash', 'card', 'transfer', 'mercadopago'), allowNull: false },
        amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        reference: { type: Sequelize.STRING, allowNull: true, comment: 'Nro de referencia del pago' },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sale_payments', ['sale_id']);

    // price_lists: listas de precios
    await queryInterface.createTable('price_lists', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false },
        type: { type: Sequelize.ENUM('retail', 'wholesale', 'special'), allowNull: false, defaultValue: 'retail' },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('price_lists', ['active']);

    // price_list_items: precios por lista
    await queryInterface.createTable('price_list_items', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        price_list_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'price_lists', key: 'id' }, onDelete: 'CASCADE' },
        product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
        variant_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'product_variants', key: 'id' }, onDelete: 'SET NULL' },
        price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('price_list_items', ['price_list_id']);
    await queryInterface.addIndex('price_list_items', ['price_list_id', 'product_id', 'variant_id'], { unique: true, name: 'idx_price_list_product_variant' });

    // cash_registers: caja
    await queryInterface.createTable('cash_registers', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        branch_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onDelete: 'CASCADE' },
        opened_by: { type: Sequelize.INTEGER, allowNull: true },
        closed_by: { type: Sequelize.INTEGER, allowNull: true },
        opening_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        closing_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        expected_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        difference: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        status: { type: Sequelize.ENUM('open', 'closed'), allowNull: false, defaultValue: 'open' },
        opened_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        closed_at: { type: Sequelize.DATE, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('cash_registers', ['branch_id']);
    await queryInterface.addIndex('cash_registers', ['status']);
}

export async function down(queryInterface) {
    const tables = [
        'cash_registers', 'price_list_items', 'price_lists',
        'sale_payments', 'sale_items', 'sales',
        'customers',
        'purchase_order_items', 'purchase_orders',
        'suppliers',
        'stock_transfer_items', 'stock_transfers',
        'stock_movements', 'stock',
        'product_variants', 'products',
        'categories', 'branches', 'business_configs',
    ];
    for (const table of tables) {
        await queryInterface.dropTable(table);
    }
}
