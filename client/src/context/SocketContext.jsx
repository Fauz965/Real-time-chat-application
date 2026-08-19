import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useUser } from './UserContext';

const SocketContext = createContext(null);

// connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
export function SocketProvider({ children }) {
  const { user } = useUser();
  const [socket, setSocket] = useState(null);
  const [connectionState, setConnectionState] = useState('connecting');
  const [presence, setPresence] = useState({}); // userId -> { status, lastSeen }
  const [typingByConversation, setTypingByConversation] = useState({}); // convId -> Set(userId)
  const appErrorHandlers = useRef(new Set());

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setSocket(null);
      return;
    }

    const s = connectSocket(user.id);
    setSocket(s);
    setConnectionState('connecting');

    s.on('connect', () => setConnectionState('connected'));
    s.on('disconnect', () => setConnectionState('disconnected'));
    s.io.on('reconnect_attempt', () => setConnectionState('reconnecting'));
    s.io.on('reconnect', () => setConnectionState('connected'));

    s.on('presence:update', ({ userId, status, lastSeen }) => {
      setPresence((prev) => ({ ...prev, [userId]: { status, lastSeen } }));
    });

    s.on('typing:start', ({ conversationId, userId }) => {
      setTypingByConversation((prev) => {
        const set = new Set(prev[conversationId] || []);
        set.add(userId);
        return { ...prev, [conversationId]: set };
      });
    });

    s.on('typing:stop', ({ conversationId, userId }) => {
      setTypingByConversation((prev) => {
        const set = new Set(prev[conversationId] || []);
        set.delete(userId);
        return { ...prev, [conversationId]: set };
      });
    });

    s.on('error:app', (payload) => {
      appErrorHandlers.current.forEach((fn) => fn(payload));
    });

    return () => {
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function onAppError(fn) {
    appErrorHandlers.current.add(fn);
    return () => appErrorHandlers.current.delete(fn);
  }

  return (
    <SocketContext.Provider value={{ socket, connectionState, presence, typingByConversation, onAppError }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocketContext must be used within SocketProvider');
  return ctx;
}
