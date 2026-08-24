import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Upload, CheckCircle2, Clock, XCircle, Eye, ChevronRight } from 'lucide-react';
import api from '../api';

const STATUS_COLORS = {
  pending:  'badge-pending',
  approved: 'badge-verified',
  rejected: 'badge-rejected',
  accepted: 'badge-approved',
  confirmed:'badge-verified',
  cancelled:'badge-rejected',
};
const fmt = s => s?.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());

export default function AgentPortal() {
  const { agent } = useAuth();
  const [tab, setTab]     = useState('overview');
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings]     = useState([]);
  const [viewings, setViewings]     = useState([]);
  const [unis, setUnis]   = useState([]);
  const [amenities, setAmenities]   = useState([]);
  const [loading, setLoading]  = useState(true);
  const [addOpen, setAddOpen]  = useState(false);
  const [saving, setSaving]    = useState(false);
  const [addMsg, setAddMsg]    = useState('');

  // New property form state
  const [form, setForm]  = useState({ name:'', property_type:'Hostel', university_id:'', area:'', address:'', distance_km:'', description:'', youtube_video_id:'', amenity_ids:[], rooms:[{ room_type:'Single', monthly_price:'', deposit:'', capacity:1, available_count:1, furnished:false, bathroom_type:'Shared' }] });
  const fileRef = useRef();
  const [propId, setPropId] = useState(null); // id after create, for photo upload

  useEffect(() => {
    Promise.all([
      api.get('/agents/my-properties').then(r => setProperties(r.data)),
      api.get('/agents/my-bookings').then(r => setBookings(r.data)),
      api.get('/agents/my-viewings').then(r => setViewings(r.data)),
      api.get('/universities').then(r => setUnis(r.data)),
      api.get('/admin/amenities').catch(() => ({ data: [] })).then(r => setAmenities(r.data || [])),
    ]).finally(() => setLoading(false));
  }, []);

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleAmenity = (id) => setF('amenity_ids', form.amenity_ids.includes(id) ? form.amenity_ids.filter(a=>a!==id) : [...form.amenity_ids, id]);

  const addRoom = () => setF('rooms', [...form.rooms, { room_type:'Single', monthly_price:'', deposit:'', capacity:1, available_count:1, furnished:false, bathroom_type:'Shared' }]);
  const setRoom = (i, key, val) => { const r=[...form.rooms]; r[i]={...r[i],[key]:val}; setF('rooms',r); };
  const removeRoom = (i) => setF('rooms', form.rooms.filter((_,idx)=>idx!==i));

  const submitProperty = async () => {
    if (!form.name || !form.university_id || !form.area || !form.address || !form.description)
      return setAddMsg('Please fill all required fields.');
    setSaving(true); setAddMsg('');
    try {
      const payload = { ...form, rooms: form.rooms.map(r => ({ ...r, monthly_price: parseInt(r.monthly_price), deposit: parseInt(r.deposit)||0 })) };
      const { data } = await api.post('/properties', payload);
      setPropId(data.propertyId);
      setAddMsg('success');
    } catch (e) { setAddMsg(e.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const uploadPhotos = async () => {
    if (!fileRef.current?.files?.length) { setAddMsg('Please select photos first.'); return; }
    setSaving(true);
    const fd = new FormData();
    for (const f of fileRef.current.files) fd.append('photos', f);
    try {
      await api.post(`/properties/${propId}/photos`, fd, { headers:{'Content-Type':'multipart/form-data'} });
      setAddOpen(false); setPropId(null);
      setAddMsg('');
      const r = await api.get('/agents/my-properties'); setProperties(r.data);
    } catch (e) { setAddMsg('Photo upload failed: ' + (e.response?.data?.message||'')); }
    finally { setSaving(false); }
  };

  const advanceBooking = async (id, status) => {
    await api.put(`/agents/my-bookings/${id}/status`, { status });
    const r = await api.get('/agents/my-bookings'); setBookings(r.data);
  };

  if (agent.status !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="card max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="text-amber-600"/>
          </div>
          <h2 className="font-display font-bold text-xl text-slate-900 mb-2">Account Pending Approval</h2>
          <p className="text-slate-500 text-sm">Your agent account is under review by the Geto Student admin team. You'll receive an email once approved — usually within 24–48 hours.</p>
          {agent.rejection_note && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              <strong>Note from admin:</strong> {agent.rejection_note}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-primary-700 text-white py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs text-primary-200 uppercase tracking-wider font-semibold mb-1">Agent Portal</p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl">{agent.business_name || agent.name}</h1>
          <p className="text-primary-200 text-sm mt-1">{agent.email} · {agent.phone}</p>
          <div className="flex gap-1 mt-6 overflow-x-auto">
            {[['overview','Overview'],['listings','My Listings'],['bookings','Bookings'],['viewings','Viewing Requests'],['add','+ Add Property']].map(([id,label]) => (
              <button key={id} onClick={() => id==='add' ? setAddOpen(true) : setTab(id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${tab===id ? 'bg-white text-primary-700' : 'text-primary-200 hover:text-white hover:bg-white/10'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Overview */}
        {tab === 'overview' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[['Total Properties', properties.length, '🏠'],
              ['Approved', properties.filter(p=>p.status==='approved').length,'✅'],
              ['Pending Review', properties.filter(p=>p.status==='pending').length,'⏳'],
              ['Total Bookings', bookings.length,'📋']].map(([l,v,icon]) => (
              <div key={l} className="card p-5">
                <div className="text-2xl mb-2">{icon}</div>
                <p className="font-display font-bold text-2xl text-slate-900">{v}</p>
                <p className="text-xs text-slate-500 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        )}

        {/* Listings */}
        {tab === 'listings' && (
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display font-bold text-xl">My Properties</h2>
              <button onClick={() => setAddOpen(true)} className="btn-primary"><Plus size={15}/> Add Property</button>
            </div>
            {loading ? <p className="text-slate-400">Loading…</p>
            : properties.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-4xl mb-3">🏠</p>
                <h3 className="font-display font-bold text-xl mb-2">No properties yet</h3>
                <button onClick={() => setAddOpen(true)} className="btn-primary mt-3">Add Your First Property</button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {properties.map(p => (
                  <div key={p.id} className="card overflow-hidden">
                    <div className="h-36 bg-slate-100 overflow-hidden">
                      {p.main_photo
                        ? <img src={p.main_photo} alt={p.name} className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-primary-700/10 to-primary-700/20">🏠</div>}
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-display font-semibold text-slate-900 text-sm">{p.name}</h3>
                        <span className={STATUS_COLORS[p.status] || 'badge-pending'} style={{fontSize:'10px'}}>{fmt(p.status)}</span>
                      </div>
                      <p className="text-xs text-slate-500">{p.university_name}</p>
                      <div className="flex justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
                        <span>{p.room_types || 0} room types</span>
                        <span><Eye size={11} className="inline"/> {p.views_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bookings */}
        {tab === 'bookings' && (
          <div>
            <h2 className="font-display font-bold text-xl mb-5">Booking Requests</h2>
            {bookings.length === 0 ? <p className="text-slate-400 text-sm">No bookings yet.</p>
            : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>{['Property','Room','Student','Move-in','Status','Action'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bookings.map(b => (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{b.property_name}</td>
                          <td className="px-4 py-3 text-slate-600">{b.room_type}</td>
                          <td className="px-4 py-3 text-slate-600">{b.student_name}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{b.move_in_date}</td>
                          <td className="px-4 py-3"><span className={STATUS_COLORS[b.status]||'badge-pending'} style={{fontSize:'10px'}}>{fmt(b.status)}</span></td>
                          <td className="px-4 py-3">
                            {b.status === 'pending' && <div className="flex gap-1.5">
                              <button onClick={() => advanceBooking(b.id,'accepted')} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded-lg font-semibold">Accept</button>
                              <button onClick={() => advanceBooking(b.id,'rejected')} className="text-xs bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg font-semibold">Reject</button>
                            </div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Viewings */}
        {tab === 'viewings' && (
          <div>
            <h2 className="font-display font-bold text-xl mb-5">Viewing Requests</h2>
            {viewings.length === 0 ? <p className="text-slate-400 text-sm">No viewing requests yet.</p>
            : (
              <div className="space-y-3">
                {viewings.map(v => (
                  <div key={v.id} className="card p-4 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-slate-900">{v.property_name}</h4>
                      <p className="text-sm text-slate-500">{v.student_name} · {v.preferred_date} ({v.preferred_time})</p>
                      {v.notes && <p className="text-xs text-slate-400 italic mt-0.5">"{v.notes}"</p>}
                    </div>
                    <span className={STATUS_COLORS[v.status]||'badge-pending'} style={{fontSize:'10px'}}>{fmt(v.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ADD PROPERTY MODAL ── */}
      {addOpen && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setAddOpen(false)}>
          <div className="modal-box max-w-2xl">
            <div className="bg-primary-700 text-white px-6 py-5 rounded-t-2xl flex justify-between items-center">
              <div>
                <p className="text-xs text-primary-200 uppercase tracking-wider font-semibold mb-0.5">Agent Portal</p>
                <h3 className="font-display font-bold text-xl">{addMsg === 'success' ? 'Upload Photos' : 'Add New Property'}</h3>
              </div>
              <button onClick={() => { setAddOpen(false); setPropId(null); setAddMsg(''); }} className="text-white/60 hover:text-white text-xl">✕</button>
            </div>

            {addMsg === 'success' ? (
              <div className="p-6 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
                  <CheckCircle2 size={15} className="inline mr-1.5"/> Property submitted for admin review. Now upload photos.
                </div>
                <div>
                  <label className="label">Property Photos (JPG/PNG → auto-converted to WebP)</label>
                  <input type="file" ref={fileRef} multiple accept="image/*" className="input py-2 cursor-pointer" />
                </div>
                <button onClick={uploadPhotos} disabled={saving} className="btn-primary w-full justify-center">
                  <Upload size={15}/> {saving ? 'Uploading & converting to WebP…' : 'Upload Photos'}
                </button>
                <button onClick={() => { setAddOpen(false); setPropId(null); setAddMsg(''); }} className="btn-ghost w-full justify-center text-slate-500">
                  Skip photos for now
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Property Name *</label>
                    <input value={form.name} onChange={e=>setF('name',e.target.value)} className="input" placeholder="e.g. Baraka Student Hostel" />
                  </div>
                  <div>
                    <label className="label">Property Type *</label>
                    <select value={form.property_type} onChange={e=>setF('property_type',e.target.value)} className="input">
                      {['Hostel','Apartment','House','Bedsitter','Student Residence','Shared Accommodation','Studio','Other'].map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Nearest University *</label>
                    <select value={form.university_id} onChange={e=>setF('university_id',e.target.value)} className="input">
                      <option value="">Select…</option>
                      {unis.map(u=><option key={u.id} value={u.id}>{u.short_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Area / Neighbourhood *</label>
                    <input value={form.area} onChange={e=>setF('area',e.target.value)} className="input" placeholder="e.g. Ubungo" />
                  </div>
                  <div>
                    <label className="label">Distance from campus (km)</label>
                    <input value={form.distance_km} onChange={e=>setF('distance_km',e.target.value)} type="number" step="0.1" className="input" placeholder="0.8" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Full Address *</label>
                    <input value={form.address} onChange={e=>setF('address',e.target.value)} className="input" placeholder="Plot number, street, area…" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Description *</label>
                    <textarea value={form.description} onChange={e=>setF('description',e.target.value)} rows={3} className="input resize-none" placeholder="Describe the property, what makes it good for students…"/>
                  </div>
                  <div className="col-span-2">
                    <label className="label">YouTube Video ID (optional)</label>
                    <input value={form.youtube_video_id} onChange={e=>setF('youtube_video_id',e.target.value)} className="input" placeholder="e.g. dQw4w9WgXcQ (from youtube.com/watch?v=...)" />
                  </div>
                </div>

                {/* Rooms */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="label mb-0">Rooms</label>
                    <button onClick={addRoom} className="btn-ghost text-xs"><Plus size={12}/> Add room type</button>
                  </div>
                  <div className="space-y-3">
                    {form.rooms.map((room, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-3 gap-2 relative">
                        {form.rooms.length > 1 && <button onClick={() => removeRoom(i)} className="absolute top-2 right-2 text-slate-300 hover:text-red-400"><XCircle size={14}/></button>}
                        <div>
                          <label className="label">Type</label>
                          <select value={room.room_type} onChange={e=>setRoom(i,'room_type',e.target.value)} className="input text-xs py-1.5">
                            {['Single','Shared','Double','Master','Bedsitter','Studio'].map(t=><option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="label">Price (TZS/mo)</label>
                          <input value={room.monthly_price} onChange={e=>setRoom(i,'monthly_price',e.target.value)} type="number" className="input text-xs py-1.5" placeholder="250000"/>
                        </div>
                        <div>
                          <label className="label">Deposit (TZS)</label>
                          <input value={room.deposit} onChange={e=>setRoom(i,'deposit',e.target.value)} type="number" className="input text-xs py-1.5" placeholder="250000"/>
                        </div>
                        <div>
                          <label className="label">Capacity</label>
                          <input value={room.capacity} onChange={e=>setRoom(i,'capacity',parseInt(e.target.value))} type="number" min={1} max={10} className="input text-xs py-1.5"/>
                        </div>
                        <div>
                          <label className="label">Available</label>
                          <input value={room.available_count} onChange={e=>setRoom(i,'available_count',parseInt(e.target.value))} type="number" min={0} className="input text-xs py-1.5"/>
                        </div>
                        <div>
                          <label className="label">Bathroom</label>
                          <select value={room.bathroom_type} onChange={e=>setRoom(i,'bathroom_type',e.target.value)} className="input text-xs py-1.5">
                            <option>Shared</option><option>Private</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {addMsg && addMsg !== 'success' && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addMsg}</p>}
                <button onClick={submitProperty} disabled={saving} className="btn-primary w-full justify-center">
                  {saving ? 'Submitting…' : 'Submit for Admin Review →'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
