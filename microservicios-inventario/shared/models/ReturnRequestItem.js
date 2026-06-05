import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const ReturnRequestItem = sequelize.define('return_request_items', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    return_request_id: {
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
    cantidad: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    precio_unitario: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    motivo: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    reingresa_stock: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'return_request_items',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['return_request_id'] },
    ],
});

export default ReturnRequestItem;
