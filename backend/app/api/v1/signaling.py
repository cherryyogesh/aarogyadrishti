from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List, Set, Any
import json
import logging
from datetime import datetime

logger = logging.getLogger("webrtc_signaling")

router = APIRouter(prefix="/webrtc", tags=["WebRTC Real-time Signaling"])

# Store connected active WebSockets per room_id
rooms: Dict[str, Set[WebSocket]] = {}

# Store connected user WebSockets for real-time notifications (e.g. incoming call ring, accept, decline)
user_connections: Dict[int, Set[WebSocket]] = {}

# In-memory message buffer for fallback polling
room_buffers: Dict[str, List[Dict[str, Any]]] = {}

def is_user_online(user_id: int) -> bool:
    """Check if user currently has an active notification WebSocket connection."""
    return user_id in user_connections and len(user_connections[user_id]) > 0

async def notify_user(user_id: int, message: Dict[str, Any]):
    """Push real-time notification to a specific user (e.g. Doctor or Staff member)."""
    if user_id not in user_connections:
        return False
    dead_sockets = set()
    text = json.dumps(message)
    for ws in list(user_connections[user_id]):
        try:
            await ws.send_text(text)
        except Exception as e:
            logger.warning(f"Failed to push message to user {user_id}: {e}")
            dead_sockets.add(ws)
    for ws in dead_sockets:
        user_connections[user_id].discard(ws)
    if not user_connections[user_id]:
        del user_connections[user_id]
    return True

async def broadcast_to_room(room_id: str, message: Dict[str, Any], exclude_ws: WebSocket = None):
    """Broadcast real-time message to all active participants in a consultation room."""
    if room_id not in rooms:
        return
    dead_sockets = set()
    text = json.dumps(message)
    for ws in list(rooms[room_id]):
        if ws != exclude_ws:
            try:
                await ws.send_text(text)
            except Exception as e:
                logger.warning(f"Failed to broadcast to room {room_id}: {e}")
                dead_sockets.add(ws)
    for ws in dead_sockets:
        rooms[room_id].discard(ws)
    if not rooms[room_id]:
        del rooms[room_id]

@router.websocket("/user-ws/{user_id}")
async def user_notifications_websocket(websocket: WebSocket, user_id: int):
    """
    Dedicated user-level WebSocket connection.
    Used by Doctors to receive incoming call rings with patient info,
    and by PHC Staff to receive doctor response signals (accept, decline, busy).
    """
    await websocket.accept()
    if user_id not in user_connections:
        user_connections[user_id] = set()
    user_connections[user_id].add(websocket)
    logger.info(f"User {user_id} connected to notification stream. Active sockets: {len(user_connections[user_id])}")

    try:
        # Send initial connected confirmation
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }))

        while True:
            raw_msg = await websocket.receive_text()
            try:
                data = json.loads(raw_msg)
                msg_type = data.get("type")
                if msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "timestamp": datetime.utcnow().isoformat()}))
            except Exception:
                pass
    except WebSocketDisconnect:
        logger.info(f"User {user_id} disconnected from notification stream.")
    except Exception as e:
        logger.warning(f"Error in user {user_id} notification ws: {e}")
    finally:
        if user_id in user_connections and websocket in user_connections[user_id]:
            user_connections[user_id].discard(websocket)
            if not user_connections[user_id]:
                del user_connections[user_id]

@router.websocket("/ws/{room_id}")
async def webrtc_websocket_signaling(websocket: WebSocket, room_id: str):
    await websocket.accept()
    if room_id not in rooms:
        rooms[room_id] = set()
    rooms[room_id].add(websocket)
    peer_count = len(rooms[room_id])
    logger.info(f"Peer connected to WebRTC room '{room_id}'. Active peers: {peer_count}")

    # Notify all clients in room about current peer count
    for peer in list(rooms[room_id]):
        try:
            await peer.send_text(json.dumps({
                "type": "peer_count",
                "count": peer_count,
                "room_id": room_id,
                "is_new_joiner": (peer == websocket)
            }))
        except Exception:
            pass

    try:
        while True:
            text_data = await websocket.receive_text()
            # Broadcast signaling messages (offer, answer, ice-candidate, media_toggle, etc.) to all OTHER peers
            for peer in list(rooms[room_id]):
                if peer != websocket:
                    try:
                        await peer.send_text(text_data)
                    except Exception as e:
                        logger.warning(f"Error forwarding signaling packet: {e}")
    except WebSocketDisconnect:
        logger.info(f"Peer disconnected from WebRTC room '{room_id}'")
    except Exception as e:
        logger.warning(f"WebSocket error in room '{room_id}': {e}")
    finally:
        if room_id in rooms and websocket in rooms[room_id]:
            rooms[room_id].remove(websocket)
            remaining = len(rooms[room_id])
            if remaining == 0:
                del rooms[room_id]
            else:
                for peer in list(rooms[room_id]):
                    try:
                        await peer.send_text(json.dumps({
                            "type": "peer_disconnected",
                            "count": remaining,
                            "room_id": room_id
                        }))
                    except Exception:
                        pass

@router.get("/rooms/{room_id}/status")
def get_room_status(room_id: str):
    active_peers = len(rooms.get(room_id, set()))
    return {
        "room_id": room_id,
        "active_peers": active_peers,
        "is_ready": active_peers >= 1
    }

@router.get("/users/{user_id}/status")
def get_user_status(user_id: int):
    return {
        "user_id": user_id,
        "is_online": is_user_online(user_id)
    }
