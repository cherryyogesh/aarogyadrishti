from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List, Set, Any
import json
import logging
from datetime import datetime

logger = logging.getLogger("webrtc_signaling")

router = APIRouter(prefix="/webrtc", tags=["WebRTC Real-time Signaling"])

# Store connected active WebSockets per room_id
# rooms: Dict[room_id, Set[WebSocket]]
rooms: Dict[str, Set[WebSocket]] = {}

# Simple in-memory message buffer for fallback polling
room_buffers: Dict[str, List[Dict[str, Any]]] = {}

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
            # Broadcast signaling messages (offer, answer, ice-candidate, etc.) to all OTHER peers in the room
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
