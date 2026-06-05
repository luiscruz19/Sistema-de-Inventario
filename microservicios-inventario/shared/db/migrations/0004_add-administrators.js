/**
 * Migración: Crear tabla administrators.
 * DB: inventario
 */

export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('administrators', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        client_name: { type: Sequelize.STRING, allowNull: true },
        user_id: { type: Sequelize.INTEGER, allowNull: false },
        name: { type: Sequelize.STRING, allowNull: false },
        phone: { type: Sequelize.STRING, allowNull: false, defaultValue: '' },
        created_by: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('administrators', ['user_id'], { unique: true });
}

export async function down(queryInterface) {
    await queryInterface.dropTable('administrators');
}
