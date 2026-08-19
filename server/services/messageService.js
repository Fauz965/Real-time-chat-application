const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { isMember } = require('./conversationService');

function getMessageById(id) {
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
}

function listMessages(conversationId, { limit = 100, before } = {}) {
  if (before) {
    return db
      .prepare(
        `SELECT * FROM messages WHERE conversationId = ? AND deleted = 0 AND timestamp < ?
         ORDER BY timestamp DESC LIMIT ?`
      )
      .all(conversationId, before, limit)
      .reverse();
  }
  return db
    .prepare(
      `SELECT * FROM messages WHERE conversationId = ? AND deleted = 0
       ORDER BY timestamp DESC LIMIT ?`
    )
    .all(conversationId, limit)
    .reverse();
}

function createMessage({ conversationId, senderId, content, messageType = 'text' }) {
  if (!isMember(conversationId, senderId)) {
    const err = new Error('You are not a member of this conversation');
    err.status = 403;
    throw err;
  }
  const trimmed = (content || '').trim();
  if (!trimmed) {
    const err = new Error('Message content cannot be empty');
    err.status = 400;
    throw err;
  }
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  db.prepare(
    `INSERT INTO messages (id, conversationId, senderId, content, messageType, status, timestamp)
     VALUES (?, ?, ?, ?, ?, 'sent', ?)`
  ).run(id, conversationId, senderId, trimmed, messageType, timestamp);
  return getMessageById(id);
}

function deleteMessage(messageId, requesterId) {
  const msg = getMessageById(messageId);
  if (!msg) {
    const err = new Error('Message not found');
    err.status = 404;
    throw err;
  }
  if (msg.senderId !== requesterId) {
    const err = new Error('You can only delete your own messages');
    err.status = 403;
    throw err;
  }
  db.prepare('UPDATE messages SET deleted = 1 WHERE id = ?').run(messageId);
  return msg;
}

function markRead(conversationId, userId) {
  db.prepare(
    `UPDATE messages SET status = 'read'
     WHERE conversationId = ? AND senderId != ? AND status != 'read' AND deleted = 0`
  ).run(conversationId, userId);
}

function searchMessages(conversationId, query) {
  const q = `%${query}%`;
  return db
    .prepare(
      `SELECT * FROM messages WHERE conversationId = ? AND deleted = 0 AND content LIKE ?
       ORDER BY timestamp DESC LIMIT 50`
    )
    .all(conversationId, q);
}

module.exports = {
  getMessageById,
  listMessages,
  createMessage,
  deleteMessage,
  markRead,
  searchMessages,
};
