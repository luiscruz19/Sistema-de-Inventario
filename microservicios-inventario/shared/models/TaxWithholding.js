import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const TaxWithholding = sequelize.define('tax_withholdings', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    tax_setting_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    sale_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    purchase_order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    tipo: {
        type: DataTypes.ENUM('retencion', 'percepcion'),
        allowNull: false,
    },
    base_imponible: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
    },
    alicuota: {
        type: DataTypes.DECIMAL(6, 4),
        allowNull: false,
    },
    monto: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
    },
    numero_certificado: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
}, {
    tableName: 'tax_withholdings',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['sale_id'] },
        { fields: ['purchase_order_id'] },
    ],
});

export default TaxWithholding;
