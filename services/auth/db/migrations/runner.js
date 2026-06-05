/**
 * Manual migration runner.
 * Usage:
 *   node db/migrations/runner.js           # run pending
 *   node db/migrations/runner.js --status  # show status
 */
import { Sequelize } from 'sequelize';
import sequelize from '../sequelize.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureMigrationsTable() {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

async function run() {
    const statusOnly = process.argv.includes('--status');

    try {
        await sequelize.authenticate();
        console.info('Connection established.');

        await ensureMigrationsTable();

        const [rows] = await sequelize.query('SELECT name FROM _migrations ORDER BY id ASC');
        const executed = new Set(rows.map(r => r.name));

        const files = fs.readdirSync(__dirname)
            .filter(f => /^\d{3}[-_]/.test(f) && f.endsWith('.js'))
            .sort();

        if (statusOnly) {
            console.info('\nMigration status:\n');
            for (const file of files) {
                const status = executed.has(file) ? 'DONE   ' : 'PENDING';
                console.info(`  ${status}  ${file}`);
            }
            const pending = files.filter(f => !executed.has(f));
            console.info(`\nTotal: ${files.length} | Done: ${executed.size} | Pending: ${pending.length}`);
            process.exit(0);
        }

        const pending = files.filter(f => !executed.has(f));

        if (pending.length === 0) {
            console.info('No pending migrations.');
            process.exit(0);
        }

        console.info(`\n${pending.length} pending migration(s):\n`);

        for (const file of pending) {
            console.info(`Running: ${file}`);
            try {
                const migration = await import(`./${file}`);
                const upFn = migration.default?.up ?? migration.up;
                await upFn(sequelize.getQueryInterface(), Sequelize.DataTypes);
                await sequelize.query('INSERT INTO _migrations (name) VALUES (?)', { replacements: [file] });
                console.info(`  OK: ${file}`);
            } catch (err) {
                console.error(`  ERR: ${file}:`, err.message);
                process.exit(1);
            }
        }

        console.info('\nMigrations completed.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

run();
