import axios from 'axios';
import CONFIG from '../config/config.js';
import { errorMessage } from './messages.js';

const { AUTHORIZATION: { PASSWORD, USER } } = CONFIG;

const connection = async ({ method, url, headers = {}, data = {}, params = {} }) => {
    try {
        const headersDefault = {
            'Accept-Charset': 'utf-8',
            'Authorization': 'Basic ' + Buffer.from(USER + ":" + PASSWORD).toString('base64'),
            'Content-Type': 'application/json',
            ...headers
        };

        const response = await axios({
            method,
            url,
            headers: headersDefault,
            data,
            params
        });

        if (response.data) {
            return response.data;
        } else {
            return errorMessage({ message: 'Error en la conexión externa' });
        }
    } catch (error) {
        return error?.response?.data ?? errorMessage({ message: 'Error en la conexión externa' });
    }
};

export default connection;
