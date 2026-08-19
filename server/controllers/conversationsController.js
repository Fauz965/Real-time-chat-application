const conversationService = require('../services/conversationService');
const { getIO } = require('../sockets/ioInstance');

function notifyMembersOfNewConversation(conv) {
  const io = getIO();
  if (!io) return;
  const memberIds = conv.members.map((m) => m.id);
  for (const uid of memberIds) {
    io.to(`user:${uid}`).emit('conversation:new', conv);
  }
}

function listForUser(req, res, next) {
  try {
    res.json(conversationService.listConversationsForUser(req.params.userId));
  } catch (err) {
    next(err);
  }
}

function getOne(req, res, next) {
  try {
    const userId = req.query.userId;
    const conv = conversationService.getConversationDetail(req.params.id, userId);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (userId && !conversationService.isMember(req.params.id, userId)) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }
    res.json(conv);
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const { type, userId, targetUserId, name, memberIds } = req.body;
    if (type === 'group') {
      const conv = conversationService.createGroupConversation({
        name,
        createdBy: userId,
        memberIds,
      });
      const detail = conversationService.getConversationDetail(conv.id, userId);
      notifyMembersOfNewConversation(detail);
      return res.status(201).json({ conversation: detail, created: true });
    }
    // default: private
    const result = conversationService.createPrivateConversation(userId, targetUserId);
    const detail = conversationService.getConversationDetail(result.conversation.id, userId);
    if (result.created) notifyMembersOfNewConversation(detail);
    res.status(result.created ? 201 : 200).json({ conversation: detail, created: result.created });
  } catch (err) {
    next(err);
  }
}

function addMember(req, res, next) {
  try {
    const conv = conversationService.addMember(req.params.id, req.body.userId);
    res.json(conv);
  } catch (err) {
    next(err);
  }
}

function removeMember(req, res, next) {
  try {
    conversationService.removeMember(req.params.id, req.params.userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

function hideForUser(req, res, next) {
  try {
    conversationService.hideConversationForUser(req.params.id, req.body.userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listForUser, getOne, create, addMember, removeMember, hideForUser };
