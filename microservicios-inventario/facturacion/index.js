import app from './www/app.js';
import './db/connection.js';
import CONFIG from './config/config.js';

const PORT = CONFIG.PORT;

app.listen(PORT, () => {
    console.info(`Servidor INV-MS-FACTURACION corriendo en "http://localhost:` + PORT + '"');
});
