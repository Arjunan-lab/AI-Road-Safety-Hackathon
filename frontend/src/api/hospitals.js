/**
 * Hospitals API client — fetches real nearby hospitals from the backend
 * which queries OpenStreetMap Overpass API.
 */

const API_BASE = 'https://roadsos-backend.onrender.com';

/**
 * Fetches real hospitals near the given coordinates.
 * @param {number} lat
 * @param {number} lng
 * @param {number} [radius=10000] — search radius in meters
 * @returns {Promise<{ hospitals: Array, source: string }>}
 */
export async function fetchHospitals(lat, lng, radius = 10000) {
  if (!navigator.onLine) {
    throw new Error('No network — using cached hospital data.');
  }

  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius: radius.toString(),
    });

    const response = await fetch(`${API_BASE}/hospitals?${params}`, {
      signal: AbortSignal.timeout(4000), // 4s timeout — fail fast to fallback cache
    });

    if (!response.ok) {
      throw new Error(`Server error (${response.status})`);
    }

    return await response.json();
  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      throw new Error('Hospital search timed out.');
    }
    if (err.message.includes('Failed to fetch')) {
      throw new Error('Unable to reach hospital search service.');
    }
    throw err;
  }
}
