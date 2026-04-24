import { useEffect, useState } from 'react';
import { getHospitals } from '../utils/offlineCache';

export default function HospitalList({ realHospitals, isLoadingReal, realSource }) {
  const [cachedHospitals, setCachedHospitals] = useState([]);

  useEffect(() => {
    setCachedHospitals(getHospitals());
  }, []);

  // Use real hospitals if available, otherwise fall back to cache
  const hospitals = realHospitals && realHospitals.length > 0 ? realHospitals : cachedHospitals;
  const source = realHospitals && realHospitals.length > 0 ? realSource : 'cache';

  if (hospitals.length === 0 && !isLoadingReal) return null;

  const getBadge = () => {
    if (isLoadingReal) return { text: 'Searching…', color: 'bg-blue-500/15 text-blue-400' };
    if (source === 'overpass') return { text: 'Live Data', color: 'bg-teal-500/15 text-teal-400' };
    if (source === 'fallback') return { text: 'Fallback', color: 'bg-amber-500/15 text-amber-400' };
    return { text: 'Offline Cache', color: 'bg-amber-500/15 text-amber-400' };
  };

  const badge = getBadge();

  return (
    <div className="glass-card p-5 md:p-6 animate-fade-in-up-delay-2" id="hospital-list">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400">
          Nearby Hospitals
        </h2>
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${badge.color}`}>
          {badge.text}
        </span>
      </div>

      {isLoadingReal && hospitals.length === 0 && (
        <div className="flex items-center gap-3 text-gray-400 py-3">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin" />
          <span className="text-sm">Searching for nearby hospitals…</span>
        </div>
      )}

      <ul className="space-y-3">
        {hospitals.map((h, i) => (
          <li
            key={i}
            className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-teal-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg
                className="w-4 h-4 text-teal-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-100 truncate">
                {h.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {h.distance} away{h.phone ? ` • ${h.phone}` : ''}
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className="text-[10px] font-medium text-gray-600 bg-white/5 px-2 py-0.5 rounded">
                {h.type || 'Hospital'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
