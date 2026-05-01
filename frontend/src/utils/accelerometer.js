/**
 * Accelerometer utility — listens for device motion events.
 * 3-gate crash detection pipeline:
 *   Gate 1: Velocity Gate — GPS speed must be ≥ 15 km/h
 *   Gate 2: G-Force Threshold — impact must exceed 4G
 *   Gate 3: Silence Check — 10s post-spike stillness verification
 *
 * DEMO MODE: Tap logo 5× to unlock. Lowers gates for stage presentation.
 */

import { getLastKnownSpeed } from './geolocation';

// ─── Internal state ──────────────────────────────
let motionCallback = null;
let crashCallback = null;
let crashCooldown = false;
let silenceCheckTimer = null;
let postSpikeReadings = [];

// ─── Demo Mode ───────────────────────────────────
let _demoMode = false;
export function setDemoMode(active) {
  _demoMode = active;
  console.log(`[Accelerometer] Demo Mode ${active ? '🔴 ACTIVE — gates lowered for stage demo' : '🟢 DEACTIVATED — production gates restored'}`);
}
export function getDemoMode() { return _demoMode; }

// ─── Configuration ───────────────────────────────
const CRASH_THRESHOLD_G = 4.0;         // G-forces for crash — production
const MIN_SPEED_MS = 4.17;             // 15 km/h in m/s — production velocity gate
const DEMO_CRASH_THRESHOLD_G = 2.5;   // Demo mode: triggers from palm slam
const DEMO_MIN_SPEED_MS = 0;           // Demo mode: no speed required
const CRASH_COOLDOWN_MS = 10000;       // 10s cooldown between alerts
const SILENCE_CHECK_MS = 10000;        // 10s post-spike stillness window
const SILENCE_MAX_G = 1.5;             // Max G during silence (normal = ~1G)
const GRAVITY = 9.81;

// Rolling buffer
const BUFFER_SIZE = 5;
const gForceBuffer = [];

function calculateGForce(x, y, z) {
  return Math.sqrt(x * x + y * y + z * z) / GRAVITY;
}

function handleMotionEvent(event) {
  const { accelerationIncludingGravity, rotationRate, interval } = event;

  const accel = {
    x: accelerationIncludingGravity?.x ?? 0,
    y: accelerationIncludingGravity?.y ?? 0,
    z: accelerationIncludingGravity?.z ?? 0,
  };

  const gForce = calculateGForce(accel.x, accel.y, accel.z);

  // Rolling buffer
  gForceBuffer.push(gForce);
  if (gForceBuffer.length > BUFFER_SIZE) {
    gForceBuffer.shift();
  }

  const data = {
    acceleration: accel,
    rotationRate: {
      alpha: rotationRate?.alpha ?? 0,
      beta: rotationRate?.beta ?? 0,
      gamma: rotationRate?.gamma ?? 0,
    },
    gForce: Math.round(gForce * 100) / 100,
    interval: interval ?? 0,
    timestamp: Date.now(),
  };

  // Regular motion callback
  if (motionCallback) {
    motionCallback(data);
  }

  // ─── If in silence-check phase, collect readings ───
  if (silenceCheckTimer !== null) {
    postSpikeReadings.push(gForce);
    return; // Don't process new crashes during silence check
  }

  // ─── 3-Gate Crash Detection Pipeline ───────────────
  if (crashCallback && !crashCooldown) {
    const impactG = Math.abs(gForce - 1.0);

    // Select active thresholds based on demo mode
    const activeMinSpeed = _demoMode ? DEMO_MIN_SPEED_MS : MIN_SPEED_MS;
    const activeCrashG = _demoMode ? DEMO_CRASH_THRESHOLD_G : CRASH_THRESHOLD_G;

    // GATE 1: Velocity Gate
    const speed = getLastKnownSpeed();
    if (speed < activeMinSpeed) {
      if (impactG >= activeCrashG) {
        console.log(
          `[Accelerometer] Spike filtered: ${impactG.toFixed(1)}G at ${(speed * 3.6).toFixed(0)} km/h (below ${(activeMinSpeed * 3.6).toFixed(0)} km/h threshold)`
        );
      }
      return;
    }

    // GATE 2: G-Force Threshold
    if (impactG < activeCrashG) {
      return; // Below crash threshold
    }

    // GATE 3: Silence Check — wait 2s, then verify stillness
    console.log(
      `[Accelerometer] Impact detected: ${impactG.toFixed(1)}G at ${(speed * 3.6).toFixed(0)} km/h — starting silence check...`
    );

    postSpikeReadings = [];
    silenceCheckTimer = setTimeout(() => {
      // Analyze post-spike readings: crash victims stay still, phone drops bounce
      const avgPostG = postSpikeReadings.length > 0
        ? postSpikeReadings.reduce((a, b) => a + b, 0) / postSpikeReadings.length
        : 1.0;

      silenceCheckTimer = null;
      postSpikeReadings = [];

      if (avgPostG <= SILENCE_MAX_G) {
        // ✅ All 3 gates passed — CRASH CONFIRMED
        console.log(
          `[Accelerometer] ✅ CRASH CONFIRMED: ${impactG.toFixed(1)}G impact, post-silence avg ${avgPostG.toFixed(2)}G`
        );

        crashCooldown = true;
        crashCallback({
          detected: true,
          gForce: Math.round((impactG + 1) * 100) / 100,
          impactG: Math.round(impactG * 100) / 100,
          speed: Math.round(speed * 3.6), // km/h for display
          timestamp: Date.now(),
        });

        setTimeout(() => { crashCooldown = false; }, CRASH_COOLDOWN_MS);
      } else {
        console.log(
          `[Accelerometer] ❌ False positive filtered: post-silence avg ${avgPostG.toFixed(2)}G (device still moving — likely a drop)`
        );
      }
    }, SILENCE_CHECK_MS);
  }
}

/**
 * Starts listening for accelerometer (devicemotion) events.
 * @param {Function} callback — receives { acceleration, rotationRate, gForce, interval, timestamp }
 */
export function startListening(callback) {
  if (typeof window === 'undefined') return;

  motionCallback = callback;
  window.addEventListener('devicemotion', handleMotionEvent, true);
  console.log('[Accelerometer] Listening for device motion events.');
}

/**
 * Registers a crash detection callback.
 * Uses 3-gate pipeline: Velocity → G-Force → Silence Check.
 * @param {Function} callback — receives { detected, gForce, impactG, speed, timestamp }
 */
export function onCrashDetected(callback) {
  crashCallback = callback;
  console.log(
    `[Accelerometer] Crash detection active — 3-gate pipeline: speed ≥ ${(MIN_SPEED_MS * 3.6).toFixed(0)} km/h → impact ≥ ${CRASH_THRESHOLD_G}G → ${SILENCE_CHECK_MS}ms silence check`
  );
}

/**
 * Stops listening for accelerometer events.
 */
export function stopListening() {
  if (typeof window === 'undefined') return;

  window.removeEventListener('devicemotion', handleMotionEvent, true);
  motionCallback = null;
  crashCallback = null;
  crashCooldown = false;
  gForceBuffer.length = 0;
  if (silenceCheckTimer) {
    clearTimeout(silenceCheckTimer);
    silenceCheckTimer = null;
  }
  postSpikeReadings = [];
  console.log('[Accelerometer] Stopped listening.');
}

/**
 * Checks if the DeviceMotionEvent is supported.
 * @returns {boolean}
 */
export function isSupported() {
  return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
}

/**
 * Get the crash threshold in G-forces.
 * @returns {number}
 */
export function getCrashThreshold() {
  return CRASH_THRESHOLD_G;
}
