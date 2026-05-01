import { useState, useEffect, useRef } from 'react';
import { getMedicalId, saveMedicalId } from '../utils/medicalId';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function MedicalIDModal({ isOpen, onClose }) {
  const [form, setForm] = useState({
    userName: '',
    bloodType: '',
    allergies: '',
    emergencyContact: '',
    emergencyName: '',
  });
  const [saved, setSaved] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const wallpaperRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setForm(getMedicalId());
      setSaved(false);
      setShowQR(false);
    }
  }, [isOpen]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveMedicalId(form);
    setSaved(true);
    setTimeout(() => { setSaved(false); }, 2000);
  };

  const downloadWallpaper = async () => {
    if (!wallpaperRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(wallpaperRef.current, {
        backgroundColor: '#0a0e17',
        scale: 3,       // 3× for retina sharpness
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `RoadSoS-LockScreen-${form.userName || 'ID'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Wallpaper generation failed:', err);
      alert('Could not generate image. Try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  // Generate QR URL from form state
  const qrUrl = new URL(window.location.origin);
  qrUrl.searchParams.set('bystander', '1');
  if (form.bloodType) qrUrl.searchParams.set('b', form.bloodType);
  if (form.allergies) qrUrl.searchParams.set('a', form.allergies);
  if (form.emergencyContact) qrUrl.searchParams.set('e', form.emergencyContact);
  if (form.emergencyName) qrUrl.searchParams.set('n', form.emergencyName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
      <div className="glass-card p-6 md:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center text-sm">
              🩸
            </span>
            Medical ID
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex bg-white/5 p-1 rounded-xl">
          <button
            onClick={() => setShowQR(false)}
            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${
              !showQR ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setShowQR(true)}
            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${
              showQR ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            QR Sticker
          </button>
        </div>

        {!showQR ? (
          <div className="space-y-5 animate-fade-in-up">
            <p className="text-xs text-gray-400">
              This info is stored offline on your device to assist paramedics.
            </p>

            {/* User Name */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">
                Your Full Name
              </label>
              <input
                type="text"
                value={form.userName}
                onChange={(e) => handleChange('userName', e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5
                  text-sm text-gray-200 placeholder-gray-600
                  focus:outline-none focus:border-red-500/40 transition-colors"
              />
            </div>

            {/* Blood Type */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">
                Blood Group
              </label>
              <div className="flex flex-wrap gap-2">
                {BLOOD_TYPES.map((bt) => (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => handleChange('bloodType', bt)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      form.bloodType === bt
                        ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">
                Allergies
              </label>
              <input
                type="text"
                value={form.allergies}
                onChange={(e) => handleChange('allergies', e.target.value)}
                placeholder="e.g. Penicillin, Aspirin, Peanuts"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5
                  text-sm text-gray-200 placeholder-gray-600
                  focus:outline-none focus:border-red-500/40 transition-colors"
              />
            </div>

            {/* Emergency Contact Name */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">
                Emergency Contact Name
              </label>
              <input
                type="text"
                value={form.emergencyName}
                onChange={(e) => handleChange('emergencyName', e.target.value)}
                placeholder="e.g. Mom, Dad, Spouse"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5
                  text-sm text-gray-200 placeholder-gray-600
                  focus:outline-none focus:border-red-500/40 transition-colors"
              />
            </div>

            {/* Emergency Contact Number */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">
                Emergency Contact Number
              </label>
              <input
                type="tel"
                value={form.emergencyContact}
                onChange={(e) => handleChange('emergencyContact', e.target.value)}
                placeholder="e.g. +91-9876543210"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5
                  text-sm text-gray-200 placeholder-gray-600
                  focus:outline-none focus:border-red-500/40 transition-colors"
              />
            </div>

            {/* Auto-SOS Toggle */}
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">WhatsApp Auto-SOS</span>
                <span className="text-xs text-gray-500 mt-0.5">Send GPS pin automatically on crash</span>
              </div>
              <button
                type="button"
                onClick={() => handleChange('whatsappSOS', !form.whatsappSOS)}
                className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${
                  form.whatsappSOS ? 'bg-teal-500' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    form.whatsappSOS ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                saved
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500'
              }`}
            >
              {saved ? '✓ Saved to Device' : 'Save Medical ID'}
            </button>
          </div>
        ) : (
          /* ─── LOCK-SCREEN WALLPAPER GENERATOR ─── */
          <div className="space-y-5 flex flex-col items-center animate-fade-in-up">
            <div className="text-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Lock-Screen Wallpaper</h3>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed px-2">
                Save this as your phone wallpaper. Paramedics scan the QR to access your Medical ID instantly — no unlock needed.
              </p>
            </div>

            {/* ── Wallpaper Preview Card (9:19.5 phone ratio) ── */}
            <div
              ref={wallpaperRef}
              style={{ width: 270, height: 585, background: '#0a0e17', position: 'relative', overflow: 'hidden', fontFamily: 'monospace' }}
              className="rounded-3xl border border-red-500/30 shadow-2xl shadow-red-500/20 flex-shrink-0 flex flex-col"
            >
              {/* Subtle grid bg */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              {/* Red glow orb */}
              <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 200, height: 200, background: 'radial-gradient(circle, rgba(225,29,72,0.18) 0%, transparent 70%)', borderRadius: '50%' }} />

              {/* Top label */}
              <div style={{ padding: '28px 20px 0', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e11d48' }} />
                  <span style={{ color: '#e11d48', fontSize: 9, fontWeight: 700, letterSpacing: '0.25em' }}>ROAD SOS — MEDICAL ID</span>
                </div>
                <div style={{ width: '100%', height: 1, background: 'rgba(225,29,72,0.3)' }} />
              </div>

              {/* Blood Type — BIG */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 20px', zIndex: 1 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: '0.3em', fontWeight: 700, marginBottom: 4 }}>BLOOD TYPE</div>
                  <div style={{ color: '#ffffff', fontSize: 72, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', textShadow: '0 0 30px rgba(225,29,72,0.7)' }}>
                    {form.bloodType || 'N/A'}
                  </div>
                </div>

                <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)' }} />

                {form.allergies && (
                  <div style={{ width: '100%' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, letterSpacing: '0.25em', marginBottom: 4 }}>⚠ ALLERGIES</div>
                    <div style={{ color: '#f97316', fontSize: 13, fontWeight: 600 }}>{form.allergies}</div>
                  </div>
                )}

                {form.emergencyName && (
                  <div style={{ width: '100%' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, letterSpacing: '0.25em', marginBottom: 4 }}>EMERGENCY CONTACT</div>
                    <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{form.emergencyName}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{form.emergencyContact}</div>
                  </div>
                )}
              </div>

              {/* QR Code block at bottom */}
              <div style={{ padding: '0 20px 24px', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 8 }} />
                <div style={{ background: '#fff', padding: 10, borderRadius: 12 }}>
                  <QRCodeSVG value={qrUrl.toString()} size={100} bgColor="#ffffff" fgColor="#0a0e17" level="H" includeMargin={false} />
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8, letterSpacing: '0.15em', textAlign: 'center' }}>SCAN FOR FULL MEDICAL ID</div>
                <div style={{ color: '#e11d48', fontSize: 7, letterSpacing: '0.2em', textAlign: 'center' }}>roadsos.app</div>
              </div>
            </div>

            {/* Download button */}
            <button
              onClick={downloadWallpaper}
              disabled={isDownloading}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                isDownloading
                  ? 'bg-white/10 text-gray-500 cursor-wait'
                  : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500 active:scale-[0.98]'
              }`}
            >
              {isDownloading ? (
                <><span className="animate-spin text-base">⏳</span> Generating...</>
              ) : (
                <><span>📥</span> Save as Wallpaper (PNG)</>
              )}
            </button>

            <button
              onClick={() => window.open(qrUrl.toString(), '_blank')}
              className="text-[11px] text-teal-400 hover:text-teal-300 underline underline-offset-4"
            >
              Test QR Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
