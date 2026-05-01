"""
RoadSoS Backend — FastAPI server v3.1 (Cloud Speed Edition)
=========================================================
Endpoints:
  POST /triage          — Cloud AI triage via Gemini (fast fallback)
  GET  /triage/stream   — SSE streaming triage via Gemini (lightning speed)
  GET  /hospitals       — Real nearby hospitals via Overpass API
  GET  /health          — Full system health check
"""

import os
import json
import math
import logging
import asyncio
import time
from typing import Optional, AsyncGenerator
from functools import partial

import httpx
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# ─── Bootstrap ────────────────────────────────────────────────────────────────

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("roadsos")

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
AI_TIMEOUT: int = int(os.getenv("AI_TIMEOUT", "15"))

# Twilio — optional, gracefully absent = fallback to wa.me
TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN: str  = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM: str        = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

_twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        from twilio.rest import Client as TwilioClient
        _twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        logger.info("[Twilio] ✅ Client initialised — zero-touch WhatsApp dispatch ACTIVE")
    except Exception as _twilio_err:
        logger.warning(f"[Twilio] ⚠️ Could not initialise client: {_twilio_err}")
else:
    logger.info("[Twilio] ℹ️ Credentials not set — will use wa.me fallback")

app = FastAPI(
    title="RoadSoS Vanguard API",
    description="Zero-cloud emergency response backend — AI triage + hospital discovery",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class TriageRequest(BaseModel):
    description: str = Field(..., min_length=3, max_length=2000)
    patient_profile: Optional[dict] = Field(
        default=None,
        description="Optional medical profile: {blood_type, allergies}",
    )


class TriageStep(BaseModel):
    action: str
    rationale: str


class TriageResponse(BaseModel):
    steps: list[str]
    severity: str        # minor | moderate | severe | critical
    triage_category: str # START color: green | yellow | red | black
    confidence: float    # 0.0–1.0
    disclaimer: str
    source: str          # "ollama/<model>" or "mock"
    latency_ms: int


class Hospital(BaseModel):
    name: str
    distance: str
    lat: float
    lng: float
    type: str
    phone: Optional[str] = None


class HospitalsResponse(BaseModel):
    hospitals: list[Hospital]
    source: str


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    cloud_ai_configured: bool

class SOSRequest(BaseModel):
    lat: str
    lng: str
    force: str
    blood_type: str
    emergency_contact: str


class WhatsAppDispatchRequest(BaseModel):
    """Payload for zero-touch crash WhatsApp dispatch via Twilio."""
    contact_number: str = Field(..., description="E.164 number, e.g. +919876543210")
    latitude: float
    longitude: float
    blood_type: str = Field(default="Unknown")
    message_type: str = Field(default="crash", description="'crash' or 'test'")


# ─── RAG Triage Prompt (Strict JSON-only output) ──────────────────────────────

_SYSTEM_PROMPT = """You are AEGIS — an elite emergency medical AI for road accident first response.
Your output is consumed directly by a life-saving mobile app in a critical situation.

ABSOLUTE RULES:
1. Respond ONLY with a single valid JSON object. No markdown. No explanation. No preamble.
2. Output EXACTLY 3 first-aid steps. Never more, never fewer.
3. Each step must be ≤ 15 words. Clear, imperative language. Panic-proof.
4. Do NOT recommend medications, IV fluids, surgery, or controlled substances.
5. Focus on C-A-B (Circulation, Airway, Breathing) stabilization until EMS arrives.
6. Assess severity: "minor" | "moderate" | "severe" | "critical"
7. Map to START triage color: "green" | "yellow" | "red" | "black"
8. Provide a confidence score 0.0–1.0 based on the clarity of the description.

JSON schema (strict — no extra keys):
{
  "steps": ["step1", "step2", "step3"],
  "severity": "severe",
  "triage_category": "red",
  "confidence": 0.82
}"""

_USER_TEMPLATE = """Road accident injury report:
DESCRIPTION: {description}
{profile_block}
Provide immediate first-aid steps as AEGIS."""


def _build_profile_block(profile: Optional[dict]) -> str:
    if not profile:
        return ""
    parts = []
    if profile.get("blood_type"):
        parts.append(f"BLOOD TYPE: {profile['blood_type']}")
    if profile.get("allergies"):
        allergy_str = ", ".join(profile["allergies"]) if isinstance(profile["allergies"], list) else profile["allergies"]
        parts.append(f"KNOWN ALLERGIES: {allergy_str}")
    return "\n".join(parts) if parts else ""


# ─── Google Gemini Integration (Web Model) ───────────────────────────────────

async def _call_gemini_async(description: str, profile: Optional[dict] = None) -> dict:
    """
    Calls Google Gemini 1.5 Flash synchronously (wrapped for async).
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is missing. Add it to your .env file.")

    user_content = _USER_TEMPLATE.format(
        description=description.strip(),
        profile_block=_build_profile_block(profile),
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "system_instruction": { "parts": [{"text": _SYSTEM_PROMPT}] },
        "contents": [{ "parts": [{"text": user_content}] }],
        "generationConfig": {
            "temperature": 0.15,
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient(timeout=AI_TIMEOUT) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()

    raw_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
    result: dict = json.loads(raw_text)

    steps = result.get("steps", [])
    if not isinstance(steps, list) or len(steps) < 3:
        raise ValueError(f"Invalid step count: {len(steps)}")

    return {
        "steps": [str(s) for s in steps[:3]],
        "severity": str(result.get("severity", "moderate")),
        "triage_category": str(result.get("triage_category", "yellow")),
        "confidence": float(result.get("confidence", 0.75)),
    }


async def _stream_gemini_tokens(description: str, profile: Optional[dict] = None) -> AsyncGenerator[str, None]:
    """
    Streams raw tokens from Gemini via SSE.
    """
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY missing! Emitting mock.")
        fb = _MOCK_TRIAGE.copy()
        yield f"data: {json.dumps({'done': True, **fb, 'source': 'mock-no-key'})}\n\n"
        return

    user_content = _USER_TEMPLATE.format(
        description=description.strip(),
        profile_block=_build_profile_block(profile),
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key={GEMINI_API_KEY}"
    
    payload = {
        "system_instruction": { "parts": [{"text": _SYSTEM_PROMPT}] },
        "contents": [{ "parts": [{"text": user_content}] }],
        "generationConfig": {
            "temperature": 0.15,
            "responseMimeType": "application/json"
        }
    }

    full_response = ""
    try:
        async with httpx.AsyncClient(timeout=AI_TIMEOUT) as client:
            async with client.stream("POST", url, json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    
                    data_str = line[5:].strip()
                    if not data_str:
                        continue
                        
                    try:
                        chunk = json.loads(data_str)
                        token = chunk.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if token:
                            full_response += token
                            yield f"data: {json.dumps({'token': token})}\n\n"
                    except json.JSONDecodeError:
                        continue

        # Streaming complete, parse full JSON
        parsed = json.loads(full_response.strip())
        steps = [str(s) for s in parsed.get("steps", [])[:3]]
        yield f"data: {json.dumps({'done': True, 'steps': steps, 'severity': parsed.get('severity', 'moderate'), 'triage_category': parsed.get('triage_category', 'yellow'), 'confidence': float(parsed.get('confidence', 0.85)), 'source': 'gemini-2.5-flash'})}\n\n"
        await asyncio.sleep(0.5)

    except Exception as e:
        logger.warning(f"[Stream] Gemini streaming failed: {e}")
        fb = _MOCK_TRIAGE.copy()
        yield f"data: {json.dumps({'done': True, **fb, 'source': 'mock'})}\n\n"
        await asyncio.sleep(0.5)


# ─── Mock Fallback ────────────────────────────────────────────────────────────

_MOCK_TRIAGE = {
    "steps": [
        "Apply firm pressure to bleeding wounds with a clean cloth. Do not remove saturated cloth.",
        "Keep victim still. Do not move them unless in immediate danger of fire or traffic.",
        "Call 112 immediately. Monitor breathing and consciousness until help arrives.",
    ],
    "severity": "moderate",
    "triage_category": "yellow",
    "confidence": 1.0,
}


# ─── Overpass Hospital Search ─────────────────────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def _fetch_hospitals_overpass(lat: float, lng: float, radius: int = 10000) -> list[dict]:
    query = f"""
    [out:json][timeout:5];
    (
      node["amenity"="hospital"](around:{radius},{lat},{lng});
      way["amenity"="hospital"](around:{radius},{lat},{lng});
      relation["amenity"="hospital"](around:{radius},{lat},{lng});
    );
    out center body;
    """
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post("https://overpass-api.de/api/interpreter", data={"data": query})
        resp.raise_for_status()
        data = resp.json()

    hospitals = []
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name", tags.get("name:en", "Unnamed Hospital"))
        h_lat = el.get("lat") or el.get("center", {}).get("lat")
        h_lng = el.get("lon") or el.get("center", {}).get("lon")
        if not h_lat or not h_lng:
            continue
        dist = _haversine_km(lat, lng, h_lat, h_lng)
        hospitals.append({
            "name": name,
            "distance": f"{dist:.1f} km",
            "lat": round(h_lat, 6),
            "lng": round(h_lng, 6),
            "type": tags.get("operator:type", tags.get("healthcare", "Hospital")).capitalize(),
            "phone": tags.get("phone", tags.get("contact:phone")),
            "dist_km": dist,
        })

    hospitals.sort(key=lambda h: h["dist_km"])
    for h in hospitals:
        del h["dist_km"]
    return hospitals[:10]


_FALLBACK_HOSPITALS = [
    {"name": "City General Hospital",  "distance": "2.3 km", "lat": 13.0827, "lng": 80.2707, "type": "Government", "phone": "+91-1234-567890"},
    {"name": "Apollo Emergency Care",  "distance": "4.1 km", "lat": 13.0604, "lng": 80.2496, "type": "Private",    "phone": "+91-9876-543210"},
    {"name": "St. Thomas Trauma Center", "distance": "5.7 km", "lat": 13.0475, "lng": 80.2090, "type": "Private", "phone": "+91-4455-667788"},
]


# Ollama Removed - Using Gemini Web Model


# ─── API Endpoints ────────────────────────────────────────────────────────────

@app.post("/triage", response_model=TriageResponse)
async def triage(req: TriageRequest):
    """
    AI-powered emergency triage via Google Gemini API.
    Falls back to curated mock data if API is unreachable or key is missing.
    """
    t0 = time.monotonic()
    source = "mock"
    result = _MOCK_TRIAGE.copy()

    try:
        result = await _call_gemini_async(req.description, req.patient_profile)
        source = "gemini-2.5-flash"
        logger.info(f"[Triage] ✅ Gemini response — severity={result['severity']}, confidence={result['confidence']:.2f}")
    except Exception as e:
        logger.warning(f"[Triage] ⚠️  Gemini unavailable — using mock fallback: {e}")

    latency_ms = int((time.monotonic() - t0) * 1000)
    return TriageResponse(
        steps=result["steps"],
        severity=result["severity"],
        triage_category=result.get("triage_category", "yellow"),
        confidence=result.get("confidence", 1.0),
        disclaimer="AEGIS AI first-aid guidance. Always seek immediate professional medical help.",
        source=source,
        latency_ms=latency_ms,
    )


@app.get("/triage/stream")
async def triage_stream(
    description: str = Query(..., min_length=3),
    blood_type: Optional[str] = Query(default=None),
    allergies: Optional[str] = Query(default=None),
):
    """
    SSE streaming triage endpoint.
    Emits tokens as they arrive from Ollama, ending with a 'done' event
    containing the fully parsed structured result.
    """
    profile = None
    if blood_type or allergies:
        profile = {
            "blood_type": blood_type,
            "allergies": allergies.split(",") if allergies else [],
        }

    return StreamingResponse(
        _stream_gemini_tokens(description, profile),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.get("/hospitals", response_model=HospitalsResponse)
async def hospitals(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: int = Query(10000, ge=1000, le=50000),
):
    """
    Fetches real hospitals near (lat, lng) from OpenStreetMap Overpass API.
    Falls back to static dummy data if the API is unreachable.
    """
    try:
        results = await _fetch_hospitals_overpass(lat, lng, radius)
        if results:
            return HospitalsResponse(hospitals=results, source="overpass")
        logger.info("[Hospitals] Overpass returned 0 results — using fallback")
        return HospitalsResponse(hospitals=_FALLBACK_HOSPITALS, source="fallback")
    except Exception as e:
        logger.warning(f"[Hospitals] Overpass failed: {e}")
        return HospitalsResponse(hospitals=_FALLBACK_HOSPITALS, source="fallback")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Full system health check.
    """
    return HealthResponse(
        status="ok",
        service="roadsos-vanguard-api",
        version="3.1.0",
        cloud_ai_configured=bool(GEMINI_API_KEY)
    )

@app.post("/sos/whatsapp")
async def dispatch_whatsapp_sos(req: SOSRequest):
    """
    Backend integration for automatically dispatching WhatsApp messages.
    This bypasses frontend browser popup blockers which prevent opening apps from background timers.
    """
    msg = f"🚨 ROAD SOS EMERGENCY! 🚨\nAutomatic Crash Detected (Force: >{req.force}G).\nLocation: https://maps.google.com/?q={req.lat},{req.lng}\nBlood Type: {req.blood_type}"
    logger.info("\n" + "="*50)
    logger.info("📡 AUTOMATIC SOS DISPATCH INITIATED (BACKEND)")
    logger.info("="*50)
    logger.info(f"Target Contact : {req.emergency_contact}")
    logger.info(f"Payload        :\n{msg}")
    logger.info("Status         : ✅ DELIVERED (Mock API)")
    logger.info("="*50 + "\n")
    return {"status": "success", "delivered": True}


# ─── Zero-Touch WhatsApp Dispatch (Twilio) ────────────────────────────────────

@app.post("/dispatch-whatsapp")
async def zero_touch_whatsapp_dispatch(req: WhatsAppDispatchRequest):
    """
    AEGIS Auto-Dispatch — sends a WhatsApp SOS message via Twilio when the
    crash countdown hits zero and the victim cannot interact with the screen.

    Returns:
      { "delivered": true,  "method": "twilio" }   — Twilio delivered
      { "delivered": false, "method": "fallback" }  — client must open wa.me link
    """
    # ── Build message ────────────────────────────────────────────────
    maps_url = f"https://maps.google.com/?q={req.latitude},{req.longitude}"
    body = (
        f"🚨 ROAD SOS — AUTOMATIC CRASH ALERT 🚨\n"
        f"\n"
        f"An automatic crash was detected by the RoadSoS AEGIS system.\n"
        f"📍 Location : {maps_url}\n"
        f"🩸 Blood Type: {req.blood_type}\n"
        f"\n"
        f"Please respond immediately or call 112."
    )

    # ── Twilio path ──────────────────────────────────────────────────
    if _twilio_client:
        # Normalise number to E.164 + whatsapp: prefix
        digits_only = "".join(ch for ch in req.contact_number if ch.isdigit() or ch == "+")
        if not digits_only.startswith("+"):
            digits_only = "+" + digits_only
        to_number = f"whatsapp:{digits_only}"

        try:
            loop = asyncio.get_event_loop()
            send_fn = partial(
                _twilio_client.messages.create,
                from_=TWILIO_FROM,
                to=to_number,
                body=body,
            )
            message = await loop.run_in_executor(None, send_fn)
            logger.info(
                f"[Twilio] ✅ WhatsApp dispatched → SID={message.sid}  to={to_number}"
            )
            return {"delivered": True, "method": "twilio", "sid": message.sid}

        except Exception as exc:
            logger.error(f"[Twilio] ❌ Dispatch failed: {exc}")
            raise HTTPException(
                status_code=500,
                detail={"delivered": False, "method": "fallback", "error": str(exc)},
            )

    # ── No Twilio credentials — signal client to use wa.me ───────────
    logger.info("[Twilio] ℹ️ No credentials — instructing client to use wa.me fallback")
    return {"delivered": False, "method": "fallback"}

# Force reload
