import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Search, ChevronDown, LogOut, LayoutDashboard, Settings } from 'lucide-react';

function GetoLogo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
      <svg width="36" height="34" viewBox="0 0 36 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* House body */}
        <path d="M18 2L34 14V32H2V14L18 2Z" fill="#C95F2A"/>
        {/* Door */}
        <path d="M13 32V24C13 21.8 14.3 20.5 16.5 20.5H19.5C21.7 20.5 23 21.8 23 24V32" fill="#1A3B2B"/>
        {/* Verification checkmark */}
        <path d="M11 17.5l4.5 4.5 9.5-9.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div className="flex flex-col leading-none">
        <span className="font-sans font-bold text-[18px] tracking-tight text-slate-800 leading-none">Geto</span>
        <span className="font-sans text-[10px] font-medium tracking-[0.15em] text-slate-400 uppercase mt-0.5">Student</span>
      </div>
    </Link>
  );
}

export default function Navbar() {
  const { user, agent, isLoggedIn, isAdmin, isAgent, isStudent, logout } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [searchQ,  setSearchQ]  = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(searchQ.trim() ? `/browse?q=${encodeURIComponent(searchQ.trim())}` : '/browse');
    setMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
    setDropOpen(false);
  };

  const displayName = user?.name || agent?.name || '';
  const initials    = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const navLinkCls = (to) =>
    `text-sm font-medium transition-colors ${location.pathname === to ? 'text-accent-600' : 'text-slate-600 hover:text-slate-900'}`;

  return (
    <nav className="bg-white sticky top-0 z-40 border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
                           placeholder-slate-400 focus:outline-none focus:border-accent-600 focus:bg-white
                           focus:ring-1 focus:ring-accent-600 transition-all"
              />
            </div>
          </form>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-5 ml-auto shrink-0">
            <Link to="/browse" className={navLinkCls('/browse')}>Browse</Link>
            {isAdmin  && <Link to="/admin"     className={navLinkCls('/admin')}>Admin</Link>}
            {isAgent  && <Link to="/agent"     className={navLinkCls('/agent')}>My Listings</Link>}
            {isStudent && <Link to="/dashboard" className={navLinkCls('/dashboard')}>Dashboard</Link>}

            {!isLoggedIn ? (
              <>
                <button onClick={() => navigate('/auth')}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Sign In
                </button>
                <button onClick={() => navigate('/auth?tab=register')}
                  className="bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
                  Get Started
                </button>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setDropOpen(v => !v)}
                  className="flex items-center gap-2 border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white rounded-lg px-3 py-1.5 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-accent-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
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
                    {isAgent && (
                      <Link to="/agent" onClick={() => setDropOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                        <LayoutDashboard size={15} className="text-slate-400"/> Agent Portal
                      </Link>
                    )}
                    {isAdmin && (
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
                           placeholder-slate-400 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-600"
              />
            </div>
          </form>
          <hr className="border-slate-100"/>
          <Link to="/browse"    onClick={() => setMenuOpen(false)} className="block text-slate-700 font-medium text-sm py-1">Browse Rooms</Link>
          {isAdmin   && <Link to="/admin"     onClick={() => setMenuOpen(false)} className="block text-slate-700 font-medium text-sm py-1">Admin Panel</Link>}
          {isAgent   && <Link to="/agent"     onClick={() => setMenuOpen(false)} className="block text-slate-700 font-medium text-sm py-1">My Listings</Link>}
          {isStudent && <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block text-slate-700 font-medium text-sm py-1">Dashboard</Link>}
          <hr className="border-slate-100"/>
          {isLoggedIn ? (
            <button onClick={handleLogout} className="text-red-500 text-sm font-medium">Sign Out</button>
          ) : (
            <div className="flex gap-3 pt-1">
              <button onClick={() => { navigate('/auth'); setMenuOpen(false); }}
                className="text-slate-700 text-sm font-medium">Sign In</button>
              <button onClick={() => { navigate('/auth?tab=register'); setMenuOpen(false); }}
                className="bg-accent-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">Get Started</button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
