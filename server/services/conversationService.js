const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

function isMember(conversationId, userId) {
  const row = db
    .prepare('SELECT 1 FROM conversation_members WHERE conversationId = ? AND userId = ?')
    .get(conversationId, userId);
  return !!row;
}

function getConversationById(id) {
  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
}

function getMembers(conversationId) {
  return db
    .prepare(
      `SELECT u.id, u.name, u.avatar, u.status, u.lastSeen
       FROM conversation_members cm
       JOIN users u ON u.id = cm.userId
       WHERE cm.conversationId = ?`
    )
    .all(conversationId);
}

function getLastMessage(conversationId) {
  return db
    .prepare(
      `SELECT * FROM messages WHERE conversationId = ? AND deleted = 0
       ORDER BY timestamp DESC LIMIT 1`
    )
    .get(conversationId);
}

function decorate(conv, userId) {
  const members = getMembers(conv.id);
  const lastMessage = getLastMessage(conv.id);
  let displayName = conv.name;
  let displayAvatar = null;
  if (conv.type === 'private') {
    const other = members.find((m) => m.id !== userId);
    displayName = other ? other.name : 'Unknown user';
    displayAvatar = other ? other.avatar : null;
  }
  return { ...conv, members, lastMessage, displayName, displayAvatar };
}

// List conversations for a user (excludes ones the user hid)
function listConversationsForUser(userId) {
  const rows = db
    .prepare(
      `SELECT c.* FROM conversations c
       JOIN conversation_members cm ON cm.conversationId = c.id
       WHERE cm.userId = ?
       AND c.id NOT IN (SELECT conversationId FROM conversation_hidden WHERE userId = ?)`
    )
    .all(userId, userId);

  const decorated = rows.map((c) => decorate(c, userId));
  decorated.sort((a, b) => {
    const at = a.lastMessage ? a.lastMessage.timestamp : a.createdAt;
    const bt = b.lastMessage ? b.lastMessage.timestamp : b.createdAt;
    return new Date(bt) - new Date(at);
  });
  return decorated;
}

function getConversationDetail(id, userId) {
  const conv = getConversationById(id);
  if (!conv) return null;
  return decorate(conv, userId);
}

// Find existing private conversation between two users, if any
function findPrivateConversation(userA, userB) {
  const row = db
    .prepare(
      `SELECT c.id FROM conversations c
       WHERE c.type = 'private'
       AND EXISTS (SELECT 1 FROM conversation_members WHERE conversationId = c.id AND userId = ?)
       AND EXISTS (SELECT 1 FROM conversation_members WHERE conversationId = c.id AND userId = ?)
       AND (SELECT COUNT(*) FROM conversation_members WHERE conversationId = c.id) = 2`
    )
    .get(userA, userB);
  return row ? getConversationById(row.id) : null;
}

function createPrivateConversation(userA, userB) {
  if (userA === userB) {
    const err = new Error('Cannot create a conversation with yourself');
    err.status = 400;
    throw err;
  }
  const existing = findPrivateConversation(userA, userB);
  if (existing) {
    // unhide for the requesting user if it was previously closed
    db.prepare('DELETE FROM conversation_hidden WHERE conversationId = ? AND userId = ?').run(
      existing.id,
      userA
    );
    return { conversation: existing, created: false };
  }

  const id = uuidv4();
  const insertConv = db.prepare(
    'INSERT INTO conversations (id, type, name, createdBy) VALUES (?, ?, ?, ?)'
  );
  const insertMember = db.prepare(
    'INSERT INTO conversation_members (conversationId, userId) VALUES (?, ?)'
  );

  const tx = db.transaction(() => {
    insertConv.run(id, 'private', null, userA);
    insertMember.run(id, userA);
    insertMember.run(id, userB);
  });
  tx();

  return { conversation: getConversationById(id), created: true };
}

function createGroupConversation({ name, createdBy, memberIds }) {
  if (!name || !name.trim()) {
    const err = new Error('Group name is required');
    err.status = 400;
    throw err;
  }
  const allMembers = Array.from(new Set([createdBy, ...(memberIds || [])]));
  if (allMembers.length < 2) {
    const err = new Error('A group requires at least 2 members');
    err.status = 400;
    throw err;
  }

  const id = uuidv4();
  const insertConv = db.prepare(
    'INSERT INTO conversations (id, type, name, createdBy) VALUES (?, ?, ?, ?)'
  );
  const insertMember = db.prepare(
    'INSERT INTO conversation_members (conversationId, userId) VALUES (?, ?)'
  );

  const tx = db.transaction(() => {
    insertConv.run(id, 'group', name.trim(), createdBy);
    for (const uid of allMembers) insertMember.run(id, uid);
  });
  tx();

  return getConversationById(id);
}

function addMember(conversationId, userId) {
  const conv = getConversationById(conversationId);
  if (!conv) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }
  db.prepare(
    'INSERT OR IGNORE INTO conversation_members (conversationId, userId) VALUES (?, ?)'
  ).run(conversationId, userId);
  return getConversationDetail(conversationId, userId);
}

function removeMember(conversationId, userId) {
  db.prepare('DELETE FROM conversation_members WHERE conversationId = ? AND userId = ?').run(
    conversationId,
    userId
  );
}

// "Delete"/close a conversation from a user's own list without deleting messages
// or removing it for the other participant(s).
function hideConversationForUser(conversationId, userId) {
  const conv = getConversationById(conversationId);
  if (!conv) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }
  db.prepare(
    'INSERT OR IGNORE INTO conversation_hidden (conversationId, userId) VALUES (?, ?)'
  ).run(conversationId, userId);
}

module.exports = {
  isMember,
  getConversationById,
  getConversationDetail,
  getMembers,
  listConversationsForUser,
  createPrivateConversation,
  createGroupConversation,
  addMember,
  removeMember,
  hideConversationForUser,
};
