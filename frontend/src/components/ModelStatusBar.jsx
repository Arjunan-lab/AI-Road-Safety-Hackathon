/**
 * ModelStatusBar — Aegis Protocol AI engine status panel
 * Shows: active model, Ollama online status, available models, hot-swap controls
 */
import { useState, useEffect, useCallback } from 'react';
import { fetchModelStatus, switchModel } from '../api/triage';

export default function ModelStatusBar() {
  const [status, setStatus] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [switchMsg, setSwitchMsg] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const poll = useCallback(async () => {
    const data = await fetchModelStatus();
    setStatus(data);
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 30_000); // poll every 30s
    return () => clearInterval(id);
  }, [poll]);

  const handleSwitch = async (model) => {
    setSwitching(true);
    setSwitchMsg(null);
    const result = await switchModel(model);
    if (result?.success) {
      setSwitchMsg(`✅ Switched to ${result.active_model}`);
      await poll();
    } else {
      setSwitchMsg('❌ Switch failed. Check Ollama.');
    }
    setSwitching(false);
    setTimeout(() => setSwitchMsg(null), 4000);
  };

  const isOnline = status?.ollama_online;

  return (
    <div className="glass-card border-white/5 overflow-hidden">
      {/* Collapsed header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {/* AEGIS icon */}
          <div className="w-6 h-6 rounded-md bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AEGIS AI Engine</p>
            {status ? (
              <p className="text-[9px] font-mono text-gray-600">
                {status.active_model}
                {status.vram_estimate_gb && ` · ~${status.vram_estimate_gb}GB VRAM`}
              </p>
            ) : (
              <p className="text-[9px] text-gray-700">Checking...</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Online / Offline pill */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
            isOnline ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`} />
            {status ? (isOnline ? 'Online' : 'Offline') : '...'}
          </div>
          {/* Chevron */}
          <svg className={`w-3.5 h-3.5 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3 animate-fade-in-up">
          {/* Ollama version */}
          {status?.ollama_version && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">Daemon</span>
              <span className="text-[9px] font-mono text-gray-500">v{status.ollama_version}</span>
            </div>
          )}

          {/* Switch message */}
          {switchMsg && (
            <p className="text-[10px] text-center font-mono text-cyan-400">{switchMsg}</p>
          )}

          {/* Available models list */}
          {status?.available_models?.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600">Available Models</p>
              <div className="grid gap-1.5">
                {status.available_models.map((model) => (
                  <button
                    key={model}
                    onClick={() => handleSwitch(model)}
                    disabled={switching || model === status.active_model}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-[10px] font-mono transition-all ${
                      model === status.active_model
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 cursor-default'
                        : 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06] hover:text-gray-300 border border-white/5'
                    }`}
                  >
                    <span>{model}</span>
                    {model === status.active_model ? (
                      <span className="text-[9px] font-bold text-cyan-400">ACTIVE</span>
                    ) : switching ? (
                      <span className="text-[9px] text-gray-600">...</span>
                    ) : (
                      <span className="text-[9px] text-gray-600">SWITCH →</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : status && !isOnline ? (
            <div className="text-center py-3">
              <p className="text-[10px] text-rose-400 font-bold">Ollama Not Running</p>
              <p className="text-[9px] text-gray-600 mt-1">Start with: <code className="font-mono bg-white/5 px-1 rounded">ollama serve</code></p>
            </div>
          ) : (
            <p className="text-[10px] text-gray-600">No models found. Pull one with <code className="font-mono">ollama pull llama3</code></p>
          )}
        </div>
      )}
    </div>
  );
}
