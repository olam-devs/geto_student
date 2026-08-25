import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Shield, Clock, Star, ArrowRight, MapPin, ChevronRight,
  Users, ShieldCheck, BarChart3, CalendarCheck, Gift, GraduationCap,
} from 'lucide-react';
import api from '../api';
import PropertyCard from '../components/PropertyCard';
import PropertyModal from '../components/PropertyModal';

const SLIDES = [
  { src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1000&h=700&fit=crop&fm=webp&q=80', caption: 'Modern studio apartment' },
  { src: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1000&h=700&fit=crop&fm=webp&q=80', caption: 'Comfortable private room' },
  { src: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1000&h=700&fit=crop&fm=webp&q=80', caption: 'Spacious shared living space' },
  { src: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1000&h=700&fit=crop&fm=webp&q=80', caption: 'Fully equipped kitchen' },
  { src: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000&h=700&fit=crop&fm=webp&q=80', caption: 'Well-lit study environment' },
];

export default function Home() {
  const navigate = useNavigate();
  const [universities, setUnis]   = useState([]);
  const [featured, setFeatured]   = useState([]);
  const [selectedProp, setSelectedProp] = useState(null);
  const [propCount, setPropCount] = useState(0);
  const [slide, setSlide]         = useState(0);
  const timerRef = useRef(null);

  const goToSlide = (i) => {
    setSlide(i);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 4500);
  };

  useEffect(() => {
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 4500);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    api.get('/universities').then(r => setUnis(r.data)).catch(() => {});
    api.get('/properties?verified_only=true').then(r => {
      setFeatured(r.data.slice(0, 6));
      setPropCount(r.data.length);
    }).catch(() => {});
  }, []);

  const steps = [
    { n: '01', Icon: GraduationCap, title: 'Discover',  desc: 'Search by university, room type, and budget — no WhatsApp broker chains.' },
    { n: '02', Icon: ShieldCheck,   title: 'Verify',    desc: 'The Geto Verified badge is backed by a real physical inspection record.' },
    { n: '03', Icon: BarChart3,     title: 'Compare',   desc: 'Real rooms, real prices, real availability across Dar es Salaam.' },
    { n: '04', Icon: CalendarCheck, title: 'Book',      desc: 'Request a room or a guided site visit and track your status live.' },
    { n: '05', Icon: Gift,          title: 'Refer',     desc: 'Invite a friend and earn TZS rewards for each successful booking.' },
  ];

  const trustItems = [
    { Icon: CheckCircle2, color: 'text-verified', bg: 'bg-green-50', label: 'Verified Properties',    desc: 'Every Geto Verified badge is backed by a physical inspection.' },
    { Icon: Shield,       color: 'text-primary-700', bg: 'bg-primary-50', label: 'No Fake Listings',  desc: 'Listings that fail inspection are rejected before students see them.' },
    { Icon: Clock,        color: 'text-accent-600', bg: 'bg-accent-50',  label: '24/7 Admin Support', desc: 'Chat with a Geto admin any time for help with bookings or viewings.' },
    { Icon: Star,         color: 'text-amber-500', bg: 'bg-amber-50',   label: 'Transparent Pricing', desc: 'What you see is exactly what you pay — no hidden agent fees.' },
  ];

  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f5f0e8 0%, #fafaf7 60%, #fef3ec 100%)' }}>
        {/* Accent blob top-right */}
        <div className="absolute top-0 right-0 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(201,95,42,0.08) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }}/>

        {/* Mobile: slideshow at top full-width */}
        <div className="lg:hidden relative w-full" style={{ height: '260px' }}>
          {SLIDES.map(({ src, caption }, i) => (
            <img key={src} src={src} alt={caption}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
              style={{ opacity: slide === i ? 1 : 0 }}
            />
          ))}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"/>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => goToSlide(i)}
                className={`rounded-full transition-all duration-300 ${slide === i ? 'bg-white w-5 h-1.5' : 'bg-white/50 w-1.5 h-1.5'}`}
              />
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">

            {/* Left: text */}
            <div className="py-9 lg:py-20">
              <div className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-500 text-xs font-medium px-3 py-1.5 rounded-full mb-6 shadow-sm">
                <MapPin size={11} className="text-accent-600" strokeWidth={2.5}/>
                Dar es Salaam &middot; {universities.length || 8} Universities
              </div>

              <h1 className="font-sans font-semibold text-[34px] sm:text-[46px] lg:text-[56px] text-slate-900 leading-[1.1] mb-4 tracking-tight">
                Find verified<br/>student rooms<br/>
                <span className="text-accent-600">near your campus.</span>
              </h1>

              <p className="text-slate-500 text-sm sm:text-base leading-relaxed mb-7 max-w-[400px]">
                No fake listings. No hidden fees. Every property on Geto Student is physically inspected before students can see it.
              </p>

              {/* University chips */}
              <div className="flex flex-wrap gap-2 mb-7">
                {universities.slice(0, 5).map(u => (
                  <button key={u.id} onClick={() => navigate(`/find-room?university_id=${u.id}`)}
                    className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-accent-500 hover:text-accent-600 text-slate-600 text-xs font-semibold px-3 py-2 rounded-full transition-all shadow-sm">
                    <GraduationCap size={11} strokeWidth={2.5}/>
                    {u.short_name}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => navigate('/find-room')}
                  className="inline-flex items-center gap-2 bg-accent-600 hover:bg-accent-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-md text-sm">
                  Tafuta Chumba <ArrowRight size={15}/>
                </button>
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <CheckCircle2 size={13} className="text-verified"/>
                  {propCount || 24}+ verified listings
                </div>
              </div>
            </div>

            {/* Right: slideshow — desktop only (mobile shown above) */}
            <div className="hidden lg:block relative pb-8">
              <div className="relative rounded-2xl overflow-hidden shadow-lift" style={{ height: '520px' }}>
                {SLIDES.map(({ src, caption }, i) => (
                  <img key={src} src={src} alt={caption}
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                    style={{ opacity: slide === i ? 1 : 0 }}
                  />
                ))}
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent pointer-events-none"/>
                <p className="absolute bottom-14 left-5 text-white/80 text-xs font-medium">{SLIDES[slide].caption}</p>
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  {SLIDES.map((_, i) => (
                    <button key={i} onClick={() => goToSlide(i)}
                      className={`rounded-full transition-all duration-300 ${slide === i ? 'bg-white w-6 h-2' : 'bg-white/50 w-2 h-2 hover:bg-white/75'}`}
                    />
                  ))}
                </div>
                <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                  {slide + 1} / {SLIDES.length}
                </div>
              </div>

              {/* Floating verified card */}
              <div className="absolute -bottom-0 -left-8 bg-white rounded-2xl shadow-lift p-4 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={17} className="text-verified"/>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">Verified listings</p>
                    <p className="font-display font-extrabold text-slate-900 text-[17px] leading-tight">{propCount || 24}+ rooms</p>
                    <p className="text-[11px] text-slate-400">From TZS 150,000/mo</p>
                  </div>
                </div>
              </div>

              {/* Floating accent chip */}
              <div className="absolute -top-4 -right-4 bg-accent-600 text-white rounded-2xl px-5 py-3 text-center shadow-md">
                <p className="font-display font-extrabold text-2xl leading-none">{universities.length || 8}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-85 mt-0.5">Universities</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUST BAR ─── */}
      <section className="border-y border-slate-200 bg-white">
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
            Vyumba vyote <ArrowRight size={14}/>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {universities.map(u => (
            <button
              key={u.id}
              onClick={() => navigate(`/find-room?university_id=${u.id}`)}
              className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-accent-500 hover:shadow-md transition-all duration-200 group"
            >
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
            Ona zote <ArrowRight size={14}/>
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
          <button onClick={() => navigate('/find-room')} className="btn-outline">Tafuta vyumba vyote →</button>
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
            <p className="text-xs font-bold uppercase tracking-widest text-accent-400 mb-2">Kwa Wamiliki wa Mali</p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-white mb-2">Una nyumba au hostel?</h2>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed">
              Sajili mali yako, thibitisha, na wafikia maelfu ya wanafunzi wa vyuo vikuu Tanzania.
            </p>
          </div>
          <button
            onClick={() => navigate('/auth?tab=register')}
            className="btn-accent relative z-10 shrink-0 text-sm py-3 px-8"
          >
            Sajili Mali Yako <ChevronRight size={16}/>
          </button>
        </div>
      </section>

      {selectedProp && <PropertyModal propertyId={selectedProp} onClose={() => setSelectedProp(null)}/>}
    </>
  );
}
