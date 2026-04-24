import { useState, useEffect, useRef } from 'react';

const GOLDEN_HOUR = 60 * 60; // 60 minutes in seconds

export default function GoldenHourTimer({ isActive, onTimeUpdate }) {
  const [timeLeft, setTimeLeft] = useState(GOLDEN_HOUR);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (onTimeUpdate) onTimeUpdate(next);
          if (next <= 0) {
            clearInterval(intervalRef.current);
            return 0;
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = (timeLeft / GOLDEN_HOUR) * 100;

  const getUrgencyClass = () => {
    if (timeLeft > 2400) return 'timer-safe'; // > 40 min
    if (timeLeft > 900) return 'timer-warning'; // > 15 min
    return 'timer-critical'; // < 15 min
  };

  const getProgressColor = () => {
    if (timeLeft > 2400) return '#00d4aa';
    if (timeLeft > 900) return '#ff9500';
    return '#ff2d55';
  };

  const getStatusMessage = () => {
    if (timeLeft > 2400) return 'Time remaining — stay calm';
    if (timeLeft > 900) return 'Hurry — help is needed soon';
    if (timeLeft > 0) return '⚠️ CRITICAL — act immediately';
    return '🚨 Golden Hour expired';
  };

  if (!isActive) return null;

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className="glass-card p-6 md:p-8 flex flex-col items-center gap-4 w-full max-w-sm animate-fade-in-up"
      id="golden-hour-timer"
    >
      <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
        Golden Hour Countdown
      </h2>

      <div className="relative w-40 h-40 md:w-48 md:h-48 flex items-center justify-center">
        {/* SVG circular progress ring */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 128 128"
        >
          {/* Background track */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
          />
          {/* Progress arc */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={getProgressColor()}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
            style={{
              filter: `drop-shadow(0 0 8px ${getProgressColor()}50)`,
            }}
          />
        </svg>

        {/* Digital readout */}
        <div className="text-center z-10">
          <span
            className={`text-4xl md:text-5xl font-black tabular-nums ${getUrgencyClass()}`}
          >
            {String(minutes).padStart(2, '0')}
          </span>
          <span
            className={`text-4xl md:text-5xl font-black ${getUrgencyClass()} animate-pulse`}
          >
            :
          </span>
          <span
            className={`text-4xl md:text-5xl font-black tabular-nums ${getUrgencyClass()}`}
          >
            {String(seconds).padStart(2, '0')}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-500 font-medium text-center">
        {getStatusMessage()}
      </p>
    </div>
  );
}
