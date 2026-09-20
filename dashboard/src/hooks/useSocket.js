import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../api/socket';

/**
 * Custom hook for Socket.IO event subscription.
 * Automatically subscribes on mount and unsubscribes on unmount.
 */
export function useSocket(eventName, initialValue = null) {
  const [data, setData] = useState(initialValue);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    function onConnect() { setIsConnected(true); }
    function onDisconnect() { setIsConnected(false); }
    function onData(payload) { setData(payload); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(eventName, onData);

    // Check current connection state
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(eventName, onData);
    };
  }, [eventName]);

  return { data, isConnected };
}

/**
 * Hook to track socket connection status
 */
export function useSocketStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();

    function onConnect() { setIsConnected(true); }
    function onDisconnect() { setIsConnected(false); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setIsConnected(socket.connected);

    // Ping-pong latency measurement
    socket.on('pong:server', ({ timestamp }) => {
      setLatency(Date.now() - timestamp);
    });

    intervalRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping:client');
      }
    }, 5000);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('pong:server');
      clearInterval(intervalRef.current);
    };
  }, []);

  return { isConnected, latency };
}

/**
 * Hook that accumulates socket events into an array (e.g., for traffic feed)
 */
export function useSocketFeed(eventName, maxItems = 100) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const socket = getSocket();

    function onData(payload) {
      setItems(prev => {
        const newItems = Array.isArray(payload)
          ? [...payload, ...prev]
          : [payload, ...prev];
        return newItems.slice(0, maxItems);
      });
    }

    socket.on(eventName, onData);
    return () => { socket.off(eventName, onData); };
  }, [eventName, maxItems]);

  const clear = useCallback(() => setItems([]), []);
  return { items, clear };
}
