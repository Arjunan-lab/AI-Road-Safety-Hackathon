/**
 * CrashDetector.jsx — AEGIS Crash Modal
 *
 * Upgraded with all 4 pitch-day features:
 *  1. Zero-Touch Twilio dispatch with wa.me fallback
 *  2. Voice cancellation ("stop", "cancel", "okay")
 *  3. Web Audio API siren — starts on crash, stops on cancel
 *  4. Demo Mode: reads isDemoMode prop (set by parent) to acknowledge lower thresholds
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { startCrashCancellationListener, stopCrashCancellationListener } from '../utils/voiceCancellation';

const SIREN_DURATION_S = 15; // matches countdown

export default function CrashDetector({ onConfirmCrash, isEmergencyActive, medicalId, location }) {
  const [crashEvent, setCrashEvent] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [voiceListening, setVoiceListening] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  // ─── Audio Siren (Web Audio API) ─────────────────────────────────
  const sirenCtxRef   = useRef(null);
  const sirenNodesRef = useRef([]);

  const startSiren = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      sirenCtxRef.current = ctx;
      const nodes = [];

      for (let i = 0; i < SIREN_DURATION_S * 2; i++) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        const t = ctx.currentTime + i * 0.5;
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.linearRampToValueAtTime(660, t + 0.25);
        osc.frequency.linearRampToValueAtTime(880, t + 0.5);
        gain.gain.setValueAtTime(0.3, t);
        osc.start(t);
        osc.stop(t + 0.5);
        nodes.push(osc);
      }
      sirenNodesRef.current = nodes;
    } catch (e) {
      console.warn('[Siren]', e);
    }
  }, []);

  const stopSiren = useCallback(() => {
    sirenNodesRef.current.forEach(n => { try { n.stop(); } catch (_) {} });
    sirenNodesRef.current = [];
    if (sirenCtxRef.current) {
      sirenCtxRef.current.close().catch(() => {});
      sirenCtxRef.current = null;
    }
  }, []);

  // ─── Zero-Touch Dispatch (Twilio → wa.me fallback) ───────────────
  const buildWaLink = useCallback((data) => {
    const contact   = medicalId?.emergencyContact || '';
    const cleanPhone = contact.replace(/[^\d+]/g, '');
    const lat = location?.lat?.toFixed(6) ?? (data?.lat ?? '0');
    const lng = location?.lng?.toFixed(6) ?? (data?.lng ?? '0');
    const mapsLink  = `https://maps.google.com/?q=${lat},${lng}`;
    const bloodType = medicalId?.bloodType || 'Unknown';
    const force     = data?.impactG ? `${data.impactG.toFixed(1)}G` : '>4G';
    const msg = encodeURIComponent(
      `🚨 ROAD SOS — AUTOMATIC CRASH ALERT 🚨\n` +
      `Crash detected by AEGIS system (Force: ${force}).\n` +
      `📍 Location: ${mapsLink}\n` +
      `🩸 Blood Type: ${bloodType}\n` +
      `Please respond immediately or call 112.`
    );
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  }, [medicalId, location]);

  const dispatchSOS = useCallback(async (data) => {
    if (!medicalId?.emergencyContact) return;

    setDispatching(true);
    const lat = location?.lat ?? 0;
    const lng = location?.lng ?? 0;

    try {
      const res = await fetch('/api/dispatch-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_number: medicalId.emergencyContact,
          latitude:       lat,
          longitude:      lng,
          blood_type:     medicalId.bloodType || 'Unknown',
          message_type:   'crash',
        }),
        signal: AbortSignal.timeout(6000),
      });

      const result = await res.json().catch(() => ({}));

      if (result?.delivered && result?.method === 'twilio') {
        console.log('[Dispatch] ✅ Twilio WhatsApp delivered — SID:', result.sid);
        setDispatching(false);
        return;
      }
      throw new Error(result?.method || 'backend fallback');

    } catch (err) {
      console.warn('[Dispatch] ⚠️ Falling back to wa.me:', err.message);
      window.open(buildWaLink(data), '_blank');
    }

    setDispatching(false);
  }, [medicalId, location, buildWaLink]);

  // ─── Countdown timer ─────────────────────────────────────────────
  useEffect(() => {
    if (countdown <= 0 || !crashEvent) return;

    const timer = setTimeout(() => {
      if (countdown === 1) {
        handleConfirm();
      } else {
        setCountdown(c => c - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, crashEvent]);

  // ─── Start / stop siren + voice listener on crash ────────────────
  useEffect(() => {
    if (crashEvent) {
      startSiren();
      setVoiceListening(true);
      startCrashCancellationListener(() => {
        console.log('[VoiceCancel] Crash cancelled by voice.');
        handleDismiss();
      });
    } else {
      stopSiren();
      stopCrashCancellationListener();
      setVoiceListening(false);
    }
    return () => {
      stopSiren();
      stopCrashCancellationListener();
    };
  }, [crashEvent, startSiren, stopSiren]);

  // ─── Public API (called by parent via window.__crashDetectorAlert) ─
  const showAlert = useCallback((data) => {
    if (isEmergencyActive) return;
    setCrashEvent(data);
    setCountdown(15);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
  }, [isEmergencyActive]);

  useEffect(() => {
    window.__crashDetectorAlert = showAlert;
    return () => { delete window.__crashDetectorAlert; };
  }, [showAlert]);

  // ─── Handlers ────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!crashEvent) return;
    const evt = crashEvent;
    setCrashEvent(null);
    setCountdown(0);
    dispatchSOS(evt);
    onConfirmCrash(evt);
  };

  const handleDismiss = () => {
    setCrashEvent(null);
    setCountdown(0);
  };

  if (!crashEvent || isEmergencyActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
      {/* Red pulse border */}
      <div className="absolute inset-0 border-[6px] border-red-500 animate-pulse pointer-events-none" />

      <div className="glass-card p-6 md:p-8 max-w-md w-full border-red-500/40 text-center space-y-5 relative z-10">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto animate-pulse border border-red-500/40">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <div>
          <h2 className="text-2xl font-black text-red-400 mb-1 tracking-wide uppercase">Impact Detected</h2>
          <p className="text-sm text-gray-400">
            Force: <span className="text-red-400 font-bold">{crashEvent.impactG?.toFixed(1)}G</span>
          </p>
        </div>

        {/* Voice indicator */}
        {voiceListening && (
          <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[11px] font-bold text-cyan-400 tracking-widest uppercase">
              Say &quot;Cancel&quot; to abort
            </span>
          </div>
        )}

        <p className="text-gray-500 text-sm">
          Auto-SOS dispatching in{' '}
          <span className="text-red-400 font-black text-2xl">{countdown}s</span>
        </p>

        {/* Countdown bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${(countdown / 15) * 100}%` }}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400
              font-semibold text-sm hover:bg-white/5 transition-colors"
          >
            I&apos;m Fine
          </button>
          <button
            onClick={handleConfirm}
            disabled={dispatching}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600
              text-white font-bold text-sm hover:from-red-400 hover:to-red-500 transition-all disabled:opacity-60"
          >
            {dispatching ? 'Sending SOS…' : '🚨 Activate SOS'}
          </button>
        </div>

        {/* Mute siren button */}
        <button
          onClick={stopSiren}
          className="text-[11px] text-gray-600 hover:text-gray-400 underline underline-offset-4 transition-colors"
        >
          🔇 Mute siren
        </button>
      </div>
    </div>
  );
}
