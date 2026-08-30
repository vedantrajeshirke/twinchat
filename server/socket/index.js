import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyToken } from '../utils/token.js';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { assertCanAccessConversation } from '../utils/permissions.js';

let io = null;

/** userId → count of open sockets. Presence is "at least one tab connected". */
const online = new Map();

const isOnline = (userId) => online.has(String(userId));

function addSocket(userId) {
  const key = String(userId);
  const next = (online.get(key) ?? 0) + 1;
  online.set(key, next);
  return next === 1; // first connection → went online
}

function removeSocket(userId) {
  const key = String(userId);
  const next = (online.get(key) ?? 1) - 1;
  if (next <= 0) {
    online.delete(key);
    return true; // last connection closed → went offline
  }
  online.set(key, next);
  return false;
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl.split(',').map((o) => o.trim()),
      credentials: true,
    },
  });

  // The socket connection is authenticated with the same JWT as REST (§9).
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Not authenticated'));

      const { sub } = verifyToken(token);
      const user = await User.findById(sub).select('firstName lastName username friends').lean();
      if (!user) return next(new Error('Not authenticated'));

      socket.userId = String(user._id);
      socket.user = user;
      next();
    } catch {
      next(new Error('Not authenticated'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId } = socket;

    // Personal room for direct pushes (requests, list reordering).
    socket.join(`user:${userId}`);

    // Auto-join every conversation the user participates in, so messages
    // arrive even for threads that are not currently open.
    const conversations = await Conversation.find({ participants: userId })
      .select('_id group')
      .lean();
    for (const c of conversations) {
      socket.join(`conversation:${c._id}`);
      if (c.group) socket.join(`group:${c.group}`);
    }

    if (addSocket(userId)) {
      socket.broadcast.emit('presence:online', { userId });
    }
    // Tell the newcomer who is already here.
    socket.emit('presence:sync', { userIds: [...online.keys()] });

    socket.on('conversation:join', async (conversationId, ack) => {
      try {
        await assertCanAccessConversation(conversationId, userId);
        socket.join(`conversation:${conversationId}`);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, message: err.message });
      }
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('typing:start', ({ conversationId } = {}) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing', {
        conversationId,
        user: { _id: userId, firstName: socket.user.firstName },
      });
    });

    socket.on('typing:stop', ({ conversationId } = {}) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing:stopped', {
        conversationId,
        user: { _id: userId },
      });
    });

    socket.on('disconnect', async () => {
      if (removeSocket(userId)) {
        socket.broadcast.emit('presence:offline', { userId });
        await User.updateOne({ _id: userId }, { lastSeenAt: new Date() }).catch(() => {});
      }
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialised');
  return io;
}

export { isOnline };
