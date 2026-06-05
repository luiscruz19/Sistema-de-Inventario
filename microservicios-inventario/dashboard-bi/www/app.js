import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import sequelize from '../db/sequelize.js';
import routes from '../routes/index.js';
import systemRoutes from '../routes/system.js';
import notFound from '../middlewares/not-found.js';
import Authorization from '../middlewares/authorization.js';
import Debug from '../middlewares/debug.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(Authorization);
app.use(Debug);

sequelize.authenticate()
    .then(() => console.log('Conexión a base de datos establecida (Inventario - Dashboard BI)'))
    .catch((err) => console.error('Error conectando a la base de datos:', err));

app.use('/system', systemRoutes);
app.use('/', routes);

app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'inventario-dashboard-bi' });
});

app.use(notFound);

export default app;
