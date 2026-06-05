import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const VatBookEntry = sequelize.define('vat_book_entries', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    tipo: {
        type: DataTypes.ENUM('ventas', 'compras'),
        allowNull: false,
    },
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    comprobante_tipo: {
        type: DataTypes.STRING(10),
        allowNull: false,
    },
    numero_comprobante: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    cuit_contraparte: {
        type: DataTypes.STRING(13),
        allowNull: false,
    },
    nombre_contraparte: {
        type: DataTypes.STRING(300),
        allowNull: false,
    },
    neto_gravado: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
    neto_no_gravado: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
    iva_21: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
    iva_105: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
    iva_27: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
    total: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
    periodo: {
        type: DataTypes.STRING(7),
        allowNull: false,
    },
}, {
    tableName: 'vat_book_entries',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['tipo'] },
        { fields: ['periodo'] },
        { fields: ['fecha'] },
    ],
});

export default VatBookEntry;
