// Small singleton so REST controllers (e.g. creating a conversation over
// HTTP) can also emit real-time events without circular requires of server.js.
let ioRef = null;

function setIO(io) {
  ioRef = io;
}

function getIO() {
  return ioRef;
}

module.exports = { setIO, getIO };
