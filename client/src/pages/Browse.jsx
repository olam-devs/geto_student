import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, CheckCircle2, Building2 } from 'lucide-react';
import api from '../api';
import PropertyCard from '../components/PropertyCard';
import PropertyModal from '../components/PropertyModal';

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [universities, setUnis]  = useState([]);
  const [properties, setProps]   = useState([]);
  const [loading, setLoading]    = useState(true);
  const [selectedProp, setSelectedProp] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState({
    q:              searchParams.get('q')             || '',
    university_id:  searchParams.get('university_id') || '',
    room_type:      searchParams.get('room_type')     || '',
    price_max:      searchParams.get('price_max')     || '',
    verified_only:  searchParams.get('verified_only') || '',
    area:           searchParams.get('area')          || '',
  });

  // Sync URL params → filter state when navbar search navigates here
  useEffect(() => {
    setFilters(prev => {
      const next = {
        q:             searchParams.get('q')             || '',
        university_id: searchParams.get('university_id') || '',
        room_type:     searchParams.get('room_type')     || '',
        price_max:     searchParams.get('price_max')     || '',
        verified_only: searchParams.get('verified_only') || '',
        area:          searchParams.get('area')          || '',
      };
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [searchParams]);

  useEffect(() => { api.get('/universities').then(r => setUnis(r.data)).catch(() => {}); }, []);

  const fetchProperties = useCallback(() => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v));
    api.get('/properties', { params })
      .then(r => { setProps(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const clearFilters = () => setFilters({ q:'', university_id:'', room_type:'', price_max:'', verified_only:'', area:'' });
  const activeCount = Object.values(filters).filter(Boolean).length;

  const roomTypes = ['Single','Shared','Double','Master','Bedsitter','Studio'];
  const priceOptions = [
    { label: 'Under TZS 150,000', value: '150000' },
    { label: 'Under TZS 250,000', value: '250000' },
    { label: 'Under TZS 350,000', value: '350000' },
    { label: 'Under TZS 500,000', value: '500000' },
  ];

  const FilterPanel = () => (
    <div className="space-y-5">
      <div>
        <label className="label">University</label>
        <select value={filters.university_id} onChange={e => setFilter('university_id', e.target.value)} className="input">
          <option value="">All Universities</option>
          {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Room Type</label>
        <select value={filters.room_type} onChange={e => setFilter('room_type', e.target.value)} className="input">
          <option value="">Any Room Type</option>
          {roomTypes.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Max Price (TZS/month)</label>
        <select value={filters.price_max} onChange={e => setFilter('price_max', e.target.value)} className="input">
          <option value="">Any Price</option>
          {priceOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Area</label>
        <input type="text" value={filters.area} onChange={e => setFilter('area', e.target.value)}
          placeholder="e.g. Ubungo, Ilala…" className="input" />
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <div className="relative">
          <input type="checkbox" checked={filters.verified_only === 'true'} onChange={e => setFilter('verified_only', e.target.checked ? 'true' : '')} className="sr-only" />
          <div className={`w-10 h-5 rounded-full transition-colors ${filters.verified_only === 'true' ? 'bg-verified' : 'bg-slate-300'}`}/>
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${filters.verified_only === 'true' ? 'translate-x-5' : ''}`}/>
        </div>
        <span className="text-sm font-medium text-slate-700">Verified only <span className="badge-verified text-[10px] ml-1"><CheckCircle2 size={9}/> Geto Verified</span></span>
      </label>
      {activeCount > 0 && (
        <button onClick={clearFilters} className="btn-ghost w-full justify-center text-slate-500 border border-slate-200">
          <X size={14}/> Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Slim page header */}
      <div className="border-b border-slate-200 bg-white px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <h1 className="font-display font-bold text-lg text-slate-900">Student Accommodation</h1>
          <button onClick={() => setFiltersOpen(v => !v)}
            className={`md:hidden inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors border ${filtersOpen ? 'bg-accent-600 text-white border-accent-600' : 'bg-white text-slate-700 border-slate-200'}`}>
            <SlidersHorizontal size={15}/>
            Filters {activeCount > 0 && <span className="bg-accent-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center ml-0.5">{activeCount}</span>}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="card p-5 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-900 text-sm">Filters</h3>
                {activeCount > 0 && <span className="bg-accent-600 text-white text-xs px-2 py-0.5 rounded-full">{activeCount}</span>}
              </div>
              <FilterPanel />
            </div>
          </aside>

          {/* Mobile filters */}
          {filtersOpen && (
            <div className="md:hidden fixed inset-0 z-40 flex">
              <div className="absolute inset-0 bg-black/50" onClick={() => setFiltersOpen(false)}/>
              <div className="relative ml-auto w-80 bg-white h-full overflow-y-auto p-5 shadow-2xl">
                <div className="flex justify-between mb-5">
                  <h3 className="font-display font-bold text-slate-900">Filters</h3>
                  <button onClick={() => setFiltersOpen(false)}><X size={18}/></button>
                </div>
                <FilterPanel />
                <button onClick={() => setFiltersOpen(false)} className="btn-primary w-full justify-center mt-5">
                  Show {properties.length} results
                </button>
              </div>
            </div>
          )}

          {/* Main grid */}
          <div className="flex-1 min-w-0">
            {/* Result count */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-slate-500">
                {loading ? 'Loading…' : <><strong className="text-slate-800">{properties.length}</strong> {properties.length === 1 ? 'property' : 'properties'} found</>}
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="card overflow-hidden">
                    <div className="skeleton h-48"/>
                    <div className="p-4 space-y-2">
                      <div className="skeleton h-3 w-24 rounded"/>
                      <div className="skeleton h-5 w-3/4 rounded"/>
                      <div className="skeleton h-3 w-1/2 rounded"/>
                    </div>
                  </div>
                ))}
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4"><Building2 size={28} className="text-slate-400"/></div>
                <h3 className="font-display font-bold text-slate-800 text-xl mb-2">No properties found</h3>
                <p className="text-slate-500 text-sm mb-5">Try adjusting your filters or search term.</p>
                <button onClick={clearFilters} className="btn-outline">Clear filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {properties.map(p => (
                  <PropertyCard key={p.id} property={p} onClick={() => setSelectedProp(p.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedProp && <PropertyModal propertyId={selectedProp} onClose={() => setSelectedProp(null)} />}
    </div>
  );
}
