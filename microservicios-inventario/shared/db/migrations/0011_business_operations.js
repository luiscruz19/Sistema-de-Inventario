/**
 * Migración 0011: Refuerzo de operaciones de negocio (single-tenant).
 *
 * - business_configs: mapeo de cuentas contables para asientos automáticos,
 *   flag de generación automática de asientos y umbral global de stock bajo.
 * - purchase_orders: seguimiento de pago a proveedor y datos de factura de compra.
 * - suppliers: saldo de cuenta corriente (cuentas a pagar).
 * - supplier_transactions: libro de cuenta corriente de proveedores.
 * - cash_movements: ingresos/egresos manuales de caja (para arqueo real).
 * - return_request_items: flag de stock ya reingresado (idempotencia en RMA).
 *
 * Migración idempotente: cada bloque verifica existencia antes de aplicar.
 */

async function hasColumn(queryInterface, table, column) {
    const [rows] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM ${table} LIKE '${column}'`
    );
    return rows.length > 0;
}

async function hasTable(queryInterface, table) {
    const [rows] = await queryInterface.sequelize.query(`SHOW TABLES LIKE '${table}'`);
    return rows.length > 0;
}

export async function up(queryInterface, Sequelize) {
    // 1. business_configs: configuración contable y umbral de stock
    const bcCols = [
        ['accounting_auto_entries', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }],
        ['acc_sales_account', { type: Sequelize.STRING(20), allowNull: true }],         // ingreso por ventas
        ['acc_vat_debit_account', { type: Sequelize.STRING(20), allowNull: true }],     // IVA débito fiscal
        ['acc_vat_credit_account', { type: Sequelize.STRING(20), allowNull: true }],    // IVA crédito fiscal
        ['acc_cash_account', { type: Sequelize.STRING(20), allowNull: true }],          // caja / efectivo
        ['acc_receivable_account', { type: Sequelize.STRING(20), allowNull: true }],    // deudores por ventas
        ['acc_payable_account', { type: Sequelize.STRING(20), allowNull: true }],       // proveedores
        ['acc_inventory_account', { type: Sequelize.STRING(20), allowNull: true }],     // mercaderías / bienes de cambio
        ['acc_purchases_account', { type: Sequelize.STRING(20), allowNull: true }],     // compras
        ['low_stock_threshold', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }],
    ];
    for (const [name, def] of bcCols) {
        if (!(await hasColumn(queryInterface, 'business_configs', name))) {
            await queryInterface.addColumn('business_configs', name, def);
            console.info(`    ~ Columna ${name} agregada a business_configs`);
        }
    }

    // 2. purchase_orders: seguimiento de pago a proveedor y datos de factura
    const poCols = [
        ['paid_amount', { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }],
        ['payment_status', { type: Sequelize.ENUM('unpaid', 'partial', 'paid'), allowNull: false, defaultValue: 'unpaid' }],
        ['supplier_invoice_number', { type: Sequelize.STRING(50), allowNull: true }],
        ['supplier_invoice_date', { type: Sequelize.DATEONLY, allowNull: true }],
    ];
    for (const [name, def] of poCols) {
        if (!(await hasColumn(queryInterface, 'purchase_orders', name))) {
            await queryInterface.addColumn('purchase_orders', name, def);
            console.info(`    ~ Columna ${name} agregada a purchase_orders`);
        }
    }

    // 3. suppliers: saldo de cuenta corriente
    if (!(await hasColumn(queryInterface, 'suppliers', 'balance'))) {
        await queryInterface.addColumn('suppliers', 'balance', {
            type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0,
        });
        console.info('    ~ Columna balance agregada a suppliers');
    }

    // 4. supplier_transactions: libro de cuenta corriente de proveedores
    if (!(await hasTable(queryInterface, 'supplier_transactions'))) {
        await queryInterface.createTable('supplier_transactions', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            supplier_id: { type: Sequelize.INTEGER, allowNull: false },
            type: { type: Sequelize.ENUM('credit', 'debit'), allowNull: false },
            amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
            description: { type: Sequelize.STRING(300), allowNull: false },
            reference_type: { type: Sequelize.ENUM('purchase_order', 'payment', 'manual'), allowNull: false, defaultValue: 'manual' },
            reference_id: { type: Sequelize.INTEGER, allowNull: true },
            balance_after: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
            created_by: { type: Sequelize.INTEGER, allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        });
        await queryInterface.addIndex('supplier_transactions', ['supplier_id']);
        console.info('    ~ Tabla supplier_transactions creada');
    }

    // 5. cash_movements: ingresos/egresos manuales de caja
    if (!(await hasTable(queryInterface, 'cash_movements'))) {
        await queryInterface.createTable('cash_movements', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            cash_register_id: { type: Sequelize.INTEGER, allowNull: false },
            type: { type: Sequelize.ENUM('income', 'expense'), allowNull: false },
            amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
            concept: { type: Sequelize.STRING(300), allowNull: false },
            reference: { type: Sequelize.STRING(200), allowNull: true },
            created_by: { type: Sequelize.INTEGER, allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        });
        await queryInterface.addIndex('cash_movements', ['cash_register_id']);
        console.info('    ~ Tabla cash_movements creada');
    }

    // 6. return_request_items: idempotencia de reingreso de stock
    if (!(await hasColumn(queryInterface, 'return_request_items', 'stock_reingresado'))) {
        await queryInterface.addColumn('return_request_items', 'stock_reingresado', {
            type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false,
        });
        console.info('    ~ Columna stock_reingresado agregada a return_request_items');
    }

    console.info('Migración 0011_business_operations completada');
}

export async function down(queryInterface) {
    await queryInterface.dropTable('cash_movements').catch(() => {});
    await queryInterface.dropTable('supplier_transactions').catch(() => {});
    const drop = async (table, col) => queryInterface.removeColumn(table, col).catch(() => {});
    await drop('return_request_items', 'stock_reingresado');
    await drop('suppliers', 'balance');
    for (const c of ['paid_amount', 'payment_status', 'supplier_invoice_number', 'supplier_invoice_date']) {
        await drop('purchase_orders', c);
    }
    for (const c of [
        'accounting_auto_entries', 'acc_sales_account', 'acc_vat_debit_account', 'acc_vat_credit_account',
        'acc_cash_account', 'acc_receivable_account', 'acc_payable_account', 'acc_inventory_account',
        'acc_purchases_account', 'low_stock_threshold',
    ]) {
        await drop('business_configs', c);
    }
}
