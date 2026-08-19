const userService = require('../services/userService');

function listUsers(req, res, next) {
  try {
    res.json(userService.listUsers());
  } catch (err) {
    next(err);
  }
}

function getUser(req, res, next) {
  try {
    const user = userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

function createUser(req, res, next) {
  try {
    const user = userService.createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

function updateUser(req, res, next) {
  try {
    const user = userService.updateUser(req.params.id, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, getUser, createUser, updateUser };
