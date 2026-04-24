import { useState, useEffect } from 'react';

export default function CrashDetector({ onConfirmCrash, isEmergencyActive }) {
  const [crashEvent, setCrashEvent] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // Auto-dismiss after countdown
  useEffect(() => {
    if (countdown <= 0 || !crashEvent) return;

    const timer = setTimeout(() => {
      if (countdown === 1) {
        // Auto-confirm crash when countdown hits 0
        handleConfirm();
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, crashEvent]);

  const showAlert = (data) => {
    if (isEmergencyActive) return; // Already in emergency mode
    setCrashEvent(data);
    setCountdown(15); // 15 second countdown to cancel
  };

  const handleConfirm = () => {
    if (crashEvent) {
      onConfirmCrash(crashEvent);
      setCrashEvent(null);
      setCountdown(0);
    }
  };

  const handleDismiss = () => {
    setCrashEvent(null);
    setCountdown(0);
  };

  // Expose showAlert for parent to call
  useEffect(() => {
    window.__crashDetectorAlert = showAlert;
    return () => {
      delete window.__crashDetectorAlert;
    };
  }, [isEmergencyActive]);

  if (!crashEvent || isEmergencyActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in-up">
      <div className="glass-card p-6 md:p-8 max-w-md w-full border-red-500/30 text-center space-y-5">
        {/* Impact icon */}
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto animate-pulse">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <div>
          <h2 className="text-xl font-black text-red-400 mb-1">
            Crash Detected!
          </h2>
          <p className="text-sm text-gray-400">
            High impact of <span className="text-red-400 font-bold">{crashEvent.impactG}G</span> detected.
          </p>
        </div>

        <p className="text-gray-500 text-sm">
          Emergency SOS will auto-activate in{' '}
          <span className="text-red-400 font-black text-lg">{countdown}s</span>
        </p>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
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
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600
              text-white font-bold text-sm hover:from-red-400 hover:to-red-500 transition-all"
          >
            🚨 Activate SOS
          </button>
        </div>
      </div>
    </div>
  );
}
