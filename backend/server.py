import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import websockets
from cryptography.fernet import Fernet
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, APIRouter
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import socket
from pymavlink import mavutil
from pymavlink.dialects.v20 import common as mavlink
import threading
import struct
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Configuration
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'resqfly')]

# FastAPI app setup
app = FastAPI(title="ResQFly API", description="Disaster Response Drone System")
api_router = APIRouter(prefix="/api")

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global state
connected_clients: Dict[str, WebSocket] = {}
telemetry_buffer = []
ai_enabled = False
ai_settings = {}

# Encryption for API keys
def get_encryption_key():
    key = os.environ.get('ENCRYPTION_KEY')
    if not key:
        key = Fernet.generate_key().decode()
        logger.warning(f"Generated new encryption key: {key}")
    return key.encode()

cipher = Fernet(get_encryption_key())

# Pydantic Models
class TelemetryData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    drone_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    lat: float
    lon: float 
    alt_abs: float  # Absolute altitude (MSL)
    alt_rel: float  # Relative altitude (AGL)
    groundspeed: float
    airspeed: float
    heading: float
    roll: float
    pitch: float 
    yaw: float
    mode: str
    armed: bool
    fix_type: int
    satellites: int
    battery_voltage: float
    battery_percent: int
    rssi: int
    link_quality: float

class DroneModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    uid: str
    callsign: str
    firmware: str = "ArduPilot"
    max_payload_kg: float = 5.0
    status: str = "offline"
    last_telemetry: Optional[TelemetryData] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MissionModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    created_by: str
    status: str = "planned"  # planned, active, completed, aborted
    priority: int = 1  # 1=low, 2=medium, 3=high, 4=critical
    origin: Dict[str, float]  # {lat, lon, alt}
    destination: Dict[str, float]  # {lat, lon, alt}
    geofence_ids: List[str] = []
    payloads: List[str] = []
    assigned_drone_id: Optional[str] = None
    eta: Optional[datetime] = None
    ai_brief: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GeofenceModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    polygon: Dict  # GeoJSON polygon
    rule: str = "inclusion"  # inclusion, exclusion
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AlertModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # warning, error, info
    severity: int = 1  # 1-5
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    mission_id: Optional[str] = None
    drone_id: Optional[str] = None
    acknowledged: bool = False

class AISettings(BaseModel):
    enabled: bool = False
    provider: str = "gemini"  # gemini, openai, emergent
    api_key: Optional[str] = None

class SafetyScore(BaseModel):
    score: float  # 0-100
    factors: Dict[str, float]
    recommendations: List[str]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# MAVLink UDP Listener
class MAVLinkListener:
    def __init__(self, port=14550, host='0.0.0.0'):
        self.port = port
        self.host = host
        self.socket = None
        self.running = False
        self.last_heartbeat = None
        self.packets_per_second = 0
        self.packet_count = 0
        self.last_packet_time = datetime.now(timezone.utc)
        
    def start_listener(self):
        """Start UDP listener in background thread"""
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.socket.bind((self.host, self.port))
        self.running = True
        
        logger.info(f"MAVLink UDP listener started on {self.host}:{self.port}")
        
        def listen_loop():
            while self.running:
                try:
                    data, addr = self.socket.recvfrom(1024)
                    asyncio.create_task(self.process_mavlink_data(data, addr))
                except Exception as e:
                    logger.error(f"MAVLink listener error: {e}")
                    
        thread = threading.Thread(target=listen_loop, daemon=True)
        thread.start()
    
    async def process_mavlink_data(self, data, addr):
        """Process incoming MAVLink data"""
        try:
            # Parse MAVLink message
            msg = mavutil.mavlink_connection('udp:127.0.0.1:14550', source_system=255)
            
            # Simple parsing - in production, use proper MAVLink parser
            if len(data) < 8:
                return
                
            # Update packet statistics
            now = datetime.now(timezone.utc)
            self.packet_count += 1
            if (now - self.last_packet_time).seconds >= 1:
                self.packets_per_second = self.packet_count
                self.packet_count = 0
                self.last_packet_time = now
            
            # Mock telemetry data for demo (replace with actual MAVLink parsing)
            telemetry = TelemetryData(
                drone_id="drone_001",
                lat=37.7749 + (hash(str(now)) % 1000) / 100000,  # Mock GPS with slight variation
                lon=-122.4194 + (hash(str(now + timezone.utc.utcoffset(None))) % 1000) / 100000,
                alt_abs=100.5,
                alt_rel=50.2,
                groundspeed=12.5,
                airspeed=15.0,
                heading=45.0,
                roll=2.1,
                pitch=-1.5,
                yaw=45.0,
                mode="AUTO",
                armed=True,
                fix_type=3,
                satellites=12,
                battery_voltage=12.6,
                battery_percent=85,
                rssi=-65,
                link_quality=0.95
            )
            
            # Store in database
            await db.telemetry.insert_one(telemetry.dict())
            
            # Broadcast to WebSocket clients
            await broadcast_telemetry(telemetry)
            
        except Exception as e:
            logger.error(f"Error processing MAVLink data: {e}")

# Initialize MAVLink listener
mavlink_listener = MAVLinkListener()

# AI Service with secure key vault
class AIService:
    def __init__(self):
        self.chat_sessions = {}
    
    async def get_settings(self):
        """Get AI settings from database"""
        settings = await db.ai_settings.find_one({}, {"_id": 0})
        if not settings:
            # Default settings
            settings = {
                "enabled": False,
                "provider": "gemini",
                "api_key": None
            }
            await db.ai_settings.insert_one(settings)
        return settings
    
    async def update_settings(self, new_settings: AISettings):
        """Update AI settings with encrypted API key"""
        settings_dict = new_settings.dict()
        if settings_dict.get("api_key"):
            # Encrypt API key
            settings_dict["api_key"] = cipher.encrypt(settings_dict["api_key"].encode()).decode()
        
        await db.ai_settings.replace_one({}, settings_dict, upsert=True)
        
        # Update global state
        global ai_enabled, ai_settings
        ai_enabled = settings_dict["enabled"]
        ai_settings = settings_dict
        
        return settings_dict
    
    async def get_decrypted_key(self):
        """Get decrypted API key"""
        settings = await self.get_settings()
        if settings.get("api_key"):
            return cipher.decrypt(settings["api_key"].encode()).decode()
        return None
    
    async def generate_mission_brief(self, mission: MissionModel):
        """Generate AI mission brief"""
        if not ai_enabled:
            return "AI briefing disabled. Manual briefing required."
        
        try:
            api_key = await self.get_decrypted_key()
            if not api_key and ai_settings.get("provider") != "emergent":
                return "AI API key not configured."
            
            # Use emergent integrations for Gemini
            if ai_settings.get("provider") == "emergent":
                api_key = os.environ.get('EMERGENT_LLM_KEY')
            
            chat = LlmChat(
                api_key=api_key,
                session_id=f"mission_{mission.id}",
                system_message="You are an expert drone mission coordinator. Provide concise, actionable mission briefs."
            ).with_model("gemini", "gemini-2.0-flash")
            
            brief_prompt = f"""
            Generate a concise mission brief for:
            Mission: {mission.code}
            Origin: {mission.origin}
            Destination: {mission.destination}
            Priority: {mission.priority}
            Payloads: {', '.join(mission.payloads)}
            
            Include: route overview, weather considerations, safety checkpoints, emergency procedures.
            """
            
            user_message = UserMessage(text=brief_prompt)
            response = await chat.send_message(user_message)
            
            return response
            
        except Exception as e:
            logger.error(f"AI brief generation error: {e}")
            return f"AI brief generation failed: {str(e)}"

ai_service = AIService()

# WebSocket management
async def broadcast_telemetry(telemetry: TelemetryData):
    """Broadcast telemetry to all connected WebSocket clients"""
    if connected_clients:
        message = {
            "type": "telemetry",
            "data": telemetry.dict()
        }
        disconnected = []
        for client_id, websocket in connected_clients.items():
            try:
                await websocket.send_text(json.dumps(message, default=str))
            except:
                disconnected.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected:
            connected_clients.pop(client_id, None)

# API Routes
@api_router.get("/")
async def root():
    return {"message": "ResQFly API v1.0", "status": "operational"}

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc),
        "ai_enabled": ai_enabled,
        "mavlink_pps": mavlink_listener.packets_per_second,
        "connected_clients": len(connected_clients)
    }

# Drone endpoints
@api_router.get("/drones", response_model=List[DroneModel])
async def get_drones():
    drones = await db.drones.find().to_list(100)
    return [DroneModel(**drone) for drone in drones]

@api_router.post("/drones", response_model=DroneModel)
async def create_drone(drone: DroneModel):
    drone_dict = drone.dict()
    await db.drones.insert_one(drone_dict)
    return drone

@api_router.get("/drones/{drone_id}/telemetry")
async def get_drone_telemetry(drone_id: str, limit: int = 100):
    telemetry = await db.telemetry.find({"drone_id": drone_id}).sort("timestamp", -1).limit(limit).to_list(limit)
    return telemetry

# Mission endpoints
@api_router.get("/missions", response_model=List[MissionModel])
async def get_missions():
    missions = await db.missions.find().to_list(100)
    return [MissionModel(**mission) for mission in missions]

@api_router.post("/missions", response_model=MissionModel)
async def create_mission(mission: MissionModel):
    mission_dict = mission.dict()
    
    # Generate AI brief if enabled
    if ai_enabled:
        brief = await ai_service.generate_mission_brief(mission)
        mission_dict["ai_brief"] = brief
    
    await db.missions.insert_one(mission_dict)
    return MissionModel(**mission_dict)

@api_router.post("/missions/{mission_id}/assign")
async def assign_mission(mission_id: str, drone_id: str):
    result = await db.missions.update_one(
        {"id": mission_id},
        {"$set": {"assigned_drone_id": drone_id, "status": "assigned"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Mission not found")
    return {"status": "assigned"}

# AI endpoints
@api_router.get("/ai/settings")
async def get_ai_settings():
    settings = await ai_service.get_settings()
    # Remove encrypted key from response
    if "api_key" in settings:
        settings["api_key"] = "***ENCRYPTED***" if settings["api_key"] else None
    return settings

@api_router.post("/ai/settings")
async def update_ai_settings(settings: AISettings):
    updated = await ai_service.update_settings(settings)
    # Remove encrypted key from response
    if "api_key" in updated:
        updated["api_key"] = "***ENCRYPTED***" if updated["api_key"] else None
    return updated

@api_router.post("/ai/brief")
async def generate_ai_brief(mission_id: str):
    mission = await db.missions.find_one({"id": mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    mission_obj = MissionModel(**mission)
    brief = await ai_service.generate_mission_brief(mission_obj)
    
    # Update mission with brief
    await db.missions.update_one(
        {"id": mission_id},
        {"$set": {"ai_brief": brief}}
    )
    
    return {"brief": brief}

# Telemetry safety scoring
@api_router.post("/telemetry/safety-score")
async def calculate_safety_score(drone_id: str):
    """Calculate landing zone safety score using TensorFlow.js data + telemetry"""
    # Get latest telemetry
    latest_telemetry = await db.telemetry.find_one(
        {"drone_id": drone_id},
        sort=[("timestamp", -1)]
    )
    
    if not latest_telemetry:
        raise HTTPException(status_code=404, detail="No telemetry found")
    
    # Calculate safety factors
    factors = {
        "gps_quality": min(100, latest_telemetry["satellites"] * 8),  # 12 sats = 96%
        "battery_level": latest_telemetry["battery_percent"],
        "altitude_safety": 100 if latest_telemetry["alt_rel"] > 10 else 50,
        "attitude_stability": max(0, 100 - abs(latest_telemetry["roll"]) * 10 - abs(latest_telemetry["pitch"]) * 10),
        "link_quality": latest_telemetry["link_quality"] * 100
    }
    
    # Overall score (weighted average)
    weights = {"gps_quality": 0.25, "battery_level": 0.25, "altitude_safety": 0.2, "attitude_stability": 0.15, "link_quality": 0.15}
    overall_score = sum(factors[key] * weights[key] for key in factors)
    
    recommendations = []
    if factors["gps_quality"] < 70:
        recommendations.append("Wait for better GPS fix before landing")
    if factors["battery_level"] < 30:
        recommendations.append("Low battery - prioritize immediate landing")
    if factors["altitude_safety"] < 100:
        recommendations.append("Increase altitude before approach")
    if factors["attitude_stability"] < 80:
        recommendations.append("Stabilize attitude before descent")
    if factors["link_quality"] < 70:
        recommendations.append("Improve communication link quality")
    
    score = SafetyScore(
        score=round(overall_score, 1),
        factors=factors,
        recommendations=recommendations
    )
    
    return score

# WebSocket endpoint
@api_router.websocket("/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    client_id = str(uuid.uuid4())
    connected_clients[client_id] = websocket
    
    try:
        # Send initial data
        await websocket.send_text(json.dumps({
            "type": "connection",
            "client_id": client_id,
            "message": "Connected to ResQFly telemetry stream"
        }))
        
        # Keep connection alive
        while True:
            try:
                # Ping every 30 seconds
                await asyncio.sleep(30)
                await websocket.send_text(json.dumps({
                    "type": "ping",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }))
            except WebSocketDisconnect:
                break
                
    except WebSocketDisconnect:
        pass
    finally:
        connected_clients.pop(client_id, None)
        logger.info(f"Client {client_id} disconnected")

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("ResQFly API starting up...")
    
    # Initialize AI settings
    global ai_enabled, ai_settings
    ai_settings = await ai_service.get_settings()
    ai_enabled = ai_settings.get("enabled", False)
    
    # Start MAVLink listener
    mavlink_listener.start_listener()
    
    # Create default drone for demo
    existing_drone = await db.drones.find_one({"uid": "drone_001"})
    if not existing_drone:
        default_drone = DroneModel(
            uid="drone_001",
            callsign="ResQ-Alpha",
            firmware="ArduPilot 4.3.0",
            max_payload_kg=5.0,
            status="active"
        )
        await db.drones.insert_one(default_drone.dict())
        logger.info("Created default drone")
    
    logger.info("ResQFly API ready!")

@app.on_event("shutdown")
async def shutdown_event():
    mavlink_listener.running = False
    if mavlink_listener.socket:
        mavlink_listener.socket.close()
    client.close()
    logger.info("ResQFly API shutdown complete")