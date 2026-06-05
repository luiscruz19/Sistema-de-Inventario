import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const BusinessConfig = sequelize.define('business_configs', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    tax_id: {
        type: DataTypes.STRING(30),
        allowNull: true,
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'ARS',
    },
    tax_rate_default: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 21.00,
    },
    receipt_prefix: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'T',
    },
    receipt_next_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    allow_oversell: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    tableName: 'business_configs',
    timestamps: true,
    indexes: [
    ]
});

export default BusinessConfig;
