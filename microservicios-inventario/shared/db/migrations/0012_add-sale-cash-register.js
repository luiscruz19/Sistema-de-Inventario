/**
 * Migración 0012: Agrega columna cash_register_id a sales.
 * Vincula cada venta con la apertura de caja bajo la que se registró, para
 * poder listar las ventas de cada sesión de caja (arqueo).
 */

export async function up(queryInterface, Sequelize) {
    const [colResult] = await queryInterface.sequelize.query("SHOW COLUMNS FROM sales LIKE 'cash_register_id'");
    if (colResult.length === 0) {
        await queryInterface.addColumn('sales', 'cash_register_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            after: 'branch_id',
        });
        await queryInterface.addIndex('sales', ['cash_register_id'], { name: 'sales_cash_register_id' }).catch(() => {});
        console.info('    ~ Columna cash_register_id agregada a sales');
    }

    console.info('Migración 0012_add-sale-cash-register completada');
}

export async function down(queryInterface) {
    await queryInterface.removeColumn('sales', 'cash_register_id').catch(() => {});
}
