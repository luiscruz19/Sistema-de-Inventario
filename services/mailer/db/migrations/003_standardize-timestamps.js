export const id = '003_standardize-timestamps';

export async function up(sequelize) {
    const qi = sequelize.getQueryInterface();
    const { DataTypes } = await import('sequelize');

    const hasColumn = async (table, column) => {
        const [[row]] = await sequelize.query(
            `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            { replacements: [table, column] }
        );
        return Number(row.cnt) > 0;
    };

    const addIfMissing = async (table, column, def) => {
        if (!(await hasColumn(table, column))) {
            await qi.addColumn(table, column, def);
        }
    };

    // email_logs: created_at ya existe; agregar updated_at y deleted_at
    await addIfMissing('email_logs', 'updated_at', { type: DataTypes.DATE, allowNull: true, defaultValue: null });
    await addIfMissing('email_logs', 'deleted_at', { type: DataTypes.DATE, allowNull: true, defaultValue: null });
}

export async function down(sequelize) {
    const qi = sequelize.getQueryInterface();
    await qi.removeColumn('email_logs', 'deleted_at').catch(() => {});
    await qi.removeColumn('email_logs', 'updated_at').catch(() => {});
}
