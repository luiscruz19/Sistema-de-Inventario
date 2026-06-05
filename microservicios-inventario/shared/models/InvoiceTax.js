import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * InvoiceTax — desglose de impuestos aplicados a una factura.
 * Incluye IVA por alícuota y percepciones/impuestos nacionales/provinciales.
 */
const InvoiceTax = sequelize.define('invoice_taxes', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    kind: {
        type: DataTypes.ENUM('iva', 'perception', 'internal_tax', 'other'),
        allowNull: false,
        defaultValue: 'iva',
    },
    afip_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Código AFIP para la alícuota IVA o tributo',
    },
    description: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },
    base_amount: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
    rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
    },
    amount: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'invoice_taxes',
    timestamps: true,
    indexes: [
        { fields: ['invoice_id'] },
    ],
});

export default InvoiceTax;
