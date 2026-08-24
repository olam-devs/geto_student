import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const TABS = ['login','register','agent-login','agent-register'];

export default function Auth() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { loginUser, loginAgent, registerUser, registerAgent, isLoggedIn, isAgent } = useAuth();

  const initialTab = TABS.includes(sp.get('tab')) ? sp.get('tab') : 'login';
  const [tab, setTab]     = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [showPw, setShowPw] = useState(false);

  // form fields
  const [f, setF] = useState({ name:'', email:'', phone:'', password:'', university_id:'', referral_code:'', business_name:'' });
  const [unis, setUnis] = useState([]);

  useEffect(() => { api.get('/universities').then(r => setUnis(r.data)).catch(() => {}); }, []);
  useEffect(() => { if (isLoggedIn && !isAgent) navigate('/dashboard'); }, [isLoggedIn, isAgent]);
  useEffect(() => { if (isAgent) navigate('/agent'); }, [isAgent]);

  const set = (key, val) => { setF(prev => ({ ...prev, [key]: val })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (tab === 'login') {
        await loginUser(f.email, f.password);
        navigate('/dashboard');
      } else if (tab === 'register') {
        await registerUser({ name: f.name, email: f.email, phone: f.phone, password: f.password, university_id: f.university_id || undefined, referral_code: f.referral_code || undefined });
        navigate('/dashboard');
      } else if (tab === 'agent-login') {
        await loginAgent(f.email, f.password);
        navigate('/agent');
      } else if (tab === 'agent-register') {
        await registerAgent({ name: f.name, email: f.email, phone: f.phone, password: f.password, business_name: f.business_name || undefined });
        setSuccess('Application submitted! Geto Student admin will review and approve your account within 24–48 hours. We\'ll contact you by email.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const tabDef = [
    { id:'login',          label:'Student Login' },
    { id:'register',       label:'Student Register' },
    { id:'agent-login',    label:'Agent Login' },
    { id:'agent-register', label:'Register as Agent' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-700 flex items-center justify-center font-display font-bold text-3xl text-accent-500 mx-auto mb-3 shadow-lg">G</div>
          <h1 className="font-display font-bold text-2xl text-slate-900">Geto Student</h1>
          <p className="text-slate-500 text-sm mt-1">Tanzania's verified student accommodation platform</p>
        </div>

        <div className="card overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-100">
            {tabDef.slice(0,2).map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setError(''); setSuccess(''); }}
                className={`py-3 text-xs font-semibold transition-colors ${tab === t.id ? 'bg-primary-700 text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-700'}`}>
                {t.label}
              </button>
            ))}
            {tabDef.slice(2).map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setError(''); setSuccess(''); }}
                className={`py-3 text-xs font-semibold transition-colors ${tab === t.id ? 'bg-primary-700 text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Agent pending note */}
            {(tab === 'agent-login' || tab === 'agent-register') && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                <strong>🔒 Agent accounts require admin approval.</strong> Once approved, you can log in and list properties.
              </div>
            )}

            {(tab === 'register' || tab === 'agent-register') && (
              <div>
                <label className="label">Full Name</label>
                <input value={f.name} onChange={e => set('name', e.target.value)} type="text" className="input" placeholder="e.g. Amina Juma" required />
              </div>
            )}

            <div>
              <label className="label">Email Address</label>
              <input value={f.email} onChange={e => set('email', e.target.value)} type="email" className="input" placeholder="you@example.com" required />
            </div>

            {(tab === 'register' || tab === 'agent-register') && (
              <div>
                <label className="label">Phone Number</label>
                <input value={f.phone} onChange={e => set('phone', e.target.value)} type="tel" className="input" placeholder="+255 700 000 000" required />
              </div>
            )}

            {tab === 'agent-register' && (
              <div>
                <label className="label">Business / Agency Name (optional)</label>
                <input value={f.business_name} onChange={e => set('business_name', e.target.value)} type="text" className="input" placeholder="e.g. Juma Property Services" />
              </div>
            )}

            {tab === 'register' && (
              <div>
                <label className="label">Your University</label>
                <select value={f.university_id} onChange={e => set('university_id', e.target.value)} className="input">
                  <option value="">Select university…</option>
                  {unis.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input value={f.password} onChange={e => set('password', e.target.value)}
                  type={showPw ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" required minLength={6} />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {tab === 'register' && (
              <div>
                <label className="label">Referral Code (optional)</label>
                <input value={f.referral_code} onChange={e => set('referral_code', e.target.value)} type="text" className="input" placeholder="e.g. GETO-AMINA25" />
              </div>
            )}

            {error   && <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700"><AlertCircle size={15} className="shrink-0 mt-0.5"/>{error}</div>}
            {success && <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-sm text-green-700"><CheckCircle2 size={15} className="shrink-0 mt-0.5"/>{success}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : tab === 'register' ? 'Create Account' : tab === 'agent-login' ? 'Agent Sign In' : 'Submit Application'}
            </button>

            {tab === 'login' && (
              <p className="text-center text-xs text-slate-400">
                Demo: <strong>amina@student.com</strong> / <strong>Student@123</strong>
              </p>
            )}
            {tab === 'agent-login' && (
              <p className="text-center text-xs text-slate-400">
                Demo: <strong>juma@getoagent.tz</strong> / <strong>Agent@123</strong>
              </p>
            )}
            {tab === 'login' && (
              <p className="text-center text-xs text-slate-400">
                Admin demo: <strong>admin@getostudent.tz</strong> / <strong>Admin@Geto2026</strong>
              </p>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          By continuing you agree to Geto Student's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
