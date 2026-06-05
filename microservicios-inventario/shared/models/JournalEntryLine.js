import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const JournalEntryLine = sequelize.define('journal_entry_lines', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    journal_entry_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    account_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    descripcion: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    debe: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
    haber: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'journal_entry_lines',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['journal_entry_id'] },
        { fields: ['account_id'] },
    ],
});

export default JournalEntryLine;
