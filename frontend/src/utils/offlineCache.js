/**
 * Offline cache utility — manages localStorage-based hospital data
 * for use when the network is unavailable.
 */

const HOSPITAL_KEY = 'roadsos_hospitals';

const DEFAULT_HOSPITALS = [
  {
    name: 'City General Hospital',
    distance: '2.3 km',
    phone: '+91-1234-567890',
    lat: 13.0827,
    lng: 80.2707,
    type: 'Government',
  },
  {
    name: 'Apollo Emergency Care',
    distance: '4.1 km',
    phone: '+91-9876-543210',
    lat: 13.0604,
    lng: 80.2496,
    type: 'Private',
  },
  {
    name: 'St. Thomas Trauma Center',
    distance: '5.7 km',
    phone: '+91-4455-667788',
    lat: 13.0475,
    lng: 80.209,
    type: 'Private',
  },
];

/**
 * Seeds hospital data into localStorage if not already present.
 */
export function seedHospitals() {
  try {
    const existing = localStorage.getItem(HOSPITAL_KEY);
    if (!existing) {
      localStorage.setItem(HOSPITAL_KEY, JSON.stringify(DEFAULT_HOSPITALS));
      console.log('[OfflineCache] Seeded default hospital data.');
    }
  } catch (err) {
    console.error('[OfflineCache] Failed to seed hospitals:', err.message);
  }
}

/**
 * Retrieves cached hospitals from localStorage.
 * @returns {Array} list of hospital objects
 */
export function getHospitals() {
  try {
    const data = localStorage.getItem(HOSPITAL_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('[OfflineCache] Failed to read hospitals:', err.message);
    return [];
  }
}

/**
 * Updates hospital cache with fresh data.
 * @param {Array} hospitals
 */
export function updateHospitals(hospitals) {
  try {
    localStorage.setItem(HOSPITAL_KEY, JSON.stringify(hospitals));
    console.log('[OfflineCache] Updated hospital cache.');
  } catch (err) {
    console.error('[OfflineCache] Failed to update hospitals:', err.message);
  }
}

/**
 * Clears the hospital cache.
 */
export function clearHospitals() {
  try {
    localStorage.removeItem(HOSPITAL_KEY);
  } catch (err) {
    console.error('[OfflineCache] Failed to clear hospitals:', err.message);
  }
}
