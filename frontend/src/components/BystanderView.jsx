import { useState } from 'react';
import MedicalIDCard from './MedicalIDCard';
import InjuryInput from './InjuryInput';
import TriageResult from './TriageResult';
import { fetchTriage } from '../api/triage';

export default function BystanderView() {
  const [triageResult, setTriageResult] = useState(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageError, setTriageError] = useState(null);

  const searchParams = new URLSearchParams(window.location.search);
  
  const medicalId = {
    bloodType: searchParams.get('b') || '',
    allergies: searchParams.get('a') || '',
    emergencyContact: searchParams.get('e') || '',
    emergencyName: searchParams.get('n') || '',
  };

  const handleTriageSubmit = async (description) => {
    setTriageLoading(true);
    setTriageError(null);
    setTriageResult(null);
    try {
      const result = await fetchTriage(description);
      setTriageResult(result);
    } catch (err) {
      setTriageError(err.message);
    } finally {
      setTriageLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col p-4 md:p-8 space-y-6 max-w-2xl mx-auto animate-fade-in-up">
      <div className="text-center space-y-2 mt-4 md:mt-8 mb-4">
        <h1 className="text-2xl font-black text-red-500 uppercase tracking-widest">
          Emergency Info
        </h1>
        <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
          You are viewing the victim's critical medical information via their Good Samaritan QR code.
        </p>
      </div>
      
      {/* ─── Medical ID Profile ─── */}
      <MedicalIDCard medicalId={medicalId} />

      {/* ─── Emergency Call Action ─── */}
      <div className="flex flex-col gap-3">
        <a 
          href="tel:112"
          className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-500 text-white p-4 rounded-xl font-bold transition-colors"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          CALL 112 (AMBULANCE)
        </a>
      </div>

      {/* ─── AI Triage ─── */}
      <div className="border-t border-white/10 pt-8 mt-4">
        <div className="text-center mb-6">
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-widest">AI First-Aid Guide</h2>
          <p className="text-xs text-gray-500 mt-1">Select the victim's injuries to get immediate steps.</p>
        </div>
        
        <div className="space-y-6">
          <InjuryInput onSubmit={handleTriageSubmit} isLoading={triageLoading} />
          <TriageResult result={triageResult} isLoading={triageLoading} error={triageError} />
        </div>
      </div>
      
    </div>
  );
}
