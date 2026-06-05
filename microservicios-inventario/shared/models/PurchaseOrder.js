import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const PurchaseOrder = sequelize.define('purchase_orders', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    order_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('draft', 'sent', 'partial', 'received', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft',
    },
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    tax_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    expected_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    received_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'purchase_orders',
    timestamps: true,
    indexes: [
        { fields: ['status'] },
        { fields: ['supplier_id'] },
        { fields: ['branch_id'] },
    ]
});

export default PurchaseOrder;
