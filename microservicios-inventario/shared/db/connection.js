import sequelize from './sequelize.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { modelOwnership, sharedModels } from '../config/models.js';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para cargar todos los modelos dinámicamente
async function loadModels() {
    const modelsPath = path.join(__dirname, '../models');
    const models = {};

    try {
        // Leer todos los archivos en la carpeta models
        const files = fs.readdirSync(modelsPath);

        // Filtrar solo archivos .js
        const modelFiles = files.filter(file =>
            file.endsWith('.js') && file !== 'index.js'
        );

        // Importar cada modelo dinámicamente
        for (const file of modelFiles) {
            const relativePath = `../models/${file}`;

            try {
                const modelModule = await import(relativePath);
                const modelName = path.basename(file, '.js');

                if (modelModule.default) {
                    models[modelName] = modelModule.default;
                    console.info(`${modelName}`);
                } else {
                    console.warn(`Modelo ${modelName} no tiene export default`);
                }
            } catch (error) {
                console.error(`Error cargando ${file}:`, error.message);
            }
        }

        return models;
    } catch (error) {
        console.error('Error leyendo la carpeta de modelos:', error);
        return {};
    }
}

(async () => {
    try {
        console.info('Sincronizando tablas con modelos...');

        // Cargar todos los modelos dinámicamente
        const models = await loadModels();

        // Mostrar los modelos cargados
        console.info(`Modelos cargados: ${Object.keys(models).join(', ')}`);
        console.info(`Total de modelos: ${Object.keys(models).length}`);

        // Configurar las relaciones si el archivo index.js existe
        try {
            const relationModule = await import('../models/index.js');
            if (relationModule.setupAssociations) {
                relationModule.setupAssociations();
                console.info('Relaciones configuradas correctamente');
            }
        } catch (relationError) {
            console.warn('No se pudieron configurar las relaciones:', relationError.message);
        }

        // Verificar conexión a la base de datos
        try {
            await sequelize.authenticate();
            console.info('Conexión a la base de datos establecida correctamente');
        } catch (connectionError) {
            console.error('No se pudo conectar a la base de datos:', connectionError);
            return;
        }

        // Determinar entorno y servicio
        const isProduction = process.env.NODE_ENV === 'production';
        const serviceName = process.env.SERVICE_NAME || '';
        const runtimeSyncEnv = process.env.DB_RUNTIME_SYNC;
        // El sync de modelos es opt-in: las migraciones son la fuente de verdad del esquema.
        // Solo se sincroniza si DB_RUNTIME_SYNC=true (evita chocar con las migraciones).
        const enableRuntimeSync = String(runtimeSyncEnv).toLowerCase() === 'true';
        console.info(`Microservicio: ${serviceName || 'NO DEFINIDO'}`);
        console.info(`DB runtime sync: ${enableRuntimeSync ? 'ACTIVADO' : 'DESACTIVADO'}`);

        // Espera inicial aleatoria para evitar que todos los servicios sincronicen al mismo tiempo
        const maxDelay = isProduction ? 1000 : 3000;
        const initialDelay = Math.floor(Math.random() * maxDelay);
        if (initialDelay > 0) {
            console.info(`Esperando ${initialDelay}ms para evitar conflictos de inicio simultáneo...`);
            await new Promise(resolve => setTimeout(resolve, initialDelay));
        }

        const shouldSyncModel = (modelName) => {

            // Si no hay nombre de servicio, sincronizar todos los modelos
            if (!serviceName) {
                console.warn('SERVICE_NAME no definido, sincronizando todos los modelos');
                return true;
            }

            // Sincronizar modelos propios del servicio o compartidos básicos
            const ownedModels = modelOwnership[serviceName] || [];
            return sharedModels.includes(modelName) || ownedModels.includes(modelName);
        };

        // Filtrar modelos a sincronizar
        const modelsToSync = Object.entries(models).filter(([modelName]) =>
            shouldSyncModel(modelName)
        );

        console.info(`Modelos a sincronizar (${modelsToSync.length}): ${modelsToSync.map(([name]) => name).join(', ')}`);

        if (!enableRuntimeSync) {
            console.info('Se omite sincronización de modelos en runtime (usar migraciones).');
            return;
        }

        // Determinar si se permite alter según el entorno
        const allowAlter = !isProduction;

        if (isProduction) {
            console.info('Modo PRODUCCIÓN: alter desactivado (solo crear tablas nuevas)');
        } else {
            console.info('Modo DESARROLLO: alter activado (puede modificar tablas existentes)');
        }

        // Sincronizar con la base de datos de forma segura
        let syncSuccessful = false;
        const maxRetries = 3;

        for (let retry = 0; retry < maxRetries && !syncSuccessful; retry++) {
            try {
                if (retry > 0) {
                    const waitTime = Math.floor(Math.random() * 3000) + 2000 * retry;
                    console.info(`Esperando ${waitTime}ms antes del intento ${retry + 1}...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

                console.info(`Intento de sincronización ${retry + 1}/${maxRetries}`);
                console.info('Sincronizando modelos seleccionados...');

                const results = [];
                for (const [modelName, model] of modelsToSync) {
                    try {
                        await model.sync({
                            force: false,
                            alter: allowAlter,
                            logging: false
                        });
                        console.info(`Modelo ${modelName} verificado/creado`);
                        results.push({ success: true, modelName });
                    } catch (modelError) {
                        if (modelError.name === 'SequelizeDatabaseError' &&
                            modelError.parent?.code === 'ER_TABLE_EXISTS_ERROR') {
                            console.info(`Modelo ${modelName} ya existe`);
                            results.push({ success: true, modelName });
                            continue;
                        }

                        if (modelError.name === 'SequelizeDatabaseError' &&
                            (modelError.parent?.code === 'ER_CANT_DROP_FIELD_OR_KEY' ||
                             modelError.parent?.code === 'ER_DROP_INDEX_FK')) {
                            console.warn(`${modelName}: constraint no encontrada (ignorado)`);
                            results.push({ success: true, modelName });
                            continue;
                        }

                        if (modelError.parent?.code === 'ER_LOCK_DEADLOCK') {
                            console.warn(`${modelName}: deadlock detectado`);
                            results.push({ success: false, modelName, error: modelError });
                            continue;
                        }

                        console.error(`Error en modelo ${modelName}:`, modelError.message);
                        results.push({ success: false, modelName, error: modelError });
                    }

                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                const hasDeadlocks = results.some(r => !r.success && r.error?.parent?.code === 'ER_LOCK_DEADLOCK');
                const hasErrors = results.some(r => !r.success);

                if (hasDeadlocks && retry < maxRetries - 1) {
                    console.warn(`Deadlocks detectados, reintentando...`);
                    continue;
                }

                if (!hasErrors || retry === maxRetries - 1) {
                    syncSuccessful = true;
                    const successCount = results.filter(r => r.success).length;
                    console.info(`Sincronización completada: ${successCount}/${results.length} modelos verificados`);
                }

            } catch (syncError) {
                console.error(`Error en intento ${retry + 1}:`, syncError.message);

                if (syncError.parent?.code === 'ER_LOCK_DEADLOCK' && retry < maxRetries - 1) {
                    continue;
                }

                if (retry === maxRetries - 1) {
                    syncSuccessful = true;
                    console.warn('Usando tablas existentes sin modificaciones');
                }
            }
        }

        if (!syncSuccessful) {
            console.error('No se pudo completar la sincronización después de todos los intentos');
            console.info('Las tablas existentes se usarán sin cambios');
        }

    } catch (error) {
        console.error('Error general al sincronizar modelos:', error);
    }
})();
