import { DataTypes } from 'sequelize';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import sequelize from '../db/sequelize.js';
import CONFIG from '../config/config.js';

const { SESSION_TIMEOUT, SECRET_KEY } = CONFIG;

const User = sequelize.define('users', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING(255), allowNull: false, validate: { isEmail: true } },
    password: { type: DataTypes.STRING(255), allowNull: true },
    verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    remember_token: { type: DataTypes.STRING(255), allowNull: true },
    contact_email: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
    is_guest: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    previous_password: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
    totp_secret: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
    totp_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
});

User.prototype.generateHash = function (password) {
    return bcrypt.hash(password, 12);
};

User.prototype.validPassword = function (password) {
    return bcrypt.compare(password, this.password);
};

User.prototype.generateToken = function ({ id, email, remember_token }) {
    const nowMs = Date.now();
    const sessionTimeoutMs = Number(SESSION_TIMEOUT || 0);
    const expirationMs = nowMs + (sessionTimeoutMs > 0 ? sessionTimeoutMs : 2 * 60 * 60 * 1000);
    const payload = {
        id,
        email,
        remember_token,
        exp: Math.floor(expirationMs / 1000),
    };
    return jwt.sign(payload, SECRET_KEY, { algorithm: 'HS256' });
};

User.prototype.generateUUID = function (length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = randomBytes(length);
    return Array.from(bytes).map(b => chars[b % chars.length]).join('');
};

export default User;
