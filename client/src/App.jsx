import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import InstallPrompt from './components/InstallPrompt';

const FindRoom     = lazy(() => import('./pages/FindRoom'));
const Auth         = lazy(() => import('./pages/Auth'));
const AdminPortal  = lazy(() => import('./pages/AdminPortal'));
const OwnerPortal  = lazy(() => import('./pages/OwnerPortal'));
const StudentDash  = lazy(() => import('./pages/StudentDashboard'));

function Loading() {
  return <div className="flex items-center justify-center min-h-[60vh] text-primary font-semibold">Inapakia...</div>;
}

// Redirect if already logged into the wrong area
function GuardStudent({ children }) {
  const { isLoggedIn, isStudent } = useAuth();
  if (!isLoggedIn) return <Navigate to="/auth" replace />;
  if (!isStudent)  return <Navigate to="/portal" replace />;
  return children;
}
function GuardOwner({ children }) {
  const { isLoggedIn, isOwner, isManager } = useAuth();
  if (!isLoggedIn)          return <Navigate to="/auth" replace />;
  if (!isOwner && !isManager) return <Navigate to="/dashboard" replace />;
  return children;
}
function GuardStaff({ children }) {
  const { isLoggedIn, isStaff } = useAuth();
  if (!isLoggedIn) return <Navigate to="/admin/login" replace />;
  if (!isStaff)    return <Navigate to="/" replace />;
  return children;
}

// Layout with navbar + footer (public + student pages)
function PublicLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

// Admin/staff layout — no public navbar
function StaffLayout({ children }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}

function AppRoutes() {
  const { isStaff, isOwner, isManager, isStudent, isLoggedIn } = useAuth();

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/find-room" element={<PublicLayout><FindRoom /></PublicLayout>} />
        <Route path="/browse"   element={<Navigate to="/find-room" replace />} />

        {/* ── Auth (frontend users: student / owner / manager) ── */}
        <Route path="/auth" element={
          isLoggedIn
            ? (isStaff ? <Navigate to="/admin" replace />
              : isStudent ? <Navigate to="/dashboard" replace />
              : <Navigate to="/portal" replace />)
            : <PublicLayout><Auth /></PublicLayout>
        } />

        {/* ── Student dashboard ── */}
        <Route path="/dashboard" element={
          <GuardStudent><PublicLayout><StudentDash /></PublicLayout></GuardStudent>
        } />

        {/* ── Owner / Manager portal ── */}
        <Route path="/portal/*" element={
          <GuardOwner><PublicLayout><OwnerPortal /></PublicLayout></GuardOwner>
        } />

        {/* ── Admin / Zone Manager backend portal ── */}
        <Route path="/admin/login" element={
          isStaff ? <Navigate to="/admin" replace /> : <StaffLayout><Auth staffMode /></StaffLayout>
        } />
        <Route path="/admin/*" element={
          <GuardStaff><StaffLayout><AdminPortal /></StaffLayout></GuardStaff>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <InstallPrompt />
    </AuthProvider>
  );
}
