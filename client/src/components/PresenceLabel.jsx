import React from 'react';
import { formatLastSeen } from '../utils/time';

export default function PresenceLabel({ status, lastSeen }) {
  if (status === 'online') {
    return <span className="presence-label presence-label--online">● Online</span>;
  }
  return <span className="presence-label">Last seen {formatLastSeen(lastSeen)}</span>;
}
