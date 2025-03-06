import axios from 'axios';

// Use Vite environment variable with fallback for runtime detection
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || (isLocalhost ? '${API_BASE_URL}' : 'https://spc-tracking-app-backend.onrender.com');

// Create an Axios instance with the base URL and credentials
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Ensure cookies (e.g., auth_token) are sent
});

// Export functions for your API calls
export const getActiveBuild = (username) => api.get(`/active_builds/${username}`);
export const getActiveBuilds = () => api.get('/active_builds');
export const getLotDetails = (lotNumber) => api.get(`/lots/${lotNumber}`);
export const getSpecs = (configNumber, mpNumber) => api.get(`/specs/by-config-mp/${configNumber}/${mpNumber}`);
export const getInspectionLogs = (lotNumber, mpNumber) => api.get(`/inspection_logs/${lotNumber}/${mpNumber}`);
export const getYield = (lotNumber, mpNumber) => api.get(`/yield/${lotNumber}/${mpNumber}`);
export const logInspection = (data) => api.post('/log_inspection', data);
export const endBuild = (data) => api.post('/end_build', data);
export const updateLotQuantity = (data) => api.post('/lots/update-quantity', data);
export const getCurrentUser = () => api.get('/current_user');
export const login = (credentials) => api.post('/login', credentials);
export const logout = () => api.post('/logout');
export const getConfigurations = () => api.get('/configurations');
export const getInspectionLogsByConfig = (configNumber) => api.get(`/inspection-logs/${encodeURIComponent(configNumber)}`);
export const getNormalityTest = (configNumber, mpNumber, specName) => api.get(`/test/normality/${configNumber}/${mpNumber}/${specName}`);

export default api;