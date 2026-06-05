import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const Product = sequelize.define('products', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    unit: {
        type: DataTypes.ENUM('UN', 'KG', 'LT', 'MT'),
        allowNull: false,
        defaultValue: 'UN',
    },
    cost_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    sale_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    tax_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 21.00,
    },
    min_stock_alert: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    image_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    track_stock: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'products',
    timestamps: true,
    indexes: [
        { fields: ['sku'], unique: true },
        { fields: ['barcode'] },
        { fields: ['category_id'] },
        { fields: ['active'] },
    ]
});

export default Product;
