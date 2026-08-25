import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, MapPin, CheckSquare,
  LogOut, Menu, X, ChevronRight, Eye, Check, XCircle,
  Shield, AlertCircle, Loader2, UserPlus, Map
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

// ─── Sidebar nav ───────────────────────────────────────────────
const ADMIN_NAV = [
  { path: '/admin',          icon: LayoutDashboard, label: 'Dashibodi' },
  { path: '/admin/properties', icon: Building2,    label: 'Mali / Nyumba' },
  { path: '/admin/users',    icon: Users,           label: 'Watumiaji' },
  { path: '/admin/bookings', icon: CheckSquare,     label: 'Uhifadhi' },
];
const ADMIN_ONLY_NAV = [
  { path: '/admin/zones',    icon: Map,             label: 'Kanda & Maeneo' },
  { path: '/admin/staff',    icon: Shield,          label: 'Wasimamizi wa Kanda' },
];

function Sidebar({ open, onClose }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const handleLogout = () => { logout(); navigate('/admin/login'); };
  const nav = isAdmin ? [...ADMIN_NAV, ...ADMIN_ONLY_NAV] : ADMIN_NAV;
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose}/>}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-primary text-white z-40 flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Header */}
        <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center font-display font-bold text-white text-lg">G</div>
          <div>
            <div className="font-display font-bold text-sm leading-none">Geto Admin</div>
            <div className="text-xs text-white/50 mt-0.5 capitalize">
              {isAdmin ? 'Super Admin' : `Kanda ${user?.zone_code || ''}`}
            </div>
          </div>
          <button className="lg:hidden ml-auto text-white/60 hover:text-white" onClick={onClose}><X size={20}/></button>
        </div>
        {/* User */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="text-xs text-white/50">Umeingia kama</div>
          <div className="text-sm font-semibold truncate">{user?.name}</div>
          <div className="text-xs text-white/40 truncate">{user?.email}</div>
        </div>
        {/* Zone badge for zone managers */}
        {!isAdmin && user?.zone_name && (
          <div className="mx-5 mt-3 px-3 py-2 bg-accent/20 rounded-xl text-xs text-accent font-semibold">
            <MapPin size={12} className="inline mr-1"/>Kanda {user.zone_code}: {user.zone_name}
          </div>
        )}
        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          {nav.map(({ path, icon: Icon, label }) => {
            const active = loc.pathname === path || (path !== '/admin' && loc.pathname.startsWith(path));
            return (
              <Link key={path} to={path} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
                <Icon size={18}/>{label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-5">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white transition-all">
            <LogOut size={18}/>Toka
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
      <h2 className="font-semibold text-slate-800 text-sm">{current?.label || 'Dashibodi'}</h2>
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
function Dashboard() {
  const { isAdmin, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/admin/stats').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  const g = data?.global;
  return (
    <div className="p-5 lg:p-8 space-y-8">
      {/* Global stats (admin only) */}
      {isAdmin && g && (
        <section>
          <h3 className="font-display font-bold text-lg text-slate-900 mb-4">Takwimu za Mfumo Mzima</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard label="Wanafunzi"       value={g.total_students}         color="primary" />
            <StatCard label="Wamiliki"         value={g.total_owners}           color="primary" />
            <StatCard label="Wasimamizi"       value={g.total_managers}         color="primary" />
            <StatCard label="Mali Zote"        value={g.total_properties}       sub={`${g.approved_properties} zilizoidhinishwa`} />
            <StatCard label="Zilizothibitishwa"value={g.verified_properties}    color="green"  />
            <StatCard label="Uhifadhi Wote"    value={g.total_bookings}         sub={`${g.confirmed_bookings} yaliyothibitishwa`} />
            <StatCard label="Vyumba Vyote"     value={g.total_rooms}            sub={`${g.occupied_rooms} vinavyokaliwa`} color="accent" />
            <StatCard label="Wasimamizi Kanda" value={g.total_zone_managers}    />
          </div>
        </section>
      )}

      {/* Zone breakdown (admin: all zones; zone_manager: their zone) */}
      {isAdmin ? (
        <section>
          <h3 className="font-display font-bold text-lg text-slate-900 mb-4">Kwa Kanda</h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{['Kanda','Jina','Mali','Zilizoidhinishwa','Zilizothibitishwa','Vyumba','Vinavyokaliwa','Uhifadhi'].map(h=>(
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
        <section>
          <h3 className="font-display font-bold text-lg text-slate-900 mb-4">
            Kanda {user?.zone_code} — {user?.zone_name}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {data?.my_zone && <>
              <StatCard label="Mali Zote"      value={data.my_zone.total}         />
              <StatCard label="Zilizoidhinishwa" value={data.my_zone.approved}    color="green" />
              <StatCard label="Zilizothibitishwa" value={data.my_zone.verified}   color="primary" />
              <StatCard label="Vyumba Vyote"   value={data.my_zone.total_rooms}   />
              <StatCard label="Vinavyokaliwa"  value={data.my_zone.occupied}      color="amber" />
              <StatCard label="Uhifadhi"       value={data.my_zone.total_bookings} />
            </>}
          </div>
        </section>
      )}
    </div>
  );
}

// Properties
function PropertiesList() {
  const { isAdmin, isZoneManager } = useAuth();
  const [props, setProps]   = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/properties', { params: { status: filter || undefined } })
      .then(r => { setProps(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    await api.put(`/admin/properties/${id}/approve`);
    load();
  };
  const reject = async (id) => {
    const note = prompt('Sababu ya kukataa:');
    if (!note) return;
    await api.put(`/admin/properties/${id}/reject`, { note });
    load();
  };
  const verify = async (id) => {
    if (!confirm('Thibitisha mali hii? Itaonekana kama "Geto Verified".')) return;
    await api.put(`/admin/properties/${id}/verify`, {
      checklist: { owner_identity:1, location_confirmed:1, rooms_confirmed:1, water_confirmed:1, electricity_confirmed:1, security_confirmed:1, price_confirmed:1 }
    });
    load();
  };

  return (
    <div className="p-5 lg:p-8">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {['','pending','approved','rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter===s?'bg-primary text-white':'bg-white border border-slate-200 text-slate-600 hover:border-primary'}`}>
            {s===''?'Zote':s==='pending'?'Zinasubiri':s==='approved'?'Zilizoidhinishwa':'Zilizokataliwa'}
          </button>
        ))}
      </div>
      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {props.length === 0 && <EmptyState label="Hakuna mali" />}
          {props.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center gap-4">
              {p.main_photo && <img src={p.main_photo} alt="" className="w-full md:w-24 h-20 object-cover rounded-xl shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 truncate">{p.name}</span>
                  {p.verified ? <span className="badge-green">Imethibitishwa</span> : null}
                  <StatusBadge status={p.status} />
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{p.area} · {p.university_name}</div>
                <div className="text-xs text-slate-400">Mmiliki: {p.owner_name} · {p.owner_phone} · Kanda {p.zone_code||'—'}</div>
                <div className="text-xs text-slate-400">Vyumba: {p.total_rooms||0} · Vinavyokaliwa: {p.occupied||0}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {p.status === 'pending' && <>
                  <button onClick={() => approve(p.id)} className="btn-sm bg-green-600 text-white hover:bg-green-700"><Check size={13}/>Idhinisha</button>
                  <button onClick={() => reject(p.id)}  className="btn-sm bg-red-600 text-white hover:bg-red-700"><XCircle size={13}/>Kataa</button>
                </>}
                {p.status === 'approved' && !p.verified && (
                  <button onClick={() => verify(p.id)} className="btn-sm bg-primary text-white hover:bg-primary/80"><Shield size={13}/>Thibitisha</button>
                )}
                <Link to={`/admin/properties/${p.id}`} className="btn-sm border border-slate-200 text-slate-600 hover:border-primary hover:text-primary"><Eye size={13}/>Angalia</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Property Detail (staff)
function PropertyDetail() {
  // Simple placeholder — full detail view
  return <div className="p-8 text-slate-500 text-sm">Maelezo kamili ya mali — karibu hivi karibuni.</div>;
}

// Users
function UsersList() {
  const [users, setUsers]   = useState([]);
  const [role, setRole]     = useState('property_owner');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/users', { params: { role } })
      .then(r => { setUsers(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [role]);

  useEffect(() => { load(); }, [load]);

  const verify = async (id) => {
    await api.put(`/admin/users/${id}/verify`);
    load();
  };
  const suspend = async (id) => {
    if (!confirm('Simamisha akaunti hii?')) return;
    await api.put(`/admin/users/${id}/suspend`);
    load();
  };

  return (
    <div className="p-5 lg:p-8">
      <div className="flex flex-wrap gap-2 mb-5">
        {['student','property_owner','property_manager','zone_manager'].map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${role===r?'bg-primary text-white':'bg-white border border-slate-200 text-slate-600 hover:border-primary'}`}>
            {r==='student'?'Wanafunzi':r==='property_owner'?'Wamiliki':r==='property_manager'?'Wasimamizi':r==='zone_manager'?'Wasimamizi wa Kanda':'Wote'}
          </button>
        ))}
      </div>
      {loading ? <Spinner /> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Jina','Barua Pepe','Simu','Hali','Mali','Kitendo'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Hakuna watumiaji</td></tr>}
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3 text-slate-500">{u.phone}</td>
                  <td className="px-4 py-3">
                    {u.status === 'active' && u.verified ? <span className="badge-green">Imethibitishwa</span>
                     : u.status === 'pending_verification' ? <span className="badge-amber">Inasubiri</span>
                     : u.status === 'suspended' ? <span className="badge-red">Imesimamishwa</span>
                     : <span className="badge-gray">Hai</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.property_count || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {u.status === 'pending_verification' && (
                        <button onClick={() => verify(u.id)} className="btn-sm bg-green-600 text-white hover:bg-green-700 text-xs"><Check size={12}/>Thibitisha</button>
                      )}
                      {u.status === 'active' && (
                        <button onClick={() => suspend(u.id)} className="btn-sm border border-red-200 text-red-600 hover:bg-red-50 text-xs">Simamisha</button>
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

// Bookings
function BookingsList() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  useEffect(() => {
    api.get('/admin/bookings').then(r => { setBookings(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  return (
    <div className="p-5 lg:p-8">
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Mwanafunzi','Mali','Aina ya Chumba','Bei','Tarehe ya Kuhamia','Hali','Kanda'].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bookings.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-400">Hakuna uhifadhi</td></tr>}
            {bookings.map(b => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{b.student_name}<div className="text-xs text-slate-400">{b.student_phone}</div></td>
                <td className="px-4 py-3 text-slate-600">{b.property_name}<div className="text-xs text-slate-400">{b.area}</div></td>
                <td className="px-4 py-3">{b.room_type}</td>
                <td className="px-4 py-3 text-primary font-semibold">TZS {Number(b.monthly_price).toLocaleString()}</td>
                <td className="px-4 py-3">{b.move_in_date}</td>
                <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                <td className="px-4 py-3"><span className="text-xs font-bold text-primary">{b.zone_code||'—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Zones & Clusters (admin only)
function ZonesView() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/admin/zones').then(r => { setZones(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  return (
    <div className="p-5 lg:p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.map(z => (
          <div key={z.id} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold font-display text-lg">{z.code}</span>
              <div>
                <div className="font-semibold text-slate-900 text-sm">{z.name}</div>
                <div className="text-xs text-slate-400">{z.city}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div><span className="font-medium text-slate-800">{z.total_properties||0}</span> Mali</div>
              <div><span className="font-medium text-green-600">{z.approved_properties||0}</span> Idhinishwa</div>
              <div><span className="font-medium text-blue-600">{z.verified_properties||0}</span> Thibitishwa</div>
              <div><span className="font-medium text-primary">{z.total_rooms||0}</span> Vyumba</div>
              <div><span className="font-medium text-amber-600">{z.occupied_rooms||0}</span> Vinavyokaliwa</div>
              <div><span className="font-medium">{z.managers||0}</span> Wasimamizi</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Zone Managers (admin only)
function StaffView() {
  const [staff, setStaff]   = useState([]);
  const [zones, setZones]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]     = useState({ name:'', email:'', phone:'', password:'', zone_id:'' });
  const [err, setErr]       = useState('');
  const [submitting, setSub]= useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/admin/zone-managers'),
      api.get('/zones'),
    ]).then(([r1, r2]) => { setStaff(r1.data); setZones(r2.data); setLoading(false); })
     .catch(() => setLoading(false));
  }, []);

  const create = async (e) => {
    e.preventDefault(); setErr(''); setSub(true);
    try {
      await api.post('/admin/users/zone-manager', form);
      const r = await api.get('/admin/zone-managers');
      setStaff(r.data);
      setForm({ name:'', email:'', phone:'', password:'', zone_id:'' });
    } catch (e) { setErr(e.response?.data?.message || 'Hitilafu.'); }
    finally { setSub(false); }
  };

  if (loading) return <Spinner />;
  return (
    <div className="p-5 lg:p-8 space-y-8">
      {/* Create form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-lg">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><UserPlus size={16}/>Ongeza Msimamizi wa Kanda</h3>
        <form onSubmit={create} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Jina</label><input className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required /></div>
            <div><label className="label">Barua Pepe</label><input className="input" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} required /></div>
            <div><label className="label">Simu</label><input className="input" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} required /></div>
            <div><label className="label">Nenosiri</label><input className="input" type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} required /></div>
          </div>
          <div>
            <label className="label">Kanda</label>
            <select className="input" value={form.zone_id} onChange={e=>setForm(p=>({...p,zone_id:e.target.value}))} required>
              <option value="">Chagua kanda…</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.code} — {z.name}</option>)}
            </select>
          </div>
          {err && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</div>}
          <button type="submit" disabled={submitting} className="btn-primary">{submitting?'Inaunda…':'Unda Akaunti'}</button>
        </form>
      </div>
      {/* Staff list */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Jina','Barua Pepe','Simu','Kanda','Mali katika Kanda','Mara ya Mwisho Kuingia'].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Hakuna wasimamizi</td></tr>}
            {staff.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-slate-500">{s.email}</td>
                <td className="px-4 py-3 text-slate-500">{s.phone}</td>
                <td className="px-4 py-3"><span className="font-bold text-primary">{s.zone_code}</span> {s.zone_name}</td>
                <td className="px-4 py-3">{s.zone_properties||0}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{s.last_login_at ? new Date(s.last_login_at).toLocaleDateString() : 'Haijaingia'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    pending: 'badge-amber', approved: 'badge-green', rejected: 'badge-red',
    confirmed: 'badge-green', cancelled: 'badge-red', accepted: 'badge-blue',
    payment_pending: 'badge-amber', move_in_completed: 'badge-green',
  };
  const labels = {
    pending:'Inasubiri', approved:'Imeidhinishwa', rejected:'Imekataliwa',
    confirmed:'Imethibitishwa', cancelled:'Imefutwa', accepted:'Imekubaliwa',
    payment_pending:'Malipo', move_in_completed:'Ameingia',
  };
  return <span className={`badge ${map[status]||'badge-gray'}`}>{labels[status]||status}</span>;
}

// ─── Main ─────────────────────────────────────────────────────
export default function AdminPortal() {
  const { isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 overflow-y-auto">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="properties"    element={<PropertiesList />} />
          <Route path="properties/:id" element={<PropertyDetail />} />
          <Route path="users"         element={<UsersList />} />
          <Route path="bookings"      element={<BookingsList />} />
          {isAdmin && <Route path="zones"  element={<ZonesView />} />}
          {isAdmin && <Route path="staff"  element={<StaffView />} />}
        </Routes>
      </div>
    </div>
  );
}
