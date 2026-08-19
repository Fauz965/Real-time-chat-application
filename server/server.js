const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

require('./db/database'); // ensures schema is initialized on boot

const usersRouter = require('./routes/users');
const conversationsRouter = require('./routes/conversations');
const errorHandler = require('./middleware/errorHandler');

const { registerPresenceHandlers } = require('./sockets/presenceSocket');
const { registerChatHandlers, ensureAssistantUser } = require('./sockets/chatSocket');
const { setIO } = require('./sockets/ioInstance');
const userService = require('./services/userService');

const PORT = process.env.PORT || 5000;

// Easy-to-change CORS origins: add your PC's LAN IP here for Android testing,
// e.g. 'http://192.168.1.23:5173'. See README "Android Testing" section.
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/users', usersRouter);
app.use('/api/conversations', conversationsRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
});

setIO(io);
ensureAssistantUser();

io.on('connection', (socket) => {
  // Client must identify itself immediately after connecting.
  // We never trust a client-provided userId for message authorship beyond
  // this handshake — every subsequent socket event uses socket.data.userId,
  // not anything passed in the event payload.
  const { userId } = socket.handshake.auth || {};

  if (!userId || !userService.getUserById(userId)) {
    socket.emit('error:app', { message: 'Invalid or missing user for socket connection' });
    socket.disconnect(true);
    return;
  }

  socket.data.userId = userId;
  socket.join(`user:${userId}`); // personal room, used for cross-device notifications

  registerPresenceHandlers(io, socket);
  registerChatHandlers(io, socket);

  socket.on('error', (err) => {
    console.error('[SOCKET ERROR]', err);
  });
});

server.listen(PORT, () => {
  console.log(`Chat server listening on http://localhost:${PORT}`);
  console.log(`Allowed client origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
