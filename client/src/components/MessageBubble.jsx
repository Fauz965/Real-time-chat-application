import React, { useState } from 'react';
import { formatClockTime } from '../utils/time';

function StatusTicks({ status }) {
  if (status === 'read') return <span className="ticks ticks--read">✓✓</span>;
  if (status === 'delivered') return <span className="ticks">✓✓</span>;
  return <span className="ticks">✓</span>;
}

export default function MessageBubble({ message, isMine, senderName, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await onDelete(message.id);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div className={`bubble-row ${isMine ? 'bubble-row--mine' : ''}`}>
      <div className="bubble">
        {!isMine && senderName && <div className="bubble__sender">{senderName}</div>}
        <div className="bubble__content">{message.content}</div>
        <div className="bubble__meta">
          <span>{formatClockTime(message.timestamp)}</span>
          {isMine && <StatusTicks status={message.status} />}
        </div>

        {isMine && !confirming && (
          <button className="bubble__delete" title="Delete message" onClick={() => setConfirming(true)}>
            🗑
          </button>
        )}

        {confirming && (
          <div className="bubble__confirm">
            <span>Delete this message?</span>
            <button onClick={handleConfirmDelete} disabled={deleting} className="bubble__confirm-yes">
              {deleting ? '…' : 'Delete'}
            </button>
            <button onClick={() => setConfirming(false)} className="bubble__confirm-no">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
