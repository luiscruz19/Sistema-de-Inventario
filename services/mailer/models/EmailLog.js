import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const EmailLog = sequelize.define('email_logs', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    recipient: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    subject: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    from: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    project: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('sent', 'error'),
        allowNull: false,
        defaultValue: 'sent',
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'email_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [
        { fields: ['recipient'] },
        { fields: ['created_at'] },
        { fields: ['status'] },
        { fields: ['project'] },
    ],
});

export default EmailLog;
