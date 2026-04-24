/**
 * Geolocation utility — wraps the browser Geolocation API
 * with proper error handling for denied/unavailable scenarios.
 * Tracks speed for velocity-gated crash detection.
 */

const GEO_TIMEOUT = 10000; // 10s timeout
const GEO_MAX_AGE = 60000; // Accept 1-minute-old cached positions

// ─── Speed tracking for crash detection ──────────
let lastKnownSpeed = 0; // m/s
let speedWatchId = null;

/**
 * Returns the last known GPS speed in m/s.
 * Used by accelerometer.js for velocity-gated crash detection.
 * @returns {number} speed in m/s (0 if unknown)
 */
export function getLastKnownSpeed() {
  return lastKnownSpeed;
}

/**
 * Starts a background GPS watch to continuously track speed.
 * Should be called on app load for crash detection readiness.
 */
export function startSpeedTracking() {
  if (speedWatchId !== null) return; // Already tracking
  if (!navigator.geolocation) return;

  speedWatchId = navigator.geolocation.watchPosition(
    (position) => {
      // coords.speed is m/s, null if not available
      lastKnownSpeed = position.coords.speed ?? 0;
    },
    () => {
      // Silently ignore errors — this is best-effort background tracking
    },
    {
      enableHighAccuracy: true,
      timeout: GEO_TIMEOUT,
      maximumAge: 5000, // Refresh speed frequently
    }
  );
  console.log('[Geolocation] Speed tracking started for crash detection.');
}

/**
 * Stops background speed tracking.
 */
export function stopSpeedTracking() {
  if (speedWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(speedWatchId);
    speedWatchId = null;
    console.log('[Geolocation] Speed tracking stopped.');
  }
}

/**
 * Gets the user's current lat/lng position.
 * @returns {Promise<{ lat: number, lng: number, accuracy: number, speed: number }>}
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error('Geolocation is not supported by this browser.')
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const speed = position.coords.speed ?? 0;
        lastKnownSpeed = speed; // Update speed tracker
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(
              new Error(
                'Location permission denied. Please enable GPS in your device settings.'
              )
            );
            break;
          case error.POSITION_UNAVAILABLE:
            reject(
              new Error(
                'Location unavailable. GPS signal could not be acquired.'
              )
            );
            break;
          case error.TIMEOUT:
            reject(
              new Error('Location request timed out. Please try again.')
            );
            break;
          default:
            reject(new Error('An unknown location error occurred.'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: GEO_TIMEOUT,
        maximumAge: GEO_MAX_AGE,
      }
    );
  });
}

/**
 * Watches the user's position continuously.
 * @param {Function} onUpdate - Callback with { lat, lng, accuracy, speed }
 * @param {Function} onError - Callback with Error
 * @returns {number} watchId — pass to clearWatch() to stop
 */
export function watchPosition(onUpdate, onError) {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation is not supported by this browser.'));
    return null;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      const speed = position.coords.speed ?? 0;
      lastKnownSpeed = speed;
      onUpdate({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed,
      });
    },
    (error) => {
      onError(new Error(error.message));
    },
    {
      enableHighAccuracy: true,
      timeout: GEO_TIMEOUT,
      maximumAge: GEO_MAX_AGE,
    }
  );
}

/**
 * Stops watching position.
 * @param {number} watchId
 */
export function clearWatch(watchId) {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}
