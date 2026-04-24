/**
 * RoadSoS Vanguard — Triage API client v3
 * ==========================================
 * Supports both:
 *   - Standard (blocking) POST /triage
 *   - SSE streaming GET /triage/stream (token-by-token from Ollama)
 *
 * Both paths fall back gracefully to mock data if the backend is unreachable.
 * All Ollama queries are LOCAL — no cloud API keys or internet required.
 */

const API_BASE = 'http://127.0.0.1:8000';

const OFFLINE_DICTIONARY = {
  bleed: {
    steps: [
      'Apply firm pressure to bleeding wounds with a clean cloth. Do not remove saturated cloth.',
      'Elevate the injured area above the heart if possible.',
      'Keep the victim still and call 112 immediately.'
    ],
    severity: 'severe',
    triage_category: 'red'
  },
  bone: {
    steps: [
      'Do not attempt to realign the bone or push a bone that\'s sticking out back in.',
      'Immobilize the injured area using a splint or sling if available.',
      'Apply ice packs to limit swelling and help relieve pain.'
    ],
    severity: 'moderate',
    triage_category: 'yellow'
  },
  burn: {
    steps: [
      'Cool the burn immediately with cool running water for at least 10 minutes.',
      'Remove any tight items, such as rings or clothing, from the burned area before it swells.',
      'Cover the burn loosely with sterile gauze or a clean cloth. Do not apply ointments.'
    ],
    severity: 'severe',
    triage_category: 'red'
  },
  unconscious: {
    steps: [
      'Check for responsiveness. If no response, call 112 immediately.',
      'Check breathing. If they are not breathing normally, begin CPR (chest compressions).',
      'If breathing normally, place them in the recovery position.'
    ],
    severity: 'critical',
    triage_category: 'black'
  },
  voice: {
    steps: [
      'Ensure the scene is safe. Do not put yourself in danger.',
      'Check the victim\'s airway, breathing, and circulation (ABC).',
      'Call 112, keep the victim calm and still, and do not move them unless necessary.'
    ],
    severity: 'moderate',
    triage_category: 'yellow'
  }
};

function getOfflineFallback(description) {
  const desc = description.toLowerCase();
  let key = 'voice';
  if (desc.includes('bleed') || desc.includes('blood') || desc.includes('cut')) key = 'bleed';
  else if (desc.includes('bone') || desc.includes('fracture') || desc.includes('break')) key = 'bone';
  else if (desc.includes('burn') || desc.includes('fire')) key = 'burn';
  else if (desc.includes('unconscious') || desc.includes('faint') || desc.includes('awake')) key = 'unconscious';
  
  return {
    ...OFFLINE_DICTIONARY[key],
    confidence: 0.99,
    source: 'offline-dictionary',
    latency_ms: 0,
    disclaimer: 'AEGIS Offline Mode. Always seek immediate professional medical help.'
  };
}

/**
 * Standard (blocking) triage request.
 * Sends injury description + optional patient profile to FastAPI → Ollama.
 *
 * @param {string} description — Injury description (3–2000 chars)
 * @param {{ blood_type?: string, allergies?: string[] }} [profile] — Optional medical profile
 * @returns {Promise<TriageResponse>}
 */
export async function fetchTriage(description, profile = null) {
  try {
    const response = await fetch(`${API_BASE}/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description,
        ...(profile && { patient_profile: profile }),
      }),
      signal: AbortSignal.timeout(90_000), // 90s — local LLM inference on CPU can be slow
    });

    if (!response.ok) {
      throw new Error(`Server error (${response.status})`);
    }

    return await response.json();

  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      console.warn('[Triage] Request timed out — using offline dictionary');
      return getOfflineFallback(description);
    }
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      console.warn('[Triage] Backend unreachable — using offline dictionary');
      return getOfflineFallback(description);
    }
    throw err;
  }
}

/**
 * Streaming triage via SSE (Server-Sent Events).
 * Emits tokens as they arrive from Ollama, calling onToken for each.
 * Calls onDone with the final parsed result when streaming completes.
 * Calls onError if the stream fails (also emits mock fallback).
 *
 * @param {string} description
 * @param {{ blood_type?: string, allergies?: string } | null} profile
 * @param {{ onToken: (token: string) => void, onDone: (result: object) => void, onError: (err: Error) => void }} handlers
 * @returns {() => void} — cancel function (closes the EventSource)
 */
export function streamTriage(description, profile, { onToken, onDone, onError }) {
  const params = new URLSearchParams({ description });
  if (profile?.blood_type) params.set('blood_type', profile.blood_type);
  if (profile?.allergies?.length) params.set('allergies', profile.allergies.join(','));

  const url = `${API_BASE}/triage/stream?${params.toString()}`;

  // EventSource only supports GET — perfect for our streaming endpoint
  let es;
  try {
    es = new EventSource(url);
  } catch (err) {
    onError(new Error('SSE not supported in this browser'));
    onDone(getOfflineFallback(description));
    return () => {};
  }

  const timeoutId = setTimeout(() => {
    es.close();
    console.warn('[Triage Stream] Timed out — emitting offline dictionary');
    onDone(getOfflineFallback(description));
  }, 120_000);

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.done) {
        clearTimeout(timeoutId);
        es.close();
        onDone({
          steps: data.steps,
          severity: data.severity,
          triage_category: data.triage_category,
          confidence: data.confidence ?? 0.75,
          source: data.source,
          disclaimer: 'AEGIS AI first-aid guidance. Always seek immediate professional medical help.',
          latency_ms: 0,
        });
      } else if (data.token) {
        onToken(data.token);
      }
    } catch {
      // Malformed SSE frame — ignore and continue
    }
  };

  es.onerror = (e) => {
    clearTimeout(timeoutId);
    es.close();
    console.warn('[Triage Stream] SSE error / Offline detected — falling back to offline dictionary', e);
    
    // Simulate streaming the offline dictionary
    const fallbackData = getOfflineFallback(description);
    let currentStep = 0;
    
    const interval = setInterval(() => {
      if (currentStep < fallbackData.steps.length) {
        // Stream token by token (or step by step for simplicity)
        const stepText = `${currentStep + 1}. ${fallbackData.steps[currentStep]}\n\n`;
        onToken(stepText);
        currentStep++;
      } else {
        clearInterval(interval);
        onDone(fallbackData);
      }
    }, 400); // 400ms per step simulation
  };

  // Return cancel function
  return () => {
    clearTimeout(timeoutId);
    es.close();
  };
}

/**
 * Fetches the current AI model status from the backend.
 * Safe to call on mount — returns null if backend is offline.
 *
 * @returns {Promise<{ active_model: string, ollama_online: boolean, available_models: string[] } | null>}
 */
export async function fetchModelStatus() {
  try {
    const resp = await fetch(`${API_BASE}/model/status`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

/**
 * Hot-swaps the active Ollama model at runtime.
 * @param {string} modelName
 * @returns {Promise<{ success: boolean, active_model: string } | null>}
 */
export async function switchModel(modelName) {
  try {
    const resp = await fetch(`${API_BASE}/model/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelName }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}
