import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Shield, Clock, Star, ArrowRight, MapPin, ChevronRight,
  Users, ShieldCheck, BarChart3, CalendarCheck, Gift, GraduationCap,
} from 'lucide-react';
import api from '../api';
import PropertyCard from '../components/PropertyCard';
import PropertyModal from '../components/PropertyModal';

// ── Hero showcase: real houses that have rooms right now (verified first) ──
function HeroShowcase({ slides, housesAvailable, onOpen }) {
  const [cur, setCur] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(() => setCur(i => (i + 1) % slides.length), 4000);
    return () => clearInterval(t);
  }, [slides.length, paused]);
  if (!slides.length) return null;
  const slide = slides[cur % slides.length];
  const near = slide.university_short || slide.university_name;
  return (
    <div className="relative w-full max-w-sm mx-auto lg:max-w-none"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Main card: opens the house */}
      <button type="button" onClick={() => onOpen(slide)} aria-label={`Open ${slide.name}`}
        className="block w-full text-left rounded-3xl overflow-hidden shadow-2xl border border-white/60 bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-400"
        style={{ transform: 'rotate(1.5deg)' }}>
        {/* Photo area */}
        <div className="relative overflow-hidden bg-slate-100" style={{ aspectRatio: '4/3' }}>
          {slides.map((s, i) => (
            <img key={s.id} src={s.main_photo} alt={i === cur ? s.name : ''} loading={i === 0 ? 'eager' : 'lazy'}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
              style={{ opacity: cur === i ? 1 : 0 }}
            />
          ))}
          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"/>
          {/* Badges */}
          {slide.property_type && (
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-primary text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-sm">
              {slide.property_type}
            </div>
          )}
          {!!Number(slide.verified) && (
            <div className="absolute top-3 right-3 bg-verified/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1">
              <CheckCircle2 size={10}/> GETO VERIFIED
            </div>
          )}
        </div>
        {/* Property details */}
        <div className="p-4 bg-white">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display font-bold text-slate-900 text-base leading-tight truncate">{slide.name}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                <MapPin size={10} className="shrink-0"/>{slide.area}{near ? ` · Near ${near}` : ''}
              </p>
            </div>
            {Number(slide.price_from) > 0 && (
              <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-400">From</p>
                <p className="font-bold text-accent-700 text-base leading-tight">TZS {Number(slide.price_from).toLocaleString()}<span className="text-[10px] text-slate-400 font-normal">/mo</span></p>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs font-semibold text-accent-700 flex items-center gap-1"><CheckCircle2 size={12}/>Rooms available</p>
        </div>
      </button>
      {/* Slide dots (large tap area, small visible dot) */}
      {slides.length > 1 && (
        <div className="flex justify-end gap-0.5 mt-3 pr-1" role="tablist" aria-label="Featured houses">
          {slides.map((s, i) => (
            <button key={s.id} type="button" role="tab" aria-selected={i === cur} aria-label={s.name} onClick={() => setCur(i)}
              className="w-7 h-7 flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span className={`block h-1.5 rounded-full transition-all ${i === cur ? 'bg-primary-700 w-4' : 'bg-slate-300 w-1.5'}`}/>
            </button>
          ))}
        </div>
      )}

      {/* Floating count pill: real number of houses with rooms */}
      {housesAvailable > 0 && (
        <div className="absolute -bottom-4 -left-4 bg-primary-900 text-white rounded-2xl px-4 py-3 shadow-xl z-10 pointer-events-none">
          <p className="text-[10px] text-white/60 font-semibold uppercase tracking-wider">Rooms available</p>
          <p className="font-bold text-sm text-accent-400">{housesAvailable} {housesAvailable === 1 ? 'house' : 'houses'} right now</p>
        </div>
      )}
    </div>
  );
}

const steps = [
  { n: '01', Icon: GraduationCap, title: 'Discover',  desc: 'Search by university, room type, and budget — no WhatsApp broker chains.' },
  { n: '02', Icon: ShieldCheck,   title: 'Verify',    desc: 'The Geto Verified badge is backed by a real physical inspection record.' },
  { n: '03', Icon: BarChart3,     title: 'Compare',   desc: 'Real rooms, real prices, real availability across Dar es Salaam.' },
  { n: '04', Icon: CalendarCheck, title: 'Book',      desc: 'Request a room or a guided site visit and track your status live.' },
  { n: '05', Icon: Gift,          title: 'Refer',     desc: 'Invite a friend and earn TZS rewards for each successful booking.' },
];

const trustItems = [
  { Icon: CheckCircle2, color: 'text-verified', bg: 'bg-green-50',      label: 'Verified Properties',    desc: 'Every Geto Verified badge is backed by a physical inspection.' },
  { Icon: Shield,       color: 'text-primary-700', bg: 'bg-primary-50', label: 'No Fake Listings',       desc: 'Listings that fail inspection are rejected before students see them.' },
  { Icon: Clock,        color: 'text-accent-600', bg: 'bg-accent-50',   label: '24/7 Admin Support',     desc: 'Chat with a Geto admin any time for help with bookings or viewings.' },
  { Icon: Star,         color: 'text-amber-500', bg: 'bg-amber-50',     label: 'Transparent Pricing',    desc: 'What you see is exactly what you pay — no hidden agent fees.' },
];

export default function Home() {
  const navigate = useNavigate();
  const [universities, setUnis]   = useState([]);
  const [featured, setFeatured]   = useState([]);
  const [selectedProp, setSelectedProp] = useState(null);
  const [slides, setSlides]       = useState([]);
  const [stats, setStats]         = useState(null);

  useEffect(() => {
    const list = (r) => (Array.isArray(r.data) ? r.data : []);   // never crash if the API is down
    api.get('/universities').then(r => setUnis(list(r))).catch(() => {});
    api.get('/properties?verified_only=true').then(r => setFeatured(list(r).slice(0, 6))).catch(() => {});
    api.get('/properties', { params: { available_only: 'true', limit: 40 } })
      .then(r => setSlides(list(r).filter(p => p.main_photo).slice(0, 6))).catch(() => {});
    api.get('/site-stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-white">
        {/* Subtle green blob top-right */}
        <div className="absolute top-0 right-0 w-[700px] h-[700px] pointer-events-none opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #1E4835 0%, transparent 65%)', transform: 'translate(20%,-20%)' }}/>
        {/* Subtle orange blob bottom-left */}
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] pointer-events-none opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #C95F2A 0%, transparent 65%)', transform: 'translate(-30%,30%)' }}/>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-12 lg:py-20">
          <div className="grid lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_500px] gap-10 lg:gap-16 items-center">

            {/* ── Left: text ── */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 text-primary-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
                <MapPin size={11} strokeWidth={2.5}/>
                Dar es Salaam · Mbeya{universities.length ? ` · ${universities.length} universities` : ''}
              </div>

              <h1 className="font-display font-bold leading-[1.05] tracking-tight text-slate-900 mb-5"
                style={{ fontSize: 'clamp(36px,5.5vw,64px)' }}>
                Find Safe Rooms<br/>
                <span className="text-primary-700">Near Your</span><br/>
                <span className="text-accent-600">Campus.</span>
              </h1>

              <p className="text-slate-500 text-base sm:text-lg leading-relaxed mb-8 max-w-[480px]">
                No fake listings. No hidden fees. Every property on Geto Student is physically inspected before students see it.
              </p>

              {/* Stats */}
              {stats && (
                <div className="flex flex-wrap items-center gap-6 sm:gap-10 mb-8">
                  <div>
                    <p className="font-display font-extrabold text-4xl text-primary-700 leading-none">{stats.houses_available}</p>
                    <p className="text-slate-500 text-xs font-semibold mt-1 uppercase tracking-wide">Houses with rooms</p>
                  </div>
                  <div className="w-px h-12 bg-slate-200"/>
                  <div>
                    <p className="font-display font-extrabold text-4xl text-primary-700 leading-none">{stats.houses_verified}</p>
                    <p className="text-slate-500 text-xs font-semibold mt-1 uppercase tracking-wide">Geto verified</p>
                  </div>
                  <div className="w-px h-12 bg-slate-200"/>
                  <div>
                    <p className="font-display font-extrabold text-4xl text-primary-700 leading-none">{stats.universities_with_houses}</p>
                    <p className="text-slate-500 text-xs font-semibold mt-1 uppercase tracking-wide">Universities served</p>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="flex flex-wrap gap-3">
                <button onClick={() => navigate('/find-room')}
                  className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-bold px-7 py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-primary-700/25 hover:shadow-primary-700/40 hover:-translate-y-0.5">
                  Find a Room <ArrowRight size={15}/>
                </button>
                <button onClick={() => navigate('/auth?tab=register')}
                  className="inline-flex items-center gap-2 border-2 border-slate-200 hover:border-primary-500 hover:text-primary-700 text-slate-600 font-bold px-7 py-3.5 rounded-xl text-sm transition-all">
                  List Your Property
                </button>
              </div>

              {/* University chips */}
              <div className="flex flex-wrap gap-2 mt-6">
                {universities.slice(0, 5).map(u => (
                  <button key={u.id} onClick={() => navigate(`/find-room?university_id=${u.id}`)}
                    className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:border-primary-500 hover:text-primary-700 text-slate-500 text-xs font-semibold px-3 py-1.5 rounded-full transition-all">
                    <GraduationCap size={10} strokeWidth={2.5}/> {u.short_name}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Right: single property showcase card ── */}
            <div className="order-1 lg:order-2 pb-6">
              <HeroShowcase slides={slides} housesAvailable={stats?.houses_available || 0} onOpen={(p) => setSelectedProp(p.id)} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUST BAR ─── */}
      <section className="border-y border-slate-100 bg-slate-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap gap-4 justify-center sm:justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 size={15} className="text-verified"/> <span className="font-semibold">Verified Properties</span></div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block"/>
          <div className="flex items-center gap-2 text-sm text-slate-600"><Shield size={15} className="text-primary-700"/> <span className="font-semibold">No Fake Listings</span></div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block"/>
          <div className="flex items-center gap-2 text-sm text-slate-600"><Users size={15} className="text-accent-600"/> <span className="font-semibold">24/7 Admin Support</span></div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block"/>
          <div className="flex items-center gap-2 text-sm text-slate-600"><Star size={15} className="text-amber-500"/> <span className="font-semibold">Transparent Pricing</span></div>
        </div>
      </section>

      {/* ─── UNIVERSITY MARQUEE BELT ─── */}
      {universities.length > 0 && (
        <div className="border-y border-slate-100 bg-slate-50 py-3 overflow-hidden select-none">
          <style>{`
            @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
            .marquee-inner { display:flex; width:max-content; animation:marquee 30s linear infinite; }
            .marquee-inner:hover { animation-play-state:paused; }
          `}</style>
          <div className="marquee-inner gap-0">
            {[...universities, ...universities].map((u, i) => (
              <button key={i} onClick={() => navigate(`/find-room?university_id=${u.id}`)}
                className="inline-flex items-center gap-2 px-5 py-1.5 text-slate-500 hover:text-primary-700 text-xs font-semibold whitespace-nowrap transition-colors border-r border-slate-200 last:border-r-0">
                <GraduationCap size={11} className="text-primary-400 shrink-0"/>
                {u.short_name || u.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── HOW IT WORKS ─── */}
      <section className="bg-primary-900 py-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-400 mb-2">How It Works</p>
            <h2 className="font-display font-bold text-3xl text-white">From search to move-in — 5 steps</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {steps.map(({ n, Icon, title, desc }) => (
              <div key={n} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
                  <Icon size={20} className="text-accent-400"/>
                </div>
                <div className="font-mono text-xs text-accent-500/70 mb-1">{n}</div>
                <h4 className="font-display font-bold text-white text-sm mb-1.5">{title}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURED PROPERTIES ─── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="section-eyebrow">Geto Verified</p>
            <h2 className="section-title text-2xl sm:text-3xl">Inspected and approved rooms</h2>
          </div>
          <button onClick={() => navigate('/find-room?verified_only=true')}
            className="hidden sm:flex items-center gap-1 text-sm font-semibold text-accent-600 hover:text-accent-700 transition-colors">
            View all <ArrowRight size={14}/>
          </button>
        </div>
        {featured.length === 0 ? (
          <div className="text-center text-slate-400 py-12">No verified properties yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map(p => (
              <PropertyCard key={p.id} property={p} onClick={() => setSelectedProp(p.id)}/>
            ))}
          </div>
        )}
        <div className="text-center mt-8 sm:hidden">
          <button onClick={() => navigate('/find-room')} className="btn-outline">Browse all rooms →</button>
        </div>
      </section>

      {/* ─── WHY GETO ─── */}
      <section className="bg-sand-100 border-y border-sand-200 py-14">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="section-eyebrow">Why Geto Student?</p>
            <h2 className="section-title text-2xl sm:text-3xl">Verified Offcampus student accommodation Platform in Tanzania</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trustItems.map(({ Icon, color, bg, label, desc }) => (
              <div key={label} className="bg-white rounded-xl p-5 border border-slate-100 shadow-card">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                  <Icon size={18} className={color}/>
                </div>
                <h4 className="font-display font-bold text-slate-900 text-sm mb-1.5">{label}</h4>
                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── OWNER CTA ─── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-14">
        <div className="relative bg-primary-900 rounded-2xl p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden">
          <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-white/5 pointer-events-none"/>
          <div className="absolute -right-4 -bottom-14 w-52 h-52 rounded-full bg-accent-600/15 pointer-events-none"/>
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-400 mb-2">For Property Owners</p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-white mb-2">Have a house or hostel?</h2>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed">
              List your property, get verified, and reach thousands of university students across Tanzania.
            </p>
          </div>
          <button onClick={() => navigate('/auth?tab=register')}
            className="btn-accent relative z-10 shrink-0 text-sm py-3 px-8">
            List Your Property <ChevronRight size={16}/>
          </button>
        </div>
      </section>

      {selectedProp && <PropertyModal propertyId={selectedProp} onClose={() => setSelectedProp(null)}/>}
    </>
  );
}
