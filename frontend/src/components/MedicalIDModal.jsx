import { useState, useEffect } from 'react';
import { getMedicalId, saveMedicalId } from '../utils/medicalId';
import { QRCodeSVG } from 'qrcode.react';

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
  const [showQR, setShowQR] = useState(false); // Toggle for Good Samaritan QR Generator

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
    setTimeout(() => {
      setSaved(false);
    }, 2000);
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
          <div className="space-y-6 flex flex-col items-center justify-center animate-fade-in-up py-4">
            <div className="text-center space-y-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Good Samaritan Sticker</h3>
              <p className="text-xs text-gray-400 leading-relaxed px-4">
                Print this QR code and place it on your helmet or vehicle. If you're unconscious, bystanders can scan it to instantly view your Medical ID and get AI first-aid.
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-3xl shadow-xl shadow-white/5">
              <QRCodeSVG 
                value={qrUrl.toString()} 
                size={200}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"H"}
                includeMargin={false}
              />
            </div>
            
            <button
              onClick={() => window.open(qrUrl.toString(), '_blank')}
              className="text-xs font-semibold text-teal-400 hover:text-teal-300 underline underline-offset-4"
            >
              Test QR Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
