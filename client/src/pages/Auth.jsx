import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Building2, GraduationCap, Shield, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

// staffMode=true → admin/zone_manager login page at /admin/login
export default function Auth({ staffMode = false }) {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { login, staffLogin, register } = useAuth();

  const [tab, setTab]       = useState(staffMode ? 'staff-login' : (sp.get('tab') || 'login'));
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [unis, setUnis]     = useState([]);
  const [f, setF] = useState({
    name:'', email:'', phone:'', whatsapp_phone:'', password:'',
    university_id:'', referral_code:'', business_name:'', role:'student',
  });

  useEffect(() => { api.get('/universities').then(r => setUnis(r.data)).catch(() => {}); }, []);

  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (tab === 'login') {
        const u = await login(f.email, f.password);
        navigate(u.role === 'student' ? '/dashboard' : '/portal');
      } else if (tab === 'staff-login') {
        await staffLogin(f.email, f.password);
        navigate('/admin');
      } else if (tab === 'register') {
        if (!agreed) { setError('Lazima ukubali Masharti na Vigezo.'); setLoading(false); return; }
        if (f.password.length < 8) { setError('Nenosiri liwe na angalau herufi 8.'); setLoading(false); return; }
        const res = await register({
          name: f.name, email: f.email, phone: f.phone,
          whatsapp_phone: f.whatsapp_phone || f.phone,
          password: f.password, role: f.role,
          university_id: f.university_id || undefined,
          business_name: f.business_name || undefined,
          referral_code: f.referral_code || undefined,
          terms_accepted: true,
        });
        if (res.pending) {
          setSuccess('Ombi lako limetumwa! Msimamizi ataangalia akaunti yako ndani ya masaa 24. Utapata ujumbe ukithibitishwa.');
          setTab('login');
        } else {
          navigate(res.user?.role === 'student' ? '/dashboard' : '/portal');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Hitilafu imetokea. Jaribu tena.');
    } finally { setLoading(false); }
  };

  if (staffMode || tab === 'staff-login') {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="font-display font-bold text-2xl text-white">Geto Admin</h1>
            <p className="text-white/60 text-sm mt-1">Backend Staff Portal</p>
          </div>
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-primary/5 px-6 py-4 border-b border-slate-100 text-center">
              <p className="text-sm font-semibold text-primary">Admin &amp; Zone Manager Login</p>
              <p className="text-xs text-slate-400 mt-0.5">Accounts are created by super admin only</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Barua pepe</label>
                <input value={f.email} onChange={e => set('email', e.target.value)} type="email" className="input" placeholder="admin@getostudent.co.tz" required autoFocus />
              </div>
              <div>
                <label className="label">Nenosiri</label>
                <div className="relative">
                  <input value={f.password} onChange={e => set('password', e.target.value)} type={showPw?'text':'password'} className="input pr-10" placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              {error && <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700"><AlertCircle size={15} className="shrink-0 mt-0.5"/>{error}</div>}
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? 'Inaingia…' : 'Ingia Mfumo'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: 'login',    label: 'Ingia', icon: GraduationCap },
    { id: 'register', label: 'Jisajili', icon: Building2 },
  ];

  const ROLES = [
    { id: 'student',          label: 'Mwanafunzi', desc: 'Tafuta chumba', icon: GraduationCap },
    { id: 'property_owner',   label: 'Mmiliki wa Nyumba', desc: 'Sajili mali zako', icon: Building2 },
    { id: 'property_manager', label: 'Msimamizi wa Nyumba', desc: 'Simamia mali', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-sand flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center font-display font-bold text-3xl text-accent mx-auto mb-3 shadow-lg">G</div>
          <h1 className="font-display font-bold text-2xl text-slate-900">Geto Student</h1>
          <p className="text-slate-500 text-sm mt-1">Malazi ya wanafunzi yanayothibitishwa Tanzania</p>
        </div>

        <div className="card overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-100">
            {TABS.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setError(''); setSuccess(''); }}
                className={`py-3 text-sm font-semibold transition-colors ${tab===t.id ? 'bg-primary text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {/* ── REGISTER: choose role ── */}
            {tab === 'register' && (
              <div>
                <label className="label mb-2">Unajisajili kama nani?</label>
                <div className="grid grid-cols-1 gap-2">
                  {ROLES.map(r => {
                    const Icon = r.icon;
                    return (
                      <button key={r.id} type="button"
                        onClick={() => set('role', r.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${f.role===r.id ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                        <Icon size={18} className={f.role===r.id ? 'text-primary' : 'text-slate-400'} />
                        <div>
                          <div className="font-semibold text-sm">{r.label}</div>
                          <div className="text-xs text-slate-500">{r.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {(f.role === 'property_owner' || f.role === 'property_manager') && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    Akaunti za wamiliki/wasimamizi zinahitaji uthibitisho wa msimamizi. Utapigiwa simu ndani ya masaa 24.
                  </p>
                )}
              </div>
            )}

            {/* ── Name (register only) ── */}
            {tab === 'register' && (
              <div>
                <label className="label">Jina Kamili</label>
                <input value={f.name} onChange={e => set('name', e.target.value)} type="text" className="input" placeholder="k.m. Amina Juma" required />
              </div>
            )}

            {/* ── Email ── */}
            <div>
              <label className="label">Barua Pepe</label>
              <input value={f.email} onChange={e => set('email', e.target.value)} type="email" className="input" placeholder="wewe@mfano.com" required autoFocus={tab==='login'} />
            </div>

            {/* ── Phone (register) ── */}
            {tab === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Simu</label>
                  <input value={f.phone} onChange={e => set('phone', e.target.value)} type="tel" className="input" placeholder="+255 700 000 000" required />
                </div>
                <div>
                  <label className="label">WhatsApp</label>
                  <input value={f.whatsapp_phone} onChange={e => set('whatsapp_phone', e.target.value)} type="tel" className="input" placeholder="Kama si simu" />
                </div>
              </div>
            )}

            {/* ── Business name (owner/manager) ── */}
            {tab === 'register' && (f.role === 'property_owner' || f.role === 'property_manager') && (
              <div>
                <label className="label">Jina la Biashara (hiari)</label>
                <input value={f.business_name} onChange={e => set('business_name', e.target.value)} type="text" className="input" placeholder="k.m. Juma Property Services" />
              </div>
            )}

            {/* ── University (student) ── */}
            {tab === 'register' && f.role === 'student' && (
              <div>
                <label className="label">Chuo Chako</label>
                <select value={f.university_id} onChange={e => set('university_id', e.target.value)} className="input">
                  <option value="">Chagua chuo…</option>
                  {unis.map(u => <option key={u.id} value={u.id}>{u.name} ({u.short_name})</option>)}
                </select>
              </div>
            )}

            {/* ── Password ── */}
            <div>
              <label className="label">Nenosiri {tab==='register'&&<span className="text-slate-400 text-xs">(angalau herufi 8)</span>}</label>
              <div className="relative">
                <input value={f.password} onChange={e => set('password', e.target.value)}
                  type={showPw?'text':'password'} className="input pr-10" placeholder="••••••••" required minLength={tab==='register'?8:1} />
                <button type="button" onClick={() => setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* ── Referral code ── */}
            {tab === 'register' && (
              <div>
                <label className="label">Nambari ya Rufaa (hiari)</label>
                <input value={f.referral_code} onChange={e => set('referral_code', e.target.value)} type="text" className="input" placeholder="k.m. GETO-AMINA25" />
              </div>
            )}

            {/* ── Terms ── */}
            {tab === 'register' && (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-primary shrink-0" />
                <span className="text-xs text-slate-600">
                  Nimesoma na kukubali{' '}
                  <a href="/terms" target="_blank" className="text-primary underline font-medium">Masharti na Vigezo</a>{' '}
                  na{' '}
                  <a href="/privacy" target="_blank" className="text-primary underline font-medium">Sera ya Faragha</a>{' '}
                  za Geto Student.
                </span>
              </label>
            )}

            {error   && <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700"><AlertCircle size={15} className="shrink-0 mt-0.5"/>{error}</div>}
            {success && <div className="flex gap-2 items-start bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-sm text-green-700"><CheckCircle2 size={15} className="shrink-0 mt-0.5"/>{success}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? 'Tafadhali subiri…' : tab === 'login' ? 'Ingia' : 'Jisajili'}
            </button>

            {/* Staff login link */}
            <div className="text-center pt-1">
              <a href="/admin/login" className="text-xs text-slate-400 hover:text-primary transition-colors">
                Msimamizi wa Geto? Ingia hapa →
              </a>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          Geto Student &copy; {new Date().getFullYear()} · Olam Technologies
        </p>
      </div>
    </div>
  );
}
