import dotenv from 'dotenv';

dotenv.config();

const CONFIG = {
    AUTHORIZATION: {
        USER: process.env.AUTH_BASIC_USER,
        PASSWORD: process.env.AUTH_BASIC_PW
    },
    DATABASE: {
        HOST: process.env.DB_HOST || 'localhost',
        USER: process.env.DB_USER || 'root',
        PASSWORD: process.env.DB_ROOT_PASSWORD || '',
        NAME: process.env.DB_NAME_CLIENTES || 'inventario',
        PORT: process.env.DB_PORT || 3306,
        DIALECT: process.env.DB_DIALECT || 'mysql'
    },
    PORT: process.env.MICROSERVICES_PORT || 80,
    SECRET_KEY: process.env.SECRET_KEY || 'token',
    AUTH_API_URL: process.env.AUTH_API_URL,
    MICROSERVICES_URL: {},
}
export default CONFIG;
