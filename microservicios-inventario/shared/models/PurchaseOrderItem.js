import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const PurchaseOrderItem = sequelize.define('purchase_order_items', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    purchase_order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    variant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    quantity_ordered: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    quantity_received: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    unit_cost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'purchase_order_items',
    timestamps: true,
    indexes: [
        { fields: ['purchase_order_id'] },
    ]
});

export default PurchaseOrderItem;
