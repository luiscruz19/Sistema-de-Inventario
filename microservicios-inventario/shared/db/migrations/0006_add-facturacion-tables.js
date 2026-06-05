/**
 * Migración: tablas de facturación electrónica (AFIP/ARCA).
 * - fiscal_configs
 * - fiscal_sequences
 * - invoices
 * - invoice_items
 * - invoice_taxes
 */

export async function up(queryInterface, Sequelize) {
    // ── fiscal_configs ─────────────────────────────────────────────────
    await queryInterface.createTable('fiscal_configs', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        cuit: { type: Sequelize.STRING(20), allowNull: true },
        business_name: { type: Sequelize.STRING(200), allowNull: true },
        pto_vta: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        iva_condition: {
            type: Sequelize.ENUM('responsable_inscripto', 'monotributo', 'exento', 'consumidor_final', 'no_categorizado'),
            allowNull: false,
            defaultValue: 'monotributo',
        },
        gross_income: { type: Sequelize.STRING(50), allowNull: true },
        activity_start: { type: Sequelize.DATEONLY, allowNull: true },
        fiscal_address: { type: Sequelize.STRING(300), allowNull: true },
        environment: {
            type: Sequelize.ENUM('testing', 'production'),
            allowNull: false,
            defaultValue: 'testing',
        },
        integration_id: { type: Sequelize.INTEGER, allowNull: true },
        next_numbers: { type: Sequelize.TEXT, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // ── fiscal_sequences ───────────────────────────────────────────────
    await queryInterface.createTable('fiscal_sequences', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        pto_vta: { type: Sequelize.INTEGER, allowNull: false },
        doc_type: { type: Sequelize.STRING(10), allowNull: false },
        last_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        last_synced_at: { type: Sequelize.DATE, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('fiscal_sequences', ['pto_vta', 'doc_type'], { unique: true, name: 'uq_fiscal_sequence' });

    // ── invoices ───────────────────────────────────────────────────────
    await queryInterface.createTable('invoices', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        sale_id: { type: Sequelize.INTEGER, allowNull: true },
        parent_invoice_id: { type: Sequelize.INTEGER, allowNull: true },
        doc_type: {
            type: Sequelize.ENUM('A', 'B', 'C', 'NCA', 'NCB', 'NCC', 'NDA', 'NDB', 'NDC'),
            allowNull: false,
        },
        afip_cbte_tipo: { type: Sequelize.INTEGER, allowNull: true },
        pto_vta: { type: Sequelize.INTEGER, allowNull: false },
        number: { type: Sequelize.INTEGER, allowNull: false },
        full_number: { type: Sequelize.STRING(50), allowNull: true },

        issuer_cuit: { type: Sequelize.STRING(20), allowNull: true },
        issuer_name: { type: Sequelize.STRING(200), allowNull: true },
        issuer_iva_condition: { type: Sequelize.STRING(50), allowNull: true },

        customer_id: { type: Sequelize.INTEGER, allowNull: true },
        receiver_doc_type: {
            type: Sequelize.ENUM('CUIT', 'CUIL', 'DNI', 'CF', 'OTRO'),
            allowNull: false,
            defaultValue: 'CF',
        },
        receiver_doc_number: { type: Sequelize.STRING(20), allowNull: true },
        receiver_name: { type: Sequelize.STRING(200), allowNull: true },
        receiver_iva_condition: { type: Sequelize.STRING(50), allowNull: true },
        receiver_address: { type: Sequelize.STRING(300), allowNull: true },

        currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'PES' },
        exchange_rate: { type: Sequelize.DECIMAL(12, 4), allowNull: false, defaultValue: 1 },
        net_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        non_taxed_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        exempt_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        tax_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        other_taxes_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        total: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },

        cae: { type: Sequelize.STRING(20), allowNull: true },
        cae_expiration: { type: Sequelize.DATEONLY, allowNull: true },
        qr_url: { type: Sequelize.TEXT, allowNull: true },
        pdf_url: { type: Sequelize.STRING(500), allowNull: true },

        status: {
            type: Sequelize.ENUM('draft', 'approved', 'rejected', 'void'),
            allowNull: false,
            defaultValue: 'draft',
        },
        mode: {
            type: Sequelize.ENUM('real', 'simulated'),
            allowNull: false,
            defaultValue: 'simulated',
        },
        afip_response: { type: Sequelize.TEXT('long'), allowNull: true },
        rejection_reason: { type: Sequelize.STRING(500), allowNull: true },

        issued_at: { type: Sequelize.DATE, allowNull: true },
        service_date_from: { type: Sequelize.DATEONLY, allowNull: true },
        service_date_to: { type: Sequelize.DATEONLY, allowNull: true },
        due_date: { type: Sequelize.DATEONLY, allowNull: true },

        notes: { type: Sequelize.TEXT, allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: true },

        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('invoices', ['doc_type']);
    await queryInterface.addIndex('invoices', ['sale_id']);
    await queryInterface.addIndex('invoices', ['customer_id']);
    await queryInterface.addIndex('invoices', ['status']);
    await queryInterface.addIndex('invoices', ['cae']);

    // ── invoice_items ──────────────────────────────────────────────────
    await queryInterface.createTable('invoice_items', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        invoice_id: { type: Sequelize.INTEGER, allowNull: false },
        product_id: { type: Sequelize.INTEGER, allowNull: true },
        variant_id: { type: Sequelize.INTEGER, allowNull: true },
        sale_item_id: { type: Sequelize.INTEGER, allowNull: true },
        description: { type: Sequelize.STRING(300), allowNull: false },
        quantity: { type: Sequelize.DECIMAL(12, 3), allowNull: false, defaultValue: 1 },
        unit: { type: Sequelize.STRING(10), allowNull: true },
        unit_price: { type: Sequelize.DECIMAL(14, 4), allowNull: false, defaultValue: 0 },
        discount_percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
        net_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        tax_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 21 },
        tax_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        total: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('invoice_items', ['invoice_id']);

    // ── invoice_taxes ──────────────────────────────────────────────────
    await queryInterface.createTable('invoice_taxes', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        invoice_id: { type: Sequelize.INTEGER, allowNull: false },
        kind: {
            type: Sequelize.ENUM('iva', 'perception', 'internal_tax', 'other'),
            allowNull: false,
            defaultValue: 'iva',
        },
        afip_id: { type: Sequelize.INTEGER, allowNull: true },
        description: { type: Sequelize.STRING(200), allowNull: true },
        base_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        rate: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
        amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('invoice_taxes', ['invoice_id']);

    console.info('    ~ Tablas de facturación creadas');
}

export async function down(queryInterface) {
    await queryInterface.dropTable('invoice_taxes');
    await queryInterface.dropTable('invoice_items');
    await queryInterface.dropTable('invoices');
    await queryInterface.dropTable('fiscal_sequences');
    await queryInterface.dropTable('fiscal_configs');
}
