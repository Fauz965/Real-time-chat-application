import React, { useCallback, useRef, useState } from 'react';
import { useSocketContext } from '../context/SocketContext';

const TYPING_STOP_DELAY = 1500;

export default function MessageInput({ conversationId, onSend }) {
  const { socket } = useSocketContext();
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const typingTimeout = useRef(null);
  const isTypingRef = useRef(false);

  const stopTyping = useCallback(() => {
    if (isTypingRef.current && socket) {
      socket.emit('typing:stop', { conversationId });
      isTypingRef.current = false;
    }
  }, [socket, conversationId]);

  function handleChange(e) {
    setValue(e.target.value);
    if (!socket) return;

    if (!isTypingRef.current) {
      socket.emit('typing:start', { conversationId });
      isTypingRef.current = true;
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(stopTyping, TYPING_STOP_DELAY);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setSending(true);
    clearTimeout(typingTimeout.current);
    stopTyping();
    try {
      await onSend(trimmed);
      setValue('');
    } catch (err) {
      // Surface inline; ChatWindow's error banner handles connection issues.
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  }

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <textarea
        rows={1}
        placeholder="Message…"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={stopTyping}
      />
      <button type="submit" className="btn btn--primary message-input__send" disabled={!value.trim() || sending}>
        Send
      </button>
    </form>
  );
}
