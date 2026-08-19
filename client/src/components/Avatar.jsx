import React from 'react';

const PALETTE = ['#7c5cfc', '#34d399', '#ff6b5d', '#f5a623', '#4fb0ff', '#ff7ab8'];

function colorForId(id = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function Avatar({ id, name = '?', src, size = 40, presenceStatus }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="avatar" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} style={{ width: size, height: size }} />
      ) : (
        <div
          className="avatar__fallback"
          style={{ width: size, height: size, background: colorForId(id || name), fontSize: size * 0.4 }}
        >
          {initials}
        </div>
      )}
      {presenceStatus && (
        <span className={`avatar__dot avatar__dot--${presenceStatus === 'online' ? 'online' : 'offline'}`} />
      )}
    </div>
  );
}
