import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';

export default function SummaryModal({ conversationId, onClose }) {
  const { user } = useUser();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .summarizeConversation(conversationId, user.id)
      .then((res) => setSummary(res.summary))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [conversationId, user]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--summary" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Conversation summary</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {loading && <div className="modal__empty">Summarizing…</div>}
        {error && <div className="modal__error">{error}</div>}
        {summary && (
          <ul className="summary-list">
            {summary.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
