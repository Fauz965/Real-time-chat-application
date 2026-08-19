-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  status TEXT NOT NULL DEFAULT 'offline',
  lastSeen TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Conversations (type = 'private' | 'group')
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('private','group')),
  name TEXT,
  createdBy TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (createdBy) REFERENCES users(id)
);

-- Conversation members
CREATE TABLE IF NOT EXISTS conversation_members (
  conversationId TEXT NOT NULL,
  userId TEXT NOT NULL,
  joinedAt TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (conversationId, userId),
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Hidden/closed conversations per-user (soft "delete conversation from my list")
CREATE TABLE IF NOT EXISTS conversation_hidden (
  conversationId TEXT NOT NULL,
  userId TEXT NOT NULL,
  hiddenAt TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (conversationId, userId)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  senderId TEXT NOT NULL,
  content TEXT NOT NULL,
  messageType TEXT NOT NULL DEFAULT 'text',
  status TEXT NOT NULL DEFAULT 'sent',
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  deleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (senderId) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversationId, timestamp);
CREATE INDEX IF NOT EXISTS idx_members_user ON conversation_members(userId);
