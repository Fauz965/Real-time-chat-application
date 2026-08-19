import React, { useEffect, useMemo, useRef, useState } from 'react';
import Avatar from './Avatar';
import PresenceLabel from './PresenceLabel';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import SummaryModal from './SummaryModal';
import { useUser } from '../context/UserContext';
import { useSocketContext } from '../context/SocketContext';
import { useMessages } from '../hooks/useMessages';
import { api } from '../services/api';
import { formatDayLabel } from '../utils/time';

function groupByDay(messages) {
  const groups = [];
  let currentDay = null;
  let currentList = null;
  for (const m of messages) {
    const day = new Date(m.timestamp).toDateString();
    if (day !== currentDay) {
      currentDay = day;
      currentList = [];
      groups.push({ day, label: formatDayLabel(m.timestamp), messages: currentList });
    }
    currentList.push(m);
  }
  return groups;
}

export default function ChatWindow({ conversation, onBack, onClosed }) {
  const { user } = useUser();
  const { presence, typingByConversation } = useSocketContext();
  const { messages, loading, error, sendMessage, deleteMessage } = useMessages(conversation.id);
  const [showSummary, setShowSummary] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const scrollRef = useRef(null);

  const isGroup = conversation.type === 'group';
  const otherMember = !isGroup ? conversation.members.find((m) => m.id !== user.id) : null;
  const liveStatus = otherMember ? presence[otherMember.id] : null;
  const status = liveStatus ? liveStatus.status : otherMember?.status;
  const lastSeen = liveStatus ? liveStatus.lastSeen : otherMember?.lastSeen;

  const typingUserIds = Array.from(typingByConversation[conversation.id] || []);
  const typingNames = typingUserIds
    .map((id) => conversation.members.find((m) => m.id === id)?.name)
    .filter(Boolean);

  const memberNameById = useMemo(() => {
    const map = {};
    for (const m of conversation.members) map[m.id] = m.name;
    return map;
  }, [conversation.members]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function handleSend(content) {
    await sendMessage(content);
  }

  async function handleDelete(messageId) {
    await deleteMessage(messageId);
  }

  async function handleCloseConversation() {
    if (!window.confirm('Remove this conversation from your list? Messages will still exist for the other participant(s).')) return;
    await api.hideConversation(conversation.id, user.id);
    onClosed(conversation.id);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const results = await api.searchMessages(conversation.id, user.id, searchQuery.trim());
    setSearchResults(results);
  }

  const dayGroups = groupByDay(messages);

  return (
    <div className="chat-window">
      <div className="chat-window__header">
        <button className="icon-btn chat-window__back" onClick={onBack} aria-label="Back">←</button>
        <Avatar
          id={isGroup ? conversation.id : otherMember?.id}
          name={conversation.displayName}
          presenceStatus={!isGroup ? status : undefined}
        />
        <div className="chat-window__header-text">
          <div className="chat-window__title">{isGroup ? conversation.displayName : conversation.displayName}</div>
          {isGroup ? (
            <div className="chat-window__subtitle">{conversation.members.length} members</div>
          ) : (
            <PresenceLabel status={status} lastSeen={lastSeen} />
          )}
        </div>
        <div className="chat-window__header-actions">
          <button className="icon-btn" title="Search in conversation" onClick={() => setSearchOpen((v) => !v)}>🔍</button>
          <button className="icon-btn" title="Summarize chat" onClick={() => setShowSummary(true)}>✦</button>
          <button className="icon-btn" title="Close conversation" onClick={handleCloseConversation}>✕</button>
        </div>
      </div>

      {searchOpen && (
        <form className="chat-window__search" onSubmit={handleSearch}>
          <input
            autoFocus
            placeholder="Search messages…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchResults !== null && (
            <span className="chat-window__search-count">{searchResults.length} result(s)</span>
          )}
        </form>
      )}

      {searchOpen && searchResults !== null ? (
        <div className="chat-window__messages">
          {searchResults.length === 0 && <div className="chat-window__empty">No matches.</div>}
          {searchResults.map((m) => (
            <div key={m.id} className="search-result">
              <span className="search-result__sender">{memberNameById[m.senderId] || 'Unknown'}:</span> {m.content}
            </div>
          ))}
        </div>
      ) : (
        <div className="chat-window__messages" ref={scrollRef}>
          {loading && <div className="chat-window__empty">Loading messages…</div>}
          {error && <div className="chat-window__empty chat-window__empty--error">{error}</div>}
          {!loading && messages.length === 0 && (
            <div className="chat-window__empty">No messages yet. Say hello 👋</div>
          )}
          {dayGroups.map((group) => (
            <div key={group.day}>
              <div className="day-divider"><span>{group.label}</span></div>
              {group.messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isMine={m.senderId === user.id}
                  senderName={isGroup ? memberNameById[m.senderId] : null}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ))}
          <TypingIndicator names={typingNames} />
        </div>
      )}

      <MessageInput conversationId={conversation.id} onSend={handleSend} />

      {showSummary && <SummaryModal conversationId={conversation.id} onClose={() => setShowSummary(false)} />}
    </div>
  );
}
