import React from 'react';
import { useSensors } from '../hooks/useSensors';

export default function SensorDashboard({ onClose }) {
  const { accelerometer, gyroscope, permissionGranted, requestAccess, error } = useSensors();

  return (
    <div className="fixed inset-0 z-[60] bg-gray-900 text-white font-mono p-6 overflow-y-auto">
      <div className="max-w-md mx-auto relative pt-8">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-0 right-0 w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
        >
          ✕
        </button>

        <h2 className="text-2xl font-black text-red-500 mb-2 uppercase tracking-tight">Telemetry</h2>
        <p className="text-xs text-gray-500 mb-8 font-sans">Live sensor feed for crash detection calibration.</p>

        {error && (
          <div className="bg-red-500/15 border border-red-500/30 p-4 rounded-xl mb-6 text-red-400 text-sm">
            <p>{error}</p>
          </div>
        )}

        {/* Permission Button Layer */}
        {!permissionGranted ? (
          <div className="flex flex-col items-center justify-center glass-card p-10 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center animate-pulse">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-gray-100">Sensor Access Required</p>
              <p className="text-xs text-gray-500 leading-relaxed font-sans">
                RoadSoS needs access to your device's motion sensors to detect severe impacts during a crash.
              </p>
            </div>
            <button 
              onClick={requestAccess}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-500/20 transition-all active:scale-95 text-sm uppercase tracking-widest"
            >
              Enable Sensors
            </button>
          </div>
        ) : (
          /* Live Data Layer */
          <div className="space-y-6 animate-fade-in-up">
            
            {/* Accelerometer Card */}
            <div className="glass-card p-6 border-blue-500/20 shadow-xl shadow-blue-500/5">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest">Accelerometer</h3>
                  <p className="text-[10px] text-gray-500 font-sans mt-0.5">Static Gravity + Movement (Gs)</p>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${accelerometer.gForce > 4.0 ? 'bg-red-600 animate-pulse' : 'bg-white/5'}`}>
                  <span className="text-xs font-black">
                    {accelerometer.gForce}G
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <p className="text-gray-500 text-[9px] uppercase font-black mb-1">X-Axis</p>
                  <p className="text-lg font-mono text-gray-100 tracking-tighter">{accelerometer.x}</p>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <p className="text-gray-500 text-[9px] uppercase font-black mb-1">Y-Axis</p>
                  <p className="text-lg font-mono text-gray-100 tracking-tighter">{accelerometer.y}</p>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <p className="text-gray-500 text-[9px] uppercase font-black mb-1">Z-Axis</p>
                  <p className="text-lg font-mono text-gray-100 tracking-tighter">{accelerometer.z}</p>
                </div>
              </div>
            </div>

            {/* Gyroscope Card */}
            <div className="glass-card p-6 border-green-500/20 shadow-xl shadow-green-500/5">
              <div className="mb-6">
                <h3 className="text-sm font-black text-green-400 uppercase tracking-widest">Gyroscope</h3>
                <p className="text-[10px] text-gray-500 font-sans mt-0.5">Rotation Rate (deg/s)</p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <p className="text-gray-500 text-[9px] uppercase font-black mb-1">Pitch</p>
                  <p className="text-lg font-mono text-gray-100 tracking-tighter">{gyroscope.beta}</p>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <p className="text-gray-500 text-[9px] uppercase font-black mb-1">Roll</p>
                  <p className="text-lg font-mono text-gray-100 tracking-tighter">{gyroscope.gamma}</p>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <p className="text-gray-500 text-[9px] uppercase font-black mb-1">Yaw</p>
                  <p className="text-lg font-mono text-gray-100 tracking-tighter">{gyroscope.alpha}</p>
                </div>
              </div>
            </div>

            {/* Hint */}
            <p className="text-[10px] text-gray-600 text-center leading-relaxed">
              Detection triggers at 4.0G. Calibration varies by device hardware.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
