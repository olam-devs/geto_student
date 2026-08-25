import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Calendar, Clock, CheckCircle2, XCircle, Copy, Users, Star } from 'lucide-react';
import api from '../api';

const STATUS_COLORS = {
  pending:    'badge-pending',
  accepted:   'badge-approved',
  payment_pending: 'bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1',
  confirmed:  'badge-verified',
  cancelled:  'badge-rejected',
  rejected:   'badge-rejected',
  move_in_completed: 'badge-verified',
  scheduled:  'badge-approved',
  completed:  'badge-verified',
};
const fmt = s => s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab]       = useState('bookings');
  const [bookings, setBks]  = useState([]);
  const [viewings, setVws]  = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/bookings').then(r => setBks(r.data)),
      api.get('/viewings').then(r => setVws(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const copyRef = () => {
    navigator.clipboard.writeText(`https://getostudent.tz/join?ref=${user.referral_code}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const STATUS_STEPS = ['pending','accepted','payment_pending','confirmed','move_in_completed'];

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
            {[['bookings','🏠 My Bookings'],['viewings','📅 Site Viewings'],['referrals','🎁 Referrals']].map(([id,label]) => (
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
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-xl text-slate-900">My Booking Requests</h2>
              <button onClick={() => navigate('/find-room')} className="btn-outline text-sm">Tafuta vyumba zaidi</button>
            </div>
            {loading ? <p className="text-slate-400 text-sm">Loading…</p>
            : bookings.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-5xl mb-4">🏠</div>
                <h3 className="font-display font-bold text-xl text-slate-800 mb-2">No bookings yet</h3>
                <p className="text-slate-500 text-sm mb-5">Browse verified accommodation and send your first booking request.</p>
                <button onClick={() => navigate('/find-room')} className="btn-primary">Tafuta Chumba →</button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map(b => (
                  <div key={b.id} className="card p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <p className="font-mono text-xs text-slate-400">{b.id}</p>
                        <h3 className="font-display font-bold text-slate-900">{b.room_type} — {b.property_name}</h3>
                        <p className="text-sm text-slate-500">TZS {Number(b.monthly_price).toLocaleString()} /month · Move-in: {b.move_in_date}</p>
                      </div>
                      <span className={STATUS_COLORS[b.status] || 'badge-pending'}>{fmt(b.status)}</span>
                    </div>
                    {/* Status progress */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                      {STATUS_STEPS.map((s, i) => {
                        const idx = STATUS_STEPS.indexOf(b.status);
                        const done = i < idx || b.status === s;
                        const current = b.status === s;
                        return (
                          <React.Fragment key={s}>
                            <div className="flex flex-col items-center shrink-0">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${done ? 'bg-verified text-white' : current ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                {done ? '✓' : i+1}
                              </div>
                              <span className="text-[9px] text-slate-400 mt-0.5 whitespace-nowrap">{fmt(s).split(' ')[0]}</span>
                            </div>
                            {i < STATUS_STEPS.length - 1 && <div className={`h-0.5 flex-1 min-w-[16px] ${i < idx ? 'bg-verified' : 'bg-slate-200'}`}/>}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VIEWINGS ── */}
        {tab === 'viewings' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-xl text-slate-900">Site Viewing Requests</h2>
              <button onClick={() => navigate('/find-room')} className="btn-outline text-sm">Tafuta mali ya kutembelea</button>
            </div>
            {loading ? <p className="text-slate-400 text-sm">Loading…</p>
            : viewings.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-5xl mb-4">📅</div>
                <h3 className="font-display font-bold text-xl text-slate-800 mb-2">No viewing requests</h3>
                <p className="text-slate-500 text-sm mb-5">Open a property and click "Request Site Viewing" to book an in-person visit.</p>
                <button onClick={() => navigate('/find-room')} className="btn-primary">Tafuta Mali →</button>
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
              {[['Total Referrals','0',<Users size={18}/>],['Successful Bookings','0',<CheckCircle2 size={18}/>],['Rewards Earned','TZS 0',<Star size={18}/>],['Pending Rewards','TZS 0',<Clock size={18}/>]].map(([l,v,icon]) => (
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
