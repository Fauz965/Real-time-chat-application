// Centralized error handler. Never leak raw DB/internal errors to the client.
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  if (status === 500) {
    // Log full detail server-side only.
    console.error('[ERROR]', err);
  }
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
