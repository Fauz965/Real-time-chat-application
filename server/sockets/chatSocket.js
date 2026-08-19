const messageService = require('../services/messageService');
const conversationService = require('../services/conversationService');
const userService = require('../services/userService');
const { getAssistantReply } = require('../services/aiService');
const { v4: uuidv4 } = require('uuid');

const AI_ASSISTANT_ID = 'ai-assistant';

function ensureAssistantUser() {
  const existing = userService.getUserById(AI_ASSISTANT_ID);
  if (existing) return existing;
  // Directly seed the assistant "user" row so it can be a normal conversation member.
  const db = require('../db/database');
  db.prepare(
    `INSERT OR IGNORE INTO users (id, name, avatar, status, lastSeen) VALUES (?, ?, ?, ?, ?)`
  ).run(AI_ASSISTANT_ID, 'AI Assistant', null, 'online', new Date().toISOString());
  return userService.getUserById(AI_ASSISTANT_ID);
}

function registerChatHandlers(io, socket) {
  const { userId } = socket.data;

  socket.on('conversation:join', (conversationId) => {
    if (!conversationService.isMember(conversationId, userId)) {
      return socket.emit('error:app', { message: 'You are not a member of this conversation' });
    }
    socket.join(conversationId);
  });

  socket.on('conversation:leave', (conversationId) => {
    socket.leave(conversationId);
  });

  socket.on('message:send', (payload, ack) => {
    try {
      const { conversationId, content, messageType } = payload;
      const message = messageService.createMessage({
        conversationId,
        senderId: userId,
        content,
        messageType,
      });
      io.to(conversationId).emit('message:receive', message);
      if (typeof ack === 'function') ack({ ok: true, message });

      // If this conversation includes the AI assistant, generate a reply.
      const members = conversationService.getMembers(conversationId);
      if (members.some((m) => m.id === AI_ASSISTANT_ID)) {
        setTimeout(() => {
          const replyText = getAssistantReply(content);
          const replyMessage = messageService.createMessage({
            conversationId,
            senderId: AI_ASSISTANT_ID,
            content: replyText,
          });
          io.to(conversationId).emit('message:receive', replyMessage);
        }, 500);
      }
    } catch (err) {
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
      socket.emit('error:app', { message: err.message });
    }
  });

  socket.on('message:delete', ({ messageId, conversationId }, ack) => {
    try {
      const msg = messageService.deleteMessage(messageId, userId);
      io.to(conversationId || msg.conversationId).emit('message:deleted', {
        messageId,
        conversationId: msg.conversationId,
      });
      if (typeof ack === 'function') ack({ ok: true });
    } catch (err) {
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
      socket.emit('error:app', { message: err.message });
    }
  });

  socket.on('message:read', ({ conversationId }) => {
    messageService.markRead(conversationId, userId);
    io.to(conversationId).emit('message:read', { conversationId, userId });
  });

  socket.on('typing:start', ({ conversationId }) => {
    socket.to(conversationId).emit('typing:start', { conversationId, userId });
  });

  socket.on('typing:stop', ({ conversationId }) => {
    socket.to(conversationId).emit('typing:stop', { conversationId, userId });
  });
}

module.exports = { registerChatHandlers, ensureAssistantUser, AI_ASSISTANT_ID };
