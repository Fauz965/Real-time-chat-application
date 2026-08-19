const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/usersController');

router.get('/', ctrl.listUsers);
router.get('/:id', ctrl.getUser);
router.post('/', ctrl.createUser);
router.put('/:id', ctrl.updateUser);

module.exports = router;
