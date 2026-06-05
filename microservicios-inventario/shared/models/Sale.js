import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const Sale = sequelize.define('sales', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    sale_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    payment_method: {
        type: DataTypes.ENUM('cash', 'card', 'transfer', 'mercadopago', 'credit', 'mixed'),
        allowNull: false,
        defaultValue: 'cash',
    },
    status: {
        type: DataTypes.ENUM('completed', 'cancelled', 'refunded'),
        allowNull: false,
        defaultValue: 'completed',
    },
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    discount_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    discount_percentage: {
        type: DataTypes.DECIMAL(5, 2),
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
    paid_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    change_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'sales',
    timestamps: true,
    indexes: [
        { fields: ['branch_id'] },
        { fields: ['customer_id'] },
        { fields: ['status'] },
        { fields: ['payment_method'] },
        { fields: ['sale_number'] },
        { fields: ['completed_at'] },
    ]
});

export default Sale;
