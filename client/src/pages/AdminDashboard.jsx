import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, XCircle, Clock, Shield, Users, Building2, BookOpen, Eye, AlertTriangle } from 'lucide-react';
import api from '../api';

const fmt = s => s?.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) || '';

function StatCard({ icon, label, value, color='text-primary-700' }) {
  return (
    <div className="card p-5">
      <div className={`${color} mb-2`}>{icon}</div>
      <p className="font-display font-bold text-2xl text-slate-900">{value ?? '—'}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab]       = useState('overview');
  const [stats, setStats]   = useState({});
  const [agents, setAgents] = useState([]);
  const [properties, setProps] = useState([]);
  const [bookings, setBks]  = useState([]);
  const [viewings, setVws]  = useState([]);
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyModal, setVerifyModal] = useState(null); // property to verify
  const [verifyForm, setVerifyForm]   = useState({ owner_identity:true,location_confirmed:true,rooms_confirmed:true,water_confirmed:true,electricity_confirmed:true,security_confirmed:true,price_confirmed:true,notes:'' });
  const [msgMap, setMsgMap] = useState({});

  const setMsg = (key, val) => setMsgMap(m => ({ ...m, [key]: val }));

  const loadAll = async () => {
    setLoading(true);
    try {
      const [st,ag,pr,bk,vw,us] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/agents'),
        api.get('/admin/properties'),
        api.get('/bookings'),
        api.get('/viewings'),
        api.get('/admin/users'),
      ]);
      setStats(st.data); setAgents(ag.data); setProps(pr.data); setBks(bk.data); setVws(vw.data); setUsers(us.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  // Agent actions
  const approveAgent = async (id) => { await api.put(`/agents/${id}/approve`); setMsg('agent',id+'approved'); loadAll(); };
  const rejectAgent  = async (id) => { await api.put(`/agents/${id}/reject`, { note: 'Application does not meet requirements.' }); loadAll(); };

  // Property actions
  const approveProperty  = async (id) => { await api.put(`/admin/properties/${id}/approve`); loadAll(); };
  const rejectProperty   = async (id, note) => { await api.put(`/admin/properties/${id}/reject`, { note: note||'Property does not meet our standards.' }); loadAll(); };
  const verifyProperty   = async () => {
    await api.put(`/admin/properties/${verifyModal.id}/verify`, verifyForm);
    setVerifyModal(null); loadAll();
  };
  const revokeVerify     = async (id) => { await api.put(`/admin/properties/${id}/revoke-verify`); loadAll(); };

  // Booking actions
  const updateBookingStatus = async (id, status) => { await api.put(`/bookings/${id}/status`, { status }); loadAll(); };
  // Viewing actions
  const updateViewingStatus = async (id, status) => { await api.put(`/viewings/${id}/status`, { status }); loadAll(); };

  const pendingAgents = agents.filter(a => a.status === 'pending');
  const pendingProps  = properties.filter(p => p.status === 'pending');
  const approvedProps = properties.filter(p => p.status === 'approved');

  const TABS = [
    ['overview',  '📊 Overview'],
    ['agents',    `🔐 Agents${pendingAgents.length ? ` (${pendingAgents.length} pending)` : ''}`],
    ['properties',`🏠 Properties${pendingProps.length ? ` (${pendingProps.length} pending)` : ''}`],
    ['bookings',  '📋 Bookings'],
    ['viewings',  '📅 Viewings'],
    ['users',     '👥 Users'],
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-primary-700 text-white py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs text-primary-200 uppercase tracking-wider font-semibold mb-1">Admin Dashboard</p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl">Geto Student Admin</h1>
          <p className="text-primary-200 text-sm mt-1">Logged in as {user.name}</p>
          <div className="flex gap-1 mt-6 overflow-x-auto pb-1">
            {TABS.map(([id,label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${tab===id ? 'bg-white text-primary-700' : 'text-primary-200 hover:text-white hover:bg-white/10'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <StatCard icon={<Users size={20}/>}      label="Registered Students" value={stats.students} />
              <StatCard icon={<Building2 size={20}/>}  label="Approved Properties" value={stats.approved_properties} />
              <StatCard icon={<Shield size={20}/>}     label="Verified Properties"  value={stats.verified_properties}  color="text-verified"/>
              <StatCard icon={<BookOpen size={20}/>}   label="Total Bookings"      value={stats.total_bookings}  color="text-accent-600"/>
              <StatCard icon={<Eye size={20}/>}        label="Pending Viewings"    value={stats.pending_viewings} />
            </div>
            {(pendingAgents.length > 0 || pendingProps.length > 0) && (
              <div className="space-y-3">
                <h3 className="font-display font-semibold text-slate-700 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500"/> Action Required</h3>
                {pendingAgents.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center justify-between">
                    <p className="text-amber-800 font-semibold text-sm">⏳ {pendingAgents.length} agent application{pendingAgents.length>1?'s':''} awaiting approval</p>
                    <button onClick={() => setTab('agents')} className="btn-accent text-xs py-1.5">Review now</button>
                  </div>
                )}
                {pendingProps.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between">
                    <p className="text-blue-800 font-semibold text-sm">🏠 {pendingProps.length} property listing{pendingProps.length>1?'s':''} awaiting review</p>
                    <button onClick={() => setTab('properties')} className="btn-primary text-xs py-1.5">Review now</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── AGENTS ── */}
        {tab === 'agents' && (
          <div>
            <h2 className="font-display font-bold text-xl mb-5">Agent Accounts</h2>
            {pendingAgents.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2"><Clock size={14} className="text-amber-500"/> Pending Approval ({pendingAgents.length})</h3>
                <div className="space-y-3">
                  {pendingAgents.map(a => (
                    <div key={a.id} className="card p-5 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-display font-bold text-slate-900">{a.name}</h4>
                        <p className="text-sm text-slate-500">{a.email} · {a.phone}</p>
                        {a.business_name && <p className="text-xs text-slate-400">{a.business_name}</p>}
                        <p className="text-xs text-slate-400 mt-0.5">Applied {a.created_at?.split('T')[0]}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => approveAgent(a.id)} className="btn-success text-xs py-1.5"><CheckCircle2 size={13}/> Approve</button>
                        <button onClick={() => rejectAgent(a.id)}  className="btn-danger text-xs py-1.5"><XCircle size={13}/> Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <h3 className="font-semibold text-slate-700 text-sm mb-3">All Agents ({agents.length})</h3>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{['Name','Email','Business','Status','Properties','Joined'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {agents.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                        <td className="px-4 py-3 text-slate-500">{a.email}</td>
                        <td className="px-4 py-3 text-slate-500">{a.business_name || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={a.status==='approved'?'badge-verified':a.status==='rejected'?'badge-rejected':'badge-pending'} style={{fontSize:'10px'}}>{a.status}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{a.property_count}</td>
                        <td className="px-4 py-3 text-slate-400">{a.created_at?.split('T')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── PROPERTIES ── */}
        {tab === 'properties' && (
          <div>
            <h2 className="font-display font-bold text-xl mb-5">Property Listings</h2>
            {pendingProps.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2"><Clock size={14} className="text-amber-500"/> Awaiting Review ({pendingProps.length})</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {pendingProps.map(p => (
                    <div key={p.id} className="card overflow-hidden">
                      <div className="h-32 bg-slate-100 overflow-hidden">
                        {p.main_photo ? <img src={p.main_photo} alt={p.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-primary-700/10 to-primary-700/20">🏠</div>}
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-display font-bold text-slate-900 text-sm">{p.name}</h4>
                          <span className="badge-pending text-[10px]">Pending</span>
                        </div>
                        <p className="text-xs text-slate-500">{p.university_name} · {p.area}</p>
                        <p className="text-xs text-amber-700 font-medium mt-1">Agent: {p.agent_name} ({p.business_name})</p>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => approveProperty(p.id)} className="btn-success text-xs py-1.5 flex-1 justify-center"><CheckCircle2 size={12}/> Approve</button>
                          <button onClick={() => rejectProperty(p.id)}  className="btn-danger text-xs py-1.5 flex-1 justify-center"><XCircle size={12}/> Reject</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3 className="font-semibold text-slate-700 text-sm mb-3">Approved Listings ({approvedProps.length})</h3>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{['Property','University','Agent','Verified','Actions'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {approvedProps.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{p.university_name}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{p.agent_name}</td>
                        <td className="px-4 py-3">
                          {p.verified
                            ? <span className="badge-verified text-[10px]"><CheckCircle2 size={9}/> Verified</span>
                            : <span className="badge-pending text-[10px]"><Clock size={9}/> Unverified</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {!p.verified && (
                              <button onClick={() => setVerifyModal(p)} className="text-xs bg-primary-700 hover:bg-primary-600 text-white px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                                <Shield size={11}/> Verify
                              </button>
                            )}
                            {p.verified && (
                              <button onClick={() => revokeVerify(p.id)} className="text-xs border border-slate-200 hover:border-red-200 hover:text-red-600 text-slate-500 px-2.5 py-1 rounded-lg font-semibold">
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── BOOKINGS ── */}
        {tab === 'bookings' && (
          <div>
            <h2 className="font-display font-bold text-xl mb-5">All Bookings</h2>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{['ID','Student','Property','Room','Agent','Move-In','Status','Update'].map(h=><th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3 font-mono text-xs text-slate-400">#{b.id}</td>
                        <td className="px-3 py-3 text-slate-700">{b.student_name}</td>
                        <td className="px-3 py-3 text-slate-700 text-xs">{b.property_name}</td>
                        <td className="px-3 py-3 text-slate-500 text-xs">{b.room_type}</td>
                        <td className="px-3 py-3 text-slate-500 text-xs">{b.agent_name}</td>
                        <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">{b.move_in_date}</td>
                        <td className="px-3 py-3">
                          <span className={
                            b.status==='confirmed'||b.status==='move_in_completed' ? 'badge-verified' :
                            b.status==='accepted'  ? 'badge-approved' :
                            b.status==='rejected'||b.status==='cancelled' ? 'badge-rejected' : 'badge-pending'
                          } style={{fontSize:'10px'}}>{fmt(b.status)}</span>
                        </td>
                        <td className="px-3 py-3">
                          <select value={b.status} onChange={e=>updateBookingStatus(b.id,e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-primary-700">
                            {['pending','accepted','payment_pending','confirmed','move_in_completed','cancelled','rejected'].map(s=><option key={s} value={s}>{fmt(s)}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── VIEWINGS ── */}
        {tab === 'viewings' && (
          <div>
            <h2 className="font-display font-bold text-xl mb-5">Site Viewing Requests</h2>
            <div className="space-y-3">
              {viewings.map(v => (
                <div key={v.id} className="card p-4 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-900">{v.property_name}</h4>
                    <p className="text-sm text-slate-500">{v.student_name} ({v.student_phone}) · {v.preferred_date} ({v.preferred_time})</p>
                    <p className="text-xs text-amber-700 font-medium">Agent: {v.agent_name} · {v.agent_phone}</p>
                    {v.notes && <p className="text-xs text-slate-400 italic mt-0.5">"{v.notes}"</p>}
                  </div>
                  <select value={v.status} onChange={e=>updateViewingStatus(v.id,e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-primary-700 shrink-0">
                    {['pending','scheduled','completed','cancelled'].map(s=><option key={s} value={s}>{fmt(s)}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <div>
            <h2 className="font-display font-bold text-xl mb-5">Registered Students</h2>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{['Name','Email','Phone','University','Bookings','Joined'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.filter(u=>u.role==='student').map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                        <td className="px-4 py-3 text-slate-500">{u.email}</td>
                        <td className="px-4 py-3 text-slate-500">{u.phone}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{u.university_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{u.booking_count}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{u.created_at?.split('T')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── VERIFY PROPERTY MODAL ── */}
      {verifyModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-md">
            <div className="bg-primary-700 text-white px-6 py-5 rounded-t-2xl flex justify-between items-center">
              <div>
                <p className="text-xs text-primary-200 uppercase tracking-wider font-semibold mb-0.5">Verification</p>
                <h3 className="font-display font-bold text-lg">{verifyModal.name}</h3>
              </div>
              <button onClick={() => setVerifyModal(null)} className="text-white/60 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">Mark which items have been physically inspected and confirmed:</p>
              <div className="space-y-2">
                {[['owner_identity','Owner identity confirmed'],['location_confirmed','Location confirmed'],['rooms_confirmed','Room existence confirmed'],['water_confirmed','Water supply confirmed'],['electricity_confirmed','Electricity confirmed'],['security_confirmed','Security features confirmed'],['price_confirmed','Pricing confirmed']].map(([key,label]) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={verifyForm[key]} onChange={e=>setVerifyForm(f=>({...f,[key]:e.target.checked}))} className="w-4 h-4 accent-primary-700"/>
                    <span className="text-sm text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="label">Inspector Notes</label>
                <textarea value={verifyForm.notes} onChange={e=>setVerifyForm(f=>({...f,notes:e.target.value}))} rows={2} className="input resize-none" placeholder="Optional notes from inspection…"/>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700">
                Verification expires 3 months from today and must be renewed via a new inspection.
              </div>
              <div className="flex gap-3">
                <button onClick={verifyProperty} className="btn-success flex-1 justify-center"><Shield size={14}/> Grant GETO VERIFIED Badge</button>
                <button onClick={() => setVerifyModal(null)} className="btn-outline">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
