/**
 * TriageResult — Aegis Protocol AI triage output panel
 * Displays streamed tokens as they arrive, then renders final structured steps.
 * Severity color mapping:
 *   minor    → bio-green
 *   moderate → amber
 *   severe   → neon crimson
 *   critical → pulsing red + vibrate
 */
import { useEffect, useRef } from 'react';

const SEVERITY_CONFIG = {
  minor:    { label: 'MINOR',    color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  moderate: { label: 'MODERATE', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   dot: 'bg-amber-400'   },
  severe:   { label: 'SEVERE',   color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/25',    dot: 'bg-rose-400 animate-pulse' },
  critical: { label: 'CRITICAL', color: 'text-red-400',     bg: 'bg-red-500/15',     border: 'border-red-500/40',     dot: 'bg-red-400 animate-ping'   },
};

const TRIAGE_CATEGORY = {
  green:  { label: 'START: GREEN',  color: 'text-emerald-400', bg: 'bg-emerald-500/15'  },
  yellow: { label: 'START: YELLOW', color: 'text-amber-400',   bg: 'bg-amber-500/15'    },
  red:    { label: 'START: RED',    color: 'text-rose-400',    bg: 'bg-rose-500/15'     },
  black:  { label: 'START: BLACK',  color: 'text-gray-400',    bg: 'bg-gray-500/15'     },
};

const STEP_ICONS = [
  // Step 1: Circulation / Stop bleeding
  <svg key="1" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>,
  // Step 2: Airway / Keep still
  <svg key="2" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>,
  // Step 3: Call emergency
  <svg key="3" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>,
];

export default function TriageResult({ result, isLoading, isStreaming, streamedText, error }) {
  const containerRef = useRef(null);

  // Vibrate on critical severity
  useEffect(() => {
    if (result?.severity === 'critical' && navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 300]);
    }
  }, [result?.severity]);

  // Auto-scroll streaming text
  useEffect(() => {
    if (streamedText && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [streamedText]);

  if (!isLoading && !isStreaming && !result && !error) return null;

  const sevCfg = result ? (SEVERITY_CONFIG[result.severity] ?? SEVERITY_CONFIG.moderate) : null;
  const triCfg = result ? (TRIAGE_CATEGORY[result.triage_category] ?? TRIAGE_CATEGORY.yellow) : null;

  return (
    <div className="animate-fade-in-up">
      {/* ─── Loading / Streaming State ─── */}
      {(isLoading || isStreaming) && (
        <div className="glass-card p-5 border-cyan-500/20 shadow-lg shadow-cyan-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-cyan-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-cyan-400 uppercase tracking-widest">
                {isStreaming ? 'AEGIS Processing...' : 'Querying Local AI...'}
              </p>
              <p className="text-[10px] text-gray-600 font-mono">Zero-cloud • Fully offline</p>
            </div>
          </div>

          {/* Streaming token display */}
          {isStreaming && streamedText && (
            <div
              ref={containerRef}
              className="bg-black/30 rounded-lg p-3 max-h-32 overflow-y-auto font-mono text-[11px] text-cyan-300/70 leading-relaxed border border-white/5"
            >
              {streamedText}
              <span className="inline-block w-1.5 h-3 bg-cyan-400 ml-0.5 animate-pulse" />
            </div>
          )}

          {/* Skeleton placeholders */}
          {!streamedText && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-white/5 animate-pulse flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-white/5 rounded animate-pulse" style={{ width: `${70 + i * 10}%` }} />
                    <div className="h-2 bg-white/5 rounded animate-pulse" style={{ width: `${50 + i * 8}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Error State ─── */}
      {error && !isLoading && !isStreaming && (
        <div className="glass-card p-4 border-amber-500/25">
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs font-bold">AI Unavailable</p>
          </div>
          <p className="text-[11px] text-gray-500">{error}</p>
        </div>
      )}

      {/* ─── Result State ─── */}
      {result && !isLoading && !isStreaming && (
        <div className={`glass-card p-5 ${sevCfg?.border || 'border-white/10'} shadow-lg`}>
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${sevCfg?.dot}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${sevCfg?.color}`}>
                {sevCfg?.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* START triage category badge */}
              {triCfg && (
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${triCfg.color} ${triCfg.bg}`}>
                  {triCfg.label}
                </span>
              )}
              {/* Confidence bar */}
              {result.confidence != null && (
                <div className="flex items-center gap-1.5" title={`AI Confidence: ${Math.round(result.confidence * 100)}%`}>
                  <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${result.confidence >= 0.8 ? 'bg-emerald-400' : result.confidence >= 0.5 ? 'bg-amber-400' : 'bg-rose-400'}`}
                      style={{ width: `${result.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-600 font-mono">{Math.round(result.confidence * 100)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-4">
            {result.steps.map((step, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-xl animate-fade-in-up-delay-${i + 1}`}
                style={{ backgroundColor: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-[10px] ${sevCfg?.color} ${sevCfg?.bg}`}>
                  {i + 1}
                </div>
                <p className="text-sm text-gray-200 leading-snug font-medium">{step}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <p className="text-[9px] text-gray-600 leading-relaxed max-w-[70%]">{result.disclaimer}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[9px] text-gray-600 font-mono">{result.source}</span>
              {result.latency_ms > 0 && (
                <span className="text-[9px] text-gray-700 font-mono">{result.latency_ms}ms</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
