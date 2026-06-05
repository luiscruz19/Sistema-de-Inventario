import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const LoginLog = sequelize.define('login_logs', {
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false },
    ip: { type: DataTypes.STRING(45), allowNull: true },
    forwarded_ip: { type: DataTypes.STRING(255), allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    origin: { type: DataTypes.STRING(255), allowNull: true },
    accept_language: { type: DataTypes.STRING(100), allowNull: true },
}, {
    tableName: 'login_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [{ fields: ['user_id'] }, { fields: ['created_at'] }],
});

export default LoginLog;
