import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const InvoiceItem = sequelize.define('invoice_items', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    variant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    sale_item_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    description: {
        type: DataTypes.STRING(300),
        allowNull: false,
    },
    quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 1,
    },
    unit: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    unit_price: {
        type: DataTypes.DECIMAL(14, 4),
        allowNull: false,
        defaultValue: 0,
        comment: 'Precio unitario neto (sin IVA)',
    },
    discount_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
    },
    net_amount: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
    tax_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 21,
        comment: 'Alícuota IVA aplicada (0/10.5/21/27/...)',
    },
    tax_amount: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
    total: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'invoice_items',
    timestamps: true,
    indexes: [
        { fields: ['invoice_id'] },
    ],
});

export default InvoiceItem;
