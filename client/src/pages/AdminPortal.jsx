import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, MapPin, CheckSquare,
  LogOut, Menu, X, ChevronRight, Eye, Check, XCircle,
  Shield, AlertCircle, Loader2, UserPlus, Map, Plus, ChevronDown as Chevron, Globe,
  Pencil, Trash2, GraduationCap, Save, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

// ─── Sidebar nav ───────────────────────────────────────────────
const ADMIN_NAV = [
  { path: '/admin',          icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/properties', icon: Building2,    label: 'Properties' },
  { path: '/admin/users',    icon: Users,           label: 'Users' },
  { path: '/admin/bookings', icon: CheckSquare,     label: 'Bookings' },
];
const ADMIN_ONLY_NAV = [
  { path: '/admin/zones',        icon: Map,           label: 'Zones & Areas' },
  { path: '/admin/universities', icon: GraduationCap, label: 'Universities' },
  { path: '/admin/staff',        icon: Shield,        label: 'Zone Managers' },
  { path: '/admin/types',        icon: Plus,          label: 'Property & Room Types' },
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
              {isAdmin ? 'Super Admin' : `Zone ${user?.zone_code || ''}`}
            </div>
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
        {!isAdmin && user?.zone_name && (
          <div className="mx-5 mt-3 px-3 py-2 bg-accent/20 rounded-xl text-xs text-accent font-semibold">
            <MapPin size={12} className="inline mr-1"/>Zone {user.zone_code}: {user.zone_name}
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
        <section>
          <h3 className="font-display font-bold text-lg text-slate-900 mb-4">
            Zone {user?.zone_code} — {user?.zone_name}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {data?.my_zone && <>
              <StatCard label="Total Properties" value={data.my_zone.total}         />
              <StatCard label="Approved"         value={data.my_zone.approved}    color="green" />
              <StatCard label="Verified"         value={data.my_zone.verified}   color="primary" />
              <StatCard label="Total Rooms"      value={data.my_zone.total_rooms}   />
              <StatCard label="Occupied"         value={data.my_zone.occupied}      color="amber" />
              <StatCard label="Bookings"         value={data.my_zone.total_bookings} />
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
  const [props, setProps]     = useState([]);
  const [filter, setFilter]   = useState('pending');
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

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

  return (
    <div className="p-5 lg:p-8">
      {/* Filters + Add button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
        {['','pending','approved','rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter===s?'bg-primary text-white':'bg-white border border-slate-200 text-slate-600 hover:border-primary'}`}>
            {s===''?'All':s==='pending'?'Pending':s==='approved'?'Approved':'Rejected'}
          </button>
        ))}
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary text-sm shrink-0"><Plus size={15}/>Add Property</button>
      </div>
      {!isAdmin && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 font-medium flex items-center gap-2">
          <span>Properties you add will require Admin approval before being published.</span>
        </div>
      )}
      {addOpen && <AddPropertyModal onClose={() => setAddOpen(false)} onSaved={load} />}
      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {props.length === 0 && <EmptyState label="No properties" />}
          {props.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center gap-4">
              {p.main_photo && <img src={p.main_photo} alt="" className="w-full md:w-24 h-20 object-cover rounded-xl shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 truncate">{p.name}</span>
                  {p.verified ? <span className="badge-green">Verified</span> : null}
                  <StatusBadge status={p.status} />
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{p.area} · {p.university_name}</div>
                <div className="text-xs text-slate-400">Owner: {p.owner_name} · {p.owner_phone} · Zone {p.zone_code||'—'}</div>
                <div className="text-xs text-slate-400">Rooms: {p.total_rooms||0} · Occupied: {p.occupied||0}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {p.status === 'pending' && <>
                  <button onClick={() => approve(p.id)} className="btn-sm bg-green-600 text-white hover:bg-green-700"><Check size={13}/>Approve</button>
                  <button onClick={() => reject(p.id)}  className="btn-sm bg-red-600 text-white hover:bg-red-700"><XCircle size={13}/>Reject</button>
                </>}
                {p.status === 'approved' && !p.verified && (
                  <button onClick={() => verify(p.id)} className="btn-sm bg-primary text-white hover:bg-primary/80"><Shield size={13}/>Verify</button>
                )}
                {p.verified && (
                  <button onClick={() => unverify(p.id)} className="btn-sm bg-amber-500 text-white hover:bg-amber-600"><Shield size={13}/>Remove Verification</button>
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
  const [step, setStep]         = useState(1); // 1=info, 2=owner, 3=rooms
  const [propId, setPropId]     = useState(null);
  const [err, setErr]           = useState('');
  const [saving, setSaving]     = useState(false);
  const [rooms, setRooms]       = useState([]);
  const [selectedUnis, setSelUnis] = useState([]); // multiple universities

  // Owner section
  const [ownerMode, setOwnerMode]   = useState('search'); // 'search' | 'create'
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerResults, setOwnerResults] = useState([]);
  const [selectedOwner, setSelOwner]  = useState(null);
  const [ownerForm, setOwnerForm] = useState({ name:'', email:'', phone:'', password:'', business_name:'' });

  const [f, setF] = useState({
    name:'', property_type:'Hostel', description:'', address:'', landmark:'', area:'',
    highlight:'', nearest_university_id:'', zone_id:'', cluster_id:'', youtube_video_id:'',
  });
  const [rf, setRf] = useState({
    room_type:'Single', monthly_price:'', deposit_note:'', capacity:'1',
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
      api.get('/admin/users', { params: { role: 'property_owner', q: ownerSearch } })
        .then(r => setOwnerResults(r.data)).catch(() => {});
    }, 400);
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
        if (!ownerForm.name || !ownerForm.email || !ownerForm.phone || !ownerForm.password) {
          setErr('Jaza maelezo yote ya mmiliki.'); setSaving(false); return;
        }
        const r = await api.post('/admin/users/owner', ownerForm);
        ownerId = r.data.id;
      }
      const payload = { ...f, owner_id: ownerId || '', university_ids: selUnis };
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
      setRf({ room_type:'Single', monthly_price:'', deposit_note:'', capacity:'1', total_count:'1', available_count:'1', furnished:false, bathroom_type:'Shared', description:'' });
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
            {[['1','Details'],['2','Owner'],['3','Rooms']].map(([n,label],i) => (
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
                {/* Multi-uni selector */}
                <div className="col-span-2">
                  <label className="label">Other Nearby Universities (select multiple)</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {unis.map(u => {
                      const sel = selectedUnis.includes(String(u.id));
                      return (
                        <button key={u.id} type="button" onClick={() => toggleUni(u.id)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${sel?'bg-primary text-white border-primary':'bg-white text-slate-600 border-slate-200 hover:border-primary'}`}>
                          {u.short_name||u.name}
                        </button>
                      );
                    })}
                  </div>
                  {selectedUnis.length > 0 && <p className="text-xs text-primary mt-1">{selectedUnis.length} university selected</p>}
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
                            <p className="text-xs text-slate-500">{o.phone} · {o.email}</p>
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
                        <p className="text-xs text-green-600">{selectedOwner.phone} · {selectedOwner.email}</p>
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
                    <input className="input" value={ownerForm.name} onChange={e=>setOwnerForm(p=>({...p,name:e.target.value}))} required />
                  </div>
                  <div>
                    <label className="label">Email *</label>
                    <input className="input" type="email" value={ownerForm.email} onChange={e=>setOwnerForm(p=>({...p,email:e.target.value}))} required />
                  </div>
                  <div>
                    <label className="label">Phone *</label>
                    <input className="input" value={ownerForm.phone} onChange={e=>setOwnerForm(p=>({...p,phone:e.target.value}))} required />
                  </div>
                  <div>
                    <label className="label">Business Name</label>
                    <input className="input" value={ownerForm.business_name} onChange={e=>setOwnerForm(p=>({...p,business_name:e.target.value}))} />
                  </div>
                  <div>
                    <label className="label">Initial Password *</label>
                    <input className="input" type="password" value={ownerForm.password} onChange={e=>setOwnerForm(p=>({...p,password:e.target.value}))} required minLength={6} />
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
                  <div className="col-span-2">
                    <label className="label">Deposit / Terms (optional)</label>
                    <input className="input" value={rf.deposit_note} onChange={e=>setRf(p=>({...p,deposit_note:e.target.value}))} placeholder="e.g. 3 months rent required before moving in" />
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
                <button onClick={() => { onSaved(); onClose(); }} className="btn-primary text-sm"><Check size={14}/> Finish</button>
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
            {r.deposit_note && <span className="ml-2 text-slate-400">· {r.deposit_note}</span>}
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
  const [rf, setRf] = useState({ room_type:'Single', monthly_price:'', deposit_note:'', capacity:'1', total_count:'1', available_count:'1', furnished:false, bathroom_type:'Shared' });

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
            deposit_note:r.deposit_note||'', capacity:r.capacity,
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
    <div className="p-5 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin/properties')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary mb-2">
            <ArrowLeft size={13}/> Back to list
          </button>
          <h2 className="font-display font-bold text-xl text-slate-900">{prop.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{prop.area} · {prop.university_name} · Zone {prop.zone_code||'—'}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <StatusBadge status={prop.status} />
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
          <button onClick={() => { setEditRoom(null); setRf({ room_type:'Single', monthly_price:'', deposit_note:'', capacity:'1', total_count:'1', available_count:'1', furnished:false, bathroom_type:'Shared' }); setAddRoom(v=>!v); }}
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
              <div className="col-span-2 sm:col-span-3">
                <label className="label">Deposit / Terms (optional)</label>
                <input className="input" value={rf.deposit_note} onChange={e=>setRf(p=>({...p,deposit_note:e.target.value}))} placeholder="e.g. 3 months rent before moving in" />
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
    if (!confirm('Suspend this account?')) return;
    await api.put(`/admin/users/${id}/suspend`);
    load();
  };

  return (
    <div className="p-5 lg:p-8">
      <div className="flex flex-wrap gap-2 mb-5">
        {['student','property_owner','property_manager','zone_manager'].map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${role===r?'bg-primary text-white':'bg-white border border-slate-200 text-slate-600 hover:border-primary'}`}>
            {r==='student'?'Students':r==='property_owner'?'Owners':r==='property_manager'?'Managers':r==='zone_manager'?'Zone Managers':'All'}
          </button>
        ))}
      </div>
      {loading ? <Spinner /> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Name','Email','Phone','Status','Properties','Action'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No users found</td></tr>}
              {users.map(u => (
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
                    <div className="flex gap-2">
                      {u.status === 'pending_verification' && (
                        <button onClick={() => verify(u.id)} className="btn-sm bg-green-600 text-white hover:bg-green-700 text-xs"><Check size={12}/>Verify</button>
                      )}
                      {u.status === 'active' && (
                        <button onClick={() => suspend(u.id)} className="btn-sm border border-red-200 text-red-600 hover:bg-red-50 text-xs">Suspend</button>
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
            <tr>{['Student','Property','Room Type','Price','Move-in Date','Status','Zone'].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bookings.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-400">No bookings found</td></tr>}
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
  const [zones, setZones]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [clusterForms, setClusterForms] = useState({});
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

  const addCluster = async (zoneId, e) => {
    e.preventDefault(); setErr('');
    const f = clusterForms[zoneId] || { code:'', name:'' };
    try {
      await api.post(`/admin/zones/${zoneId}/clusters`, f);
      setClusterForms(p => ({ ...p, [zoneId]: { code:'', name:'' } }));
      load();
    } catch(e) { setErr(e.response?.data?.message || 'An error occurred.'); }
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
              const cf = clusterForms[z.id] || { code:'', name:'' };
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
                    {/* Toggle clusters */}
                    <button onClick={() => setExpanded(p=>({...p,[z.id]:!p[z.id]}))}
                      className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-700 transition-colors">
                      <span>{(z.clusters||[]).length} Sub-areas</span>
                      <Chevron size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
                    </button>
                  </div>

                  {/* Clusters panel */}
                  {isOpen && (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2">
                      {(z.clusters||[]).map(c => (
                        <div key={c.id} className="flex items-center justify-between text-xs">
                          <span className="font-mono text-primary font-bold w-12">{c.code}</span>
                          <span className="flex-1 text-slate-700">{c.name}</span>
                          {!c.active && <span className="text-slate-400 text-[10px]">Inactive</span>}
                        </div>
                      ))}
                      {/* Add cluster form */}
                      <form onSubmit={e => addCluster(z.id, e)} className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                        <input className="input text-xs py-1.5 w-20 font-mono" value={cf.code} maxLength={6}
                          onChange={e => setClusterForms(p=>({...p,[z.id]:{...cf,code:e.target.value.toUpperCase()}}))}
                          placeholder="Code" required/>
                        <input className="input text-xs py-1.5 flex-1" value={cf.name}
                          onChange={e => setClusterForms(p=>({...p,[z.id]:{...cf,name:e.target.value}}))}
                          placeholder="Area name" required/>
                        <button type="submit" className="btn-sm bg-primary text-white hover:bg-primary-600 shrink-0">
                          <Plus size={12}/>
                        </button>
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
    } catch (e) { setErr(e.response?.data?.message || 'An error occurred.'); }
    finally { setSub(false); }
  };

  if (loading) return <Spinner />;
  return (
    <div className="p-5 lg:p-8 space-y-8">
      {/* Create form */}
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
      {/* Staff list */}
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
    pending:'Pending', approved:'Approved', rejected:'Rejected',
    confirmed:'Confirmed', cancelled:'Cancelled', accepted:'Accepted',
    payment_pending:'Payment Pending', move_in_completed:'Moved In',
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
          {isAdmin && <Route path="zones"         element={<ZonesView />} />}
          {isAdmin && <Route path="universities"  element={<UniversitiesView />} />}
          {isAdmin && <Route path="staff"         element={<StaffView />} />}
          {isAdmin && <Route path="types"         element={<TypesView />} />}
        </Routes>
      </div>
    </div>
  );
}
