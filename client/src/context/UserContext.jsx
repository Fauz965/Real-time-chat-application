import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

const UserContext = createContext(null);
const STORAGE_KEY = 'chat_current_user_id';

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (!savedId) {
      setLoading(false);
      return;
    }
    api
      .getUser(savedId)
      .then((u) => setUser(u))
      .catch(() => localStorage.removeItem(STORAGE_KEY))
      .finally(() => setLoading(false));
  }, []);

  async function login(name, avatar) {
    const newUser = await api.createUser({ name, avatar });
    localStorage.setItem(STORAGE_KEY, newUser.id);
    setUser(newUser);
    return newUser;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  async function updateProfile(payload) {
    const updated = await api.updateUser(user.id, payload);
    setUser(updated);
    return updated;
  }

  return (
    <UserContext.Provider value={{ user, loading, login, logout, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
