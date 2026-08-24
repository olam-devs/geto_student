import React, { useState, useEffect } from 'react';
import { X, MapPin, CheckCircle2, Clock, Wifi, Youtube, ChevronLeft, ChevronRight, Calendar, Eye, Heart, Share2, Shield, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import BookingModal from './BookingModal';
import ViewingModal from './ViewingModal';

export default function PropertyModal({ propertyId, onClose }) {
  const { isLoggedIn, isStudent } = useAuth();
  const navigate = useNavigate();

  const [prop, setProp]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [saved, setSaved]       = useState(false);
  const [bookRoom, setBookRoom] = useState(null);
  const [viewingOpen, setViewingOpen] = useState(false);

  useEffect(() => {
    if (!propertyId) return;
    setLoading(true);
    setPhotoIdx(0);
    setShowVideo(false);
    api.get(`/properties/${propertyId}`)
      .then(r => { setProp(r.data); setLoading(false); })
      .catch(() => { setLoading(false); onClose(); });
  }, [propertyId]);

  const fmt = (n) => Number(n).toLocaleString('en-TZ');
  const photos = prop?.photos || [];

  const prevPhoto = () => setPhotoIdx(i => (i - 1 + photos.length) % photos.length);
  const nextPhoto = () => setPhotoIdx(i => (i + 1) % photos.length);

  const handleSave = async () => {
    if (!isLoggedIn) { onClose(); navigate('/auth'); return; }
    try {
      if (saved) { await api.delete(`/properties/${prop.id}/save`); setSaved(false); }
      else        { await api.post(`/properties/${prop.id}/save`);   setSaved(true);  }
    } catch {}
  };

  const handleBook = (room) => {
    if (!isLoggedIn) { onClose(); navigate('/auth'); return; }
    setBookRoom(room);
  };

  const handleViewing = () => {
    if (!isLoggedIn) { onClose(); navigate('/auth'); return; }
    setViewingOpen(true);
  };

  if (!propertyId) return null;

  return (
    <>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal-box max-w-3xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-10 h-10 border-4 border-primary-700/20 border-t-primary-700 rounded-full animate-spin mx-auto mb-4" />
              Loading property details…
            </div>
          ) : prop && (
            <>
              {/* Gallery */}
              <div className="relative h-64 sm:h-80 bg-slate-900 overflow-hidden rounded-t-2xl">
                {showVideo && prop.youtube_video_id ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${prop.youtube_video_id}?autoplay=1`}
                    className="w-full h-full" allowFullScreen
                    title="Property video tour"
                    allow="autoplay; encrypted-media"
                  />
                ) : (
                  <>
                    {photos.length > 0 ? (
                      <img src={photos[photoIdx]?.url} alt={prop.name}
                        className="w-full h-full object-cover gallery-img" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-primary-700 to-primary-800">🏠</div>
                    )}
                    {photos.length > 1 && (
                      <>
                        <button onClick={prevPhoto} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"><ChevronLeft size={18}/></button>
                        <button onClick={nextPhoto} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"><ChevronRight size={18}/></button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {photos.map((_, i) => (
                            <button key={i} onClick={() => setPhotoIdx(i)}
                              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === photoIdx ? 'bg-white' : 'bg-white/50'}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
                {/* Top actions */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {prop.verified
                    ? <span className="badge-verified"><CheckCircle2 size={11}/> GETO VERIFIED</span>
                    : <span className="badge-pending"><Clock size={11}/> Pending Verification</span>
                  }
                </div>
                <div className="absolute top-3 right-3 flex gap-2">
                  {prop.youtube_video_id && (
                    <button onClick={() => setShowVideo(v => !v)}
                      className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors">
                      <Youtube size={13}/> {showVideo ? 'Photos' : 'Watch Tour'}
                    </button>
                  )}
                  <button onClick={onClose} className="w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"><X size={16}/></button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">{prop.university_name} · {prop.property_type}</p>
                    <h2 className="font-display font-bold text-2xl text-slate-900 leading-tight">{prop.name}</h2>
                    <div className="flex items-center gap-1 text-slate-500 text-sm mt-1.5">
                      <MapPin size={14}/><span>{prop.address}</span>
                    </div>
                    {prop.distance_km && (
                      <p className="text-xs text-primary-700 font-semibold mt-1">📍 {prop.distance_km} km from campus gate</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={handleSave} className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${saved ? 'bg-red-50 border-red-200 text-red-500' : 'border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-400'}`}>
                      <Heart size={16} fill={saved ? 'currentColor' : 'none'}/>
                    </button>
                  </div>
                </div>

                {/* Verification record */}
                {prop.verified && prop.verification && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield size={16} className="text-green-600"/>
                      <span className="font-semibold text-green-800 text-sm">Geto Verified Property</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-green-700">
                      {[['Owner Identity', prop.verification.owner_identity],['Location Confirmed', prop.verification.location_confirmed],
                        ['Rooms Inspected', prop.verification.rooms_confirmed],['Water Supply', prop.verification.water_confirmed],
                        ['Electricity', prop.verification.electricity_confirmed],['Security', prop.verification.security_confirmed]].map(([label, ok]) => (
                        <div key={label} className="flex items-center gap-1.5">
                          {ok ? <CheckCircle2 size={11} className="text-green-600"/> : <X size={11} className="text-red-400"/>}
                          {label}
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-green-600 mt-2">
                      Verified {prop.verification_date} · Expires {prop.verification_expiry}
                    </p>
                  </div>
                )}

                {/* Description */}
                <p className="text-slate-600 text-sm leading-relaxed mb-5">{prop.description}</p>

                {/* Amenities */}
                {prop.amenities?.length > 0 && (
                  <div className="mb-5">
                    <h4 className="font-display font-semibold text-slate-800 text-sm mb-2.5">Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {prop.amenities.map(a => (
                        <span key={a.name} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg font-medium">
                          {a.icon} {a.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rooms */}
                <div className="mb-6">
                  <h4 className="font-display font-semibold text-slate-800 text-sm mb-3">Available Rooms</h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {prop.rooms?.map(room => (
                      <div key={room.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div>
                          <span className="font-semibold text-slate-800 text-sm">{room.room_type}</span>
                          <span className="text-slate-400 text-xs ml-2">· Capacity: {room.capacity} · {room.furnished ? 'Furnished' : 'Unfurnished'} · {room.bathroom_type} bath</span>
                          {room.deposit > 0 && <p className="text-xs text-slate-400 mt-0.5">Deposit: TZS {fmt(room.deposit)}</p>}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="font-display font-bold text-slate-900 text-sm">TZS {fmt(room.monthly_price)}<span className="text-[11px] font-normal text-slate-400">/mo</span></p>
                          {room.available_count > 0 ? (
                            <button onClick={() => handleBook(room)} className="mt-1 text-xs bg-primary-700 hover:bg-primary-600 text-white font-semibold px-3 py-1 rounded-lg transition-colors">Book Now</button>
                          ) : (
                            <span className="badge-rejected text-[10px] mt-1">Full</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button onClick={handleViewing} className="btn-outline flex-1 justify-center">
                    <Calendar size={15}/> Request Site Viewing
                  </button>
                  <button onClick={handleSave} className="btn-ghost border border-slate-200">
                    <Bookmark size={15}/> {saved ? 'Saved' : 'Save'}
                  </button>
                </div>

                {!isLoggedIn && (
                  <p className="text-center text-xs text-slate-400 mt-3">
                    <button onClick={() => { onClose(); navigate('/auth'); }} className="text-primary-700 font-semibold hover:underline">Sign in</button> or <button onClick={() => { onClose(); navigate('/auth?tab=register'); }} className="text-primary-700 font-semibold hover:underline">register free</button> to book or request a viewing.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {bookRoom && <BookingModal property={prop} room={bookRoom} onClose={() => setBookRoom(null)} />}
      {viewingOpen && <ViewingModal property={prop} onClose={() => setViewingOpen(false)} />}
    </>
  );
}
