import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const CashMovement = sequelize.define('cash_movements', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    cash_register_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    // income = ingreso de efectivo a la caja; expense = egreso/retiro de efectivo.
    type: {
        type: DataTypes.ENUM('income', 'expense'),
        allowNull: false,
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    concept: {
        type: DataTypes.STRING(300),
        allowNull: false,
    },
    reference: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'cash_movements',
    timestamps: true,
    indexes: [
        { fields: ['cash_register_id'] },
    ],
});

export default CashMovement;
