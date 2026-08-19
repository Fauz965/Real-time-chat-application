const userService = require('../services/userService');

// Map of userId -> Set of socket ids (a user can have multiple tabs/devices)
const onlineUsers = new Map();

function addSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
  return onlineUsers.get(userId).size === 1; // true if user just came online
}

function removeSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) return false;
  const set = onlineUsers.get(userId);
  set.delete(socketId);
  if (set.size === 0) {
    onlineUsers.delete(userId);
    return true; // true if user just went fully offline
  }
  return false;
}

function isOnline(userId) {
  return onlineUsers.has(userId);
}

function registerPresenceHandlers(io, socket) {
  const { userId } = socket.data;

  const justCameOnline = addSocket(userId, socket.id);
  if (justCameOnline) {
    const user = userService.setUserStatus(userId, 'online');
    io.emit('presence:update', { userId, status: 'online', lastSeen: user.lastSeen });
  }

  socket.on('disconnect', () => {
    const wentOffline = removeSocket(userId, socket.id);
    if (wentOffline) {
      const user = userService.setUserStatus(userId, 'offline');
      io.emit('presence:update', { userId, status: 'offline', lastSeen: user.lastSeen });
    }
  });
}

module.exports = { registerPresenceHandlers, isOnline, onlineUsers };
