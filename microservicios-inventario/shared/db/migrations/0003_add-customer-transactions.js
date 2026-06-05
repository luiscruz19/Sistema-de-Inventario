/**
 * Migración: Cuenta corriente / historial de transacciones por cliente.
 * Tabla: customer_transactions
 */

export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('customer_transactions', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        customer_id: { type: Sequelize.INTEGER, allowNull: false },
        type: {
            type: Sequelize.ENUM('credit', 'debit'),
            allowNull: false,
            comment: 'credit = abona / aumenta saldo; debit = consume / reduce saldo',
        },
        amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        description: { type: Sequelize.STRING(300), allowNull: false },
        reference_type: {
            type: Sequelize.ENUM('sale', 'credit_note', 'payment', 'manual'),
            allowNull: false,
            defaultValue: 'manual',
        },
        reference_id: { type: Sequelize.INTEGER, allowNull: true },
        balance_after: { type: Sequelize.DECIMAL(12, 2), allowNull: false, comment: 'Saldo del cliente después de esta transacción' },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('customer_transactions', ['customer_id']);
    console.info('    ~ Tabla customer_transactions creada');
}

export async function down(queryInterface) {
    await queryInterface.dropTable('customer_transactions');
}
