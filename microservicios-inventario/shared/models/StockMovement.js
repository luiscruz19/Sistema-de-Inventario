import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const StockMovement = sequelize.define('stock_movements', {
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
    type: {
        type: DataTypes.ENUM('purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return'),
        allowNull: false,
    },
    quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    previous_stock: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    new_stock: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    unit_cost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
    },
    reference_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    reference_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'stock_movements',
    timestamps: true,
    indexes: [
        { fields: ['product_id'] },
        { fields: ['branch_id'] },
        { fields: ['type'] },
        { fields: ['reference_type', 'reference_id'] },
    ]
});

export default StockMovement;
