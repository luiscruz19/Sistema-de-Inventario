import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const StockTransferItem = sequelize.define('stock_transfer_items', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    transfer_id: {
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
    quantity_sent: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    quantity_received: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'stock_transfer_items',
    timestamps: true,
    indexes: [
        { fields: ['transfer_id'] },
    ]
});

export default StockTransferItem;
