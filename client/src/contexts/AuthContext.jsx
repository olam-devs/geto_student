import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('geto_token');
    const stored = localStorage.getItem('geto_user');
    if (token && stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const _saveSession = (token, userData) => {
    localStorage.setItem('geto_token', token);
    localStorage.setItem('geto_user', JSON.stringify(userData));
    setUser(userData);
  };

  // Frontend: student, property_owner, property_manager
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    _saveSession(data.token, data.user);
    return data.user;
  };

  // Backend: admin, zone_manager (used only from /admin page)
  const staffLogin = async (email, password) => {
    const { data } = await api.post('/auth/staff/login', { email, password });
    _saveSession(data.token, data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    if (data.token) _saveSession(data.token, data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('geto_token');
    localStorage.removeItem('geto_user');
    setUser(null);
  };

  const isAdmin       = user?.role === 'admin';
  const isZoneManager = user?.role === 'zone_manager';
  const isStaff       = isAdmin || isZoneManager;
  const isOwner       = user?.role === 'property_owner';
  const isManager     = user?.role === 'property_manager';
  const isStudent     = user?.role === 'student';
  const isLoggedIn    = !!user;

  return (
    <AuthContext.Provider value={{
      user, loading, isLoggedIn,
      isAdmin, isZoneManager, isStaff,
      isOwner, isManager, isStudent,
      login, staffLogin, register, logout,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
