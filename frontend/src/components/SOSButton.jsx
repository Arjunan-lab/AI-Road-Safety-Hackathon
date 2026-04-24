import { useState } from 'react';

export default function SOSButton({ onActivate, isActive }) {
  const [pressing, setPressing] = useState(false);

  const handleClick = () => {
    if (!isActive) {
      onActivate();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-5">
      <div className="relative flex items-center justify-center">
        {/* Animated expanding rings */}
        {!isActive && (
          <>
            <div className="absolute w-44 h-44 md:w-52 md:h-52 rounded-full bg-red-500/20 animate-sos-ring" />
            <div
              className="absolute w-44 h-44 md:w-52 md:h-52 rounded-full bg-red-500/10 animate-sos-ring"
              style={{ animationDelay: '0.5s' }}
            />
          </>
        )}

        <button
          onClick={handleClick}
          onPointerDown={() => setPressing(true)}
          onPointerUp={() => setPressing(false)}
          onPointerLeave={() => setPressing(false)}
          disabled={isActive}
          className={`
            relative z-10 w-44 h-44 md:w-52 md:h-52
            rounded-full font-black text-5xl md:text-6xl
            tracking-[0.15em] text-white
            transition-all duration-200 select-none
            focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/50
            ${
              isActive
                ? 'bg-gradient-to-br from-gray-600 to-gray-700 cursor-not-allowed opacity-60'
                : `bg-gradient-to-br from-red-500 to-red-700 animate-sos-pulse cursor-pointer
                   hover:from-red-400 hover:to-red-600 hover:scale-105
                   active:scale-95 shadow-2xl shadow-red-500/30`
            }
            ${pressing && !isActive ? 'scale-95' : ''}
          `}
          aria-label="Emergency SOS Button"
          id="sos-button"
        >
          SOS
        </button>
      </div>

      <p
        className={`text-sm font-semibold tracking-widest uppercase ${
          isActive ? 'text-gray-500' : 'text-red-400/80 animate-pulse'
        }`}
      >
        {isActive ? '🔴 Emergency Active' : 'Tap for Emergency'}
      </p>
    </div>
  );
}
