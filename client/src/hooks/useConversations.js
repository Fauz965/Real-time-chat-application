import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import { useSocketContext } from '../context/SocketContext';

export function useConversations() {
  const { user } = useUser();
  const { socket } = useSocketContext();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const list = await api.listConversations(user.id);
      setConversations(list);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!socket) return;

    function upsertConversation(conv) {
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conv.id);
        const next = exists ? prev.map((c) => (c.id === conv.id ? { ...c, ...conv } : c)) : [conv, ...prev];
        return next;
      });
    }

    function handleNewConversation(conv) {
      upsertConversation(conv);
    }

    function handleMessageReceive(message) {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === message.conversationId);
        if (idx === -1) return prev; // conversation not loaded yet; a refresh will pick it up
        const updated = { ...prev[idx], lastMessage: message };
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      });
    }

    function handleMessageDeleted({ conversationId }) {
      // Simplest correct approach: re-fetch that one conversation's summary
      // so the preview text reflects the new "last message" state.
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv && user) {
        api.getConversation(conversationId, user.id).then((fresh) => {
          setConversations((prev) => prev.map((c) => (c.id === conversationId ? fresh : c)));
        }).catch(() => {});
      }
    }

    socket.on('conversation:new', handleNewConversation);
    socket.on('message:receive', handleMessageReceive);
    socket.on('message:deleted', handleMessageDeleted);

    return () => {
      socket.off('conversation:new', handleNewConversation);
      socket.off('message:receive', handleMessageReceive);
      socket.off('message:deleted', handleMessageDeleted);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, conversations, user]);

  const addConversation = useCallback((conv) => {
    setConversations((prev) => {
      if (prev.some((c) => c.id === conv.id)) return prev;
      return [conv, ...prev];
    });
  }, []);

  const removeConversation = useCallback((id) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { conversations, loading, error, refresh, addConversation, removeConversation };
}
