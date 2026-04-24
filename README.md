<p align="center">
  <img src="docs/screenshots/app_icon.png" alt="RoadSoS Logo" width="120" height="120" style="border-radius: 24px;" />
</p>

<h1 align="center">🚨 RoadSoS — Emergency Response PWA</h1>

<p align="center">
  <strong>An AI-powered Progressive Web App for road accident emergency response — built to work even in network dead zones.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Gemini_AI-2.0_Flash-4285F4?logo=google&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/PWA-Offline_Ready-FF6F00?logo=pwa&logoColor=white" alt="PWA" />
</p>

---

## 📖 Table of Contents

- [Problem Statement](#-problem-statement)
- [Solution Overview](#-solution-overview)
- [Screenshots](#-screenshots)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Offline Capabilities](#-offline-capabilities)
- [Crash Detection Algorithm](#-crash-detection-algorithm)
- [Responsive Design](#-responsive-design)
- [Future Roadmap](#-future-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚩 Problem Statement

**Every year, 1.35 million people die in road accidents worldwide** (WHO). A significant number of these deaths occur because:

1. **Bystanders don't know first aid** — they panic and waste the critical "Golden Hour."
2. **Network dead zones** — accident-prone highways and rural roads often have no cellular coverage.
3. **Finding hospitals takes too long** — victims bleed out while someone Googles the nearest trauma center.
4. **Crash goes undetected** — solo riders/drivers involved in accidents may not be able to call for help.

**RoadSoS** addresses all four problems with a single, panic-proof emergency PWA.

---

## 💡 Solution Overview

RoadSoS is a **mobile-first Progressive Web App** that provides:

| Problem | RoadSoS Solution |
|---------|-----------------|
| Bystanders don't know first aid | **AI-powered triage** — describe the injury, get 3 actionable steps instantly |
| No network coverage | **Offline-first architecture** — hospital data cached, PWA works without internet |
| Finding hospitals is slow | **Real-time hospital search** — uses GPS + OpenStreetMap to find the nearest 10 hospitals |
| Crash goes undetected | **Automatic crash detection** — monitors accelerometer for high-G impacts, auto-triggers SOS |

The app is centered around a **massive, panic-proof SOS button** — designed to be usable even by someone with shaking hands in a high-stress situation.

---

## 📸 Screenshots

### Landing Page — SOS Button
The first screen shows only what matters: a giant, pulsing SOS button.

<p align="center">
  <img src="docs/screenshots/01_landing.png" alt="RoadSoS Landing Page" width="800" />
</p>

### Emergency Active — Dashboard
After pressing SOS: GPS locks, timer starts, injury input + hospitals appear.

<p align="center">
  <img src="docs/screenshots/02_emergency_active.png" alt="Emergency Active Dashboard" width="800" />
</p>

### AI Triage Result
Select an injury type or describe it — get AI-generated first aid steps in seconds.

<p align="center">
  <img src="docs/screenshots/03_triage_result.png" alt="AI Triage Result" width="800" />
</p>

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│              React + Vite + Tailwind CSS                    │
│                                                             │
│  ┌──────────┐  ┌─────────────┐  ┌────────────────────────┐ │
│  │ SOS      │  │ Golden Hour │  │ Injury Input           │ │
│  │ Button   │  │ Timer       │  │ (Quick tags + custom)  │ │
│  └────┬─────┘  └──────┬──────┘  └──────────┬─────────────┘ │
│       │               │                     │               │
│  ┌────┴─────┐  ┌──────┴──────┐  ┌──────────┴─────────────┐ │
│  │ Crash    │  │ Hospital    │  │ Triage Result           │ │
│  │ Detector │  │ List        │  │ (3-step first aid)      │ │
│  └────┬─────┘  └──────┬──────┘  └──────────┬─────────────┘ │
│       │               │                     │               │
│  ┌────┴────────────────┴─────────────────────┴──────────┐   │
│  │               UTILITY LAYER                          │   │
│  │  geolocation.js │ accelerometer.js │ offlineCache.js │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                       │
│  ┌──────────────────┴───────────────────────────────────┐   │
│  │           API CLIENTS (triage.js, hospitals.js)      │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                       │
│  ┌──────────────────┴───────────────────────────────────┐   │
│  │           SERVICE WORKER (vite-plugin-pwa)           │   │
│  │           Precaching + Runtime Caching               │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP (proxied /api)
┌────────────────────────────┴────────────────────────────────┐
│                        BACKEND                              │
│                   Python FastAPI                            │
│                                                             │
│  ┌──────────────────┐  ┌─────────────────────────────────┐  │
│  │  POST /triage    │  │  GET /hospitals?lat=X&lng=Y     │  │
│  │                  │  │                                 │  │
│  │  Gemini 2.0 Flash│  │  Overpass API (OpenStreetMap)   │  │
│  │  (falls back to  │  │  + Haversine distance calc     │  │
│  │   mock data)     │  │  (falls back to dummy data)    │  │
│  └──────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 18** | Component-based UI framework |
| **Vite 6** | Lightning-fast build tool with HMR |
| **Tailwind CSS 3** | Utility-first CSS with custom emergency theme |
| **vite-plugin-pwa** | Service worker generation, precaching, runtime caching |
| **Geolocation API** | Browser-native GPS positioning |
| **DeviceMotion API** | Accelerometer data for crash detection |
| **localStorage** | Offline hospital data cache |

### Backend
| Technology | Purpose |
|-----------|---------|
| **Python FastAPI** | High-performance async API server |
| **Google Gemini 2.0 Flash** | AI-powered medical triage (injury → first aid steps) |
| **OpenStreetMap Overpass API** | Real-world hospital geolocation search |
| **httpx** | Async HTTP client for external APIs |
| **python-dotenv** | Environment variable management |

---

## ✨ Features

### 🔴 Panic-Proof SOS Button
- **Massive 208px (mobile) / 240px (desktop)** circular button — impossible to miss
- Pulsing red glow animation with expanding ring effects
- Single tap to activate emergency mode
- Press feedback with scale animation

### ⏱️ Golden Hour Countdown
- **60-minute countdown timer** — the critical window for trauma care
- Circular SVG progress ring with real-time arc animation
- **Color-coded urgency:**
  - 🟢 Green (`> 40 min`) — "Time remaining — stay calm"
  - 🟡 Yellow (`15–40 min`) — "Hurry — help is needed soon"
  - 🔴 Red (`< 15 min`) — "⚠️ CRITICAL — act immediately"

### 🩺 AI Medical Triage (Google Gemini)
- **5 quick-select injury presets:** Head injury, Fracture, Burns, Chest pain, Unconscious victim
- Custom text input for any injury description
- Returns **3 concise, actionable first-aid steps** with severity assessment
- Includes AI disclaimer for safety
- **Graceful fallback:** If Gemini API is unavailable or unconfigured, returns evidence-based mock first-aid data

### 🏥 Real-Time Hospital Search
- Queries **OpenStreetMap Overpass API** with user's GPS coordinates
- Finds hospitals within **10km radius**, sorted by distance
- **Haversine formula** for accurate great-circle distance
- Returns up to **10 nearest hospitals** with name, distance, phone, and type
- **Dynamic status badge:** "Live Data" (real API), "Fallback" (API failed), "Offline Cache" (no network)
- Auto-caches results to localStorage for subsequent offline use

### 💥 Automatic Crash Detection
- Background monitoring via `DeviceMotion API` (accelerometer)
- Calculates **real-time G-force** from raw acceleration data
- Triggers at **4G threshold** (typical vehicle collision: ~39.2 m/s²)
- **Full-screen alert modal** with:
  - Impact G-force reading
  - **15-second auto-confirm countdown** with progress bar
  - "I'm Fine" (dismiss) and "🚨 Activate SOS" buttons
- **10-second cooldown** between alerts to prevent false-positive spam

### 📡 Offline-First Architecture
- **Service Worker** precaches all static assets (JS, CSS, HTML, fonts, icons)
- **Runtime caching** for Google Fonts (CacheFirst strategy, 1-year TTL)
- **localStorage** seeded with 3 dummy hospitals on first load
- Real hospital data auto-cached when fetched online
- Network status badge in header (Online/Offline) with live detection
- All API clients check `navigator.onLine` before making requests

### 📍 GPS Integration
- **High-accuracy positioning** with `enableHighAccuracy: true`
- 10-second timeout, 1-minute cache for recent positions
- Detailed error messages: permission denied, signal unavailable, timeout
- GPS badge appears in header when location is locked
- Displays coordinates with accuracy radius (e.g., `±69m`)

### 📱 Responsive Design
- **Mobile-first** with Tailwind breakpoints (`sm`, `md`, `lg`)
- Single-column layout on mobile → two-column grid on desktop
- SOS button centered vertically when idle, repositioned when active
- Touch-optimized with large hit areas and no accidental taps
- Safe area insets for notched phones (`100dvh`)

---

## 📂 Project Structure

```
AI Road Safety Hackathon/
│
├── 📁 frontend/                    # React + Vite PWA
│   ├── 📁 public/
│   │   ├── favicon.svg             # SVG app icon
│   │   └── 📁 icons/
│   │       ├── icon-192.png        # PWA icon (192x192)
│   │       └── icon-512.png        # PWA icon (512x512)
│   │
│   ├── 📁 src/
│   │   ├── 📁 components/          # UI Components
│   │   │   ├── Dashboard.jsx       # Main layout & orchestrator
│   │   │   ├── SOSButton.jsx       # Emergency SOS button
│   │   │   ├── GoldenHourTimer.jsx # 60-min countdown w/ SVG ring
│   │   │   ├── InjuryInput.jsx     # Injury description + quick tags
│   │   │   ├── TriageResult.jsx    # AI triage display (3 steps)
│   │   │   ├── HospitalList.jsx    # Nearby hospitals (live/cached)
│   │   │   └── CrashDetector.jsx   # Crash alert modal overlay
│   │   │
│   │   ├── 📁 utils/               # Hardware & Storage Utilities
│   │   │   ├── geolocation.js      # GPS API wrapper
│   │   │   ├── accelerometer.js    # DeviceMotion + crash detection
│   │   │   └── offlineCache.js     # localStorage hospital cache
│   │   │
│   │   ├── 📁 api/                 # API Client Layer
│   │   │   ├── triage.js           # POST /triage client
│   │   │   └── hospitals.js        # GET /hospitals client
│   │   │
│   │   ├── App.jsx                 # Root component
│   │   ├── main.jsx                # React entry point
│   │   └── index.css               # Global styles + Tailwind
│   │
│   ├── index.html                  # HTML entry (PWA meta tags)
│   ├── vite.config.js              # Vite + PWA plugin config
│   ├── tailwind.config.js          # Tailwind theme + animations
│   ├── postcss.config.js           # PostCSS config
│   └── package.json                # Dependencies & scripts
│
├── 📁 backend/                     # Python FastAPI Server
│   ├── main.py                     # API endpoints + Gemini integration
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Environment variable template
│   └── .env                        # Your API keys (git-ignored)
│
├── 📁 docs/
│   └── 📁 screenshots/             # App screenshots for README
│
└── README.md                       # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x ([download](https://nodejs.org/))
- **Python** ≥ 3.10 ([download](https://python.org/))
- **npm** (comes with Node.js)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/roadsos.git
cd roadsos
```

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at **http://localhost:5173/**

### 3. Setup Backend

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY (optional)

# Start the server
uvicorn main:app --reload
```

The backend will start at **http://localhost:8000/**

### 4. Open the App

Navigate to **http://localhost:5173/** in your browser. The Vite dev server automatically proxies `/api` requests to the FastAPI backend.

---

## 🔐 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Google Gemini API key
# Get yours at: https://aistudio.google.com/apikey
# If left empty, the triage endpoint returns mock first-aid data.
GEMINI_API_KEY=your_gemini_api_key_here
```

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | No | Google Gemini API key for AI triage. If empty, mock data is used instead. |

> **Note:** The app works fully without a Gemini API key. The AI triage will return evidence-based mock data as a fallback.

---

## 📡 API Reference

### `POST /triage`

AI-powered medical triage — analyzes an injury description and returns first-aid steps.

**Request:**
```json
{
  "description": "Head injury with bleeding from forehead"
}
```

**Response:**
```json
{
  "steps": [
    "Apply direct pressure to the wound with a clean cloth to control bleeding.",
    "Keep the victim lying still with head slightly elevated. Do not move if spinal injury is suspected.",
    "Call 112 immediately. Monitor consciousness and breathing until help arrives."
  ],
  "severity": "severe",
  "disclaimer": "This is AI-generated first aid guidance. Always seek professional medical help immediately.",
  "source": "gemini"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `steps` | `string[]` | Exactly 3 first-aid action items |
| `severity` | `string` | `"minor"` / `"moderate"` / `"severe"` / `"critical"` |
| `disclaimer` | `string` | Safety disclaimer |
| `source` | `string` | `"gemini"` (AI) or `"mock"` (fallback) |

---

### `GET /hospitals`

Finds real hospitals near the given GPS coordinates via OpenStreetMap.

**Request:**
```
GET /hospitals?lat=13.0827&lng=80.2707&radius=10000
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `lat` | `float` | _required_ | Latitude |
| `lng` | `float` | _required_ | Longitude |
| `radius` | `int` | `10000` | Search radius in meters |

**Response:**
```json
{
  "hospitals": [
    {
      "name": "Government General Hospital",
      "distance": "1.2 km",
      "lat": 13.0785,
      "lng": 80.2752,
      "type": "Government",
      "phone": "+91-44-25305000"
    }
  ],
  "source": "overpass"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `hospitals` | `Hospital[]` | Up to 10 hospitals sorted by distance |
| `source` | `string` | `"overpass"` (live) or `"fallback"` (dummy data) |

---

### `GET /health`

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "service": "roadsos-api",
  "gemini_configured": true
}
```

---

## 📴 Offline Capabilities

RoadSoS is designed to function in **network dead zones**. Here's how:

| Layer | Offline Strategy |
|-------|-----------------|
| **Static Assets** | Precached by Service Worker on first visit. App shell loads without internet. |
| **Google Fonts** | Runtime-cached with CacheFirst strategy (1-year TTL). |
| **Hospital Data** | Seeded into `localStorage` on first load (3 dummy hospitals). Updated with real data when online. |
| **AI Triage** | Requires network for Gemini API. Displays clear "Network Unavailable" error when offline. Falls back to mock data on backend if Gemini fails. |
| **GPS** | Works fully offline (hardware-level, no network needed). |
| **Accelerometer** | Works fully offline (hardware-level). |
| **Network Detection** | Real-time `online`/`offline` event listeners update the UI badge instantly. |

### PWA Installation

The app can be **installed as a native app** on mobile devices:

1. Open `http://localhost:5173/` in Chrome/Edge
2. Tap the browser menu → **"Install App"** or **"Add to Home Screen"**
3. RoadSoS will appear as a standalone app with its own icon

---

## 💥 Crash Detection Algorithm

The crash detection system uses a 3-gate pipeline to monitor the device's accelerometer and securely detect vehicle collisions while actively filtering out false positives like dropped phones:

```
                      Raw Accelerometer & GPS Data
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │   1. VELOCITY GATE   │
                        │  GPS speed ≥ 15 km/h?│
                        │  (Filters stationary │
                        │   drops & walking)   │
                        └──────────┬──────────┘
                                 YES
                                   ▼
                        ┌─────────────────────┐
                        │ 2. G-FORCE THRESHOLD │
                        │  Calculate Impact G   │
                        │   Impact G ≥ 4G?     │
                        │ (Vehicle Collision)   │
                        └──────────┬──────────┘
                                 YES
                                   ▼
                        ┌─────────────────────┐
                        │  3. SILENCE CHECK    │
                        │  Wait 10s post-spike │
                        │   Average G ≤ 1.5?   │
                        │ (Crash victims stay  │
                        │  still, dropped      │
                        │  phones bounce)      │
                        └──────────┬──────────┘
                                 YES
                                   ▼
                        ┌─────────────────────┐
                        │ ✅ CRASH DETECTED    │
                        │ Show 15s alert modal │
                        │ with auto-SOS        │
                        └─────────────────────┘
```

**Thresholds:**
- **Velocity Threshold:** 15 km/h (`4.1 m/s`) — effectively eliminates false triggers from dropping a phone while running or standing.
- **Impact Threshold:** **4G** — impact detection threshold typical of an automotive collision.
- **Stillness Threshold:** **1.5G** — a 10-second check after an event ensuring the device has "settled".
- **Cooldown:** **10 seconds** between events.
- **Auto-Confirm:** **15 seconds** countdown to alert dispatch if user doesn't dismiss.

---

## 📐 Responsive Design

RoadSoS uses a **mobile-first** approach with Tailwind CSS breakpoints:

| Breakpoint | Layout | Details |
|-----------|--------|---------|
| **Mobile** (`< 768px`) | Single column | SOS button stacked above timer, triage, hospitals |
| **Tablet** (`768–1023px`) | Single column (wider) | More padding, larger text |
| **Desktop** (`≥ 1024px`) | Two-column grid | Left: SOS + Timer + GPS. Right: Injury + Triage + Hospitals |

**Mobile-specific optimizations:**
- `user-scalable=no` to prevent accidental zoom
- `100dvh` for proper height on mobile browsers
- Large touch targets (44px+ minimum)
- No hover-dependent interactions

---

## 🗺 Future Roadmap

- [ ] **Zero-Barrier Bystander QR** — Allowing any passerby to scan a helmet sticker to access triage steps and medical ID without unlocking the victim's phone. (Highest impact for unconscious victims)
- [ ] **Real Gemini integration testing** — Validate AI triage accuracy across diverse injury types
- [ ] **SMS fallback** — Send GPS coordinates via SMS when no internet is available
- [ ] **Emergency contact notification** — Automatically notify pre-set contacts on SOS activation
- [ ] **Voice input** — Allow injury description via speech-to-text (hands may be injured)
- [ ] **Multi-language support** — Hindi, Tamil, Telugu, and other regional languages
- [ ] **Ambulance ETA** — Integrate with Google Maps / ambulance dispatch APIs
- [ ] **Accident history heatmap** — Visualize accident-prone zones on a map
- [ ] **Bluetooth beacon** — Broadcast SOS signal to nearby phones via BLE
- [ ] **Wearable integration** — Connect with smartwatches for health vitals (heart rate, SpO2)
- [ ] **Production deployment** — Docker, CI/CD, HTTPS, real domain

---

## 🤝 Contributing

Contributions are welcome! Here's how to get involved:

1. **Fork** the repository
2. **Create a feature branch:** `git checkout -b feature/my-feature`
3. **Commit your changes:** `git commit -m 'Add my feature'`
4. **Push to the branch:** `git push origin feature/my-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow the existing modular structure (components, utils, api)
- All new components should be responsive (mobile + desktop)
- Add error handling for all network operations
- Test offline behavior before submitting

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Built with ❤️ for the AI Road Safety Hackathon by Team Antigravity</strong>
</p>

<p align="center">
  <em>"Every second counts. RoadSoS makes sure none are wasted."</em>
</p>
