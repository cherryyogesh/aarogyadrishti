import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    APP_NAME: str = "Aarogya Drishti"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "aarogya-drishti-secure-key-2026-hyper-secured-token")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # Database: SQLite for zero-config local ACID, switchable to PostgreSQL
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/aarogya_drishti.db")

    # Storage
    STORAGE_DIR: str = str(BASE_DIR / "storage" / "uploads")
    MAX_UPLOAD_SIZE_MB: int = 15

    # SMS & OTP Integration
    SMS_PROVIDER: str = os.getenv("SMS_PROVIDER", "synthetic")  # synthetic, twilio, dlt
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM_NUMBER: str = os.getenv("TWILIO_FROM_NUMBER", "")
    DLT_API_KEY: str = os.getenv("DLT_API_KEY", "")
    DLT_SENDER_ID: str = os.getenv("DLT_SENDER_ID", "AARDRI")
    DLT_ENTITY_ID: str = os.getenv("DLT_ENTITY_ID", "")

    # AI Integration
    HUGGINGFACE_API_KEY: str = os.getenv("HUGGINGFACE_API_KEY", "")
    AI_MODEL_ID: str = os.getenv("AI_MODEL_ID", "meta-llama/Llama-3.2-3B-Instruct")

    # Aarogya Mytra AI — Google MedGemma 1.5 4B Vision & Clinical AI
    MYTRA_AI_ENABLED: bool = True
    MEDGEMMA_PROVIDER_TYPE: str = os.getenv("MEDGEMMA_PROVIDER_TYPE", "auto")  # local, managed, auto, mock_test, none
    MEDGEMMA_ENDPOINT_URL: str = os.getenv("MEDGEMMA_ENDPOINT_URL", "")
    MEDGEMMA_API_KEY: str = os.getenv("MEDGEMMA_API_KEY", "")
    MEDGEMMA_MODEL_ID: str = os.getenv("MEDGEMMA_MODEL_ID", "google/medgemma-1.5-4b-it")
    MEDGEMMA_TIMEOUT_SECONDS: int = int(os.getenv("MEDGEMMA_TIMEOUT_SECONDS", "30"))

    # Telemedicine WebRTC
    STUN_SERVER_URL: str = os.getenv("STUN_SERVER_URL", "stun:stun.l.google.com:19302")
    TURN_SERVER_URL: str = os.getenv("TURN_SERVER_URL", "")
    TURN_SERVER_CREDENTIALS: str = os.getenv("TURN_SERVER_CREDENTIALS", "")

    class Config:
        case_sensitive = True
        extra = "allow"

settings = Settings()

# Ensure storage directories exist
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
