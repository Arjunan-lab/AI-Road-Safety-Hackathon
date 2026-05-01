/**
 * voiceCancellation.js
 *
 * Standalone utility that uses the Web Speech API to listen for cancellation
 * keywords during the crash countdown. On keyword match it fires a callback,
 * otherwise it auto-stops when the crash resolves.
 *
 * KEYWORDS: "stop", "cancel", "okay", "i'm ok", "i am ok", "abort"
 * PLATFORM: Needs network on Chrome Android. Falls back gracefully if unavailable.
 */

const CANCEL_KEYWORDS = ['stop', 'cancel', 'okay', "i'm ok", 'i am ok', 'abort', 'safe'];

let recognitionInstance = null;

/**
 * Starts continuous voice monitoring for cancellation keywords.
 * @param {() => void} onCancel — fired when a keyword is heard
 */
export function startCrashCancellationListener(onCancel) {
  if (recognitionInstance) return; // Already listening

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn('[VoiceCancel] SpeechRecognition not available on this device.');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 3;

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript.toLowerCase().trim();
      const matched = CANCEL_KEYWORDS.some((kw) => transcript.includes(kw));
      if (matched) {
        console.log(`[VoiceCancel] ✅ Keyword detected: "${transcript}" — cancelling SOS`);
        stopCrashCancellationListener();
        onCancel();
        return;
      }
    }
  };

  recognition.onerror = (event) => {
    // 'no-speech' is common and expected — just log, don't crash
    if (event.error !== 'no-speech') {
      console.warn('[VoiceCancel] Error:', event.error);
    }
  };

  recognition.onend = () => {
    // Restart if still listening (browser auto-stops continuous streams)
    if (recognitionInstance) {
      try { recognition.start(); } catch (_) { /* ignore if already stopping */ }
    }
  };

  try {
    recognition.start();
    recognitionInstance = recognition;
    console.log('[VoiceCancel] 🎙️ Listening for cancellation keywords...');
  } catch (err) {
    console.warn('[VoiceCancel] Could not start speech recognition:', err);
    recognitionInstance = null;
  }
}

/**
 * Stops the voice cancellation listener and releases the microphone.
 */
export function stopCrashCancellationListener() {
  if (recognitionInstance) {
    try {
      recognitionInstance.abort();
    } catch (_) { /* noop */ }
    recognitionInstance = null;
    console.log('[VoiceCancel] 🔇 Stopped listening.');
  }
}
