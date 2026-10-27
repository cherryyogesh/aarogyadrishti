# Integration Status: Aarogya Drishti
**Configuration & Provider Audit Matrix**

---

## 1. Third-Party Integration Matrix

| Integration Domain | Intended Real Provider | Current Config State | Fallback / Dev Mode Behavior | Configuration Instructions |
| :--- | :--- | :--- | :--- | :--- |
| **SMS & OTP Notifications** | Twilio / India DLT Compliant SMS Gateway (MSG91, Gupshup) | `SYNTHETIC_DEV_MODE = True` (Credentials not configured) | Generates valid cryptographic OTP, records notification in DB with full delivery queue status, displays in notification center & response header for testing. Never fakes delivery in production mode. | Set `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` or `SMS_PROVIDER=dlt`, `DLT_API_KEY`, `DLT_ENTITY_ID` in `.env`. |
| **AI Inference & Chatbot** | Hugging Face Inference API / Local transformer | `HUGGINGFACE_API_KEY` optional | When `HUGGINGFACE_API_KEY` is set, queries configured model. When unset or offline, uses local rule-based Clinical Triage & Safety Engine adhering to strict clinical guidelines, emergency red-flag escalations, and non-diagnostic triage. Clearly shows provider status in UI. | Set `HUGGINGFACE_API_KEY=hf_...` and `AI_MODEL_ID=meta-llama/Llama-3.2-3B-Instruct` or similar medical triage model in `.env`. |
| **Telemedicine Video** | WebRTC with STUN/TURN (or Daily.co / LiveKit) | Built-in WebRTC Signaling + STUN (Google STUN) | Full peer-to-peer WebRTC video/audio consultation workspace with camera/mic toggle, screen share, and session room tokens. Connects directly in-browser. | Optional TURN server configuration via `TURN_SERVER_URL` and `TURN_SERVER_CREDENTIALS` in `.env` for restrictive symmetric NATs. |
| **Relational Database** | PostgreSQL / SQLite3 | SQLite3 local persistent file database (`backend/aarogya_drishti.db`) with full ACID & foreign key enforcement | Fully operational persistent relational database out of the box with zero external configuration required. Can be pointed to PostgreSQL via `DATABASE_URL`. | For PostgreSQL: set `DATABASE_URL=postgresql://user:pass@localhost:5432/aarogya_drishti`. |
| **Object Image Storage** | Local Secure Filesystem / S3 | Local Secure Storage (`backend/storage/uploads/`) | Files stored with hashed names, authenticated route serving with token verification, no public directory exposure. | For AWS S3: configure `STORAGE_BACKEND=s3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`. |

---

## 2. Environment Variables Specification (`.env.example`)
```ini
# Application Core
ENVIRONMENT=development
APP_NAME="Aarogya Drishti"
API_V1_STR="/api/v1"
SECRET_KEY="replace-this-with-a-cryptographically-secure-random-32-byte-secret"
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Database
DATABASE_URL="sqlite:///./aarogya_drishti.db"
# DATABASE_URL="postgresql://user:password@localhost:5432/aarogya_drishti"

# SMS & OTP Integration
SMS_PROVIDER="synthetic" # options: synthetic, twilio, dlt
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_FROM_NUMBER=""
DLT_API_KEY=""
DLT_SENDER_ID=""
DLT_ENTITY_ID=""

# AI Integration
HUGGINGFACE_API_KEY=""
AI_MODEL_ID="meta-llama/Llama-3.2-3B-Instruct"

# WebRTC STUN/TURN
STUN_SERVER_URL="stun:stun.l.google.com:19302"
TURN_SERVER_URL=""
TURN_SERVER_CREDENTIALS=""

# Storage
STORAGE_DIR="./storage/uploads"
MAX_UPLOAD_SIZE_MB=15
```
