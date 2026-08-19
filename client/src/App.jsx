import React from 'react';
import { UserProvider, useUser } from './context/UserContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import ChatPage from './pages/ChatPage';
import './App.css';

function Gate() {
  const { user, loading } = useUser();

  if (loading) {
    return <div className="app-loading">Loading…</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <SocketProvider>
      <ChatPage />
    </SocketProvider>
  );
}

export default function App() {
  return (
    <UserProvider>
      <Gate />
    </UserProvider>
  );
}
