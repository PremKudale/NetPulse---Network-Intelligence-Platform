import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const http = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Traffic ────────────────────────────────────────────────
export const getTraffic = (params = {}) =>
  http.get('/traffic', { params }).then(r => r.data);

export const getFlows = (params = {}) =>
  http.get('/traffic/flows', { params }).then(r => r.data);

// ── Devices ────────────────────────────────────────────────
export const getDevices = (params = {}) =>
  http.get('/devices', { params }).then(r => r.data);

export const getTopDevices = (limit = 10) =>
  http.get('/devices/top', { params: { limit } }).then(r => r.data);

export const getDevice = (ip) =>
  http.get(`/devices/${ip}`).then(r => r.data);

// ── Stats ──────────────────────────────────────────────────
export const getSummary = () =>
  http.get('/stats/summary').then(r => r.data);

export const getBandwidth = (hours = 1) =>
  http.get('/stats/bandwidth', { params: { hours } }).then(r => r.data);

export const getProtocols = () =>
  http.get('/stats/protocols').then(r => r.data);

export const getPorts = (limit = 20) =>
  http.get('/stats/ports', { params: { limit } }).then(r => r.data);

// ── Anomalies ──────────────────────────────────────────────
export const getAnomalies = (params = {}) =>
  http.get('/anomalies', { params }).then(r => r.data);

export const getAnomalySummary = () =>
  http.get('/anomalies/summary').then(r => r.data);

export const resolveAnomaly = (id) =>
  http.put(`/anomalies/${id}/resolve`).then(r => r.data);

// ── Health ─────────────────────────────────────────────────
export const getHealth = () =>
  http.get('/health').then(r => r.data);

export default http;
