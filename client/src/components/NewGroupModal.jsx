import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import Avatar from './Avatar';

export default function NewGroupModal({ onClose, onCreated }) {
  const { user } = useUser();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .listUsers()
      .then((list) => setUsers(list.filter((u) => u.id !== user.id && u.id !== 'ai-assistant')))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (!groupName.trim() || selected.size === 0) return;
    setCreating(true);
    setError(null);
    try {
      const { conversation } = await api.createGroupConversation(user.id, groupName.trim(), Array.from(selected));
      onCreated(conversation);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>New group</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <input
          className="modal__search"
          autoFocus
          placeholder="Group name…"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          maxLength={50}
        />
        {error && <div className="modal__error">{error}</div>}
        <div className="modal__list">
          {loading && <div className="modal__empty">Loading people…</div>}
          {!loading && users.length === 0 && <div className="modal__empty">No other users yet.</div>}
          {users.map((u) => (
            <button key={u.id} className="modal__row" onClick={() => toggle(u.id)}>
              <Avatar id={u.id} name={u.name} presenceStatus={u.status} />
              <div className="modal__row-text">
                <div className="modal__row-name">{u.name}</div>
                <div className="modal__row-sub">{u.status === 'online' ? 'Online' : 'Offline'}</div>
              </div>
              <input type="checkbox" checked={selected.has(u.id)} readOnly />
            </button>
          ))}
        </div>
        <div className="modal__footer">
          <span className="modal__footer-hint">{selected.size} selected</span>
          <button
            className="btn btn--primary"
            onClick={handleCreate}
            disabled={creating || !groupName.trim() || selected.size === 0}
          >
            {creating ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </div>
    </div>
  );
}
