import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';
import { getToken } from '../services/api.js';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5050';

export function SocketProvider({ children }) {
  const { isAuthed, user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [onlineIds, setOnlineIds] = useState(() => new Set());

  useEffect(() => {
    if (!isAuthed || !user) return;

    const socket = io(SOCKET_URL, {
      auth: { token: getToken() },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    // Presence is kept here so every screen can ask "is this person online?".
    socket.on('presence:sync', ({ userIds }) => setOnlineIds(new Set(userIds)));
    socket.on('presence:online', ({ userId }) =>
      setOnlineIds((prev) => new Set(prev).add(userId))
    );
    socket.on('presence:offline', ({ userId }) =>
      setOnlineIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      })
    );

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setOnlineIds(new Set());
    };
  }, [isAuthed, user?._id]);

  const value = useMemo(
    () => ({
      socket: socketRef.current,
      connected,
      onlineIds,
      isOnline: (id) => onlineIds.has(String(id)),
    }),
    [connected, onlineIds]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside <SocketProvider>');
  return ctx;
}

/**
 * Subscribes to a socket event for the lifetime of the component.
 * Keeps the handler in a ref so callers need not memoise it.
 */
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const saved = useRef(handler);
  saved.current = handler;

  useEffect(() => {
    if (!socket) return;
    const listener = (...args) => saved.current?.(...args);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}
