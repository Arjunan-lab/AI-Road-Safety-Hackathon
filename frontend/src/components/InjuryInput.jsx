import { useState } from 'react';

const QUICK_OPTIONS = [
  'Head injury with bleeding',
  'Broken leg / fracture',
  'Burns from vehicle fire',
  'Chest pain and difficulty breathing',
  'Unconscious victim, not responding',
  'Neck / spinal injury suspected',
];

export default function InjuryInput({ onSubmit, onStreamSubmit, isLoading, isStreaming }) {
  const [description, setDescription] = useState('');
  const [useStream, setUseStream] = useState(true); // default: streaming mode

  const busy = isLoading || isStreaming;

  const submit = (text) => {
    const trimmed = (text || description).trim();
    if (trimmed.length < 3) return;
    if (useStream && onStreamSubmit) {
      onStreamSubmit(trimmed);
    } else {
      onSubmit(trimmed);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submit();
  };

  return (
    <div className="glass-card p-5 md:p-6 animate-fade-in-up" id="injury-input">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400">
          🩺 Describe the Injury
        </h2>

        {/* Stream toggle */}
        <button
          type="button"
          onClick={() => setUseStream((v) => !v)}
          title={useStream ? 'Streaming mode (token-by-token)' : 'Standard mode (wait for full response)'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${
            useStream
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
              : 'bg-white/5 text-gray-500 border border-white/10'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${useStream ? 'bg-cyan-400 animate-pulse' : 'bg-gray-600'}`} />
          {useStream ? 'Stream' : 'Standard'}
        </button>
      </div>

      {/* Quick injury tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_OPTIONS.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setDescription(opt);
              submit(opt);
            }}
            disabled={busy}
            className="text-[11px] font-medium px-3 py-1.5 rounded-full
              bg-white/[0.05] border border-white/10 text-gray-400
              hover:bg-rose-500/15 hover:border-rose-500/30 hover:text-rose-400
              transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Custom injury input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Or type a custom injury description…"
          disabled={busy}
          className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5
            text-sm text-gray-200 placeholder-gray-600
            focus:outline-none focus:border-rose-500/40 focus:bg-white/[0.07]
            transition-all duration-200 disabled:opacity-40"
          id="injury-description-input"
        />
        <button
          type="submit"
          disabled={busy || description.trim().length < 3}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600
            text-white text-sm font-bold
            hover:from-rose-400 hover:to-rose-500
            disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed
            transition-all duration-200 flex-shrink-0"
          id="submit-triage-btn"
        >
          {busy ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Analyze'
          )}
        </button>
      </form>
    </div>
  );
}
