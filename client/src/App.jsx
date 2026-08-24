import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Browse from './pages/Browse';
import Auth from './pages/Auth';
import StudentDashboard from './pages/StudentDashboard';
import AgentPortal from './pages/AgentPortal';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedStudent({ children }) {
  const { isStudent } = useAuth();
  return isStudent ? children : <Navigate to="/auth" replace />;
}
function ProtectedAgent({ children }) {
  const { isAgent } = useAuth();
  return isAgent ? children : <Navigate to="/auth?tab=agent" replace />;
}
function ProtectedAdmin({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/auth" replace />;
}

function AppRoutes() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/"             element={<Home />} />
          <Route path="/browse"       element={<Browse />} />
          <Route path="/auth"         element={<Auth />} />
          <Route path="/dashboard"    element={<ProtectedStudent><StudentDashboard /></ProtectedStudent>} />
          <Route path="/agent"        element={<ProtectedAgent><AgentPortal /></ProtectedAgent>} />
          <Route path="/admin"        element={<ProtectedAdmin><AdminDashboard /></ProtectedAdmin>} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
