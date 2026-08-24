import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import api from '../api';

export default function BookingModal({ property, room, onClose }) {
  const [date, setDate]   = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]   = useState('');

  const fmt = (n) => Number(n).toLocaleString('en-TZ');

  const submit = async () => {
    if (!date) { setError('Please select a move-in date.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/bookings', { property_id: property.id, room_id: room.id, move_in_date: date, notes });
      setSuccess(true);
    } catch (e) {
      setError(e.response?.data?.message || 'Booking failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay z-[60]" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md">
        <div className="bg-primary-700 text-white px-6 py-5 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-primary-100 font-semibold uppercase tracking-wider mb-1">Booking Request</p>
              <h3 className="font-display font-bold text-lg">{room.room_type} — {property.name}</h3>
              <p className="text-accent-400 font-bold text-base mt-0.5">TZS {fmt(room.monthly_price)}<span className="text-xs font-normal text-primary-200">/month</span></p>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white"><X size={20}/></button>
          </div>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600"/>
            </div>
            <h3 className="font-display font-bold text-xl text-slate-900 mb-2">Request Sent!</h3>
            <p className="text-slate-500 text-sm mb-6">Your booking request has been submitted. You'll receive a confirmation shortly. Track it in your dashboard.</p>
            <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <label className="label">Move-in Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} className="input" />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Any special requirements or questions for the admin…"
                className="input resize-none" />
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <strong>Note:</strong> This is a booking request. A Geto Student admin will contact you within 24 hours to confirm.
            </div>
            <button onClick={submit} disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Submitting…' : 'Send Booking Request →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
