import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const CashRegister = sequelize.define('cash_registers', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    opened_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    closed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    opening_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    closing_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
    },
    expected_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
    },
    difference: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('open', 'closed'),
        allowNull: false,
        defaultValue: 'open',
    },
    opened_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    closed_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'cash_registers',
    timestamps: true,
    indexes: [
        { fields: ['branch_id'] },
        { fields: ['status'] },
    ]
});

export default CashRegister;
