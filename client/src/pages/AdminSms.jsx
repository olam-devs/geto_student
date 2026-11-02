import React, { useEffect, useState } from 'react';
import { Loader2, Send, RefreshCw, CheckCircle2, AlertTriangle, Clock, BellRing } from 'lucide-react';
import api from '../api';

// Delivery status from Next SMS, grouped into what staff need to know.
function statusInfo(status = '') {
  const s = status.toUpperCase();
  if (s.includes('DELIVERED')) return { label: 'Delivered', cls: 'badge-green', Icon: CheckCircle2 };
  if (s.startsWith('PENDING') || s.includes('ENROUTE') || s.includes('ACCEPTED') || s === 'SENT') return { label: 'Sent, waiting for delivery', cls: 'badge-blue', Icon: Clock };
  return { label: 'Failed', cls: 'badge-red', Icon: AlertTriangle };
}
const KIND = { pw: 'Password reset', welcome: 'Login details', test: 'Test', daily: 'Daily summary', reminder: 'Rent reminder', booking: 'Booking' };

export default function AdminSms() {
  const [log, setLog]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [phone, setPhone]     = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult]   = useState(null);
  const [reminding, setReminding] = useState(false);

  const load = () => {
    setLoading(true); setError('');
    api.get('/admin/sms-log').then(r => setLog(r.data))
      .catch(e => setError(e.response?.data?.message || 'Could not load the SMS log.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const sendTest = async (e) => {
    e.preventDefault();
    setTesting(true); setResult(null);
    try {
      const { data } = await api.post('/admin/sms-test', { phone });
      setResult(data.sent
        ? { ok: true, text: `Sent to ${data.to}. It should arrive within a minute. Status: ${statusInfo(data.status).label}.` }
        : { ok: false, text: `Not sent. The SMS company replied: ${data.status || 'no answer'}. Check the SMS token and balance in _config.php and the Next SMS dashboard.` });
      load();
    } catch (err) {
      setResult({ ok: false, text: err.response?.data?.message || 'Could not send the test SMS.' });
    } finally { setTesting(false); }
  };

  const sendReminders = async () => {
    if (!confirm('Send a rent reminder SMS to every tenant who lives in a house now? Each SMS costs credit.')) return;
    setReminding(true);
    try {
      const { data } = await api.post('/sms/tenant-reminders');
      alert(`Reminders sent: ${data.sent} of ${data.total} tenants.`);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Could not send reminders.'); }
    finally { setReminding(false); }
  };

  return (
    <div className="p-4 sm:p-5 lg:p-8 space-y-5 max-w-3xl">
      {log && !log.configured && (
        <div role="alert" className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle size={18} className="shrink-0" />SMS is not set up: SMS_TOKEN is empty in the server's _config.php.
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
        <h3 className="font-display font-bold text-slate-900">Send a test SMS</h3>
        <p className="text-xs text-slate-500 mt-0.5 mb-4">Checks that SMS works end to end. Up to 5 tests per hour.</p>
        <form onSubmit={sendTest} className="flex flex-col sm:flex-row gap-2">
          <label htmlFor="sms-phone" className="sr-only">Phone number</label>
          <input id="sms-phone" type="tel" inputMode="tel" className="input text-base sm:text-sm min-h-[44px] flex-1"
            placeholder="Your phone, e.g. 07XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} />
          <button disabled={testing || phone.replace(/\D/g, '').length < 9} className="btn-primary justify-center min-h-[44px]">
            {testing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}Send test
          </button>
        </form>
        {result && <p role="status" className={`mt-3 text-sm ${result.ok ? 'text-accent-700' : 'text-red-700'}`}>{result.text}</p>}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display font-bold text-slate-900">SMS log</h3>
            <p className="text-xs text-slate-500 mt-0.5">Last 50 messages. Passwords and reset links are hidden.</p>
          </div>
          <button onClick={load} className="btn-sm border border-slate-200 text-slate-600 min-h-[40px]" aria-label="Refresh"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700 mb-3">{error}</p>}
        {log?.by_status?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4" aria-label="Last 30 days by status">
            {log.by_status.map(b => { const i = statusInfo(b.status); return (
              <span key={b.status} className={`badge ${i.cls}`} title={b.status}><i.Icon size={12} aria-hidden="true" />{b.n} · {b.status}</span>); })}
          </div>
        )}
        {loading && !log ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" aria-label="Loading" /></div>
          : !log?.recent?.length ? <p className="text-sm text-slate-400 py-6 text-center">No SMS sent yet.</p>
          : (
          <ul className="divide-y divide-slate-100">
            {log.recent.map(m => { const i = statusInfo(m.status); return (
              <li key={m.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-slate-900">{KIND[m.kind] || m.kind}</span>
                  <span className="font-mono text-xs text-slate-500">{m.recipient_phone}</span>
                  <span className={`badge ${i.cls} ml-auto`}><i.Icon size={12} aria-hidden="true" />{i.label}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 break-words">{m.message}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{m.sent_at}{i.label === 'Failed' ? ` · ${m.status}` : ''}</p>
              </li>); })}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h3 className="font-display font-bold text-slate-900">Rent reminders</h3>
          <p className="text-xs text-slate-500 mt-0.5">Sends one SMS to every tenant who lives in a house now (max 100).</p>
        </div>
        <button onClick={sendReminders} disabled={reminding} className="btn-outline justify-center min-h-[44px]">
          {reminding ? <Loader2 size={15} className="animate-spin" /> : <BellRing size={15} />}Send reminders
        </button>
      </section>
    </div>
  );
}
