import React from 'react';
import { MapPin, CheckCircle2, Clock, Building2 } from 'lucide-react';

export default function PropertyCard({ property, onClick }) {
  const {
    name, university_name, university_short, area,
    price_from, verified, main_photo, property_type, highlight,
  } = property;

  const fmt = (n) => n ? Number(n).toLocaleString('en-TZ') : '—';

  return (
    <div
      onClick={onClick}
      className="card overflow-hidden cursor-pointer hover:shadow-lift hover:-translate-y-1 transition-all duration-200 group"
    >
      {/* Photo */}
      <div className="relative h-48 bg-slate-200 overflow-hidden">
        {main_photo ? (
          <img
            src={main_photo}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 gallery-img"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900">
              <Building2 size={52} className="text-white/25"/>
            </div>
        )}
        {/* Badge */}
        <div className="absolute top-3 left-3">
          {verified
            ? <span className="badge-verified text-[11px]"><CheckCircle2 size={11} /> GETO VERIFIED</span>
            : <span className="badge-pending text-[11px]"><Clock size={11} /> Unverified</span>
          }
        </div>
        {/* Type pill */}
        <div className="absolute top-3 right-3">
          <span className="bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">{property_type}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">{university_short || university_name}</p>
        <h3 className="font-display font-bold text-slate-900 text-base leading-tight mb-1 group-hover:text-accent-600 transition-colors">{name}</h3>
        {highlight && <p className="text-xs text-slate-500 italic mb-1 line-clamp-1">{highlight}</p>}
        <div className="flex items-center gap-1 text-slate-500 text-xs mb-3">
          <MapPin size={12} className="shrink-0"/>
          <span>{area}</span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div>
            <span className="text-[10px] text-slate-400 block">From</span>
            <span className="font-display font-bold text-slate-900 text-base">
              {price_from ? `TZS ${fmt(price_from)}` : 'Price on request'}
              <span className="text-[11px] font-normal text-slate-400">/mo</span>
            </span>
          </div>
          <span className="text-xs font-semibold bg-primary text-white px-3 py-1.5 rounded-lg group-hover:bg-primary/90 transition-colors">Book Now</span>
        </div>
      </div>
    </div>
  );
}
