import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const CreditNoteItem = sequelize.define('credit_note_items', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    credit_note_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    variant_id: { type: DataTypes.INTEGER, allowNull: true },
    description: { type: DataTypes.STRING(200), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    tax_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, {
    tableName: 'credit_note_items',
    timestamps: true,
});

export default CreditNoteItem;
