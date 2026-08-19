const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/conversationsController');
const msgCtrl = require('../controllers/messagesController');

router.get('/user/:userId', ctrl.listForUser);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.post('/:id/members', ctrl.addMember);
router.delete('/:id/members/:userId', ctrl.removeMember);
router.post('/:id/hide', ctrl.hideForUser);

// Nested message routes
router.get('/:id/messages', msgCtrl.listMessages);
router.get('/:id/messages/search', msgCtrl.searchMessages);
router.get('/:id/summary', msgCtrl.summarizeConversation);

module.exports = router;
