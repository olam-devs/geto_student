import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Shield, Clock, Star, ArrowRight, MapPin, ChevronRight,
  Users, ShieldCheck, BarChart3, CalendarCheck, Gift, GraduationCap,
} from 'lucide-react';
import api from '../api';
import PropertyCard from '../components/PropertyCard';
import PropertyModal from '../components/PropertyModal';

// ── 4-photo grid: each cell has its own independent photo set ──
const PHOTO_SETS = [
  [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=420&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&h=420&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&h=420&fit=crop&fm=webp&q=75',
  ],
  [
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=420&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=600&h=420&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=600&h=420&fit=crop&fm=webp&q=75',
  ],
  [
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&h=420&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=420&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&h=420&fit=crop&fm=webp&q=75',
  ],
  [
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&h=420&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=600&h=420&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&h=420&fit=crop&fm=webp&q=75',
  ],
];
const INTERVALS = [3600, 4400, 5200, 3900];

function PhotoCell({ photos, interval, badge = false }) {
  const [cur, setCur] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCur(i => (i + 1) % photos.length), interval);
    return () => clearInterval(t);
  }, [interval, photos.length]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-100" style={{ aspectRatio: '4/3' }}>
      {photos.map((src, i) => (
        <img key={src} src={src} alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: cur === i ? 1 : 0 }}
        />
      ))}
      {badge && (
        <div className="absolute top-2.5 left-2.5 bg-verified/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
          <CheckCircle2 size={9}/> GETO VERIFIED
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
  const [propCount, setPropCount] = useState(0);

  useEffect(() => {
    api.get('/universities').then(r => setUnis(r.data)).catch(() => {});
    api.get('/properties?verified_only=true').then(r => {
      setFeatured(r.data.slice(0, 6));
      setPropCount(r.data.length);
    }).catch(() => {});
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
          <div className="grid lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_500px] gap-10 lg:gap-16 items-center">

            {/* ── Left: text ── */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 text-primary-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
                <MapPin size={11} strokeWidth={2.5}/>
                Dar es Salaam · Mbeya · {universities.length || 30}+ Universities
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
              <div className="flex flex-wrap items-center gap-6 sm:gap-10 mb-8">
                <div>
                  <p className="font-display font-extrabold text-4xl text-primary-700 leading-none">200+</p>
                  <p className="text-slate-400 text-xs font-semibold mt-1 uppercase tracking-wide">Rooms</p>
                </div>
                <div className="w-px h-12 bg-slate-200"/>
                <div>
                  <p className="font-display font-extrabold text-4xl text-primary-700 leading-none">{universities.length || 30}+</p>
                  <p className="text-slate-400 text-xs font-semibold mt-1 uppercase tracking-wide">Universities</p>
                </div>
              </div>

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

            {/* ── Right: overlapping/rotated photo cards ── */}
            <div className="order-1 lg:order-2">
              <div className="relative" style={{ height: '400px' }}>
                {/* Card A — back-left, rotated negative */}
                <div className="absolute rounded-2xl overflow-hidden shadow-xl"
                  style={{ top: 0, left: 0, width: '72%', height: '52%', transform: 'rotate(-5deg)', zIndex: 1 }}>
                  <PhotoCell photos={PHOTO_SETS[3]} interval={INTERVALS[3]}/>
                </div>
                {/* Card B — back-right, rotated positive */}
                <div className="absolute rounded-2xl overflow-hidden shadow-xl"
                  style={{ top: '10px', right: 0, width: '64%', height: '48%', transform: 'rotate(4deg)', zIndex: 2 }}>
                  <PhotoCell photos={PHOTO_SETS[2]} interval={INTERVALS[2]}/>
                </div>
                {/* Card C — front-left, slight negative tilt */}
                <div className="absolute rounded-2xl overflow-hidden shadow-2xl"
                  style={{ bottom: '10px', left: 0, width: '68%', height: '55%', transform: 'rotate(-2deg)', zIndex: 3 }}>
                  <PhotoCell photos={PHOTO_SETS[0]} interval={INTERVALS[0]} badge/>
                </div>
                {/* Card D — front-right, slight positive tilt */}
                <div className="absolute rounded-2xl overflow-hidden shadow-2xl"
                  style={{ bottom: 0, right: 0, width: '60%', height: '50%', transform: 'rotate(3deg)', zIndex: 4 }}>
                  <PhotoCell photos={PHOTO_SETS[1]} interval={INTERVALS[1]}/>
                </div>
              </div>

              {/* Floating verified bar below grid */}
              <div className="mt-3 bg-primary-900 text-white rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-lift">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-verified/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} className="text-green-300"/>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 font-medium">Geto Verified</p>
                    <p className="text-sm font-bold">{propCount || 24}+ verified properties</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/60">Starting from</p>
                  <p className="text-sm font-bold text-accent-400">150,000 TZS/mo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUST BAR ─── */}
      <section className="border-y border-slate-100 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap gap-4 justify-center sm:justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 size={15} className="text-verified"/> <span className="font-semibold">Verified Properties</span></div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block"/>
          <div className="flex items-center gap-2 text-sm text-slate-600"><Shield size={15} className="text-primary-700"/> <span className="font-semibold">No Fake Listings</span></div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block"/>
          <div className="flex items-center gap-2 text-sm text-slate-600"><Users size={15} className="text-accent-600"/> <span className="font-semibold">24/7 Admin Support</span></div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block"/>
          <div className="flex items-center gap-2 text-sm text-slate-600"><Star size={15} className="text-amber-500"/> <span className="font-semibold">Transparent Pricing</span></div>
        </div>
      </section>

      {/* ─── UNIVERSITIES ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="section-eyebrow">Browse by Campus</p>
            <h2 className="section-title text-2xl sm:text-3xl">Find a room near your university</h2>
          </div>
          <button onClick={() => navigate('/find-room')}
            className="hidden sm:flex items-center gap-1 text-sm font-semibold text-accent-600 hover:text-accent-700 transition-colors">
            View all <ArrowRight size={14}/>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {universities.map(u => (
            <button key={u.id} onClick={() => navigate(`/find-room?university_id=${u.id}`)}
              className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-accent-500 hover:shadow-md transition-all duration-200 group">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-3 group-hover:bg-accent-50 transition-colors">
                <GraduationCap size={18} className="text-primary-700 group-hover:text-accent-600 transition-colors"/>
              </div>
              <p className="font-display font-bold text-slate-900 text-sm">{u.short_name}</p>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{u.name}</p>
              <p className="text-xs text-accent-600 font-semibold mt-2">
                {u.property_count || 0} {u.property_count === 1 ? 'listing' : 'listings'}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="bg-primary-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="section-eyebrow">Why Geto Student?</p>
            <h2 className="section-title text-2xl sm:text-3xl">Tanzania's first verified student platform</h2>
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
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
