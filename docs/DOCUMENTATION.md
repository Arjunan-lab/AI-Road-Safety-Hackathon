# 📚 RoadSoS Vanguard - Detailed Technical Documentation

## 1. System Architecture

RoadSoS Vanguard uses a decoupled, hybrid architecture. It consists of a React-based Progressive Web App (PWA) on the frontend and a Python-based FastAPI service on the backend.

### 1.1 Architecture Diagram Flow
1. **User/Device:** Accesses the PWA. Sensors (accelerometer, GPS) gather data.
2. **Frontend (React):** Handles UI, local state, and offline caching via service workers.
3. **Backend (FastAPI):** Exposes REST APIs and Server-Sent Events (SSE) for streaming.
4. **External APIs:** 
   - Google Gemini API (for AI Triage)
   - Overpass API (for Hospital Data)

## 2. Frontend Details (React + Vite PWA)

The frontend is designed to be highly resilient and usable under extreme stress.

### 2.1 Key Modules
- **`src/App.jsx`**: The main entry point that handles the dashboard layout and emergency state management.
- **`src/utils/geolocation.js`**: Handles fetching the user's latitude and longitude with high accuracy.
- **`src/utils/accelerometer.js`**: Monitors device motion to detect potential crash events (sudden spikes in G-force).
- **`src/utils/offlineCache.js`**: Manages local storage to ensure the app works without an internet connection.
- **`src/utils/medicalId.js`**: Generates and parses QR codes containing the user's critical medical information.

### 2.2 Offline Capabilities
Using `vite-plugin-pwa`, the application registers a Service Worker that caches static assets (HTML, CSS, JS). Additionally, the app implements application-level caching, meaning previous AI responses and fallback hospital lists are stored locally to guarantee zero-latency responses in dead zones.

## 3. Backend Details (FastAPI)

The backend is lightweight, focusing purely on connecting the user to vital external data streams as quickly as possible.

### 3.1 Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/triage` | `POST` | Receives a description of the emergency and returns a structured JSON containing 3 actionable first-aid steps, severity, and triage category. Uses Gemini 2.5 Flash. |
| `/triage/stream` | `GET` | Similar to `/triage`, but uses Server-Sent Events (SSE) to stream the AI response token-by-token. This drastically reduces perceived latency. |
| `/hospitals` | `GET` | Takes `lat` and `lng` and queries the Overpass API (OpenStreetMap) to find medical facilities within a specific radius. Calculates distance using the Haversine formula. |
| `/health` | `GET` | A simple ping endpoint to verify the backend is alive and whether the cloud AI is properly configured. |

### 3.2 AI Integration
We utilize **Google Gemini 2.5 Flash** because of its incredibly low latency. 
- **Prompt Engineering:** The system prompt forces Gemini to act as "AEGIS" (an emergency AI). It restricts outputs to exactly 3 steps, enforces a maximum word count per step, and explicitly forbids prescribing medication or complex surgeries.
- **Mock Fallback:** If the Gemini API is unreachable, times out, or the API key is missing, the backend instantly falls back to a curated, hardcoded response so the user is never left without guidance.

## 4. Design Philosophy
- **Panic-Proof UI:** High contrast colors (Reds, Yellows, dark backgrounds). Large, easily tappable buttons.
- **C-A-B Priority:** AI advice is strictly tuned to prioritize Circulation, Airway, and Breathing.
- **Zero-Friction:** No logins or signups are required during an emergency. The app is instantly ready.

## 5. Future Enhancements
- WhatsApp auto-dispatch of live location to emergency contacts.
- Direct integration with local ambulance dispatch APIs.
- Voice-activated SOS commands.
