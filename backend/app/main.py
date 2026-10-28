from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import (
    auth, patients, screenings, images, phc, appointments,
    otp, doctor, consultations, chat, reports, audit, config_status,
    investigations, navigation, referrals, signaling
)

from sqlalchemy import text

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Safe schema migration for newly added User columns
with engine.connect() as _conn:
    for _col, _type in [("mandal", "VARCHAR(100)"), ("district", "VARCHAR(100)"), ("state", "VARCHAR(100)")]:
        try:
            _conn.execute(text(f"ALTER TABLE users ADD COLUMN {_col} {_type}"))
            _conn.commit()
        except Exception:
            pass

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Multilingual AI-assisted community healthcare screening, triage, and telemedicine platform.",
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc"
)

# Enable CORS for local and web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(patients.router, prefix=settings.API_V1_STR)
app.include_router(screenings.router, prefix=settings.API_V1_STR)
app.include_router(images.router, prefix=settings.API_V1_STR)
app.include_router(phc.router, prefix=settings.API_V1_STR)
app.include_router(appointments.router, prefix=settings.API_V1_STR)
app.include_router(otp.router, prefix=settings.API_V1_STR)
app.include_router(doctor.router, prefix=settings.API_V1_STR)
app.include_router(consultations.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(config_status.router, prefix=settings.API_V1_STR)
app.include_router(investigations.router, prefix=settings.API_V1_STR)
app.include_router(navigation.router, prefix=settings.API_V1_STR)
app.include_router(referrals.router, prefix=settings.API_V1_STR)
app.include_router(signaling.router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": "1.0.0"
    }
