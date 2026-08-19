# Wire — Real-Time Chat Application

A full-stack, real-time chat application built with **React (Vite)**, **Node.js/Express**, **Socket.IO**, and **SQLite**. Built for one-to-one chat, group chat, and live presence, with real-time delivery over WebSockets — not polling or page refreshes.

---

## 1. Project Overview

Wire is a lightweight chat platform where users pick a display name (no password needed for this demo) and can:

- Message any other user one-to-one, or in a group
- See who's online/offline in real time
- See "X is typing…" while someone composes a message
- Delete messages they sent, with the deletion reflected instantly for everyone else viewing the conversation
- Start new chats or groups without a page refresh
- Search within a conversation
- Get a rule-based conversation summary and chat with a lightweight rule-based AI assistant

---

## 2. Features

**Core**
- One-to-one chat with duplicate-conversation prevention (re-opens the existing thread instead of creating a second one)
- Group chat (create group, name it, pick members, see member list)
- Real-time online/offline presence, backed by the server/socket layer (not just local UI state)
- Create New Chat (search/browse users → start conversation)
- Delete Message (sender-only, confirmed, real-time removal for all viewers)
- Close/remove a conversation from your own list without deleting the other participant's copy of it

**Bonus**
- Rule-based AI Assistant conversation (no API key, no paid service — see §13)
- Rule-based "Summarize Chat" button (see §14)

**Supporting**
- Typing indicators
- Message read status (sent/read)
- In-conversation message search
- WebSocket reconnection handling with a visible connection banner
- Friendly error handling (no raw stack traces reach the UI)

---

## 3. Technology Stack

| Layer | Tech |
|---|---|
| Frontend | React (JSX), Vite, plain CSS |
| Backend | Node.js, Express |
| Real-time | Socket.IO |
| Database | SQLite via `better-sqlite3` |
| Dev tools | npm, VS Code, Git |

No Docker, no heavy infra — everything runs with `npm install && npm run dev` on Windows.

---

## 4. Architecture

```
React Frontend  →  REST API  →  Express  →  SQLite   (message history, CRUD)
React Frontend  ↔  Socket.IO  ↔  Express            (live messages, presence, typing)
```

**REST is for historical/at-rest data** (user list, conversation list, message history, search, summary).
**WebSockets are for real-time events** (new messages, deletions, presence changes, typing indicators). Sending a message is done primarily over the socket (`message:send`), not REST, per the assignment's emphasis on demonstrating actual WebSocket communication.

### Backend layering

```
Routes → Controllers → Services → Database
Socket Events → Socket Handlers → Services → Database
```

`server/services/*` hold all business logic and SQL. Both the REST controllers and the socket handlers call into the same services, so there's one source of truth for "how a message gets created" or "how a conversation gets created," and REST/socket layers stay thin.

```
server/
├── server.js               # wiring: express app, http server, socket.io, CORS
├── sockets/
│   ├── chatSocket.js        # message send/delete/read, typing, AI assistant trigger
│   ├── presenceSocket.js    # online/offline tracking + broadcast
│   └── ioInstance.js        # lets REST controllers emit socket events too
├── routes/
│   ├── users.js
│   └── conversations.js     # also hosts nested /:id/messages, /:id/messages/search, /:id/summary
├── controllers/
├── services/
│   ├── userService.js
│   ├── conversationService.js
│   ├── messageService.js
│   ├── aiService.js         # rule-based assistant, swappable for a real LLM later
│   └── summaryService.js    # rule-based summarizer, swappable for a real LLM later
├── db/
│   ├── database.js
│   └── schema.sql
└── middleware/
    └── errorHandler.js
```

> **Note on routing structure:** the assignment sketch listed a separate `routes/messages.js`. Since every message endpoint is scoped to a conversation (`/api/conversations/:id/messages...`), those routes are nested inside `routes/conversations.js` instead — this avoids an awkward `/:userId` vs `/:id` route collision and keeps the REST surface RESTful. The controller logic still lives in its own `controllers/messagesController.js`.

---

## 5. Database Schema

```sql
users (id, name, avatar, status, lastSeen, createdAt)
conversations (id, type['private'|'group'], name, createdBy, createdAt)
conversation_members (conversationId, userId, joinedAt)
conversation_hidden (conversationId, userId, hiddenAt)   -- per-user "closed" conversations
messages (id, conversationId, senderId, content, messageType, status, timestamp, deleted)
```

- `conversation_members` is a proper join table (no JSON blobs) — supports both private (2 members) and group (N members) conversations uniformly.
- `conversation_hidden` implements "delete/close a conversation from your list" without touching the other participant's copy or the underlying messages — matching the assignment's requirement not to delete the other participant's data.
- `messages.deleted` is a soft-delete flag. All read paths (`GET .../messages`, search, summary) filter `deleted = 0`, so a deleted message never reappears — this is what "handle it consistently" means here: one flag, checked everywhere, rather than deleting rows and risking dangling references from open sockets.
- All queries use parameterized statements (`better-sqlite3` prepared statements) — no string-concatenated SQL anywhere.

---

## 6. REST API

### Users
```
GET    /api/users
GET    /api/users/:id
POST   /api/users                body: { name, avatar? }
PUT    /api/users/:id            body: { name?, avatar? }
```

### Conversations
```
GET    /api/conversations/user/:userId        list conversations for a user
GET    /api/conversations/:id?userId=...      conversation detail (membership-checked)
POST   /api/conversations                     body: { type: 'private'|'group', userId, targetUserId? , name?, memberIds? }
POST   /api/conversations/:id/members         body: { userId }
DELETE /api/conversations/:id/members/:userId
POST   /api/conversations/:id/hide            body: { userId }   -- removes from that user's list only
```

### Messages (nested under conversations)
```
GET /api/conversations/:id/messages?userId=...
GET /api/conversations/:id/messages/search?userId=...&q=keyword
GET /api/conversations/:id/summary?userId=...
```

All conversation/message endpoints validate that `userId` is actually a member of the conversation before returning data (403 otherwise).

---

## 7. WebSocket Events

Client authenticates the socket connection itself via `io(url, { auth: { userId } })`. The server validates that user id against the database at connection time and disconnects invalid sockets — **every subsequent event uses `socket.data.userId` from that handshake, never a client-supplied id in the payload**, so one user can't impersonate another over the socket.

```
conversation:join     client → server   join a conversation's room
conversation:leave    client → server   leave a conversation's room
conversation:new      server → client   a new conversation was created that includes you

message:send           client → server  { conversationId, content } (ack callback with the saved message)
message:receive         server → client  the persisted message, broadcast to the conversation room
message:delete          client → server  { messageId, conversationId } (ack callback)
message:deleted          server → client  { messageId, conversationId }
message:read            client → server  { conversationId }
message:read             server → client  { conversationId, userId }

typing:start / typing:stop   both directions, conversation-scoped, never persisted to the DB

presence:update           server → client  { userId, status, lastSeen }  (broadcast globally)

error:app                 server → client  { message }  friendly, non-crashing error surface
```

---

## 8. Project Structure

```
real-time-chat/
├── client/          React + Vite frontend
│   └── src/
│       ├── components/   Sidebar, ChatWindow, MessageBubble, modals, etc.
│       ├── context/      UserContext (identity), SocketContext (connection/presence/typing)
│       ├── hooks/        useConversations, useMessages
│       ├── pages/        Login, ChatPage
│       └── services/     api.js (REST), socket.js (Socket.IO), config.js (URL resolution)
├── server/          Node/Express/Socket.IO backend (see §4 for full tree)
├── README.md
└── .gitignore
```

---

## 9. Installation & Running

Requires **Node.js 18+** and npm.

### Backend
```bash
cd server
npm install
npm run dev
```
Starts on **http://localhost:5000**. The SQLite file is created automatically at `server/db/chat.db` on first run — no manual setup.

### Frontend
```bash
cd client
npm install
npm run dev
```
Starts on **http://localhost:5173** (Vite dev server, bound to all interfaces via `--host` so it's reachable from your phone too).

Open **http://localhost:5173** in two different browser windows (or one normal + one incognito) to simulate two users chatting with each other.

---

## 10. Android Testing (same Wi-Fi)

The frontend automatically points itself at whatever host you loaded the page from — see `client/src/services/config.js`. So:

1. Find your Windows PC's LAN IP (`ipconfig`, e.g. `192.168.1.23`).
2. Make sure your phone is on the **same Wi-Fi network**.
3. On your PC, run both servers as in §9 (Vite is already started with `--host`, so it listens on the LAN).
4. On the backend, either leave `CLIENT_ORIGINS` as-is for local-only testing, or set it before starting the server so CORS allows your phone's requests:
   ```bash
   # Windows PowerShell
   $env:CLIENT_ORIGINS="http://localhost:5173,http://192.168.1.23:5173"
   npm run dev
   ```
5. On your Android phone's browser, go to `http://192.168.1.23:5173` (your PC's IP, **not** `localhost` — the phone's `localhost` refers to the phone itself, not your PC).
6. The frontend will automatically call the backend at `http://192.168.1.23:5000` because it derives the API host from the page's own URL.

---

## 11. AI Assistant Implementation

`server/services/aiService.js` exports `getAssistantReply(message)` — a small rule/pattern-matching function (greetings, "help", productivity tips, jokes, time/date, etc., with a friendly fallback). There's a seeded `AI Assistant` user (`id: 'ai-assistant'`) that anyone can start a private conversation with; when a message is sent into a conversation containing that user, `chatSocket.js` calls the service and emits its reply as a normal message a moment later.

This is intentionally behind a single-function interface with no dependency on Socket.IO or Express, so swapping in a real LLM call later (e.g. the Anthropic API) means changing the body of `getAssistantReply` only — no other file needs to change. No API keys or paid services are required to run the project as-is.

---

## 12. Message Summarization Implementation

`server/services/summaryService.js` exports `summarizeMessages(messages, options)` — pulls recurring keywords across the conversation, filters out short filler messages, and surfaces a handful of the more substantial ones plus who sent the last message. It returns a plain array of bullet strings, rendered in `SummaryModal.jsx` behind the "✦ Summarize" button in the chat header.

Same pattern as the AI assistant: this is a pure function with no framework dependencies, so it can be replaced with a real LLM summarization call later without touching the REST layer or the UI.

---

## 13. Known Limitations

- **Identity, not authentication.** Anyone can pick any display name; there's no password or session token. The data model (users table, socket handshake) is structured so real auth (e.g. sessions or JWTs validated at the socket handshake) can be layered on without restructuring the chat/message architecture.
- **Message history pagination** exists at the API level (`before` cursor param) but the UI currently just loads the most recent 100 messages; older history isn't paged in via infinite scroll.
- **Read receipts** are conversation-wide ("has anyone read past this point") rather than per-message, per-recipient — sufficient for demonstrating the pattern without over-building it.
- **The AI assistant and summarizer are rule-based**, by design, per the assignment's constraint of no paid APIs/keys — both are structured to be swapped for a real LLM later (see §11–12).
- **SQLite** is intentionally used for lightweight local persistence; it isn't intended to scale to concurrent production load.

---

## 14. Testing Performed

The following were manually verified against the running backend before the frontend was built on top of it:

- ✅ REST: create users, create a private conversation, **duplicate creation correctly reuses the existing conversation** instead of making a second one
- ✅ Socket.IO: message sent by User A is received by User B **in real time**, without any polling — confirmed via a live two-socket test script
- ✅ Presence: connecting a socket triggers a `presence:update` broadcast (`online`); the same happens on disconnect (`offline`)
- ✅ Message deletion: the sender can delete their own message and it's removed in real time for other connected viewers (`message:deleted` broadcast)
- ✅ Authorization: a user attempting to delete **another user's** message is correctly rejected (`403`-equivalent error via the socket ack)
- ✅ Frontend production build (`npm run build`) compiles cleanly with no errors

Recommended manual pass once you have the app running with two browser windows:
1. Two users message each other — confirm instant delivery both directions.
2. Create a group with 3+ users, send a message, confirm all online members receive it.
3. Watch the presence dot flip live as a user closes/reopens their tab.
4. Delete a message you sent — confirm it disappears for the other party without a refresh.
5. Kill the backend process mid-session — confirm the "Disconnected, trying to reconnect…" banner appears, then restart the backend and confirm it reconnects automatically.
6. Restart the backend and confirm prior messages are still there (SQLite persistence).
7. Load the frontend from your Android phone via the PC's LAN IP and repeat basic messaging.

---

## 15. REST vs WebSocket — the short version

- **REST API** → fetching things that already happened: your conversation list, message history when you open a chat, search results, the AI summary. Stateless request/response.
- **WebSocket (Socket.IO)** → things happening *right now*: a message arriving, someone typing, someone coming online, a message being deleted while you're looking at the thread. Persistent, bidirectional connection — this is what makes the app "real-time" instead of "refresh to see updates."
