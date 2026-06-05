import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const ProductVariant = sequelize.define('product_variants', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    sku: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    barcode: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    cost_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
    },
    sale_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'product_variants',
    timestamps: true,
    indexes: [
        { fields: ['product_id'] },
        { fields: ['sku'] },
    ]
});

export default ProductVariant;
