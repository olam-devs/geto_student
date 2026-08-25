import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, BedDouble, Users, CalendarCheck,
  BookOpen, LogOut, Menu, X, Plus, Pencil, Trash2,
  CheckCircle2, AlertCircle, Loader2, Eye, ChevronRight, UserCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const NAV = [
  { path: '/portal',           icon: LayoutDashboard, label: 'Dashibodi' },
  { path: '/portal/properties', icon: Building2,      label: 'Mali Zangu' },
  { path: '/portal/bookings',  icon: BookOpen,         label: 'Uhifadhi' },
  { path: '/portal/viewings',  icon: CalendarCheck,    label: 'Ziara' },
  { path: '/portal/referrals', icon: UserCheck,        label: 'Rufaa' },
];

function Sidebar({ open, onClose }) {
  const { user, isOwner, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const handleLogout = () => { logout(); navigate('/auth'); };
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose}/>}
      <aside className={`fixed top-0 left-0 h-full w-60 bg-primary text-white z-40 flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center font-display font-bold text-white text-lg">G</div>
          <div>
            <div className="font-display font-bold text-sm">Geto Portal</div>
            <div className="text-xs text-white/50 capitalize">{isOwner ? 'Mmiliki' : 'Msimamizi'}</div>
          </div>
          <button className="lg:hidden ml-auto text-white/60 hover:text-white" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="px-5 py-3 border-b border-white/10">
          <div className="text-xs text-white/40">Umeingia kama</div>
          <div className="text-sm font-semibold truncate">{user?.name}</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ path, icon: Icon, label }) => {
            const active = loc.pathname === path || (path !== '/portal' && loc.pathname.startsWith(path));
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
  const current = NAV.find(n => n.path === loc.pathname || (n.path !== '/portal' && loc.pathname.startsWith(n.path)));
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
      <button className="lg:hidden p-2 rounded-lg hover:bg-slate-100" onClick={onMenuClick}><Menu size={20}/></button>
      <h2 className="font-semibold text-slate-800 text-sm">{current?.label || 'Dashibodi'}</h2>
    </header>
  );
}

function Spinner() {
  return <div className="flex justify-center items-center p-16 text-primary"><Loader2 size={32} className="animate-spin"/></div>;
}

function StatCard({ label, value, color='text-primary' }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value ?? '—'}</div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────
function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/portal/stats').then(r => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  return (
    <div className="p-5 lg:p-8 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Mali Zote"          value={stats?.total_properties}                        />
        <StatCard label="Zilizoidhinishwa"   value={stats?.approved}           color="text-green-600"/>
        <StatCard label="Zinasubiri"         value={stats?.pending}            color="text-amber-600"/>
        <StatCard label="Zilizothibitishwa"  value={stats?.verified}           color="text-blue-600" />
        <StatCard label="Vyumba Vyote"       value={stats?.total_rooms}                             />
        <StatCard label="Vinavyokaliwa"      value={stats?.occupied_rooms}     color="text-accent"   />
        <StatCard label="Vinavyopatikana"    value={stats?.available_rooms}    color="text-green-600"/>
        <StatCard label="Uhifadhi Wote"      value={stats?.total_bookings}                          />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/portal/properties/new" className="btn-primary"><Plus size={16}/>Sajili Mali Mpya</Link>
        <Link to="/portal/bookings" className="btn-outline"><BookOpen size={16}/>Angalia Uhifadhi</Link>
      </div>
    </div>
  );
}

// ─── Properties list ───────────────────────────────────────────
function PropertiesList() {
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isOwner } = useAuth();
  useEffect(() => {
    api.get('/portal/properties').then(r => { setProps(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  return (
    <div className="p-5 lg:p-8">
      {isOwner && (
        <div className="mb-5">
          <Link to="/portal/properties/new" className="btn-primary"><Plus size={16}/>Sajili Mali Mpya</Link>
        </div>
      )}
      {props.length === 0
        ? <div className="text-center py-16 text-slate-400"><Building2 size={40} className="mx-auto mb-3"/><p>Bado hujasajili mali yoyote.</p></div>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {props.map(p => (
              <Link key={p.id} to={`/portal/properties/${p.id}`}
                className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-primary transition-colors flex gap-4">
                {p.main_photo
                  ? <img src={p.main_photo} alt="" className="w-20 h-20 object-cover rounded-xl shrink-0" />
                  : <div className="w-20 h-20 bg-slate-100 rounded-xl shrink-0 flex items-center justify-center text-slate-300"><Building2 size={28}/></div>}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.area} · {p.university_name}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <StatusBadge status={p.status} />
                    {p.verified && <span className="badge badge-blue">Imethibitishwa</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Vyumba: {p.total_rooms||0} · Vinavyopatikana: {p.available_rooms||0}
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 shrink-0 self-center" />
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}

// ─── Property Detail (owner/manager view) ──────────────────────
function PropertyDetail() {
  const loc = useLocation();
  const id = loc.pathname.split('/').pop();
  const [prop, setProp]   = useState(null);
  const [tab, setTab]     = useState('rooms');
  const [loading, setLoading] = useState(true);
  const [roomForm, setRoomForm] = useState({ room_type:'Single', monthly_price:'', deposit:'', total_count:'1', capacity:'1', bathroom_type:'Shared', furnished: false, floor:'', description:'' });
  const [tenantForm, setTenantForm] = useState({ room_id:'', name:'', phone:'', whatsapp_phone:'', email:'', lease_start:'', lease_end:'', monthly_rent:'', rent_due_day:'1', notes:'' });
  const [msg, setMsg]   = useState('');
  const [err, setErr]   = useState('');
  const { isOwner } = useAuth();

  const load = useCallback(() => {
    if (!id || id === 'new') return;
    api.get(`/portal/properties/${id}`).then(r => { setProp(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const addRoom = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    try {
      await api.post('/portal/rooms', { property_id: id, ...roomForm, total_count: parseInt(roomForm.total_count) || 1 });
      setMsg('Chumba kimeongezwa!');
      load();
    } catch(e) { setErr(e.response?.data?.message || 'Hitilafu.'); }
  };

  const updateOccupied = async (roomId, val) => {
    await api.put(`/portal/rooms/${roomId}`, { occupied_count: parseInt(val) });
    load();
  };

  const addTenant = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    try {
      await api.post('/portal/tenants', { property_id: id, ...tenantForm });
      setMsg('Mpangaji ameongezwa!');
      setTenantForm({ room_id:'', name:'', phone:'', whatsapp_phone:'', email:'', lease_start:'', lease_end:'', monthly_rent:'', rent_due_day:'1', notes:'' });
      load();
    } catch(e) { setErr(e.response?.data?.message || 'Hitilafu.'); }
  };

  const vacateTenant = async (tid) => {
    if (!confirm('Thibitisha mpangaji ametoka?')) return;
    await api.put(`/portal/tenants/${tid}`, { status: 'vacated' });
    load();
  };

  if (id === 'new') return <PropertyForm />;
  if (loading) return <Spinner />;
  if (!prop) return <div className="p-8 text-slate-400">Mali haikupatikana.</div>;

  const TABS = [
    { id:'rooms',   label:'Vyumba' },
    { id:'tenants', label:'Wapangaji' },
    { id:'photos',  label:'Picha' },
  ];

  return (
    <div className="p-5 lg:p-8 space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-display font-bold text-xl text-slate-900">{prop.name}</div>
            <div className="text-sm text-slate-500 mt-1">{prop.area} · {prop.university_name}</div>
            <div className="flex flex-wrap gap-2 mt-2">
              <StatusBadge status={prop.status} />
              {prop.verified && <span className="badge badge-blue">Geto Verified ✓</span>}
              {prop.zone_code && <span className="badge badge-gray">Kanda {prop.zone_code}</span>}
            </div>
          </div>
          {isOwner && (
            <Link to={`/portal/properties/${id}/edit`} className="btn-outline text-xs shrink-0">
              <Pencil size={14}/>Hariri
            </Link>
          )}
        </div>
        {prop.rejection_note && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">
            <AlertCircle size={14} className="inline mr-1"/>Sababu ya kukataliwa: {prop.rejection_note}
          </div>
        )}
        {prop.manager && (
          <div className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
            Msimamizi: <strong>{prop.manager.name}</strong> · {prop.manager.phone}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setMsg(''); setErr(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab===t.id ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {msg && <div className="flex gap-2 items-center bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-sm text-green-700"><CheckCircle2 size={15}/>{msg}</div>}
      {err && <div className="flex gap-2 items-center bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700"><AlertCircle size={15}/>{err}</div>}

      {/* ROOMS TAB */}
      {tab === 'rooms' && (
        <div className="space-y-5">
          {/* Existing rooms */}
          {prop.rooms?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 font-semibold text-sm text-slate-800">Vyumba Vilivyosajiliwa</div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{['Aina','Bei/Mwezi','Vyumba Vyote','Vinavyokaliwa','Vinavyopatikana','Amana','Bafuni','Ghorofa'].map(h=>(
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prop.rooms.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{r.room_type}</td>
                      <td className="px-4 py-3 text-primary font-semibold">TZS {Number(r.monthly_price).toLocaleString()}</td>
                      <td className="px-4 py-3">{r.total_count}</td>
                      <td className="px-4 py-3">
                        <input type="number" min={0} max={r.total_count} defaultValue={r.occupied_count}
                          onBlur={e => updateOccupied(r.id, e.target.value)}
                          className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center focus:border-primary focus:outline-none" />
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-600">{r.available_count}</td>
                      <td className="px-4 py-3">{r.deposit ? `TZS ${Number(r.deposit).toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-3">{r.bathroom_type}</td>
                      <td className="px-4 py-3">{r.floor ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add room form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="font-semibold text-sm text-slate-800 mb-4">+ Ongeza Aina ya Chumba</div>
            <form onSubmit={addRoom} className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Aina ya Chumba</label>
                <select className="input" value={roomForm.room_type} onChange={e=>setRoomForm(p=>({...p,room_type:e.target.value}))}>
                  {['Single','Double','Shared','Master','Bedsitter','Studio'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Bei/Mwezi (TZS)</label>
                <input className="input" type="number" required value={roomForm.monthly_price} onChange={e=>setRoomForm(p=>({...p,monthly_price:e.target.value}))} placeholder="150000" />
              </div>
              <div>
                <label className="label">Vyumba Vyote</label>
                <input className="input" type="number" min={1} required value={roomForm.total_count} onChange={e=>setRoomForm(p=>({...p,total_count:e.target.value}))} placeholder="10" />
              </div>
              <div>
                <label className="label">Amana (TZS)</label>
                <input className="input" type="number" value={roomForm.deposit} onChange={e=>setRoomForm(p=>({...p,deposit:e.target.value}))} placeholder="0" />
              </div>
              <div>
                <label className="label">Watu/Chumba</label>
                <input className="input" type="number" min={1} value={roomForm.capacity} onChange={e=>setRoomForm(p=>({...p,capacity:e.target.value}))} />
              </div>
              <div>
                <label className="label">Ghorofa (hiari)</label>
                <input className="input" type="number" value={roomForm.floor} onChange={e=>setRoomForm(p=>({...p,floor:e.target.value}))} placeholder="1" />
              </div>
              <div>
                <label className="label">Bafuni</label>
                <select className="input" value={roomForm.bathroom_type} onChange={e=>setRoomForm(p=>({...p,bathroom_type:e.target.value}))}>
                  <option value="Shared">Ya Pamoja</option>
                  <option value="Private">Ya Kibinafsi</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="fur" checked={roomForm.furnished} onChange={e=>setRoomForm(p=>({...p,furnished:e.target.checked}))} className="w-4 h-4 accent-primary" />
                <label htmlFor="fur" className="text-sm text-slate-600">Na Fanicha</label>
              </div>
              <div className="col-span-full">
                <label className="label">Maelezo (hiari)</label>
                <input className="input" value={roomForm.description} onChange={e=>setRoomForm(p=>({...p,description:e.target.value}))} placeholder="Maelezo ya ziada…" />
              </div>
              <div className="col-span-full">
                <button type="submit" className="btn-primary"><Plus size={16}/>Ongeza Chumba</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TENANTS TAB */}
      {tab === 'tenants' && (
        <div className="space-y-5">
          {/* Existing tenants */}
          {prop.tenants?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 font-semibold text-sm text-slate-800">Wapangaji wa Sasa</div>
              <div className="divide-y divide-slate-100">
                {prop.tenants.map(t => (
                  <div key={t.id} className="px-5 py-4 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.phone} · {t.room_type}</div>
                      <div className="text-xs text-slate-400">Kodi: TZS {Number(t.monthly_rent).toLocaleString()}/mwezi · Siku ya kodi: {t.rent_due_day}</div>
                      {t.lease_end && <div className="text-xs text-amber-600">Mkataba unaisha: {t.lease_end}</div>}
                    </div>
                    <button onClick={() => vacateTenant(t.id)} className="btn-sm border border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-xs">
                      Ameondoka
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add tenant */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="font-semibold text-sm text-slate-800 mb-4">+ Ongeza Mpangaji</div>
            <form onSubmit={addTenant} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Chumba</label>
                <select className="input" value={tenantForm.room_id} onChange={e=>setTenantForm(p=>({...p,room_id:e.target.value}))} required>
                  <option value="">Chagua chumba…</option>
                  {prop.rooms?.map(r => <option key={r.id} value={r.id}>{r.room_type} — TZS {Number(r.monthly_price).toLocaleString()}</option>)}
                </select>
              </div>
              <div><label className="label">Jina Kamili</label><input className="input" required value={tenantForm.name} onChange={e=>setTenantForm(p=>({...p,name:e.target.value}))} /></div>
              <div><label className="label">Simu</label><input className="input" required value={tenantForm.phone} onChange={e=>setTenantForm(p=>({...p,phone:e.target.value}))} /></div>
              <div><label className="label">WhatsApp (hiari)</label><input className="input" value={tenantForm.whatsapp_phone} onChange={e=>setTenantForm(p=>({...p,whatsapp_phone:e.target.value}))} /></div>
              <div><label className="label">Kodi ya Mwezi (TZS)</label><input className="input" type="number" required value={tenantForm.monthly_rent} onChange={e=>setTenantForm(p=>({...p,monthly_rent:e.target.value}))} /></div>
              <div><label className="label">Siku ya Kodi (1-28)</label><input className="input" type="number" min={1} max={28} value={tenantForm.rent_due_day} onChange={e=>setTenantForm(p=>({...p,rent_due_day:e.target.value}))} /></div>
              <div><label className="label">Tarehe ya Kuanza</label><input className="input" type="date" required value={tenantForm.lease_start} onChange={e=>setTenantForm(p=>({...p,lease_start:e.target.value}))} /></div>
              <div><label className="label">Tarehe ya Kumalizika (hiari)</label><input className="input" type="date" value={tenantForm.lease_end} onChange={e=>setTenantForm(p=>({...p,lease_end:e.target.value}))} /></div>
              <div className="col-span-full"><label className="label">Maelezo (hiari)</label><textarea className="input" rows={2} value={tenantForm.notes} onChange={e=>setTenantForm(p=>({...p,notes:e.target.value}))}/></div>
              <div className="col-span-full"><button type="submit" className="btn-primary"><Plus size={16}/>Ongeza Mpangaji</button></div>
            </form>
          </div>
        </div>
      )}

      {/* PHOTOS TAB */}
      {tab === 'photos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {prop.photos?.map(ph => (
              <div key={ph.id} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100">
                <img src={ph.url} alt="" className="w-full h-full object-cover" />
                {ph.is_main ? <span className="absolute top-2 left-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full">Kuu</span> : null}
              </div>
            ))}
          </div>
          <form onSubmit={async(e)=>{
            e.preventDefault();
            const fd=new FormData(e.target);
            await api.post(`/portal/properties/${id}/photos`,fd,{headers:{'Content-Type':'multipart/form-data'}});
            setMsg('Picha zimepakiwa!'); load();
          }}>
            <label className="label">Pakia Picha (WebP/JPEG/PNG)</label>
            <input name="photos" type="file" multiple accept="image/*" className="input py-2" />
            <button type="submit" className="btn-primary mt-3"><Plus size={16}/>Pakia Picha</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Property registration form ───────────────────────────────
function PropertyForm() {
  const [unis, setUnis]   = useState([]);
  const [zones, setZones] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [f, setF] = useState({ name:'', property_type:'Nyumzba ya Vyumba', nearest_university_id:'', zone_id:'', cluster_id:'', area:'', address:'', distance_km:'', transport_options:'', description:'', youtube_video_id:'', total_floors:'' });
  const [loading, setLoading] = useState(false);
  const [err, setErr]   = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/universities').then(r => setUnis(r.data)).catch(()=>{});
    api.get('/zones').then(r => setZones(r.data)).catch(()=>{});
  }, []);

  useEffect(() => {
    if (f.zone_id) api.get('/clusters', { params: { zone_id: f.zone_id } }).then(r => setClusters(r.data)).catch(()=>{});
    else setClusters([]);
  }, [f.zone_id]);

  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const { data } = await api.post('/portal/properties', f);
      navigate(`/portal/properties/${data.propertyId}`);
    } catch(e) { setErr(e.response?.data?.message || 'Hitilafu.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-5 lg:p-8 max-w-2xl">
      <h3 className="font-display font-bold text-xl text-slate-900 mb-6">Sajili Mali Mpya</h3>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-full"><label className="label">Jina la Mali</label><input className="input" required value={f.name} onChange={e=>set('name',e.target.value)} placeholder="k.m. Kijiji cha Ardhi Hosteli" /></div>
          <div>
            <label className="label">Aina ya Mali</label>
            <select className="input" value={f.property_type} onChange={e=>set('property_type',e.target.value)}>
              {['Nyumzba ya Vyumba','Hostel','Apartment','Bedsitter','Studio','Shared House','Student Residence','Other'].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Chuo Kilicho Karibu</label>
            <select className="input" required value={f.nearest_university_id} onChange={e=>set('nearest_university_id',e.target.value)}>
              <option value="">Chagua chuo…</option>
              {unis.map(u=><option key={u.id} value={u.id}>{u.name} ({u.short_name})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Kanda</label>
            <select className="input" value={f.zone_id} onChange={e=>set('zone_id',e.target.value)}>
              <option value="">Chagua kanda…</option>
              {zones.map(z=><option key={z.id} value={z.id}>{z.code} — {z.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Eneo Dogo (Cluster)</label>
            <select className="input" value={f.cluster_id} onChange={e=>set('cluster_id',e.target.value)} disabled={!f.zone_id}>
              <option value="">Chagua eneo dogo…</option>
              {clusters.map(c=><option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </div>
          <div><label className="label">Mtaa</label><input className="input" required value={f.area} onChange={e=>set('area',e.target.value)} placeholder="k.m. Ubungo" /></div>
          <div><label className="label">Umbali kutoka Chuo (km)</label><input className="input" type="number" step="0.1" value={f.distance_km} onChange={e=>set('distance_km',e.target.value)} placeholder="1.5" /></div>
          <div className="col-span-full"><label className="label">Anwani Kamili</label><textarea className="input" rows={2} required value={f.address} onChange={e=>set('address',e.target.value)} /></div>
          <div className="col-span-full"><label className="label">Usafiri Unaopatikana</label><input className="input" value={f.transport_options} onChange={e=>set('transport_options',e.target.value)} placeholder="k.m. Daladala, Bajaji, Tembea" /></div>
          <div className="col-span-full"><label className="label">Maelezo</label><textarea className="input" rows={4} required value={f.description} onChange={e=>set('description',e.target.value)} /></div>
          <div><label className="label">YouTube Video ID (hiari)</label><input className="input" value={f.youtube_video_id} onChange={e=>set('youtube_video_id',e.target.value)} placeholder="dQw4w9WgXcQ" /></div>
          <div><label className="label">Idadi ya Ghorofa (hiari)</label><input className="input" type="number" value={f.total_floors} onChange={e=>set('total_floors',e.target.value)} /></div>
        </div>
        {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{err}</div>}
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">{loading?'Inatuma…':'Tuma kwa Ukaguzi'}</button>
          <button type="button" onClick={() => navigate('/portal/properties')} className="btn-outline">Ghairi</button>
        </div>
      </form>
    </div>
  );
}

// ─── Bookings ──────────────────────────────────────────────────
function BookingsList() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const load = () => {
    api.get('/portal/bookings').then(r => { setBookings(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const updateStatus = async (id, status, note) => {
    await api.put(`/portal/bookings/${id}/status`, { status, note });
    load();
  };
  if (loading) return <Spinner />;
  return (
    <div className="p-5 lg:p-8 space-y-3">
      {bookings.length === 0 && <div className="text-center py-16 text-slate-400"><BookOpen size={40} className="mx-auto mb-3"/>Hakuna uhifadhi bado.</div>}
      {bookings.map(b => (
        <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="font-semibold text-slate-900">{b.student_name}</div>
              <div className="text-xs text-slate-500">{b.student_phone} · {b.student_email}</div>
              <div className="text-xs text-slate-600 mt-1">{b.property_name} · {b.room_type} · TZS {Number(b.monthly_price).toLocaleString()}/mwezi</div>
              <div className="text-xs text-slate-400">Tarehe ya kuhamia: {b.move_in_date}</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={b.status} />
              {b.status === 'pending' && <>
                <button onClick={() => updateStatus(b.id,'accepted',null)} className="btn-sm bg-green-600 text-white hover:bg-green-700 text-xs"><CheckCircle2 size={13}/>Kubali</button>
                <button onClick={() => { const n=prompt('Sababu:'); if(n) updateStatus(b.id,'rejected',n); }} className="btn-sm bg-red-600 text-white hover:bg-red-700 text-xs">Kataa</button>
              </>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Viewings ─────────────────────────────────────────────────
function ViewingsList() {
  const [viewings, setViewings] = useState([]);
  const [loading, setLoading]   = useState(true);
  useEffect(() => {
    api.get('/portal/viewings').then(r => { setViewings(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  return (
    <div className="p-5 lg:p-8 space-y-3">
      {viewings.length === 0 && <div className="text-center py-16 text-slate-400"><CalendarCheck size={40} className="mx-auto mb-3"/>Hakuna ziara zilizoombwa.</div>}
      {viewings.map(v => (
        <div key={v.id} className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="font-semibold text-slate-900">{v.student_name} <span className="text-slate-400 text-xs">{v.student_phone}</span></div>
          <div className="text-sm text-slate-600 mt-0.5">{v.property_name}</div>
          <div className="text-xs text-slate-500 mt-1">Tarehe: {v.preferred_date} · Wakati: {v.preferred_time}</div>
          {v.notes && <div className="text-xs text-slate-400 mt-1">"{v.notes}"</div>}
          <StatusBadge status={v.status} />
        </div>
      ))}
    </div>
  );
}

// ─── Referrals ────────────────────────────────────────────────
function ReferralView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/portal/referrals').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  const link = `https://getostudent.co.tz/auth?ref=${data?.referral_code}`;
  return (
    <div className="p-5 lg:p-8 space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="text-xs text-slate-500 mb-1">Nambari yako ya Rufaa</div>
        <div className="font-display font-bold text-2xl text-primary mb-2">{data?.referral_code}</div>
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600 break-all">
          <span className="flex-1">{link}</span>
          <button onClick={() => navigator.clipboard.writeText(link)} className="text-primary font-semibold shrink-0">Nakili</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Waliosajiliwa"   value={data?.stats?.total_referred}  />
        <StatCard label="Waliopanga Vyumba" value={data?.stats?.total_booked} color="text-accent" />
      </div>
      {data?.referrals?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 font-semibold text-sm">Walioombwa Kupitia Rufaa Yako</div>
          <div className="divide-y divide-slate-100">
            {data.referrals.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">{r.referred_name}</div>
                  <div className="text-xs text-slate-400 capitalize">{r.referred_role} · {new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <span className={`badge ${r.status==='booked'?'badge-green':r.status==='registered'?'badge-gray':'badge-amber'}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:'badge-amber', approved:'badge-green', rejected:'badge-red',
    confirmed:'badge-green', cancelled:'badge-red', accepted:'badge-blue',
    payment_pending:'badge-amber', move_in_completed:'badge-green',
    pending_verification:'badge-amber', active:'badge-green', suspended:'badge-red',
  };
  const labels = {
    pending:'Inasubiri', approved:'Imeidhinishwa', rejected:'Imekataliwa',
    confirmed:'Imethibitishwa', cancelled:'Imefutwa', accepted:'Imekubaliwa',
    payment_pending:'Malipo', move_in_completed:'Ameingia',
    pending_verification:'Inasubiriwa', active:'Hai', suspended:'Imesimamishwa',
  };
  return <span className={`badge ${map[status]||'badge-gray'}`}>{labels[status]||status}</span>;
}

// ─── Main ─────────────────────────────────────────────────────
export default function OwnerPortal() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 bg-slate-50">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="properties"      element={<PropertiesList />} />
            <Route path="properties/new"  element={<PropertyForm />} />
            <Route path="properties/:id"  element={<PropertyDetail />} />
            <Route path="bookings"        element={<BookingsList />} />
            <Route path="viewings"        element={<ViewingsList />} />
            <Route path="referrals"       element={<ReferralView />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
