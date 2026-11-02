import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Calendar, Clock, CheckCircle2, XCircle, Copy, Users, Star, QrCode, BedDouble, MapPin, Hash, Home, DoorOpen, Sofa, ShieldCheck, Heart, Building2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api';

const STATUS_COLORS = {
  pending:           'badge-pending',
  accepted:          'badge-approved',
  assigned:          'badge-approved',
  payment_pending:   'bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1',
  payment_confirmed: 'bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1',
  student_confirmed: 'badge-verified',
  confirmed:         'badge-verified',
  active:            'badge-verified',
  checked_in:        'badge-verified',
  cancelled:         'badge-rejected',
  rejected:          'badge-rejected',
  move_in_completed: 'badge-verified',
  move_out_requested:'bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1',
  move_out_completed:'bg-slate-100 text-slate-500 border border-slate-200 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1',
  checked_out:       'bg-slate-100 text-slate-500 border border-slate-200 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1',
  scheduled:         'badge-approved',
  completed:         'badge-verified',
};
const fmt = s => s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab]       = useState('bookings');
  const [bookings, setBks]  = useState([]);
  const [viewings, setVws]  = useState([]);
  const [saved, setSaved]   = useState([]);
  const [referralStats, setRefStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roomAssignment, setRoomAssignment] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/student/bookings').then(r => setBks(r.data)),
      api.get('/student/viewings').then(r => setVws(r.data)).catch(() => {}),
      api.get('/student/room-assignment').then(r => setRoomAssignment(r.data)).catch(() => {}),
      api.get('/student/saved').then(r => setSaved(r.data)).catch(() => {}),
      api.get('/student/referrals').then(r => setRefStats(r.data?.stats)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const copyRef = () => {
    navigator.clipboard.writeText(`https://getostudent.tz/join?ref=${user.referral_code}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // New state machine steps — maps both old and new statuses to a visual step index
  const STATUS_STEPS = ['pending','assigned','payment_pending','payment_confirmed','active','checked_in'];
  const STATUS_STEP_INDEX = {
    pending:0, accepted:1, assigned:1,
    payment_pending:2,
    payment_confirmed:3,
    student_confirmed:4, confirmed:4, active:4,
    checked_in:5, move_in_completed:5,
  };

  const STEP_META = {
    pending:           { emoji: '📤', label: 'Request Sent',         desc: 'Your booking request has been received and is under review.' },
    assigned:          { emoji: '👤', label: 'Being Handled',        desc: 'A Geto officer has been assigned to follow up on your booking.' },
    payment_pending:   { emoji: '💳', label: 'Payment Required',     desc: 'Your booking is accepted. Arrange payment with your Geto officer or admin.' },
    payment_confirmed: { emoji: '✅', label: 'Payment Recorded',      desc: 'Payment has been recorded. Please confirm below to activate your QR code.' },
    active:            { emoji: '🏠', label: 'Confirmed & Active',   desc: 'Your booking is fully confirmed. Your QR check-in code is active!' },
    checked_in:        { emoji: '🎉', label: 'Checked In',           desc: 'You are officially a resident. Welcome home!' },
  };

  const fmtDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-TZ', { day:'numeric', month:'short', year:'numeric' }) : '—';
  const fmtAmt  = n => Number(n).toLocaleString('en-TZ');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-primary-700 text-white py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-primary-200 font-semibold uppercase tracking-wider mb-1">Student Dashboard</p>
              <h1 className="font-display font-bold text-2xl sm:text-3xl">Welcome, {user.name.split(' ')[0]}!</h1>
              <p className="text-primary-200 text-sm mt-1">{user.university_name || 'Geto Student'}</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-primary-200">Referral Code</p>
              <p className="font-mono font-bold text-accent-400 text-lg">{user.referral_code}</p>
            </div>
          </div>
          {/* Tab nav */}
          <div className="flex gap-1 mt-6 overflow-x-auto">
            {[['bookings','🏠 My Bookings'],['viewings','📅 Site Viewings'],['saved','❤️ Saved'],['referrals','🎁 Referrals']].map(([id,label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${tab===id ? 'bg-white text-primary-700' : 'text-primary-200 hover:text-white hover:bg-white/10'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── BOOKINGS ── */}
        {tab === 'bookings' && (
          <div>
            {/* Assigned room banner */}
            {roomAssignment && (
              <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl p-5 mb-6 text-white shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="bg-white/15 rounded-xl p-3 shrink-0">
                    <BedDouble size={24} className="text-accent"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary-200 uppercase tracking-wider mb-0.5">Your Assigned Room</p>
                    <h3 className="font-display font-bold text-xl leading-tight">
                      Room {roomAssignment.unit_number}
                    </h3>
                    <p className="text-primary-200 text-sm mt-0.5">{roomAssignment.room_type} · {roomAssignment.property_name}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-primary-200">
                      <span className="flex items-center gap-1"><Hash size={11}/>Floor {roomAssignment.floor}</span>
                      <span className="flex items-center gap-1"><MapPin size={11}/>{roomAssignment.area}</span>
                      {roomAssignment.contract_end && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11}/>Lease ends {fmtDate(roomAssignment.contract_end)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-xl text-slate-900">My Booking Requests</h2>
              <button onClick={() => navigate('/find-room')} className="btn-outline text-sm">Find more rooms</button>
            </div>
            {loading ? <p className="text-slate-400 text-sm">Loading…</p>
            : bookings.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-5xl mb-4">🏠</div>
                <h3 className="font-display font-bold text-xl text-slate-800 mb-2">No bookings yet</h3>
                <p className="text-slate-500 text-sm mb-5">Browse verified accommodation and send your first booking request.</p>
                <button onClick={() => navigate('/find-room')} className="btn-primary">Find a Room →</button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map(b => {
                  const idx = STATUS_STEP_INDEX[b.status] ?? -1;
                  const isEnded = ['rejected','cancelled','move_out_completed','checked_out'].includes(b.status);
                  if (isEnded) return (
                    <div key={b.id} className={`card p-5 border-l-4 ${b.status === 'move_out_completed' ? 'border-slate-300' : 'border-red-300'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display font-bold text-slate-900">{b.property_name}</h3>
                          <p className="text-sm text-slate-500 mt-0.5">{b.room_type} · {b.area}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {b.status === 'move_out_completed' ? '🎉 You have successfully moved out.' : `Requested: ${fmtDate(b.move_in_date)}`}
                          </p>
                        </div>
                        <span className={`${STATUS_COLORS[b.status]} shrink-0`}>{fmt(b.status)}</span>
                      </div>
                      <button onClick={() => navigate('/find-room')} className="mt-4 w-full py-2 text-xs font-semibold text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition-colors">
                        {b.status === 'move_out_completed' ? 'Find your next home →' : 'Find another room →'}
                      </button>
                    </div>
                  );
                  return (
                  <div key={b.id} className="card overflow-hidden">

                    {/* ── Header: property photo + name + status ── */}
                    <div className="relative">
                      {b.property_photo ? (
                        <img src={b.property_photo} alt={b.property_name}
                          className="w-full h-32 object-cover"/>
                      ) : (
                        <div className="w-full h-32 bg-primary-900 flex items-center justify-center">
                          <Home size={36} className="text-white/30"/>
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
                      {/* Status badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`${STATUS_COLORS[b.status] || 'badge-pending'} shadow-lg`}>{fmt(b.status)}</span>
                      </div>
                      {/* Property type */}
                      {b.property_type && (
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-primary text-[10px] font-bold px-2 py-1 rounded-lg">
                          {b.property_type}
                        </div>
                      )}
                      {/* Property name on photo */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="font-display font-bold text-white text-base leading-tight">{b.property_name}</h3>
                        <p className="text-white/70 text-xs flex items-center gap-1 mt-0.5">
                          <MapPin size={10}/>{b.area}
                        </p>
                      </div>
                    </div>

                    {/* ── Room details strip ── */}
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5 font-semibold text-primary">
                        <BedDouble size={13}/>{b.room_type}
                      </span>
                      <span className="font-bold text-accent-700">TZS {Number(b.monthly_price).toLocaleString()}/mo</span>
                      {b.bathroom_type && <span className="flex items-center gap-1"><DoorOpen size={11} className="text-slate-400"/>{b.bathroom_type} bathroom</span>}
                      {!!b.furnished && <span className="flex items-center gap-1"><Sofa size={11} className="text-slate-400"/>Furnished</span>}
                      {b.unit_number && (
                        <span className="flex items-center gap-1 text-primary font-semibold">
                          <Hash size={11}/>Floor {b.unit_floor} · Room {b.unit_number}
                        </span>
                      )}
                    </div>

                    {/* ── Phone-style vertical status timeline ── */}
                    <div className="px-4 pt-4 pb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Booking Status</p>
                      {STATUS_STEPS.map((step, i) => {
                        const done    = i < idx;
                        const current = idx === i;
                        const future  = i > idx;
                        const meta    = STEP_META[step] || { emoji: '•', label: fmt(step), desc: '' };
                        const isLast  = i === STATUS_STEPS.length - 1;
                        return (
                          <div key={step} className="flex gap-3">
                            {/* Dot + connector */}
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-all
                                ${done    ? 'bg-green-500 text-white shadow-sm'
                                : current ? 'bg-primary text-white shadow-md ring-4 ring-primary/15'
                                           : 'bg-slate-100 text-slate-400'}`}>
                                {done ? <CheckCircle2 size={16}/> : <span>{meta.emoji}</span>}
                              </div>
                              {!isLast && (
                                <div className={`w-0.5 flex-1 min-h-[18px] my-1 rounded-full ${done ? 'bg-green-400' : 'bg-slate-200'}`}/>
                              )}
                            </div>
                            {/* Content */}
                            <div className={`pb-4 pt-1 flex-1 min-w-0 ${future ? 'opacity-35' : ''}`}>
                              <div className="flex items-center justify-between gap-2">
                                <p className={`font-semibold text-sm ${current ? 'text-primary' : done ? 'text-slate-800' : 'text-slate-400'}`}>
                                  {meta.label}
                                </p>
                                {current && (
                                  <span className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0">Active</span>
                                )}
                              </div>
                              {(current || done) && (
                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{meta.desc}</p>
                              )}

                              {/* QR code — shown when active/student_confirmed/checked_in */}
                              {step === 'active' && (current || done) && b.qr_token && (
                                <div className="mt-3 flex items-center gap-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                                  <div className="bg-white border-2 border-emerald-400 rounded-xl p-2 shrink-0 shadow-sm">
                                    <QRCodeSVG
                                      value={`${window.location.origin}/checkin/${b.qr_token}`}
                                      size={80}
                                      fgColor="#1D2040"
                                      level="M"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <QrCode size={12} className="text-emerald-600"/>
                                      <span className="font-bold text-xs text-slate-800">Room Access QR</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-snug">Show this QR to property staff to verify your tenancy.</p>
                                    <p className="text-[10px] font-semibold text-slate-600 mt-1.5">
                                      {b.room_type}{b.unit_number ? ` · Unit ${b.unit_number}` : ''}{b.unit_floor ? ` (Floor ${b.unit_floor})` : ''}
                                    </p>
                                    {b.amount_paid && (
                                      <p className="text-xs font-bold text-green-600 mt-0.5">
                                        <ShieldCheck size={11} className="inline mr-1"/>TZS {fmtAmt(b.amount_paid)} paid
                                      </p>
                                    )}
                                    {(b.contract_start || b.contract_end) && (
                                      <p className="text-[10px] text-slate-400 mt-1">
                                        {fmtDate(b.contract_start)} → {fmtDate(b.contract_end)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Move-in date under pending */}
                              {step === 'pending' && current && (
                                <p className="text-xs text-slate-400 mt-1">
                                  <Calendar size={10} className="inline mr-1"/>Requested move-in: {fmtDate(b.move_in_date)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* ── Payment pending → show expected cost (excl. tx fee) ── */}
                    {b.status === 'payment_pending' && b.monthly_price && (() => {
                      const mo          = Number(b.monthly_price);
                      const autoDeposit = !!b.owner_auto_payout;
                      const isHostel    = (b.property_type || '').toLowerCase() === 'hostel';
                      const dep         = autoDeposit ? mo * (b.deposit_months || 1) : 0;
                      const gf          = isHostel ? Math.round(mo * 0.75) : mo;
                      return (
                        <div className="mx-4 mb-4 bg-violet-50 border border-violet-200 rounded-2xl p-4">
                          <div className="font-semibold text-violet-800 text-sm mb-3">Expected Payment</div>
                          <div className="space-y-1.5 text-sm">
                            {autoDeposit ? (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Deposit ({b.deposit_months||1} mo × TZS {mo.toLocaleString()})</span>
                                <span className="font-semibold">TZS {dep.toLocaleString()}</span>
                              </div>
                            ) : (
                              <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                                Deposit paid directly to owner — ask your Geto officer for details.
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-600">Geto service fee <span className="text-slate-400 text-xs">({isHostel ? '75%' : '1 month'})</span></span>
                              <span className="font-semibold">TZS {gf.toLocaleString()}</span>
                            </div>
                            <div className="border-t border-violet-200 pt-2 flex justify-between">
                              <span className="font-bold text-slate-800">Subtotal</span>
                              <span className="font-bold text-violet-700">TZS {(dep+gf).toLocaleString()}</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-2.5">* A small transaction fee from Snippe will be added at checkout.</p>
                        </div>
                      );
                    })()}

                    {/* ── Payment confirmed → student must confirm ── */}
                    {b.status === 'payment_confirmed' && (
                      <div className="mx-4 mb-4 bg-orange-50 border border-orange-200 rounded-2xl p-4">
                        <div className="font-semibold text-orange-800 text-sm mb-1">Payment recorded by staff</div>
                        <p className="text-xs text-orange-700 mb-3">
                          Staff has recorded your payment of
                          {b.amount_paid ? <strong className="ml-1">TZS {fmtAmt(b.amount_paid)}</strong> : ' an amount'}.
                          Please confirm this is correct to activate your QR check-in code.
                        </p>
                        <button
                          onClick={async () => {
                            if (!confirm('Confirm this payment and activate your QR code?')) return;
                            try {
                              const r = await api.post(`/student/bookings/${b.id}/confirm`);
                              setBks(prev => prev.map(bk => bk.id === b.id ? { ...bk, status: 'active', qr_token: r.data.qr_token } : bk));
                            } catch(e) { alert(e.response?.data?.message || 'Could not confirm. Please try again.'); }
                          }}
                          className="w-full py-2.5 text-sm font-bold bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors">
                          Confirm & Activate QR Code
                        </button>
                      </div>
                    )}

                    {/* Move-out pending banner */}
                    {b.status === 'move_out_requested' && (
                      <div className="mx-4 mb-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                        <span className="font-bold">Move-out requested.</span> The admin will confirm and update your status shortly.
                      </div>
                    )}

                    {/* Request Move-Out button (active/confirmed/moved-in tenants) */}
                    {['active','student_confirmed','confirmed','move_in_completed','checked_in'].includes(b.status) && (
                      <div className="px-4 pb-4">
                        <button
                          onClick={async () => {
                            if (!confirm('Request move-out? The admin will be notified to process your departure.')) return;
                            try {
                              await api.put(`/student/bookings/${b.id}/request-moveout`);
                              setBks(prev => prev.map(bk => bk.id === b.id ? { ...bk, status: 'move_out_requested' } : bk));
                            } catch { alert('Could not submit move-out request. Please try again.'); }
                          }}
                          className="w-full py-2 text-xs font-semibold text-amber-700 border border-amber-300 rounded-xl hover:bg-amber-50 transition-colors">
                          Request Move-Out
                        </button>
                      </div>
                    )}

                    {/* Cancel button for pending, accepted, or assigned bookings */}
                    {['pending','accepted','assigned'].includes(b.status) && (
                      <div className="px-4 pb-4">
                        <button
                          onClick={async () => {
                            if (!confirm('Cancel this booking request?')) return;
                            try {
                              await api.put(`/student/bookings/${b.id}/cancel`);
                              setBks(prev => prev.map(bk => bk.id === b.id ? { ...bk, status: 'cancelled' } : bk));
                            } catch { alert('Could not cancel. Please try again.'); }
                          }}
                          className="w-full py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
                          Cancel Request
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── VIEWINGS ── */}
        {tab === 'viewings' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-xl text-slate-900">Site Viewing Requests</h2>
              <button onClick={() => navigate('/find-room')} className="btn-outline text-sm">Find a property to visit</button>
            </div>
            {loading ? <p className="text-slate-400 text-sm">Loading…</p>
            : viewings.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-5xl mb-4">📅</div>
                <h3 className="font-display font-bold text-xl text-slate-800 mb-2">No viewing requests</h3>
                <p className="text-slate-500 text-sm mb-5">Open a property and click "Request Site Viewing" to book an in-person visit.</p>
                <button onClick={() => navigate('/find-room')} className="btn-primary">Browse Properties →</button>
              </div>
            ) : (
              <div className="space-y-4">
                {viewings.map(v => (
                  <div key={v.id} className="card p-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display font-bold text-slate-900">{v.property_name}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">📅 {v.preferred_date} · {v.preferred_time}</p>
                      {v.notes && <p className="text-xs text-slate-400 mt-1 italic">"{v.notes}"</p>}
                    </div>
                    <span className={STATUS_COLORS[v.status] || 'badge-pending'}>{fmt(v.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SAVED ── */}
        {tab === 'saved' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-xl text-slate-900">Saved Properties</h2>
              <button onClick={() => navigate('/find-room')} className="btn-outline text-sm">Browse more</button>
            </div>
            {loading ? <p className="text-slate-400 text-sm">Loading…</p>
            : saved.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-5xl mb-4">❤️</div>
                <h3 className="font-display font-bold text-xl text-slate-800 mb-2">No saved properties</h3>
                <p className="text-slate-500 text-sm mb-5">Tap the heart icon on any property to save it here.</p>
                <button onClick={() => navigate('/find-room')} className="btn-primary">Browse Properties →</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {saved.map(p => (
                  <div key={p.id} className="card p-4 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 size={22} className="text-primary"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display font-semibold text-slate-900 truncate">{p.name}</h3>
                        {p.verified && <span className="badge-verified text-[10px] shrink-0"><CheckCircle2 size={9}/>Verified</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{p.property_type} · {p.area}</p>
                      {p.university_name && <p className="text-xs text-primary/70 mt-0.5">Near {p.university_name}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── REFERRALS ── */}
        {tab === 'referrals' && (
          <div className="space-y-6">
            <h2 className="font-display font-bold text-xl text-slate-900">Your Referral Program</h2>
            <div className="card bg-gradient-to-r from-primary-700 to-primary-800 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-200 mb-1">Your Referral Code</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="font-mono font-bold text-2xl text-accent-400">{user.referral_code}</span>
                <button onClick={copyRef}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'}`}>
                  <Copy size={13}/> {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              <p className="text-primary-200 text-xs mt-3">Share your referral link. Earn a TZS reward when your friend successfully books and moves in.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                ['Total Referrals', referralStats?.total_referrals ?? '0', <Users size={18}/>],
                ['Successful Bookings', referralStats?.successful ?? '0', <CheckCircle2 size={18}/>],
                ['Rewards Earned', `TZS ${Number(referralStats?.rewards_earned ?? 0).toLocaleString()}`, <Star size={18}/>],
                ['Pending Rewards', `TZS ${Number(referralStats?.pending_rewards ?? 0).toLocaleString()}`, <Clock size={18}/>],
              ].map(([l,v,icon]) => (
                <div key={l} className="card p-4">
                  <div className="text-primary-700 mb-2">{icon}</div>
                  <p className="font-display font-bold text-xl text-slate-900">{v}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
            <div className="card p-5">
              <h4 className="font-display font-semibold text-slate-800 mb-3">How referral rewards work</h4>
              <ol className="space-y-3 text-sm text-slate-600">
                {['Share your unique referral code or link with friends.',
                  'Your friend registers on Geto Student using your code.',
                  'Your friend successfully books and moves into accommodation.',
                  'You earn a TZS reward — paid directly to your mobile money.'].map((s,i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-700/10 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
