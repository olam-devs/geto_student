import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Search, ChevronDown, LogOut, LayoutDashboard, Settings, Download } from 'lucide-react';

function GetoLogo() {
  return (
    <Link to="/" className="flex items-center gap-3 shrink-0 group">
      {/* Brand mark: dark navy squircle + mint C-ring + white house */}
      <svg width="38" height="38" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="44" height="44" rx="10" fill="#14162B"/>
        <path d="M32.5 8.6 A17 17 0 1 0 32.5 35.4 L28.8 30.7 A11 11 0 1 1 28.8 13.3 Z" fill="#2FD48B"/>
        <circle cx="30.6" cy="11" r="3" fill="#2FD48B"/>
        <circle cx="30.6" cy="33" r="3" fill="#2FD48B"/>
        <path d="M36 15 L42 21 L40 21 L40 28 L32 28 L32 21 L30 21 Z" fill="white"/>
        <rect x="33.5" y="23" width="5" height="5" rx="0.5" fill="#14162B"/>
      </svg>
      <div className="flex flex-col leading-none">
        <span className="font-display font-bold text-[18px] tracking-tight text-slate-900 leading-none">Geto <span className="text-accent-500">Student</span></span>
        <span className="font-sans text-[10px] font-medium tracking-[0.14em] text-slate-400 uppercase mt-0.5">Verified Accommodation</span>
      </div>
    </Link>
  );
}

export default function Navbar() {
  const { user, isLoggedIn, isAdmin, isZoneManager, isStaff, isOwner, isManager, isStudent, logout } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [dropOpen,    setDropOpen]    = useState(false);
  const [searchQ,     setSearchQ]     = useState('');
  const [iosInstallTip, setIosInstallTip] = useState(false);
  const [isStandalone,  setIsStandalone]  = useState(false);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    const onInstalled = () => setIsStandalone(true);
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  const handleInstall = async () => {
    if (isIOS) { setIosInstallTip(true); return; }
    const p = window.__pwaInstallPrompt;
    if (!p) return;
    p.prompt();
    const { outcome } = await p.userChoice;
    if (outcome === 'accepted') { window.__pwaInstallPrompt = null; setIsStandalone(true); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(searchQ.trim() ? `/find-room?q=${encodeURIComponent(searchQ.trim())}` : '/find-room');
    setMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
    setDropOpen(false);
  };

  const displayName = user?.name || '';
  const initials    = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const navLinkCls = (to) =>
    `text-sm font-medium transition-colors ${location.pathname === to ? 'text-accent-500' : 'text-slate-600 hover:text-slate-900'}`;

  return (
    <nav className="bg-white sticky top-0 z-40 border-b border-slate-200 shadow-sm">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 h-[62px]">

          {/* Logo */}
          <GetoLogo />

          {/* Search bar — desktop center */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm xl:max-w-md mx-2">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
              <input
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search campus, area or property…"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800
                           placeholder-slate-400 focus:outline-none focus:border-accent-500 focus:bg-white
                           focus:ring-1 focus:ring-accent-500 transition-all"
              />
            </div>
          </form>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-4 ml-auto shrink-0">
            <Link to="/find-room"
              className="border border-coral text-coral hover:bg-coral hover:text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Find Room
            </Link>
            {isStaff   && <Link to="/admin"     className={navLinkCls('/admin')}>Admin</Link>}
            {(isOwner || isManager) && <Link to="/portal" className={navLinkCls('/portal')}>My Portal</Link>}
            {isStudent && <Link to="/dashboard" className={navLinkCls('/dashboard')}>Dashboard</Link>}

            {!isLoggedIn ? (
              <>
                <button onClick={() => navigate('/auth')}
                  className="border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                  Sign In
                </button>
                <button onClick={() => navigate('/auth?tab=register')}
                  className="bg-accent-500 hover:bg-accent-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-sm">
                  Get Started
                </button>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setDropOpen(v => !v)}
                  className="flex items-center gap-2 border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white rounded-lg px-3 py-1.5 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-accent-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {initials}
                  </div>
                  <span className="text-sm text-slate-700 font-medium max-w-[100px] truncate">{displayName}</span>
                  <ChevronDown size={13} className="text-slate-400"/>
                </button>
                {dropOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lift border border-slate-100 py-1 z-50">
                    {isStudent && (
                      <Link to="/dashboard" onClick={() => setDropOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                        <LayoutDashboard size={15} className="text-slate-400"/> My Dashboard
                      </Link>
                    )}
                    {(isOwner || isManager) && (
                      <Link to="/portal" onClick={() => setDropOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                        <LayoutDashboard size={15} className="text-slate-400"/> My Portal
                      </Link>
                    )}
                    {isStaff && (
                      <Link to="/admin" onClick={() => setDropOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                        <Settings size={15} className="text-slate-400"/> Admin Panel
                      </Link>
                    )}
                    <hr className="my-1 border-slate-100"/>
                    <button onClick={handleLogout}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                      <LogOut size={15}/> Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile right */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors ml-auto"
          >
            {menuOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-3">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search campus, area or property…"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm
                           placeholder-slate-400 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
              />
            </div>
          </form>
          <hr className="border-slate-100"/>
          <Link to="/find-room" onClick={() => setMenuOpen(false)}
            className="block border border-coral text-coral text-center text-sm font-semibold py-2 rounded-lg">
            Find Room
          </Link>
          {isStaff   && <Link to="/admin"     onClick={() => setMenuOpen(false)} className="block text-slate-700 font-medium text-sm py-1">Admin Panel</Link>}
          {(isOwner || isManager) && <Link to="/portal" onClick={() => setMenuOpen(false)} className="block text-slate-700 font-medium text-sm py-1">My Portal</Link>}
          {isStudent && <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block text-slate-700 font-medium text-sm py-1">Dashboard</Link>}
          <hr className="border-slate-100"/>
          {isLoggedIn ? (
            <button onClick={handleLogout} className="text-red-500 text-sm font-medium">Sign Out</button>
          ) : (
            <div className="flex gap-3 pt-1">
              <button onClick={() => { navigate('/auth'); setMenuOpen(false); }}
                className="flex-1 border border-slate-300 text-slate-700 text-sm font-semibold py-2 rounded-lg">Sign In</button>
              <button onClick={() => { navigate('/auth?tab=register'); setMenuOpen(false); }}
                className="flex-1 bg-accent-500 text-white text-sm font-bold py-2 rounded-lg">Get Started</button>
            </div>
          )}

          {/* Install to home screen */}
          {!isStandalone && (isIOS || window.__pwaInstallPrompt) && (
            <button
              onClick={handleInstall}
              className="w-full flex items-center justify-center gap-2 border border-accent-500 text-accent-500
                         text-sm font-semibold py-2.5 rounded-lg hover:bg-accent-50 transition-colors">
              <Download size={15}/> Add to Home Screen
            </button>
          )}

          {/* iOS instruction tip */}
          {iosInstallTip && (
            <div className="bg-slate-900 text-white text-xs rounded-xl p-3 mt-1 relative">
              <button onClick={() => setIosInstallTip(false)}
                className="absolute top-2 right-2 text-white/50 hover:text-white">
                <X size={13}/>
              </button>
              <p className="font-semibold mb-1">Add to Home Screen</p>
              <p className="text-white/70 leading-relaxed">
                Tap the <span className="font-bold text-white">Share</span> button at the bottom of Safari, then choose{' '}
                <span className="font-bold text-white">"Add to Home Screen"</span>.
              </p>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
