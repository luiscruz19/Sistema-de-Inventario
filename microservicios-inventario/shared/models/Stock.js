import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const Stock = sequelize.define('stock', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    variant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    reserved_quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'stock',
    timestamps: true,
    indexes: [
        { fields: ['product_id', 'variant_id', 'branch_id'], unique: true, name: 'idx_stock_unique' },
        { fields: ['branch_id'] },
    ]
});

export default Stock;
