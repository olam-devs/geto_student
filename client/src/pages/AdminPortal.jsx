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
  { path: '/admin',          icon: LayoutDashboard, label: 'Dashibodi' },
  { path: '/admin/properties', icon: Building2,    label: 'Mali / Nyumba' },
  { path: '/admin/users',    icon: Users,           label: 'Watumiaji' },
  { path: '/admin/bookings', icon: CheckSquare,     label: 'Uhifadhi' },
];
const ADMIN_ONLY_NAV = [
  { path: '/admin/zones',        icon: Map,           label: 'Kanda & Maeneo' },
  { path: '/admin/universities', icon: GraduationCap, label: 'Vyuo & Taasisi' },
  { path: '/admin/staff',        icon: Shield,        label: 'Wasimamizi wa Kanda' },
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
      {/* Pending-from-managers alert */}
      {isAdmin && (data?.pending_from_managers || 0) > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-amber-800 text-sm">Mali {data.pending_from_managers} zinasubiri idhini yako</p>
            <p className="text-amber-700 text-xs mt-0.5">Wasimamizi wa kanda wameongeza mali ambazo bado hazijakaguliwa.</p>
          </div>
          <a href="/admin/properties" className="btn-sm bg-amber-600 text-white hover:bg-amber-700 text-xs shrink-0">Kagua Sasa</a>
        </div>
      )}

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

      {/* Manager property activity table (admin only) */}
      {isAdmin && (data?.manager_stats||[]).length > 0 && (
        <section>
          <h3 className="font-display font-bold text-lg text-slate-900 mb-4">Mali Zilizoongezwa na Wasimamizi</h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{['Msimamizi','Simu','Kanda','Zilizoongezwa','Zilizoidhinishwa','Zinasubiri'].map(h=>(
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
      {/* Filters + Add button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
        {['','pending','approved','rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter===s?'bg-primary text-white':'bg-white border border-slate-200 text-slate-600 hover:border-primary'}`}>
            {s===''?'Zote':s==='pending'?'Zinasubiri':s==='approved'?'Zilizoidhinishwa':'Zilizokataliwa'}
          </button>
        ))}
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary text-sm shrink-0"><Plus size={15}/>Ongeza Mali</button>
      </div>
      {!isAdmin && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 font-medium flex items-center gap-2">
          <span>Mali unayoiongeza itaenda kwa idhini ya Admin kabla ya kuchapishwa.</span>
        </div>
      )}
      {addOpen && <AddPropertyModal onClose={() => setAddOpen(false)} onSaved={load} />}
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
    distance_km:'', nearest_university_id:'', zone_id:'', cluster_id:'', youtube_video_id:'',
  });
  const [rf, setRf] = useState({
    room_type:'Single', monthly_price:'', deposit:'', capacity:'1',
    total_count:'1', furnished:false, bathroom_type:'Shared', description:'',
  });

  useEffect(() => {
    Promise.all([api.get('/universities'), api.get('/zones')])
      .then(([u, z]) => { setUnis(u.data); setZones(z.data); });
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
    } catch (e) { setErr(e.response?.data?.message || 'Hitilafu.'); setSaving(false); }
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
    } catch (e) { setErr(e.response?.data?.message || 'Hitilafu.'); }
    finally { setSaving(false); }
  };

  const addRoom = async (e) => {
    e.preventDefault(); setErr(''); setSaving(true);
    try {
      await api.post(`/admin/properties/${propId}/rooms`, rf);
      const r = await api.get(`/admin/properties/${propId}`);
      setRooms(r.data.rooms || []);
      setRf({ room_type:'Single', monthly_price:'', deposit:'', capacity:'1', total_count:'1', furnished:false, bathroom_type:'Shared', description:'' });
    } catch (e) { setErr(e.response?.data?.message || 'Hitilafu.'); }
    finally { setSaving(false); }
  };

  const delRoom = async (rid) => {
    await api.delete(`/admin/rooms/${rid}`);
    setRooms(prev => prev.filter(r => r.id !== rid));
  };

  const fmt = n => Number(n).toLocaleString('en-TZ');
  const TYPES = ['Nyumzba ya Vyumba','Hostel','Apartment','Bedsitter','Studio','Shared House','Student Residence','Other'];
  const RTYPES = ['Single','Double','Shared','Master','Bedsitter','Studio'];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h2 className="font-display font-bold text-lg text-slate-900">
            {step === 1 ? 'Ongeza Mali Mpya' : `Ongeza Vyumba — ${f.name}`}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6 text-xs font-semibold">
            {[['1','Maelezo'],['2','Mmiliki'],['3','Vyumba']].map(([n,label],i) => (
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
                  <label className="label">Jina la Mali *</label>
                  <input className="input" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} required placeholder="k.m. Amani Hostel" />
                </div>
                <div>
                  <label className="label">Aina ya Mali *</label>
                  <select className="input" value={f.property_type} onChange={e=>setF(p=>({...p,property_type:e.target.value}))}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Chuo Kikuu (la Kwanza) *</label>
                  <select className="input" value={f.nearest_university_id} onChange={e=>onUniChange(e.target.value)} required>
                    <option value="">Chagua chuo…</option>
                    {unis.map(u => <option key={u.id} value={u.id}>{u.name} ({u.short_name})</option>)}
                  </select>
                </div>
                {/* Multi-uni selector */}
                <div className="col-span-2">
                  <label className="label">Vyuo Vingine Karibu (chagua zaidi ya kimoja)</label>
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
                  {selectedUnis.length > 0 && <p className="text-xs text-primary mt-1">{selectedUnis.length} chuo kimechaguliwa</p>}
                </div>
                <div>
                  <label className="label">Kanda</label>
                  <select className="input" value={f.zone_id} onChange={e=>onZoneChange(e.target.value)}>
                    <option value="">Chagua kanda…</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.code} — {z.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Cluster</label>
                  <select className="input" value={f.cluster_id} onChange={e=>setF(p=>({...p,cluster_id:e.target.value}))}>
                    <option value="">Chagua cluster…</option>
                    {clusters.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Eneo (Area)</label>
                  <input className="input" value={f.area} onChange={e=>setF(p=>({...p,area:e.target.value}))} placeholder="k.m. Ubungo" />
                </div>
                <div>
                  <label className="label">Umbali wa Chuo (km)</label>
                  <input className="input" type="number" step="0.1" value={f.distance_km} onChange={e=>setF(p=>({...p,distance_km:e.target.value}))} placeholder="0.5" />
                </div>
                <div className="col-span-2">
                  <label className="label">Anwani</label>
                  <input className="input" value={f.address} onChange={e=>setF(p=>({...p,address:e.target.value}))} placeholder="k.m. Barabara ya UDSM, Mlimani" />
                </div>
                <div className="col-span-2">
                  <label className="label">Kivutio / Mahali Karibu (kwa utafutaji wa wanafunzi)</label>
                  <input className="input" value={f.landmark} onChange={e=>setF(p=>({...p,landmark:e.target.value}))} placeholder="k.m. karibu na Mlimani Mall, nyuma ya UDSM Gate 3" />
                </div>
                <div className="col-span-2">
                  <label className="label">Maelezo</label>
                  <textarea className="input" rows={3} value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} placeholder="Eleza mali hii…" />
                </div>
                <div>
                  <label className="label">YouTube Video ID (hiari)</label>
                  <input className="input" value={f.youtube_video_id} onChange={e=>setF(p=>({...p,youtube_video_id:e.target.value}))} placeholder="k.m. dQw4w9WgXcQ" />
                </div>
              </div>
              {err && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</div>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-ghost">Ghairi</button>
                <button type="submit" disabled={!f.name || !f.nearest_university_id} className="btn-primary">Endelea: Mmiliki →</button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={saveStep2} className="space-y-5">
              <div className="flex gap-3 mb-2">
                <button type="button" onClick={()=>setOwnerMode('search')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-colors ${ownerMode==='search'?'bg-primary text-white border-primary':'bg-white text-slate-600 border-slate-200 hover:border-primary'}`}>
                  Tafuta Mmiliki Aliyopo
                </button>
                <button type="button" onClick={()=>setOwnerMode('create')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-colors ${ownerMode==='create'?'bg-primary text-white border-primary':'bg-white text-slate-600 border-slate-200 hover:border-primary'}`}>
                  Unda Akaunti Mpya
                </button>
              </div>

              {ownerMode === 'search' && (
                <div>
                  <label className="label">Tafuta kwa jina, simu, au barua pepe</label>
                  <input className="input" value={ownerSearch} onChange={e=>setOwnerSearch(e.target.value)} placeholder="k.m. Amina au +255700..." />
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
                  <p className="text-xs text-slate-400 mt-2">Ikiwa mmiliki hana akaunti bado, bofya "Unda Akaunti Mpya" au acha wazi — utabadilishwa baadaye.</p>
                </div>
              )}

              {ownerMode === 'create' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="label">Jina la Mmiliki *</label>
                    <input className="input" value={ownerForm.name} onChange={e=>setOwnerForm(p=>({...p,name:e.target.value}))} required />
                  </div>
                  <div>
                    <label className="label">Barua Pepe *</label>
                    <input className="input" type="email" value={ownerForm.email} onChange={e=>setOwnerForm(p=>({...p,email:e.target.value}))} required />
                  </div>
                  <div>
                    <label className="label">Simu *</label>
                    <input className="input" value={ownerForm.phone} onChange={e=>setOwnerForm(p=>({...p,phone:e.target.value}))} required />
                  </div>
                  <div>
                    <label className="label">Jina la Biashara</label>
                    <input className="input" value={ownerForm.business_name} onChange={e=>setOwnerForm(p=>({...p,business_name:e.target.value}))} />
                  </div>
                  <div>
                    <label className="label">Nenosiri la Kwanza *</label>
                    <input className="input" type="password" value={ownerForm.password} onChange={e=>setOwnerForm(p=>({...p,password:e.target.value}))} required minLength={6} />
                  </div>
                </div>
              )}

              {err && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</div>}
              <div className="flex justify-between pt-2">
                <button type="button" onClick={()=>setStep(1)} className="btn-ghost text-sm"><ArrowLeft size={14}/> Rudi</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm">{saving?'Inaunda…':'Hifadhi & Endelea →'}</button>
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
                        <span className="text-xs text-slate-400 ml-2">· {r.total_count} vyumba · Nafasi {r.capacity}</span>
                        <p className="text-xs text-primary font-semibold">TZS {fmt(r.monthly_price)}/mo</p>
                      </div>
                      <button onClick={() => delRoom(r.id)} className="text-red-400 hover:text-red-600 p-1.5"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add room form */}
              <form onSubmit={addRoom} className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <p className="font-semibold text-sm text-slate-700">Ongeza Aina ya Chumba</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Aina ya Chumba</label>
                    <select className="input" value={rf.room_type} onChange={e=>setRf(p=>({...p,room_type:e.target.value}))}>
                      {RTYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Bei/mwezi (TZS) *</label>
                    <input className="input" type="number" value={rf.monthly_price} onChange={e=>setRf(p=>({...p,monthly_price:e.target.value}))} required placeholder="150000" />
                  </div>
                  <div>
                    <label className="label">Amana (TZS)</label>
                    <input className="input" type="number" value={rf.deposit} onChange={e=>setRf(p=>({...p,deposit:e.target.value}))} placeholder="0" />
                  </div>
                  <div>
                    <label className="label">Idadi ya Vyumba</label>
                    <input className="input" type="number" min="1" value={rf.total_count} onChange={e=>setRf(p=>({...p,total_count:e.target.value}))} />
                  </div>
                  <div>
                    <label className="label">Nafasi kwa Chumba</label>
                    <input className="input" type="number" min="1" max="10" value={rf.capacity} onChange={e=>setRf(p=>({...p,capacity:e.target.value}))} />
                  </div>
                  <div>
                    <label className="label">Bafuni</label>
                    <select className="input" value={rf.bathroom_type} onChange={e=>setRf(p=>({...p,bathroom_type:e.target.value}))}>
                      <option>Shared</option><option>Private</option>
                    </select>
                  </div>
                  <label className="col-span-2 flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={rf.furnished} onChange={e=>setRf(p=>({...p,furnished:e.target.checked}))} className="w-4 h-4 accent-primary" />
                    Chumba kina fanicha (Furnished)
                  </label>
                </div>
                {err && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</div>}
                <button type="submit" disabled={saving} className="btn-primary text-sm">{saving?'Inaongeza…':'+ Ongeza Chumba'}</button>
              </form>

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(1)} className="btn-ghost text-sm"><ArrowLeft size={14}/> Rudi</button>
                <button onClick={() => { onSaved(); onClose(); }} className="btn-primary text-sm"><Check size={14}/> Maliza</button>
              </div>
            </div>
          )}
        </div>
      </div>
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
  const [rf, setRf] = useState({ room_type:'Single', monthly_price:'', deposit:'', capacity:'1', total_count:'1', furnished:false, bathroom_type:'Shared' });

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/properties/${propId}`)
      .then(r => { setProp(r.data); setLoading(false); })
      .catch(() => { setLoading(false); navigate('/admin/properties'); });
  }, [propId]);

  useEffect(() => { load(); }, [load]);

  const fmt = n => Number(n||0).toLocaleString('en-TZ');
  const RTYPES = ['Single','Double','Shared','Master','Bedsitter','Studio'];

  const saveRoom = async (e) => {
    e.preventDefault(); setSaving(true); setErr('');
    try {
      if (editRoom) {
        await api.put(`/admin/rooms/${editRoom.id}`, rf);
      } else {
        await api.post(`/admin/properties/${propId}/rooms`, rf);
      }
      setAddRoom(false); setEditRoom(null);
      load();
    } catch (e) { setErr(e.response?.data?.message || 'Hitilafu.'); }
    finally { setSaving(false); }
  };

  const startEdit = (r) => {
    setRf({ room_type:r.room_type, monthly_price:r.monthly_price, deposit:r.deposit||'',
            capacity:r.capacity, total_count:r.total_count, furnished:!!r.furnished,
            bathroom_type:r.bathroom_type });
    setEditRoom(r); setAddRoom(true);
  };

  const delRoom = async (rid) => {
    if (!confirm('Futa aina hii ya chumba?')) return;
    await api.delete(`/admin/rooms/${rid}`);
    load();
  };

  if (loading) return <Spinner />;
  if (!prop) return <EmptyState label="Mali haikupatikana." />;

  return (
    <div className="p-5 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin/properties')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary mb-2">
            <ArrowLeft size={13}/> Rudi kwenye orodha
          </button>
          <h2 className="font-display font-bold text-xl text-slate-900">{prop.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{prop.area} · {prop.university_name} · Kanda {prop.zone_code||'—'}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <StatusBadge status={prop.status} />
          {prop.verified && <span className="badge-green">Imethibitishwa</span>}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
          <h4 className="font-semibold text-slate-800 text-sm mb-3">Maelezo ya Mali</h4>
          <div className="text-xs space-y-1.5 text-slate-600">
            <div><span className="text-slate-400">Aina:</span> {prop.property_type}</div>
            <div><span className="text-slate-400">Anwani:</span> {prop.address}</div>
            <div><span className="text-slate-400">Umbali:</span> {prop.distance_km ? `${prop.distance_km} km` : '—'}</div>
            <div><span className="text-slate-400">Chuo:</span> {prop.university_name}</div>
            <div><span className="text-slate-400">Kanda:</span> {prop.zone_code} — {prop.zone_name}</div>
          </div>
          {prop.description && <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">{prop.description}</p>}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
          <h4 className="font-semibold text-slate-800 text-sm mb-3">Mmiliki / Msimamizi</h4>
          <div className="text-xs space-y-1.5 text-slate-600">
            <div><span className="text-slate-400">Mmiliki:</span> {prop.owner_name || '—'}</div>
            <div><span className="text-slate-400">Simu:</span> {prop.owner_phone || '—'}</div>
            <div><span className="text-slate-400">Barua pepe:</span> {prop.owner_email || '—'}</div>
            {prop.manager && <div><span className="text-slate-400">Msimamizi:</span> {prop.manager.name} · {prop.manager.phone}</div>}
          </div>
        </div>
      </div>

      {/* Rooms */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-slate-800 text-sm">Aina za Vyumba ({prop.rooms?.length || 0})</h4>
          <button onClick={() => { setEditRoom(null); setRf({ room_type:'Single', monthly_price:'', deposit:'', capacity:'1', total_count:'1', furnished:false, bathroom_type:'Shared' }); setAddRoom(v=>!v); }}
            className="btn-sm bg-primary text-white hover:bg-primary/90"><Plus size={13}/>Ongeza Chumba</button>
        </div>

        {/* Add/Edit room form */}
        {addRoomOpen && (
          <form onSubmit={saveRoom} className="bg-slate-50 rounded-xl p-4 mb-4 space-y-3">
            <p className="font-semibold text-sm text-slate-700">{editRoom ? 'Hariri Chumba' : 'Chumba Kipya'}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Aina</label>
                <select className="input" value={rf.room_type} onChange={e=>setRf(p=>({...p,room_type:e.target.value}))}>
                  {RTYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Bei/mwezi (TZS)</label>
                <input className="input" type="number" value={rf.monthly_price} onChange={e=>setRf(p=>({...p,monthly_price:e.target.value}))} required />
              </div>
              <div>
                <label className="label">Amana (TZS)</label>
                <input className="input" type="number" value={rf.deposit} onChange={e=>setRf(p=>({...p,deposit:e.target.value}))} />
              </div>
              <div>
                <label className="label">Idadi Vyumba</label>
                <input className="input" type="number" min="1" value={rf.total_count} onChange={e=>setRf(p=>({...p,total_count:e.target.value}))} />
              </div>
              <div>
                <label className="label">Nafasi/Chumba</label>
                <input className="input" type="number" min="1" value={rf.capacity} onChange={e=>setRf(p=>({...p,capacity:e.target.value}))} />
              </div>
              <div>
                <label className="label">Bafuni</label>
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
              <button type="submit" disabled={saving} className="btn-sm bg-primary text-white"><Save size={13}/>{saving?'…':'Hifadhi'}</button>
              <button type="button" onClick={() => { setAddRoom(false); setEditRoom(null); }} className="btn-sm border border-slate-200 text-slate-600">Ghairi</button>
            </div>
          </form>
        )}

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {(!prop.rooms || prop.rooms.length === 0) && (
            <div className="px-4 py-6 text-center text-slate-400 text-sm">Hakuna vyumba bado. Ongeza aina ya chumba.</div>
          )}
          {prop.rooms?.map(r => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
              <div>
                <span className="font-semibold text-sm text-slate-800">{r.room_type}</span>
                <span className="text-xs text-slate-400 ml-2">· {r.furnished?'Furnished':'Unfurnished'} · {r.bathroom_type} bath · Nafasi {r.capacity}</span>
                <div className="text-xs text-slate-500 mt-0.5">
                  <span className="font-semibold text-primary">TZS {fmt(r.monthly_price)}/mo</span>
                  {r.deposit > 0 && <span className="ml-2 text-slate-400">Amana: {fmt(r.deposit)}</span>}
                  <span className="ml-2">{r.available} / {r.total_count} nafasi zilizobaki</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startEdit(r)} className="p-1.5 text-slate-400 hover:text-primary"><Pencil size={13}/></button>
                <button onClick={() => delRoom(r.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={13}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tenants */}
      {prop.tenants?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 text-sm mb-4">Wapangaji ({prop.tenants.length})</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead><tr className="border-b border-slate-100">
                {['Jina','Simu','Chumba','Kodi/mwezi','Tarehe ya Mwisho','Hali'].map(h=>(
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
    } catch(e) { setErr(e.response?.data?.message || 'Hitilafu.'); }
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
    } catch(e) { setErr(e.response?.data?.message || 'Hitilafu.'); }
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
          <h2 className="font-display font-bold text-xl text-slate-900">Kanda &amp; Maeneo</h2>
          <p className="text-sm text-slate-500 mt-0.5">{zones.length} kanda · Tanzania nzima</p>
        </div>
        <button onClick={() => { setShowForm(v=>!v); setErr(''); }}
          className="btn-primary text-sm gap-2">
          <Plus size={15}/> Unda Kanda Mpya
        </button>
      </div>

      {/* Create zone form */}
      {showForm && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
          <h3 className="font-display font-bold text-slate-900 mb-4">Kanda Mpya</h3>
          <form onSubmit={createZone} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Msimbo wa Kanda (k.m. AA, DOD)</label>
              <input className="input" value={zoneForm.code} required maxLength={5}
                onChange={e => setZoneForm(p=>({...p, code:e.target.value.toUpperCase()}))}
                placeholder="k.m. AA" />
            </div>
            <div>
              <label className="label">Jina la Kanda</label>
              <input className="input" value={zoneForm.name} required
                onChange={e => setZoneForm(p=>({...p, name:e.target.value}))}
                placeholder="k.m. NM-AIST / ATC / Njiro" />
            </div>
            <div>
              <label className="label">Mji / Mkoa</label>
              <input className="input" value={zoneForm.city} required
                onChange={e => setZoneForm(p=>({...p, city:e.target.value}))}
                placeholder="k.m. Arusha" />
            </div>
            <div>
              <label className="label">Maelezo (hiari)</label>
              <input className="input" value={zoneForm.description}
                onChange={e => setZoneForm(p=>({...p, description:e.target.value}))}
                placeholder="Maelezo mafupi ya kanda" />
            </div>
            {err && <div className="sm:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{err}</div>}
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                {saving ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>} Unda Kanda
              </button>
              <button type="button" onClick={()=>setShowForm(false)} className="btn-ghost text-sm">Ghairi</button>
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
            <span className="text-xs text-slate-400">({cityZones.length} kanda)</span>
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
                        title={z.active ? 'Ficha kanda' : 'Asha kanda'}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors ${z.active ? 'bg-green-50 text-green-600 hover:bg-red-50 hover:text-red-500' : 'bg-slate-100 text-slate-400 hover:bg-green-50 hover:text-green-600'}`}>
                        {z.active ? <Check size={13}/> : <XCircle size={13}/>}
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 mb-3">
                      <div className="text-center"><div className="font-bold text-slate-800 text-base">{z.total_properties||0}</div>Mali</div>
                      <div className="text-center"><div className="font-bold text-primary text-base">{z.total_rooms||0}</div>Vyumba</div>
                      <div className="text-center"><div className="font-bold text-accent-600 text-base">{z.managers||0}</div>Wasimamizi</div>
                    </div>
                    {/* Toggle clusters */}
                    <button onClick={() => setExpanded(p=>({...p,[z.id]:!p[z.id]}))}
                      className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-700 transition-colors">
                      <span>{(z.clusters||[]).length} Maeneo ya Kanda</span>
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
                          {!c.active && <span className="text-slate-400 text-[10px]">Imefungwa</span>}
                        </div>
                      ))}
                      {/* Add cluster form */}
                      <form onSubmit={e => addCluster(z.id, e)} className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                        <input className="input text-xs py-1.5 w-20 font-mono" value={cf.code} maxLength={6}
                          onChange={e => setClusterForms(p=>({...p,[z.id]:{...cf,code:e.target.value.toUpperCase()}}))}
                          placeholder="Msimbo" required/>
                        <input className="input text-xs py-1.5 flex-1" value={cf.name}
                          onChange={e => setClusterForms(p=>({...p,[z.id]:{...cf,name:e.target.value}}))}
                          placeholder="Jina la eneo" required/>
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
    } catch (e) { setErr(e.response?.data?.message || 'Hitilafu.'); }
    finally { setSaving(false); }
  };

  const deactivate = async (id) => {
    if (!confirm('Futa chuo hiki? Itaficha kutoka kwenye orodha.')) return;
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
        <input className="input max-w-xs" placeholder="Tafuta chuo…" value={search} onChange={e=>setSearch(e.target.value)} />
        <button onClick={startNew} className="btn-primary text-sm shrink-0"><Plus size={15}/>Ongeza Chuo</button>
      </div>

      {/* Edit / Add form */}
      {editing && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-5">
          <h4 className="font-semibold text-slate-800 mb-4">{editing==='new'?'Chuo/Taasisi Kipya':'Hariri Chuo'}</h4>
          <form onSubmit={save} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Jina Kamili *</label>
              <input className="input" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} required />
            </div>
            <div>
              <label className="label">Kifupi (k.m. UDSM)</label>
              <input className="input" value={f.short_name} onChange={e=>setF(p=>({...p,short_name:e.target.value}))} placeholder="UDSM" />
            </div>
            <div>
              <label className="label">Eneo</label>
              <input className="input" value={f.area} onChange={e=>setF(p=>({...p,area:e.target.value}))} placeholder="k.m. Ubungo" />
            </div>
            <div>
              <label className="label">Wilaya</label>
              <input className="input" value={f.district} onChange={e=>setF(p=>({...p,district:e.target.value}))} placeholder="k.m. Kinondoni" />
            </div>
            <div>
              <label className="label">Kanda</label>
              <select className="input" value={f.zone_id} onChange={e=>onZoneChange(e.target.value)}>
                <option value="">Chagua kanda…</option>
                {zones.map(z=><option key={z.id} value={z.id}>{z.code} — {z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cluster</label>
              <select className="input" value={f.cluster_id} onChange={e=>setF(p=>({...p,cluster_id:e.target.value}))}>
                <option value="">Chagua cluster…</option>
                {clusters.map(c=><option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            {err && <div className="col-span-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</div>}
            <div className="col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary text-sm"><Save size={13}/>{saving?'…':'Hifadhi'}</button>
              <button type="button" onClick={()=>setEditing(null)} className="btn-ghost text-sm">Ghairi</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Jina','Kifupi','Eneo','Kanda','Mali','Vitendo'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length===0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Hakuna vyuo vinavyolingana.</td></tr>}
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-primary font-bold">{u.short_name||'—'}</td>
                  <td className="px-4 py-3 text-slate-500">{u.area||'—'}</td>
                  <td className="px-4 py-3">{u.zone_code ? <><span className="font-bold text-primary">{u.zone_code}</span> {u.zone_name}</> : '—'}</td>
                  <td className="px-4 py-3">{u.property_count||0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={()=>startEdit(u)} className="btn-sm border border-slate-200 text-slate-600 hover:border-primary hover:text-primary"><Pencil size={12}/>Hariri</button>
                      <button onClick={()=>deactivate(u.id)} className="btn-sm border border-red-100 text-red-500 hover:bg-red-50"><Trash2 size={12}/>Futa</button>
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
          {isAdmin && <Route path="zones"         element={<ZonesView />} />}
          {isAdmin && <Route path="universities"  element={<UniversitiesView />} />}
          {isAdmin && <Route path="staff"         element={<StaffView />} />}
        </Routes>
      </div>
    </div>
  );
}
