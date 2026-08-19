const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

function listUsers() {
  return db.prepare('SELECT id, name, avatar, status, lastSeen, createdAt FROM users ORDER BY name ASC').all();
}

function getUserById(id) {
  return db.prepare('SELECT id, name, avatar, status, lastSeen, createdAt FROM users WHERE id = ?').get(id);
}

function createUser({ name, avatar }) {
  if (!name || !name.trim()) {
    const err = new Error('Name is required');
    err.status = 400;
    throw err;
  }
  const id = uuidv4();
  db.prepare(
    'INSERT INTO users (id, name, avatar, status, lastSeen) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name.trim(), avatar || null, 'offline', new Date().toISOString());
  return getUserById(id);
}

function updateUser(id, { name, avatar }) {
  const existing = getUserById(id);
  if (!existing) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  db.prepare('UPDATE users SET name = COALESCE(?, name), avatar = COALESCE(?, avatar) WHERE id = ?')
    .run(name || null, avatar || null, id);
  return getUserById(id);
}

function setUserStatus(id, status) {
  const lastSeen = new Date().toISOString();
  db.prepare('UPDATE users SET status = ?, lastSeen = ? WHERE id = ?').run(status, lastSeen, id);
  return getUserById(id);
}

module.exports = { listUsers, getUserById, createUser, updateUser, setUserStatus };
