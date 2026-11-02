import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Loader2, Table2, BarChart3, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../api';

// Admin analytics: visitors, sign-ups, bookings, traffic sources and referrals.
// A "visitor" is one person on one day (the stored visitor ID changes daily for privacy).

const BAR = '#454A7A';        // primary-500: the one series colour (contrast vs white >= 3:1)
const BAR_HOVER = '#303668';  // primary-600
const compact = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n);
const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const ROLE = { student: 'Student', property_owner: 'House owner', property_manager: 'House manager', geto_officer: 'Geto officer', geto_manager: 'Geto officer', zone_manager: 'Zone manager', admin: 'Admin' };

function periodLabel(iso, unit, long = false) {
  const d = new Date(iso + 'T00:00:00');
  if (unit === 'month') return d.toLocaleDateString('en-GB', { month: long ? 'long' : 'short', year: long ? 'numeric' : undefined });
  const s = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return unit === 'week' ? (long ? `Week of ${s}` : s) : (long ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : s);
}

// ── Stat tile: label, value, change vs the previous period (arrow + sign, never colour alone) ──
function StatTile({ label, value, prev, prevLabel }) {
  const diff = prev == null ? null : value - prev;
  const pct = prev > 0 ? Math.round((diff / prev) * 100) : null;
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  const tone = diff > 0 ? 'text-accent-700' : diff < 0 ? 'text-coral-700' : 'text-slate-500';
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      <div className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-1">{fmt(value)}</div>
      {diff != null && (
        <div className={`text-xs mt-1 flex items-center gap-1 ${tone}`}>
          <Icon size={14} aria-hidden="true" />
          <span>{diff > 0 ? '+' : ''}{fmt(diff)}{pct != null ? ` (${pct > 0 ? '+' : ''}${pct}%)` : ''}</span>
          <span className="text-slate-400">vs {prevLabel}</span>
        </div>
      )}
    </div>
  );
}

// ── Column chart: one series, thin bars, 2px gaps, tooltip on hover and keyboard focus ──
function ColumnChart({ rows, unit, valueKey, label }) {
  const [active, setActive] = useState(null);
  const boxRef = useRef(null);
  const max = Math.max(1, ...rows.map(r => r[valueKey]));
  const step = max <= 4 ? 1 : Math.pow(10, Math.floor(Math.log10(max / 2)));
  const top = Math.ceil(max / step / 2) * step * 2 || 2;   // clean top tick, divisible by 2
  const ticks = [top, top / 2, 0];
  const last = rows.length - 1;
  const show = active ?? null;

  const onKey = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    setActive(i => {
      const cur = i ?? last;
      if (e.key === 'Home') return 0;
      if (e.key === 'End') return last;
      return Math.min(last, Math.max(0, cur + (e.key === 'ArrowRight' ? 1 : -1)));
    });
  };
  const fromPointer = (e) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const i = Math.floor(((e.clientX - box.left) / box.width) * rows.length);
    setActive(Math.min(last, Math.max(0, i)));
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        {/* y-axis ticks */}
        <div className="flex flex-col justify-between h-40 text-[11px] text-slate-400 tabular-nums text-right w-7 shrink-0" aria-hidden="true">
          {ticks.map(t => <span key={t} className="leading-none">{compact(t)}</span>)}
        </div>
        <div className="flex-1 min-w-0">
          <div ref={boxRef} tabIndex={0} role="img" onKeyDown={onKey} onFocus={() => setActive(a => a ?? last)} onBlur={() => setActive(null)}
            onPointerMove={fromPointer} onPointerLeave={() => setActive(null)}
            aria-label={`${label}. Use left and right arrow keys to read each ${unit}.`}
            className="relative h-40 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {/* gridlines: hairline, solid, recessive */}
            {ticks.map((t, i) => <div key={t} className="absolute inset-x-0 border-t border-slate-100" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} aria-hidden="true" />)}
            <div className="absolute inset-0 flex items-end" style={{ gap: 2 }}>
              {rows.map((r, i) => {
                const h = (r[valueKey] / top) * 100;
                return (
                  <div key={r.period} className="flex-1 h-full flex items-end justify-center">
                    <div style={{ height: `${h}%`, maxWidth: 24, background: i === show ? BAR_HOVER : BAR, minHeight: r[valueKey] > 0 ? 2 : 0 }}
                      className="w-full rounded-t" />
                  </div>
                );
              })}
            </div>
            {show != null && rows[show] && (
              <div className="absolute -top-2 z-10 pointer-events-none -translate-y-full"
                style={{ left: `${((show + 0.5) / rows.length) * 100}%`, transform: `translate(${show > rows.length * 0.7 ? '-100%' : show < rows.length * 0.3 ? '0' : '-50%'}, -100%)` }}>
                <div className="bg-primary-800 text-white rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap">
                  <div className="text-sm font-semibold">{fmt(rows[show][valueKey])} <span className="font-normal text-white/70">{valueKey === 'visits' ? 'visitors' : valueKey}</span></div>
                  <div className="text-[11px] text-white/70">{periodLabel(rows[show].period, unit, true)} · {fmt(rows[show].views)} page views</div>
                </div>
              </div>
            )}
          </div>
          {/* x-axis: first, middle and last labels only */}
          <div className="flex justify-between text-[11px] text-slate-400 mt-1.5" aria-hidden="true">
            <span>{periodLabel(rows[0]?.period, unit)}</span>
            <span>{periodLabel(rows[Math.floor(last / 2)]?.period, unit)}</span>
            <span>{periodLabel(rows[last]?.period, unit)}</span>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{show != null && rows[show] ? `${periodLabel(rows[show].period, unit, true)}: ${rows[show][valueKey]} visitors, ${rows[show].views} page views` : ''}</p>
    </div>
  );
}

// ── Ranked list as horizontal bars (labels in text colour, bar beside them) ──
function BarList({ items, labelKey, valueKey, empty, valueLabel = 'visits' }) {
  if (!items?.length) return <p className="text-sm text-slate-400 py-4">{empty}</p>;
  const max = Math.max(1, ...items.map(i => i[valueKey]));
  return (
    <ul className="space-y-2.5">
      {items.map(it => (
        <li key={it[labelKey]} className="text-sm">
          <div className="flex justify-between gap-3">
            <span className="truncate text-slate-700" title={it[labelKey]}>{it[labelKey]}</span>
            <span className="tabular-nums font-semibold text-slate-900 shrink-0">{fmt(it[valueKey])}<span className="sr-only"> {valueLabel}</span></span>
          </div>
          <div className="h-1.5 mt-1 rounded-full bg-slate-100" aria-hidden="true">
            <div className="h-1.5 rounded-full" style={{ width: `${(it[valueKey] / max) * 100}%`, background: BAR }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, sub, children, action }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 min-w-0">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="font-display font-bold text-slate-900">{title}</h3>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Pills({ value, onChange, options, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
            ${value === v ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{l}</button>
      ))}
    </div>
  );
}

export default function AdminAnalytics() {
  const [days, setDays]   = useState(30);
  const [unit, setUnit]   = useState('day');
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [asTable, setAsTable] = useState(false);

  const load = () => {
    setLoading(true); setError('');
    api.get('/admin/analytics', { params: { days } })
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.message || 'Could not load analytics. Check your connection.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [days]);

  const rows = data?.series?.[unit] || [];
  const totals = useMemo(() => {   // sign-ups and bookings over the last 30 days
    const d = data?.series?.day || [];
    return d.reduce((a, r) => ({ students: a.students + r.students, owners: a.owners + r.owners, bookings: a.bookings + r.bookings }), { students: 0, owners: 0, bookings: 0 });
  }, [data]);
  const outage = rows.some(r => r.period >= '2026-10-28' && r.period <= '2026-11-02') ||
                 (unit !== 'day' && rows.some(r => r.period >= '2026-10-01' && r.period <= '2026-11-02'));

  if (!data && loading) return <div className="flex justify-center p-16 text-primary"><Loader2 size={32} className="animate-spin" aria-label="Loading" /></div>;
  if (!data) return (
    <div className="p-5 lg:p-8">
      <div role="alert" className="bg-white border border-red-200 rounded-2xl p-6 text-center">
        <AlertCircle className="mx-auto text-red-500 mb-2" />
        <p className="text-sm text-slate-700 mb-3">{error}</p>
        <button onClick={load} className="btn-sm border border-slate-300 min-h-[44px]"><RefreshCw size={14} />Try again</button>
      </div>
    </div>
  );

  const s = data.summary, ref = data.referrals, t = ref.totals;
  const unitWord = { day: 'day', week: 'week', month: 'month' }[unit];

  return (
    <div className={`p-4 sm:p-5 lg:p-8 space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      {/* Filters: one row, above everything they affect */}
      <div className="flex flex-wrap items-center gap-2">
        <Pills label="Lists cover" value={days} onChange={setDays} options={[[7, '7 days'], [30, '30 days'], [90, '90 days']]} />
        <button onClick={load} className="btn-sm border border-slate-200 bg-white text-slate-600 min-h-[40px]" aria-label="Refresh"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
        <span className="text-xs text-slate-400 w-full sm:w-auto sm:ml-auto">Tanzania time · updated {new Date(data.generated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* Visitors: headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Visitors today" value={s.today.visits} prev={s.yesterday.visits} prevLabel="yesterday" />
        <StatTile label="Visitors, last 7 days" value={s.last_7_days.visits} prev={s.previous_7_days.visits} prevLabel="7 days before" />
        <StatTile label="Visitors, last 30 days" value={s.last_30_days.visits} prev={s.previous_30_days.visits} prevLabel="30 days before" />
        <StatTile label="Page views, last 30 days" value={s.last_30_days.views} prev={s.previous_30_days.views} prevLabel="30 days before" />
      </div>

      <Card title={`Visitors per ${unitWord}`} sub="A visitor is one person on one day. Staff pages are not counted."
        action={<button onClick={() => setAsTable(v => !v)} className="btn-sm border border-slate-200 text-slate-600 min-h-[40px] shrink-0" aria-pressed={asTable}>
          {asTable ? <BarChart3 size={14} /> : <Table2 size={14} />}{asTable ? 'Chart' : 'Table'}</button>}>
        <div className="mb-4"><Pills label="Group by" value={unit} onChange={setUnit} options={[['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly']]} /></div>
        {asTable ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[480px]">
              <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                {['Period', 'Visitors', 'Page views', 'Students joined', 'Owners joined', 'Bookings'].map(h => <th key={h} scope="col" className="py-2 px-4 sm:px-2 font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>{[...rows].reverse().map(r => (
                <tr key={r.period} className="border-b border-slate-50 tabular-nums">
                  <th scope="row" className="py-2 px-4 sm:px-2 text-left font-medium text-slate-700">{periodLabel(r.period, unit, true)}</th>
                  <td className="px-4 sm:px-2">{fmt(r.visits)}</td><td className="px-4 sm:px-2">{fmt(r.views)}</td>
                  <td className="px-4 sm:px-2">{fmt(r.students)}</td><td className="px-4 sm:px-2">{fmt(r.owners)}</td><td className="px-4 sm:px-2">{fmt(r.bookings)}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        ) : <ColumnChart rows={rows} unit={unitWord} valueKey="visits" label={`Visitors per ${unitWord}`} />}
        {outage && <p className="text-xs text-slate-500 mt-3">No visits were recorded from 28 Oct to 2 Nov 2026, while the site was offline after the hosting move.</p>}
      </Card>

      {/* Sign-ups and bookings */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Students joined (30 days)" value={totals.students} />
        <StatTile label="Owners joined (30 days)" value={totals.owners} />
        <StatTile label="Bookings (30 days)" value={totals.bookings} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Top pages" sub={`Last ${days} days, by page views`}>
          <BarList items={data.top_pages} labelKey="path" valueKey="views" valueLabel="page views" empty="No visits in this period." />
        </Card>
        <Card title="Where visitors come from" sub={`Last ${days} days, first page of each visit`}>
          {data.sources_tracking_since
            ? <BarList items={data.sources} labelKey="source" valueKey="visits" empty="No visits in this period." />
            : <p className="text-sm text-slate-500">Recording starts with this update. Tip: share links like <span className="font-mono text-xs bg-slate-100 px-1 rounded">getostudent.co.tz/?utm_source=whatsapp</span> so they show up by name.</p>}
          {data.referring_sites?.length > 0 && (
            <div className="mt-5"><h4 className="label">Other websites</h4>
              <BarList items={data.referring_sites} labelKey="site" valueKey="visits" empty="" /></div>
          )}
        </Card>
      </div>

      {/* Referrals */}
      <Card title="Referrals" sub="Students sharing their code, and Geto officers signing up house owners">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[['People referred', t.referred], [`Referred, last ${days} days`, t.in_period],
            ['Referred students who booked', t.students_booked], ['Referred owners with a house', t.owners_listed]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">{l}</div><div className="text-xl font-semibold text-slate-900 mt-0.5">{fmt(v)}</div></div>
          ))}
        </div>
        <h4 className="label">Top referrers</h4>
        {ref.top_referrers.length === 0 ? <p className="text-sm text-slate-400 py-2">No referrals yet.</p> : (
          <ul className="divide-y divide-slate-100">
            {ref.top_referrers.map(r => (
              <li key={r.id} className="py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-50 text-primary font-bold text-sm flex items-center justify-center shrink-0" aria-hidden="true">{r.name?.[0]?.toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-900 truncate">{r.name}</div>
                  <div className="text-xs text-slate-500 truncate">{ROLE[r.role] || r.role} · <span className="font-mono">{r.referral_code}</span></div>
                </div>
                <div className="text-right shrink-0 text-xs text-slate-500 tabular-nums">
                  <div><span className="text-base font-semibold text-slate-900">{r.referred}</span> referred</div>
                  <div>{r.students ? `${r.booked} of ${r.students} booked` : `${r.listed} of ${r.owners} listed`}</div>
                </div>
              </li>))}
          </ul>
        )}
        {ref.recent.length > 0 && (
          <details className="mt-4 group">
            <summary className="cursor-pointer text-sm font-semibold text-primary min-h-[44px] flex items-center">Recent referrals ({ref.recent.length})</summary>
            <ul className="divide-y divide-slate-100 text-sm">
              {ref.recent.map(r => (
                <li key={r.id} className="py-2.5 flex justify-between gap-3">
                  <span className="min-w-0"><span className="font-medium text-slate-900">{r.name}</span> <span className="text-slate-500">({ROLE[r.role] || r.role}) via {r.referrer_name}</span></span>
                  <span className="shrink-0 text-xs text-slate-500">{r.booked ? 'Booked' : r.listed ? 'Listed a house' : 'Signed up'} · {new Date(r.created_at.replace(' ', 'T')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </li>))}
            </ul>
          </details>
        )}
      </Card>

      {data.staff_bookings?.length > 0 && (
        <Card title="Bookings entered by staff" sub={`All time, with the last ${days} days in brackets`}>
          <ul className="divide-y divide-slate-100 text-sm">
            {data.staff_bookings.map(s2 => (
              <li key={s2.id} className="py-2.5 flex justify-between gap-3">
                <span className="min-w-0 truncate"><span className="font-medium text-slate-900">{s2.name}</span> <span className="text-slate-500">· {ROLE[s2.role] || s2.role}</span></span>
                <span className="tabular-nums font-semibold shrink-0">{fmt(s2.bookings)} <span className="font-normal text-slate-500">({fmt(s2.in_period)})</span></span>
              </li>))}
          </ul>
        </Card>
      )}
      {data.tracking_since && <p className="text-xs text-slate-400">Visits recorded since {new Date(data.tracking_since.replace(' ', 'T')).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>}
    </div>
  );
}
