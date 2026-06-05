/**
 * CLI script to create or update an admin user.
 *
 * Usage:
 *   node scripts/create-admin.js [email] [password] [nombre]
 *
 * Falls back to ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NOMBRE env vars if args not provided.
 *
 * Requires DB env vars: DB_HOST_AUTH, DB_USER_AUTH, DB_ROOT_PASSWORD_AUTH, DB_NAME_AUTH, DB_PORT_AUTH
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Sequelize, DataTypes } from 'sequelize';

const EMAIL = process.argv[2] || process.env.ADMIN_EMAIL;
const PASSWORD = process.argv[3] || process.env.ADMIN_PASSWORD;
const NOMBRE = process.argv[4] || process.env.ADMIN_NOMBRE || 'Administrador';

if (!EMAIL || !PASSWORD) {
    console.error('Usage: node scripts/create-admin.js <email> <password> [nombre]');
    console.error('       or set ADMIN_EMAIL + ADMIN_PASSWORD env vars');
    process.exit(1);
}

const sequelize = new Sequelize(
    process.env.DB_NAME_AUTH || 'app_auth',
    process.env.DB_USER_AUTH || 'root',
    process.env.DB_ROOT_PASSWORD_AUTH || '',
    {
        host: process.env.DB_HOST_AUTH || 'localhost',
        port: Number(process.env.DB_PORT_AUTH) || 3306,
        dialect: process.env.DB_DIALECT_AUTH || 'mysql',
        logging: false,
    }
);

const User = sequelize.define('users', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false },
    password: { type: DataTypes.STRING(255), allowNull: true },
    verified: { type: DataTypes.BOOLEAN, defaultValue: true },
    remember_token: { type: DataTypes.STRING(255), allowNull: true },
    is_guest: { type: DataTypes.BOOLEAN, defaultValue: false },
    totp_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'users', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

function generateToken(length = 100) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function run() {
    try {
        await sequelize.authenticate();
        console.log('DB connection established.');

        const existing = await User.findOne({ where: { email: EMAIL } });

        if (existing) {
            const hashed = await bcrypt.hash(PASSWORD, 12);
            await User.update(
                { password: hashed, verified: true },
                { where: { id: existing.id } }
            );
            console.log(`Admin updated: ${EMAIL} (id: ${existing.id})`);
        } else {
            const hashed = await bcrypt.hash(PASSWORD, 12);
            const user = await User.create({
                email: EMAIL,
                password: hashed,
                verified: true,
                is_guest: false,
                totp_enabled: false,
                remember_token: generateToken(100),
            });
            console.log(`Admin created: ${EMAIL} (id: ${user.id})`);
        }

        console.log('\nCredentials:');
        console.log(`  Email:    ${EMAIL}`);
        console.log(`  Password: ${PASSWORD}`);
        console.log('\nDone.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

run();
