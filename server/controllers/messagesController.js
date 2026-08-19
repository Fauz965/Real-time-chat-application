const messageService = require('../services/messageService');
const conversationService = require('../services/conversationService');
const { summarizeMessages } = require('../services/summaryService');
const userService = require('../services/userService');

function listMessages(req, res, next) {
  try {
    const { userId, limit, before } = req.query;
    if (userId && !conversationService.isMember(req.params.id, userId)) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }
    res.json(messageService.listMessages(req.params.id, { limit: limit ? Number(limit) : 100, before }));
  } catch (err) {
    next(err);
  }
}

function searchMessages(req, res, next) {
  try {
    const { q, userId } = req.query;
    if (!q) return res.json([]);
    if (userId && !conversationService.isMember(req.params.id, userId)) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }
    res.json(messageService.searchMessages(req.params.id, q));
  } catch (err) {
    next(err);
  }
}

function summarizeConversation(req, res, next) {
  try {
    const { userId } = req.query;
    if (userId && !conversationService.isMember(req.params.id, userId)) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }
    const messages = messageService.listMessages(req.params.id, { limit: 500 });
    const members = conversationService.getMembers(req.params.id);
    const userNames = {};
    for (const m of members) userNames[m.id] = m.name;
    const bullets = summarizeMessages(messages, { userNames });
    res.json({ summary: bullets });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMessages, searchMessages, summarizeConversation };
