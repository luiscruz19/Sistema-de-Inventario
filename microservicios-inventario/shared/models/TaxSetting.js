import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const TaxSetting = sequelize.define('tax_settings', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    jurisdiccion: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    tipo: {
        type: DataTypes.ENUM('retencion', 'percepcion'),
        allowNull: false,
    },
    impuesto: {
        type: DataTypes.ENUM('IIBB', 'GANANCIAS', 'IVA_ADICIONAL', 'OTRO'),
        allowNull: false,
        defaultValue: 'IIBB',
    },
    alicuota: {
        type: DataTypes.DECIMAL(6, 4),
        allowNull: false,
    },
    monto_minimo: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    activa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'tax_settings',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['jurisdiccion', 'tipo', 'impuesto'], unique: true, name: 'uq_tax_setting_jurisdiccion_tipo_impuesto' },
    ],
});

export default TaxSetting;
