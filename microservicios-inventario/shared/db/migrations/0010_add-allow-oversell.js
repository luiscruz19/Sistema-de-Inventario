/**
 * Migración 0010: Agrega columna allow_oversell a business_configs.
 * Permite (cuando es true) registrar ventas aunque el stock disponible sea insuficiente.
 * Por defecto false: el sistema bloquea la venta con stock negativo.
 */

export async function up(queryInterface, Sequelize) {
    const [colResult] = await queryInterface.sequelize.query("SHOW COLUMNS FROM business_configs LIKE 'allow_oversell'");
    if (colResult.length === 0) {
        await queryInterface.addColumn('business_configs', 'allow_oversell', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            after: 'receipt_next_number',
        });
        console.info('    ~ Columna allow_oversell agregada a business_configs');
    }

    console.info('Migración 0010_add-allow-oversell completada');
}

export async function down(queryInterface) {
    await queryInterface.removeColumn('business_configs', 'allow_oversell').catch(() => {});
}
