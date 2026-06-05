import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const CustomerTransaction = sequelize.define('customer_transactions', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('credit', 'debit'),
        allowNull: false,
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING(300),
        allowNull: false,
    },
    reference_type: {
        type: DataTypes.ENUM('sale', 'credit_note', 'payment', 'manual'),
        allowNull: false,
        defaultValue: 'manual',
    },
    reference_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    balance_after: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'customer_transactions',
    timestamps: true,
    updatedAt: false,
    indexes: [
        { fields: ['customer_id'] },
        { fields: ['customer_id'] },
    ],
});

export default CustomerTransaction;
