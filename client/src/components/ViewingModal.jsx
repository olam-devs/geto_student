import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import api from '../api';

export default function ViewingModal({ property, onClose }) {
  const [date, setDate]   = useState('');
  const [time, setTime]   = useState('Morning');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]   = useState('');

  const submit = async () => {
    if (!date) { setError('Please select a preferred date.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/viewings', { property_id: property.id, preferred_date: date, preferred_time: time, notes });
      setSuccess(true);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay z-[60]" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md">
        <div className="bg-primary-700 text-white px-6 py-5 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-primary-100 font-semibold uppercase tracking-wider mb-1">Site Viewing Request</p>
              <h3 className="font-display font-bold text-lg">{property.name}</h3>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white"><X size={20}/></button>
          </div>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600"/>
            </div>
            <h3 className="font-display font-bold text-xl text-slate-900 mb-2">Request Submitted!</h3>
            <p className="text-slate-500 text-sm mb-6">A Geto Student admin will contact you to confirm your viewing. Check your dashboard for updates.</p>
            <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              <span className="font-bold">Viewing Fee: TZS 20,000</span> — A Geto admin will physically accompany you to visit the property. Fee is payable on the day of the visit.
            </div>
            <div>
              <label className="label">Preferred Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} className="input" />
            </div>
            <div>
              <label className="label">Preferred Time</label>
              <select value={time} onChange={e => setTime(e.target.value)} className="input">
                <option>Morning (8am – 12pm)</option>
                <option>Afternoon (12pm – 5pm)</option>
                <option>Evening (5pm – 7pm)</option>
              </select>
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Anything you'd like the admin to know…"
                className="input resize-none" />
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <button onClick={submit} disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Submitting…' : 'Request Viewing →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
