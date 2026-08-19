// Resolve the backend URL automatically from whatever host the page was
// loaded from. This means the exact same build works from:
//   http://localhost:5173        -> http://localhost:5000
//   http://192.168.1.23:5173     -> http://192.168.1.23:5000   (Android on same Wi-Fi)
// without editing any code. It can still be overridden with VITE_API_URL
// (e.g. in a .env file) if you need something different.
const explicit = import.meta.env.VITE_API_URL;

export const SERVER_URL =
  explicit && explicit.trim()
    ? explicit.trim()
    : `${window.location.protocol}//${window.location.hostname}:5000`;

export const API_BASE = `${SERVER_URL}/api`;
