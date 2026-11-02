import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Loader2, ImagePlus, CheckCircle2, Plus } from 'lucide-react';
import api from '../../api';
import Sheet, { Field, ErrorNote, NewAccountNotice, inputCls } from './Sheet';

const EMPTY = { name: '', area: '', uni: '', ownerName: '', ownerPhone: '', price: '', roomType: 'Single', rooms: '1', availability: 'available' };

// One-screen form to put a house online: house, owner (found or created by phone), one price.
// More details (description, map, more room types) can be added later on the house page.
export default function QuickAddHouse({ onClose, onSaved, onUseFullForm }) {
  const [f, setF]           = useState(EMPTY);
  const [photos, setPhotos] = useState([]);
  const [unis, setUnis]     = useState([]);
  const [types, setTypes]   = useState(['Single', 'Double', 'Shared', 'Master']);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState(null);   // { id, owner, photoNote }

  useEffect(() => {
    api.get('/universities').then(r => setUnis(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/admin/room-types').then(r => { if (Array.isArray(r.data) && r.data.length) setTypes(r.data.map(t => t.name)); }).catch(() => {});
  }, []);

  const set = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const phoneOk = String(f.ownerPhone).replace(/\D/g, '').length >= 9;

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.area.trim() || !f.uni) return setError('Enter the house name, area and nearest university.');
    if (!f.ownerName.trim() || !phoneOk) return setError("Enter the owner's name and a valid phone number.");
    if (!(Number(f.price) > 0)) return setError('Enter the monthly price in TZS.');
    setSaving(true); setError('');
    try {
      const { data } = await api.post('/admin/properties', {
        name: f.name.trim(), area: f.area.trim(), nearest_university_id: Number(f.uni),
        owner_name: f.ownerName.trim(), owner_phone: f.ownerPhone.trim(),
        monthly_price: Number(f.price), room_type: f.roomType, rooms_count: Math.max(1, Number(f.rooms) || 1),
        availability: f.availability,
      });
      let photoNote = '';
      if (photos.length) {
        try {
          const fd = new FormData();
          photos.forEach(p => fd.append('photos[]', p));
          const r = await api.post(`/admin/properties/${data.id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          photoNote = `${r.data?.uploaded ?? photos.length} photo(s) added.`;
        } catch { photoNote = 'The house was saved, but the photos did not upload. Add them from the house page.'; }
      }
      setDone({ id: data.id, owner: data.owner, photoNote });
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the house. Check your connection and try again.');
    } finally { setSaving(false); }
  };

  if (done) {
    return (
      <Sheet title="House added" icon={CheckCircle2} onClose={onClose}
        footer={<div className="flex flex-col sm:flex-row gap-2">
          <button onClick={() => { setF(EMPTY); setPhotos([]); setDone(null); }} className="btn-outline justify-center min-h-[44px]"><Plus size={15} />Add another</button>
          <Link to={`/admin/properties/${done.id}`} onClick={onClose} className="btn-primary justify-center min-h-[44px] flex-1">Open house page</Link>
        </div>}>
        <div className="space-y-4">
          <p className="text-slate-700"><b>{f.name}</b> is live on the site now.</p>
          {done.photoNote && <p className="text-sm text-slate-600">{done.photoNote}</p>}
          <NewAccountNotice account={done.owner} who="owner" />
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Add a house" icon={Building2} onClose={onClose}
      footer={<button form="quick-house" type="submit" disabled={saving} className="btn-primary w-full justify-center min-h-[48px]">
        {saving ? <><Loader2 size={16} className="animate-spin" />Saving…</> : 'Put house online'}
      </button>}>
      <form id="quick-house" onSubmit={submit} className="space-y-4" noValidate>
        <Field id="qh-name" label="House name"><input id="qh-name" className={inputCls} value={f.name} onChange={set('name')} placeholder="e.g. Amani Hostel" autoComplete="off" /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="qh-area" label="Area"><input id="qh-area" className={inputCls} value={f.area} onChange={set('area')} placeholder="e.g. Mabibo" /></Field>
          <Field id="qh-uni" label="Nearest university">
            <select id="qh-uni" className={inputCls} value={f.uni} onChange={set('uni')}>
              <option value="">Choose…</option>
              {unis.map(u => <option key={u.id} value={u.id}>{u.short_name ? `${u.short_name} – ${u.name}` : u.name}</option>)}
            </select>
          </Field>
        </div>

        <fieldset className="rounded-xl border border-slate-200 p-3 space-y-3">
          <legend className="label px-1">Owner</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id="qh-oname" label="Name"><input id="qh-oname" className={inputCls} value={f.ownerName} onChange={set('ownerName')} autoComplete="off" /></Field>
            <Field id="qh-ophone" label="Phone" hint="New owners get login details by SMS.">
              <input id="qh-ophone" className={inputCls} type="tel" inputMode="tel" value={f.ownerPhone} onChange={set('ownerPhone')} placeholder="07XX XXX XXX" />
            </Field>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <Field id="qh-price" label="Price / month (TZS)">
            <input id="qh-price" className={`${inputCls} font-mono`} type="number" inputMode="numeric" min="0" step="1000" value={f.price} onChange={set('price')} placeholder="80000" />
          </Field>
          <Field id="qh-rooms" label="Number of rooms">
            <input id="qh-rooms" className={`${inputCls} font-mono`} type="number" inputMode="numeric" min="1" value={f.rooms} onChange={set('rooms')} />
          </Field>
        </div>
        <Field id="qh-type" label="Room type">
          <div id="qh-type" role="radiogroup" aria-label="Room type" className="flex flex-wrap gap-2">
            {types.map(t => (
              <button key={t} type="button" role="radio" aria-checked={f.roomType === t} onClick={() => setF(p => ({ ...p, roomType: t }))}
                className={`min-h-[44px] px-4 rounded-xl border text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                  ${f.roomType === t ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>{t}</button>
            ))}
          </div>
        </Field>
        <Field id="qh-avail" label="Rooms right now">
          <div id="qh-avail" role="radiogroup" aria-label="Rooms right now" className="grid grid-cols-2 gap-2">
            {[['available', 'Rooms available'], ['full', 'Full']].map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={f.availability === v} onClick={() => setF(p => ({ ...p, availability: v }))}
                className={`min-h-[44px] rounded-xl border text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                  ${f.availability === v ? (v === 'full' ? 'bg-coral-700 border-coral-700 text-white' : 'bg-accent-700 border-accent-700 text-white') : 'border-slate-200 text-slate-600'}`}>{l}</button>
            ))}
          </div>
        </Field>
        <Field id="qh-photos" label="Photos (optional)">
          <label htmlFor="qh-photos" className="flex items-center justify-center gap-2 min-h-[56px] rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-500 cursor-pointer hover:border-primary hover:text-primary focus-within:ring-2 focus-within:ring-primary">
            <ImagePlus size={18} aria-hidden="true" />{photos.length ? `${photos.length} photo(s) chosen` : 'Take or choose photos'}
            <input id="qh-photos" type="file" accept="image/*" multiple className="sr-only" onChange={e => setPhotos(Array.from(e.target.files || []))} />
          </label>
        </Field>
        <ErrorNote>{error}</ErrorNote>
        {onUseFullForm && (
          <p className="text-xs text-slate-500">Need description, map location or several room types now?{' '}
            <button type="button" onClick={onUseFullForm} className="text-primary font-semibold underline">Use the full form</button>. You can also add them later on the house page.</p>
        )}
      </form>
    </Sheet>
  );
}
