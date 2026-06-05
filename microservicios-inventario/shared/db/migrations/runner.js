/**
 * Runner manual de migraciones.
 * Reutiliza la instancia de Sequelize existente en shared/db/sequelize.js.
 *
 * Uso:
 *   node db/migrations/runner.js            # ejecuta pendientes
 *   node db/migrations/runner.js --status   # lista estado
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
        console.info('✅ Conexión a DB establecida');

        await ensureMigrationsTable();

        const [rows] = await sequelize.query('SELECT name FROM _migrations ORDER BY id ASC');
        const executed = new Set(rows.map(r => r.name));

        const files = fs.readdirSync(__dirname)
            .filter(f => /^\d{4}[-_]/.test(f) && f.endsWith('.js'))
            .sort();

        if (statusOnly) {
            console.info('\n📋 Estado de migraciones:\n');
            for (const file of files) {
                const status = executed.has(file) ? '✅ ejecutada' : '⏳ pendiente';
                console.info(`  ${status}  ${file}`);
            }
            const pending = files.filter(f => !executed.has(f));
            console.info(`\nTotal: ${files.length} | Ejecutadas: ${executed.size} | Pendientes: ${pending.length}`);
            process.exit(0);
        }

        const pending = files.filter(f => !executed.has(f));

        if (pending.length === 0) {
            console.info('✅ No hay migraciones pendientes');
            process.exit(0);
        }

        console.info(`\n📦 ${pending.length} migración(es) pendiente(s):\n`);

        for (const file of pending) {
            console.info(`▶ Ejecutando: ${file}`);
            try {
                const migration = await import(`./${file}`);
                await migration.up(sequelize.getQueryInterface(), Sequelize, sequelize);
                await sequelize.query('INSERT INTO _migrations (name) VALUES (?)', { replacements: [file] });
                console.info(`  ✅ Completada: ${file}`);
            } catch (err) {
                console.error(`  ❌ Error en ${file}:`, err.message);
                console.error('  Abortando migraciones restantes.');
                process.exit(1);
            }
        }

        console.info('\n✅ Migraciones finalizadas');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error general:', err.message);
        process.exit(1);
    }
}

run();
