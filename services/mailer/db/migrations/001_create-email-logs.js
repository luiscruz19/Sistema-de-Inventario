export const id = '001_create-email-logs';

export async function up(sequelize) {
    const qi = sequelize.getQueryInterface();
    const { DataTypes } = await import('sequelize');

    const tableExists = await qi.tableExists('email_logs');
    if (tableExists) return;

    await qi.createTable('email_logs', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        recipient: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        subject: {
            type: DataTypes.STRING(500),
            allowNull: false,
        },
        from: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        project: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('sent', 'error'),
            allowNull: false,
            defaultValue: 'sent',
        },
        error_message: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    });
}
