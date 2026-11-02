import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, BedDouble, Users, CalendarCheck,
  BookOpen, LogOut, Menu, X, Plus, Pencil, Trash2,
  CheckCircle2, AlertCircle, Loader2, Eye, ChevronRight, UserCheck,
  TrendingUp, Grid3X3, BarChart2, Wrench, ChevronDown, ChevronUp,
  ImagePlus, Image, CreditCard, Smartphone, Building, Save, Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { TZ_LOCATIONS } from '../data/tz_locations';

// ─── Typeahead input with dropdown filtering ──────────────────
function TypeaheadInput({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const ref = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const select = (opt) => { setQuery(opt); onChange(opt); setOpen(false); };
  const handleChange = (e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); };

  return (
    <div ref={ref} className="relative">
      <input
        className="input"
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {open && filtered.length > 0 && !disabled && (
        <ul className="absolute z-50 w-full mt-1 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg text-sm">
          {filtered.slice(0, 50).map(opt => (
            <li
              key={opt}
              onMouseDown={() => select(opt)}
              className={`px-3 py-2 cursor-pointer hover:bg-primary/10 hover:text-primary ${opt === value ? 'bg-primary/5 font-medium text-primary' : 'text-slate-700'}`}
            >
              {opt}
            </li>
          ))}
          {filtered.length > 50 && <li className="px-3 py-2 text-slate-400 text-xs">Keep typing to narrow down…</li>}
        </ul>
      )}
    </div>
  );
}

// ─── Cascading Region → District → Ward picker ────────────────
function LocationPicker({ region, district, ward, onChange }) {
  const regions = Object.keys(TZ_LOCATIONS).sort();
  const districts = region && TZ_LOCATIONS[region] ? Object.keys(TZ_LOCATIONS[region]).sort() : [];
  const wards = region && district && TZ_LOCATIONS[region]?.[district]
    ? [...TZ_LOCATIONS[region][district]].sort()
    : [];

  const setRegion = (v) => onChange({ region: v, district: '', ward: '' });
  const setDistrict = (v) => onChange({ region, district: v, ward: '' });
  const setWard = (v) => onChange({ region, district, ward: v });

  return (
    <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="label">Region *</label>
        <TypeaheadInput
          value={region}
          onChange={setRegion}
          options={regions}
          placeholder="Type to search region…"
        />
      </div>
      <div>
        <label className="label">District *</label>
        <TypeaheadInput
          value={district}
          onChange={setDistrict}
          options={districts}
          placeholder={region ? 'Type to search district…' : 'Select region first'}
          disabled={!region}
        />
      </div>
      <div>
        <label className="label">Ward *</label>
        <TypeaheadInput
          value={ward}
          onChange={setWard}
          options={wards}
          placeholder={district ? 'Type to search ward…' : 'Select district first'}
          disabled={!district}
        />
      </div>
    </div>
  );
}

const NAV = [
  { path: '/portal',            icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/portal/properties', icon: Building2,       label: 'My Properties' },
  { path: '/portal/bookings',   icon: BookOpen,        label: 'Bookings' },
  { path: '/portal/viewings',   icon: CalendarCheck,   label: 'Viewings' },
  { path: '/portal/referrals',  icon: UserCheck,       label: 'Referrals' },
  { path: '/portal/payout',     icon: CreditCard,      label: 'Payout Profile' },
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
          <svg width="36" height="36" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="44" height="44" rx="10" fill="#14162B"/>
            <path d="M32.5 8.6 A17 17 0 1 0 32.5 35.4 L28.8 30.7 A11 11 0 1 1 28.8 13.3 Z" fill="#2FD48B"/>
            <circle cx="30.6" cy="11" r="3" fill="#2FD48B"/>
            <circle cx="30.6" cy="33" r="3" fill="#2FD48B"/>
            <path d="M36 15 L42 21 L40 21 L40 28 L32 28 L32 21 L30 21 Z" fill="white"/>
            <rect x="33.5" y="23" width="5" height="5" rx="0.5" fill="#14162B"/>
          </svg>
          <div>
            <div className="font-display font-bold text-sm">Geto Portal</div>
            <div className="text-xs text-white/50 capitalize">{isOwner ? 'Owner' : 'Manager'}</div>
          </div>
          <button className="lg:hidden ml-auto text-white/60 hover:text-white" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="px-5 py-3 border-b border-white/10">
          <div className="text-xs text-white/40">Signed in as</div>
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
            <LogOut size={18}/>Sign Out
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
      <h2 className="font-semibold text-slate-800 text-sm">{current?.label || 'Dashboard'}</h2>
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
        <StatCard label="All Properties"   value={stats?.total_properties}                        />
        <StatCard label="Approved"          value={stats?.approved}           color="text-green-600"/>
        <StatCard label="Pending"           value={stats?.pending}            color="text-amber-600"/>
        <StatCard label="Verified"          value={stats?.verified}           color="text-blue-600" />
        <StatCard label="Total Rooms"       value={stats?.total_rooms}                             />
        <StatCard label="Occupied"          value={stats?.occupied_rooms}     color="text-accent"   />
        <StatCard label="Available"         value={stats?.available_rooms}    color="text-green-600"/>
        <StatCard label="Total Bookings"    value={stats?.total_bookings}                          />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/portal/properties/new" className="btn-primary"><Plus size={16}/>Add New Property</Link>
        <Link to="/portal/bookings" className="btn-outline"><BookOpen size={16}/>View Bookings</Link>
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
          <Link to="/portal/properties/new" className="btn-primary"><Plus size={16}/>Add New Property</Link>
        </div>
      )}
      {props.length === 0
        ? <div className="text-center py-16 text-slate-400"><Building2 size={40} className="mx-auto mb-3"/><p>You have not listed any properties yet.</p></div>
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
                    {!!Number(p.verified) && <span className="badge badge-blue">Verified</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Rooms: {p.total_rooms||0} · Available: {p.available_rooms||0}
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
      setMsg('Room added!');
      load();
    } catch(e) { setErr(e.response?.data?.message || 'An error occurred.'); }
  };

  const updateOccupied = async (roomId, val) => {
    await api.put(`/portal/rooms/${roomId}`, { occupied_count: parseInt(val) });
    load();
  };

  const addTenant = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    try {
      await api.post('/portal/tenants', { property_id: id, ...tenantForm });
      setMsg('Tenant added!');
      setTenantForm({ room_id:'', name:'', phone:'', whatsapp_phone:'', email:'', lease_start:'', lease_end:'', monthly_rent:'', rent_due_day:'1', notes:'' });
      load();
    } catch(e) { setErr(e.response?.data?.message || 'An error occurred.'); }
  };

  const vacateTenant = async (tid) => {
    if (!confirm('Confirm the tenant has moved out?')) return;
    await api.put(`/portal/tenants/${tid}`, { status: 'vacated' });
    load();
  };

  if (id === 'new') return <PropertyForm />;
  if (loading) return <Spinner />;
  if (!prop) return <div className="p-8 text-slate-400">Property not found.</div>;

  const TABS = [
    { id:'rooms',   label:'Rooms' },
    { id:'units',   label:'Room Units' },
    { id:'tenants', label:'Tenants' },
    { id:'photos',  label:'Photos' },
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
              {!!Number(prop.verified) && <span className="badge badge-blue">Geto Verified ✓</span>}
              {prop.zone_code && <span className="badge badge-gray">Zone {prop.zone_code}</span>}
            </div>
          </div>
          {isOwner && (
            <Link to={`/portal/properties/${id}/edit`} className="btn-outline text-xs shrink-0">
              <Pencil size={14}/>Edit
            </Link>
          )}
        </div>
        {prop.rejection_note && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">
            <AlertCircle size={14} className="inline mr-1"/>Rejection reason: {prop.rejection_note}
          </div>
        )}
        {prop.manager && (
          <div className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
            Manager: <strong>{prop.manager.name}</strong> · {prop.manager.phone}
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
          {prop.rooms?.length > 0 && (
            <RoomList rooms={prop.rooms} onUpdate={load} onOccupied={updateOccupied} setMsg={setMsg} setErr={setErr} />
          )}

          {/* Add room form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="font-semibold text-sm text-slate-800 mb-4">+ Add Room Type</div>
            <form onSubmit={addRoom} className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Room Type</label>
                <select className="input" value={roomForm.room_type} onChange={e=>setRoomForm(p=>({...p,room_type:e.target.value}))}>
                  {['Single','Double','Shared','Master','Bedsitter','Studio'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Price/Month (TZS)</label>
                <input className="input" type="number" required value={roomForm.monthly_price} onChange={e=>setRoomForm(p=>({...p,monthly_price:e.target.value}))} placeholder="150000" />
              </div>
              <div>
                <label className="label">Total Rooms</label>
                <input className="input" type="number" min={1} required value={roomForm.total_count} onChange={e=>setRoomForm(p=>({...p,total_count:e.target.value}))} placeholder="10" />
              </div>
              <div>
                <label className="label">Deposit (TZS)</label>
                <input className="input" type="number" value={roomForm.deposit} onChange={e=>setRoomForm(p=>({...p,deposit:e.target.value}))} placeholder="0" />
              </div>
              <div>
                <label className="label">Capacity (people/room)</label>
                <input className="input" type="number" min={1} value={roomForm.capacity} onChange={e=>setRoomForm(p=>({...p,capacity:e.target.value}))} />
              </div>
              <div>
                <label className="label">Floor (optional)</label>
                <input className="input" type="number" value={roomForm.floor} onChange={e=>setRoomForm(p=>({...p,floor:e.target.value}))} placeholder="1" />
              </div>
              <div>
                <label className="label">Bathroom</label>
                <select className="input" value={roomForm.bathroom_type} onChange={e=>setRoomForm(p=>({...p,bathroom_type:e.target.value}))}>
                  <option value="Shared">Shared</option>
                  <option value="Private">Private</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="fur" checked={roomForm.furnished} onChange={e=>setRoomForm(p=>({...p,furnished:e.target.checked}))} className="w-4 h-4 accent-primary" />
                <label htmlFor="fur" className="text-sm text-slate-600">Furnished</label>
              </div>
              <div className="col-span-full">
                <label className="label">Description (optional)</label>
                <input className="input" value={roomForm.description} onChange={e=>setRoomForm(p=>({...p,description:e.target.value}))} placeholder="Additional details…" />
              </div>
              <div className="col-span-full">
                <button type="submit" className="btn-primary"><Plus size={16}/>Add Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROOM UNITS TAB */}
      {tab === 'units' && <PortalRoomUnitsPanel propertyId={id} rooms={prop.rooms || []} />}

      {/* TENANTS TAB */}
      {tab === 'tenants' && (
        <div className="space-y-5">
          {prop.tenants?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 font-semibold text-sm text-slate-800">Current Tenants</div>
              <div className="divide-y divide-slate-100">
                {prop.tenants.map(t => (
                  <div key={t.id} className="px-5 py-4 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.phone} · {t.room_type}</div>
                      <div className="text-xs text-slate-400">Rent: TZS {Number(t.monthly_rent).toLocaleString()}/month · Due day: {t.rent_due_day}</div>
                      {t.lease_end && <div className="text-xs text-amber-600">Lease ends: {t.lease_end}</div>}
                    </div>
                    <button onClick={() => vacateTenant(t.id)} className="btn-sm border border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-xs">
                      Moved Out
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add tenant */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="font-semibold text-sm text-slate-800 mb-4">+ Add Tenant</div>
            <form onSubmit={addTenant} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Room</label>
                <select className="input" value={tenantForm.room_id} onChange={e=>setTenantForm(p=>({...p,room_id:e.target.value}))} required>
                  <option value="">Select room…</option>
                  {prop.rooms?.map(r => <option key={r.id} value={r.id}>{r.room_type} — TZS {Number(r.monthly_price).toLocaleString()}</option>)}
                </select>
              </div>
              <div><label className="label">Full Name</label><input className="input" required value={tenantForm.name} onChange={e=>setTenantForm(p=>({...p,name:e.target.value}))} /></div>
              <div><label className="label">Phone</label><input className="input" required value={tenantForm.phone} onChange={e=>setTenantForm(p=>({...p,phone:e.target.value}))} /></div>
              <div><label className="label">WhatsApp (optional)</label><input className="input" value={tenantForm.whatsapp_phone} onChange={e=>setTenantForm(p=>({...p,whatsapp_phone:e.target.value}))} /></div>
              <div><label className="label">Monthly Rent (TZS)</label><input className="input" type="number" required value={tenantForm.monthly_rent} onChange={e=>setTenantForm(p=>({...p,monthly_rent:e.target.value}))} /></div>
              <div><label className="label">Rent Due Day (1–28)</label><input className="input" type="number" min={1} max={28} value={tenantForm.rent_due_day} onChange={e=>setTenantForm(p=>({...p,rent_due_day:e.target.value}))} /></div>
              <div><label className="label">Start Date</label><input className="input" type="date" required value={tenantForm.lease_start} onChange={e=>setTenantForm(p=>({...p,lease_start:e.target.value}))} /></div>
              <div><label className="label">End Date (optional)</label><input className="input" type="date" value={tenantForm.lease_end} onChange={e=>setTenantForm(p=>({...p,lease_end:e.target.value}))} /></div>
              <div className="col-span-full"><label className="label">Notes (optional)</label><textarea className="input" rows={2} value={tenantForm.notes} onChange={e=>setTenantForm(p=>({...p,notes:e.target.value}))}/></div>
              <div className="col-span-full"><button type="submit" className="btn-primary"><Plus size={16}/>Add Tenant</button></div>
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
                {ph.is_main ? <span className="absolute top-2 left-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full">Main</span> : null}
              </div>
            ))}
          </div>
          <form onSubmit={async(e)=>{
            e.preventDefault();
            const fd=new FormData(e.target);
            await api.post(`/portal/properties/${id}/photos`,fd,{headers:{'Content-Type':'multipart/form-data'}});
            setMsg('Photos uploaded!'); load();
          }}>
            <label className="label">Upload Photos (WebP/JPEG/PNG)</label>
            <input name="photos" type="file" multiple accept="image/*" className="input py-2" />
            <button type="submit" className="btn-primary mt-3"><Plus size={16}/>Upload Photos</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Per-room expandable list with photo management ──────────
function RoomList({ rooms, onUpdate, onOccupied, setMsg, setErr }) {
  const [expanded, setExpanded] = useState({});
  const [uploading, setUploading] = useState({});

  const toggle = id => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const uploadPhotos = async (roomId, files) => {
    if (!files.length) return;
    setUploading(p => ({ ...p, [roomId]: true }));
    try {
      const fd = new FormData();
      for (const f of files) fd.append('photos', f);
      await api.post(`/portal/rooms/${roomId}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg('Photos uploaded!');
      onUpdate();
    } catch (e) { setErr(e.response?.data?.message || 'Upload failed.'); }
    finally { setUploading(p => ({ ...p, [roomId]: false })); }
  };

  const deletePhoto = async (photoId) => {
    try {
      await api.delete(`/portal/room-photos/${photoId}`);
      setMsg('Photo deleted.');
      onUpdate();
    } catch (e) { setErr('Delete failed.'); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 font-semibold text-sm text-slate-800">Registered Rooms</div>
      {rooms.map(r => (
        <div key={r.id} className="border-b border-slate-100 last:border-0">
          {/* Room summary row */}
          <div
            className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50"
            onClick={() => toggle(r.id)}
          >
            <div className="flex-1 grid grid-cols-4 sm:grid-cols-8 gap-2 text-sm">
              <span className="font-medium col-span-2">{r.room_type}</span>
              <span className="text-primary font-semibold col-span-2">TZS {Number(r.monthly_price).toLocaleString()}</span>
              <span className="text-slate-500 hidden sm:block">{r.total_count} rooms</span>
              <span className="text-green-600 font-semibold hidden sm:block">{r.available_count} avail</span>
              <span className="text-slate-400 hidden sm:block">{r.bathroom_type}</span>
              <span className="text-slate-400 hidden sm:block flex items-center gap-1">
                <Image size={12}/> {r.photos?.length || 0}
              </span>
            </div>
            {expanded[r.id] ? <ChevronUp size={16} className="text-slate-400 shrink-0"/> : <ChevronDown size={16} className="text-slate-400 shrink-0"/>}
          </div>

          {/* Expanded detail */}
          {expanded[r.id] && (
            <div className="px-5 pb-5 pt-2 bg-slate-50 space-y-4">
              {/* Quick stats + occupied update */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div><span className="text-slate-500">Total:</span> <strong>{r.total_count}</strong></div>
                <div><span className="text-slate-500">Occupied:</span>
                  <input type="number" min={0} max={r.total_count} defaultValue={r.occupied_count}
                    onBlur={e => onOccupied(r.id, e.target.value)}
                    className="ml-1 w-14 border border-slate-200 rounded-lg px-2 py-0.5 text-sm text-center focus:border-primary focus:outline-none" />
                </div>
                <div><span className="text-slate-500">Available:</span> <strong className="text-green-600">{r.available_count}</strong></div>
                {r.deposit > 0 && <div><span className="text-slate-500">Deposit:</span> <strong>TZS {Number(r.deposit).toLocaleString()}</strong></div>}
                <div><span className="text-slate-500">Floor:</span> <strong>{r.floor ?? '—'}</strong></div>
              </div>

              {/* Photos */}
              <div>
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Photos ({r.photos?.length || 0})</div>
                {r.photos?.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                    {r.photos.map(ph => (
                      <div key={ph.id} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-200">
                        <img src={ph.url} alt="" className="w-full h-full object-cover"/>
                        <button
                          onClick={() => deletePhoto(ph.id)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          <X size={10}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer btn-sm border border-dashed border-slate-300 text-slate-500 hover:border-primary hover:text-primary transition-colors w-fit px-3 py-2 rounded-xl text-xs">
                  {uploading[r.id] ? <Loader2 size={13} className="animate-spin"/> : <ImagePlus size={13}/>}
                  {uploading[r.id] ? 'Uploading…' : 'Add Photos'}
                  <input type="file" multiple accept="image/*" className="hidden"
                    onChange={e => { uploadPhotos(r.id, Array.from(e.target.files)); e.target.value=''; }}
                    disabled={uploading[r.id]}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Room Units Panel (Owner / Manager) ──────────────────────
const FILL_COLORS = {
  empty:   'bg-emerald-50 border-emerald-200 text-emerald-700',
  partial: 'bg-amber-50 border-amber-200 text-amber-700',
  full:    'bg-red-50 border-red-200 text-red-600',
  maint:   'bg-slate-100 border-slate-300 text-slate-500',
};

function PortalRoomUnitsPanel({ propertyId, rooms }) {
  const [units, setUnits]     = useState([]);
  const [analytics, setAna]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState('');
  const [err, setErr]         = useState('');
  const [addMode, setAddMode] = useState('named'); // 'single' | 'named' | 'bulk'
  const [expanded, setExpanded] = useState({});

  // Add forms
  const [singleF, setSingleF] = useState({ room_type_id:'', unit_number:'', floor:'1', capacity:'' });
  const [namedF, setNamedF]   = useState({ room_type_id:'', units_text:'', floor:'1', capacity:'' });
  const [bulkF, setBulkF]     = useState({ room_type_id:'', floors:'1', units_per_floor:'10', prefix:'', start_number:'1', capacity:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, aRes] = await Promise.all([
        api.get(`/portal/properties/${propertyId}/room-units`),
        api.get(`/portal/properties/${propertyId}/analytics`),
      ]);
      setUnits(uRes.data || []);
      setAna(aRes.data || null);
    } catch { /* silent */ }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  const flash = (m, isErr=false) => { isErr ? setErr(m) : setMsg(m); setTimeout(()=>{ setMsg(''); setErr(''); }, 4000); };

  const addSingle = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/portal/properties/${propertyId}/room-units`, {
        ...singleF, floor: parseInt(singleF.floor)||1,
        capacity: singleF.capacity !== '' ? parseInt(singleF.capacity) : undefined,
      });
      flash('Unit added.'); setSingleF({ room_type_id:'', unit_number:'', floor:'1', capacity:'' }); load();
    } catch(ex) { flash(ex.response?.data?.message || 'Error.', true); }
  };

  const addNamed = async (e) => {
    e.preventDefault();
    const list = namedF.units_text.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
    if (!list.length) return flash('Enter at least one unit number.', true);
    try {
      const r = await api.post(`/portal/properties/${propertyId}/room-units/named`, {
        room_type_id: parseInt(namedF.room_type_id),
        units: list, floor: parseInt(namedF.floor)||1,
        capacity: namedF.capacity !== '' ? parseInt(namedF.capacity) : undefined,
      });
      flash(`Added ${r.data.created} unit(s), skipped ${r.data.skipped} duplicate(s).`);
      setNamedF({ room_type_id:'', units_text:'', floor:'1', capacity:'' }); load();
    } catch(ex) { flash(ex.response?.data?.message || 'Error.', true); }
  };

  const addBulk = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post(`/portal/properties/${propertyId}/room-units/bulk`, {
        room_type_id: parseInt(bulkF.room_type_id),
        floors: parseInt(bulkF.floors), units_per_floor: parseInt(bulkF.units_per_floor),
        prefix: bulkF.prefix, start_number: parseInt(bulkF.start_number)||1,
        capacity: bulkF.capacity !== '' ? parseInt(bulkF.capacity) : undefined,
      });
      flash(`Generated ${r.data.created} unit(s), skipped ${r.data.skipped}.`);
      load();
    } catch(ex) { flash(ex.response?.data?.message || 'Error.', true); }
  };

  const toggleStatus = async (unit) => {
    const next = unit.status === 'maintenance' ? 'available' : 'maintenance';
    await api.put(`/portal/room-units/${unit.id}`, { status: next });
    load();
  };

  const removeUnit = async (unit) => {
    if (!confirm(`Remove unit ${unit.unit_number}? This cannot be undone.`)) return;
    try {
      await api.delete(`/portal/room-units/${unit.id}`);
      flash('Unit removed.'); load();
    } catch(ex) { flash(ex.response?.data?.message || 'Error.', true); }
  };

  const setCapacity = async (unit, val) => {
    await api.put(`/portal/room-units/${unit.id}`, { capacity: val === '' ? null : parseInt(val) });
    load();
  };

  // Group units by room type
  const grouped = units.reduce((acc, u) => {
    const k = `${u.room_type_id}`;
    if (!acc[k]) acc[k] = { room_type: u.room_type, room_type_id: u.room_type_id, units: [] };
    acc[k].units.push(u);
    return acc;
  }, {});

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-primary" size={24}/></div>;

  return (
    <div className="space-y-5">
      {msg && <div className="flex gap-2 items-center bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-sm text-green-700"><CheckCircle2 size={15}/>{msg}</div>}
      {err && <div className="flex gap-2 items-center bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700"><AlertCircle size={15}/>{err}</div>}

      {/* Analytics summary */}
      {analytics && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} className="text-primary"/>
            <span className="font-semibold text-sm text-slate-800">Occupancy Analytics</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label:'Total Beds', val: analytics.totals.total_beds, color:'text-slate-800' },
              { label:'Occupied', val: analytics.totals.occupied_beds, color:'text-red-600' },
              { label:'Available', val: analytics.totals.available_beds, color:'text-emerald-600' },
              { label:'Total Units', val: analytics.totals.total_units, color:'text-primary' },
            ].map(s=>(
              <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                <div className={`text-2xl font-bold font-display ${s.color}`}>{s.val}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          {/* Occupancy bar */}
          {analytics.totals.total_beds > 0 && (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Occupancy</span>
                <span>{Math.round(analytics.totals.occupied_beds/analytics.totals.total_beds*100)}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all"
                  style={{width:`${Math.min(100,analytics.totals.occupied_beds/analytics.totals.total_beds*100)}%`}}/>
              </div>
            </div>
          )}
          {/* By room type */}
          {analytics.by_room_type?.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Room Type','Units','Total Beds','Occupied','Available','Full','Partial','Empty'].map(h=>(
                      <th key={h} className="text-left px-2 py-1.5 text-xs font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {analytics.by_room_type.map(rt=>(
                    <tr key={rt.room_type_id} className="hover:bg-slate-50">
                      <td className="px-2 py-2 font-medium">{rt.room_type}</td>
                      <td className="px-2 py-2 text-slate-600">{rt.unit_count}</td>
                      <td className="px-2 py-2 text-slate-600">{rt.total_beds}</td>
                      <td className="px-2 py-2 text-red-600 font-medium">{rt.occupied_beds}</td>
                      <td className="px-2 py-2 text-emerald-600 font-medium">{rt.available_beds}</td>
                      <td className="px-2 py-2 text-slate-500">{rt.full_units}</td>
                      <td className="px-2 py-2 text-amber-600">{rt.partial_units}</td>
                      <td className="px-2 py-2 text-slate-400">{rt.empty_units}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Occupancy grid */}
      {Object.values(grouped).map(grp => (
        <div key={grp.room_type_id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3 border-b border-slate-100 hover:bg-slate-50"
            onClick={()=>setExpanded(p=>({...p,[grp.room_type_id]:!p[grp.room_type_id]}))}
          >
            <div className="flex items-center gap-2">
              <Grid3X3 size={15} className="text-primary"/>
              <span className="font-semibold text-sm text-slate-800">{grp.room_type}</span>
              <span className="text-xs text-slate-400">({grp.units.length} units)</span>
            </div>
            {expanded[grp.room_type_id] ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
          {(expanded[grp.room_type_id] !== false) && (
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {grp.units.map(unit => {
                  const occ = Number(unit.occupied_count);
                  const cap = Number(unit.effective_capacity);
                  const avail = Number(unit.available_slots);
                  const colorKey = unit.status === 'maintenance' ? 'maint' : occ === 0 ? 'empty' : avail === 0 ? 'full' : 'partial';
                  return (
                    <div key={unit.id} className={`border rounded-xl p-3 ${FILL_COLORS[colorKey]}`}>
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className="font-bold text-sm leading-tight">{unit.unit_number}</span>
                        <div className="flex gap-1 shrink-0">
                          <button title={unit.status==='maintenance'?'Mark Available':'Mark Maintenance'}
                            onClick={()=>toggleStatus(unit)}
                            className="p-0.5 rounded hover:bg-black/10">
                            <Wrench size={11}/>
                          </button>
                          <button title="Remove unit" onClick={()=>removeUnit(unit)}
                            className="p-0.5 rounded hover:bg-black/10">
                            <X size={11}/>
                          </button>
                        </div>
                      </div>
                      {unit.floor > 0 && <div className="text-[10px] opacity-70 mb-1">Floor {unit.floor}</div>}
                      <div className="text-xs font-semibold">{occ}/{cap} beds</div>
                      {avail > 0 && <div className="text-[10px] opacity-80">{avail} free</div>}
                      {unit.status === 'maintenance' && <div className="text-[10px] font-semibold mt-0.5">Maintenance</div>}
                      {/* Capacity override */}
                      <input type="number" min={1} max={20}
                        className="mt-1.5 w-full text-[10px] border border-current/20 rounded px-1 py-0.5 bg-white/60 focus:outline-none"
                        placeholder={`cap (default ${unit.room_capacity})`}
                        defaultValue={unit.unit_capacity || ''}
                        onBlur={e=>setCapacity(unit, e.target.value)}
                        title="Override bed capacity for this room only"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add units panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="font-semibold text-sm text-slate-800 mb-3 flex items-center gap-2"><Plus size={15}/>Add Room Units</div>
        {/* Mode switcher */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-4">
          {[['named','Enter Names'],['single','Single'],['bulk','Auto-Generate']].map(([m,l])=>(
            <button key={m} onClick={()=>setAddMode(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${addMode===m?'bg-white text-primary shadow-sm':'text-slate-500 hover:text-slate-700'}`}>{l}</button>
          ))}
        </div>

        {rooms.length === 0 && (
          <div className="text-sm text-slate-400 italic">Add room types in the Rooms tab first.</div>
        )}

        {rooms.length > 0 && addMode === 'named' && (
          <form onSubmit={addNamed} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Room Type</label>
              <select className="input" required value={namedF.room_type_id} onChange={e=>setNamedF(p=>({...p,room_type_id:e.target.value}))}>
                <option value="">Select…</option>
                {rooms.map(r=><option key={r.id} value={r.id}>{r.room_type} — TZS {Number(r.monthly_price).toLocaleString()}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Floor</label>
              <input type="number" className="input" min={1} value={namedF.floor} onChange={e=>setNamedF(p=>({...p,floor:e.target.value}))}/>
            </div>
            <div>
              <label className="label">Capacity override (beds/room, optional)</label>
              <input type="number" className="input" min={1} max={20} placeholder="leave blank = use room default" value={namedF.capacity} onChange={e=>setNamedF(p=>({...p,capacity:e.target.value}))}/>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Unit Numbers (one per line, or comma-separated)</label>
              <textarea className="input h-24" placeholder="101&#10;102&#10;103&#10;104"
                value={namedF.units_text} onChange={e=>setNamedF(p=>({...p,units_text:e.target.value}))} required/>
            </div>
            <div><button type="submit" className="btn-primary"><Plus size={15}/>Add Units</button></div>
          </form>
        )}

        {rooms.length > 0 && addMode === 'single' && (
          <form onSubmit={addSingle} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Room Type</label>
              <select className="input" required value={singleF.room_type_id} onChange={e=>setSingleF(p=>({...p,room_type_id:e.target.value}))}>
                <option value="">Select…</option>
                {rooms.map(r=><option key={r.id} value={r.id}>{r.room_type}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Unit Number</label>
              <input type="text" className="input" required placeholder="e.g. 201" value={singleF.unit_number} onChange={e=>setSingleF(p=>({...p,unit_number:e.target.value}))}/>
            </div>
            <div>
              <label className="label">Floor</label>
              <input type="number" className="input" min={1} value={singleF.floor} onChange={e=>setSingleF(p=>({...p,floor:e.target.value}))}/>
            </div>
            <div>
              <label className="label">Capacity override</label>
              <input type="number" className="input" min={1} max={20} placeholder="optional" value={singleF.capacity} onChange={e=>setSingleF(p=>({...p,capacity:e.target.value}))}/>
            </div>
            <div className="col-span-full"><button type="submit" className="btn-primary"><Plus size={15}/>Add Unit</button></div>
          </form>
        )}

        {rooms.length > 0 && addMode === 'bulk' && (
          <form onSubmit={addBulk} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Room Type</label>
              <select className="input" required value={bulkF.room_type_id} onChange={e=>setBulkF(p=>({...p,room_type_id:e.target.value}))}>
                <option value="">Select…</option>
                {rooms.map(r=><option key={r.id} value={r.id}>{r.room_type}</option>)}
              </select>
            </div>
            <div><label className="label">Floors</label><input type="number" className="input" min={1} max={20} value={bulkF.floors} onChange={e=>setBulkF(p=>({...p,floors:e.target.value}))}/></div>
            <div><label className="label">Units/Floor</label><input type="number" className="input" min={1} max={50} value={bulkF.units_per_floor} onChange={e=>setBulkF(p=>({...p,units_per_floor:e.target.value}))}/></div>
            <div><label className="label">Prefix (optional)</label><input type="text" className="input" placeholder="e.g. A" value={bulkF.prefix} onChange={e=>setBulkF(p=>({...p,prefix:e.target.value}))}/></div>
            <div><label className="label">Start Number</label><input type="number" className="input" min={1} value={bulkF.start_number} onChange={e=>setBulkF(p=>({...p,start_number:e.target.value}))}/></div>
            <div><label className="label">Capacity override</label><input type="number" className="input" min={1} max={20} placeholder="optional" value={bulkF.capacity} onChange={e=>setBulkF(p=>({...p,capacity:e.target.value}))}/></div>
            <div className="col-span-full">
              <p className="text-xs text-slate-400 mb-2">Preview: generates {parseInt(bulkF.floors)||1} × {parseInt(bulkF.units_per_floor)||10} = {(parseInt(bulkF.floors)||1)*(parseInt(bulkF.units_per_floor)||10)} units</p>
              <button type="submit" className="btn-primary"><Plus size={15}/>Generate Units</button>
            </div>
          </form>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200 inline-block"></span>Empty</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200 inline-block"></span>Partial</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block"></span>Full</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 inline-block"></span>Maintenance</span>
        <span className="ml-2 text-slate-400">· Capacity override: type in the small input on each card to set beds for that specific room</span>
      </div>
    </div>
  );
}

// ─── Property registration form ───────────────────────────────
function PropertyForm() {
  const [unis, setUnis]   = useState([]);
  const [f, setF] = useState({ name:'', property_type:'Rooms', nearest_university_id:'', region:'', district:'', ward:'', area:'', address:'', distance_km:'', transport_options:'', description:'', youtube_video_id:'', total_floors:'' });
  const [selectedUnis, setSelUnis] = useState([]);
  const [uniSearch, setUniSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]   = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/universities').then(r => setUnis(r.data)).catch(()=>{});
  }, []);

  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const toggleUni = (id) => {
    const s = String(id);
    setSelUnis(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const allUniIds = [...new Set([...selectedUnis, String(f.nearest_university_id)].filter(Boolean))];
      const { data } = await api.post('/portal/properties', { ...f, university_ids: allUniIds });
      navigate(`/portal/properties/${data.propertyId}`);
    } catch(e) { setErr(e.response?.data?.message || 'An error occurred.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-5 lg:p-8 max-w-2xl">
      <h3 className="font-display font-bold text-xl text-slate-900 mb-6">Register New Property</h3>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-full"><label className="label">Property Name</label><input className="input" required value={f.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Green Valley Hostel" /></div>
          <div>
            <label className="label">Property Type</label>
            <select className="input" value={f.property_type} onChange={e=>set('property_type',e.target.value)}>
              {['Rooms','Hostel','Apartment','Bedsitter','Studio','Shared House','Student Residence','Other'].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Nearest University *</label>
            <select className="input" required value={f.nearest_university_id} onChange={e=>{set('nearest_university_id',e.target.value); if(!selectedUnis.includes(String(e.target.value))) setSelUnis(p=>[...p,String(e.target.value)].filter(Boolean));}}>
              <option value="">Select university…</option>
              {unis.map(u=><option key={u.id} value={u.id}>{u.name} ({u.short_name})</option>)}
            </select>
          </div>
          <div className="col-span-full">
            <label className="label">Which universities can students from these institutions book here? *</label>
            <p className="text-xs text-slate-400 mb-2">Select all universities whose students are eligible to rent here</p>
            <input className="input mb-2" value={uniSearch} onChange={e=>setUniSearch(e.target.value)} placeholder="Search universities…" />
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
              {unis.filter(u=>!uniSearch||u.name.toLowerCase().includes(uniSearch.toLowerCase())||(u.short_name||'').toLowerCase().includes(uniSearch.toLowerCase())).map(u=>{
                const sel = selectedUnis.includes(String(u.id));
                return (
                  <button key={u.id} type="button" onClick={()=>toggleUni(u.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${sel?'bg-primary text-white border-primary':'bg-white text-slate-600 border-slate-200 hover:border-primary'}`}>
                    {u.short_name||u.name}
                  </button>
                );
              })}
            </div>
            {selectedUnis.length > 0 && <p className="text-xs text-primary mt-1">{selectedUnis.length} {selectedUnis.length===1?'university':'universities'} selected</p>}
          </div>
          <LocationPicker
            region={f.region}
            district={f.district}
            ward={f.ward}
            onChange={loc => setF(p=>({...p,...loc}))}
          />
          <div><label className="label">Area / Neighbourhood</label><input className="input" required value={f.area} onChange={e=>set('area',e.target.value)} placeholder="e.g. Ubungo, Sinza, Mikocheni" /></div>
          <div><label className="label">Distance from University (km)</label><input className="input" type="number" step="0.1" value={f.distance_km} onChange={e=>set('distance_km',e.target.value)} placeholder="1.5" /></div>
          <div className="col-span-full"><label className="label">Full Address</label><textarea className="input" rows={2} required value={f.address} onChange={e=>set('address',e.target.value)} /></div>
          <div className="col-span-full"><label className="label">Transport Options</label><input className="input" value={f.transport_options} onChange={e=>set('transport_options',e.target.value)} placeholder="e.g. Daladala, Bajaji, Walking" /></div>
          <div className="col-span-full"><label className="label">Description</label><textarea className="input" rows={4} required value={f.description} onChange={e=>set('description',e.target.value)} /></div>
          <div><label className="label">YouTube Video ID (optional)</label><input className="input" value={f.youtube_video_id} onChange={e=>set('youtube_video_id',e.target.value)} placeholder="dQw4w9WgXcQ" /></div>
          <div><label className="label">Number of Floors (optional)</label><input className="input" type="number" value={f.total_floors} onChange={e=>set('total_floors',e.target.value)} /></div>
        </div>
        {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{err}</div>}
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">{loading?'Publishing…':'List Property'}</button>
          <button type="button" onClick={() => navigate('/portal/properties')} className="btn-outline">Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ─── Bookings (counts only — no individual student details) ────
function BookingCountChip({ label, count, color }) {
  if (!count || count === '0') return null;
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[72px] ${color}`}>
      <span className="font-display font-bold text-xl leading-none">{count}</span>
      <span className="text-[10px] font-medium mt-0.5 text-center leading-tight">{label}</span>
    </div>
  );
}

function BookingsList() {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/portal/bookings')
      .then(r => { setRows(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  // Group rows by property
  const byProperty = rows.reduce((acc, row) => {
    const key = row.property_id;
    if (!acc[key]) acc[key] = { id: row.property_id, name: row.property_name, area: row.area, rooms: [] };
    acc[key].rooms.push(row);
    return acc;
  }, {});
  const properties = Object.values(byProperty);

  if (properties.length === 0) {
    return (
      <div className="p-5 lg:p-8">
        <div className="text-center py-20 text-slate-400">
          <BookOpen size={44} className="mx-auto mb-3 opacity-40"/>
          <p className="font-medium">No bookings yet</p>
          <p className="text-sm mt-1">Booking activity will appear here once students start booking your rooms.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen size={20} className="text-primary"/>
        <h2 className="font-display font-bold text-lg text-slate-900">Booking Overview</h2>
        <span className="badge badge-blue ml-1">{properties.length} {properties.length === 1 ? 'property' : 'properties'}</span>
      </div>

      {properties.map(prop => {
        const totalActive  = prop.rooms.reduce((s,r) => s + parseInt(r.active_tenants||0), 0);
        const totalPending = prop.rooms.reduce((s,r) => s + parseInt(r.pending||0), 0);
        const totalSlots   = prop.rooms.reduce((s,r) => s + parseInt(r.total_slots||0), 0);

        return (
          <div key={prop.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Property header */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-5 py-4 border-b border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-primary"/>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-900">{prop.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{prop.area}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-500">Active / Total Slots</div>
                  <div className="font-display font-bold text-lg text-primary">
                    {totalActive} <span className="text-slate-400 font-normal text-sm">/ {totalSlots}</span>
                  </div>
                  {totalPending > 0 && (
                    <div className="text-xs text-amber-600 font-medium mt-0.5">{totalPending} pending review</div>
                  )}
                </div>
              </div>
            </div>

            {/* Room type rows */}
            <div className="divide-y divide-slate-100">
              {prop.rooms.map(room => (
                <div key={room.room_id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <BedDouble size={15} className="text-slate-400"/>
                        <span className="font-semibold text-slate-800 text-sm capitalize">{room.room_type}</span>
                        {parseInt(room.capacity) > 1 && (
                          <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{room.capacity} per room</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        TZS {Number(room.monthly_price).toLocaleString()}/mo · {room.total_count} room{room.total_count != 1 ? 's' : ''} · {room.total_slots} beds total
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <BookingCountChip label="Pending"         count={room.pending}         color="bg-amber-50  text-amber-700 border border-amber-100"/>
                      <BookingCountChip label="In Progress"     count={room.in_progress}     color="bg-blue-50   text-blue-700  border border-blue-100"/>
                      <BookingCountChip label="Awaiting Confirm"count={room.awaiting_confirm}color="bg-purple-50 text-purple-700 border border-purple-100"/>
                      <BookingCountChip label="Active Tenants"  count={room.active_tenants}  color="bg-green-50  text-green-700 border border-green-100"/>
                      <BookingCountChip label="Closed"          count={room.closed}          color="bg-slate-100 text-slate-500"/>
                    </div>
                  </div>
                  {/* Occupancy bar */}
                  {parseInt(room.total_slots) > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Occupancy</span>
                        <span>{room.active_tenants || 0} / {room.total_slots} beds</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all"
                          style={{ width: `${Math.min(100, ((room.active_tenants||0) / room.total_slots) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-slate-400 text-center">
        Booking details are managed by Geto staff on your behalf. Contact support for any queries.
      </p>
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
      {viewings.length === 0 && <div className="text-center py-16 text-slate-400"><CalendarCheck size={40} className="mx-auto mb-3"/>No viewing requests yet.</div>}
      {viewings.map(v => (
        <div key={v.id} className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="font-semibold text-slate-900">{v.student_name} <span className="text-slate-400 text-xs">{v.student_phone}</span></div>
          <div className="text-sm text-slate-600 mt-0.5">{v.property_name}</div>
          <div className="text-xs text-slate-500 mt-1">Date: {v.preferred_date} · Time: {v.preferred_time}</div>
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
        <div className="text-xs text-slate-500 mb-1">Your Referral Code</div>
        <div className="font-display font-bold text-2xl text-primary mb-2">{data?.referral_code}</div>
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600 break-all">
          <span className="flex-1">{link}</span>
          <button onClick={() => navigator.clipboard.writeText(link)} className="text-primary font-semibold shrink-0">Copy</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Registered"    value={data?.stats?.total_referred}  />
        <StatCard label="Booked Rooms"  value={data?.stats?.total_booked} color="text-accent" />
      </div>
      {data?.referrals?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 font-semibold text-sm">Referred Users</div>
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
    assigned:'badge-blue', payment_confirmed:'badge-green',
    student_confirmed:'badge-green', checked_in:'badge-green',
    checked_out:'badge-gray', move_out_requested:'badge-amber', move_out_completed:'badge-gray',
  };
  const labels = {
    pending:'Pending', approved:'Approved', rejected:'Rejected',
    confirmed:'Confirmed', cancelled:'Cancelled', accepted:'Accepted',
    payment_pending:'Payment Pending', move_in_completed:'Moved In',
    pending_verification:'Pending Verification', active:'Active', suspended:'Suspended',
    assigned:'Assigned', payment_confirmed:'Payment Confirmed',
    student_confirmed:'Student Confirmed', checked_in:'Checked In',
    checked_out:'Checked Out', move_out_requested:'Move-Out Req.', move_out_completed:'Moved Out',
  };
  return <span className={`badge ${map[status]||'badge-gray'}`}>{labels[status]||status}</span>;
}

// ─── Payout Profile ───────────────────────────────────────────
function PayoutProfile() {
  const PROVIDERS = ['mpesa','airtel','tigo','halotel'];
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState('');
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [consentChecked, setConsent]  = useState(false);
  const [form, setForm] = useState({
    payout_type: 'mobile_money',
    provider: 'mpesa',
    phone: '',
    account_name: '',
    account_number: '',
    bank_name: '',
  });

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const accountFilled = form.payout_type === 'mobile_money'
    ? !!form.phone.trim()
    : !!(form.bank_name.trim() && form.account_number.trim() && form.account_name.trim());

  useEffect(() => {
    api.get('/portal/payout-profile')
      .then(r => {
        const p = r.data;
        if (p) {
          setProfile(p);
          setForm({
            payout_type:    p.payout_type    || 'mobile_money',
            provider:       p.provider       || 'mpesa',
            phone:          p.phone          || '',
            account_name:   p.account_name   || '',
            account_number: p.account_number || '',
            bank_name:      p.bank_name      || '',
          });
          const enabled = !!p.auto_payout_enabled;
          setAutoEnabled(enabled);
          setConsent(enabled);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (autoEnabled && !consentChecked) {
      setError('Please check the consent box to enable automatic deposit collection.');
      return;
    }
    setSaving(true); setError(''); setSaved(false);
    try {
      await api.post('/portal/payout-profile', {
        ...form,
        auto_payout_enabled: autoEnabled,
        auto_payout_consent: autoEnabled && consentChecked,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch(err) {
      setError(err.response?.data?.message || 'Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={28} className="animate-spin text-primary"/>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-display font-bold text-slate-900">Payout Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Where your rental income is automatically sent after a payment is confirmed.
        </p>
      </div>

      {!profile && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-5 flex items-start gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5"/>
          <span>No payout profile set. Rent payments will be held until you add one.</span>
        </div>
      )}

      <form onSubmit={save} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
        {/* Type toggle */}
        <div>
          <label className="label">Payout Method</label>
          <div className="flex gap-3 mt-1">
            <button type="button"
              onClick={() => setF('payout_type', 'mobile_money')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors
                ${form.payout_type === 'mobile_money'
                  ? 'bg-primary text-white border-primary'
                  : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'}`}>
              <Smartphone size={15}/>Mobile Money
            </button>
            <button type="button"
              onClick={() => setF('payout_type', 'bank')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors
                ${form.payout_type === 'bank'
                  ? 'bg-primary text-white border-primary'
                  : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'}`}>
              <Building size={15}/>Bank Account
            </button>
          </div>
        </div>

        {form.payout_type === 'mobile_money' && (
          <>
            <div>
              <label className="label">Provider</label>
              <select className="input" value={form.provider} onChange={e => setF('provider', e.target.value)}>
                {PROVIDERS.map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Mobile Number <span className="text-red-500">*</span></label>
              <input type="tel" className="input" placeholder="e.g. 0712 345 678"
                value={form.phone} onChange={e => setF('phone', e.target.value)} required/>
            </div>
            <div>
              <label className="label">Account Name (as registered)</label>
              <input type="text" className="input" placeholder="e.g. John Doe"
                value={form.account_name} onChange={e => setF('account_name', e.target.value)}/>
            </div>
          </>
        )}

        {form.payout_type === 'bank' && (
          <>
            <div>
              <label className="label">Bank Name <span className="text-red-500">*</span></label>
              <input type="text" className="input" placeholder="e.g. CRDB Bank"
                value={form.bank_name} onChange={e => setF('bank_name', e.target.value)} required/>
            </div>
            <div>
              <label className="label">Account Number <span className="text-red-500">*</span></label>
              <input type="text" className="input" placeholder="e.g. 0150123456789"
                value={form.account_number} onChange={e => setF('account_number', e.target.value)} required/>
            </div>
            <div>
              <label className="label">Account Name <span className="text-red-500">*</span></label>
              <input type="text" className="input" placeholder="e.g. John Doe"
                value={form.account_name} onChange={e => setF('account_name', e.target.value)} required/>
            </div>
          </>
        )}

        {/* Auto deposit collection opt-in — shown only when account details are filled */}
        {accountFilled && (
          <div className={`rounded-xl border p-4 space-y-3 transition-colors ${autoEnabled ? 'bg-violet-50 border-violet-300' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">Automatic Deposit Collection</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Let Geto collect the student's deposit via mobile money and disburse it to you automatically.
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setAutoEnabled(v => !v); setConsent(false); }}
                className={`shrink-0 w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${autoEnabled ? 'bg-violet-600' : 'bg-slate-300'}`}
                aria-label="Toggle automatic deposit collection">
                <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${autoEnabled ? 'translate-x-5' : 'translate-x-0'}`}/>
              </button>
            </div>
            {autoEnabled && (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-violet-600 shrink-0"
                  checked={consentChecked}
                  onChange={e => setConsent(e.target.checked)}
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  I consent to Geto Student collecting the security deposit from students on my behalf and automatically disbursing it to my registered payout account via Snippe. I understand Geto will deduct applicable Snippe fees from the collected Geto service fee — not from my deposit amount.
                </span>
              </label>
            )}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>
        )}

        <div className="pt-1">
          <button type="submit" disabled={saving || (autoEnabled && !consentChecked)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving
              ? <><Loader2 size={14} className="animate-spin"/>Saving…</>
              : saved
                ? <><Check size={14}/>Saved!</>
                : <><Save size={14}/>Save Payout Profile</>}
          </button>
        </div>
      </form>

      <div className="mt-4 text-xs text-slate-400 text-center">
        Payouts are sent automatically after a student's payment is confirmed via mobile money.
      </div>
    </div>
  );
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
            <Route path="payout"          element={<PayoutProfile />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
