import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const CreditNote = sequelize.define('credit_notes', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sale_id: { type: DataTypes.INTEGER, allowNull: true },
    number: { type: DataTypes.STRING(30), allowNull: false },
    reason: { type: DataTypes.STRING(300), allowNull: false },
    status: {
        type: DataTypes.ENUM('pending', 'applied', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
    },
    subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    tax_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    refund_method: {
        type: DataTypes.ENUM('cash', 'credit_card', 'transfer', 'store_credit', 'none'),
        allowNull: false,
        defaultValue: 'none',
    },
    applied_at: { type: DataTypes.DATE, allowNull: true },
    cancelled_at: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
    tableName: 'credit_notes',
    timestamps: true,
});

export default CreditNote;
