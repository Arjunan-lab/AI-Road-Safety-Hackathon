export default function MedicalIDCard({ medicalId }) {
  if (!medicalId || (!medicalId.bloodType && !medicalId.allergies && !medicalId.emergencyContact)) {
    return (
      <div className="glass-card p-5 animate-fade-in-up border-white/5 opacity-60">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 flex items-center gap-2">
            <span>🩸</span> Medical ID
          </h2>
          <span className="text-[10px] uppercase font-bold text-gray-600 bg-white/5 px-2 py-0.5 rounded">
            Not Configured
          </span>
        </div>
        <p className="text-xs text-gray-500">Configure your Medical ID using the settings icon in the top right to assist paramedics.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 md:p-6 animate-fade-in-up border-red-500/20" id="medical-id-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 flex items-center gap-2">
          <span>🩸</span> Medical ID
        </h2>
        <span className="text-[10px] font-semibold uppercase tracking-wider bg-red-500/15 text-red-400 px-2.5 py-1 rounded-full">
          For Paramedics
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Blood Type */}
        {medicalId.bloodType && (
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">
              Blood Group
            </p>
            <p className="text-2xl font-black text-red-400">
              {medicalId.bloodType}
            </p>
          </div>
        )}

        {/* Allergies */}
        {medicalId.allergies && (
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">
              Allergies
            </p>
            <p className="text-sm font-semibold text-amber-400">
              ⚠️ {medicalId.allergies}
            </p>
          </div>
        )}

        {/* Emergency Contact */}
        {medicalId.emergencyContact && (
          <div className="col-span-2 p-3 rounded-xl bg-white/[0.03] flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">
                Emergency Contact
              </p>
              <p className="text-sm font-semibold text-gray-200">
                {medicalId.emergencyName || 'Contact'}: {medicalId.emergencyContact}
              </p>
            </div>
            <a
              href={`tel:${medicalId.emergencyContact}`}
              className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center
                text-teal-400 hover:bg-teal-500/25 transition-colors flex-shrink-0"
              aria-label="Call emergency contact"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
