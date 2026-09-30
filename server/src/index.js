/**
 * NetPulse API Server
 * Express + Socket.IO server for the Network Intelligence Platform
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const { testConnection } = require('./db');
const { setupWebSocket } = require('./websocket');

// Routes
const trafficRoutes = require('./routes/traffic');
const deviceRoutes = require('./routes/devices');
const statsRoutes = require('./routes/stats');
const anomalyRoutes = require('./routes/anomalies');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

// Make io available to routes
app.set('io', io);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  if (req.method !== 'GET' || process.env.NODE_ENV === 'development') {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// Routes
app.use('/api/traffic', trafficRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/anomalies', anomalyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    websocket_clients: wsHandler ? wsHandler.getClientCount() : 0
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[API] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Setup WebSocket
const wsHandler = setupWebSocket(io);

// Start server
async function start() {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     NETPULSE — Network Intelligence      ║');
  console.log('║            API Server v1.0.0              ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn('[Server] Starting without database connection. Some features may not work.');
    console.warn('[Server] Run: CREATE DATABASE netpulse; then apply database/schema.sql');
  }

  server.listen(PORT, () => {
    console.log(`[Server] REST API running on http://localhost:${PORT}`);
    console.log(`[Server] WebSocket running on ws://localhost:${PORT}`);
    console.log(`[Server] CORS allowed origin: ${CORS_ORIGIN}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    console.log('');
  });
}

start().catch(err => {
  console.error('[Server] Failed to start:', err.message);
  process.exit(1);
});
