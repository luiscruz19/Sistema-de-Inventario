import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const PriceListItem = sequelize.define('price_list_items', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    price_list_id: {
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
    price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
}, {
    tableName: 'price_list_items',
    timestamps: true,
    indexes: [
        { fields: ['price_list_id'] },
        { fields: ['price_list_id', 'product_id', 'variant_id'], unique: true, name: 'idx_price_list_product_variant' },
    ]
});

export default PriceListItem;
