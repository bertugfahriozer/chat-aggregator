from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import uuid
from datetime import datetime, timezone
import json
import asyncio
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# Define Models
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    platform: str  # youtube, twitch, kick
    username: str
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_color: str = "#FFFFFF"
    is_moderator: bool = False
    is_subscriber: bool = False

class ChatMessageCreate(BaseModel):
    platform: str
    username: str
    message: str
    user_color: str = "#FFFFFF"
    is_moderator: bool = False
    is_subscriber: bool = False

# Helper function to prepare data for MongoDB
def prepare_for_mongo(data):
    if isinstance(data.get('timestamp'), datetime):
        data['timestamp'] = data['timestamp'].isoformat()
    return data

# Helper function to parse data from MongoDB
def parse_from_mongo(item):
    if isinstance(item.get('timestamp'), str):
        item['timestamp'] = datetime.fromisoformat(item['timestamp'])
    return item

# Mock chat messages for demo
mock_users = {
    "youtube": ["YTViewer1", "StreamFan", "ChatMaster", "YTSub123", "LiveWatcher"],
    "twitch": ["TwitchUser", "PogChamp", "Kappa123", "StreamLover", "TTVFan"],
    "kick": ["KickViewer", "KickFan", "NewPlatform", "ChatKing", "KickUser"]
}

mock_messages = [
    "Merhaba! Nasılsın?",
    "Harika yayın!", 
    "Bu oyunu çok seviyorum",
    "Selamlar herkese",
    "Çok güzel oynuyorsun",
    "Discord linkini atabilir misin?",
    "Bu bölümü daha önce görmüştüm",
    "Yayında kaç kişi var?",
    "Instagram adresin nedir?",
    "Müzik çok güzel",
    "Mikrofon sesi çok iyi",
    "Hangi oyunu sonra oynayacaksın?"
]

platform_colors = {
    "youtube": "#FF0000",
    "twitch": "#9146FF", 
    "kick": "#53FC18"
}

# Background task to generate mock messages
async def generate_mock_messages():
    while True:
        await asyncio.sleep(random.uniform(2, 8))  # Random interval between messages
        
        platform = random.choice(["youtube", "twitch", "kick"])
        username = random.choice(mock_users[platform])
        message = random.choice(mock_messages)
        
        chat_message = ChatMessage(
            platform=platform,
            username=username,
            message=message,
            user_color=platform_colors[platform],
            is_moderator=random.choice([True, False]) if random.random() < 0.1 else False,
            is_subscriber=random.choice([True, False]) if random.random() < 0.3 else False
        )
        
        # Save to database
        message_dict = prepare_for_mongo(chat_message.dict())
        await db.chat_messages.insert_one(message_dict)
        
        # Broadcast to all connected WebSocket clients
        await manager.broadcast(json.dumps({
            "type": "new_message",
            "data": chat_message.dict()
        }, default=str))

# Start background task
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(generate_mock_messages())

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming WebSocket messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Multi-Platform Chat Aggregator"}

@api_router.post("/messages", response_model=ChatMessage)
async def create_message(input: ChatMessageCreate):
    message_dict = input.dict()
    message_obj = ChatMessage(**message_dict)
    message_data = prepare_for_mongo(message_obj.dict())
    await db.chat_messages.insert_one(message_data)
    
    # Broadcast to WebSocket clients
    await manager.broadcast(json.dumps({
        "type": "new_message",
        "data": message_obj.dict()
    }, default=str))
    
    return message_obj

@api_router.get("/messages", response_model=List[ChatMessage])
async def get_messages(limit: int = 100):
    messages = await db.chat_messages.find().sort("timestamp", -1).limit(limit).to_list(length=None)
    parsed_messages = [parse_from_mongo(msg) for msg in messages]
    return [ChatMessage(**msg) for msg in parsed_messages]

@api_router.get("/messages/{platform}", response_model=List[ChatMessage])
async def get_messages_by_platform(platform: str, limit: int = 100):
    messages = await db.chat_messages.find({"platform": platform}).sort("timestamp", -1).limit(limit).to_list(length=None)
    parsed_messages = [parse_from_mongo(msg) for msg in messages]
    return [ChatMessage(**msg) for msg in parsed_messages]

@api_router.delete("/messages")
async def clear_messages():
    result = await db.chat_messages.delete_many({})
    return {"deleted_count": result.deleted_count}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
