import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, MapPin, Calendar, CreditCard, Home, UserCheck } from 'lucide-react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const fmt = n => Number(n).toLocaleString('en-TZ');
const fmtDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-TZ', { day:'numeric', month:'short', year:'numeric' }) : '—';

export default function CheckIn() {
  const { token } = useParams();
  const { isStaff } = useAuth();
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed]   = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    api.get(`/checkin/${token}`)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(e => {
        setNotFound(true);
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-700/20 border-t-primary-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <XCircle size={40} className="text-red-500" />
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-900 mb-2">Invalid QR Code</h1>
          <p className="text-slate-500 text-sm">This check-in code is invalid, has expired, or does not exist.</p>
        </div>
      </div>
    );
  }

  const active = data.active;

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      {/* Status banner */}
      <div className={`rounded-2xl px-6 py-5 mb-6 text-center ${active ? 'bg-emerald-500' : 'bg-red-500'}`}>
        <div className="flex items-center justify-center gap-2 mb-1">
          {active
            ? <CheckCircle2 size={28} className="text-white" />
            : <XCircle size={28} className="text-white" />}
          <span className="font-display font-bold text-3xl text-white">
            {active ? 'VALID' : 'EXPIRED'}
          </span>
        </div>
        <p className="text-white/80 text-sm">
          {active ? 'Active Geto Student Tenant' : 'Contract has ended or booking is inactive'}
        </p>
      </div>

      {/* Student card */}
      <div className="card p-6 mb-4">
        {data.tenant_photo_url ? (
          <div className="flex items-center gap-4 mb-5">
            <img
              src={data.tenant_photo_url}
              alt={data.student_name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200 shrink-0"
            />
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Tenant</p>
              <h2 className="font-display font-bold text-2xl text-slate-900">{data.student_name}</h2>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Tenant</p>
            <h2 className="font-display font-bold text-2xl text-slate-900 mb-4">{data.student_name}</h2>
          </>
        )}

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3 text-slate-600">
            <Home size={16} className="text-primary-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">{data.property_name}</p>
              <p className="text-slate-500 text-xs">{data.area} · {data.room_type}{data.unit_number ? ` · Unit ${data.unit_number}` : ''}{data.unit_floor ? ` (Floor ${data.unit_floor})` : ''}</p>
            </div>
          </div>

          {data.amount_paid && (
            <div className="flex items-center gap-3 text-slate-600">
              <CreditCard size={16} className="text-primary-700 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800">TZS {fmt(data.amount_paid)}</p>
                <p className="text-slate-500 text-xs">Amount Paid</p>
              </div>
            </div>
          )}

          {(data.contract_start || data.contract_end) && (
            <div className="flex items-start gap-3 text-slate-600">
              <Calendar size={16} className="text-primary-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">
                  {fmtDate(data.contract_start)} → {fmtDate(data.contract_end)}
                </p>
                <p className="text-slate-500 text-xs">Contract Period</p>
              </div>
            </div>
          )}

          {data.move_in_date && (
            <div className="flex items-center gap-3 text-slate-600">
              <MapPin size={16} className="text-primary-700 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800">Move-in: {fmtDate(data.move_in_date)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Staff: Mark Move-In Complete */}
      {isStaff && active && data.status === 'confirmed' && !confirmed && (
        <button
          disabled={confirming}
          onClick={async () => {
            if (!confirm('Mark this tenant as officially moved in?')) return;
            setConfirming(true);
            try {
              await api.put(`/checkin/${token}/confirm-movein`);
              setConfirmed(true);
              setData(d => ({ ...d, status: 'move_in_completed' }));
            } catch (e) {
              alert(e.response?.data?.message || 'Could not confirm. Please try again.');
            } finally { setConfirming(false); }
          }}
          className="w-full mt-4 py-3 rounded-2xl font-display font-bold text-white text-sm flex items-center justify-center gap-2 transition-all"
          style={{ background: confirming ? '#94a3b8' : '#1D2040' }}>
          <UserCheck size={18}/>
          {confirming ? 'Confirming…' : 'Mark Move-In Complete'}
        </button>
      )}
      {confirmed && (
        <div className="mt-4 rounded-2xl bg-emerald-500 px-5 py-3 text-white text-sm font-semibold text-center flex items-center justify-center gap-2">
          <CheckCircle2 size={16}/> Move-in confirmed successfully!
        </div>
      )}

      <p className="text-center text-xs text-slate-400 mt-4">
        Booking #{data.id} · Verified by Geto Student
      </p>
    </div>
  );
}
