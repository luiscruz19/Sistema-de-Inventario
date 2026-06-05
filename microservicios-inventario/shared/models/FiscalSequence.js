import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * FiscalSequence — contador por (pto_vta, doc_type).
 * Se usa como fallback y espejo de FECompUltimoAutorizado.
 */
const FiscalSequence = sequelize.define('fiscal_sequences', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    pto_vta: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    doc_type: {
        type: DataTypes.STRING(10),
        allowNull: false,
    },
    last_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    last_synced_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'fiscal_sequences',
    timestamps: true,
    indexes: [
        { fields: ['pto_vta', 'doc_type'], unique: true },
    ],
});

export default FiscalSequence;
