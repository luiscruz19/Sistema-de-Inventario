import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const ProductBatch = sequelize.define('product_batches', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    variant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    numero_lote: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    fecha_vencimiento: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    fecha_fabricacion: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    cantidad_inicial: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    cantidad_actual: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    proveedor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'product_batches',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['product_id'] },
    ],
});

export default ProductBatch;
