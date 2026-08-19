import React from 'react';
import { useSocketContext } from '../context/SocketContext';

export default function ConnectionBanner() {
  const { connectionState } = useSocketContext();

  if (connectionState === 'connected') return null;

  const label =
    connectionState === 'reconnecting'
      ? 'Connection lost. Trying to reconnect…'
      : connectionState === 'disconnected'
      ? 'Disconnected. Trying to reconnect…'
      : 'Connecting…';

  return (
    <div className="connection-banner">
      <span className="connection-banner__dot" />
      {label}
    </div>
  );
}
