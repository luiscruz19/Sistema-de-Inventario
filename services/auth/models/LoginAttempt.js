import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const LoginAttempt = sequelize.define('login_attempts', {
    email: { type: DataTypes.STRING(255), allowNull: false },
    ip: { type: DataTypes.STRING(45), allowNull: false },
    count: { type: DataTypes.INTEGER, defaultValue: 0 },
    blocked_until: { type: DataTypes.BIGINT, defaultValue: 0 },
}, {
    tableName: 'login_attempts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [{ fields: ['email', 'ip'] }, { fields: ['updated_at'] }],
});

export default LoginAttempt;
