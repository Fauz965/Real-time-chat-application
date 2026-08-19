import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import Avatar from './Avatar';

export default function NewChatModal({ onClose, onCreated }) {
  const { user } = useUser();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .listUsers()
      .then((list) => setUsers(list.filter((u) => u.id !== user.id && u.id !== 'ai-assistant')))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(
    () => users.filter((u) => u.name.toLowerCase().includes(query.trim().toLowerCase())),
    [users, query]
  );

  async function handleSelect(targetUser) {
    setCreatingId(targetUser.id);
    setError(null);
    try {
      const { conversation } = await api.createPrivateConversation(user.id, targetUser.id);
      onCreated(conversation);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingId(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>New chat</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <input
          className="modal__search"
          autoFocus
          placeholder="Search people…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {error && <div className="modal__error">{error}</div>}
        <div className="modal__list">
          {loading && <div className="modal__empty">Loading people…</div>}
          {!loading && filtered.length === 0 && <div className="modal__empty">No users found.</div>}
          {filtered.map((u) => (
            <button key={u.id} className="modal__row" onClick={() => handleSelect(u)} disabled={creatingId === u.id}>
              <Avatar id={u.id} name={u.name} presenceStatus={u.status} />
              <div className="modal__row-text">
                <div className="modal__row-name">{u.name}</div>
                <div className="modal__row-sub">{u.status === 'online' ? 'Online' : 'Offline'}</div>
              </div>
              {creatingId === u.id && <span className="modal__row-loading">Opening…</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
