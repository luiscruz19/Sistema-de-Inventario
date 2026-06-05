import { Sequelize } from 'sequelize';
import CONFIG from '../config/config.js';

const { DATABASE: { HOST, USER, PASSWORD, NAME, PORT, DIALECT } } = CONFIG;

const sequelize = new Sequelize(NAME, USER, PASSWORD, {
    host: HOST,
    port: Number(PORT) || 3306,
    dialect: DIALECT || 'mysql',
    logging: false,
    pool: {
        max: parseInt(process.env.DB_POOL_MAX || '10'),
        min: parseInt(process.env.DB_POOL_MIN || '2'),
        acquire: 30000,
        idle: 10000,
    },
});

export default sequelize;
