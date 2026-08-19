import { API_BASE } from './config';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (networkErr) {
    const err = new Error('Cannot reach the server. Check your connection and that the backend is running.');
    err.isNetworkError = true;
    throw err;
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // Users
  listUsers: () => request('/users'),
  getUser: (id) => request(`/users/${id}`),
  createUser: (payload) => request('/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id, payload) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Conversations
  listConversations: (userId) => request(`/conversations/user/${userId}`),
  getConversation: (id, userId) => request(`/conversations/${id}?userId=${userId}`),
  createPrivateConversation: (userId, targetUserId) =>
    request('/conversations', { method: 'POST', body: JSON.stringify({ type: 'private', userId, targetUserId }) }),
  createGroupConversation: (userId, name, memberIds) =>
    request('/conversations', {
      method: 'POST',
      body: JSON.stringify({ type: 'group', userId, name, memberIds }),
    }),
  hideConversation: (id, userId) =>
    request(`/conversations/${id}/hide`, { method: 'POST', body: JSON.stringify({ userId }) }),

  // Messages
  listMessages: (conversationId, userId) => request(`/conversations/${conversationId}/messages?userId=${userId}`),
  searchMessages: (conversationId, userId, q) =>
    request(`/conversations/${conversationId}/messages/search?userId=${userId}&q=${encodeURIComponent(q)}`),
  summarizeConversation: (conversationId, userId) =>
    request(`/conversations/${conversationId}/summary?userId=${userId}`),
};
