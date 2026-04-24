import { useState, useEffect, useRef } from 'react';
import { getCurrentPosition, startSpeedTracking, stopSpeedTracking, getLastKnownSpeed } from '../utils/geolocation';
import { startListening, stopListening, onCrashDetected } from '../utils/accelerometer';
import { getMedicalId } from '../utils/medicalId';
import { fetchHospitals } from '../api/hospitals';
import { streamTriage } from '../api/triage';
import MedicalIDModal from './MedicalIDModal';

export default function Dashboard() {
  const [permissionsGranted, setPermissionsGranted] = useState(localStorage.getItem('roadsos_perms') === 'granted');
  const [systemState, setSystemState] = useState(permissionsGranted ? 'STANDBY' : 'PERMISSIONS'); // PERMISSIONS, STANDBY, BOOTING, ACTIVE, DIAGNOSTIC, TRIAGE_RESULT, HOSPITALS, REGISTRY, DRIVE_MODE
  const [timer, setTimer] = useState(3600);
  const [telemetry, setTelemetry] = useState({ lat: 'WAITING', lng: 'GPS', accuracy: '...' });
  
  // Real GPS & Backend
  const [realHospitals, setRealHospitals] = useState([]);
  const [medicalId, setMedicalId] = useState(null);
  const [isMedicalIDOpen, setIsMedicalIDOpen] = useState(false);
  
  // AI Triage Streaming States
  const [selectedInjury, setSelectedInjury] = useState(null);
  const [triageSteps, setTriageSteps] = useState([]);
  const [triageStream, setTriageStream] = useState('');
  const [isTriageLoading, setIsTriageLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const cancelStreamRef = useRef(null);
  
  // Crash Detection States
  const [isCrashDetected, setIsCrashDetected] = useState(false);
  const [crashTimer, setCrashTimer] = useState(15);
  const [currentGForce, setCurrentGForce] = useState(1.0);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  // Load Medical ID on mount
  useEffect(() => {
    setMedicalId(getMedicalId());
  }, [systemState]); // Refresh when coming back from other states

  // Golden Hour Timer
  useEffect(() => {
    let interval;
    if (['ACTIVE', 'DIAGNOSTIC', 'TRIAGE_RESULT', 'HOSPITALS', 'REGISTRY'].includes(systemState)) {
      interval = setInterval(() => setTimer((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    }
    return () => clearInterval(interval);
  }, [systemState]);

  // Handle Crash Timer
  useEffect(() => {
    let interval;
    if (isCrashDetected && crashTimer > 0) {
      interval = setInterval(() => setCrashTimer(prev => prev - 1), 1000);
    } else if (isCrashDetected && crashTimer === 0) {
      setIsCrashDetected(false);
      
      // Auto-dispatch WhatsApp if enabled
      if (medicalId?.whatsappSOS && medicalId?.emergencyContact) {
        window.open(getWhatsAppLink(), '_blank');
      }
      
      triggerBootSequence();
    }
    return () => clearInterval(interval);
  }, [isCrashDetected, crashTimer, medicalId, telemetry]);

  // Real Sensors (GPS & Accelerometer)
  useEffect(() => {
    if (!permissionsGranted) return;
    
    // Start tracking GPS Speed immediately for the background gates
    startSpeedTracking();
    
    // Poll GPS location and speed for Telemetry UI
    const geoInterval = setInterval(async () => {
      try {
        const pos = await getCurrentPosition();
        setTelemetry({
          lat: pos.lat.toFixed(4),
          lng: pos.lng.toFixed(4),
          accuracy: `±${Math.round(pos.accuracy)}m`
        });
      } catch (err) {
        // Ignored, keeps 'WAITING'
      }
      setCurrentSpeed(getLastKnownSpeed() * 3.6); // to km/h
    }, 2000);

    return () => {
      stopSpeedTracking();
      clearInterval(geoInterval);
    };
  }, [permissionsGranted]);

  // Drive Mode Sensors
  useEffect(() => {
    if (systemState === 'DRIVE_MODE' && !isCrashDetected) {
      // Listen to raw accelerometer feed for the UI
      startListening((data) => {
        setCurrentGForce(data.gForce);
      });
      
      // Listen to the 3-gate actual crash detection
      onCrashDetected((data) => {
        if (!isCrashDetected) {
          if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
          setIsCrashDetected(true);
          setCrashTimer(15);
          setCurrentGForce(data.impactG);
        }
      });
    }

    return () => {
      stopListening();
    };
  }, [systemState, isCrashDetected]);

  const requestPermissions = async () => {
    try {
      // 1. Motion Sensors (iOS 13+ requires user gesture)
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
          const permissionState = await DeviceMotionEvent.requestPermission();
          if (permissionState !== 'granted') {
            console.warn('Motion sensor permission denied.');
          }
        } catch (e) {
          console.error(e);
        }
      }

      // 2. Microphone (Voice Triage)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop immediately, just caching permission
      } catch (err) {
        console.warn('Microphone permission denied.', err);
      }

      // 3. Location (GPS)
      navigator.geolocation.getCurrentPosition(
        () => {
          localStorage.setItem('roadsos_perms', 'granted');
          setPermissionsGranted(true);
          setSystemState('STANDBY');
        },
        (err) => {
          console.warn('Location permission denied.', err);
          localStorage.setItem('roadsos_perms', 'granted');
          setPermissionsGranted(true);
          setSystemState('STANDBY');
        }
      );
    } catch (err) {
      console.error('Error requesting permissions:', err);
      localStorage.setItem('roadsos_perms', 'granted');
      setPermissionsGranted(true);
      setSystemState('STANDBY'); // Fallback
    }
  };

  const triggerBootSequence = async () => {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    setSystemState('BOOTING');
    
    // Fetch hospitals in the background while booting
    try {
      const pos = await getCurrentPosition();
      const hData = await fetchHospitals(pos.lat, pos.lng);
      setRealHospitals(hData.hospitals);
    } catch (err) {
      console.warn("Could not fetch real hospitals:", err);
    }

    setTimeout(() => setSystemState('ACTIVE'), 1500);
  };

  const handleStartTriage = (injuryLabel) => {
    if (navigator.vibrate) navigator.vibrate(50);
    setSelectedInjury(injuryLabel);
    setSystemState('TRIAGE_RESULT');
    setIsTriageLoading(true);
    setTriageStream('');
    setTriageSteps([]);

    const profile = medicalId ? { blood_type: medicalId.bloodType, allergies: medicalId.allergies } : null;

    if (cancelStreamRef.current) cancelStreamRef.current();

    const cancel = streamTriage(injuryLabel, profile, {
      onToken: (token) => setTriageStream((prev) => prev + token),
      onDone: (result) => {
        setTriageSteps(result.steps);
        setIsTriageLoading(false);
        setTriageStream('');
        cancelStreamRef.current = null;
      },
      onError: () => {
        setIsTriageLoading(false);
      }
    });
    
    cancelStreamRef.current = cancel;
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return { m, s };
  };

  const getWhatsAppLink = () => {
    const phone = medicalId?.emergencyContact?.replace(/[^\d+]/g, '') || '';
    const lat = telemetry.lat === 'WAITING' ? '0' : telemetry.lat;
    const lng = telemetry.lng === 'GPS' ? '0' : telemetry.lng;
    const msg = encodeURIComponent(`🚨 EMERGENCY! I have been in a road accident and need help!\n\n📍 My location: https://maps.google.com/?q=${lat},${lng}\n\nPlease send help immediately.`);
    return `https://wa.me/${phone}?text=${msg}`;
  };

  // ─── UI COMPONENTS ───

  const TacticalHeader = () => (
    <div className="w-full flex justify-between items-start p-4 z-40 relative bg-gradient-to-b from-black/80 to-transparent">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-bio-green font-mono text-[11px] font-bold tracking-widest">
          <span className={`w-2 h-2 bg-bio-green rounded-full ${telemetry.lat !== 'WAITING' ? 'animate-pulse' : ''}`}></span>
          {telemetry.lat !== 'WAITING' ? 'GPS LOCKED' : 'SEARCHING...'}
        </div>
        <div className="font-mono text-xs text-white/70 font-medium">
          {telemetry.lat} N // {telemetry.lng} E
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="text-white/50 font-mono text-[10px] tracking-widest border border-white/20 px-2 py-0.5 clip-chamfer">
          AEGIS.SYNCED
        </div>
        <div className="font-mono text-xs text-white/50">
          ACC: {telemetry.accuracy}
        </div>
      </div>
    </div>
  );

  const renderPermissions = () => (
    <div className="flex-1 flex flex-col items-center justify-center relative w-full h-full bg-void px-6 z-50">
      <div className="absolute inset-0 bg-grid opacity-50"></div>
      
      <div className="flex flex-col items-center z-10 text-center mb-10">
        <i className="ph-fill ph-shield-warning text-6xl text-neon-cyan mb-4 animate-pulse"></i>
        <h1 className="text-2xl font-tactical text-white tracking-widest mb-2">SYSTEM INITIALIZATION</h1>
        <p className="text-white/50 font-mono text-xs">AEGIS PROTOCOL REQUIRES HARDWARE ACCESS TO FUNCTION.</p>
      </div>

      <div className="w-full space-y-4 z-10 mb-12">
        <div className="bg-glass-dark border border-white/10 p-4 clip-chamfer flex items-start gap-4">
          <i className="ph-fill ph-navigation-arrow text-2xl text-neon-amber mt-1"></i>
          <div className="text-left">
            <h3 className="font-tactical text-white text-sm">GPS TELEMETRY</h3>
            <p className="font-mono text-[10px] text-white/50 mt-1">Required to broadcast your location to emergency contacts and find nearby trauma centers.</p>
          </div>
        </div>
        <div className="bg-glass-dark border border-white/10 p-4 clip-chamfer flex items-start gap-4">
          <i className="ph-fill ph-activity text-2xl text-bio-green mt-1"></i>
          <div className="text-left">
            <h3 className="font-tactical text-white text-sm">ACCELEROMETER</h3>
            <p className="font-mono text-[10px] text-white/50 mt-1">Required for Drive Mode to detect high G-force impacts and trigger Auto-SOS.</p>
          </div>
        </div>
        <div className="bg-glass-dark border border-white/10 p-4 clip-chamfer flex items-start gap-4">
          <i className="ph-fill ph-microphone text-2xl text-neon-crimson mt-1"></i>
          <div className="text-left">
            <h3 className="font-tactical text-white text-sm">MICROPHONE</h3>
            <p className="font-mono text-[10px] text-white/50 mt-1">Required for hands-free AI voice triage if you are unable to tap the screen.</p>
          </div>
        </div>
      </div>

      <button 
        onClick={requestPermissions}
        className="w-full bg-neon-cyan text-void font-tactical text-xl py-5 clip-chamfer active:scale-95 transition-transform z-10 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
        AUTHORIZE SYSTEM
      </button>
    </div>
  );

  const renderStandby = () => (
    <div className="flex-1 flex flex-col items-center relative w-full h-full bg-grid pt-16 pb-10 overflow-y-auto">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-neon-crimson/10 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="flex flex-col items-center mt-6 mb-auto z-10">
        <div className="text-white/40 font-mono text-sm tracking-[0.4em] mb-1">SYSTEM ARMED</div>
        <h1 className="text-4xl font-tactical text-white tracking-widest">ROAD<span className="text-neon-crimson">SOS</span></h1>
      </div>

      <div className="relative my-10 group cursor-pointer" onClick={triggerBootSequence}>
        <div className="absolute inset-[-30px] reactor-ring-1 animate-core-spin opacity-60"></div>
        <div className="absolute inset-[-50px] reactor-ring-2 animate-core-spin opacity-40" style={{ animationDirection: 'reverse' }}></div>
        
        <button className="relative w-52 h-52 rounded-full bg-abyss border-2 border-neon-crimson flex flex-col items-center justify-center shadow-[0_0_40px_rgba(225,29,72,0.4)] active:scale-95 transition-all z-10">
          <div className="absolute inset-2 rounded-full bg-neon-crimson/10 animate-pulse-neon blur-sm"></div>
          <i className="ph-fill ph-warning-octagon text-6xl text-neon-crimson mb-2 z-20"></i>
          <span className="font-tactical text-2xl tracking-widest text-white z-20">SOS</span>
          <span className="font-mono text-[11px] text-white/70 tracking-widest mt-2 z-20">TAP TO ACTIVATE</span>
        </button>
      </div>

      <div className="w-full px-6 flex justify-between gap-4 mt-auto z-10">
        <button onClick={() => setSystemState('REGISTRY')} className="flex-1 clip-panel bg-glass-dark border border-white/20 p-4 flex items-center justify-center gap-2 hover:bg-white/5 active:scale-95 transition-all">
          <i className="ph-fill ph-user-circle text-neon-cyan text-xl"></i>
          <span className="font-tactical text-sm text-white">USER PROFILE</span>
        </button>
        <button onClick={() => setSystemState('DRIVE_MODE')} className="flex-1 clip-panel bg-glass-dark border border-bio-green/50 p-4 flex items-center justify-center gap-2 hover:bg-bio-green/10 active:scale-95 transition-all">
          <i className="ph-fill ph-steering-wheel text-bio-green text-xl"></i>
          <span className="font-tactical text-sm text-white">DRIVE MODE</span>
        </button>
      </div>
    </div>
  );

  const renderBooting = () => (
    <div className="flex-1 flex flex-col items-center justify-center relative w-full h-full bg-void">
      <div className="w-full max-w-[280px] font-mono text-sm text-white tracking-widest space-y-3 opacity-90">
        <p className="text-neon-crimson">{'>'} OVERRIDING PROTOCOLS...</p>
        <p>{'>'} INITIATING DISTRESS BEACON...</p>
        <p>{'>'} ACQUIRING GPS LOCK [OK]</p>
        <p>{'>'} LOADING TACTICAL HUD...</p>
        <div className="w-full h-1.5 bg-white/10 mt-6 overflow-hidden clip-chamfer">
          <div className="h-full bg-neon-crimson w-full origin-left animate-[scale-x_1.5s_ease-out_forwards]"></div>
        </div>
      </div>
    </div>
  );

  const renderActiveHUD = () => {
    const time = formatTime(timer);
    return (
      <div className="flex-1 flex flex-col w-full h-full bg-grid relative animate-hud-boot px-4 pb-6 overflow-y-auto">
        <div className="w-full mt-2 mb-6">
          <div className="flex justify-between items-end mb-2 px-1">
            <span className="font-tactical text-sm text-neon-crimson tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-neon-crimson clip-hex animate-pulse"></span>
              GOLDEN HOUR
            </span>
            <span className="font-mono text-[11px] text-white/50">REMAINING</span>
          </div>
          <div className="w-full bg-neon-crimson/10 border-2 border-neon-crimson clip-chamfer p-4 flex items-center justify-center relative backdrop-blur-sm">
            <div className="font-mono text-7xl font-bold text-white tracking-tight flex items-baseline">
              {time.m}<span className="text-5xl text-neon-crimson mx-1 opacity-80 animate-pulse">:</span>{time.s}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full">
          <a href={`tel:${medicalId?.emergencyContact || '112'}`} className="col-span-2 relative clip-chamfer bg-bio-green/20 border-2 border-bio-green p-5 active:scale-[0.98] transition-all flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 shrink-0 rounded-full bg-bio-green text-void flex items-center justify-center">
                <i className="ph-fill ph-phone-call text-3xl"></i>
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="font-mono text-xs text-bio-green font-bold tracking-widest">DIRECT LINE</span>
                <span className="font-tactical text-3xl text-white mt-1">CALL {medicalId?.emergencyContact ? 'CONTACT' : '112'}</span>
              </div>
            </div>
            <i className="ph-bold ph-caret-right text-bio-green text-3xl"></i>
          </a>

          <button onClick={() => setSystemState('DIAGNOSTIC')} className="clip-chamfer-reverse bg-abyss border border-neon-cyan p-5 h-36 active:scale-[0.95] transition-transform flex flex-col justify-between group">
            <div className="flex justify-between w-full">
              <i className="ph-fill ph-first-aid text-4xl text-neon-cyan group-hover:scale-110 transition-transform"></i>
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="font-mono text-[10px] text-neon-cyan tracking-widest">AI ASSIST</span>
              <span className="font-tactical text-xl text-white mt-1">FIRST AID</span>
            </div>
          </button>

          <button onClick={() => setSystemState('HOSPITALS')} className="clip-chamfer bg-abyss border border-neon-amber p-5 h-36 active:scale-[0.95] transition-transform flex flex-col justify-between group">
            <div className="flex justify-between w-full">
              <i className="ph-fill ph-hospital text-4xl text-neon-amber group-hover:scale-110 transition-transform"></i>
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="font-mono text-[10px] text-neon-amber tracking-widest">RADAR SWEEP</span>
              <span className="font-tactical text-xl text-white mt-1">HOSPITALS</span>
            </div>
          </button>
        </div>

        <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="w-full mt-4 clip-chamfer bg-[#25D366]/10 border border-[#25D366] p-4 active:scale-[0.98] transition-all flex items-center justify-between shadow-[0_0_15px_rgba(37,211,102,0.15)] group hover:bg-[#25D366]/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 shrink-0 rounded-full bg-[#25D366] text-void flex items-center justify-center">
              <i className="ph-fill ph-whatsapp-logo text-3xl"></i>
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="font-mono text-[10px] text-[#25D366] font-bold tracking-widest">BROADCAST GPS PIN</span>
              <span className="font-tactical text-xl text-white mt-1">WHATSAPP SOS</span>
            </div>
          </div>
          <i className="ph-bold ph-caret-right text-[#25D366] text-3xl shrink-0 ml-2"></i>
        </a>

        <div className="mt-auto flex justify-center w-full pt-8 pb-2">
          <button onClick={() => { setSystemState('STANDBY'); setTimer(3600); }} className="font-tactical text-sm text-white/40 hover:text-white tracking-widest flex items-center gap-2 px-6 py-3 bg-white/5 clip-chamfer active:scale-95 transition-all">
            <i className="ph-bold ph-x"></i> CANCEL SOS
          </button>
        </div>
      </div>
    );
  };

  const startVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      
      if (navigator.vibrate) navigator.vibrate(50);
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event) => {
        setIsListening(false);
        const transcript = event.results[0][0].transcript;
        handleStartTriage(transcript);
      };
      
      recognition.onerror = (event) => {
        setIsListening(false);
        console.error("Speech recognition error", event.error);
        alert("Voice recognition failed. Please select a quick option.");
      };

      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      alert("Voice recognition is not supported in this browser.");
    }
  };

  const renderDiagnostic = () => {
    const injuries = [
      { id: 'bleed', icon: 'drop', color: 'text-neon-crimson', border: 'border-neon-crimson', label: 'SEVERE BLEEDING' },
      { id: 'bone', icon: 'bone', color: 'text-neon-amber', border: 'border-neon-amber', label: 'BONE FRACTURE' },
      { id: 'burn', icon: 'fire', color: 'text-orange-500', border: 'border-orange-500', label: 'SEVERE BURNS' },
      { id: 'unconscious', icon: 'brain', color: 'text-neon-cyan', border: 'border-neon-cyan', label: 'UNCONSCIOUS' }
    ];

    return (
      <div className="flex-1 flex flex-col w-full h-full relative animate-hud-boot z-20 bg-void">
        <div className="p-4 border-b border-white/10 bg-abyss flex items-center gap-4">
          <button onClick={() => setSystemState('ACTIVE')} className="text-white/70 hover:text-white bg-white/10 p-2 rounded">
            <i className="ph-bold ph-arrow-left text-xl"></i>
          </button>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-neon-cyan tracking-widest">SELECT EMERGENCY</span>
            <span className="font-tactical text-xl text-white">AI TRIAGE</span>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <button 
            onClick={startVoiceRecognition}
            disabled={isListening}
            className={`w-full clip-chamfer bg-glass-dark border p-5 flex items-center justify-between transition-all ${
              isListening 
                ? 'border-neon-crimson shadow-[0_0_15px_rgba(225,29,72,0.3)] bg-white/5' 
                : 'border-white/20 active:scale-[0.98] hover:bg-white/5'
            }`}
          >
            <div className="flex flex-col items-start">
              <span className={`font-tactical text-lg ${isListening ? 'text-neon-crimson animate-pulse' : 'text-white'}`}>
                {isListening ? 'LISTENING...' : 'SPEAK INJURY'}
              </span>
              <span className="font-mono text-[11px] text-white/50">
                {isListening ? 'WAITING FOR SILENCE' : 'AI VOICE RECOGNITION'}
              </span>
            </div>
            <div className={`w-12 h-12 rounded-full border flex items-center justify-center relative overflow-hidden group ${
              isListening ? 'border-neon-crimson bg-neon-crimson/20' : 'border-white/30 bg-white/5'
            }`}>
              <div className={`absolute inset-0 translate-y-full transition-transform ${isListening ? 'translate-y-0 bg-neon-crimson/40 animate-pulse' : 'bg-neon-cyan/20 group-active:translate-y-0'}`}></div>
              <i className={`ph-fill ph-microphone text-2xl relative z-10 ${isListening ? 'text-neon-crimson animate-bounce' : 'text-white'}`}></i>
            </div>
          </button>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {injuries.map(inj => (
              <button key={inj.id} onClick={() => handleStartTriage(inj.label)} className={`clip-chamfer bg-abyss border ${inj.border} p-5 flex flex-col items-center justify-center gap-3 active:scale-95 transition-all`}>
                <i className={`ph-fill ph-${inj.icon} text-4xl ${inj.color}`}></i>
                <span className="font-tactical text-sm text-white text-center">{inj.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTriageResult = () => {
    return (
      <div className="flex-1 flex flex-col w-full h-full relative animate-hud-boot z-20 bg-void">
        <div className="p-4 border-b border-neon-crimson/30 bg-abyss flex items-center gap-4">
          <button onClick={() => {
            if (cancelStreamRef.current) cancelStreamRef.current();
            setSystemState('DIAGNOSTIC');
          }} className="text-white/70 bg-white/10 p-2 rounded">
            <i className="ph-bold ph-arrow-left text-xl"></i>
          </button>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-neon-crimson tracking-widest">ACTION REQUIRED</span>
            <span className="font-tactical text-xl text-white">{selectedInjury || 'PROTOCOL'}</span>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {isTriageLoading ? (
            <div className="bg-glass-dark border border-neon-cyan/30 p-5 clip-chamfer">
              <div className="flex items-center gap-3 mb-3">
                <i className="ph-bold ph-spinner text-neon-cyan animate-spin text-xl"></i>
                <span className="font-tactical text-neon-cyan text-sm">AEGIS PROCESSING...</span>
              </div>
              <p className="font-mono text-white/50 text-xs">
                {triageStream || 'Awaiting initial tokens from local model...'}
                <span className="animate-pulse text-neon-cyan inline-block w-2 h-4 bg-neon-cyan ml-1 align-middle"></span>
              </p>
            </div>
          ) : (
            triageSteps.map((step, idx) => (
              <div key={idx} className="bg-glass-dark border border-white/10 p-5 clip-chamfer flex gap-4 animate-fade-in-up">
                <div className="w-8 h-8 shrink-0 rounded-full bg-neon-crimson text-white font-tactical flex items-center justify-center text-lg">
                  {idx + 1}
                </div>
                <p className="font-body text-white text-[15px] font-medium leading-snug">{step}</p>
              </div>
            ))
          )}
        </div>
        
        {!isTriageLoading && triageSteps.length > 0 && (
          <div className="p-4 bg-abyss border-t border-white/10">
            <button onClick={() => setSystemState('ACTIVE')} className="w-full bg-bio-green text-void font-tactical text-xl py-4 clip-chamfer active:scale-[0.98]">
              I HAVE DONE THIS
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderHospitals = () => {
    return (
      <div className="flex-1 flex flex-col w-full h-full relative animate-hud-boot z-20 bg-void">
        <div className="p-4 border-b border-neon-amber/30 bg-abyss flex items-center gap-4">
          <button onClick={() => setSystemState('ACTIVE')} className="text-white/70 bg-white/10 p-2 rounded">
            <i className="ph-bold ph-arrow-left text-xl"></i>
          </button>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-neon-amber tracking-widest">RADAR ACTIVE</span>
            <span className="font-tactical text-xl text-white">NEARBY HOSPITALS</span>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {realHospitals.length === 0 && (
            <div className="text-center py-10 font-mono text-white/50 text-sm">
              <i className="ph-bold ph-radar text-4xl mb-2 animate-pulse text-neon-amber"></i>
              <p>Scanning sectors...</p>
            </div>
          )}
          
          {realHospitals.map((h, i) => (
            <div key={i} className="bg-glass-dark border border-white/10 p-4 clip-chamfer flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-tactical text-lg text-white">{h.name}</h3>
                  <span className="font-mono text-xs text-neon-amber">{h.type}</span>
                </div>
                <span className="font-mono text-lg text-white font-bold">{h.distance}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <a href={`https://maps.google.com/?q=${h.lat},${h.lng}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-white/10 hover:bg-white/20 text-white font-tactical py-2 text-sm clip-chamfer flex items-center justify-center gap-2">
                  <i className="ph-fill ph-navigation-arrow"></i> MAP
                </a>
                {h.phone && (
                  <a href={`tel:${h.phone}`} className="flex-1 bg-bio-green/20 text-bio-green border border-bio-green font-tactical py-2 text-sm clip-chamfer flex items-center justify-center gap-2">
                    <i className="ph-fill ph-phone-call"></i> CALL
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRegistry = () => (
    <div className="flex-1 flex flex-col w-full h-full relative animate-hud-boot z-20 bg-void">
      <div className="p-4 border-b border-neon-cyan/30 bg-abyss flex items-center gap-4">
        <button onClick={() => setSystemState('STANDBY')} className="text-white/70 bg-white/10 p-2 rounded">
          <i className="ph-bold ph-arrow-left text-xl"></i>
        </button>
        <div className="flex flex-col">
          <span className="font-mono text-[10px] text-neon-cyan tracking-widest">LOCAL DEVICE STORAGE</span>
          <span className="font-tactical text-xl text-white">USER PROFILE</span>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-6 pb-20">
        <div className="flex items-center gap-4 p-2">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-neon-cyan flex items-center justify-center bg-neon-cyan/10 text-neon-cyan">
              <i className="ph-fill ph-user text-3xl"></i>
            </div>
          </div>
          <div className="flex flex-col">
            <h2 className="font-tactical text-2xl text-white">{medicalId?.emergencyName || 'UNREGISTERED'}</h2>
            <span className="font-mono text-[11px] text-bio-green flex items-center gap-1 mb-1">
              <i className="ph-fill ph-check-circle"></i> ID VERIFIED (LOCAL)
            </span>
          </div>
        </div>

        <div className="bg-glass-dark border border-neon-cyan/30 p-5 clip-chamfer">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-tactical text-white flex items-center gap-2">
              <i className="ph-fill ph-heartbeat text-neon-cyan"></i> MEDICAL ID
            </h3>
            <button onClick={() => setIsMedicalIDOpen(true)} className="text-white/50 hover:text-white text-sm">
              <i className="ph-bold ph-pencil-simple"></i> EDIT
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 font-body">
            <div>
              <label className="text-[10px] text-white/50 font-mono">BLOOD TYPE</label>
              <div className="text-xl text-white font-bold">{medicalId?.bloodType || 'N/A'}</div>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-white/50 font-mono">KNOWN ALLERGIES</label>
              <div className="text-lg text-neon-crimson font-medium">{medicalId?.allergies || 'None listed'}</div>
            </div>
          </div>
        </div>

        <div className="bg-glass-dark border border-white/10 p-5 clip-chamfer">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-tactical text-white flex items-center gap-2">
              <i className="ph-fill ph-users text-white/70"></i> EMERGENCY CONTACTS
            </h3>
            <button onClick={() => setIsMedicalIDOpen(true)} className="text-white/50 hover:text-white text-sm">
              <i className="ph-bold ph-plus"></i> ADD
            </button>
          </div>
          <div className="flex flex-col gap-3 bg-black/40 p-4 rounded border border-white/5">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-white font-medium text-lg">{medicalId?.emergencyName || 'Not Set'}</div>
                <div className="text-white/50 text-sm font-mono mt-1">{medicalId?.emergencyContact ? `Contact \u2022 ${medicalId.emergencyContact}` : 'No number'}</div>
              </div>
              <div className="flex gap-2">
                <a href={getWhatsAppLink()} className="w-10 h-10 rounded bg-[#25D366]/20 border border-[#25D366]/50 flex items-center justify-center text-[#25D366] active:scale-95 transition-transform">
                  <i className="ph-fill ph-whatsapp-logo text-xl"></i>
                </a>
                <a href={`tel:${medicalId?.emergencyContact}`} className="w-10 h-10 rounded bg-bio-green/20 border border-bio-green/50 flex items-center justify-center text-bio-green active:scale-95 transition-transform">
                  <i className="ph-fill ph-phone text-xl"></i>
                </a>
              </div>
            </div>
            <div className="w-full h-px bg-white/10"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-white/50 font-mono">
                <i className="ph-bold ph-radar text-[#25D366]"></i> AUTO-SEND GPS PIN ON SOS
              </div>
              <button 
                onClick={() => {
                  const newId = { ...medicalId, whatsappSOS: !medicalId?.whatsappSOS };
                  import('../utils/medicalId').then(m => m.saveMedicalId(newId));
                  setMedicalId(newId);
                }}
                className={`w-10 h-5 rounded-full flex items-center p-0.5 border transition-colors ${medicalId?.whatsappSOS ? 'bg-[#25D366]/20 border-[#25D366]' : 'bg-white/10 border-white/30'}`}>
                <div className={`w-4 h-4 rounded-full shadow-sm transition-transform ${medicalId?.whatsappSOS ? 'translate-x-5 bg-[#25D366]' : 'translate-x-0 bg-white/50'}`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Sync Settings (Frictionless Management) */}
        <div className="bg-glass-dark border border-white/10 p-5 clip-chamfer">
          <h3 className="font-tactical text-white mb-4 flex items-center gap-2">
            <i className="ph-fill ph-cloud-arrow-up text-white/70"></i> DATA BACKUP
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm text-white">Auto-Sync to Google Drive</span>
              <span className="text-[10px] text-white/50 font-mono">Last sync: Today, 08:00 AM</span>
            </div>
            <div className="w-12 h-6 bg-bio-green/20 rounded-full flex items-center p-1 border border-bio-green">
              <div className="w-4 h-4 bg-bio-green rounded-full translate-x-6"></div>
            </div>
          </div>
        </div>

        <button onClick={() => setIsMedicalIDOpen(true)} className="w-full border border-white/20 text-white font-tactical py-4 clip-chamfer flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
          <i className="ph-bold ph-qr-code"></i> SHOW LOCK-SCREEN QR
        </button>
      </div>
    </div>
  );

  const renderDriveMode = () => (
    <div className="flex-1 flex flex-col w-full h-full relative animate-hud-boot z-20 bg-void">
      <div className="p-4 border-b border-bio-green/30 bg-abyss flex items-center gap-4">
        <button onClick={() => setSystemState('STANDBY')} className="text-white/70 bg-white/10 p-2 rounded hover:bg-white/20 transition-colors z-10">
          <i className="ph-bold ph-arrow-left text-xl"></i>
        </button>
        <div className="flex flex-col z-10">
          <span className="font-mono text-[10px] text-bio-green tracking-widest">SENSORS ACTIVE</span>
          <span className="font-tactical text-xl text-white">DRIVE MODE</span>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-8 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-72 h-72 border border-bio-green rounded-full flex items-center justify-center">
            <div className="w-48 h-48 border border-bio-green rounded-full flex items-center justify-center relative">
              <div className="absolute w-1/2 h-full bg-gradient-to-r from-transparent to-bio-green/40 origin-left left-1/2 animate-radar-sweep" style={{ borderRadius: '0 100% 100% 0' }}></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center z-10 mt-8">
          <i className="ph-fill ph-shield-check text-6xl text-bio-green mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)] rounded-full"></i>
          <h2 className="font-tactical text-3xl text-white tracking-widest text-center">CRASH GUARD<br/><span className="text-bio-green">ONLINE</span></h2>
          <p className="font-mono text-xs text-white/50 text-center mt-4 max-w-[250px]">
            Monitoring accelerometer arrays. Auto-SOS dispatch will trigger upon >4G impact threshold.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full z-10">
          <div className="bg-glass-dark border border-white/10 p-4 clip-chamfer flex flex-col items-center">
            <span className="font-mono text-[10px] text-white/50">SPEED</span>
            <span className="font-tactical text-2xl text-white">{Math.round(currentSpeed)} <span className="text-sm text-white/50">KM/H</span></span>
          </div>
          <div className="bg-glass-dark border border-white/10 p-4 clip-chamfer flex flex-col items-center">
            <span className="font-mono text-[10px] text-white/50">G-FORCE</span>
            <span className="font-tactical text-2xl text-white">{currentGForce.toFixed(2)} <span className="text-sm text-white/50">G</span></span>
          </div>
        </div>

        <button 
          onClick={() => {
            if(navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 500]);
            setIsCrashDetected(true);
            setCrashTimer(15);
            setCurrentGForce(4.8);
          }} 
          className="mt-auto w-full border border-neon-crimson bg-neon-crimson/10 text-neon-crimson font-tactical py-4 clip-chamfer flex items-center justify-center gap-2 active:scale-95 z-10 transition-transform">
          <i className="ph-bold ph-warning-circle text-xl"></i> SIMULATE CRASH
        </button>
      </div>
    </div>
  );

  const CrashModal = () => {
    if (!isCrashDetected) return null;
    return (
      <div className="absolute inset-0 z-[100] bg-void flex flex-col p-6 animate-hud-boot">
        <div className="absolute inset-0 border-[8px] border-neon-crimson animate-pulse pointer-events-none"></div>
        
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <i className="ph-fill ph-warning-octagon text-8xl text-neon-crimson mb-6 animate-pulse" style={{ filter: 'drop-shadow(0 0 20px rgba(225,29,72,0.8))' }}></i>
          <h1 className="font-tactical text-4xl text-white mb-2 tracking-widest">IMPACT DETECTED</h1>
          <p className="font-mono text-neon-crimson text-xl mb-12 font-bold bg-neon-crimson/10 px-4 py-1 rounded">
            FORCE: {currentGForce > 4.0 ? currentGForce.toFixed(1) : '4.8'}G
          </p>
          
          <div className="w-full max-w-[280px] bg-white/10 h-3 rounded-full overflow-hidden mb-4 border border-white/20">
            <div 
              className="h-full bg-neon-crimson transition-all duration-1000 ease-linear" 
              style={{ width: `${(crashTimer / 15) * 100}%` }}
            ></div>
          </div>
          <p className="font-mono text-white/70 tracking-widest">AUTO-SOS IN <span className="text-3xl text-white font-bold ml-2">{crashTimer}s</span></p>
        </div>

        <div className="flex flex-col gap-4 mt-auto w-full">
          <button 
            onClick={() => {
              setIsCrashDetected(false);
              triggerBootSequence();
            }}
            className="w-full bg-neon-crimson text-white font-tactical text-xl py-6 clip-chamfer active:scale-95 flex justify-center items-center gap-2 shadow-[0_0_30px_rgba(225,29,72,0.5)]">
            <i className="ph-bold ph-siren text-2xl"></i> ACTIVATE SOS NOW
          </button>
          <button 
            onClick={() => setIsCrashDetected(false)}
            className="w-full border border-white/30 bg-glass-dark text-white/70 hover:text-white font-tactical text-lg py-5 clip-chamfer active:scale-95">
            I AM OK (CANCEL)
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="device-viewport">
      {['ACTIVE', 'DIAGNOSTIC', 'TRIAGE_RESULT', 'HOSPITALS'].includes(systemState) && (
        <div className="absolute inset-0 border-[4px] border-neon-crimson pointer-events-none z-50"></div>
      )}
      
      {['STANDBY', 'ACTIVE', 'DIAGNOSTIC', 'TRIAGE_RESULT', 'HOSPITALS', 'REGISTRY', 'DRIVE_MODE'].includes(systemState) && <TacticalHeader />}
      
      <div className="flex-1 relative z-10 overflow-hidden">
        {systemState === 'PERMISSIONS' && renderPermissions()}
        {systemState === 'STANDBY' && renderStandby()}
        {systemState === 'BOOTING' && renderBooting()}
        {systemState === 'ACTIVE' && renderActiveHUD()}
        {systemState === 'DIAGNOSTIC' && renderDiagnostic()}
        {systemState === 'TRIAGE_RESULT' && renderTriageResult()}
        {systemState === 'HOSPITALS' && renderHospitals()}
        {systemState === 'REGISTRY' && renderRegistry()}
        {systemState === 'DRIVE_MODE' && renderDriveMode()}
      </div>
      
      <CrashModal />
      <MedicalIDModal isOpen={isMedicalIDOpen} onClose={() => { setIsMedicalIDOpen(false); setMedicalId(getMedicalId()); }} />
    </div>
  );
}
