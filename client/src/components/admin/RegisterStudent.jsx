import React, { useEffect, useRef, useState } from 'react';
import { BookPlus, Loader2, Check, CheckCircle2, UserCheck, Plus } from 'lucide-react';
import api from '../../api';
import Sheet, { Field, ErrorNote, NewAccountNotice, inputCls } from './Sheet';

const today = () => {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
const digits = (s) => String(s || '').replace(/\D/g, '');

// One screen to register a student into a house: phone (existing student is found
// automatically), name for new students, house, room type and move-in date.
export default function RegisterStudent({ onClose, onCreated }) {
  const [phone, setPhone]     = useState('');
  const [name, setName]       = useState('');
  const [match, setMatch]     = useState(null);     // existing student with this phone
  const [looking, setLooking] = useState(false);
  const [houses, setHouses]   = useState([]);
  const [houseId, setHouseId] = useState('');
  const [rooms, setRooms]     = useState([]);
  const [roomId, setRoomId]   = useState('');
  const [moveIn, setMoveIn]   = useState(today());
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    api.get('/admin/properties', { params: { status: 'approved' } })
      .then(r => setHouses(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  // Look the phone up once it has enough digits
  useEffect(() => {
    clearTimeout(timer.current);
    setMatch(null);
    const key = digits(phone).slice(-9);
    if (key.length < 9) return;
    setLooking(true);
    timer.current = setTimeout(() => {
      api.get('/admin/users/students', { params: { q: key } })
        .then(r => {
          const hits = (Array.isArray(r.data) ? r.data : []).filter(s => digits(s.phone).endsWith(key));
          setMatch(hits.length === 1 ? hits[0] : null);
        })
        .catch(() => setMatch(null))
        .finally(() => setLooking(false));
    }, 350);
    return () => clearTimeout(timer.current);
  }, [phone]);

  // Rooms of the chosen house; pick automatically when there is only one type
  useEffect(() => {
    setRooms([]); setRoomId('');
    if (!houseId) return;
    api.get(`/admin/properties/${houseId}`).then(r => {
      const list = Array.isArray(r.data?.rooms) ? r.data.rooms : [];
      setRooms(list);
      if (list.length === 1) setRoomId(String(list[0].id));
    }).catch(() => setError('Could not load the rooms for this house.'));
  }, [houseId]);

  const house = houses.find(h => String(h.id) === String(houseId));

  const submit = async (e) => {
    e.preventDefault();
    if (digits(phone).length < 9) return setError("Enter the student's phone number.");
    if (!match && !name.trim()) return setError("Enter the student's name.");
    if (!houseId) return setError('Choose the house.');
    if (rooms.length === 0) return setError('This house has no room types yet. Add one on the house page first.');
    if (!roomId) return setError('Choose the room type.');
    setSaving(true); setError('');
    try {
      const body = { property_id: Number(houseId), room_id: Number(roomId), move_in_date: moveIn };
      if (match) body.student_id = match.id;
      else Object.assign(body, { student_name: name.trim(), student_phone: phone.trim() });
      const { data } = await api.post('/admin/bookings', body);
      setDone({ student: data.student || { created: false, name: match?.name, phone: match?.phone } });
      onCreated?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not register the student. Check your connection and try again.');
    } finally { setSaving(false); }
  };

  const reset = () => { setPhone(''); setName(''); setMatch(null); setHouseId(''); setMoveIn(today()); setDone(null); setError(''); };

  if (done) {
    return (
      <Sheet title="Student registered" icon={CheckCircle2} onClose={onClose}
        footer={<div className="flex flex-col sm:flex-row gap-2">
          <button onClick={reset} className="btn-outline justify-center min-h-[44px]"><Plus size={15} />Register another</button>
          <button onClick={onClose} className="btn-primary justify-center min-h-[44px] flex-1">Done</button>
        </div>}>
        <div className="space-y-4">
          <p className="text-slate-700"><b>{done.student.name}</b> is booked into <b>{house?.name}</b> from {moveIn}.
            The booking now waits for payment, as usual.</p>
          <NewAccountNotice account={done.student} who="student" />
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Register a student" icon={BookPlus} onClose={onClose}
      footer={<button form="reg-student" type="submit" disabled={saving} className="btn-primary w-full justify-center min-h-[48px]">
        {saving ? <><Loader2 size={16} className="animate-spin" />Saving…</> : 'Register student'}
      </button>}>
      <form id="reg-student" onSubmit={submit} className="space-y-4" noValidate>
        <Field id="rs-phone" label="Student phone">
          <div className="relative">
            <input id="rs-phone" className={inputCls} type="tel" inputMode="tel" autoComplete="off"
              value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XX XXX XXX" />
            {looking && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" aria-label="Looking up" />}
          </div>
        </Field>

        {match ? (
          <div className="flex items-center gap-3 rounded-xl bg-accent-50 border border-accent-200 px-3 py-2.5" aria-live="polite">
            <UserCheck size={18} className="text-accent-700 shrink-0" aria-hidden="true" />
            <div className="min-w-0 text-sm">
              <div className="font-semibold text-slate-900 truncate">{match.name}</div>
              <div className="text-xs text-slate-500">Already has an account{match.username ? ` · @${match.username}` : ''}</div>
            </div>
          </div>
        ) : (
          <Field id="rs-name" label="Student name" hint={digits(phone).length >= 9 && !looking ? 'New student: an account is created and login details are sent by SMS.' : undefined}>
            <input id="rs-name" className={inputCls} value={name} onChange={e => setName(e.target.value)} autoComplete="off" />
          </Field>
        )}

        <Field id="rs-house" label="House">
          <select id="rs-house" className={inputCls} value={houseId} onChange={e => setHouseId(e.target.value)}>
            <option value="">Choose…</option>
            {houses.map(h => <option key={h.id} value={h.id}>{h.name} – {h.area}{h.availability === 'full' ? ' (Full)' : ''}</option>)}
          </select>
        </Field>
        {house?.availability === 'full' && (
          <p className="text-xs text-amber-700 -mt-2">This house is marked Full. You can still register the student.</p>
        )}

        {houseId && rooms.length > 1 && (
          <Field id="rs-room" label="Room type">
            <div id="rs-room" role="radiogroup" aria-label="Room type" className="grid gap-2">
              {rooms.map(r => {
                const on = String(roomId) === String(r.id);
                return (
                  <button key={r.id} type="button" role="radio" aria-checked={on} onClick={() => setRoomId(String(r.id))}
                    className={`min-h-[52px] flex items-center justify-between gap-3 px-4 rounded-xl border-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                      ${on ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                    <span>
                      <span className="block font-semibold text-sm">{r.room_type}</span>
                      <span className="block text-xs text-slate-500 font-mono">TZS {Number(r.monthly_price).toLocaleString()}/month</span>
                    </span>
                    {on && <Check size={18} className="text-primary shrink-0" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </Field>
        )}
        {houseId && rooms.length === 1 && (
          <p className="text-sm text-slate-600">Room: <b>{rooms[0].room_type}</b> · <span className="font-mono">TZS {Number(rooms[0].monthly_price).toLocaleString()}</span>/month</p>
        )}

        <Field id="rs-date" label="Move-in date">
          <input id="rs-date" type="date" className={inputCls} value={moveIn} onChange={e => setMoveIn(e.target.value)} />
        </Field>
        <ErrorNote>{error}</ErrorNote>
      </form>
    </Sheet>
  );
}
