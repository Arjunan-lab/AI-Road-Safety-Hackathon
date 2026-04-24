export default function ActionTray({ location, medicalId }) {
  const contact = medicalId?.emergencyContact;

  if (!contact) {
    return (
      <div className="glass-card w-full p-4 flex items-center justify-center border-white/5 opacity-60">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Emergency Contact Not Configured
        </p>
      </div>
    );
  }

  // Common Payload Generation
  const lat = location?.lat?.toFixed(6) ?? '0';
  const lng = location?.lng?.toFixed(6) ?? '0';
  const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
  const unencodedMessage = `🚨 EMERGENCY! I have been in a road accident and need help!\n\n📍 My location: ${mapsLink}\n\nPlease send help immediately or call 112.`;
  const encodedMessage = encodeURIComponent(unencodedMessage);

  // Deep Links
  const telUri = `tel:${contact}`;
  // Ensure the phone number works with wa.me by removing non-numeric chars (except +)
  const cleanPhone = contact.replace(/[^\d+]/g, '');
  const waUri = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  const smsUri = `sms:${contact}?body=${encodedMessage}`;

  return (
    <div className="flex flex-col gap-3 animate-fade-in-up">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">
        Emergency Dispatch
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. One-Tap Emergency Dial */}
        <a
          href={telUri}
          className="glass-card p-3 flex items-center gap-3 hover:border-red-500/30 transition-all duration-200 group col-span-1 sm:col-span-2"
        >
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-red-500/25 transition-colors">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-gray-100">
              One-Tap Call
            </p>
            <p className="text-[11px] text-gray-500">
              Dial {medicalId.emergencyName || 'Contact'} instantly
            </p>
          </div>
        </a>

        {/* 2. WhatsApp Dispatch */}
        <a
          href={waUri}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-card p-3 flex items-center gap-3 hover:border-green-500/30 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/25 transition-colors">
            <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-gray-100">
              WhatsApp
            </p>
            <p className="text-[11px] text-gray-500">
              Msg + GPS Link
            </p>
          </div>
        </a>

        {/* 3. Original SMS Dispatch */}
        <a
          href={smsUri}
          className="glass-card p-3 flex items-center gap-3 hover:border-teal-500/30 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-500/25 transition-colors">
            <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-gray-100">
              Native SMS
            </p>
            <p className="text-[11px] text-gray-500">
              Msg + GPS Link
            </p>
          </div>
        </a>
      </div>
    </div>
  );
}
