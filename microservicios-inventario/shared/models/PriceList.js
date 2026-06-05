import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const PriceList = sequelize.define('price_lists', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('retail', 'wholesale', 'special'),
        allowNull: false,
        defaultValue: 'retail',
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'price_lists',
    timestamps: true,
    indexes: [
        { fields: ['active'] },
    ]
});

export default PriceList;
