import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, CheckCircle2, Clock, Wifi, Youtube, ChevronLeft, ChevronRight, Calendar, Eye, Heart, Share2, Shield, Bookmark, Star, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [loadedPhoto, setLoadedPhoto] = useState(null);
  const [failedPhoto, setFailedPhoto] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [saved, setSaved]       = useState(false);
  const [bookRoom, setBookRoom] = useState(null);
  const [viewingOpen, setViewingOpen] = useState(false);
  const [reviews, setReviews]   = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [paused, setPaused]     = useState(false);
  const [expandedRoom, setExpandedRoom] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!propertyId) return;
    setLoading(true);
    setPhotoIdx(0);
    setShowVideo(false);
    setReviews([]);
    setCanReview(false);
    setReviewDone(false);
    setReviewForm({ rating: 0, comment: '' });
    api.get(`/properties/${propertyId}`)
      .then(r => {
        setProp(r.data);
        setReviews(r.data.reviews || []);
        setLoading(false);
      })
      .catch(() => { setLoading(false); onClose(); });
    if (isStudent) {
      api.get('/student/bookings').then(r => {
        const eligible = (r.data || []).find(b =>
          b.property_id == propertyId &&
          ['move_in_completed','move_out_completed'].includes(b.status)
        );
        if (eligible) {
          api.get(`/properties/${propertyId}/reviews`).then(rv => {
            setCanReview(true);
          }).catch(() => {});
        }
      }).catch(() => {});
    }
  }, [propertyId, isStudent]);

  const fmt = (n) => Number(n).toLocaleString('en-TZ');
  // Room uploads also serve as the gallery when no property photos exist.
  const photos = prop?.photos?.length ? prop.photos : (prop?.rooms || []).flatMap(room => room.photos || []);
  const photoUrl = photos[photoIdx]?.url;
  const photoReady = !!photoUrl && loadedPhoto === photoUrl;
  const photoFailed = !!photoUrl && failedPhoto === photoUrl;

  const prevPhoto = useCallback(() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length), [photos.length]);
  const nextPhoto = useCallback(() => setPhotoIdx(i => (i + 1) % photos.length), [photos.length]);

  // Auto-advance story
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (photos.length <= 1 || showVideo || paused || !photoReady || photoFailed) return;
    timerRef.current = setTimeout(nextPhoto, 3500);
    return () => clearTimeout(timerRef.current);
  }, [photoIdx, photos.length, showVideo, paused, photoReady, photoFailed, nextPhoto]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prevPhoto, nextPhoto]);

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
              {/* Story Gallery */}
              <style>{`
                @keyframes story-fill { from{width:0%} to{width:100%} }
                .story-seg-active { animation: story-fill 3.5s linear forwards; }
              `}</style>
              <div
                className="relative bg-slate-900 overflow-hidden rounded-t-2xl select-none"
                style={{ height: '300px' }}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
              >
                {showVideo && prop.youtube_video_id ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${prop.youtube_video_id}?autoplay=1`}
                    className="w-full h-full" allowFullScreen
                    title="Property video tour"
                    allow="autoplay; encrypted-media"
                  />
                ) : (
                  <>
                    {/* Photo */}
                    {photos.length > 0 ? (
                      <img
                        key={`photo-${photoIdx}`}
                        src={photoUrl}
                        onLoad={() => { setLoadedPhoto(photoUrl); setFailedPhoto(null); }}
                        onError={() => setFailedPhoto(photoUrl)}
                        alt={`${prop.name} — photo ${photoIdx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-primary-700 to-primary-800">🏠</div>
                    )}

                    {photos.length > 0 && (!photoReady || photoFailed) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-white text-sm" role="status">
                        {photoFailed ? 'This photo could not load. Try the next photo.' : 'Loading photo…'}
                      </div>
                    )}

                    {/* Gradient overlay */}
                    {photos.length > 0 && (
                      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/55 pointer-events-none" />
                    )}

                    {/* Progress segments */}
                    {photos.length > 1 && (
                      <div className="absolute top-0 left-0 right-0 z-20 flex gap-0.5 px-2.5 pt-2.5">
                        {photos.map((_, i) => (
                          <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
                            {i < photoIdx ? (
                              <div className="h-full w-full bg-white rounded-full" />
                            ) : i === photoIdx ? (
                              <div key={`seg-${photoIdx}`} className="h-full bg-white rounded-full story-seg-active" style={{ animationPlayState: paused || !photoReady || photoFailed ? 'paused' : 'running' }} />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tap zones — invisible, full-height */}
                    {photos.length > 1 && (
                      <>
                        <button onClick={prevPhoto} aria-label="Previous photo"
                          className="absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer" />
                        <button onClick={nextPhoto} aria-label="Next photo"
                          className="absolute right-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer" />
                      </>
                    )}

                    {/* Photo count */}
                    {photos.length > 1 && (
                      <div className="absolute bottom-10 right-3 z-10">
                        <span className="font-mono text-[11px] text-white/80 bg-black/40 px-2 py-0.5 rounded-full">
                          {photoIdx + 1} / {photos.length}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Verification badge */}
                <div className="absolute top-3 left-3 z-20 flex gap-2">
                  {prop.verified
                    ? <span className="badge-verified"><CheckCircle2 size={11}/> GETO VERIFIED</span>
                    : <span className="badge-pending"><Clock size={11}/> Pending Verification</span>
                  }
                </div>

                {/* Controls top-right */}
                <div className="absolute top-3 right-3 z-20 flex gap-2">
                  {prop.youtube_video_id && (
                    <button onClick={() => { setShowVideo(v => !v); setPaused(true); }}
                      className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors">
                      <Youtube size={13}/> {showVideo ? 'Photos' : 'Watch Tour'}
                    </button>
                  )}
                  <button onClick={onClose} className="w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors">
                    <X size={16}/>
                  </button>
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

                {/* Facilities */}
                {(prop.gender_policy || prop.has_parking || prop.has_compound || prop.has_lift || prop.warden_name || (prop.water_source && prop.water_source !== 'unknown') || (prop.electricity_backup && prop.electricity_backup !== 'none' && prop.electricity_backup !== 'unknown')) && (
                  <div className="mb-5">
                    <h4 className="font-display font-semibold text-slate-800 text-sm mb-2.5">Facilities & Policies</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600">
                      {prop.gender_policy && <div className="flex items-center gap-1.5">👥 {prop.gender_policy === 'female_only' ? 'Female Only' : prop.gender_policy === 'male_only' ? 'Male Only' : 'Mixed Gender'}</div>}
                      {prop.water_source && prop.water_source !== 'unknown' && <div className="flex items-center gap-1.5">💧 {prop.water_source === 'dawasco' ? 'DAWASCO Grid' : prop.water_source === 'borehole' ? 'Borehole' : 'Water Tank'}</div>}
                      {prop.electricity_backup && prop.electricity_backup !== 'none' && prop.electricity_backup !== 'unknown' && <div className="flex items-center gap-1.5">⚡ Backup: {prop.electricity_backup === 'generator' ? 'Generator' : 'Solar'}</div>}
                      {!!prop.has_parking && <div className="flex items-center gap-1.5 text-green-700">🚗 Parking available</div>}
                      {!!prop.has_compound && <div className="flex items-center gap-1.5 text-green-700">🏡 Has compound</div>}
                      {!!prop.has_lift && <div className="flex items-center gap-1.5 text-green-700">🛗 Has lift/elevator</div>}
                    </div>
                    {prop.warden_name && (
                      <div className="mt-2 text-xs text-slate-500">
                        Warden: <span className="font-semibold text-slate-700">{prop.warden_name}</span>
                        {prop.warden_phone && <> · <a href={`tel:${prop.warden_phone}`} className="text-primary-700 hover:underline">{prop.warden_phone}</a></>}
                      </div>
                    )}
                  </div>
                )}

                {/* Map */}
                {prop.latitude && prop.longitude && (
                  <div className="mb-5">
                    <h4 className="font-display font-semibold text-slate-800 text-sm mb-2.5">Location</h4>
                    <div className="rounded-xl overflow-hidden border border-slate-200" style={{height:'180px'}}>
                      <iframe
                        title="Property location"
                        width="100%" height="180"
                        style={{border:0, display:'block'}}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${prop.longitude - 0.005},${prop.latitude - 0.005},${prop.longitude + 0.005},${prop.latitude + 0.005}&layer=mapnik&marker=${prop.latitude},${prop.longitude}`}
                        allowFullScreen
                      />
                    </div>
                    <a href={`https://www.openstreetmap.org/?mlat=${prop.latitude}&mlon=${prop.longitude}#map=16/${prop.latitude}/${prop.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-primary-700 hover:underline mt-1 block">
                      Open in maps →
                    </a>
                  </div>
                )}

                {/* Rooms */}
                <div className="mb-6">
                  <h4 className="font-display font-semibold text-slate-800 text-sm mb-3">Available Rooms</h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {prop.rooms?.map(room => (
                      <div key={room.id}>
                        <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800 text-sm">{room.room_type}</span>
                              {room.photos?.length > 0 && (
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{room.photos.length} photo{room.photos.length!==1?'s':''}</span>
                              )}
                              {expandedRoom === room.id
                                ? <ChevronUp size={13} className="text-slate-400 ml-1"/>
                                : <ChevronDown size={13} className="text-slate-400 ml-1"/>}
                            </div>
                            <span className="text-slate-400 text-xs">· {room.capacity > 1 ? `${room.capacity} beds/room` : 'Single'} · {room.furnished ? 'Furnished' : 'Unfurnished'} · {room.bathroom_type} bath</span>
                            {room.deposit_months > 0 && <p className="text-xs text-slate-400 mt-0.5">Deposit: {room.deposit_months} mo = TZS {fmt(room.monthly_price * room.deposit_months)}</p>}
                            {Number(room.listed_units) > 0 && (
                              <p className="text-xs mt-0.5">
                                {Number(room.beds_available) > 0
                                  ? <span className="text-emerald-600 font-medium">{room.beds_available} bed{Number(room.beds_available)!==1?'s':''} available</span>
                                  : <span className="text-red-500 font-medium">All beds taken</span>}
                                {room.capacity > 1 && <span className="text-slate-400"> · {room.total_beds} total beds</span>}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="font-display font-bold text-slate-900 text-sm">TZS {fmt(room.monthly_price)}<span className="text-[11px] font-normal text-slate-400">/mo</span></p>
                            {(Number(room.listed_units) === 0 ? room.available_count > 0 : Number(room.beds_available) > 0) ? (
                              <button onClick={() => handleBook(room)} className="mt-1 text-xs bg-primary-700 hover:bg-primary-600 text-white font-semibold px-3 py-1 rounded-lg transition-colors">Book Now</button>
                            ) : (
                              <span className="badge-rejected text-[10px] mt-1">Full</span>
                            )}
                          </div>
                        </div>
                        {expandedRoom === room.id && room.photos?.length > 0 && (
                          <div className="px-4 pb-4 bg-slate-50 grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {room.photos.map((ph, i) => (
                              <div key={ph.id || i} className="rounded-xl overflow-hidden aspect-square bg-slate-200">
                                <img src={ph.url} alt="" className="w-full h-full object-cover"/>
                              </div>
                            ))}
                          </div>
                        )}
                        {expandedRoom === room.id && (!room.photos || room.photos.length === 0) && (
                          <div className="px-4 pb-4 pt-1 bg-slate-50 text-xs text-slate-400">No photos uploaded for this room type yet.</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reviews */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-display font-semibold text-slate-800 text-sm">
                      Reviews
                      {prop.avg_rating > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-amber-500 text-sm font-bold">
                          <Star size={13} fill="currentColor" /> {prop.avg_rating}
                          <span className="text-slate-400 font-normal text-xs">({prop.review_count})</span>
                        </span>
                      )}
                    </h4>
                  </div>
                  {reviews.length > 0 ? (
                    <div className="space-y-3">
                      {reviews.map(rv => (
                        <div key={rv.id} className="bg-slate-50 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-800 text-xs">{rv.student_name}</span>
                            <span className="flex items-center gap-0.5 text-amber-500 text-xs">
                              {[1,2,3,4,5].map(s => <Star key={s} size={11} fill={s<=rv.rating?'currentColor':'none'} strokeWidth={1.5}/>)}
                            </span>
                            <span className="text-slate-400 text-[10px] ml-auto">{new Date(rv.created_at).toLocaleDateString('en-TZ',{month:'short',year:'numeric'})}</span>
                          </div>
                          {rv.comment && <p className="text-xs text-slate-600 leading-relaxed">{rv.comment}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No reviews yet.</p>
                  )}
                  {canReview && !reviewDone && (
                    <div className="mt-4 border border-slate-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-700 mb-2">Leave a Review</p>
                      <div className="flex gap-1 mb-2">
                        {[1,2,3,4,5].map(s => (
                          <button key={s} type="button" onClick={() => setReviewForm(f=>({...f,rating:s}))}
                            className="text-amber-400 hover:text-amber-500 transition-colors">
                            <Star size={20} fill={s<=reviewForm.rating?'currentColor':'none'} strokeWidth={1.5}/>
                          </button>
                        ))}
                      </div>
                      <textarea rows={2} value={reviewForm.comment} onChange={e=>setReviewForm(f=>({...f,comment:e.target.value}))}
                        placeholder="Share your experience (optional)…"
                        className="input w-full text-xs resize-none mb-2"/>
                      <button disabled={reviewSaving || reviewForm.rating===0}
                        onClick={async () => {
                          if (!reviewForm.rating) return;
                          setReviewSaving(true);
                          try {
                            const r = await api.post(`/properties/${prop.id}/reviews`, reviewForm);
                            setReviews(prev => [r.data, ...prev]);
                            setReviewDone(true);
                          } catch(e) {
                            if (e.response?.status === 409) { setReviewDone(true); }
                            else alert(e.response?.data?.message || 'Could not submit review.');
                          } finally { setReviewSaving(false); }
                        }}
                        className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50">
                        {reviewSaving ? 'Submitting…' : 'Submit Review'}
                      </button>
                    </div>
                  )}
                  {reviewDone && (
                    <div className="mt-3 text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={13}/> Thank you for your review!
                    </div>
                  )}
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
