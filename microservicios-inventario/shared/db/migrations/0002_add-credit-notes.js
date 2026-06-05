/**
 * Migración: Notas de crédito (devoluciones/ajustes).
 * Tabla: credit_notes, credit_note_items
 */

export async function up(queryInterface, Sequelize) {

    // ── credit_notes ──
    await queryInterface.createTable('credit_notes', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        sale_id: { type: Sequelize.INTEGER, allowNull: true, comment: 'Venta original (nullable para ajustes manuales)' },
        number: { type: Sequelize.STRING(30), allowNull: false, comment: 'Número de NC generado (ej: NC-0001)' },
        reason: { type: Sequelize.STRING(300), allowNull: false, comment: 'Motivo de la devolución' },
        status: {
            type: Sequelize.ENUM('pending', 'applied', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending',
        },
        subtotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        tax_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        total: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        refund_method: {
            type: Sequelize.ENUM('cash', 'credit_card', 'transfer', 'store_credit', 'none'),
            allowNull: false,
            defaultValue: 'none',
        },
        applied_at: { type: Sequelize.DATE, allowNull: true },
        cancelled_at: { type: Sequelize.DATE, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('credit_notes', ['sale_id']);
    await queryInterface.addIndex('credit_notes', ['status']);
    console.info('    ~ Tabla credit_notes creada');

    // ── credit_note_items ──
    await queryInterface.createTable('credit_note_items', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        credit_note_id: { type: Sequelize.INTEGER, allowNull: false },
        product_id: { type: Sequelize.INTEGER, allowNull: true },
        variant_id: { type: Sequelize.INTEGER, allowNull: true },
        description: { type: Sequelize.STRING(200), allowNull: false },
        quantity: { type: Sequelize.DECIMAL(10, 3), allowNull: false },
        unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        tax_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
        subtotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('credit_note_items', ['credit_note_id']);
    console.info('    ~ Tabla credit_note_items creada');
}

export async function down(queryInterface) {
    await queryInterface.dropTable('credit_note_items');
    await queryInterface.dropTable('credit_notes');
}
