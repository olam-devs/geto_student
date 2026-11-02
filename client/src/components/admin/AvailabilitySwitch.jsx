import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../../api';

// "Rooms available" / "Full" for a house. Staff who may change it (admin, zone manager)
// get a two-option switch; everyone else sees a badge.
export default function AvailabilitySwitch({ propertyId, value, canEdit, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');
  const current = value === 'full' ? 'full' : 'available';
  if (!canEdit) return <AvailabilityBadge value={current} />;

  const set = async (next) => {
    if (next === current || busy) return;
    setBusy(true); setErr('');
    try {
      await api.put(`/admin/properties/${propertyId}/availability`, { availability: next });
      onChange?.(next);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not update. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div role="radiogroup" aria-label="Room availability"
        className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
        {[['available', 'Rooms available'], ['full', 'Full']].map(([v, label]) => {
          const on = current === v;
          return (
            <button key={v} type="button" role="radio" aria-checked={on} disabled={busy} onClick={() => set(v)}
              className={`min-h-[44px] sm:min-h-[34px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5
                transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                ${on ? (v === 'full' ? 'bg-coral-700 text-white' : 'bg-accent-700 text-white')
                     : 'text-slate-600 hover:bg-white'}`}>
              {busy && !on && <Loader2 size={12} className="animate-spin" />}
              {label}
            </button>
          );
        })}
      </div>
      {err && <p role="alert" className="text-xs text-red-600 mt-1">{err}</p>}
    </div>
  );
}

export function AvailabilityBadge({ value }) {
  return value === 'full'
    ? <span className="badge badge-red">Full</span>
    : <span className="badge badge-green">Rooms available</span>;
}
