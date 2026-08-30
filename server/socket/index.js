import { Server } from 'socket.io';
import { env } from '../config/env.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl.split(',').map((o) => o.trim()),
      credentials: true,
    },
  });
  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialised');
  return io;
}
