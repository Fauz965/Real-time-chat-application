import React, { useState } from 'react';
import Avatar from './Avatar';
import PresenceLabel from './PresenceLabel';
import { useUser } from '../context/UserContext';
import { useSocketContext } from '../context/SocketContext';
import { formatClockTime } from '../utils/time';

function ConversationRow({ conv, active, onOpen, onClose, presence }) {
  const isGroup = conv.type === 'group';
  const otherMember = !isGroup ? conv.members.find((m) => m.id !== conv.__viewerId) : null;
  const live = otherMember ? presence[otherMember.id] : null;
  const status = live ? live.status : otherMember?.status;

  const preview = conv.lastMessage
    ? conv.lastMessage.deleted
      ? 'Message deleted'
      : conv.lastMessage.content
    : 'No messages yet';

  return (
    <div className={`conv-row ${active ? 'conv-row--active' : ''}`}>
      <button className="conv-row__main" onClick={() => onOpen(conv)}>
        <Avatar
          id={isGroup ? conv.id : otherMember?.id}
          name={conv.displayName || conv.name}
          presenceStatus={!isGroup ? status : undefined}
        />
        <div className="conv-row__text">
          <div className="conv-row__top">
            <span className="conv-row__name">{isGroup ? `# ${conv.displayName}` : conv.displayName}</span>
            {conv.lastMessage && <span className="conv-row__time">{formatClockTime(conv.lastMessage.timestamp)}</span>}
          </div>
          <div className="conv-row__preview">{preview}</div>
        </div>
      </button>
      <button className="conv-row__close" title="Remove from list" onClick={() => onClose(conv)}>
        ✕
      </button>
    </div>
  );
}

export default function Sidebar({
  conversations,
  loading,
  activeId,
  onOpenConversation,
  onCloseConversation,
  onNewChat,
  onNewGroup,
  mobileHidden,
}) {
  const { user, logout } = useUser();
  const { presence, connectionState } = useSocketContext();
  const [query, setQuery] = useState('');

  const decorated = conversations.map((c) => ({ ...c, __viewerId: user.id }));
  const filtered = decorated.filter((c) => (c.displayName || c.name || '').toLowerCase().includes(query.toLowerCase()));

  return (
    <aside className={`sidebar ${mobileHidden ? 'sidebar--mobile-hidden' : ''}`}>
      <div className="sidebar__header">
        <h1 className="sidebar__title">Wire</h1>
        <div className="sidebar__actions">
          <button className="icon-btn" title="New chat" onClick={onNewChat}>＋</button>
          <button className="icon-btn" title="New group" onClick={onNewGroup}>⚇</button>
        </div>
      </div>

      <input
        className="sidebar__search"
        placeholder="Search conversations…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="sidebar__list">
        {loading && <div className="sidebar__empty">Loading conversations…</div>}
        {!loading && filtered.length === 0 && (
          <div className="sidebar__empty">
            No conversations yet.
            <button className="link-btn" onClick={onNewChat}>Start one</button>
          </div>
        )}
        {filtered.map((conv) => (
          <ConversationRow
            key={conv.id}
            conv={conv}
            active={conv.id === activeId}
            onOpen={onOpenConversation}
            onClose={onCloseConversation}
            presence={presence}
          />
        ))}
      </div>

      <div className="sidebar__footer">
        <Avatar id={user.id} name={user.name} presenceStatus={connectionState === 'connected' ? 'online' : 'offline'} />
        <div className="sidebar__footer-text">
          <div className="sidebar__footer-name">{user.name}</div>
          <PresenceLabel status={connectionState === 'connected' ? 'online' : 'offline'} />
        </div>
        <button className="icon-btn" title="Log out" onClick={logout}>⎋</button>
      </div>
    </aside>
  );
}
