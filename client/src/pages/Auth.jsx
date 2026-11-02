import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Building2, GraduationCap, Shield, MapPin, LogIn, AtSign, Loader2, Phone, MessageCircle } from 'lucide-react';
import { SUPPORT_PHONE, SUPPORT_TEL, supportWhatsApp } from '../support';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

// ─── Username Set Modal — shown when student logs in without a username ─────
function UsernameModal({ onSaved }) {
  const [val, setVal] = useState('');
  const [status, setStatus] = useState(null); // null | 'checking' | 'ok' | 'taken' | 'invalid'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef(null);

  const check = (v) => {
    const cleaned = v.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setVal(cleaned);
    setError('');
    clearTimeout(timer.current);
    if (!cleaned || cleaned.length < 3) { setStatus(cleaned.length > 0 ? 'invalid' : null); return; }
    if (cleaned.length > 30) { setStatus('invalid'); return; }
    setStatus('checking');
    timer.current = setTimeout(async () => {
      try {
        const r = await api.get(`/auth/username-check?u=${cleaned}`);
        setStatus(r.data.available ? 'ok' : 'taken');
      } catch { setStatus(null); }
    }, 400);
  };

  const save = async () => {
    if (status !== 'ok') return;
    setSaving(true); setError('');
    try {
      await api.put('/auth/me/username', { username: val });
      onSaved(val);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save username.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-primary px-6 pt-6 pb-5 text-center">
          <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
            <AtSign size={22} className="text-white"/>
          </div>
          <h2 className="font-display font-bold text-lg text-white">Choose Your Username</h2>
          <p className="text-white/70 text-sm mt-1">Required for all students — used by staff to find your booking</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Username <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">@</span>
              <input
                value={val}
                onChange={e => check(e.target.value)}
                type="text"
                className={`input pl-7 pr-8 ${
                  status === 'ok' ? 'border-green-400 bg-green-50/30' :
                  status === 'taken' || status === 'invalid' ? 'border-red-400 bg-red-50/30' : ''
                }`}
                placeholder="yourname123"
                maxLength={30}
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {status === 'checking' && <Loader2 size={15} className="animate-spin text-slate-400"/>}
                {status === 'ok'      && <CheckCircle2 size={15} className="text-green-500"/>}
                {(status === 'taken' || status === 'invalid') && <AlertCircle size={15} className="text-red-400"/>}
              </span>
            </div>
            <div className="mt-1.5 text-xs">
              {!status && <span className="text-slate-400">3–30 chars · lowercase letters, numbers, underscores</span>}
              {status === 'invalid' && <span className="text-red-500">3–30 chars · lowercase letters, numbers, underscores only</span>}
              {status === 'checking' && <span className="text-slate-400">Checking availability…</span>}
              {status === 'ok'   && <span className="text-green-600">@{val} is available!</span>}
              {status === 'taken' && <span className="text-red-500">@{val} is already taken. Try another.</span>}
            </div>
          </div>
          {error && <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700"><AlertCircle size={15} className="shrink-0 mt-0.5"/>{error}</div>}
          <button
            onClick={save}
            disabled={status !== 'ok' || saving}
            className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <><Loader2 size={15} className="animate-spin mr-2"/>Saving…</> : 'Save Username'}
          </button>
          <p className="text-center text-xs text-slate-400">You cannot skip this step. Your username helps staff identify and manage your booking.</p>
        </div>
      </div>
    </div>
  );
}

// staffMode=true → admin/zone_manager login page at /admin/login
export default function Auth({ staffMode = false }) {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { login, staffLogin, register } = useAuth();

  // Referral links (/auth?ref=CODE) open sign-up with the code filled in
  const refCode = (sp.get('ref') || '').trim().toUpperCase().slice(0, 20);
  const startTab = sp.get('tab') === 'reset-password' ? 'forgot-password' : sp.get('tab');
  const [tab, setTab]       = useState(staffMode ? 'staff-login' : (startTab || (refCode ? 'register' : 'login')));
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed]   = useState(false);
  const [confirmPw, setConfirmPw] = useState('');
  const [unis, setUnis]       = useState([]);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [pendingNav, setPendingNav] = useState('');

  // Username availability check for registration
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'ok' | 'taken' | 'invalid'
  const usernameTimer = useRef(null);

  const [f, setF] = useState({
    name:'', phone_or_email:'', email:'', phone:'', password:'',
    university_id:'', referral_code: refCode, business_name:'', role:'student', username:'',
  });

  useEffect(() => { api.get('/universities').then(r => setUnis(r.data)).catch(() => {}); }, []);

  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setError(''); };

  const checkUsername = (v) => {
    const cleaned = v.toLowerCase().replace(/[^a-z0-9_]/g, '');
    set('username', cleaned);
    clearTimeout(usernameTimer.current);
    if (!cleaned || cleaned.length < 3) { setUsernameStatus(cleaned.length > 0 ? 'invalid' : null); return; }
    if (cleaned.length > 30) { setUsernameStatus('invalid'); return; }
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      try {
        const r = await api.get(`/auth/username-check?u=${cleaned}`);
        setUsernameStatus(r.data.available ? 'ok' : 'taken');
      } catch { setUsernameStatus(null); }
    }, 400);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (tab === 'login') {
        const res = await login(f.phone_or_email, f.password);
        const dest = res.user?.role === 'student' ? '/dashboard' : '/portal';
        if (res.needs_username) {
          setPendingNav(dest);
          setShowUsernameModal(true);
        } else {
          navigate(dest);
        }
      } else if (tab === 'staff-login') {
        await staffLogin(f.phone_or_email, f.password);
        navigate('/admin');
      } else if (tab === 'register') {
        if (!agreed) { setError('You must agree to the Terms and Conditions.'); setLoading(false); return; }
        if (!f.phone) { setError('Phone number is required.'); setLoading(false); return; }
        if (f.password.length < 8) { setError('Password must be at least 8 characters.'); setLoading(false); return; }
        if (f.password !== confirmPw) { setError('Passwords do not match.'); setLoading(false); return; }
        if (f.role === 'student' && !f.university_id) { setError('Please select your university.'); setLoading(false); return; }
        if (f.role === 'student' && !f.username) { setError('Username is required for students.'); setLoading(false); return; }
        if (f.role === 'student' && usernameStatus !== 'ok') { setError('Please choose a valid, available username.'); setLoading(false); return; }
        const res = await register({
          name: f.name, phone: f.phone,
          email: f.email || undefined,
          password: f.password, role: f.role,
          university_id: f.university_id || undefined,
          business_name: f.business_name || undefined,
          username: f.role === 'student' ? f.username : undefined,
          ...(f.role === 'student' ? { referral_code: f.referral_code || undefined } : {}),
          ...((['property_owner','property_manager'].includes(f.role) && f.referral_code) ? { geto_referral_code: f.referral_code } : {}),
          terms_accepted: true,
        });
        navigate(res.user?.role === 'student' ? '/dashboard' : '/portal');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
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
                <label className="label">Phone or Email</label>
                <input value={f.phone_or_email} onChange={e => set('phone_or_email', e.target.value)} type="text" className="input" placeholder="+255 700 000 000 or email" required autoFocus />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input value={f.password} onChange={e => set('password', e.target.value)} type={showPw?'text':'password'} className="input pr-10" placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              {error && <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700"><AlertCircle size={15} className="shrink-0 mt-0.5"/>{error}</div>}
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: 'login',    label: 'Sign In',  icon: LogIn },
    { id: 'register', label: 'Register', icon: Building2 },
  ];
  const ROLES = [
    { id: 'student',          label: 'Student',          desc: 'Find a room',          icon: GraduationCap },
    { id: 'property_owner',   label: 'Property Owner',   desc: 'List your properties', icon: Building2 },
    { id: 'property_manager', label: 'Property Manager', desc: 'Manage properties',    icon: MapPin },
  ];

  return (
    <>
      {showUsernameModal && (
        <UsernameModal onSaved={(uname) => {
          setShowUsernameModal(false);
          navigate(pendingNav || '/dashboard');
        }}/>
      )}
      <div className="min-h-screen bg-sand flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <svg width="52" height="52" viewBox="0 0 44 44" fill="none" className="mx-auto mb-3" xmlns="http://www.w3.org/2000/svg">
              <rect width="44" height="44" rx="10" fill="#14162B"/>
              <path d="M32.5 8.6 A17 17 0 1 0 32.5 35.4 L28.8 30.7 A11 11 0 1 1 28.8 13.3 Z" fill="#2FD48B"/>
              <circle cx="30.6" cy="11" r="3" fill="#2FD48B"/>
              <circle cx="30.6" cy="33" r="3" fill="#2FD48B"/>
              <path d="M36 15 L42 21 L40 21 L40 28 L32 28 L32 21 L30 21 Z" fill="white"/>
              <rect x="33.5" y="23" width="5" height="5" rx="0.5" fill="#14162B"/>
            </svg>
            <h1 className="font-display font-bold text-2xl text-slate-900">Geto Student</h1>
            <p className="text-slate-500 text-sm mt-1">Verified student accommodation in Tanzania</p>
          </div>

          <div className="card overflow-hidden">
            {/* Tabs */}
            {tab !== 'forgot-password' && (
            <div className="grid grid-cols-2 border-b border-slate-100">
              {TABS.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setError(''); setSuccess(''); setUsernameStatus(null); }}
                  className={`py-3 text-sm font-semibold transition-colors ${tab===t.id ? 'bg-primary text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            )}
            {tab === 'forgot-password' && (
              <div className="bg-primary px-6 py-4 text-center">
                <p className="font-display font-semibold text-white text-sm">Forgot your password?</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              {/* ── REGISTER: choose role ── */}
              {tab === 'register' && (
                <div>
                  <label className="label mb-2">Register as…</label>
                  <div className="grid grid-cols-1 gap-2">
                    {ROLES.map(r => {
                      const Icon = r.icon;
                      return (
                        <button key={r.id} type="button"
                          onClick={() => { set('role', r.id); setUsernameStatus(null); set('username',''); }}
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
                    <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                      Your account activates immediately. Listings go live right away — contact Geto to earn the verified badge.
                    </p>
                  )}
                </div>
              )}

              {/* ── Name (register only) ── */}
              {tab === 'register' && (
                <div>
                  <label className="label">Full Name <span className="text-red-500">*</span></label>
                  <input value={f.name} onChange={e => set('name', e.target.value)} type="text" className="input" placeholder="e.g. Amina Juma" required />
                </div>
              )}

              {/* ── Username (students only, required) ── */}
              {tab === 'register' && f.role === 'student' && (
                <div>
                  <label className="label">Username <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">@</span>
                    <input
                      value={f.username}
                      onChange={e => checkUsername(e.target.value)}
                      type="text"
                      className={`input pl-7 pr-8 ${
                        usernameStatus === 'ok' ? 'border-green-400 bg-green-50/30' :
                        usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-400 bg-red-50/30' : ''
                      }`}
                      placeholder="yourname123"
                      maxLength={30}
                      autoComplete="off"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameStatus === 'checking' && <Loader2 size={15} className="animate-spin text-slate-400"/>}
                      {usernameStatus === 'ok'       && <CheckCircle2 size={15} className="text-green-500"/>}
                      {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <AlertCircle size={15} className="text-red-400"/>}
                    </span>
                  </div>
                  <div className="mt-1 text-xs">
                    {!usernameStatus && <span className="text-slate-400">3–30 chars · lowercase letters, numbers, underscores · must be unique</span>}
                    {usernameStatus === 'invalid'  && <span className="text-red-500">3–30 chars · lowercase letters, numbers, underscores only</span>}
                    {usernameStatus === 'checking' && <span className="text-slate-400">Checking availability…</span>}
                    {usernameStatus === 'ok'       && <span className="text-green-600">@{f.username} is available!</span>}
                    {usernameStatus === 'taken'    && <span className="text-red-500">@{f.username} is taken. Try another.</span>}
                  </div>
                </div>
              )}

              {/* ── Phone / Email (login) ── */}
              {tab === 'login' && (
              <div>
                <label className="label">Phone Number or Email</label>
                <input value={f.phone_or_email} onChange={e => set('phone_or_email', e.target.value)} type="text" className="input" placeholder="+255 700 000 000 or email" required autoFocus />
              </div>
              )}

              {/* ── Phone (register — required) ── */}
              {tab === 'register' && (
                <div>
                  <label className="label">Phone Number <span className="text-red-500">*</span></label>
                  <input value={f.phone} onChange={e => set('phone', e.target.value)}
                    type="tel" className="input" placeholder="+255 700 000 000" required autoFocus={tab==='register'} />
                </div>
              )}

              {/* ── Email (register — optional) ── */}
              {tab === 'register' && (
                <div>
                  <label className="label">Email <span className="text-slate-400 font-normal text-xs">(optional)</span></label>
                  <input value={f.email} onChange={e => set('email', e.target.value)} type="email" className="input" placeholder="you@example.com" />
                </div>
              )}

              {/* ── Business name (owner/manager) ── */}
              {tab === 'register' && (f.role === 'property_owner' || f.role === 'property_manager') && (
                <div>
                  <label className="label">Business Name <span className="text-slate-400 font-normal text-xs">(optional)</span></label>
                  <input value={f.business_name} onChange={e => set('business_name', e.target.value)} type="text" className="input" placeholder="e.g. Juma Property Services" />
                </div>
              )}

              {/* ── University (student, required) ── */}
              {tab === 'register' && f.role === 'student' && (
                <div>
                  <label className="label">Your University <span className="text-red-500">*</span></label>
                  <select value={f.university_id} onChange={e => set('university_id', e.target.value)} className="input" required>
                    <option value="">Select university…</option>
                    {unis.map(u => <option key={u.id} value={u.id}>{u.name} ({u.short_name})</option>)}
                  </select>
                </div>
              )}

              {/* ── Password ── */}
              {tab !== 'forgot-password' && (
              <div>
                <label className="label">Password {tab==='register'&&<span className="text-slate-400 text-xs">(min. 8 characters)</span>}</label>
                <div className="relative">
                  <input value={f.password} onChange={e => set('password', e.target.value)}
                    type={showPw?'text':'password'} className="input pr-10" placeholder="••••••••" required minLength={tab==='register'?8:1} />
                  <button type="button" onClick={() => setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
                {tab === 'login' && (
                  <button type="button" onClick={() => { setTab('forgot-password'); setError(''); setSuccess(''); }}
                    className="text-xs text-primary-700 hover:underline mt-1 block text-right">
                    Forgot password?
                  </button>
                )}
              </div>
              )}

              {/* ── Forgot password: customer care resets it (there is no SMS reset) ── */}
              {tab === 'forgot-password' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Contact Geto customer care. We'll check it's you and give you a new password by WhatsApp or phone.
                  </p>
                  <a href={supportWhatsApp(`Hello Geto, I can't log in to my account.${f.phone_or_email ? ` My phone/email: ${f.phone_or_email}` : ''}`)}
                    target="_blank" rel="noreferrer"
                    className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-accent-700 hover:bg-accent-600 text-white font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-700">
                    <MessageCircle size={18} aria-hidden="true" />WhatsApp customer care
                  </a>
                  <a href={SUPPORT_TEL}
                    className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <Phone size={18} aria-hidden="true" />Call {SUPPORT_PHONE}
                  </a>
                  <p className="text-xs text-slate-500">After you log in with the new password, change it in your profile.</p>
                </div>
              )}

              {/* ── Confirm password (register) ── */}
              {tab === 'register' && (
                <div>
                  <label className="label">Confirm Password</label>
                  <div className="relative">
                    <input value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError(''); }}
                      type={showPw?'text':'password'} className={`input pr-10 ${confirmPw && confirmPw !== f.password ? 'border-red-400 bg-red-50' : confirmPw && confirmPw === f.password ? 'border-green-400' : ''}`}
                      placeholder="Re-enter password" required />
                    {confirmPw && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        {confirmPw === f.password
                          ? <CheckCircle2 size={16} className="text-green-500"/>
                          : <AlertCircle size={16} className="text-red-400"/>}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── Referral / Geto manager code ── */}
              {tab === 'register' && (
                <div>
                  <label className="label">
                    {['property_owner','property_manager'].includes(f.role)
                      ? 'Geto Manager Code (optional — if a Geto staff helped you register)'
                      : 'Referral Code (optional)'}
                  </label>
                  <input value={f.referral_code} onChange={e => set('referral_code', e.target.value)} type="text" className="input"
                    placeholder={['property_owner','property_manager'].includes(f.role) ? 'e.g. GETO-AMINA772' : 'e.g. GETO-FRIEND25'} />
                </div>
              )}

              {/* ── Terms (register only) ── */}
              {tab === 'register' && (
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-primary shrink-0" />
                  <span className="text-xs text-slate-600">
                    I have read and agree to the{' '}
                    <a href="/terms" target="_blank" className="text-primary underline font-medium">Terms and Conditions</a>{' '}
                    and{' '}
                    <a href="/privacy" target="_blank" className="text-primary underline font-medium">Privacy Policy</a>{' '}
                    of Geto Student.
                  </span>
                </label>
              )}

              {error   && <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700"><AlertCircle size={15} className="shrink-0 mt-0.5"/>{error}</div>}
              {success && <div className="flex gap-2 items-start bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-sm text-green-700"><CheckCircle2 size={15} className="shrink-0 mt-0.5"/>{success}</div>}

              {tab !== 'forgot-password' && (
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
                  {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              )}

              {tab === 'forgot-password' && (
                <button type="button" onClick={() => { setTab('login'); setError(''); setSuccess(''); }}
                  className="w-full text-center text-sm text-primary-700 hover:underline mt-1">
                  ← Back to Sign In
                </button>
              )}

            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">
            Geto Student &copy; {new Date().getFullYear()} · Olam Technologies
          </p>
        </div>
      </div>
    </>
  );
}
