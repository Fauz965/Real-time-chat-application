import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import { useSocketContext } from '../context/SocketContext';

export function useMessages(conversationId) {
  const { user } = useUser();
  const { socket } = useSocketContext();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!conversationId || !user) return;
    setLoading(true);
    api
      .listMessages(conversationId, user.id)
      .then((list) => {
        setMessages(list);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [conversationId, user]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('conversation:join', conversationId);

    function handleReceive(message) {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    }

    function handleDeleted({ messageId, conversationId: cid }) {
      if (cid !== conversationId) return;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }

    socket.on('message:receive', handleReceive);
    socket.on('message:deleted', handleDeleted);

    return () => {
      socket.emit('conversation:leave', conversationId);
      socket.off('message:receive', handleReceive);
      socket.off('message:deleted', handleDeleted);
    };
  }, [socket, conversationId]);

  const sendMessage = useCallback(
    (content) => {
      return new Promise((resolve, reject) => {
        if (!socket) return reject(new Error('Not connected'));
        socket.emit('message:send', { conversationId, content }, (ack) => {
          if (ack && ack.ok) resolve(ack.message);
          else reject(new Error((ack && ack.error) || 'Failed to send message'));
        });
      });
    },
    [socket, conversationId]
  );

  const deleteMessage = useCallback(
    (messageId) => {
      return new Promise((resolve, reject) => {
        if (!socket) return reject(new Error('Not connected'));
        socket.emit('message:delete', { messageId, conversationId }, (ack) => {
          if (ack && ack.ok) resolve();
          else reject(new Error((ack && ack.error) || 'Failed to delete message'));
        });
      });
    },
    [socket, conversationId]
  );

  return { messages, loading, error, sendMessage, deleteMessage };
}
