import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const StockTransfer = sequelize.define('stock_transfers', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    from_branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    to_branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('pending', 'in_transit', 'received', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    received_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    received_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'stock_transfers',
    timestamps: true,
    indexes: [
        { fields: ['status'] },
        { fields: ['from_branch_id'] },
        { fields: ['to_branch_id'] },
    ]
});

export default StockTransfer;
