import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load local and parent .env files
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

class Settings(BaseSettings):
    APP_NAME: str = "Aarogya Drishti"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "aarogya-drishti-secure-key-2026-hyper-secured-token")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))  # 30 days

    # Database: SQLite for zero-config local ACID, switchable to PostgreSQL
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/aarogya_drishti.db")

    # Storage
    STORAGE_DIR: str = str(BASE_DIR / "storage" / "uploads")
    MAX_UPLOAD_SIZE_MB: int = 15

    # SMS & OTP Integration
    SMS_PROVIDER: str = os.getenv("SMS_PROVIDER", "auto")  # auto, twilio, fast2sms, msg91, dlt, synthetic
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM_NUMBER: str = os.getenv("TWILIO_FROM_NUMBER", "")
    FAST2SMS_API_KEY: str = os.getenv("FAST2SMS_API_KEY", "")
    MSG91_AUTH_KEY: str = os.getenv("MSG91_AUTH_KEY", "")
    MSG91_SENDER_ID: str = os.getenv("MSG91_SENDER_ID", "AARDRI")
    MSG91_TEMPLATE_ID: str = os.getenv("MSG91_TEMPLATE_ID", "")
    DLT_API_KEY: str = os.getenv("DLT_API_KEY", "")
    DLT_SENDER_ID: str = os.getenv("DLT_SENDER_ID", "AARDRI")
    DLT_ENTITY_ID: str = os.getenv("DLT_ENTITY_ID", "")

    # Primary AI Provider: Google Gemini API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
    GEMINI_TIMEOUT_SECONDS: int = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "30"))
    GEMINI_MAX_RETRIES: int = int(os.getenv("GEMINI_MAX_RETRIES", "3"))
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")



    # Aarogya Mytra AI Configuration
    MYTRA_AI_ENABLED: bool = True










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
