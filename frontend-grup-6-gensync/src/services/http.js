import axios from 'axios';

const isLocalFrontend = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const localApiUrl = `${window.location.protocol}//${window.location.hostname}:8000/api`;
const configuredApiUrl = import.meta.env.VITE_API_URL;
const configuredAssetUrl = import.meta.env.VITE_ASSET_URL;
const baseURL = configuredApiUrl || (isLocalFrontend ? localApiUrl : '/api');

const http = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const assetUrl = (path) => {
    if (!path) return '';
    if (/^(https?:|data:)/.test(path)) return path;

    if (configuredAssetUrl) {
        return `${configuredAssetUrl.replace(/\/$/, '')}${path}`;
    }

    const apiRoot = http.defaults.baseURL || '/api';
    if (apiRoot.startsWith('http')) {
        return `${apiRoot.replace(/\/api\/?$/, '')}${path}`;
    }

    if (path.startsWith('/uploads/')) {
        if (isLocalFrontend) {
            return `${window.location.protocol}//${window.location.hostname}:8000${path}`;
        }

        if (!window.location.port || window.location.port === '80') {
            return `${window.location.protocol}//${window.location.hostname}:8080${path}`;
        }
    }

    return `${window.location.origin}${path}`;
};

http.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default http;
