import axios from 'axios';
import CONFIG from '../config/config.js';
import { errorMessage } from './messages.js';

const { AUTHORIZATION: { USER, PASSWORD } } = CONFIG;

const connection = async ({ method, url, headers = {}, data = {}, params = {} }) => {
    try {
        const headersDefault = {
            'Accept-Charset': 'utf-8',
            'Authorization': 'Basic ' + Buffer.from(`${USER}:${PASSWORD}`).toString('base64'),
            'Content-Type': 'application/json',
            ...headers,
        };

        const response = await axios({ method, url, headers: headersDefault, data, params });

        if (response.data) return response.data;
        return errorMessage({ message: 'Ocurrió un error con los datos que estás enviando' });
    } catch (error) {
        return error?.response?.data ?? errorMessage({ message: 'Ocurrió un error con los datos que estás enviando' });
    }
};

export default connection;
