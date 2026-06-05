/**
 * Migración 0009: Nuevas features del producto Inventario.
 * - Trazabilidad: product_batches, product_serials
 * - RMA: return_requests, return_request_items
 * - Tesorería: bank_accounts, bank_movements, cheques
 * - Contabilidad: chart_of_accounts, journal_entries, journal_entry_lines
 * - Impuestos: vat_book_entries, tax_settings, tax_withholdings
 * - Marketplaces: marketplace_connections, marketplace_products, marketplace_orders
 * - Columnas adicionales en tablas existentes
 */

export async function up(queryInterface, Sequelize) {

    // 1. product_batches (lotes)
    await queryInterface.createTable('product_batches', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        product_id: { type: Sequelize.INTEGER, allowNull: false },
        variant_id: { type: Sequelize.INTEGER, allowNull: true },
        numero_lote: { type: Sequelize.STRING(100), allowNull: false },
        fecha_vencimiento: { type: Sequelize.DATEONLY, allowNull: true },
        fecha_fabricacion: { type: Sequelize.DATEONLY, allowNull: true },
        cantidad_inicial: { type: Sequelize.INTEGER, allowNull: false },
        cantidad_actual: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        proveedor_id: { type: Sequelize.INTEGER, allowNull: true },
        observaciones: { type: Sequelize.TEXT, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('product_batches', ['product_id']);
    console.info('    ~ Tabla product_batches creada');

    // 2. product_serials (números de serie)
    await queryInterface.createTable('product_serials', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        product_id: { type: Sequelize.INTEGER, allowNull: false },
        variant_id: { type: Sequelize.INTEGER, allowNull: true },
        numero_serie: { type: Sequelize.STRING(200), allowNull: false },
        batch_id: { type: Sequelize.INTEGER, allowNull: true },
        estado: {
            type: Sequelize.ENUM('disponible', 'vendido', 'devuelto', 'dado_de_baja'),
            allowNull: false,
            defaultValue: 'disponible',
        },
        sale_item_id: { type: Sequelize.INTEGER, allowNull: true },
        customer_id: { type: Sequelize.INTEGER, allowNull: true },
        fecha_venta: { type: Sequelize.DATEONLY, allowNull: true },
        garantia_hasta: { type: Sequelize.DATEONLY, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('product_serials', ['product_id']);
    await queryInterface.addIndex('product_serials', ['numero_serie'], { unique: true, name: 'uq_product_serial_serie' });
    console.info('    ~ Tabla product_serials creada');

    // 3. return_requests (RMA - solicitudes de devolución)
    await queryInterface.createTable('return_requests', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        sale_id: { type: Sequelize.INTEGER, allowNull: false },
        customer_id: { type: Sequelize.INTEGER, allowNull: true },
        numero_rma: { type: Sequelize.STRING(50), allowNull: false },
        estado: {
            type: Sequelize.ENUM('pendiente', 'aprobada', 'rechazada', 'procesada'),
            allowNull: false,
            defaultValue: 'pendiente',
        },
        motivo: { type: Sequelize.TEXT, allowNull: false },
        aprobado_por: { type: Sequelize.INTEGER, allowNull: true },
        aprobado_at: { type: Sequelize.DATEONLY, allowNull: true },
        nota_credito_id: { type: Sequelize.INTEGER, allowNull: true },
        observaciones: { type: Sequelize.TEXT, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('return_requests', ['sale_id']);
    await queryInterface.addIndex('return_requests', ['estado']);
    console.info('    ~ Tabla return_requests creada');

    // 4. return_request_items (ítems de devolución)
    await queryInterface.createTable('return_request_items', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        return_request_id: { type: Sequelize.INTEGER, allowNull: false },
        product_id: { type: Sequelize.INTEGER, allowNull: false },
        variant_id: { type: Sequelize.INTEGER, allowNull: true },
        cantidad: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        precio_unitario: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        subtotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        motivo: { type: Sequelize.TEXT, allowNull: true },
        reingresa_stock: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('return_request_items', ['return_request_id']);
    console.info('    ~ Tabla return_request_items creada');

    // 5. bank_accounts (cuentas bancarias)
    await queryInterface.createTable('bank_accounts', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        nombre: { type: Sequelize.STRING(200), allowNull: false },
        banco: { type: Sequelize.STRING(200), allowNull: false },
        numero_cuenta: { type: Sequelize.STRING(100), allowNull: true },
        cbu_cvu: { type: Sequelize.STRING(22), allowNull: true },
        tipo: {
            type: Sequelize.ENUM('corriente', 'caja_ahorro', 'cuenta_sueldo', 'inversion'),
            allowNull: false,
            defaultValue: 'corriente',
        },
        moneda: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'ARS' },
        saldo_inicial: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        activa: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    console.info('    ~ Tabla bank_accounts creada');

    // 6. bank_movements (movimientos bancarios)
    await queryInterface.createTable('bank_movements', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        bank_account_id: { type: Sequelize.INTEGER, allowNull: false },
        fecha: { type: Sequelize.DATEONLY, allowNull: false },
        concepto: { type: Sequelize.STRING(500), allowNull: false },
        tipo: { type: Sequelize.ENUM('ingreso', 'egreso'), allowNull: false },
        monto: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
        saldo_resultante: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
        referencia: { type: Sequelize.STRING(200), allowNull: true },
        conciliado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        sale_id: { type: Sequelize.INTEGER, allowNull: true },
        purchase_order_id: { type: Sequelize.INTEGER, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('bank_movements', ['bank_account_id']);
    await queryInterface.addIndex('bank_movements', ['fecha']);
    console.info('    ~ Tabla bank_movements creada');

    // 7. cheques (cheques emitidos/recibidos)
    await queryInterface.createTable('cheques', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        tipo: { type: Sequelize.ENUM('emitido', 'recibido'), allowNull: false },
        numero: { type: Sequelize.STRING(100), allowNull: false },
        banco: { type: Sequelize.STRING(200), allowNull: false },
        monto: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
        fecha_emision: { type: Sequelize.DATEONLY, allowNull: false },
        fecha_vencimiento: { type: Sequelize.DATEONLY, allowNull: false },
        beneficiario: { type: Sequelize.STRING(300), allowNull: true },
        emisor: { type: Sequelize.STRING(300), allowNull: true },
        estado: {
            type: Sequelize.ENUM('en_cartera', 'depositado', 'cobrado', 'rechazado', 'anulado', 'endosado'),
            allowNull: false,
            defaultValue: 'en_cartera',
        },
        bank_account_id: { type: Sequelize.INTEGER, allowNull: true },
        customer_id: { type: Sequelize.INTEGER, allowNull: true },
        supplier_id: { type: Sequelize.INTEGER, allowNull: true },
        observaciones: { type: Sequelize.TEXT, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('cheques', ['estado']);
    await queryInterface.addIndex('cheques', ['fecha_vencimiento']);
    console.info('    ~ Tabla cheques creada');

    // 8. chart_of_accounts (plan de cuentas)
    await queryInterface.createTable('chart_of_accounts', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        codigo: { type: Sequelize.STRING(20), allowNull: false },
        nombre: { type: Sequelize.STRING(300), allowNull: false },
        tipo: {
            type: Sequelize.ENUM('activo', 'pasivo', 'patrimonio', 'ingreso', 'egreso', 'costo'),
            allowNull: false,
        },
        parent_id: { type: Sequelize.INTEGER, allowNull: true },
        nivel: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        imputable: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        saldo: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('chart_of_accounts', ['codigo'], { name: 'idx_chart_of_accounts_codigo' });
    console.info('    ~ Tabla chart_of_accounts creada');

    // 9. journal_entries (asientos contables)
    await queryInterface.createTable('journal_entries', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        fecha: { type: Sequelize.DATEONLY, allowNull: false },
        numero: { type: Sequelize.INTEGER, allowNull: false },
        descripcion: { type: Sequelize.STRING(500), allowNull: false },
        tipo: {
            type: Sequelize.ENUM('manual', 'automatico'),
            allowNull: false,
            defaultValue: 'manual',
        },
        referencia_tipo: { type: Sequelize.STRING(50), allowNull: true },
        referencia_id: { type: Sequelize.INTEGER, allowNull: true },
        total_debe: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        total_haber: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        aprobado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('journal_entries', ['fecha']);
    await queryInterface.addIndex('journal_entries', ['referencia_tipo']);
    await queryInterface.addIndex('journal_entries', ['referencia_id']);
    console.info('    ~ Tabla journal_entries creada');

    // 10. journal_entry_lines (líneas de asiento)
    await queryInterface.createTable('journal_entry_lines', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        journal_entry_id: { type: Sequelize.INTEGER, allowNull: false },
        account_id: { type: Sequelize.INTEGER, allowNull: false },
        descripcion: { type: Sequelize.STRING(500), allowNull: true },
        debe: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        haber: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('journal_entry_lines', ['journal_entry_id']);
    await queryInterface.addIndex('journal_entry_lines', ['account_id']);
    console.info('    ~ Tabla journal_entry_lines creada');

    // 11. vat_book_entries (libro IVA)
    await queryInterface.createTable('vat_book_entries', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        tipo: { type: Sequelize.ENUM('ventas', 'compras'), allowNull: false },
        fecha: { type: Sequelize.DATEONLY, allowNull: false },
        invoice_id: { type: Sequelize.INTEGER, allowNull: true },
        comprobante_tipo: { type: Sequelize.STRING(10), allowNull: false },
        numero_comprobante: { type: Sequelize.STRING(50), allowNull: false },
        cuit_contraparte: { type: Sequelize.STRING(13), allowNull: false },
        nombre_contraparte: { type: Sequelize.STRING(300), allowNull: false },
        neto_gravado: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        neto_no_gravado: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        iva_21: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        iva_105: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        iva_27: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        total: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        periodo: { type: Sequelize.STRING(7), allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('vat_book_entries', ['tipo']);
    await queryInterface.addIndex('vat_book_entries', ['periodo']);
    await queryInterface.addIndex('vat_book_entries', ['fecha']);
    console.info('    ~ Tabla vat_book_entries creada');

    // 12. tax_settings (configuración IIBB)
    await queryInterface.createTable('tax_settings', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        jurisdiccion: { type: Sequelize.STRING(50), allowNull: false },
        tipo: { type: Sequelize.ENUM('retencion', 'percepcion'), allowNull: false },
        impuesto: {
            type: Sequelize.ENUM('IIBB', 'GANANCIAS', 'IVA_ADICIONAL', 'OTRO'),
            allowNull: false,
            defaultValue: 'IIBB',
        },
        alicuota: { type: Sequelize.DECIMAL(6, 4), allowNull: false },
        monto_minimo: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        activa: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('tax_settings', ['jurisdiccion', 'tipo', 'impuesto'], { unique: true, name: 'uq_tax_setting_jurisdiccion_tipo_impuesto' });
    console.info('    ~ Tabla tax_settings creada');

    // 13. tax_withholdings (retenciones/percepciones aplicadas)
    await queryInterface.createTable('tax_withholdings', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        tax_setting_id: { type: Sequelize.INTEGER, allowNull: false },
        sale_id: { type: Sequelize.INTEGER, allowNull: true },
        purchase_order_id: { type: Sequelize.INTEGER, allowNull: true },
        tipo: { type: Sequelize.ENUM('retencion', 'percepcion'), allowNull: false },
        base_imponible: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
        alicuota: { type: Sequelize.DECIMAL(6, 4), allowNull: false },
        monto: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
        numero_certificado: { type: Sequelize.STRING(100), allowNull: true },
        fecha: { type: Sequelize.DATEONLY, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('tax_withholdings', ['sale_id']);
    await queryInterface.addIndex('tax_withholdings', ['purchase_order_id']);
    console.info('    ~ Tabla tax_withholdings creada');

    // 14. marketplace_connections (conexiones a marketplaces)
    await queryInterface.createTable('marketplace_connections', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        marketplace: {
            type: Sequelize.ENUM('mercadolibre', 'tiendanube', 'shopify', 'woocommerce'),
            allowNull: false,
        },
        nombre: { type: Sequelize.STRING(200), allowNull: false },
        access_token: { type: Sequelize.TEXT, allowNull: true },
        refresh_token: { type: Sequelize.TEXT, allowNull: true },
        token_expira_at: { type: Sequelize.DATEONLY, allowNull: true },
        seller_id: { type: Sequelize.STRING(100), allowNull: true },
        shop_url: { type: Sequelize.STRING(500), allowNull: true },
        activa: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ultimo_sync_at: { type: Sequelize.DATEONLY, allowNull: true },
        sync_status: { type: Sequelize.STRING(50), allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('marketplace_connections', ['marketplace'], { unique: true, name: 'uq_marketplace_connection_marketplace' });
    console.info('    ~ Tabla marketplace_connections creada');

    // 15. marketplace_products (publicaciones sincronizadas)
    await queryInterface.createTable('marketplace_products', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        connection_id: { type: Sequelize.INTEGER, allowNull: false },
        product_id: { type: Sequelize.INTEGER, allowNull: false },
        variant_id: { type: Sequelize.INTEGER, allowNull: true },
        marketplace_item_id: { type: Sequelize.STRING(200), allowNull: false },
        titulo: { type: Sequelize.STRING(500), allowNull: false },
        precio_publicado: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        stock_publicado: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        activa: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ultimo_sync_at: { type: Sequelize.DATEONLY, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('marketplace_products', ['connection_id']);
    await queryInterface.addIndex('marketplace_products', ['product_id']);
    await queryInterface.addIndex('marketplace_products', ['connection_id', 'marketplace_item_id'], { unique: true, name: 'uq_marketplace_product_connection_item' });
    console.info('    ~ Tabla marketplace_products creada');

    // 16. marketplace_orders (pedidos importados)
    await queryInterface.createTable('marketplace_orders', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        connection_id: { type: Sequelize.INTEGER, allowNull: false },
        marketplace_order_id: { type: Sequelize.STRING(200), allowNull: false },
        estado: {
            type: Sequelize.ENUM('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'),
            allowNull: false,
            defaultValue: 'pendiente',
        },
        buyer_nombre: { type: Sequelize.STRING(300), allowNull: false },
        buyer_email: { type: Sequelize.STRING(255), allowNull: true },
        buyer_telefono: { type: Sequelize.STRING(50), allowNull: true },
        total: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        moneda: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'ARS' },
        sale_id: { type: Sequelize.INTEGER, allowNull: true },
        datos_raw: { type: Sequelize.TEXT, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('marketplace_orders', ['connection_id']);
    await queryInterface.addIndex('marketplace_orders', ['estado']);
    await queryInterface.addIndex('marketplace_orders', ['connection_id', 'marketplace_order_id'], { unique: true, name: 'uq_marketplace_order_connection_order' });
    console.info('    ~ Tabla marketplace_orders creada');

    // ── Columnas adicionales en tablas existentes ────────────────────────────

    // product_batch_id en stock_movements
    const [batchColResult] = await queryInterface.sequelize.query("SHOW COLUMNS FROM stock_movements LIKE 'product_batch_id'");
    if (batchColResult.length === 0) {
        await queryInterface.addColumn('stock_movements', 'product_batch_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            after: 'branch_id',
        });
        console.info('    ~ Columna product_batch_id agregada a stock_movements');
    }

    // serial_id en sale_items
    const [serialColResult] = await queryInterface.sequelize.query("SHOW COLUMNS FROM sale_items LIKE 'serial_id'");
    if (serialColResult.length === 0) {
        await queryInterface.addColumn('sale_items', 'serial_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            after: 'variant_id',
        });
        console.info('    ~ Columna serial_id agregada a sale_items');
    }

    // rma_id en credit_notes
    const [rmaColResult] = await queryInterface.sequelize.query("SHOW COLUMNS FROM credit_notes LIKE 'rma_id'");
    if (rmaColResult.length === 0) {
        await queryInterface.addColumn('credit_notes', 'rma_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            after: 'sale_id',
        });
        console.info('    ~ Columna rma_id agregada a credit_notes');
    }

    console.info('  ✓ Migración 0009_new_features completada');
}

export async function down(queryInterface) {
    // Remover columnas adicionales
    await queryInterface.removeColumn('credit_notes', 'rma_id').catch(() => {});
    await queryInterface.removeColumn('sale_items', 'serial_id').catch(() => {});
    await queryInterface.removeColumn('stock_movements', 'product_batch_id').catch(() => {});

    // Remover tablas en orden inverso
    await queryInterface.dropTable('marketplace_orders');
    await queryInterface.dropTable('marketplace_products');
    await queryInterface.dropTable('marketplace_connections');
    await queryInterface.dropTable('tax_withholdings');
    await queryInterface.dropTable('tax_settings');
    await queryInterface.dropTable('vat_book_entries');
    await queryInterface.dropTable('journal_entry_lines');
    await queryInterface.dropTable('journal_entries');
    await queryInterface.dropTable('chart_of_accounts');
    await queryInterface.dropTable('cheques');
    await queryInterface.dropTable('bank_movements');
    await queryInterface.dropTable('bank_accounts');
    await queryInterface.dropTable('return_request_items');
    await queryInterface.dropTable('return_requests');
    await queryInterface.dropTable('product_serials');
    await queryInterface.dropTable('product_batches');
}
