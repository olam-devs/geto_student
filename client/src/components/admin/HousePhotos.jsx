import React, { useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import api from '../../api';

// House photos on the admin house page: see them, add more (camera or gallery), delete.
export default function HousePhotos({ propertyId, photos, onChange }) {
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');

  const upload = async (files) => {
    if (!files.length) return;
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('photos[]', f));
      const { data } = await api.post(`/admin/properties/${propertyId}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (!data?.uploaded) setError('No photos were saved. Use JPG or PNG pictures under 10 MB.');
      onChange?.();
    } catch (e) {
      setError(e.response?.data?.message || 'Upload failed. Check your connection and try again.');
    } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this photo?')) return;
    setError('');
    try { await api.delete(`/admin/photos/${id}`); onChange?.(); }
    catch (e) { setError(e.response?.data?.message || 'Could not delete the photo.'); }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="font-semibold text-slate-800 text-sm">House photos ({photos.length})</h4>
        <label className={`btn-sm bg-primary text-white cursor-pointer min-h-[44px] sm:min-h-[34px] focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary ${busy ? 'opacity-70' : ''}`}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}{busy ? 'Uploading…' : 'Add photos'}
          <input type="file" accept="image/*" multiple className="sr-only" disabled={busy}
            onChange={e => { upload(Array.from(e.target.files || [])); e.target.value = ''; }} />
        </label>
      </div>
      {photos.length === 0 ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          No photos yet. Houses without photos show a plain placeholder on the site and are left out of the homepage slideshow.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {photos.map(ph => (
            <div key={ph.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
              <img src={ph.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              {!!Number(ph.is_main) && (
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">Main</span>
              )}
              <button type="button" onClick={() => remove(ph.id)} aria-label="Delete photo"
                className="absolute top-1 right-1 w-9 h-9 rounded-lg bg-white/90 text-red-600 flex items-center justify-center hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}
    </section>
  );
}
