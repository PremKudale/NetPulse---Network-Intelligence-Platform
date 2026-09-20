/**
 * NetPulse WebSocket Handler
 * Manages Socket.IO connections and real-time event broadcasting
 */

function setupWebSocket(io) {
  // Track connected clients
  let clientCount = 0;

  io.on('connection', (socket) => {
    clientCount++;
    console.log(`[WS] Client connected (${clientCount} total): ${socket.id}`);

    // Send initial connection confirmation
    socket.emit('connection:status', {
      connected: true,
      clientId: socket.id,
      timestamp: new Date().toISOString()
    });

    // Handle client subscribing to specific rooms/channels
    socket.on('subscribe', (channel) => {
      const validChannels = ['traffic', 'stats', 'anomalies', 'devices'];
      if (validChannels.includes(channel)) {
        socket.join(channel);
        console.log(`[WS] Client ${socket.id} subscribed to: ${channel}`);
      }
    });

    // Handle client unsubscribing
    socket.on('unsubscribe', (channel) => {
      socket.leave(channel);
      console.log(`[WS] Client ${socket.id} unsubscribed from: ${channel}`);
    });

    // Handle ping for latency measurement
    socket.on('ping:client', () => {
      socket.emit('pong:server', { timestamp: Date.now() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      clientCount--;
      console.log(`[WS] Client disconnected (${clientCount} total): ${socket.id} — ${reason}`);
    });
  });

  // Return helper functions for broadcasting
  return {
    getClientCount: () => clientCount,

    broadcastTraffic: (packets) => {
      io.emit('traffic:live', packets);
    },

    broadcastBandwidth: (data) => {
      io.emit('stats:bandwidth', data);
    },

    broadcastProtocols: (data) => {
      io.emit('stats:protocols', data);
    },

    broadcastDevices: (data) => {
      io.emit('stats:devices', data);
    },

    broadcastSummary: (data) => {
      io.emit('stats:summary', data);
    },

    broadcastAnomaly: (anomaly) => {
      io.emit('anomaly:new', anomaly);
    },

    broadcastAnomalyResolved: (anomaly) => {
      io.emit('anomaly:resolved', anomaly);
    }
  };
}

module.exports = { setupWebSocket };
