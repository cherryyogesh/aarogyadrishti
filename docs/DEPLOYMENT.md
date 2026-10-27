# Deployment & Operations Guide: Aarogya Drishti
**Target Environments:** Local Development, Docker Containers & Production Cloud Servers

---

## 1. Quick Start (Local Development)

### 1.1 Backend Setup
1. Ensure Python 3.12+ is installed.
2. Navigate to `backend/` and install requirements:
   ```bash
   pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings python-multipart python-jose passlib bcrypt httpx pillow opencv-python-headless alembic pytest pytest-asyncio
   ```
3. Initialize the database and load realistic seed data:
   ```bash
   python backend/seed.py
   ```
4. Start the FastAPI backend server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
   Backend will be accessible at: `http://127.0.0.1:8000`  
   Interactive Swagger documentation: `http://127.0.0.1:8000/api/v1/docs`

### 1.2 Frontend Setup
1. Ensure Node.js 20+ is installed.
2. Navigate to `frontend/`:
   ```bash
   cd frontend
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev -- --host 127.0.0.1 --port 5173
   ```
   Web application will be accessible at: `http://127.0.0.1:5173/`

---

## 2. Default Test Credentials

| Role | Username / Email | Password | Full Name |
| :--- | :--- | :--- | :--- |
| **Community Health Worker (ASHA)** | `chw@aarogya.gov.in` | `ChwPass@2026` | Sarala Devi |
| **PHC Medical Officer** | `mo@aarogya.gov.in` | `MoPass@2026` | Dr. Ramesh Babu |
| **Specialist Doctor (Telemedicine)** | `doctor@aarogya.gov.in` | `DocPass@2026` | Dr. Priya Sundaram |
| **Patient Navigator** | `navigator@aarogya.gov.in` | `NavPass@2026` | Vijay Krishna |
| **District Administrator (DMHO)** | `admin@aarogya.gov.in` | `AdminPass@2026` | District Administrator |

---

## 3. Docker Deployment Configuration

### 3.1 `docker-compose.yml`
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=sqlite:///./aarogya_drishti.db
      - SMS_PROVIDER=synthetic
      - SECRET_KEY=replace-with-secure-key-in-production
    volumes:
      - backend-storage:/app/storage

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  backend-storage:
```

---

## 4. Third-Party Integration Configuration

Edit `.env` in the root or set environment variables:

- **SMS Integration:**
  - Twilio: set `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID=...`, `TWILIO_AUTH_TOKEN=...`, `TWILIO_FROM_NUMBER=...`
  - DLT Gateway (India): set `SMS_PROVIDER=dlt`, `DLT_API_KEY=...`, `DLT_SENDER_ID=AARDRI`, `DLT_ENTITY_ID=...`
- **Hugging Face AI:**
  - Set `HUGGINGFACE_API_KEY=hf_...` and `AI_MODEL_ID=meta-llama/Llama-3.2-3B-Instruct`
- **Telemedicine STUN/TURN:**
  - Default uses Google public STUN (`stun:stun.l.google.com:19302`).
  - Configure `TURN_SERVER_URL` and `TURN_SERVER_CREDENTIALS` for restrictive NAT environments.
