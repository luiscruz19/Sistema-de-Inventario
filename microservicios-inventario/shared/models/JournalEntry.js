import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const JournalEntry = sequelize.define('journal_entries', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    numero: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    descripcion: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    tipo: {
        type: DataTypes.ENUM('manual', 'automatico'),
        allowNull: false,
        defaultValue: 'manual',
    },
    referencia_tipo: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    referencia_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    total_debe: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
    total_haber: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
    aprobado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    tableName: 'journal_entries',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['fecha'] },
        { fields: ['referencia_tipo'] },
        { fields: ['referencia_id'] },
    ],
});

export default JournalEntry;
