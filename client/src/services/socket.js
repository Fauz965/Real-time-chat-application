import { io } from 'socket.io-client';
import { SERVER_URL } from './config';

let socket = null;

export function connectSocket(userId) {
  if (socket) {
    socket.disconnect();
  }
  socket = io(SERVER_URL, {
    auth: { userId },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
