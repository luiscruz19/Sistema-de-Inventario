import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const SaleItem = sequelize.define('sale_items', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    sale_id: {
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
    quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    unit_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    discount_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
    },
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    cost_at_sale: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
    },
}, {
    tableName: 'sale_items',
    timestamps: true,
    indexes: [
        { fields: ['sale_id'] },
        { fields: ['product_id'] },
    ]
});

export default SaleItem;
