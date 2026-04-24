/**
 * Medical ID utility — manages user medical profile in localStorage.
 * Stores blood type, allergies, and emergency contact for paramedics.
 */

const MEDICAL_ID_KEY = 'roadsos_medical_id';

const DEFAULT_MEDICAL_ID = {
  bloodType: '',
  allergies: '',
  emergencyContact: '',
  emergencyName: '',
  whatsappSOS: true,
};

/**
 * Retrieves the stored Medical ID.
 * @returns {{ bloodType: string, allergies: string, emergencyContact: string, emergencyName: string }}
 */
export function getMedicalId() {
  try {
    const data = localStorage.getItem(MEDICAL_ID_KEY);
    return data ? { ...DEFAULT_MEDICAL_ID, ...JSON.parse(data) } : { ...DEFAULT_MEDICAL_ID };
  } catch {
    return { ...DEFAULT_MEDICAL_ID };
  }
}

/**
 * Saves the Medical ID to localStorage.
 * @param {{ bloodType: string, allergies: string, emergencyContact: string, emergencyName: string }} data
 */
export function saveMedicalId(data) {
  try {
    localStorage.setItem(MEDICAL_ID_KEY, JSON.stringify(data));
    console.log('[MedicalID] Saved medical profile.');
  } catch (err) {
    console.error('[MedicalID] Failed to save:', err.message);
  }
}

/**
 * Checks if a Medical ID has been configured (at least blood type set).
 * @returns {boolean}
 */
export function hasMedicalId() {
  const data = getMedicalId();
  return !!(data.bloodType || data.allergies || data.emergencyContact);
}
