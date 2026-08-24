import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null);   // student / admin
  const [agent, setAgent] = useState(null);   // dalali
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('geto_token');
    const stored = localStorage.getItem('geto_user');
    const storedAgent = localStorage.getItem('geto_agent');
    if (token && stored)      setUser(JSON.parse(stored));
    if (token && storedAgent) setAgent(JSON.parse(storedAgent));
    setLoading(false);
  }, []);

  const loginUser = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('geto_token', data.token);
    localStorage.setItem('geto_user', JSON.stringify(data.user));
    localStorage.removeItem('geto_agent');
    setUser(data.user);
    setAgent(null);
    return data.user;
  };

  const loginAgent = async (email, password) => {
    const { data } = await api.post('/auth/agent/login', { email, password });
    localStorage.setItem('geto_token', data.token);
    localStorage.setItem('geto_agent', JSON.stringify(data.agent));
    localStorage.removeItem('geto_user');
    setAgent(data.agent);
    setUser(null);
    return data.agent;
  };

  const registerUser = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('geto_token', data.token);
    localStorage.setItem('geto_user', JSON.stringify(data.user));
    setUser(data.user);
    setAgent(null);
    return data.user;
  };

  const registerAgent = async (payload) => {
    const { data } = await api.post('/auth/agent/register', payload);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('geto_token');
    localStorage.removeItem('geto_user');
    localStorage.removeItem('geto_agent');
    setUser(null);
    setAgent(null);
  };

  const isAdmin  = user?.role === 'admin';
  const isAgent  = !!agent;
  const isStudent = user?.role === 'student';
  const isLoggedIn = !!user || !!agent;

  return (
    <AuthContext.Provider value={{ user, agent, loading, isAdmin, isAgent, isStudent, isLoggedIn, loginUser, loginAgent, registerUser, registerAgent, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
