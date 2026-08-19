import React from 'react';

export default function TypingIndicator({ names }) {
  if (!names || names.length === 0) return null;
  const text =
    names.length === 1
      ? `${names[0]} is typing…`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing…`
      : `${names.length} people are typing…`;

  return (
    <div className="typing-indicator">
      <span className="typing-indicator__dots">
        <span /><span /><span />
      </span>
      {text}
    </div>
  );
}
