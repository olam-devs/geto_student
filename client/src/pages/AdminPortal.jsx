import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, MapPin, CheckSquare,
  LogOut, Menu, X, ChevronRight, Eye, Check, XCircle,
  Shield, AlertCircle, Loader2, UserPlus, Map, Plus, ChevronDown as Chevron, Globe,
  Pencil, Trash2, GraduationCap, Save, ArrowLeft,
  Layers, BedDouble, UserCheck, Wrench, Grid3X3,
  Search, SlidersHorizontal, UserCog, CreditCard, CalendarDays,
  ClipboardList, BadgeCheck, Phone, Mail, AtSign,
  ChevronLeft, Receipt, BookPlus, UserSearch, Home,
  Camera, Upload, ImagePlus, SkipForward,
  Smartphone, SendHorizonal, Clock, CheckCircle2, BarChart3, KeyRound
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { TZ_LOCATIONS } from '../data/tz_locations';
import AvailabilitySwitch from '../components/admin/AvailabilitySwitch';
import QuickAddHouse from '../components/admin/QuickAddHouse';
import RegisterStudent from '../components/admin/RegisterStudent';
import HousePhotos from '../components/admin/HousePhotos';
import Sheet, { LoginDetails, ErrorNote } from '../components/admin/Sheet';
import AdminAnalytics from './AdminAnalytics';

// ─── Simple typeahead for location values ──────────────────────
function LocTypeahead({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || '');
  const ref = useRef(null);
  useEffect(() => { setQ(value || ''); }, [value]);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered = q ? options.filter(o => o.toLowerCase().includes(q.toLowerCase())) : options;
  const pick = (opt) => { setQ(opt); onChange(opt); setOpen(false); };
  return (
    <div ref={ref} className="relative">
      <input className="input text-sm" value={q} disabled={disabled} autoComplete="off"
        placeholder={placeholder}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} />
      {open && filtered.length > 0 && !disabled && (
        <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg text-sm">
          {filtered.slice(0, 50).map(opt => (
            <li key={opt} onMouseDown={() => pick(opt)}
              className="px-3 py-1.5 cursor-pointer hover:bg-primary/10 hover:text-primary text-slate-700">
              {opt}
            </li>
          ))}
          {filtered.length > 50 && <li className="px-3 py-1.5 text-slate-400 text-xs">Keep typing…</li>}
        </ul>
      )}
    </div>
  );
}

// ─── Sidebar nav ───────────────────────────────────────────────
const ADMIN_NAV = [
  { path: '/admin',          icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/properties', icon: Building2,    label: 'Properties' },
  { path: '/admin/users',    icon: Users,           label: 'Users' },
  { path: '/admin/bookings', icon: CheckSquare,     label: 'Bookings' },
];
const ADMIN_ONLY_NAV = [
  { path: '/admin/analytics',    icon: BarChart3,     label: 'Analytics' },
  { path: '/admin/zones',        icon: Map,           label: 'Zones & Areas' },
  { path: '/admin/universities', icon: GraduationCap, label: 'Universities' },
  { path: '/admin/staff',        icon: Shield,        label: 'Zone Managers' },
  { path: '/admin/types',        icon: Plus,          label: 'Property & Room Types' },
];
const ZONE_MANAGER_NAV = [
  { path: '/admin/staff',        icon: Shield,        label: 'My Geto Officers' },
];

function Sidebar({ open, onClose }) {
  const { user, isAdmin, isZoneManager, isGetoManager, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isZoneManager || isAdmin) return;
    const fetch = () =>
      api.get('/admin/properties', { params: { status: 'pending', limit: 1 } })
        .then(r => setPendingCount(Array.isArray(r.data) ? r.data.length : 0))
        .catch(() => {});
    fetch();
    // refresh every 2 minutes while sidebar is mounted
    const t = setInterval(fetch, 120000);
    return () => clearInterval(t);
  }, [isZoneManager, isAdmin]);

  const handleLogout = () => { logout(); navigate('/admin/login'); };
  const nav = isAdmin ? [...ADMIN_NAV, ...ADMIN_ONLY_NAV]
            : isZoneManager ? [...ADMIN_NAV, ...ZONE_MANAGER_NAV]
            : ADMIN_NAV;
  const roleLabel = isAdmin ? 'Super Admin'
    : isZoneManager ? `Zone Manager · ${user?.zone_code||''}`
    : isGetoManager ? 'Geto Officer'
    : 'Staff';
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose}/>}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-primary text-white z-40 flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Header */}
        <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="44" height="44" rx="10" fill="#14162B"/>
            <path d="M32.5 8.6 A17 17 0 1 0 32.5 35.4 L28.8 30.7 A11 11 0 1 1 28.8 13.3 Z" fill="#2FD48B"/>
            <circle cx="30.6" cy="11" r="3" fill="#2FD48B"/>
            <circle cx="30.6" cy="33" r="3" fill="#2FD48B"/>
            <path d="M36 15 L42 21 L40 21 L40 28 L32 28 L32 21 L30 21 Z" fill="white"/>
            <rect x="33.5" y="23" width="5" height="5" rx="0.5" fill="#14162B"/>
          </svg>
          <div>
            <div className="font-display font-bold text-sm leading-none">Geto Admin</div>
            <div className="text-xs text-white/50 mt-0.5">{roleLabel}</div>
          </div>
          <button className="lg:hidden ml-auto text-white/60 hover:text-white" onClick={onClose}><X size={20}/></button>
        </div>
        {/* User */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="text-xs text-white/50">Logged in as</div>
          <div className="text-sm font-semibold truncate">{user?.name}</div>
          <div className="text-xs text-white/40 truncate">{user?.email}</div>
        </div>
        {/* Zone badge for zone managers */}
        {isZoneManager && user?.zone_name && (
          <div className="mx-5 mt-3 px-3 py-2 bg-accent/20 rounded-xl text-xs text-accent font-semibold">
            <MapPin size={12} className="inline mr-1"/>Zone {user.zone_code}: {user.zone_name}
          </div>
        )}
        {/* Referral code badge for geto managers */}
        {isGetoManager && user?.referral_code && (
          <div className="mx-5 mt-3 px-3 py-2 bg-accent/20 rounded-xl text-xs text-accent font-semibold">
            <UserCheck size={12} className="inline mr-1"/>Code: {user.referral_code}
          </div>
        )}
        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          {nav.map(({ path, icon: Icon, label }) => {
            const active = loc.pathname === path || (path !== '/admin' && loc.pathname.startsWith(path));
            const badge = isZoneManager && !isAdmin && path === '/admin/properties' && pendingCount > 0;
            return (
              <Link key={path} to={path} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
                <Icon size={18}/>{label}
                {badge && (
                  <span className="ml-auto bg-amber-400 text-amber-900 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-5">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white transition-all">
            <LogOut size={18}/>Logout
          </button>
        </div>
      </aside>
    </>
  );
}

function TopBar({ onMenuClick }) {
  const loc = useLocation();
  const nav = [...ADMIN_NAV, ...ADMIN_ONLY_NAV];
  const current = nav.find(n => n.path === loc.pathname || (n.path !== '/admin' && loc.pathname.startsWith(n.path)));
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 lg:px-6">
      <button className="lg:hidden p-2 rounded-lg hover:bg-slate-100" onClick={onMenuClick}><Menu size={20}/></button>
      <h2 className="font-semibold text-slate-800 text-sm">{current?.label || 'Dashboard'}</h2>
    </header>
  );
}

// ─── Stat card ────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'primary' }) {
  const colors = { primary: 'text-primary', accent: 'text-accent', green: 'text-green-600', amber: 'text-amber-600' };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-3xl font-bold ${colors[color]}`}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

// ─── Pages ────────────────────────────────────────────────────

// Dashboard
const BOOKING_STATUS_LABEL = {
  assigned: 'Assigned', payment_pending: 'Awaiting Payment',
  payment_confirmed: 'Payment Confirmed', active: 'Active',
  checked_in: 'Checked In', student_confirmed: 'Student Confirmed',
};
const BOOKING_STATUS_COLOR = {
  assigned: 'bg-blue-100 text-blue-700',
  payment_pending: 'bg-amber-100 text-amber-700',
  payment_confirmed: 'bg-emerald-100 text-emerald-700',
  active: 'bg-green-100 text-green-700',
  checked_in: 'bg-teal-100 text-teal-700',
  student_confirmed: 'bg-sky-100 text-sky-700',
};

// Big buttons for the two most common jobs (easy to hit on a phone)
function QuickActions() {
  const [open, setOpen] = useState('');
  const cls = 'min-h-[64px] rounded-2xl px-4 flex items-center gap-3 font-semibold text-sm text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary';
  return (
    <>
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
        <button onClick={() => setOpen('house')} className={`${cls} bg-primary text-white hover:bg-primary-600`}>
          <Building2 size={22} aria-hidden="true" className="shrink-0" />Add a house
        </button>
        <button onClick={() => setOpen('student')} className={`${cls} bg-accent-700 text-white hover:bg-accent-600`}>
          <BookPlus size={22} aria-hidden="true" className="shrink-0" />Register a student
        </button>
      </div>
      {open === 'house' && <QuickAddHouse onClose={() => setOpen('')} />}
      {open === 'student' && <RegisterStudent onClose={() => setOpen('')} />}
    </>
  );
}

function Dashboard() {
  const { isAdmin, isZoneManager, isGetoManager, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/admin/stats').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (loading) return <Spinner />;

  // ── Geto Officer view ─────────────────────────────────────────
  if (isGetoManager && !isAdmin && !isZoneManager) {
    const s = data?.officer_summary || {};
    const bookings = data?.officer_bookings || [];
    return (
      <div className="p-4 sm:p-5 lg:p-8 space-y-8">
        <QuickActions />
        <section>
          <h3 className="font-display font-bold text-lg text-slate-900 mb-4">My Bookings</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard label="Total Assigned"     value={s.total||0}             />
            <StatCard label="Assigned"           value={s.assigned||0}          color="primary" />
            <StatCard label="Awaiting Payment"   value={s.payment_pending||0}   color="amber" />
            <StatCard label="Payment Confirmed"  value={s.payment_confirmed||0} color="green" />
            <StatCard label="Active"             value={s.active||0}            color="green" />
            <StatCard label="Checked In"         value={s.checked_in||0}        color="primary" />
            <StatCard label="Closed"             value={s.closed||0}            />
          </div>
        </section>
        {bookings.length > 0 && (
          <section>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-4">Active Bookings</h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{['Student','Phone','Property','Room','Move-in','Status'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{b.student_name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{b.student_phone}</td>
                      <td className="px-4 py-3 text-slate-700">{b.property_name}<span className="text-slate-400 text-xs ml-1">· {b.area}</span></td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{b.room_type}<br/><span className="text-slate-400">TZS {Number(b.monthly_price).toLocaleString()}/mo</span></td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{b.move_in_date ? new Date(b.move_in_date).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${BOOKING_STATUS_COLOR[b.status]||'bg-slate-100 text-slate-600'}`}>
                          {BOOKING_STATUS_LABEL[b.status]||b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {bookings.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <CheckSquare size={40} className="mx-auto mb-3 opacity-30"/>
            <p className="text-sm">No active bookings assigned to you yet.</p>
          </div>
        )}
      </div>
    );
  }
  const g = data?.global;
  return (
    <div className="p-4 sm:p-5 lg:p-8 space-y-8">
        <QuickActions />
      {/* Pending-from-managers alert */}
      {isAdmin && (data?.pending_from_managers || 0) > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-amber-800 text-sm">{data.pending_from_managers} properties awaiting your approval</p>
            <p className="text-amber-700 text-xs mt-0.5">Zone managers have added properties that are not yet reviewed.</p>
          </div>
          <a href="/admin/properties" className="btn-sm bg-amber-600 text-white hover:bg-amber-700 text-xs shrink-0">Review Now</a>
        </div>
      )}

      {/* Global stats (admin only) */}
      {isAdmin && g && (
        <section>
          <h3 className="font-display font-bold text-lg text-slate-900 mb-4">Global Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard label="Students"         value={g.total_students}         color="primary" />
            <StatCard label="Owners"           value={g.total_owners}           color="primary" />
            <StatCard label="Managers"         value={g.total_managers}         color="primary" />
            <StatCard label="All Properties"   value={g.total_properties}       sub={`${g.approved_properties} approved`} />
            <StatCard label="Verified"         value={g.verified_properties}    color="green"  />
            <StatCard label="All Bookings"     value={g.total_bookings}         sub={`${g.confirmed_bookings} confirmed`} />
            <StatCard label="All Rooms"        value={g.total_rooms}            sub={`${g.occupied_rooms} occupied`} color="accent" />
            <StatCard label="Zone Managers"    value={g.total_zone_managers}    />
            <StatCard label="Geto Officers"    value={g.total_geto_officers}    />
            <StatCard label="Site Visits (Today)" value={data?.visits_today ?? '—'} color="green" />
            <StatCard label="Site Visits (Total)" value={data?.visits_total ?? '—'} color="primary" />
          </div>
        </section>
      )}

      {/* Manager property activity table (admin only) */}
      {isAdmin && (data?.manager_stats||[]).length > 0 && (
        <section>
          <h3 className="font-display font-bold text-lg text-slate-900 mb-4">Properties Added by Managers</h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{['Manager','Phone','Zone','Added','Approved','Pending'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data.manager_stats||[]).map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{m.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{m.phone}</td>
                    <td className="px-4 py-3"><span className="bg-primary-50 text-primary-700 text-xs font-bold px-2 py-0.5 rounded-md">{m.zone_code||'—'}</span></td>
                    <td className="px-4 py-3 font-bold text-slate-800">{m.properties_added||0}</td>
                    <td className="px-4 py-3 text-green-600 font-semibold">{m.approved_count||0}</td>
                    <td className="px-4 py-3 text-amber-600 font-semibold">{m.pending_count||0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Zone breakdown (admin: all zones; zone_manager: their zone) */}
      {isAdmin ? (
        <section>
          <h3 className="font-display font-bold text-lg text-slate-900 mb-4">By Zone</h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{['Zone','Name','Properties','Approved','Verified','Rooms','Occupied','Bookings'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.zones||[]).map(z => (
                  <tr key={z.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-primary">{z.code}</td>
                    <td className="px-4 py-3 text-slate-700">{z.name}</td>
                    <td className="px-4 py-3">{z.total||0}</td>
                    <td className="px-4 py-3 text-green-600">{z.approved||0}</td>
                    <td className="px-4 py-3 text-blue-600">{z.verified||0}</td>
                    <td className="px-4 py-3">{z.total_rooms||0}</td>
                    <td className="px-4 py-3 text-amber-600">{z.occupied||0}</td>
                    <td className="px-4 py-3">{z.total_bookings||0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <>
          {/* Pending properties alert */}
          {(data?.my_zone?.pending_properties || 0) > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-amber-800 text-sm">{data.my_zone.pending_properties} propert{data.my_zone.pending_properties===1?'y':'ies'} pending in your zone</p>
                <p className="text-amber-700 text-xs mt-0.5">Newly listed properties waiting for review.</p>
              </div>
              <a href="/admin/properties" className="btn-sm bg-amber-600 text-white hover:bg-amber-700 text-xs shrink-0">View Properties</a>
            </div>
          )}

          {/* Zone stats */}
          <section>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-4">
              Zone {user?.zone_code} — {user?.zone_name}
            </h3>
            {data?.my_zone && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <StatCard label="Properties"      value={data.my_zone.total}              />
                <StatCard label="Approved"         value={data.my_zone.approved}           color="green" />
                <StatCard label="Verified"         value={data.my_zone.verified}           color="primary" />
                <StatCard label="Pending"          value={data.my_zone.pending_properties} color="amber" />
                <StatCard label="Total Rooms"      value={data.my_zone.total_rooms}        />
                <StatCard label="Occupied"         value={data.my_zone.occupied}           color="amber"   sub={data.my_zone.total_rooms>0?`${Math.round((data.my_zone.occupied/data.my_zone.total_rooms)*100)}% occupancy`:undefined} />
                <StatCard label="All Bookings"     value={data.my_zone.total_bookings}     sub={`${data.my_zone.active_bookings||0} active`} />
                <StatCard label="Confirmed"        value={data.my_zone.confirmed_bookings} color="green" />
                <StatCard label="Geto Officers"    value={data.my_zone.geto_officers}      color="primary" />
              </div>
            )}
          </section>

          {/* Geto Officers table */}
          {(data?.officer_stats||[]).length > 0 && (
            <section>
              <h3 className="font-display font-bold text-lg text-slate-900 mb-4">Geto Officers</h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{['Name','Phone','Active Bookings','Total Bookings'].map(h=>(
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data.officer_stats).map(o => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{o.name}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{o.phone}</td>
                        <td className="px-4 py-3 font-bold text-primary">{o.active_bookings||0}</td>
                        <td className="px-4 py-3 text-slate-500">{o.total_bookings||0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Pending properties list */}
          {(data?.pending_props||[]).length > 0 && (
            <section>
              <h3 className="font-display font-bold text-lg text-slate-900 mb-4">Pending Properties</h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{['Property','Area','Owner','Listed'].map(h=>(
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data.pending_props).map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          <div>{p.area}</div>
                          {(p.ward||p.district) && <div className="text-slate-400">{[p.ward,p.district].filter(Boolean).join(', ')}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{p.owner_name||'—'}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// Properties
// A house is public only with a photo and a priced room type (same rule as the server's publicHouseSql)
const isDraft = (p) => !(Number(p.photo_count) > 0 && Number(p.priced_rooms) > 0);

function PropertiesList() {
  const { isAdmin, isSeniorStaff } = useAuth();
  const [all, setAll]           = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState(''); // '' | '1' | '0'
  const [availFilter, setAvailFilter] = useState('');      // '' | 'available' | 'full'
  const [listingFilter, setListingFilter] = useState('');  // '' | 'live' | 'draft'
  const [quickOpen, setQuickOpen] = useState(false);
  const [q, setQ]               = useState('');
  const [uniFilter, setUniFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading]   = useState(true);
  const [addOpen, setAddOpen]   = useState(false);
  const [unis, setUnis]         = useState([]);
  const [types, setTypes]       = useState([]);

  useEffect(() => {
    api.get('/universities').then(r => setUnis(r.data)).catch(() => {});
    api.get('/admin/property-types').then(r => setTypes(r.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (verifiedFilter !== '') params.verified = verifiedFilter;
    api.get('/admin/properties', { params })
      .then(r => { setAll(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [statusFilter, verifiedFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = all.filter(p => {
    if (q) {
      const lq = q.toLowerCase();
      if (![p.name, p.area, p.owner_name, p.owner_phone, p.zone_code, p.university_name]
          .some(v => (v||'').toLowerCase().includes(lq))) return false;
    }
    if (uniFilter && String(p.university_id) !== uniFilter) return false;
    if (typeFilter && (p.property_type||'').toLowerCase() !== typeFilter.toLowerCase()) return false;
    if (availFilter && (p.availability || 'available') !== availFilter) return false;
    if (listingFilter && (isDraft(p) ? 'draft' : 'live') !== listingFilter) return false;
    return true;
  });
  const setAvail = (id, v) => setAll(list => list.map(p => p.id === id ? { ...p, availability: v } : p));

  const approve = async (id) => { await api.put(`/admin/properties/${id}/approve`); load(); };
  const reject = async (id) => {
    const note = prompt('Reason for rejection:');
    if (!note) return;
    await api.put(`/admin/properties/${id}/reject`, { note });
    load();
  };
  const verify = async (id) => {
    if (!confirm('Verify this property? It will display the "Geto Verified" badge.')) return;
    await api.put(`/admin/properties/${id}/verify`, {
      checklist: { owner_identity:1, location_confirmed:1, rooms_confirmed:1, water_confirmed:1, electricity_confirmed:1, security_confirmed:1, price_confirmed:1 }
    });
    load();
  };
  const unverify = async (id) => {
    if (!confirm('Remove the "Geto Verified" badge from this property?')) return;
    await api.put(`/admin/properties/${id}/unverify`);
    load();
  };
  const deleteProp = async (id) => {
    if (!confirm('Permanently delete this property? This cannot be undone.')) return;
    await api.delete(`/admin/properties/${id}`);
    load();
  };

  const activeFilters = [q, uniFilter, typeFilter, verifiedFilter, availFilter, listingFilter].filter(Boolean).length;

  return (
    <div className="p-4 sm:p-5 lg:p-8">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-display font-bold text-lg text-slate-900">Properties
          <span className="ml-2 text-sm font-normal text-slate-400">{filtered.length} of {all.length}</span>
        </h2>
        <button onClick={() => setQuickOpen(true)} className="btn-primary text-sm shrink-0 min-h-[44px]"><Plus size={15}/>Add a house</button>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5 space-y-3">
        {/* Row 1: search + verified toggle */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            <input className="input pl-8 text-sm" value={q} onChange={e=>setQ(e.target.value)}
              placeholder="Search name, area, owner, zone…"/>
          </div>
          <select className="input text-sm w-48" value={uniFilter} onChange={e=>setUniFilter(e.target.value)}>
            <option value="">All Universities</option>
            {unis.map(u => <option key={u.id} value={u.id}>{u.short_name || u.name}</option>)}
          </select>
          <select className="input text-sm w-44" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>

        {/* Row 2: status pills + verified pills + clear */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide mr-1">Status:</span>
          {[['','All'],['pending','Pending'],['approved','Approved'],['rejected','Rejected']].map(([s,lbl]) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${statusFilter===s?'bg-primary text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {lbl}
            </button>
          ))}
          <span className="w-px h-4 bg-slate-200 mx-1"/>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide mr-1">Verified:</span>
          {[['','All'],['1','Verified'],['0','Unverified']].map(([v,lbl]) => (
            <button key={v} onClick={() => setVerifiedFilter(v)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${verifiedFilter===v?'bg-green-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {lbl}
            </button>
          ))}
          <span className="w-px h-4 bg-slate-200 mx-1"/>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide mr-1">Rooms:</span>
          {[['','All'],['available','Available'],['full','Full']].map(([v,lbl]) => (
            <button key={v} onClick={() => setAvailFilter(v)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${availFilter===v?'bg-primary text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {lbl}
            </button>
          ))}
          <span className="w-px h-4 bg-slate-200 mx-1"/>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide mr-1">On site:</span>
          {[['','All'],['live','Live'],['draft','Drafts']].map(([v,lbl]) => (
            <button key={v} onClick={() => setListingFilter(v)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${listingFilter===v?'bg-primary text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {lbl}
            </button>
          ))}
          {activeFilters > 0 && (
            <button onClick={() => { setQ(''); setUniFilter(''); setTypeFilter(''); setVerifiedFilter(''); setAvailFilter(''); setListingFilter(''); }}
              className="ml-auto text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1">
              <X size={12}/> Clear filters
            </button>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 font-medium">
          Houses you add go live straight away. Admin can verify them after an inspection.
        </div>
      )}
      {addOpen && <AddPropertyModal onClose={() => setAddOpen(false)} onSaved={load} />}
      {quickOpen && <QuickAddHouse onClose={() => setQuickOpen(false)} onSaved={load}
        onUseFullForm={() => { setQuickOpen(false); setAddOpen(true); }} />}
      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {filtered.length === 0 && <EmptyState label={all.length ? 'No properties match your filters' : 'No properties'} />}
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-start gap-4">
              {p.main_photo
                ? <img src={p.main_photo} alt="" className="w-full md:w-24 h-20 object-cover rounded-xl shrink-0"/>
                : <div className="hidden md:flex w-24 h-20 rounded-xl bg-slate-100 items-center justify-center shrink-0"><Building2 size={24} className="text-slate-300"/></div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900">{p.name}</span>
                  {p.verified ? <span className="badge-green">Verified</span> : null}
                  <StatusBadge status={p.status} />
                  {isDraft(p) && p.status === 'approved' && (
                    <span className="badge badge-amber" title="Not shown on the website until it has a photo and a price">
                      Draft: {[!Number(p.photo_count) && 'needs photos', !Number(p.priced_rooms) && 'needs a price'].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {p.property_type && <span className="badge badge-blue">{p.property_type}</span>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{p.area} · {p.university_name} · Zone {p.zone_code||'—'}</div>
                <div className="text-xs text-slate-400 mt-0.5">Owner: <span className="text-slate-600 font-medium">{p.owner_name}</span> · {p.owner_phone}</div>
                <div className="flex gap-4 mt-1.5 text-xs text-slate-400">
                  <span>{p.room_types||0} room type{p.room_types!==1?'s':''}</span>
                  <span>{p.total_rooms||0} total rooms</span>
                  <span className={p.occupied > 0 ? 'text-green-600 font-medium' : ''}>{p.occupied||0} occupied</span>
                </div>
                <div className="mt-2.5">
                  <AvailabilitySwitch propertyId={p.id} value={p.availability} canEdit={isSeniorStaff}
                    onChange={v => setAvail(p.id, v)} />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {p.status === 'pending' && <>
                  <button onClick={() => approve(p.id)} className="btn-sm bg-green-600 text-white hover:bg-green-700"><Check size={13}/>Approve</button>
                  <button onClick={() => reject(p.id)}  className="btn-sm bg-red-600 text-white hover:bg-red-700"><XCircle size={13}/>Reject</button>
                </>}
                {p.status === 'approved' && !p.verified && (
                  <button onClick={() => verify(p.id)} className="btn-sm bg-primary text-white hover:bg-primary/80"><Shield size={13}/>Verify</button>
                )}
                {!!Number(p.verified) && (
                  <button onClick={() => unverify(p.id)} className="btn-sm bg-amber-500 text-white hover:bg-amber-600"><Shield size={13}/>Unverify</button>
                )}
                <button onClick={() => deleteProp(p.id)} className="btn-sm border border-red-200 text-red-500 hover:bg-red-50"><Trash2 size={13}/></button>
                <Link to={`/admin/properties/${p.id}`} className="btn-sm border border-slate-200 text-slate-600 hover:border-primary hover:text-primary"><Eye size={13}/>View</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add Property Modal ───────────────────────────────────────
function AddPropertyModal({ onClose, onSaved }) {
  const [unis, setUnis]         = useState([]);
  const [zones, setZones]       = useState([]);
  const [clusters, setClust]    = useState([]);
  const [step, setStep]         = useState(1); // 1=info, 2=owner, 3=rooms, 4=photos
  const [propId, setPropId]     = useState(null);
  const [err, setErr]           = useState('');
  const [saving, setSaving]     = useState(false);
  const [rooms, setRooms]       = useState([]);
  const [photoFiles, setPhotoFiles]       = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedUnis, setSelUnis] = useState([]);
  const [uniSearch, setUniSearch] = useState('');

  // Owner section
  const [ownerMode, setOwnerMode]   = useState('search'); // 'search' | 'create'
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerResults, setOwnerResults] = useState([]);
  const [selectedOwner, setSelOwner]  = useState(null);
  const [ownerForm, setOwnerForm] = useState({ name:'', email:'', phone:'', password:'', business_name:'', role:'property_owner' });

  const [f, setF] = useState({
    name:'', property_type:'Hostel', description:'', address:'', landmark:'', area:'',
    highlight:'', nearest_university_id:'', zone_id:'', cluster_id:'', youtube_video_id:'',
    latitude:'', longitude:'',
  });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsErr, setGpsErr]         = useState('');
  const [idFront, setIdFront] = useState(null);
  const [idBack,  setIdBack]  = useState(null);
  const [rf, setRf] = useState({
    room_type:'Single', monthly_price:'', deposit_months:'1', capacity:'1',
    total_count:'1', available_count:'1', furnished:false, bathroom_type:'Shared', description:'',
  });

  const [pTypes, setPTypes] = useState([]);
  const [rTypes, setRTypes] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/universities'), api.get('/zones'), api.get('/admin/property-types'), api.get('/admin/room-types')])
      .then(([u, z, pt, rt]) => { setUnis(u.data); setZones(z.data); setPTypes(pt.data); setRTypes(rt.data); })
      .catch(() => {
        api.get('/universities').then(u => setUnis(u.data)).catch(() => {});
        api.get('/zones').then(z => setZones(z.data)).catch(() => {});
      });
  }, []);

  useEffect(() => {
    if (ownerSearch.length < 2) { setOwnerResults([]); return; }
    const t = setTimeout(() => {
      // search both property_owner and property_manager by name or phone
      api.get('/admin/users/search', { params: { q: ownerSearch } })
        .then(r => setOwnerResults(r.data.filter(u => ['property_owner','property_manager'].includes(u.role))))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [ownerSearch]);

  const toggleUni = (id) => {
    const strId = String(id);
    setSelUnis(prev => prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]);
    if (!f.nearest_university_id) {
      const u = unis.find(u => String(u.id) === strId);
      if (u) setF(p => ({ ...p, nearest_university_id: strId, zone_id: u.zone_id||'', area: u.area||p.area }));
    }
  };

  const onUniChange = (uid) => {
    setF(p => ({ ...p, nearest_university_id: uid }));
    const u = unis.find(u => String(u.id) === String(uid));
    if (u) { setF(p => ({ ...p, nearest_university_id: uid, zone_id: u.zone_id||'', area: u.area||p.area })); }
    if (!selectedUnis.includes(String(uid))) setSelUnis(prev => [...prev, String(uid)]);
  };

  const onZoneChange = (zid) => {
    setF(p => ({ ...p, zone_id: zid, cluster_id: '' }));
    if (zid) api.get('/clusters', { params: { zone_id: zid } }).then(r => setClust(r.data)).catch(() => {});
    else setClust([]);
  };

  const extractGps = () => {
    if (!navigator.geolocation) { setGpsErr('Geolocation not supported by this browser.'); return; }
    setGpsLoading(true); setGpsErr('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setF(p => ({ ...p, latitude: pos.coords.latitude.toFixed(8), longitude: pos.coords.longitude.toFixed(8) }));
        setGpsLoading(false);
      },
      (e) => { setGpsErr('Could not get location: ' + e.message); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const saveStep1 = async (e) => {
    e.preventDefault(); setErr(''); setSaving(true);
    try {
      setStep(2); setSaving(false);
    } catch (e) { setErr(e.response?.data?.message || 'An error occurred.'); setSaving(false); }
  };

  const saveStep2 = async (e) => {
    e.preventDefault(); setErr(''); setSaving(true);
    try {
      let ownerId = selectedOwner?.id || null;
      if (ownerMode === 'create') {
        if (!ownerForm.name || !ownerForm.phone || !ownerForm.password) {
          setErr('Name, phone, and password are required for the owner.'); setSaving(false); return;
        }
        const r = await api.post('/admin/users/owner', ownerForm);
        ownerId = r.data.id;
        // Upload National ID photos if provided
        for (const [file, side] of [[idFront,'front'],[idBack,'back']]) {
          if (!file) continue;
          const fd = new FormData(); fd.append('photo', file); fd.append('side', side);
          await api.post(`/admin/users/${ownerId}/id-photo`, fd, { headers:{'Content-Type':'multipart/form-data'} }).catch(() => {});
        }
      }
      const payload = { ...f, owner_id: ownerId || '', university_ids: selectedUnis };
      const r = await api.post('/admin/properties', payload);
      setPropId(r.data.id);
      setStep(3);
    } catch (e) { setErr(e.response?.data?.message || 'An error occurred.'); }
    finally { setSaving(false); }
  };

  const addRoom = async (e) => {
    e.preventDefault(); setErr(''); setSaving(true);
    try {
      const payload = { ...rf, occupied_count: Math.max(0, (rf.total_count||1) - (rf.available_count||rf.total_count||1)) };
      await api.post(`/admin/properties/${propId}/rooms`, payload);
      const r = await api.get(`/admin/properties/${propId}`);
      setRooms(r.data.rooms || []);
      setRf({ room_type:'Single', monthly_price:'', deposit_months:'1', capacity:'1', total_count:'1', available_count:'1', furnished:false, bathroom_type:'Shared', description:'' });
    } catch (e) { setErr(e.response?.data?.message || 'An error occurred.'); }
    finally { setSaving(false); }
  };

  const delRoom = async (rid) => {
    await api.delete(`/admin/rooms/${rid}`);
    setRooms(prev => prev.filter(r => r.id !== rid));
  };

  const fmt = n => Number(n).toLocaleString('en-TZ');
  const TYPES  = pTypes.length ? pTypes.map(t => t.name) : ['Nyumba ya Vyumba','Hostel','Apartment','Bedsitter','Studio','Shared House','Student Residence','Other'];
  const RTYPES = rTypes.length ? rTypes.map(t => t.name) : ['Single','Double','Shared','Master','Bedsitter','Studio'];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h2 className="font-display font-bold text-lg text-slate-900">
            {step === 1 ? 'Add New Property' : `Add Rooms — ${f.name}`}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6 text-xs font-semibold">
            {[['1','Details'],['2','Owner'],['3','Rooms'],['4','Photos']].map(([n,label],i) => (
              <React.Fragment key={n}>
                {i>0 && <div className="flex-1 h-px bg-slate-200"/>}
                <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step>i?'bg-primary text-white':'bg-slate-200 text-slate-500'}`}>{n}</span>
                <span className={step>i?'text-primary':'text-slate-400'}>{label}</span>
              </React.Fragment>
            ))}
          </div>

          {step === 1 && (
            <form onSubmit={saveStep1} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Property Name *</label>
                  <input className="input" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} required placeholder="e.g. Amani Hostel" />
                </div>
                <div>
                  <label className="label">Property Type *</label>
                  <select className="input" value={f.property_type} onChange={e=>setF(p=>({...p,property_type:e.target.value}))}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Primary University *</label>
                  <select className="input" value={f.nearest_university_id} onChange={e=>onUniChange(e.target.value)} required>
                    <option value="">Select university…</option>
                    {unis.map(u => <option key={u.id} value={u.id}>{u.name} ({u.short_name})</option>)}
                  </select>
                </div>
                {/* Multi-uni selector with search */}
                <div className="col-span-2">
                  <label className="label">Universities eligible to rent here (select all that apply)</label>
                  <p className="text-xs text-slate-400 mb-1.5">Students from selected universities can see and book this property</p>
                  <input className="input mb-2 text-sm" value={uniSearch} onChange={e=>setUniSearch(e.target.value)} placeholder="Search universities…" />
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {unis.filter(u => !uniSearch || u.name.toLowerCase().includes(uniSearch.toLowerCase()) || (u.short_name||'').toLowerCase().includes(uniSearch.toLowerCase())).map(u => {
                      const sel = selectedUnis.includes(String(u.id));
                      return (
                        <button key={u.id} type="button" onClick={() => toggleUni(u.id)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${sel?'bg-primary text-white border-primary':'bg-white text-slate-600 border-slate-200 hover:border-primary'}`}>
                          {u.short_name||u.name}
                        </button>
                      );
                    })}
                  </div>
                  {selectedUnis.length > 0 && <p className="text-xs text-primary mt-1">{selectedUnis.length} {selectedUnis.length===1?'university':'universities'} selected</p>}
                </div>
                <div>
                  <label className="label">Zone</label>
                  <select className="input" value={f.zone_id} onChange={e=>onZoneChange(e.target.value)}>
                    <option value="">Select zone…</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.code} — {z.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Cluster</label>
                  <select className="input" value={f.cluster_id} onChange={e=>setF(p=>({...p,cluster_id:e.target.value}))}>
                    <option value="">Select cluster…</option>
                    {clusters.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Area</label>
                  <input className="input" value={f.area} onChange={e=>setF(p=>({...p,area:e.target.value}))} placeholder="e.g. Ubungo" />
                </div>
                <div className="col-span-2">
                  <label className="label">Highlight (optional — short card tagline shown to students)</label>
                  <input className="input" value={f.highlight} onChange={e=>setF(p=>({...p,highlight:e.target.value}))} placeholder="e.g. Near campus, solar power, water 24/7" />
                </div>
                <div className="col-span-2">
                  <label className="label">Address</label>
                  <input className="input" value={f.address} onChange={e=>setF(p=>({...p,address:e.target.value}))} placeholder="e.g. UDSM Road, Mlimani" />
                </div>
                <div className="col-span-2">
                  <label className="label">Landmark / Nearby Reference</label>
                  <input className="input" value={f.landmark} onChange={e=>setF(p=>({...p,landmark:e.target.value}))} placeholder="e.g. Near Mlimani Mall, behind UDSM Gate 3" />
                </div>
                <div className="col-span-2">
                  <label className="label">Description</label>
                  <textarea className="input" rows={3} value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} placeholder="Describe this property…" />
                </div>
                <div>
                  <label className="label">YouTube Video ID (optional)</label>
                  <input className="input" value={f.youtube_video_id} onChange={e=>setF(p=>({...p,youtube_video_id:e.target.value}))} placeholder="e.g. dQw4w9WgXcQ" />
                </div>
                {/* GPS Coordinates */}
                <div className="col-span-2">
                  <label className="label">GPS Coordinates (optional — zone manager must be physically at the property)</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={extractGps} disabled={gpsLoading}
                      className="btn-sm bg-slate-800 text-white hover:bg-slate-700 shrink-0 gap-1.5">
                      <MapPin size={13}/>{gpsLoading ? 'Getting location…' : f.latitude ? 'Re-extract' : 'Extract Coordinates'}
                    </button>
                    {f.latitude && f.longitude && (
                      <span className="text-xs font-mono text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                        {parseFloat(f.latitude).toFixed(6)}, {parseFloat(f.longitude).toFixed(6)}
                      </span>
                    )}
                    {!f.latitude && !gpsLoading && (
                      <span className="text-xs text-slate-400">No coordinates captured</span>
                    )}
                  </div>
                  {gpsErr && <p className="text-xs text-red-600 mt-1">{gpsErr}</p>}
                </div>
              </div>
              {err && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</div>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={!f.name || !f.nearest_university_id} className="btn-primary">Next: Owner →</button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={saveStep2} className="space-y-5">
              <div className="flex gap-3 mb-2">
                <button type="button" onClick={()=>setOwnerMode('search')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-colors ${ownerMode==='search'?'bg-primary text-white border-primary':'bg-white text-slate-600 border-slate-200 hover:border-primary'}`}>
                  Find Existing Owner
                </button>
                <button type="button" onClick={()=>setOwnerMode('create')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-colors ${ownerMode==='create'?'bg-primary text-white border-primary':'bg-white text-slate-600 border-slate-200 hover:border-primary'}`}>
                  Create New Account
                </button>
              </div>

              {ownerMode === 'search' && (
                <div>
                  <label className="label">Search by name, phone, or email</label>
                  <input className="input" value={ownerSearch} onChange={e=>setOwnerSearch(e.target.value)} placeholder="e.g. Amina or +255700..." />
                  {ownerResults.length > 0 && (
                    <div className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {ownerResults.map(o => (
                        <div key={o.id} onClick={() => { setSelOwner(o); setOwnerSearch(o.name); setOwnerResults([]); }}
                          className={`px-4 py-3 cursor-pointer hover:bg-slate-50 flex items-center justify-between ${selectedOwner?.id===o.id?'bg-primary/5':''}`}>
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{o.name}</p>
                            <p className="text-xs text-slate-500">{o.phone}{o.email ? ` · ${o.email}` : ''}</p>
                          </div>
                          {selectedOwner?.id===o.id && <Check size={15} className="text-primary"/>}
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedOwner && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
                      <Check size={15} className="text-green-600 shrink-0"/>
                      <div>
                        <p className="font-semibold text-sm text-green-800">{selectedOwner.name}</p>
                        <p className="text-xs text-green-600">{selectedOwner.phone}{selectedOwner.email ? ` · ${selectedOwner.email}` : ''}</p>
                      </div>
                      <button type="button" onClick={()=>{setSelOwner(null);setOwnerSearch('');}} className="ml-auto text-slate-400 hover:text-red-500"><X size={14}/></button>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2">If the owner doesn't have an account yet, click "Create New Account" or leave blank — you can update it later.</p>
                </div>
              )}

              {ownerMode === 'create' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="label">Owner Name *</label>
                    <input className="input" value={ownerForm.name} onChange={e=>setOwnerForm(p=>({...p,name:e.target.value}))} required placeholder="Full name" />
                  </div>
                  <div>
                    <label className="label">Phone *</label>
                    <input className="input" value={ownerForm.phone} onChange={e=>setOwnerForm(p=>({...p,phone:e.target.value}))} required placeholder="+255 700 000 000" />
                  </div>
                  <div>
                    <label className="label">Email <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input className="input" type="email" value={ownerForm.email} onChange={e=>setOwnerForm(p=>({...p,email:e.target.value}))} placeholder="owner@email.com" />
                  </div>
                  <div>
                    <label className="label">Account Type</label>
                    <select className="input" value={ownerForm.role} onChange={e=>setOwnerForm(p=>({...p,role:e.target.value}))}>
                      <option value="property_owner">Property Owner</option>
                      <option value="property_manager">Property Manager</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Business Name <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input className="input" value={ownerForm.business_name} onChange={e=>setOwnerForm(p=>({...p,business_name:e.target.value}))} placeholder="e.g. Amani Properties" />
                  </div>
                  <div>
                    <label className="label">Initial Password *</label>
                    <input className="input" type="password" value={ownerForm.password} onChange={e=>setOwnerForm(p=>({...p,password:e.target.value}))} required minLength={8} placeholder="Min 8 characters" />
                  </div>
                  {/* National ID upload — optional */}
                  <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">National ID (optional — both sides)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">ID Front Side</label>
                        <input type="file" accept="image/*" className="input text-xs py-2"
                          onChange={e => setIdFront(e.target.files[0] || null)} />
                        {idFront && <p className="text-xs text-green-600 mt-1">{idFront.name}</p>}
                      </div>
                      <div>
                        <label className="label">ID Back Side</label>
                        <input type="file" accept="image/*" className="input text-xs py-2"
                          onChange={e => setIdBack(e.target.files[0] || null)} />
                        {idBack && <p className="text-xs text-green-600 mt-1">{idBack.name}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {err && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</div>}
              <div className="flex justify-between pt-2">
                <button type="button" onClick={()=>setStep(1)} className="btn-ghost text-sm"><ArrowLeft size={14}/> Back</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm">{saving?'Saving…':'Save & Continue →'}</button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="space-y-5">
              {/* Room list */}
              {rooms.length > 0 && (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden mb-4">
                  {rooms.map(r => (
                    <div key={r.id} className="flex items-center justify-between px-4 py-3 bg-white">
                      <div>
                        <span className="font-semibold text-sm text-slate-800">{r.room_type}</span>
                        <span className="text-xs text-slate-400 ml-2">· {r.total_count} rooms · Capacity {r.capacity}</span>
                        <p className="text-xs text-primary font-semibold">TZS {fmt(r.monthly_price)}/mo</p>
                      </div>
                      <button onClick={() => delRoom(r.id)} className="text-red-400 hover:text-red-600 p-1.5"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add room form */}
              <form onSubmit={addRoom} className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <p className="font-semibold text-sm text-slate-700">Add Room Type</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Room Type</label>
                    <select className="input" value={rf.room_type} onChange={e=>setRf(p=>({...p,room_type:e.target.value}))}>
                      {RTYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Price/month (TZS) *</label>
                    <input className="input" type="number" value={rf.monthly_price} onChange={e=>setRf(p=>({...p,monthly_price:e.target.value}))} required placeholder="150000" />
                  </div>
                  <div>
                    <label className="label">Deposit (months of rent)</label>
                    <input className="input" type="number" min="1" max="12" value={rf.deposit_months} onChange={e=>setRf(p=>({...p,deposit_months:e.target.value}))} placeholder="1" />
                  </div>
                  <div className="flex items-end pb-1">
                    <p className="text-xs text-slate-500">
                      {rf.monthly_price && rf.deposit_months
                        ? <>Deposit = <span className="font-semibold text-primary">TZS {(Number(rf.monthly_price)*Number(rf.deposit_months)).toLocaleString()}</span></>
                        : 'Enter price first'}
                    </p>
                  </div>
                  <div>
                    <label className="label">Total Rooms</label>
                    <input className="input" type="number" min="1" value={rf.total_count}
                      onChange={e=>setRf(p=>({...p,total_count:e.target.value,available_count:e.target.value}))} />
                  </div>
                  <div>
                    <label className="label">Available (vacant)</label>
                    <input className="input" type="number" min="0" value={rf.available_count}
                      onChange={e=>setRf(p=>({...p,available_count:e.target.value}))} />
                  </div>
                  <div>
                    <label className="label">Capacity per Room</label>
                    <input className="input" type="number" min="1" max="10" value={rf.capacity} onChange={e=>setRf(p=>({...p,capacity:e.target.value}))} />
                  </div>
                  <div>
                    <label className="label">Bathroom</label>
                    <select className="input" value={rf.bathroom_type} onChange={e=>setRf(p=>({...p,bathroom_type:e.target.value}))}>
                      <option>Shared</option><option>Private</option>
                    </select>
                  </div>
                  <label className="col-span-2 flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={rf.furnished} onChange={e=>setRf(p=>({...p,furnished:e.target.checked}))} className="w-4 h-4 accent-primary" />
                    Furnished
                  </label>
                </div>
                {err && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</div>}
                <button type="submit" disabled={saving} className="btn-primary text-sm">{saving?'Adding…':'+ Add Room'}</button>
              </form>

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(1)} className="btn-ghost text-sm"><ArrowLeft size={14}/> Back</button>
                <button onClick={() => setStep(4)} className="btn-primary text-sm">Add Photos →</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-slate-800 mb-1">Property Photos</p>
                <p className="text-xs text-slate-500 mb-4">Upload up to 10 real interior and exterior photos. Students see these in a story-format gallery. JPG, PNG, WebP accepted — converted to WebP automatically.</p>

                {/* Drop zone */}
                <label className="block border-2 border-dashed border-slate-300 hover:border-accent-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-accent-50">
                  <input
                    type="file" accept="image/*" multiple className="hidden"
                    onChange={e => {
                      const files = Array.from(e.target.files).slice(0, 10);
                      setPhotoFiles(files);
                      setPhotoPreviews(files.map(f => URL.createObjectURL(f)));
                    }}
                  />
                  <div className="text-3xl mb-2">📸</div>
                  <p className="text-sm font-semibold text-slate-700">Tap to select photos</p>
                  <p className="text-xs text-slate-400 mt-1">Up to 10 photos · Max 8 MB each</p>
                </label>

                {/* Previews */}
                {photoPreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {photoPreviews.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-200">
                        <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded font-semibold">MAIN</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {err && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</div>}

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(3)} className="btn-ghost text-sm"><ArrowLeft size={14}/> Back</button>
                <div className="flex gap-2">
                  <button onClick={() => { onSaved(); onClose(); }} className="btn-ghost text-sm border border-slate-200">
                    Skip
                  </button>
                  <button
                    disabled={uploadingPhotos || !photoFiles.length}
                    onClick={async () => {
                      if (!photoFiles.length) { onSaved(); onClose(); return; }
                      setUploadingPhotos(true);
                      const fd = new FormData();
                      photoFiles.forEach(f => fd.append('photos', f));
                      try {
                        await api.post(`/admin/properties/${propId}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                      } catch (e) { /* property already saved — photos are optional */ }
                      finally { setUploadingPhotos(false); }
                      onSaved(); onClose();
                    }}
                    className="btn-primary text-sm"
                  >
                    {uploadingPhotos ? 'Uploading…' : <><Check size={14}/> Upload & Finish</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Room row with inline photo/video management ─────────────
function RoomRow({ r, fmt, onEdit, onDel, onReload }) {
  const [open, setOpen] = useState(false);
  const [videoId, setVideoId] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = React.useRef();

  const uploadPhotos = async (files) => {
    if (!files.length) return;
    setUploading(true);
    const fd = new FormData();
    for (const f of files) fd.append('photos[]', f);
    try { await api.post(`/admin/rooms/${r.id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); onReload(); }
    catch (e) { alert(e.response?.data?.message || 'Upload failed.'); }
    finally { setUploading(false); }
  };

  const addVideo = async () => {
    if (!videoId.trim()) return;
    await api.post(`/admin/rooms/${r.id}/videos`, { youtube_video_id: videoId.trim(), title: videoTitle.trim() });
    setVideoId(''); setVideoTitle(''); onReload();
  };

  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
        <div>
          <span className="font-semibold text-sm text-slate-800">{r.room_type}</span>
          <span className="text-xs text-slate-400 ml-2">· {r.furnished?'Furnished':'Unfurnished'} · {r.bathroom_type} bath · Capacity {r.capacity}</span>
          <div className="text-xs text-slate-500 mt-0.5">
            <span className="font-semibold text-primary">TZS {fmt(r.monthly_price)}/mo</span>
            {r.deposit_months && <span className="ml-2 text-slate-400">· Deposit: {r.deposit_months}mo = TZS {fmt(r.monthly_price * r.deposit_months)}</span>}
            <span className="ml-2">· {(r.available??r.available_count??r.total_count)} / {r.total_count} available</span>
            <button onClick={() => setOpen(v=>!v)} className="ml-3 text-accent-600 hover:underline text-[11px]">
              {(r.photos?.length||0)} picha · {(r.videos?.length||0)} video {open?'▲':'▼'}
            </button>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(r)} className="p-1.5 text-slate-400 hover:text-primary"><Pencil size={13}/></button>
          <button onClick={() => onDel(r.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={13}/></button>
        </div>
      </div>
      {open && (
        <div className="bg-slate-50 px-4 py-3 space-y-3">
          {/* Photos */}
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {(r.photos||[]).map(ph => (
                <div key={ph.id} className="relative group">
                  <img src={ph.url} alt="" className="w-20 h-16 object-cover rounded-lg border border-slate-200"/>
                  <button onClick={async()=>{await api.delete(`/admin/room-photos/${ph.id}`);onReload();}}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center">×</button>
                </div>
              ))}
              <button onClick={() => fileRef.current?.click()}
                className="w-20 h-16 rounded-lg border-2 border-dashed border-slate-300 hover:border-primary text-slate-400 hover:text-primary text-2xl flex items-center justify-center">
                {uploading ? <Loader2 size={16} className="animate-spin"/> : '+'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => uploadPhotos(Array.from(e.target.files))} />
            </div>
          </div>
          {/* Videos */}
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {(r.videos||[]).map(v => (
                <div key={v.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                  <span className="text-primary font-mono">{v.youtube_video_id}</span>
                  {v.title && <span className="text-slate-400">— {v.title}</span>}
                  <button onClick={async()=>{await api.delete(`/admin/room-videos/${v.id}`);onReload();}} className="text-red-400 hover:text-red-600 ml-1">×</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-end">
              <div>
                <label className="label text-[10px]">YouTube Video ID</label>
                <input className="input text-xs py-1" value={videoId} onChange={e=>setVideoId(e.target.value)} placeholder="dQw4w9WgXcQ" style={{width:'130px'}}/>
              </div>
              <div>
                <label className="label text-[10px]">Title (optional)</label>
                <input className="input text-xs py-1" value={videoTitle} onChange={e=>setVideoTitle(e.target.value)} placeholder="Room tour" style={{width:'140px'}}/>
              </div>
              <button onClick={addVideo} disabled={!videoId.trim()} className="btn-sm bg-accent text-white text-xs mb-0.5">+ Video</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Property Detail (staff)
function PropertyDetail() {
  const { isSeniorStaff } = useAuth();
  const { id } = useLocation().state || {};
  const navigate = useNavigate();
  const loc = useLocation();
  const propId = loc.pathname.split('/').pop();

  const [prop, setProp]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]     = useState('');
  const [addRoomOpen, setAddRoom] = useState(false);
  const [editRoom, setEditRoom]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [rf, setRf] = useState({ room_type:'Single', monthly_price:'', deposit_months:'1', capacity:'1', total_count:'1', available_count:'1', furnished:false, bathroom_type:'Shared' });

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/properties/${propId}`)
      .then(r => { setProp(r.data); setLoading(false); })
      .catch(() => { setLoading(false); navigate('/admin/properties'); });
  }, [propId]);

  useEffect(() => { load(); }, [load]);

  const fmt = n => Number(n||0).toLocaleString('en-TZ');
  const [rTypes, setRTypes]   = useState([]);
  const [pTypes, setPTypes]   = useState([]);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    Promise.all([api.get('/admin/room-types'), api.get('/admin/property-types')])
      .then(([rt, pt]) => { setRTypes(rt.data); setPTypes(pt.data); }).catch(() => {});
  }, []);
  const RTYPES = rTypes.length ? rTypes.map(t => t.name) : ['Single','Double','Shared','Master','Bedsitter','Studio'];

  const saveRoom = async (e) => {
    e.preventDefault(); setSaving(true); setErr('');
    try {
      const payload = { ...rf, occupied_count: Math.max(0, Number(rf.total_count||1) - Number(rf.available_count||rf.total_count||1)) };
      if (editRoom) {
        await api.put(`/admin/rooms/${editRoom.id}`, payload);
      } else {
        await api.post(`/admin/properties/${propId}/rooms`, payload);
      }
      setAddRoom(false); setEditRoom(null);
      load();
    } catch (e) { setErr(e.response?.data?.message || 'An error occurred.'); }
    finally { setSaving(false); }
  };

  const startEdit = (r) => {
    const avail = r.available !== undefined ? r.available : (r.total_count - (r.occupied_count||0));
    setRf({ room_type:r.room_type, monthly_price:r.monthly_price,
            deposit_months:r.deposit_months||1, capacity:r.capacity,
            total_count:r.total_count, available_count: avail,
            furnished:!!r.furnished, bathroom_type:r.bathroom_type });
    setEditRoom(r); setAddRoom(true);
  };

  const delRoom = async (rid) => {
    if (!confirm('Delete this room type?')) return;
    await api.delete(`/admin/rooms/${rid}`);
    load();
  };

  if (loading) return <Spinner />;
  if (!prop) return <EmptyState label="Property not found." />;

  return (
    <div className="p-4 sm:p-5 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <button onClick={() => navigate('/admin/properties')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary mb-2">
            <ArrowLeft size={13}/> Back to list
          </button>
          <h2 className="font-display font-bold text-xl text-slate-900">{prop.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{prop.area} · {prop.university_name} · Zone {prop.zone_code||'—'}</p>
          {(prop.region || prop.district || prop.ward) && (
            <p className="text-xs text-slate-400 mt-0.5">
              {[prop.ward, prop.district, prop.region].filter(Boolean).join(', ')}
            </p>
          )}
          <div className="mt-3">
            <AvailabilitySwitch propertyId={prop.id} value={prop.availability} canEdit={isSeniorStaff}
              onChange={v => setProp(p => ({ ...p, availability: v }))} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <StatusBadge status={prop.status} />
          <button onClick={() => navigate(`/admin/properties/${propId}/occupancy`)}
            className="btn-sm border border-primary text-primary hover:bg-primary hover:text-white bg-white">
            <Grid3X3 size={13}/>Occupancy Grid
          </button>
          {prop.verified
            ? <button onClick={async()=>{if(!confirm('Remove the "Geto Verified" badge?'))return;await api.put(`/admin/properties/${propId}/unverify`);load();}}
                className="btn-sm bg-amber-500 text-white hover:bg-amber-600"><Shield size={13}/>Remove Verification</button>
            : prop.status==='approved' && <button onClick={async()=>{if(!confirm('Verify this property?'))return;await api.put(`/admin/properties/${propId}/verify`,{checklist:{owner_identity:1,location_confirmed:1,rooms_confirmed:1,water_confirmed:1,electricity_confirmed:1,security_confirmed:1,price_confirmed:1}});load();}}
                className="btn-sm bg-primary text-white hover:bg-primary/80"><Shield size={13}/>Verify</button>
          }
          <button onClick={async()=>{if(!confirm('Permanently delete this property? This cannot be undone.'))return;setDeleting(true);try{await api.delete(`/admin/properties/${propId}`);navigate('/admin/properties');}catch{setDeleting(false);}}}
            disabled={deleting}
            className="btn-sm bg-red-600 text-white hover:bg-red-700"><Trash2 size={13}/>{deleting?'…':'Delete Property'}</button>
        </div>
      </div>

      {/* Nearby properties warning — shown when GPS present */}
      {prop.nearby && prop.nearby.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5"/>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-800 text-sm">Possible duplicate — {prop.nearby.length} nearby listing{prop.nearby.length>1?'s':''} within 200 m</p>
              <p className="text-xs text-amber-700 mt-0.5 mb-3">Review these before approving to confirm this is a genuinely new listing:</p>
              <div className="space-y-1.5">
                {prop.nearby.map(n => (
                  <div key={n.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 text-xs border border-amber-200">
                    <span className="font-medium text-slate-800">{n.name}</span>
                    <div className="flex items-center gap-3 text-slate-500">
                      <span>{n.area||'—'}</span>
                      <StatusBadge status={n.status}/>
                      <span className="font-mono text-amber-700">{Math.round(n.distance_m)} m away</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GPS coordinates badge */}
      {prop.latitude && prop.longitude && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <MapPin size={13} className="text-green-600"/>
          <span className="font-mono bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded">
            GPS: {parseFloat(prop.latitude).toFixed(6)}, {parseFloat(prop.longitude).toFixed(6)}
          </span>
          <a href={`https://www.google.com/maps?q=${prop.latitude},${prop.longitude}`} target="_blank" rel="noreferrer"
            className="text-primary hover:underline">View on map →</a>
        </div>
      )}

      {(() => {   // draft banner: what is missing before the house shows on the website
        const rooms = Array.isArray(prop.rooms) ? prop.rooms : [];
        const photoCount = (prop.photos?.length || 0) + rooms.reduce((n, r) => n + (r.photos?.length || 0), 0);
        const priced = rooms.some(r => Number(r.monthly_price) > 0);
        if (photoCount && priced) return null;
        return (
          <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <b>Draft: not on the website yet.</b> It goes live by itself once it has{' '}
            {[!photoCount && 'at least one photo (use Add photos below)', !priced && 'a room type with a price (Add Room)'].filter(Boolean).join(' and ')}.
          </div>
        );
      })()}
      <HousePhotos propertyId={prop.id} photos={Array.isArray(prop.photos) ? prop.photos : []} onChange={load} />

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
          <h4 className="font-semibold text-slate-800 text-sm mb-3">Property Details</h4>
          <div className="text-xs space-y-1.5 text-slate-600">
            <div><span className="text-slate-400">Type:</span> {prop.property_type}</div>
            <div><span className="text-slate-400">Address:</span> {prop.address||'—'}</div>
            {prop.highlight && <div><span className="text-slate-400">Highlight:</span> <em>{prop.highlight}</em></div>}
            <div><span className="text-slate-400">University:</span> {prop.university_name}</div>
            <div><span className="text-slate-400">Zone:</span> {prop.zone_code} — {prop.zone_name}</div>
          </div>
          {prop.description && <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">{prop.description}</p>}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
          <h4 className="font-semibold text-slate-800 text-sm mb-3">Owner / Manager</h4>
          <div className="text-xs space-y-1.5 text-slate-600">
            <div><span className="text-slate-400">Owner:</span> {prop.owner_name || '—'}</div>
            <div><span className="text-slate-400">Phone:</span> {prop.owner_phone || '—'}</div>
            <div><span className="text-slate-400">Email:</span> {prop.owner_email || '—'}</div>
            {prop.manager && <div><span className="text-slate-400">Manager:</span> {prop.manager.name} · {prop.manager.phone}</div>}
          </div>
        </div>
      </div>

      {/* Rooms */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-slate-800 text-sm">Room Types ({prop.rooms?.length || 0})</h4>
          <button onClick={() => { setEditRoom(null); setRf({ room_type:'Single', monthly_price:'', deposit_months:'1', capacity:'1', total_count:'1', available_count:'1', furnished:false, bathroom_type:'Shared' }); setAddRoom(v=>!v); }}
            className="btn-sm bg-primary text-white hover:bg-primary/90"><Plus size={13}/>Add Room</button>
        </div>

        {/* Add/Edit room form */}
        {addRoomOpen && (
          <form onSubmit={saveRoom} className="bg-slate-50 rounded-xl p-4 mb-4 space-y-3">
            <p className="font-semibold text-sm text-slate-700">{editRoom ? 'Edit Room' : 'New Room'}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Type</label>
                <select className="input" value={rf.room_type} onChange={e=>setRf(p=>({...p,room_type:e.target.value}))}>
                  {RTYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Price/month (TZS)</label>
                <input className="input" type="number" value={rf.monthly_price} onChange={e=>setRf(p=>({...p,monthly_price:e.target.value}))} required />
              </div>
              <div>
                <label className="label">Deposit (months of rent)</label>
                <input className="input" type="number" min="1" max="12" value={rf.deposit_months} onChange={e=>setRf(p=>({...p,deposit_months:e.target.value}))} placeholder="1" />
              </div>
              <div className="flex items-end pb-1">
                <p className="text-xs text-slate-500">
                  {rf.monthly_price && rf.deposit_months
                    ? <>Deposit = <span className="font-semibold text-primary">TZS {(Number(rf.monthly_price)*Number(rf.deposit_months)).toLocaleString()}</span></>
                    : 'Enter price to calculate'}
                </p>
              </div>
              <div>
                <label className="label">Total Rooms</label>
                <input className="input" type="number" min="1" value={rf.total_count}
                  onChange={e=>setRf(p=>({...p,total_count:e.target.value, available_count: e.target.value}))} />
              </div>
              <div>
                <label className="label">Available (vacant)</label>
                <input className="input" type="number" min="0" value={rf.available_count}
                  onChange={e=>setRf(p=>({...p,available_count:e.target.value}))} />
              </div>
              <div>
                <label className="label">Capacity/Room</label>
                <input className="input" type="number" min="1" value={rf.capacity} onChange={e=>setRf(p=>({...p,capacity:e.target.value}))} />
              </div>
              <div>
                <label className="label">Bathroom</label>
                <select className="input" value={rf.bathroom_type} onChange={e=>setRf(p=>({...p,bathroom_type:e.target.value}))}>
                  <option>Shared</option><option>Private</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={rf.furnished} onChange={e=>setRf(p=>({...p,furnished:e.target.checked}))} className="w-4 h-4 accent-primary" />
              Furnished
            </label>
            {err && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</div>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-sm bg-primary text-white"><Save size={13}/>{saving?'…':'Save'}</button>
              <button type="button" onClick={() => { setAddRoom(false); setEditRoom(null); }} className="btn-sm border border-slate-200 text-slate-600">Cancel</button>
            </div>
          </form>
        )}

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          {(!prop.rooms || prop.rooms.length === 0) && (
            <div className="px-4 py-6 text-center text-slate-400 text-sm">No rooms yet. Add a room type above.</div>
          )}
          {prop.rooms?.map(r => (
            <RoomRow key={r.id} r={r} fmt={fmt} onEdit={startEdit} onDel={delRoom} onReload={load} />
          ))}
        </div>
      </div>

      {/* Tenants */}
      {prop.tenants?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 text-sm mb-4">Tenants ({prop.tenants.length})</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead><tr className="border-b border-slate-100">
                {['Name','Phone','Room','Rent/mo','Lease End','Status'].map(h=>(
                  <th key={h} className="py-2 pr-4 text-left text-slate-500 font-semibold">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {prop.tenants.map(t => (
                  <tr key={t.id}>
                    <td className="py-2 pr-4 font-medium">{t.name}</td>
                    <td className="py-2 pr-4 text-slate-500">{t.phone}</td>
                    <td className="py-2 pr-4">{t.room_type}</td>
                    <td className="py-2 pr-4 text-primary font-semibold">TZS {fmt(t.monthly_rent)}</td>
                    <td className="py-2 pr-4 text-slate-400">{t.lease_end||'—'}</td>
                    <td className="py-2 pr-4"><span className={`badge text-[10px] ${t.status==='active'?'badge-green':t.status==='vacated'?'badge-gray':'badge-red'}`}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Users
// Customer care resets a password and passes the new one on (WhatsApp or phone): there is no SMS.
function ResetPasswordSheet({ user, onClose }) {
  const [busy, setBusy]     = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError]   = useState('');
  const reset = async () => {
    setBusy(true); setError('');
    try { const { data } = await api.post(`/admin/users/${user.id}/reset-password`); setResult(data); }
    catch (e) { setError(e.response?.data?.message || 'Could not reset the password. Try again.'); }
    finally { setBusy(false); }
  };
  return (
    <Sheet title="Reset password" icon={KeyRound} onClose={onClose}
      footer={result
        ? <button onClick={onClose} className="btn-primary w-full justify-center min-h-[48px]">Done</button>
        : <button onClick={reset} disabled={busy} className="btn-primary w-full justify-center min-h-[48px]">
            {busy ? <><Loader2 size={16} className="animate-spin"/>Resetting…</> : 'Reset password'}
          </button>}>
      {result ? (
        <LoginDetails title={<>New password for <b>{result.name}</b>. The old password no longer works.</>}
          phone={result.phone} password={result.temp_password} />
      ) : (
        <div className="space-y-4 text-sm text-slate-700">
          <p>Reset the password for <b>{user.name}</b> ({user.phone})?</p>
          <p className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2.5">
            First make sure you are talking to the account owner: the message or call should come from {user.phone}.
          </p>
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </Sheet>
  );
}

function UsersList() {
  const { isAdmin, isSeniorStaff } = useAuth();
  const [q, setQ]           = useState('');
  const [resetFor, setResetFor] = useState(null);
  const [users, setUsers]   = useState([]);
  const [role, setRole]     = useState('property_owner');
  const [loading, setLoading] = useState(true);
  const [ofForm, setOfForm] = useState({ name:'', phone:'', email:'', password:'', zone_id:'' });
  const [ofErr, setOfErr]   = useState('');
  const [ofSub, setOfSub]   = useState(false);
  const [zones, setZones]   = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/users', { params: { role } })
      .then(r => { setUsers(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [role]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (role === 'geto_officer' && zones.length === 0)
      api.get('/zones').then(r => setZones(r.data)).catch(()=>{});
  }, [role]);

  const verify = async (id) => {
    await api.put(`/admin/users/${id}/verify`);
    load();
  };
  const suspend = async (id) => {
    if (!confirm('Suspend this account?')) return;
    await api.put(`/admin/users/${id}/suspend`);
    load();
  };
  const createOfficer = async (e) => {
    e.preventDefault(); setOfErr(''); setOfSub(true);
    try {
      await api.post('/admin/users/geto-officer', ofForm);
      setOfForm({ name:'', phone:'', email:'', password:'', zone_id:'' });
      load();
    } catch(e) { setOfErr(e.response?.data?.message || 'An error occurred.'); }
    finally { setOfSub(false); }
  };

  // Search by name, email or phone; phone matches in any format (07…, 255…, +255 …)
  const qDigits = q.replace(/\D/g, '').replace(/^(255|0)/, '');
  const shown = users.filter(u => !q.trim()
    || [u.name, u.email, u.username].some(v => (v || '').toLowerCase().includes(q.trim().toLowerCase()))
    || (qDigits.length >= 3 && String(u.phone || '').replace(/\D/g, '').includes(qDigits)));
  const canReset = (u) => isAdmin || (isSeniorStaff && ['student','property_owner','property_manager'].includes(u.role || role));

  return (
    <div className="p-4 sm:p-5 lg:p-8">
      {resetFor && <ResetPasswordSheet user={resetFor} onClose={() => setResetFor(null)} />}
      <div className="flex flex-wrap gap-2 mb-5">
        {['student','property_owner','property_manager','geto_officer','zone_manager'].map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${role===r?'bg-primary text-white':'bg-white border border-slate-200 text-slate-600 hover:border-primary'}`}>
            {r==='student'?'Students':r==='property_owner'?'Owners':r==='property_manager'?'Managers':r==='geto_officer'?'Geto Officers':r==='zone_manager'?'Zone Managers':'All'}
          </button>
        ))}
      </div>
      {role === 'geto_officer' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 max-w-lg">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><UserPlus size={16}/>Create Geto Officer</h3>
          <form onSubmit={createOfficer} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Name *</label><input className="input" required value={ofForm.name} onChange={e=>setOfForm(p=>({...p,name:e.target.value}))}/></div>
              <div><label className="label">Phone *</label><input className="input" required value={ofForm.phone} onChange={e=>setOfForm(p=>({...p,phone:e.target.value}))}/></div>
              <div><label className="label">Email</label><input className="input" type="email" value={ofForm.email} onChange={e=>setOfForm(p=>({...p,email:e.target.value}))}/></div>
              <div><label className="label">Password *</label><input className="input" type="password" required value={ofForm.password} onChange={e=>setOfForm(p=>({...p,password:e.target.value}))}/></div>
            </div>
            <div>
              <label className="label">Zone</label>
              <select className="input" value={ofForm.zone_id} onChange={e=>setOfForm(p=>({...p,zone_id:e.target.value}))}>
                <option value="">Select zone…</option>
                {zones.map(z=><option key={z.id} value={z.id}>{z.code} — {z.name}</option>)}
              </select>
            </div>
            {ofErr && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{ofErr}</div>}
            <button type="submit" disabled={ofSub} className="btn-primary text-sm">{ofSub?'Creating…':'Create Account'}</button>
          </form>
        </div>
      )}

      <div className="relative mb-4 max-w-md">
        <label htmlFor="user-search" className="sr-only">Search users</label>
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true"/>
        <input id="user-search" className="input pl-9 text-base sm:text-sm min-h-[44px]" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search name or phone (any format)" autoComplete="off"/>
      </div>
      {loading ? <Spinner /> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Name','Email','Phone','Status','Properties','ID Docs','Action'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No users found</td></tr>}
              {shown.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3 text-slate-500">{u.phone}</td>
                  <td className="px-4 py-3">
                    {u.status === 'active' && u.verified ? <span className="badge-green">Verified</span>
                     : u.status === 'pending_verification' ? <span className="badge-amber">Pending</span>
                     : u.status === 'suspended' ? <span className="badge-red">Suspended</span>
                     : <span className="badge-gray">Active</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.property_count || 0}</td>
                  <td className="px-4 py-3">
                    {(u.id_front_url || u.id_back_url) ? (
                      <div className="flex gap-1.5">
                        {u.id_front_url && (
                          <a href={u.id_front_url} target="_blank" rel="noreferrer"
                            className="block w-10 h-10 rounded-lg overflow-hidden border border-slate-200 hover:border-primary transition-colors shrink-0">
                            <img src={u.id_front_url} alt="ID front" className="w-full h-full object-cover"/>
                          </a>
                        )}
                        {u.id_back_url && (
                          <a href={u.id_back_url} target="_blank" rel="noreferrer"
                            className="block w-10 h-10 rounded-lg overflow-hidden border border-slate-200 hover:border-primary transition-colors shrink-0">
                            <img src={u.id_back_url} alt="ID back" className="w-full h-full object-cover"/>
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">No ID</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {u.status === 'pending_verification' && (
                        <button onClick={() => verify(u.id)} className="btn-sm bg-green-600 text-white hover:bg-green-700 text-xs"><Check size={12}/>Verify</button>
                      )}
                      {u.status === 'active' && (
                        <button onClick={() => suspend(u.id)} className="btn-sm border border-red-200 text-red-600 hover:bg-red-50 text-xs">Suspend</button>
                      )}
                      {canReset(u) && (
                        <button onClick={() => setResetFor({ ...u, role: u.role || role })} className="btn-sm border border-slate-300 text-slate-700 hover:border-primary hover:text-primary text-xs whitespace-nowrap">
                          <KeyRound size={12}/>Reset password
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Booking status badge (full new state machine) ─────────────
function BookingStatusBadge({ status }) {
  const cfg = {
    pending:           { cls: 'bg-amber-100 text-amber-800 border border-amber-200',      label: 'Pending' },
    assigned:          { cls: 'bg-blue-100 text-blue-800 border border-blue-200',          label: 'Assigned' },
    accepted:          { cls: 'bg-cyan-100 text-cyan-800 border border-cyan-200',          label: 'Accepted' },
    payment_pending:   { cls: 'bg-orange-100 text-orange-800 border border-orange-200',    label: 'Payment Pending' },
    payment_confirmed: { cls: 'bg-violet-100 text-violet-800 border border-violet-200',    label: 'Payment Confirmed' },
    student_confirmed: { cls: 'bg-indigo-100 text-indigo-800 border border-indigo-200',    label: 'Student Confirmed' },
    active:            { cls: 'bg-green-100 text-green-800 border border-green-200',        label: 'Active' },
    confirmed:         { cls: 'bg-green-100 text-green-800 border border-green-200',        label: 'Confirmed' },
    checked_in:        { cls: 'bg-emerald-100 text-emerald-800 border border-emerald-200', label: 'Checked In' },
    move_in_completed: { cls: 'bg-emerald-100 text-emerald-800 border border-emerald-200', label: 'Moved In' },
    move_out_requested:{ cls: 'bg-amber-100 text-amber-800 border border-amber-200',       label: 'Move-Out Req.' },
    move_out_completed:{ cls: 'bg-slate-100 text-slate-600 border border-slate-200',       label: 'Moved Out' },
    checked_out:       { cls: 'bg-slate-100 text-slate-600 border border-slate-200',       label: 'Checked Out' },
    rejected:          { cls: 'bg-red-100 text-red-700 border border-red-200',             label: 'Rejected' },
    cancelled:         { cls: 'bg-red-100 text-red-700 border border-red-200',             label: 'Cancelled' },
  };
  const c = cfg[status] || { cls: 'bg-slate-100 text-slate-600', label: status };
  return <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.cls}`}>{c.label}</span>;
}

// ─── Assign GM modal ────────────────────────────────────────────
function AssignGMModal({ booking, onClose, onSaved }) {
  const [detail, setDetail]   = useState(null);
  const [gmList, setGMList]   = useState([]);
  const [gmQ, setGMQ]         = useState('');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get(`/admin/bookings/${booking.id}`).then(r => {
      setDetail(r.data);
      if (r.data.suggested_gm) setSelected(r.data.suggested_gm);
    }).catch(()=>{});
    api.get('/admin/staff').then(r => setGMList(r.data.filter(u=>u.role==='geto_officer'||u.role==='geto_manager'))).catch(()=>{});
  }, [booking.id]);

  const filteredGMs = gmQ
    ? gmList.filter(g => g.name.toLowerCase().includes(gmQ.toLowerCase()) || (g.phone||'').includes(gmQ))
    : gmList;

  const save = async () => {
    if (!selected) { setError('Select a Geto Officer.'); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/admin/bookings/${booking.id}/assign-geto`, { assigned_to: selected.id });
      onSaved();
      onClose();
    } catch(e) {
      setError(e.response?.data?.message || 'Failed to assign.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-primary px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <UserCog size={18}/>
            <h3 className="font-display font-bold">Assign Geto Officer</h3>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3">
            <div className="font-semibold text-slate-900">{booking.student_name}</div>
            <div className="text-xs mt-0.5">{booking.property_name} · {booking.room_type}</div>
          </div>

          {detail?.suggested_gm && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <div className="text-xs font-semibold text-emerald-700 mb-1">Auto-suggested</div>
              <button onClick={()=>setSelected(detail.suggested_gm)}
                className={`w-full flex items-center gap-3 text-left transition-all ${selected?.id===detail.suggested_gm.id?'ring-2 ring-emerald-400 rounded-xl p-1':''}`}>
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  {detail.suggested_gm.name?.[0]}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{detail.suggested_gm.name}</div>
                  <div className="text-xs text-slate-500">{detail.suggested_gm.phone} · {detail.suggested_gm.referral_code}</div>
                </div>
                {selected?.id===detail.suggested_gm.id && <BadgeCheck size={16} className="text-emerald-500 shrink-0"/>}
              </button>
            </div>
          )}

          <div>
            <label className="label">Search All Geto Officers</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input className="input pl-8 text-sm" placeholder="Name or phone…" value={gmQ} onChange={e=>setGMQ(e.target.value)}/>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            {filteredGMs.length === 0
              ? <div className="text-center py-6 text-sm text-slate-400">No managers found</div>
              : filteredGMs.map(g => (
                <button key={g.id} onClick={()=>setSelected(g)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 text-left transition-colors
                    ${selected?.id===g.id ? 'bg-primary/5' : 'hover:bg-slate-50'}`}>
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {g.name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-800 truncate">{g.name}</div>
                    <div className="text-xs text-slate-400">{g.referral_code || g.phone}</div>
                  </div>
                  {selected?.id===g.id && <Check size={14} className="text-primary shrink-0"/>}
                </button>
              ))
            }
          </div>

          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
            <button onClick={save} disabled={saving||!selected} className="btn-primary flex-1 justify-center">
              {saving ? <><Loader2 size={14} className="animate-spin mr-1"/>Assigning…</> : 'Assign GM'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Snippe payment modal (USSD push) — 2-step flow ───────────
function SnippePaymentModal({ booking, onClose, onSent }) {
  const autoDeposit   = !!booking.owner_auto_payout;
  const depositMonths = booking.deposit_months || 1;
  const monthly       = Number(booking.monthly_price) || 0;
  const isHostel      = (booking.property_type || '').toLowerCase() === 'hostel';
  const getoFeeRate   = isHostel ? 0.75 : 1.0;
  const depositAmount = autoDeposit ? monthly * depositMonths : 0;
  const getoFee       = isHostel ? Math.round(monthly * 0.75) : monthly;
  const subtotal      = depositAmount + getoFee;

  const [step, setStep]       = useState('details'); // 'details' | 'confirm' | 'sent'
  const [phone, setPhone]     = useState(booking.student_phone || '');
  const [txFee, setTxFee]     = useState(null);
  const [feeLoading, setFL]   = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');
  const [sent, setSent]       = useState(null);

  const proceed = async () => {
    if (!phone.trim()) { setError('Phone number is required.'); return; }
    setError(''); setFL(true); setStep('confirm');
    try {
      const r = await api.get(`/payments/fee?amount=${subtotal}`);
      setTxFee(r.data.fee ?? 0);
    } catch { setTxFee(Math.round(subtotal * 0.015)); }
    finally { setFL(false); }
  };

  const send = async () => {
    setSending(true); setError('');
    try {
      const r = await api.post('/payments/initiate', { booking_id: booking.id, phone: phone.trim() });
      setSent(r.data); onSent(); setStep('sent');
    } catch(e) {
      setError(e.response?.data?.message || 'Failed to send payment request.');
    } finally { setSending(false); }
  };

  const total = subtotal + (txFee || 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-violet-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Smartphone size={18}/>
            <h3 className="font-display font-bold">Request Payment</h3>
          </div>
          {step !== 'sent' && <button onClick={onClose} className="text-white/60 hover:text-white"><X size={18}/></button>}
        </div>

        {/* Step 1: details + phone */}
        {step === 'details' && (
          <div className="p-5 space-y-4">
            <div className="text-sm bg-slate-50 rounded-xl px-4 py-3">
              <div className="font-semibold text-slate-900">{booking.student_name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{booking.property_name} · {booking.room_type} · TZS {monthly.toLocaleString()}/mo</div>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-2">
              <div className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-2">Amount Due</div>
              {autoDeposit ? (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Deposit ({depositMonths} mo × TZS {monthly.toLocaleString()})</span>
                  <span className="font-semibold">TZS {depositAmount.toLocaleString()}</span>
                </div>
              ) : (
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  Deposit paid directly to owner (off-system)
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Geto service fee <span className="text-slate-400 text-xs">({isHostel ? '75%' : '1 month'})</span></span>
                <span className="font-semibold">TZS {getoFee.toLocaleString()}</span>
              </div>
              <div className="border-t border-violet-200 pt-2 flex justify-between">
                <span className="font-bold text-slate-800">Subtotal</span>
                <span className="font-bold text-violet-700 text-base">TZS {subtotal.toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-0.5">Transaction fee will be shown on the next step.</p>
            </div>
            <div>
              <label className="label">Student Mobile Number</label>
              <input type="tel" className="input" placeholder="e.g. 0712 345 678"
                value={phone} onChange={e => { setPhone(e.target.value); setError(''); }}/>
              <p className="text-xs text-slate-400 mt-1">A USSD prompt will be pushed to this number.</p>
            </div>
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
              <button onClick={proceed}
                className="flex-1 justify-center bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors text-sm">
                Proceed <ChevronRight size={15}/>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: transaction fee reveal + confirm */}
        {step === 'confirm' && (
          <div className="p-5 space-y-4">
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm">
              <div className="text-xs text-slate-400 mb-0.5">Sending USSD push to</div>
              <div className="font-bold text-slate-900">{phone}</div>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{autoDeposit ? 'Deposit + Geto fee' : 'Geto service fee'}</span>
                <span className="font-semibold">TZS {subtotal.toLocaleString()}</span>
              </div>
              {/* Transaction fee callout */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex justify-between items-center gap-3">
                <div>
                  <div className="text-xs font-bold text-amber-700">+ Snippe Transaction Fee</div>
                  <div className="text-[11px] text-amber-600">Charged by payment processor</div>
                </div>
                <span className="font-bold text-amber-700 shrink-0">
                  {feeLoading ? <Loader2 size={14} className="animate-spin"/> : `TZS ${(txFee||0).toLocaleString()}`}
                </span>
              </div>
              <div className="border-t border-violet-200 pt-2 flex justify-between">
                <span className="font-bold text-slate-800">Total Charged to Student</span>
                <span className="font-bold text-violet-700 text-lg">
                  {feeLoading ? '…' : `TZS ${total.toLocaleString()}`}
                </span>
              </div>
            </div>
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setStep('details'); setError(''); }}
                className="btn-outline flex-1 justify-center"><ChevronLeft size={14}/> Back</button>
              <button onClick={send} disabled={sending || feeLoading}
                className="flex-1 justify-center bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors text-sm">
                {sending
                  ? <><Loader2 size={14} className="animate-spin"/>Sending…</>
                  : <><SendHorizonal size={14}/>Confirm & Send USSD</>}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: success */}
        {step === 'sent' && sent && (
          <div className="p-5 space-y-4">
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 text-center">
              <CheckCircle2 size={36} className="text-violet-600 mx-auto mb-2"/>
              <p className="text-sm font-semibold text-slate-800">Payment request sent!</p>
              <p className="text-lg font-bold text-violet-700 mt-1">{sent.phone}</p>
              <p className="text-xs text-slate-500 mt-2">
                Student will receive a USSD prompt to pay{' '}
                <span className="font-semibold">TZS {Number(sent.breakdown?.total || total).toLocaleString()}</span>
              </p>
            </div>
            {sent.snippe_ref && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
                <Clock size={11}/><span>Ref: <span className="font-mono text-slate-700">{sent.snippe_ref}</span></span>
              </div>
            )}
            <button onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Record Payment modal ───────────────────────────────────────
function RecordPaymentModal({ booking, onClose, onSaved }) {
  const depositMonths = booking.deposit_months || 1;
  const suggestedAmount = booking.monthly_price ? booking.monthly_price * depositMonths : '';
  const [step, setStep]   = useState('payment'); // 'payment' | 'photo'
  const [form, setForm] = useState({
    amount_paid: suggestedAmount || '',
    contract_start: booking.move_in_date || '',
    contract_end: '',
    receipt_ref: '',
    payment_note: '',
    room_unit_id: '',
  });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [units, setUnits]         = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const setF = (k,v) => setForm(p=>({...p,[k]:v}));

  useEffect(() => {
    if (!booking.property_id) return;
    api.get(`/admin/properties/${booking.property_id}/room-units`)
      .then(r => {
        const available = (r.data || []).filter(u =>
          u.room_type_id === booking.room_id && Number(u.available_slots) > 0
        );
        setUnits(available);
      }).catch(() => {});
  }, [booking.property_id, booking.room_id]);

  const save = async (e) => {
    e.preventDefault();
    if (!form.amount_paid || !form.contract_start || !form.contract_end) {
      setError('Amount, contract start and end are required.'); return;
    }
    setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.room_unit_id) delete payload.room_unit_id;
      await api.post(`/admin/bookings/${booking.id}/confirm-payment`, payload);
      onSaved();
      setStep('photo'); // advance to optional photo step
      setSaving(false);
    } catch(err) {
      setError(err.response?.data?.message || 'Failed to record payment.');
      setSaving(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async () => {
    if (!photoFile) { onClose(); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', photoFile);
      await api.post(`/admin/bookings/${booking.id}/tenant-photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch(_) { /* non-fatal — photo is optional */ }
    setUploading(false);
    onClose();
  };

  if (step === 'photo') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Camera size={18}/>
              <h3 className="font-display font-bold">Tenant Photo</h3>
            </div>
            <span className="text-white/70 text-xs">Optional</span>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-600">
              Take or upload a photo of <strong>{booking.student_name}</strong>. It will appear when the QR code is scanned.
            </p>
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="preview" className="w-full max-h-52 object-cover rounded-xl border border-slate-200"/>
                <button onClick={()=>{setPhotoFile(null);setPhotoPreview(null);}}
                  className="absolute top-2 right-2 bg-white/80 rounded-full p-1 text-slate-600 hover:text-red-500">
                  <X size={14}/>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-3 border-2 border-dashed border-slate-300 rounded-xl p-6 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                <ImagePlus size={28} className="text-slate-400"/>
                <span className="text-sm text-slate-500 text-center">
                  Tap to take a photo or choose from gallery
                </span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange}/>
              </label>
            )}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-xl border border-slate-200 flex-1 justify-center">
                <SkipForward size={13}/>Skip
              </button>
              <button onClick={uploadPhoto} disabled={uploading || !photoFile}
                className="flex-1 justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-sm">
                {uploading ? <><Loader2 size={14} className="animate-spin"/>Uploading…</> : <><Upload size={14}/>Save Photo</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <CreditCard size={18}/>
            <h3 className="font-display font-bold">Record Payment</h3>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={18}/></button>
        </div>
        <div className="p-5">
          <div className="text-sm bg-slate-50 rounded-xl px-4 py-3 mb-4">
            <div className="font-semibold text-slate-900">{booking.student_name}</div>
            <div className="text-xs text-slate-500 mt-0.5">{booking.property_name} · {booking.room_type} · TZS {Number(booking.monthly_price).toLocaleString()}/mo</div>
          </div>
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="label">Amount Paid (TZS) <span className="text-red-500">*</span></label>
              <input type="number" className="input" placeholder="e.g. 350000" value={form.amount_paid} onChange={e=>setF('amount_paid',e.target.value)} required/>
              {booking.monthly_price && <p className="text-xs text-slate-400 mt-1">Deposit: {depositMonths} mo × TZS {Number(booking.monthly_price).toLocaleString()} = TZS {(booking.monthly_price*depositMonths).toLocaleString()}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Contract Start <span className="text-red-500">*</span></label>
                <input type="date" className="input" value={form.contract_start} onChange={e=>setF('contract_start',e.target.value)} required/>
              </div>
              <div>
                <label className="label">Contract End <span className="text-red-500">*</span></label>
                <input type="date" className="input" value={form.contract_end} onChange={e=>setF('contract_end',e.target.value)} required/>
              </div>
            </div>
            <div>
              <label className="label">Assign Room Unit {units.length > 0 ? `(${units.length} available)` : '(none listed)'}</label>
              <select className="input" value={form.room_unit_id} onChange={e=>setF('room_unit_id',e.target.value)}>
                <option value="">— Not assigned yet —</option>
                {units.map(u=>(
                  <option key={u.id} value={u.id}>
                    Unit {u.unit_number}{u.floor ? ` · Fl ${u.floor}` : ''} · {u.available_slots} bed{Number(u.available_slots)!==1?'s':''} free
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Receipt / M-Pesa Reference</label>
              <input type="text" className="input" placeholder="e.g. MPESA123XYZ" value={form.receipt_ref} onChange={e=>setF('receipt_ref',e.target.value)}/>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} placeholder="Optional notes about this payment…" value={form.payment_note} onChange={e=>setF('payment_note',e.target.value)}/>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-xs text-blue-700">
              After recording, the student must log in and confirm — their QR code activates at that point.
            </div>
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-sm">
                {saving ? <><Loader2 size={14} className="animate-spin"/>Saving…</> : <><CreditCard size={14}/>Record Payment</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Booking detail side panel ──────────────────────────────────
function BookingDetailPanel({ bookingId, onClose, onAction, isSeniorStaff, isGetoManager }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign]         = useState(false);
  const [showSnippePayment, setShowSnippeP] = useState(false);
  const [cancelling, setCancelling]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get(`/admin/bookings/${bookingId}`); setDetail(r.data); }
    catch { setDetail(null); }
    finally { setLoading(false); }
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  const cancel = async () => {
    if (!confirm('Cancel this booking? This cannot be undone.')) return;
    setCancelling(true);
    try { await api.delete(`/admin/bookings/${bookingId}`); onAction(); onClose(); }
    catch(e) { alert(e.response?.data?.message || 'Failed.'); setCancelling(false); }
  };

  const canAssign        = isSeniorStaff && detail && ['pending','assigned','accepted','payment_pending'].includes(detail.status);
  const canSnippePayment = detail && ['assigned','accepted','payment_pending'].includes(detail.status) &&
    Number(detail?.monthly_price) > 0 && (isSeniorStaff || (isGetoManager && detail.assigned_to_id));
  const canCancel        = isSeniorStaff && detail && !['cancelled','checked_out','move_out_completed'].includes(detail.status);

  return (
    <>
      {showAssign && <AssignGMModal booking={detail} onClose={()=>setShowAssign(false)} onSaved={()=>{load();onAction();}}/>}
      {showSnippePayment && <SnippePaymentModal booking={detail} onClose={()=>setShowSnippeP(false)} onSent={()=>{load();onAction();}}/>}

      <div className="flex flex-col h-full bg-white border-l border-slate-200 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-primary"/>
            <span className="font-display font-semibold text-slate-800 text-sm">Booking Detail</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors"><X size={16}/></button>
        </div>

        {loading && <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-primary"/></div>}

        {!loading && !detail && (
          <div className="text-center py-16 text-slate-400">
            <AlertCircle size={28} className="mx-auto mb-2"/>
            <p className="text-sm">Could not load booking.</p>
          </div>
        )}

        {!loading && detail && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Status + ID */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Booking #{detail.id}</div>
                <div className="text-xs text-slate-500 mt-0.5">{detail.created_at ? new Date(detail.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : ''}</div>
              </div>
              <BookingStatusBadge status={detail.status}/>
            </div>

            {/* Student */}
            <div className="bg-primary/5 rounded-2xl p-4">
              <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Student</div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                  {detail.student_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{detail.student_name}</div>
                  {detail.student_username && <div className="text-xs text-primary">@{detail.student_username}</div>}
                </div>
              </div>
              <div className="space-y-1.5">
                {detail.student_phone && (
                  <a href={`tel:${detail.student_phone}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-primary">
                    <Phone size={12}/> {detail.student_phone}
                  </a>
                )}
                {detail.student_email && (
                  <a href={`mailto:${detail.student_email}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-primary">
                    <Mail size={12}/> {detail.student_email}
                  </a>
                )}
                {detail.student_university && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <GraduationCap size={12}/> {detail.student_university}
                  </div>
                )}
              </div>
            </div>

            {/* Property + Room */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Accommodation</div>
              <div className="flex items-center gap-2 text-slate-800">
                <Building2 size={14} className="text-primary shrink-0"/>
                <span className="font-semibold text-sm">{detail.property_name}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <MapPin size={11}/> {detail.area}
              </div>
              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <BedDouble size={11}/> <span className="capitalize">{detail.room_type}</span>
              </div>
              <div className="font-semibold text-primary text-sm">TZS {Number(detail.monthly_price).toLocaleString()}/mo</div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl px-3 py-3">
                <div className="text-[10px] text-slate-400 mb-1">Move-in</div>
                <div className="font-semibold text-sm text-slate-800">{detail.move_in_date || '—'}</div>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-3">
                <div className="text-[10px] text-slate-400 mb-1">Contract End</div>
                <div className="font-semibold text-sm text-slate-800">{detail.contract_end || '—'}</div>
              </div>
            </div>

            {/* Payment info */}
            {detail.amount_paid && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-1.5">
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2">Payment Recorded</div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-bold text-emerald-700">TZS {Number(detail.amount_paid).toLocaleString()}</span>
                </div>
                {detail.payment_receipt_ref && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Ref</span>
                    <span className="font-mono text-slate-700">{detail.payment_receipt_ref}</span>
                  </div>
                )}
                {detail.payment_note && (
                  <div className="text-xs text-slate-500 italic">"{detail.payment_note}"</div>
                )}
                {detail.payment_confirmed_by_name && (
                  <div className="text-xs text-slate-400">Confirmed by {detail.payment_confirmed_by_name}</div>
                )}
              </div>
            )}

            {/* Assigned GM */}
            {detail.assigned_to_name && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Assigned Geto Officer</div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {detail.assigned_to_name?.[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-800">{detail.assigned_to_name}</div>
                    <div className="text-xs text-slate-500">{detail.assigned_to_phone}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Staff booking note */}
            {detail.booked_by_staff_name && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                Booked by staff: <span className="font-semibold">{detail.booked_by_staff_name}</span> ({detail.booked_by_staff_role})
                — student must confirm
              </div>
            )}

            {/* Zone */}
            {detail.zone_code && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPin size={12}/> Zone <span className="font-bold text-primary">{detail.zone_code}</span>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-1">
              {canAssign && (
                <button onClick={()=>setShowAssign(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                  <UserCog size={15}/>
                  {detail.assigned_to_name ? 'Re-assign Geto Officer' : 'Assign Geto Officer'}
                </button>
              )}
              {canSnippePayment && (
                <button onClick={()=>setShowSnippeP(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
                  <Smartphone size={15}/>Request Payment (USSD)
                </button>
              )}
              {canCancel && (
                <button onClick={cancel} disabled={cancelling}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">
                  {cancelling ? <><Loader2 size={14} className="animate-spin"/>Cancelling…</> : <><XCircle size={15}/>Cancel Booking</>}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Bookings — full management view ───────────────────────────
function BookingsList() {
  const { isSeniorStaff, isGetoManager, user } = useAuth();
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilter] = useState('all');
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null); // booking id for detail panel
  const [showBookFor, setShowBookFor] = useState(false);

  const STATUS_TABS = [
    { id: 'all',               label: 'All' },
    { id: 'pending',           label: 'Pending' },
    { id: 'assigned',          label: 'Assigned' },
    { id: 'payment_pending',   label: 'Awaiting Payment' },
    { id: 'payment_confirmed', label: 'Payment Confirmed' },
    { id: 'student_confirmed', label: 'Student Confirmed' },
    { id: 'active',            label: 'Active' },
    { id: 'checked_in',        label: 'Checked In' },
    { id: 'rejected',          label: 'Rejected / Cancelled' },
  ];

  const load = useCallback(() => {
    const params = {};
    if (filterStatus !== 'all') {
      params.status = filterStatus === 'rejected' ? 'rejected,cancelled' : filterStatus;
    }
    setLoading(true);
    api.get('/admin/bookings', { params })
      .then(r => { setBookings(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? bookings.filter(b =>
        b.student_name?.toLowerCase().includes(search.toLowerCase()) ||
        b.student_username?.toLowerCase().includes(search.toLowerCase()) ||
        b.student_phone?.includes(search) ||
        b.property_name?.toLowerCase().includes(search.toLowerCase())
      )
    : bookings;

  return (
    <div className="flex flex-col h-full">
      {showBookFor && <RegisterStudent onClose={()=>setShowBookFor(false)} onCreated={load}/>}

      {/* Top bar */}
      <div className="px-5 lg:px-8 pt-5 pb-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg text-slate-900">Bookings</h2>
          <p className="text-xs text-slate-500 mt-0.5">{bookings.length} booking{bookings.length!==1?'s':''} loaded</p>
        </div>
        <button onClick={()=>setShowBookFor(true)}
          className="btn-primary flex items-center gap-2 text-sm shrink-0">
          <BookPlus size={15}/>Register a student
        </button>
      </div>

      {/* Status filter tabs — horizontal scroll */}
      <div className="px-5 lg:px-8 pb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
          {STATUS_TABS.map(t => (
            <button key={t.id} onClick={()=>{ setFilter(t.id); setSelected(null); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border
                ${filterStatus===t.id
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50 hover:text-primary'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-5 lg:px-8 pb-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="input pl-8 text-sm" placeholder="Search student, username, property…"
            value={search} onChange={e=>setSearch(e.target.value)}/>
          {search && <button onClick={()=>setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X size={13}/></button>}
        </div>
      </div>

      {/* Split layout: table + detail panel */}
      <div className={`flex flex-1 overflow-hidden min-h-0 px-5 lg:px-8 pb-8 gap-5 ${selected?'':'pr-5 lg:pr-8'}`}>
        {/* Table */}
        <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white">
          {loading
            ? <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-primary"/></div>
            : (
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr>
                  {['Student','Property / Room','Price','Move-in','Status','GM'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-14 text-slate-400">
                    <CheckSquare size={32} className="mx-auto mb-2 opacity-30"/>No bookings match your filter.
                  </td></tr>
                )}
                {filtered.map(b => (
                  <tr key={b.id}
                    onClick={()=>setSelected(selected===b.id ? null : b.id)}
                    className={`cursor-pointer transition-colors ${selected===b.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 whitespace-nowrap">{b.student_name}</div>
                      <div className="text-xs text-slate-400">
                        {b.student_username && <span className="text-primary">@{b.student_username} · </span>}
                        {b.student_phone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700 whitespace-nowrap">{b.property_name}</div>
                      <div className="text-xs text-slate-400 capitalize">{b.room_type} · {b.area}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary whitespace-nowrap">
                      TZS {Number(b.monthly_price).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{b.move_in_date||'—'}</td>
                    <td className="px-4 py-3"><BookingStatusBadge status={b.status}/></td>
                    <td className="px-4 py-3 text-xs">
                      {b.assigned_to_name
                        ? <span className="text-blue-700 font-medium">{b.assigned_to_name.split(' ')[0]}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 shrink-0 rounded-2xl overflow-hidden border border-slate-200 flex flex-col">
            <BookingDetailPanel
              bookingId={selected}
              onClose={()=>setSelected(null)}
              onAction={load}
              isSeniorStaff={isSeniorStaff}
              isGetoManager={isGetoManager}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Zones & Clusters (admin only)
function ZonesView() {
  const [zones, setZones]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [covForms, setCovForms] = useState({});   // { zoneId: { type:'ward', value:'' } }
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');
  const [zoneForm, setZoneForm] = useState({ code:'', name:'', city:'', description:'' });

  const load = () => {
    api.get('/admin/zones').then(r => { setZones(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const createZone = async (e) => {
    e.preventDefault(); setErr(''); setSaving(true);
    try {
      await api.post('/admin/zones', zoneForm);
      setZoneForm({ code:'', name:'', city:'', description:'' });
      setShowForm(false);
      load();
    } catch(e) { setErr(e.response?.data?.message || 'An error occurred.'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (z) => {
    await api.put(`/admin/zones/${z.id}`, { active: z.active ? 0 : 1 });
    load();
  };

  const addCoverage = async (zoneId, e) => {
    e.preventDefault(); setErr('');
    const f = covForms[zoneId] || { type:'ward', value:'' };
    if (!f.value.trim()) return;
    try {
      await api.post(`/admin/zones/${zoneId}/coverage`, { coverage_type: f.type, coverage_value: f.value.trim() });
      setCovForms(p => ({ ...p, [zoneId]: { type: f.type, value: '' } }));
      load();
    } catch(e) { setErr(e.response?.data?.message || 'Already added.'); }
  };

  const removeCoverage = async (zoneId, covId) => {
    await api.delete(`/admin/zones/${zoneId}/coverage/${covId}`);
    load();
  };

  // Group zones by city
  const byCity = zones.reduce((acc, z) => {
    (acc[z.city] = acc[z.city] || []).push(z);
    return acc;
  }, {});

  if (loading) return <Spinner />;

  return (
    <div className="p-5 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">Zones &amp; Areas</h2>
          <p className="text-sm text-slate-500 mt-0.5">{zones.length} zones · Nationwide</p>
        </div>
        <button onClick={() => { setShowForm(v=>!v); setErr(''); }}
          className="btn-primary text-sm gap-2">
          <Plus size={15}/> Create Zone
        </button>
      </div>

      {/* Create zone form */}
      {showForm && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
          <h3 className="font-display font-bold text-slate-900 mb-4">New Zone</h3>
          <form onSubmit={createZone} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Zone Code (e.g. AA, DOD)</label>
              <input className="input" value={zoneForm.code} required maxLength={5}
                onChange={e => setZoneForm(p=>({...p, code:e.target.value.toUpperCase()}))}
                placeholder="e.g. AA" />
            </div>
            <div>
              <label className="label">Zone Name</label>
              <input className="input" value={zoneForm.name} required
                onChange={e => setZoneForm(p=>({...p, name:e.target.value}))}
                placeholder="e.g. NM-AIST / ATC / Njiro" />
            </div>
            <div>
              <label className="label">City / Region</label>
              <input className="input" value={zoneForm.city} required
                onChange={e => setZoneForm(p=>({...p, city:e.target.value}))}
                placeholder="e.g. Arusha" />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <input className="input" value={zoneForm.description}
                onChange={e => setZoneForm(p=>({...p, description:e.target.value}))}
                placeholder="Brief zone description" />
            </div>
            {err && <div className="sm:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{err}</div>}
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                {saving ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>} Create Zone
              </button>
              <button type="button" onClick={()=>setShowForm(false)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Zones grouped by city */}
      {Object.entries(byCity).map(([city, cityZones]) => (
        <div key={city}>
          <div className="flex items-center gap-2 mb-3">
            <Globe size={15} className="text-accent-600"/>
            <h3 className="font-display font-bold text-slate-700">{city}</h3>
            <span className="text-xs text-slate-400">({cityZones.length} zones)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cityZones.map(z => {
              const isOpen = expanded[z.id];
              const cf = covForms[z.id] || { type:'ward', value:'' };
              const coverage = z.coverage || [];
              const tzRegions = Object.keys(TZ_LOCATIONS).sort();
              const tzDistricts = cf.type === 'district' || cf.type === 'ward'
                ? Object.values(TZ_LOCATIONS).flatMap(r => Object.keys(r)).filter((v,i,a)=>a.indexOf(v)===i).sort()
                : [];
              const tzWards = cf.type === 'ward'
                ? Object.values(TZ_LOCATIONS).flatMap(r => Object.values(r).flat()).filter((v,i,a)=>a.indexOf(v)===i).sort()
                : [];
              const typeOpts = cf.type === 'region' ? tzRegions : cf.type === 'district' ? tzDistricts : tzWards;

              return (
                <div key={z.id} className={`bg-white rounded-2xl border ${z.active ? 'border-slate-200' : 'border-slate-100 opacity-60'} shadow-sm`}>
                  {/* Zone header */}
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="min-w-[40px] h-10 px-2 rounded-xl bg-primary text-white flex items-center justify-center font-bold font-display text-sm">
                        {z.code}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 text-sm truncate">{z.name}</div>
                        <div className="text-xs text-slate-400">{z.city}</div>
                      </div>
                      <button onClick={() => toggleActive(z)}
                        title={z.active ? 'Deactivate zone' : 'Activate zone'}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors ${z.active ? 'bg-green-50 text-green-600 hover:bg-red-50 hover:text-red-500' : 'bg-slate-100 text-slate-400 hover:bg-green-50 hover:text-green-600'}`}>
                        {z.active ? <Check size={13}/> : <XCircle size={13}/>}
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 mb-3">
                      <div className="text-center"><div className="font-bold text-slate-800 text-base">{z.total_properties||0}</div>Properties</div>
                      <div className="text-center"><div className="font-bold text-primary text-base">{z.total_rooms||0}</div>Rooms</div>
                      <div className="text-center"><div className="font-bold text-accent-600 text-base">{z.managers||0}</div>Managers</div>
                    </div>
                    {/* Toggle coverage */}
                    <button onClick={() => setExpanded(p=>({...p,[z.id]:!p[z.id]}))}
                      className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-700 transition-colors">
                      <span>{coverage.length} coverage area{coverage.length !== 1 ? 's' : ''}</span>
                      <Chevron size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
                    </button>
                  </div>

                  {/* Coverage panel */}
                  {isOpen && (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2">
                      {coverage.length === 0 && (
                        <p className="text-xs text-slate-400 italic">No coverage configured — properties won't auto-match this zone.</p>
                      )}
                      {coverage.map(c => (
                        <div key={c.id} className="flex items-center justify-between text-xs gap-2">
                          <span className={`px-1.5 py-0.5 rounded font-medium text-[10px] uppercase tracking-wide ${c.coverage_type==='region'?'bg-blue-100 text-blue-700':c.coverage_type==='district'?'bg-violet-100 text-violet-700':'bg-emerald-100 text-emerald-700'}`}>
                            {c.coverage_type}
                          </span>
                          <span className="flex-1 text-slate-700 truncate">{c.coverage_value}</span>
                          <button onClick={() => removeCoverage(z.id, c.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                            <X size={13}/>
                          </button>
                        </div>
                      ))}
                      {/* Add coverage form */}
                      <form onSubmit={e => addCoverage(z.id, e)} className="flex flex-col gap-2 mt-3 pt-3 border-t border-slate-100">
                        <div className="flex gap-2">
                          <select className="input text-xs py-1.5 w-24 shrink-0"
                            value={cf.type}
                            onChange={e => setCovForms(p=>({...p,[z.id]:{...cf,type:e.target.value,value:''}}))}>
                            <option value="region">Region</option>
                            <option value="district">District</option>
                            <option value="ward">Ward</option>
                          </select>
                          <div className="flex-1">
                            <LocTypeahead
                              value={cf.value}
                              onChange={v => setCovForms(p=>({...p,[z.id]:{...cf,value:v}}))}
                              options={typeOpts}
                              placeholder={`Search ${cf.type}…`}
                            />
                          </div>
                          <button type="submit" className="btn-sm bg-primary text-white hover:bg-primary/80 shrink-0">
                            <Plus size={12}/>
                          </button>
                        </div>
                      </form>
                      {err && <p className="text-xs text-red-600">{err}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Universities (admin only)
function UniversitiesView() {
  const [unis, setUnis]     = useState([]);
  const [zones, setZones]   = useState([]);
  const [clusters, setClust]= useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing]= useState(null); // null | 'new' | uni object
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const emptyForm = { name:'', short_name:'', area:'', district:'', zone_id:'', cluster_id:'' };
  const [f, setF] = useState(emptyForm);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get('/universities'), api.get('/zones')])
      .then(([u, z]) => { setUnis(u.data); setZones(z.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onZoneChange = (zid) => {
    setF(p => ({ ...p, zone_id: zid, cluster_id: '' }));
    if (zid) api.get('/clusters', { params: { zone_id: zid } }).then(r => setClust(r.data)).catch(() => {});
    else setClust([]);
  };

  const startEdit = (u) => {
    setF({ name:u.name, short_name:u.short_name||'', area:u.area||'', district:u.district||'', zone_id:u.zone_id||'', cluster_id:u.cluster_id||'' });
    if (u.zone_id) api.get('/clusters', { params: { zone_id: u.zone_id } }).then(r => setClust(r.data)).catch(() => {});
    setEditing(u);
  };
  const startNew = () => { setF(emptyForm); setClust([]); setEditing('new'); };

  const save = async (e) => {
    e.preventDefault(); setErr(''); setSaving(true);
    try {
      if (editing === 'new') { await api.post('/universities', f); }
      else { await api.put(`/universities/${editing.id}`, f); }
      setEditing(null); load();
    } catch (e) { setErr(e.response?.data?.message || 'An error occurred.'); }
    finally { setSaving(false); }
  };

  const deactivate = async (id) => {
    if (!confirm('Delete this university? It will be hidden from the list.')) return;
    await api.delete(`/universities/${id}`);
    load();
  };

  const filtered = unis.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.short_name||'').toLowerCase().includes(search.toLowerCase()) ||
    (u.area||'').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-5 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <input className="input max-w-xs" placeholder="Search university…" value={search} onChange={e=>setSearch(e.target.value)} />
        <button onClick={startNew} className="btn-primary text-sm shrink-0"><Plus size={15}/>Add University</button>
      </div>

      {/* Edit / Add form */}
      {editing && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-5">
          <h4 className="font-semibold text-slate-800 mb-4">{editing==='new'?'New University / Institution':'Edit University'}</h4>
          <form onSubmit={save} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Full Name *</label>
              <input className="input" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} required />
            </div>
            <div>
              <label className="label">Short Name (e.g. UDSM)</label>
              <input className="input" value={f.short_name} onChange={e=>setF(p=>({...p,short_name:e.target.value}))} placeholder="UDSM" />
            </div>
            <div>
              <label className="label">Area</label>
              <input className="input" value={f.area} onChange={e=>setF(p=>({...p,area:e.target.value}))} placeholder="e.g. Ubungo" />
            </div>
            <div>
              <label className="label">District</label>
              <input className="input" value={f.district} onChange={e=>setF(p=>({...p,district:e.target.value}))} placeholder="e.g. Kinondoni" />
            </div>
            <div>
              <label className="label">Zone</label>
              <select className="input" value={f.zone_id} onChange={e=>onZoneChange(e.target.value)}>
                <option value="">Select zone…</option>
                {zones.map(z=><option key={z.id} value={z.id}>{z.code} — {z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cluster</label>
              <select className="input" value={f.cluster_id} onChange={e=>setF(p=>({...p,cluster_id:e.target.value}))}>
                <option value="">Select cluster…</option>
                {clusters.map(c=><option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            {err && <div className="col-span-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</div>}
            <div className="col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary text-sm"><Save size={13}/>{saving?'…':'Save'}</button>
              <button type="button" onClick={()=>setEditing(null)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Name','Short','Area','Zone','Properties','Actions'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length===0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No universities found.</td></tr>}
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-primary font-bold">{u.short_name||'—'}</td>
                  <td className="px-4 py-3 text-slate-500">{u.area||'—'}</td>
                  <td className="px-4 py-3">{u.zone_code ? <><span className="font-bold text-primary">{u.zone_code}</span> {u.zone_name}</> : '—'}</td>
                  <td className="px-4 py-3">{u.property_count||0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={()=>startEdit(u)} className="btn-sm border border-slate-200 text-slate-600 hover:border-primary hover:text-primary"><Pencil size={12}/>Edit</button>
                      <button onClick={()=>deactivate(u.id)} className="btn-sm border border-red-100 text-red-500 hover:bg-red-50"><Trash2 size={12}/>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Zone Managers (admin only)
function StaffView() {
  const { isAdmin, isZoneManager } = useAuth();
  const [staff, setStaff]   = useState([]);
  const [zones, setZones]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]     = useState({ name:'', email:'', phone:'', password:'', zone_id:'' });
  const [err, setErr]       = useState('');
  const [submitting, setSub]= useState(false);

  const load = useCallback(() => {
    if (isZoneManager && !isAdmin) {
      api.get('/admin/staff').then(r => { setStaff(r.data); setLoading(false); }).catch(() => setLoading(false));
    } else {
      Promise.all([api.get('/admin/zone-managers'), api.get('/zones')])
        .then(([r1, r2]) => { setStaff(r1.data); setZones(r2.data); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [isAdmin, isZoneManager]);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault(); setErr(''); setSub(true);
    try {
      if (isZoneManager && !isAdmin) {
        await api.post('/admin/users/geto-officer', form);
      } else {
        await api.post('/admin/users/zone-manager', form);
      }
      setForm({ name:'', email:'', phone:'', password:'', zone_id:'' });
      load();
    } catch (e) { setErr(e.response?.data?.message || 'An error occurred.'); }
    finally { setSub(false); }
  };

  if (loading) return <Spinner />;

  // ── Zone Manager view: create + list their Geto Officers
  if (isZoneManager && !isAdmin) {
    return (
      <div className="p-5 lg:p-8 space-y-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-lg">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><UserPlus size={16}/>Create Geto Officer</h3>
          <form onSubmit={create} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Name *</label><input className="input" required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></div>
              <div><label className="label">Phone *</label><input className="input" required value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/></div>
              <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/></div>
              <div><label className="label">Password *</label><input className="input" type="password" required value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))}/></div>
            </div>
            {err && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</div>}
            <button type="submit" disabled={submitting} className="btn-primary text-sm">{submitting?'Creating…':'Create Account'}</button>
          </form>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Name','Phone','Email','Active Bookings'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No Geto Officers yet</td></tr>}
              {staff.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.phone}</td>
                  <td className="px-4 py-3 text-slate-500">{s.email||'—'}</td>
                  <td className="px-4 py-3">{s.active_bookings||0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Admin view: create + list zone managers
  return (
    <div className="p-5 lg:p-8 space-y-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-lg">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><UserPlus size={16}/>Add Zone Manager</h3>
        <form onSubmit={create} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Name</label><input className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required /></div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} required /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} required /></div>
            <div><label className="label">Password</label><input className="input" type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} required /></div>
          </div>
          <div>
            <label className="label">Zone</label>
            <select className="input" value={form.zone_id} onChange={e=>setForm(p=>({...p,zone_id:e.target.value}))} required>
              <option value="">Select zone…</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.code} — {z.name}</option>)}
            </select>
          </div>
          {err && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</div>}
          <button type="submit" disabled={submitting} className="btn-primary">{submitting?'Creating…':'Create Account'}</button>
        </form>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Name','Email','Phone','Zone','Properties in Zone','Last Login'].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No zone managers</td></tr>}
            {staff.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-slate-500">{s.email}</td>
                <td className="px-4 py-3 text-slate-500">{s.phone}</td>
                <td className="px-4 py-3"><span className="font-bold text-primary">{s.zone_code}</span> {s.zone_name}</td>
                <td className="px-4 py-3">{s.zone_properties||0}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{s.last_login_at ? new Date(s.last_login_at).toLocaleDateString() : 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Types Manager (admin: manage property_types and room_types) ─
function TypesView() {
  const [pTypes, setPTypes] = useState([]);
  const [rTypes, setRTypes] = useState([]);
  const [newPType, setNewPType] = useState('');
  const [newRType, setNewRType] = useState('');

  const load = useCallback(async () => {
    const [pt, rt] = await Promise.all([api.get('/admin/property-types'), api.get('/admin/room-types')]);
    setPTypes(pt.data); setRTypes(rt.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addPType = async () => {
    if (!newPType.trim()) return;
    await api.post('/admin/property-types', { name: newPType.trim() });
    setNewPType(''); load();
  };
  const delPType = async (id) => { await api.delete(`/admin/property-types/${id}`); load(); };
  const addRType = async () => {
    if (!newRType.trim()) return;
    await api.post('/admin/room-types', { name: newRType.trim() });
    setNewRType(''); load();
  };
  const delRType = async (id) => { await api.delete(`/admin/room-types/${id}`); load(); };

  return (
    <div className="p-5 lg:p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Property Types */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-display font-bold text-slate-900 mb-4">Property Types</h3>
          <div className="flex gap-2 mb-4">
            <input className="input flex-1 text-sm" value={newPType} onChange={e=>setNewPType(e.target.value)}
              placeholder="Add new type…" onKeyDown={e=>e.key==='Enter'&&addPType()} />
            <button onClick={addPType} className="btn-sm bg-primary text-white"><Plus size={14}/></button>
          </div>
          <div className="space-y-1">
            {pTypes.map(t => (
              <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl text-sm">
                <span className="text-slate-700">{t.name}</span>
                <button onClick={() => delPType(t.id)} className="text-red-400 hover:text-red-600"><Trash2 size={13}/></button>
              </div>
            ))}
          </div>
        </div>
        {/* Room Types */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-display font-bold text-slate-900 mb-4">Room Types</h3>
          <div className="flex gap-2 mb-4">
            <input className="input flex-1 text-sm" value={newRType} onChange={e=>setNewRType(e.target.value)}
              placeholder="Add new type…" onKeyDown={e=>e.key==='Enter'&&addRType()} />
            <button onClick={addRType} className="btn-sm bg-primary text-white"><Plus size={14}/></button>
          </div>
          <div className="space-y-1">
            {rTypes.map(t => (
              <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl text-sm">
                <span className="text-slate-700">{t.name}</span>
                <button onClick={() => delRType(t.id)} className="text-red-400 hover:text-red-600"><Trash2 size={13}/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Occupancy Dashboard ───────────────────────────────────────
function OccupancyDashboard() {
  const loc = useLocation();
  const navigate = useNavigate();
  // path: /admin/properties/:id/occupancy
  const parts = loc.pathname.split('/');
  const propId = parts[parts.findIndex(p => p === 'occupancy') - 1];

  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [activeFloor,  setActiveFloor]  = useState(null);
  const [drawer,       setDrawer]       = useState(null);
  const [unassigned,   setUnassigned]   = useState([]);
  const [rTypes,       setRTypes]       = useState([]);
  const [bulkOpen,     setBulkOpen]     = useState(false);
  const [singleOpen,   setSingleOpen]   = useState(false);
  const [actionLoad,   setActionLoad]   = useState(false);
  const [bulk,  setBulk]  = useState({ room_type_id:'', floors:'3', units_per_floor:'10', prefix:'', start_number:'1' });
  const [single,setSingle]= useState({ room_type_id:'', unit_number:'', floor:'1' });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/admin/properties/${propId}/occupancy`),
      api.get('/admin/room-types'),
    ]).then(([occ, rt]) => {
      setData(occ.data);
      setRTypes(rt.data);
      setLoading(false);
      if (occ.data.floors?.length) setActiveFloor(af => af ?? occ.data.floors[0].floor);
    }).catch(() => setLoading(false));
  }, [propId]);

  useEffect(() => { load(); }, [load]);

  const loadUnassigned = useCallback(async (unit) => {
    const res = await api.get(`/admin/properties/${propId}/unassigned-bookings`);
    setUnassigned(res.data.filter(b => String(b.room_type_id) === String(unit.room_type_id)));
    setDrawer({ type: 'vacant', unit });
  }, [propId]);

  const openUnit = (unit) => {
    if (unit.booking_id) setDrawer({ type: 'occupied', unit });
    else loadUnassigned(unit);
  };

  const assign = async (bookingId) => {
    setActionLoad(true);
    try {
      await api.post(`/admin/bookings/${bookingId}/assign-unit`, { room_unit_id: drawer.unit.id });
      setDrawer(null); load();
    } catch (e) { alert(e.response?.data?.message || 'Assignment failed.'); }
    finally { setActionLoad(false); }
  };

  const unassign = async (bookingId) => {
    if (!confirm('Remove this tenant from the room unit?')) return;
    setActionLoad(true);
    try { await api.delete(`/admin/bookings/${bookingId}/assign-unit`); setDrawer(null); load(); }
    catch (e) { alert(e.response?.data?.message || 'Failed.'); }
    finally { setActionLoad(false); }
  };

  const toggleMaint = async (unit) => {
    const s = unit.status === 'maintenance' ? 'available' : 'maintenance';
    try { await api.put(`/admin/room-units/${unit.id}`, { status: s }); load(); }
    catch { alert('Could not update status.'); }
  };

  const createSingle = async (e) => {
    e.preventDefault();
    try { await api.post(`/admin/properties/${propId}/room-units`, single); setSingleOpen(false); setSingle({ room_type_id:'', unit_number:'', floor:'1' }); load(); }
    catch (e) { alert(e.response?.data?.message || 'Failed.'); }
  };

  const createBulk = async (e) => {
    e.preventDefault();
    try { await api.post(`/admin/properties/${propId}/room-units/bulk`, bulk); setBulkOpen(false); load(); }
    catch (e) { alert(e.response?.data?.message || 'Failed.'); }
  };

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-TZ', { day:'2-digit', month:'short', year:'2-digit' }) : '—';
  const fmtAmt  = n => n ? `TZS ${Number(n).toLocaleString('en-TZ')}` : '—';

  const currentUnits = activeFloor !== null
    ? (data?.floors?.find(f => f.floor === activeFloor)?.units ?? [])
    : [];
  const s = data?.summary ?? {};

  if (loading) return <Spinner />;
  if (!data)   return <EmptyState label="Property not found." />;

  return (
    <div className="p-5 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button onClick={() => navigate(`/admin/properties/${propId}`)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary mb-2">
            <ArrowLeft size={13}/> Back to property
          </button>
          <h2 className="font-display font-bold text-xl text-slate-900">{data.property.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{data.property.area} · Occupancy Grid</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setSingleOpen(v=>!v); setBulkOpen(false); }}
            className="btn-sm border border-slate-300 text-slate-700 hover:border-primary hover:text-primary bg-white">
            <Plus size={13}/> Add Unit
          </button>
          <button onClick={() => { setBulkOpen(v=>!v); setSingleOpen(false); }}
            className="btn-sm bg-primary text-white hover:bg-primary/90">
            <Layers size={13}/> Bulk Generate
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Total Units',  v:s.total,       cls:'text-primary'   },
          { label:'Occupied',     v:s.occupied,    cls:'text-amber-600' },
          { label:'Available',    v:s.available,   cls:'text-green-600' },
          { label:'Maintenance',  v:s.maintenance, cls:'text-slate-500' },
        ].map(({ label, v, cls }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 px-4 py-4">
            <div className="text-xs text-slate-400 font-medium mb-1">{label}</div>
            <div className={`text-2xl font-bold ${cls}`}>{v ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Bulk create form */}
      {bulkOpen && (
        <form onSubmit={createBulk} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800 text-sm">Bulk Generate Room Units</p>
            <button type="button" onClick={() => setBulkOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Room Type</label>
              <select className="input" required value={bulk.room_type_id} onChange={e=>setBulk(p=>({...p,room_type_id:e.target.value}))}>
                <option value="">Select type</option>
                {rTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Floors</label>
              <input className="input" type="number" min="1" max="20" required value={bulk.floors} onChange={e=>setBulk(p=>({...p,floors:e.target.value}))}/>
            </div>
            <div>
              <label className="label">Units / Floor</label>
              <input className="input" type="number" min="1" max="50" required value={bulk.units_per_floor} onChange={e=>setBulk(p=>({...p,units_per_floor:e.target.value}))}/>
            </div>
            <div>
              <label className="label">Prefix (optional)</label>
              <input className="input" placeholder="e.g. A or B" value={bulk.prefix} onChange={e=>setBulk(p=>({...p,prefix:e.target.value.toUpperCase()}))}/>
            </div>
            <div>
              <label className="label">Start Number</label>
              <input className="input" type="number" min="1" value={bulk.start_number} onChange={e=>setBulk(p=>({...p,start_number:e.target.value}))}/>
            </div>
          </div>
          <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2">
            Sample: <strong>{(bulk.prefix||'') + '1' + String(Number(bulk.start_number)||1).padStart(2,'0')}</strong>
            {' '}→ <strong>{(bulk.prefix||'') + String(Number(bulk.floors)||1) + String((Number(bulk.start_number)||1)+(Number(bulk.units_per_floor)||1)-1).padStart(2,'0')}</strong>
            {' '}({Number(bulk.floors||0)*Number(bulk.units_per_floor||0)} total)
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={()=>setBulkOpen(false)} className="btn-sm border border-slate-300 text-slate-600 bg-white">Cancel</button>
            <button type="submit" className="btn-sm bg-primary text-white hover:bg-primary/90">Generate Units</button>
          </div>
        </form>
      )}

      {/* Single unit form */}
      {singleOpen && (
        <form onSubmit={createSingle} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800 text-sm">Add Single Unit</p>
            <button type="button" onClick={()=>setSingleOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Room Type</label>
              <select className="input" required value={single.room_type_id} onChange={e=>setSingle(p=>({...p,room_type_id:e.target.value}))}>
                <option value="">Select</option>
                {rTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Unit Number</label>
              <input className="input" placeholder="e.g. 101" required value={single.unit_number} onChange={e=>setSingle(p=>({...p,unit_number:e.target.value}))}/>
            </div>
            <div>
              <label className="label">Floor</label>
              <input className="input" type="number" min="1" max="20" value={single.floor} onChange={e=>setSingle(p=>({...p,floor:e.target.value}))}/>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={()=>setSingleOpen(false)} className="btn-sm border border-slate-300 text-slate-600 bg-white">Cancel</button>
            <button type="submit" className="btn-sm bg-primary text-white hover:bg-primary/90">Add Unit</button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {data.floors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <BedDouble size={40} className="mx-auto text-slate-300 mb-3"/>
          <p className="text-slate-500 font-medium text-sm">No room units yet</p>
          <p className="text-xs text-slate-400 mt-1">Use "Bulk Generate" to set up the grid, or add units one by one.</p>
        </div>
      ) : (
        <>
          {/* Floor tab strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {data.floors.map(f => {
              const occ = f.units.filter(u => u.booking_id).length;
              const active = activeFloor === f.floor;
              return (
                <button key={f.floor} onClick={() => setActiveFloor(f.floor)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all
                    ${active ? 'bg-primary text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary'}`}>
                  Floor {f.floor}
                  <span className={`ml-1.5 text-xs ${active ? 'text-white/60' : 'text-slate-400'}`}>{occ}/{f.units.length}</span>
                </button>
              );
            })}
          </div>

          {/* Unit grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {currentUnits.map(unit => {
              const occupied = !!unit.booking_id;
              const maint    = unit.status === 'maintenance';
              const cardCls  = occupied ? 'border-amber-300 bg-amber-50 hover:border-amber-400 hover:shadow-amber-100'
                             : maint    ? 'border-slate-300 bg-slate-100 hover:border-slate-400'
                                        : 'border-green-300 bg-green-50 hover:border-green-400 hover:shadow-green-100';
              const dotCls   = occupied ? 'bg-amber-400' : maint ? 'bg-slate-400' : 'bg-green-400';
              return (
                <button key={unit.id} onClick={() => openUnit(unit)}
                  className={`relative border-2 rounded-2xl p-4 text-left transition-all cursor-pointer hover:shadow-md ${cardCls}`}>
                  <span className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${dotCls}`}/>
                  <div className="font-display font-bold text-lg text-slate-800 leading-none">{unit.unit_number}</div>
                  <div className="text-xs text-slate-500 mt-1">{unit.room_type}</div>
                  {occupied && <div className="mt-2 text-xs font-medium text-amber-700 truncate">{unit.tenant_name}</div>}
                  {maint && !occupied && <div className="mt-2 text-xs text-slate-400 font-medium">Maintenance</div>}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Assignment Drawer */}
      {drawer && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={() => setDrawer(null)}/>
          <div className="fixed z-50 bg-white shadow-2xl flex flex-col
            bottom-0 left-0 right-0 rounded-t-3xl max-h-[75vh]
            lg:inset-y-0 lg:right-0 lg:left-auto lg:rounded-none lg:rounded-l-3xl lg:w-96 lg:max-h-none">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
              <div>
                <p className="font-display font-bold text-slate-800">Unit {drawer.unit.unit_number}</p>
                <p className="text-xs text-slate-500">{drawer.unit.room_type} · Floor {drawer.unit.floor}</p>
              </div>
              <button onClick={() => setDrawer(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18}/></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {drawer.type === 'occupied' ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <UserCheck size={15} className="text-amber-600 shrink-0"/>
                      <span className="font-semibold text-slate-800 text-sm">Current Tenant</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800">{drawer.unit.tenant_name}</div>
                    <div className="text-xs text-slate-500">{drawer.unit.tenant_phone || '—'}</div>
                    {(drawer.unit.contract_start || drawer.unit.contract_end) && (
                      <div className="text-xs text-slate-500 pt-1 border-t border-amber-100">
                        Contract: {fmtDate(drawer.unit.contract_start)} → {fmtDate(drawer.unit.contract_end)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleMaint(drawer.unit)}
                      className="flex-1 btn-sm border border-slate-300 text-slate-600 bg-white">
                      <Wrench size={12}/>{drawer.unit.status==='maintenance' ? 'Remove Maint.' : 'Set Maintenance'}
                    </button>
                    <button onClick={() => unassign(drawer.unit.booking_id)} disabled={actionLoad}
                      className="flex-1 btn-sm bg-red-600 text-white hover:bg-red-700">
                      <XCircle size={12}/>{actionLoad ? '…' : 'Unassign'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-slate-800">Assign to a student</p>
                    <button onClick={() => toggleMaint(drawer.unit)}
                      className="btn-sm border border-slate-300 text-slate-600 bg-white text-xs">
                      <Wrench size={11}/>{drawer.unit.status==='maintenance' ? 'Remove Maint.' : 'Set Maintenance'}
                    </button>
                  </div>
                  {unassigned.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Check size={24} className="mx-auto mb-2"/>
                      <p className="text-sm">No confirmed bookings awaiting assignment for this room type.</p>
                    </div>
                  ) : unassigned.map(b => (
                    <div key={b.id} className="border border-slate-200 rounded-2xl p-4 flex items-start justify-between gap-3 hover:border-accent/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 text-sm truncate">{b.student_name}</div>
                        <div className="text-xs text-slate-500">{b.student_phone}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          Move-in: {fmtDate(b.move_in_date)}
                          {b.amount_paid ? ` · ${fmtAmt(b.amount_paid)}` : ''}
                        </div>
                      </div>
                      <button onClick={() => assign(b.id)} disabled={actionLoad}
                        className="btn-sm bg-accent text-primary-900 font-semibold hover:bg-accent/90 shrink-0">
                        {actionLoad ? <Loader2 size={12} className="animate-spin"/> : 'Assign'}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Shared helpers ────────────────────────────────────────────
function Spinner() {
  return <div className="flex items-center justify-center p-16 text-primary"><Loader2 size={32} className="animate-spin"/></div>;
}
function EmptyState({ label }) {
  return <div className="text-center py-16 text-slate-400"><AlertCircle size={32} className="mx-auto mb-2"/>{label}</div>;
}
function StatusBadge({ status }) {
  const map = {
    pending:'badge-amber', approved:'badge-green', rejected:'badge-red',
    confirmed:'badge-green', cancelled:'badge-red', accepted:'badge-blue',
    payment_pending:'badge-amber', move_in_completed:'badge-green',
    assigned:'badge-blue', payment_confirmed:'badge-green',
    student_confirmed:'badge-green', active:'badge-green',
    checked_in:'badge-green', checked_out:'badge-gray',
    move_out_requested:'badge-amber', move_out_completed:'badge-gray',
    pending_verification:'badge-amber', suspended:'badge-red',
  };
  const labels = {
    pending:'Pending', approved:'Approved', rejected:'Rejected',
    confirmed:'Confirmed', cancelled:'Cancelled', accepted:'Accepted',
    payment_pending:'Payment Pending', move_in_completed:'Moved In',
    assigned:'Assigned', payment_confirmed:'Payment Confirmed',
    student_confirmed:'Student Confirmed', active:'Active',
    checked_in:'Checked In', checked_out:'Checked Out',
    move_out_requested:'Move-Out Req.', move_out_completed:'Moved Out',
    pending_verification:'Pending Verification', suspended:'Suspended',
  };
  return <span className={`badge ${map[status]||'badge-gray'}`}>{labels[status]||status}</span>;
}

// ─── Main ─────────────────────────────────────────────────────
// Keeps one broken page from blanking the whole portal
class PageErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false }); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="m-5 bg-white border border-red-200 rounded-2xl p-6 text-center">
        <AlertCircle className="mx-auto text-red-500 mb-2" />
        <p className="text-sm text-slate-700 mb-3">This page hit a problem. Other pages still work.</p>
        <button onClick={() => window.location.reload()} className="btn-sm border border-slate-300 min-h-[44px]">Reload</button>
      </div>
    );
  }
}

export default function AdminPortal() {
  // isZoneManager was missing here before, which crashed the portal for zone managers and Geto officers
  const { isAdmin, isZoneManager } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const loc = useLocation();
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 overflow-y-auto">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <PageErrorBoundary resetKey={loc.pathname}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="properties"    element={<PropertiesList />} />
          <Route path="properties/:id/occupancy" element={<OccupancyDashboard />} />
          <Route path="properties/:id" element={<PropertyDetail />} />
          <Route path="users"         element={<UsersList />} />
          <Route path="bookings"      element={<BookingsList />} />
          {isAdmin && <Route path="analytics"     element={<AdminAnalytics />} />}
          {isAdmin && <Route path="zones"         element={<ZonesView />} />}
          {isAdmin && <Route path="universities"  element={<UniversitiesView />} />}
          {(isAdmin || isZoneManager) && <Route path="staff" element={<StaffView />} />}
          {isAdmin && <Route path="types"         element={<TypesView />} />}
        </Routes>
        </PageErrorBoundary>
      </div>
    </div>
  );
}
