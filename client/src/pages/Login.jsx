import React, { useState } from 'react';
import { useUser } from '../context/UserContext';

export default function Login() {
  const { login } = useUser();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(name.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-card__mark">◆</div>
        <h1 className="login-card__title">Wire</h1>
        <p className="login-card__subtitle">Real-time messaging, one-to-one and in groups.</p>

        <form onSubmit={handleSubmit} className="login-card__form">
          <label htmlFor="display-name">Display name</label>
          <input
            id="display-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fauziyya"
            maxLength={40}
          />
          {error && <div className="login-card__error">{error}</div>}
          <button type="submit" className="btn btn--primary" disabled={submitting || !name.trim()}>
            {submitting ? 'Joining…' : 'Start chatting'}
          </button>
        </form>

        <p className="login-card__hint">
          No password needed for this demo — just pick a name to identify yourself to other users.
        </p>
      </div>
    </div>
  );
}
